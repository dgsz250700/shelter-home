import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({rpc:vi.fn(),signIn:vi.fn(),refresh:vi.fn(),from:vi.fn(),student:vi.fn(),link:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('./server',()=>({database:vi.fn()}));
vi.mock('./config',()=>({publicConfig:()=>({url:'https://example.supabase.co',key:'test'})}));
vi.mock('./tutor-auth',()=>({tutorDatabase:async()=>({rpc:m.rpc,from:m.from})}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:{verifyOtp:m.signIn,refreshSession:m.refresh},from:m.from,rpc:m.rpc})}));
vi.mock('./student-access',()=>({currentStudentId:m.student,serviceDatabase:()=>({auth:{admin:{getUserById:async()=>({data:{user:{email:'student@example.com'}},error:null}),generateLink:m.link}}})}));
import {saveSkill} from './tutor-actions';
import {studentClient} from './student';
beforeEach(()=>{m.student.mockResolvedValue('student');m.link.mockResolvedValue({data:{properties:{hashed_token:'token'}},error:null});m.signIn.mockResolvedValue({data:{user:{id:'student'},session:{expires_at:Math.floor(Date.now()/1000)+3600}},error:null});});
it('reutiliza la sesión de cada estudiante en peticiones concurrentes',async()=>{
 await Promise.all([studentClient(),studentClient(),studentClient()]);expect(m.signIn).toHaveBeenCalledTimes(1);
});
it('el profe guarda una expresión y sus niveles en una transacción',async()=>{
 m.rpc.mockResolvedValue({data:'38ccde09-78e3-47d3-a111-7ce88809bc7d',error:null});
 const f=new FormData();for(const [k,v] of Object.entries({name:'Fórmulas',description:'Despejar m',subject:'fisica',mode:'custom',priority:'5',difficulty:'2',prompt:'F=m*a. Despeja m.',answer:'F/a',format:'expression',level:'2',hint1:'Deshaz el producto',hint2:'Divide entre a',hint3:'m=F/a'}))f.set(k,v);
 const result=await saveSkill({error:'',success:''},f);expect(result.error).toBe('');expect(result.id).toBeTruthy();expect(m.rpc).toHaveBeenCalledWith('save_skill_atomic',expect.objectContaining({p_levels:expect.any(Array)}));expect(m.from).not.toHaveBeenCalled();
});
it('guarda una pregunta de texto sin exigir tres pistas redactadas',async()=>{
 m.rpc.mockResolvedValue({data:'38ccde09-78e3-47d3-a111-7ce88809bc7d',error:null});
 const f=new FormData();for(const [k,v] of Object.entries({name:'Reconocer calor',subject:'fisica',mode:'custom',priority:'1',difficulty:'1',prompt:'¿Qué calor cambia la temperatura?',answer:'Calor sensible',format:'text',level:'1'}))f.set(k,v);
 const result=await saveSkill({error:'',success:''},f);expect(result.error).toBe('');
 const levels=m.rpc.mock.calls.at(-1)?.[1].p_levels as {description:string}[];const first=JSON.parse(levels[0].description);expect(first.questions[0].answerFormat).toBe('text');expect(first.questions[0].hints).toHaveLength(3);
});
it('rechaza texto escrito como expresión con un mensaje que explica cómo corregirlo',async()=>{
 const f=new FormData();for(const [k,v] of Object.entries({name:'Calor',subject:'fisica',mode:'custom',priority:'1',difficulty:'1',prompt:'Clasifica el calor',answer:'Calor sensible',format:'expression',level:'1'}))f.set(k,v);
 expect((await saveSkill({error:'',success:''},f)).error).toContain('Texto corto');
});
