"use client";
import {useState} from 'react';
import {practiceLevels} from '@/lib/engine/challenge';
import type {Skill,Level} from '@/lib/engine/types';
import {Icon} from './icons';
export function FreePractice({skills,busy,onStart}:{skills:Skill[];busy:boolean;onStart:(id:string,level:Level)=>void}) {
 const [selected,setSelected]=useState(skills[0]?.id??'');
 const [level,setLevel]=useState<Level>(1);
 const skill=skills.find(s=>s.id===selected);
 const levels=skill?practiceLevels(skill):[];
 const actualLevel=levels.includes(level)?level:levels[0];
 return <details className="free-practice"><summary><Icon name="book"/><span>Practicar a mi ritmo<small>Elige la habilidad y el nivel</small></span><Icon name="arrow"/></summary>
 <div className="free-practice-fields"><label>Quiero practicar<select value={selected} onChange={e=>setSelected(e.target.value)}>{skills.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <fieldset><legend>Nivel</legend><div className="level-choices">{levels.map(l=><button type="button" key={l} aria-pressed={actualLevel===l} onClick={()=>setLevel(l)}>{l-1}<span>{['Inicio','Un paso más','Varios pasos','Reto'][l-1]}</span></button>)}</div></fieldset>
 <p>Diez preguntas, con pistas. No gasta oportunidades del reto ni cambia la racha.</p>
 <button className="secondary" disabled={busy || !skill || !actualLevel} onClick={()=>{if(skill && actualLevel)onStart(skill.id,actualLevel);}}>{busy?'Preparando…':'Empezar práctica libre'}<Icon name="arrow"/></button></div></details>;
}
