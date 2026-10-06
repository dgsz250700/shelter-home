"use client";
import {useRef,useState} from 'react';
import {ThermoSim} from './thermo-sim';
import {practiceLevels} from '@/lib/engine/challenge';
import type {Skill,Level} from '@/lib/engine/types';
import {Icon} from './icons';
export function FreePractice({skills,busy,onStart}:{skills:Skill[];busy:boolean;onStart:(id:string,level:Level)=>void}) {
 const lab=useRef<HTMLDialogElement>(null);
 // Physics students also get a gas lab to explore (nothing is saved).
 const physics=skills.some(s=>s.subject==='fisica');
 const [selected,setSelected]=useState(skills[0]?.id??'');
 const [level,setLevel]=useState<Level>(1);
 const skill=skills.find(s=>s.id===selected);
 const levels=skill?practiceLevels(skill):[];
 const actualLevel=levels.includes(level)?level:levels[0];
 return <><details className="free-practice"><summary><Icon name="book"/><span>Practicar a mi ritmo<small>Elige la habilidad y el nivel</small></span><Icon name="arrow"/></summary>
 <div className="free-practice-fields"><label>Quiero practicar<select value={selected} onChange={e=>setSelected(e.target.value)}>{skills.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <fieldset><legend>Nivel</legend><div className="level-choices">{levels.map(l=><button type="button" key={l} aria-pressed={actualLevel===l} onClick={()=>setLevel(l)}>{l-1}<span>{['Inicio','Un paso más','Varios pasos','Reto'][l-1]}</span></button>)}</div></fieldset>
 <p>Diez preguntas, con pistas. No gasta oportunidades del reto ni cambia la racha.</p>
 <button className="secondary" disabled={busy || !skill || !actualLevel} onClick={()=>{if(skill && actualLevel)onStart(skill.id,actualLevel);}}>{busy?'Preparando…':'Empezar práctica libre'}<Icon name="arrow"/></button>
 {physics&&<div className="lab-entry"><p><strong>Laboratorio de física</strong>Explora cómo se comportan los gases al cambiar la temperatura, el volumen y la presión.</p><button type="button" className="secondary" onClick={()=>lab.current?.showModal()}>🔬 Abrir simulador de gases<Icon name="arrow"/></button></div>}</div></details>
 {physics&&<dialog ref={lab} className="lab-dialog" aria-label="Simulador de gases" onClick={e=>{if(e.target===e.currentTarget)lab.current?.close();}}><header><h2>Simulador de gases</h2><button type="button" className="icon-button" aria-label="Cerrar simulador" onClick={()=>lab.current?.close()}><Icon name="close"/></button></header><ThermoSim/><p className="lab-note">Termodinámica · gas ideal (PV = nRT, con 0,1 mol). Explora libremente: no cuenta como práctica ni cambia tu racha.</p></dialog>}</>;
}
