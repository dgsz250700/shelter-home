// Manage students without printing secrets.
//   pnpm student:add "Name"   creates a student with an empty refuge and a new PIN
//   pnpm student:pin "Name"   gives an existing student a new PIN
//   pnpm student:pin "Name" 1234   sets a chosen 4-digit PIN
// PINs are saved only to .env.students.json (ignored by Git); the database keeps a hash.
import {createClient} from '@supabase/supabase-js';
import {randomBytes,randomInt,scryptSync} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';

const [command,...args]=process.argv.slice(2);
const chosen=/^\d{4}$/.test(args.at(-1)??'')?args.pop():null;
const name=args.join(' ').trim();
if(!['add','pin'].includes(command)||!name){console.error('Uso: pnpm student:add "Nombre"  |  pnpm student:pin "Nombre"');process.exit(1);}
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.');process.exit(1);}
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

const FILE='.env.students.json';
async function saved(){try{return JSON.parse(await readFile(FILE,'utf8'))}catch{return {students:[]}}}
const hashPin=pin=>{const salt=randomBytes(16).toString('base64url');return `scrypt$${salt}$${scryptSync(pin,salt,32).toString('base64url')}`;};
const newPin=()=>String(randomInt(0,10000)).padStart(4,'0');

async function findStudent(){
 const {data,error}=await db.from('profiles').select('id,display_name').eq('role','student');
 if(error)throw error;
 return (data??[]).filter(p=>p.display_name.toLowerCase()===name.toLowerCase());
}

let student;
if(command==='add'){
 if((await findStudent()).length){console.error(`Ya existe un estudiante llamado ${name}. Usa student:pin para darle un PIN nuevo.`);process.exit(1);}
 const slug=name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'estudiante';
 const email=`${slug}-${randomBytes(3).toString('hex')}@refugio.test`;
 const {data,error}=await db.auth.admin.createUser({email,password:randomBytes(24).toString('base64url'),email_confirm:true,app_metadata:{role:'student'}});
 if(error)throw error;
 student={id:data.user.id,display_name:name};
 for(const [table,row] of [['profiles',{id:student.id,display_name:name,role:'student'}],['streaks',{user_id:student.id}],['shelter_state',{user_id:student.id}],['reward_progress',{user_id:student.id}]]){
  const saved=await db.from(table).upsert(row,{onConflict:table==='profiles'?'id':'user_id'});
  if(saved.error)throw saved.error;
 }
}else{
 const found=await findStudent();
 if(found.length!==1){console.error(found.length?`Hay varios estudiantes llamados ${name}.`:`No encontré a ${name}.`);process.exit(1);}
 student=found[0];
}

const pin=chosen??newPin();
const access=await db.from('student_access').upsert({user_id:student.id,pin_hash:hashPin(pin),failed_attempts:0,locked_until:null,updated_at:new Date().toISOString()},{onConflict:'user_id'});
if(access.error)throw access.error;
const file=await saved();
file.students=[...file.students.filter(s=>s.id!==student.id),{name:student.display_name,id:student.id,pin}];
await writeFile(FILE,JSON.stringify(file,null,2),{mode:0o600});
console.log(`${command==='add'?'Estudiante creado':'PIN nuevo'}: ${student.display_name}. El PIN quedó guardado en ${FILE} (fuera de Git).`);
