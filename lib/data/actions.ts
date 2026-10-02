'use server';
import {createSession,finishSession,saveAttempt,completeQuestion} from './student';
export async function startMission(...args:Parameters<typeof createSession>){return createSession(...args)}
export async function recordAttempt(input:Parameters<typeof saveAttempt>[0]){return saveAttempt(input)}
export async function completeMission(id:string,correct:number,duration:number){return finishSession(id,correct,duration)}

export async function finishQuestion(id:string,seed:string){return completeQuestion(id,seed)}

// Choosing who uses this device. A signed-in tutor may enter any refuge without the PIN.
export async function chooseStudent(studentId:string,pin:string):Promise<{ok:boolean;needPin?:boolean;message?:string}>{
 const {cookies}=await import('next/headers');
 const {checkPin,listStudents,signStudent,STUDENT_COOKIE}=await import('./student-access');
 const {isTutorPreview}=await import('./server');
 if(!(await listStudents()).some(s=>s.id===studentId))return {ok:false,message:'Elige un estudiante de la lista.'};
 if(!(await isTutorPreview())){
  if(!pin)return {ok:false,needPin:true};
  const check=await checkPin(studentId,pin);
  if(!check.ok)return {ok:false,needPin:true,message:check.reason==='locked'?`Demasiados intentos. Prueba de nuevo en ${check.minutes} minutos.`:check.reason==='missing'?'Este estudiante todavía no tiene PIN. Pídeselo a tu profe.':'Ese PIN no es correcto.'};
 }
 (await cookies()).set(STUDENT_COOKIE,signStudent(studentId),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*180});
 return {ok:true};
}
export async function leaveStudent(){
 const {cookies}=await import('next/headers');
 const {STUDENT_COOKIE}=await import('./student-access');
 (await cookies()).delete(STUDENT_COOKIE);
}
