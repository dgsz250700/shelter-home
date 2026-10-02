'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {chooseStudent} from '@/lib/data/actions';
import {CatArt} from '@/components/scene/cat-art';
import {Icon} from './icons';
// Who is going to play: tap your name, then type your 4-digit PIN.
export function StudentPicker({students}:{students:{id:string;name:string}[]}){
 const router=useRouter();
 const [chosen,setChosen]=useState<{id:string;name:string}|null>(null);
 const [pin,setPin]=useState('');
 const [message,setMessage]=useState('');
 const [busy,start]=useTransition();
 const submit=(student:{id:string;name:string},code:string)=>start(async()=>{
  const result=await chooseStudent(student.id,code);
  if(result.ok){router.refresh();return;}
  setChosen(student);setPin('');setMessage(result.message??'');
 });
 const press=(key:string)=>{
  if(!chosen||busy)return;
  if(key==='back'){setPin(p=>p.slice(0,-1));return;}
  const next=(pin+key).slice(0,4);setPin(next);setMessage('');
  if(next.length===4)submit(chosen,next);
 };
 return <main className="auth-shell student-picker">
  <section className="auth-panel">
   <CatArt cat={{personality:'curioso',size:'medium',build:'normal',coat:'short',tail:'normal',ears:'normal',pattern:'atigrado',palette:{body:'#c79765',belly:'#f4e4d0'},name:'Milo'}} still/>
   {!chosen?<>
    <h1>¿Quién viene hoy al refugio?</h1>
    <div className="student-list">
     {students.map(s=><button key={s.id} type="button" className="student-choice" disabled={busy} onClick={()=>{setMessage('');submit(s,'');}}><span aria-hidden="true">{s.name.slice(0,1).toUpperCase()}</span>{s.name}</button>)}
    </div>
    {!students.length&&<p>Todavía no hay estudiantes. Pídele a tu profe que te agregue.</p>}
   </>:<>
    <h1>Hola, {chosen.name}</h1>
    <p>Escribe tu PIN de 4 números.</p>
    <div className="pin-dots" aria-label={`${pin.length} de 4 números`}>{[0,1,2,3].map(i=><i key={i} className={i<pin.length?'filled':''}/>)}</div>
    {message&&<p className="error" role="alert">{message}</p>}
    <div className="pin-pad">
     {['1','2','3','4','5','6','7','8','9'].map(k=><button key={k} type="button" className="key" disabled={busy} onClick={()=>press(k)}>{k}</button>)}
     <button type="button" className="key auxiliary" onClick={()=>{setChosen(null);setPin('');setMessage('');}} aria-label="Volver a la lista"><Icon name="back" size={20}/></button>
     <button type="button" className="key" disabled={busy} onClick={()=>press('0')}>0</button>
     <button type="button" className="key auxiliary" disabled={busy} onClick={()=>press('back')} aria-label="Borrar"><Icon name="erase" size={20}/></button>
    </div>
   </>}
  </section>
 </main>;
}
