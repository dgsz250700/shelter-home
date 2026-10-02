import 'server-only';
import {GoogleAuth} from 'google-auth-library';
import {tutorDatabase} from './tutor-auth';
import {driveConnection,driveOAuth,openToken,driveOAuthReady} from './drive-connection';
import {driveFolderId} from '@/lib/engine/drive-bank';
const scope='https://www.googleapis.com/auth/drive.readonly';
function configuration(){
 const raw=process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON,folder=process.env.GOOGLE_DRIVE_FOLDER_ID;
 if(!raw||!folder)return null;
 const c=JSON.parse(raw) as {client_email?:string;private_key?:string};
 if(!c.client_email||!c.private_key||!/^[\w-]+$/.test(folder))throw new Error('Revisa la configuración privada de Drive.');
 return {credentials:{client_email:c.client_email,private_key:c.private_key},folder};
}
// `folderName` is the subfolder a PDF lives in (one per student, e.g. «Laura», «Sebas»); empty for the main folder.
type DriveFile={id:string;name:string;size:string;modifiedTime:string;folderName?:string};
// Carpeta compartida como «Cualquier persona con el enlace»: se lee sin credenciales de Google.
function publicFolder(){
 const folder=process.env.GOOGLE_DRIVE_PUBLIC_FOLDER_ID?.trim();
 if(!folder)return null;
 if(!/^[\w-]{10,200}$/.test(folder))throw new Error('Revisa la carpeta compartida de Drive.');
 return folder;
}
const unescape=(s:string)=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').trim();
const publicDownload=(id:string)=>`https://drive.usercontent.google.com/download?id=${id}&export=download`;
async function publicEntries(folder:string){
 const response=await fetch(`https://drive.google.com/embeddedfolderview?id=${folder}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
 const html=response.ok?await response.text():'';
 if(!html.includes('class="flip-entries"'))throw new Error('No pudimos abrir la carpeta. Comprueba que esté compartida como «Cualquier persona con el enlace».');
 const folderName=unescape(html.match(/<title>([^<]*)<\/title>/)?.[1]??'')||'Banco de preguntas';
 const pdfs:{id:string;name:string}[]=[],folders:{id:string;name:string}[]=[];
 for(const chunk of html.split('<div class="flip-entry" ').slice(1)){
  const id=chunk.match(/^id="entry-([\w-]{5,200})"/)?.[1],name=chunk.match(/<div class="flip-entry-title">([^<]*)<\/div>/)?.[1];
  if(!id||!name)continue;
  if(chunk.includes('/type/application/pdf"'))pdfs.push({id,name:unescape(name)});
  else if(chunk.includes('/drive/folders/'))folders.push({id,name:unescape(name)});
 }
 return {folderName,pdfs,folders};
}
async function publicFiles(folder:string){
 const root=await publicEntries(folder);
 // One level of subfolders: each one holds a student's banks.
 const nested=await Promise.all(root.folders.slice(0,20).map(async sub=>(await publicEntries(sub.id)).pdfs.map(pdf=>({...pdf,folderName:sub.name}))));
 const entries=[...root.pdfs.map(pdf=>({...pdf,folderName:undefined as string|undefined})),...nested.flat()].slice(0,100);
 const folderName=root.folderName;
 const files=await Promise.all(entries.map(async ({id,name,folderName:sub}):Promise<DriveFile|null>=>{
  const head=await fetch(publicDownload(id),{method:'HEAD',cache:'no-store',signal:AbortSignal.timeout(15000)}).catch(()=>null);
  const modified=head?.headers.get('last-modified'),size=head?.headers.get('content-length');
  if(!head?.ok||head.headers.get('content-type')?.includes('text/html')||!modified||!size)return null;
  return {id,name,size,modifiedTime:new Date(modified).toISOString(),folderName:sub};
 }));
 return {folderName,files:files.filter((f):f is DriveFile=>Boolean(f)).sort((a,b)=>b.modifiedTime.localeCompare(a.modifiedTime))};
}
async function publicBank(folder:string,fileId?:string){
 const {folderName,files}=await publicFiles(folder);
 if(!fileId)return {configured:true as const,managed:true as const,files,folder,folderName,email:undefined};
 if(!/^[\w-]{5,200}$/.test(fileId))throw new Error('Archivo inválido.');
 const file=files.find(f=>f.id===fileId);
 if(!file||Number(file.size)>15*1024*1024)throw new Error('Elige un PDF de la carpeta conectada, de hasta 15 MB.');
 const response=await fetch(publicDownload(fileId),{cache:'no-store',signal:AbortSignal.timeout(30000)});
 if(!response.ok||response.headers.get('content-type')?.includes('text/html'))throw new Error('Drive no pudo entregar el PDF. Reintenta.');
 return {configured:true as const,response,name:file.name,folder};
}
async function access(){
 await tutorDatabase();
 const service=configuration();
 if(service){const auth=new GoogleAuth({credentials:service.credentials,scopes:[scope]});const token=await auth.getAccessToken();if(!token)throw new Error('No pudimos autenticar Drive.');return {headers:{Authorization:`Bearer ${token}`},folder:service.folder,folderName:'Banco de preguntas',email:service.credentials.client_email};}
 if(!driveOAuthReady())return null;
 const {connection}=await driveConnection();
 if(!connection?.refresh_token)return null;
 const client=driveOAuth();client.setCredentials({refresh_token:openToken(connection.refresh_token)});
 let token:string|null|undefined;
 try{token=(await client.getAccessToken()).token;}catch{throw new Error('Google necesita que vuelvas a conectar tu cuenta.');}
 if(!token)throw new Error('Vuelve a conectar Google.');
 return {headers:{Authorization:`Bearer ${token}`},folder:connection.folder_id,folderName:connection.folder_name,email:undefined};
}
export async function setDriveFolder(value:string){
 if(publicFolder())throw new Error('Esta carpeta se administra mediante la configuración del servidor.');
 const folder=driveFolderId(value),config=await access();if(!config)throw new Error('Conecta Google antes de elegir la carpeta.');
 if(configuration())throw new Error('Esta carpeta se administra mediante la configuración del servidor.');
 const response=await fetch(`https://www.googleapis.com/drive/v3/files/${folder}?fields=id,name,mimeType,trashed`,{headers:config.headers,cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Tu cuenta no puede abrir esa carpeta. Comprueba el enlace y los permisos.');
 const file=await response.json() as {name:string;mimeType:string;trashed?:boolean};
 if(file.trashed||file.mimeType!=='application/vnd.google-apps.folder')throw new Error('El enlace debe ser de una carpeta.');
 const {store,userId}=await driveConnection();
 const saved=await store.from('drive_connections').update({folder_id:folder,folder_name:file.name,updated_at:new Date().toISOString()}).eq('user_id',userId);
 if(saved.error)throw new Error('No se pudo guardar la carpeta.');
 return {folder,name:file.name};
}
// Subfolders of the connected folder (one level), each one usually named after a student.
async function apiFolders(base:string,headers:Record<string,string>,folder:string){
 const params=new URLSearchParams({q:`'${folder}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,fields:'files(id,name)',pageSize:'20'});
 try{
  const response=await fetch(`${base}?${params}`,{headers,cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)return [];
  return ((await response.json()) as {files?:{id:string;name:string}[]}).files??[];
 }catch{return [];}
}
export async function driveBank(fileId?:string){
 const shared=configuration()?null:publicFolder();
 if(shared){await tutorDatabase();return publicBank(shared,fileId);}
 const config=await access();if(!config)return {configured:false as const,oauthReady:driveOAuthReady()};
 if(!config.folder)return {configured:true as const,needsFolder:true as const,files:[]};
 const {headers}=config;
 const base='https://www.googleapis.com/drive/v3/files';
 if(fileId){
  if(!/^[\w-]{5,200}$/.test(fileId))throw new Error('Archivo inválido.');
  const meta=await fetch(`${base}/${fileId}?fields=id,name,mimeType,size,parents,trashed`,{headers,cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!meta.ok)throw new Error('No se pudo abrir ese archivo de Drive.');
  const file=await meta.json() as {name:string;mimeType:string;size:string;parents?:string[];trashed?:boolean};
  if(file.trashed||file.mimeType!=='application/pdf'||Number(file.size)>15*1024*1024)throw new Error('Elige un PDF de la carpeta conectada, de hasta 15 MB.');
  // Only the connected folder or one of its student subfolders.
  const inFolder=file.parents?.includes(config.folder)||(await apiFolders(base,headers,config.folder)).some(f=>file.parents?.includes(f.id));
  if(!inFolder)throw new Error('Elige un PDF de la carpeta conectada, de hasta 15 MB.');
  const response=await fetch(`${base}/${fileId}?alt=media`,{headers,cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('Drive no pudo entregar el PDF. Reintenta.');
  return {configured:true as const,response,name:file.name,folder:config.folder};
 }
 const files:DriveFile[]=[];
 for(const place of [{id:config.folder,name:undefined as string|undefined},...(await apiFolders(base,headers,config.folder))]){
  const params=new URLSearchParams({q:`'${place.id}' in parents and trashed = false and mimeType = 'application/pdf'`,fields:'files(id,name,size,modifiedTime),nextPageToken',pageSize:'100',orderBy:'modifiedTime desc'});
  do{
   const response=await fetch(`${base}?${params}`,{headers,cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error('No pudimos leer la carpeta. Comprueba que esté compartida con la cuenta de servicio.');
   const data=await response.json() as {files:DriveFile[];nextPageToken?:string};files.push(...data.files.map(f=>({...f,folderName:place.name})));
   if(!data.nextPageToken)break;params.set('pageToken',data.nextPageToken);
  }while(files.length<500);
 }
 files.sort((a,b)=>b.modifiedTime.localeCompare(a.modifiedTime));
 return {configured:true as const,managed:Boolean(configuration()),files:files.slice(0,500),folder:config.folder,folderName:config.folderName,email:config.email};
}
