"use client";
import {useRef,useState} from 'react';
import {ThermoSim} from './thermo-sim';
import {ArchimedesSim} from './archimedes-sim';
import {practiceLevels} from '@/lib/engine/challenge';
import type {Skill,Level} from '@/lib/engine/types';
import {Icon} from './icons';
export function FreePractice({skills,busy,onStart}:{skills:Skill[];busy:boolean;onStart:(id:string,level:Level)=>void}) {
 const lab=useRef<HTMLDialogElement>(null);
 // Physics students also get a gas lab to explore (nothing is saved).
 const physics=skills.some(s=>s.subject==='fisica');
 const [sim,setSim]=useState<'gases'|'flotacion'>('gases');
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
 {physics&&<div className="lab-entry"><p><strong>Laboratorio de física</strong>Simuladores para explorar los gases (presión, volumen y temperatura) y la flotación (principio de Arquímedes).</p><button type="button" className="secondary" onClick={()=>lab.current?.showModal()}>🔬 Abrir laboratorio<Icon name="arrow"/></button></div>}</div></details>
 {physics&&<dialog ref={lab} className="lab-dialog" aria-label="Laboratorio de física" onClick={e=>{if(e.target===e.currentTarget)lab.current?.close();}}><header><h2>Laboratorio de física</h2><button type="button" className="icon-button" aria-label="Cerrar laboratorio" onClick={()=>lab.current?.close()}><Icon name="close"/></button></header><div className="lab-switch" role="tablist" aria-label="Simulador"><button type="button" role="tab" aria-selected={sim==='gases'} onClick={()=>setSim('gases')}>🌡️ Gases</button><button type="button" role="tab" aria-selected={sim==='flotacion'} onClick={()=>setSim('flotacion')}>🧊 Flotación</button></div>{sim==='gases'?<ThermoSim/>:<ArchimedesSim/>}<p className="lab-note">{sim==='gases'?'Termodinámica · gas ideal (PV = nRT, con 0,1 mol).':'Hidrostática · principio de Arquímedes (g = 9,8 m/s²).'} Explora libremente: no cuenta como práctica ni cambia tu racha.</p></dialog>}</>;
}
