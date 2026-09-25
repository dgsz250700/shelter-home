import {spawnSync} from 'node:child_process';
import {access,chmod,readFile,writeFile} from 'node:fs/promises';
import {hasCompleteCredentials,inspectSetup,parseCredentials,parseEnvText,upsertEnvText} from './setup-state.mjs';

function run(command,args,input){
 const result=spawnSync(command,args,{stdio:input?['pipe','inherit','inherit']:'inherit',input,env:process.env,shell:process.platform==='win32'&&command==='pnpm'});
 if(result.status!==0)throw new Error(`${command} no completó la configuración.`);
}
async function exists(path){try{await access(path);return true}catch{return false}}
async function optionalText(path){try{return await readFile(path,'utf8')}catch{return ''}}

const envText=await optionalText('.env.local');
const localEnv=parseEnvText(envText);
const hasVercelLink=await exists('.vercel/project.json');
const linkedSupabaseRef=(await optionalText('supabase/.temp/project-ref')).trim()||null;
const hasCredentials=hasCompleteCredentials(await optionalText('.env.credentials.json'),localEnv.SUPABASE_PROJECT_REF);
const setup=inspectSetup({env:localEnv,hasVercelLink,linkedSupabaseRef,hasCredentials});
if(!setup.canProvision)throw new Error(`${setup.issues.join(' ')} Ejecuta pnpm setup:doctor para ver el diagnóstico completo.`);

for(const [name,value] of Object.entries(localEnv))process.env[name]=value;
run('pnpm',['exec','vercel','whoami']);
run('pnpm',['exec','supabase','link','--project-ref',localEnv.SUPABASE_PROJECT_REF]);
run('pnpm',['exec','supabase','db','push','--include-seed','--yes']);
if(setup.needsProvisioning)run('node',['--env-file=.env.local','lib/data/provision.mjs']);
else console.log('Usuarios existentes detectados; no se crearán duplicados.');

const credentials=parseCredentials(await readFile('.env.credentials.json','utf8'),localEnv.SUPABASE_PROJECT_REF);
const laura=credentials.find(item=>item.role==='student');
const tutor=credentials.find(item=>item.role==='tutor');
if(!laura?.email||!laura?.password||!tutor?.email||!tutor?.password)throw new Error('.env.credentials.json no contiene ambos roles completos.');
const nextEnv=upsertEnvText(envText,{
 LAURA_EMAIL:laura.email,
 LAURA_PASSWORD:laura.password,
 TUTOR_EMAIL:tutor.email,
 TUTOR_PASSWORD:tutor.password,
});
await writeFile('.env.local',nextEnv,{mode:0o600});
await chmod('.env.local',0o600);
Object.assign(process.env,{
 LAURA_EMAIL:laura.email,
 LAURA_PASSWORD:laura.password,
 TUTOR_EMAIL:tutor.email,
 TUTOR_PASSWORD:tutor.password,
});

run('node',['--env-file=.env.local','lib/data/verify-connection.mjs']);
for(const name of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','LAURA_EMAIL','LAURA_PASSWORD']){
 const value=process.env[name];
 if(!value)throw new Error(`Falta ${name}.`);
 run('pnpm',['exec','vercel','env','add',name,'production','--force','--yes'],value);
}
console.log('Setup remoto completo. Siguiente paso: pnpm verify && pnpm exec vercel --prod --yes');
