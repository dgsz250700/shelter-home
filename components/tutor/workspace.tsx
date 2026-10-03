"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/game/icons";
type View = 'progress'|'new-skill'|'catalog'|'drive';
const tabs = [{id:'catalog',label:'Temarios',icon:'book'},{id:'new-skill',label:'Crear preguntas',icon:'bulb'},{id:'progress',label:'Progreso',icon:'book'},{id:'drive',label:'Banco de Drive',icon:'gear'}] as const;
// Each tab except «Crear preguntas» shows one student; the choice lives in the address (?estudiante=…).
export function TutorWorkspace({children,students=[],current}:{children:ReactNode;students?:{id:string;name:string}[];current?:string}) {
 const [view,setView]=useState<View>('catalog');
 useEffect(()=>{const update=()=>{const hash=location.hash.slice(1);if(tabs.some(t=>t.id===hash))setView(hash as View);};update();window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
 return <div className="tutor-workspace" data-view={view}><nav className="workspace-tabs" aria-label="Espacio del profesor">{tabs.map(tab=><a data-track={`tutor_${tab.id}`} key={tab.id} href={`#${tab.id}`} aria-current={view===tab.id?'page':undefined} onClick={()=>setView(tab.id)}><Icon name={tab.icon} size={20}/>{tab.label}</a>)}</nav>{view!=='new-skill'&&students.length>1&&<nav className="student-tabs" aria-label="Estudiante">{students.map(s=><a key={s.id} href={`?estudiante=${s.id}#${view}`} aria-current={s.id===current?'page':undefined}>{s.name}</a>)}</nav>}<div className="workspace-content">{children}</div></div>;
}
