import {createClient} from '@supabase/supabase-js';
import {createInterface} from 'node:readline';
import {chmod,readFile,writeFile} from 'node:fs/promises';
import {parseCredentials,upsertEnvText} from './setup-state.mjs';

const email='tutor@refugio.test';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Configura URL y clave de servicio en .env.local.');
if(!process.stdin.isTTY)throw new Error('Ejecuta este comando en una terminal para escribir la contraseña.');

function ask(question){
 return new Promise(resolve=>{
  const rl=createInterface({input:process.stdin,output:process.stdout,terminal:true});
  rl._writeToOutput=text=>{if(text.includes(question))process.stdout.write(text);};
  rl.question(question,answer=>{rl.close();process.stdout.write('\n');resolve(answer);});
 });
}
const password=await ask('Nueva contraseña de Admin (no se mostrará): ');
if(password.length<12)throw new Error('Usa al menos 12 caracteres.');
if(await ask('Repítela: ')!==password)throw new Error('Las contraseñas no coinciden. No se cambió nada.');

const db=createClient(url,key,{auth:{persistSession:false}});
const {data:list,error:listError}=await db.auth.admin.listUsers({page:1,perPage:1000});
if(listError)throw listError;
const user=list.users.find(item=>item.email?.toLowerCase()===email);
if(!user)throw new Error('No existe la cuenta Admin. Ejecuta primero pnpm setup:daniela.');
const {error}=await db.auth.admin.updateUserById(user.id,{password});
if(error)throw error;

const envText=await readFile('.env.local','utf8');
await writeFile('.env.local',upsertEnvText(envText,{TUTOR_EMAIL:email,TUTOR_PASSWORD:password}),{mode:0o600});
await chmod('.env.local',0o600);
const projectRef=process.env.SUPABASE_PROJECT_REF||new URL(url).hostname.split('.')[0];
let stored=[];try{stored=parseCredentials(await readFile('.env.credentials.json','utf8'),projectRef);}catch{}
const credentials=[...stored.filter(item=>item?.role!=='tutor'),{role:'tutor',email,password}];
await writeFile('.env.credentials.json',JSON.stringify({projectRef,credentials},null,2),{mode:0o600});
await chmod('.env.credentials.json',0o600);
console.log('Listo: la contraseña de Admin cambió. Entra con el usuario «maracuya» y la contraseña nueva.');
