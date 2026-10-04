"use client";
import { Children, useState, useTransition, type ReactNode } from "react";
import {useRouter} from 'next/navigation';
import type { Skill } from "@/lib/engine/types";
import {SkillIcon} from '@/components/game/skill-icon';
import {QuestionPreview} from './question-preview';
import {MathText} from '@/components/game/question-content';
import {setBankActive} from '@/lib/data/tutor-actions';
const formats:Record<string,string>={number:'Respuesta numérica',choice:'Opción múltiple',boolean:'Verdadero o falso',expression:'Despeje',fraction:'Fracción',text:'Respuesta escrita',match:'Relacionar',coefficients:'Coeficientes'};
export function CatalogBrowser({skills,children}:{skills:Skill[];children:ReactNode}) {
 const [selected,setSelected]=useState(skills.find(s=>s.driveFileId)?.id??skills[0]?.id??'');
 const skill=skills.find(s=>s.id===selected)??skills[0];
 const editors=Children.toArray(children);
 if(!skill)return <p>Todavía no hay temarios. Sube un PDF a su carpeta y actívalo desde Banco de Drive.</p>;
 return <div className="syllabus-library"><div className="syllabus-picker" role="group" aria-label="Elegir temario">{[...skills].sort((a,b)=>Number(Boolean(b.driveFileId))-Number(Boolean(a.driveFileId))).map(s=><button type="button" key={s.id} aria-pressed={s.id===skill.id} onClick={()=>setSelected(s.id)}><SkillIcon skill={s}/><span><strong>{s.name}</strong><small>{s.questions?.length?`${s.questions.length} preguntas`:'Práctica generada'} · {s.active?'Activo':'En pausa'}</small></span></button>)}</div><BankDetail key={skill.id} skill={skill}>{editors[skills.findIndex(s=>s.id===skill.id)]}</BankDetail></div>;
}
function BankDetail({skill,children}:{skill:Skill;children:ReactNode}) {
 const [level,setLevel]=useState(0),[format,setFormat]=useState('all'),[search,setSearch]=useState(''),[selected,setSelected]=useState(0),[error,setError]=useState(''),[pending,startTransition]=useTransition();
 const router=useRouter();
 const questions=skill.questions??[];
 const filtered=questions.map((q,index)=>({q,index})).filter(({q})=>(!level||q.level===level)&&(format==='all'||q.answerFormat===format)&&q.prompt.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
 const current=filtered.find(item=>item.index===selected)??filtered[0];
 return <div className="syllabus-detail"><header className="syllabus-heading"><div><h3>{skill.name}</h3><p>{skill.driveFileId?'Del PDF de tu profe':'Tu banco de práctica'} · {questions.length?`${questions.length} preguntas`:'Ejercicios generados'}</p></div><button className={skill.active?'secondary':'primary'} type="button" disabled={pending} onClick={()=>{setError('');startTransition(async()=>{const result=await setBankActive(skill.id,!skill.active);if(result.error)setError(result.error);else router.refresh();});}}>{pending?'Guardando…':skill.active?'Pausar temario':'Activar temario'}</button></header>
 {error&&<p role="alert" className="error">{error}</p>}
 {questions.length>0?<><div className="syllabus-levels" role="group" aria-label="Filtrar por dificultad"><button type="button" aria-pressed={!level} onClick={()=>setLevel(0)}>Todos<strong>{questions.length}</strong></button>{[1,2,3,4].map(l=><button type="button" key={l} aria-pressed={level===l} onClick={()=>setLevel(l)}>Nivel {l-1}<strong>{questions.filter(q=>q.level===l).length}</strong><small>{['Primeros pasos','En práctica','Un paso más','Desafío'][l-1]}</small></button>)}</div>
 <div className="syllabus-filters"><label>Buscar pregunta<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Presión, volumen, fórmula…"/></label><label>Formato<select value={format} onChange={e=>setFormat(e.target.value)}><option value="all">Todos los formatos</option>{[...new Set(questions.map(q=>q.answerFormat))].map(f=><option key={f} value={f}>{formats[f]??f}</option>)}</select></label></div>
 <div className="question-explorer"><div className="question-index" role="group" aria-label="Preguntas del temario"><p role="status">{filtered.length} preguntas</p>{filtered.map(({q,index})=><button type="button" key={index} aria-pressed={current?.index===index} onClick={()=>setSelected(index)}><span className="bank-question-number">{String(q.sourceNumber??index+1).padStart(2,'0')}</span><span><strong><MathText text={q.prompt.replace(/\n+/g,' ')}/></strong><small>Nivel {q.level-1} · {formats[q.answerFormat]}</small></span></button>)}{!filtered.length&&<p>No hay preguntas con estos filtros. Prueba otro nivel o formato.</p>}</div>{current&&<div className="question-stage"><div className="question-stage-meta"><span>Pregunta {current.q.sourceNumber??current.index+1}</span><span>Nivel {current.q.level-1}</span></div><QuestionPreview key={JSON.stringify(current.q)} question={current.q}/><details className="bank-answer-key"><summary>Ver respuesta y pistas</summary><p><strong>Respuesta:</strong> <MathText text={current.q.choices?.find(c=>c.value===current.q.answer)?.label??current.q.answer}/></p><ol>{current.q.hints.map((hint,i)=><li key={i}><MathText text={hint}/></li>)}</ol></details></div>}</div>
 {skill.driveFileId&&<p className="syllabus-source">Fuente: <a href={`https://drive.google.com/file/d/${skill.driveFileId}/view`} target="_blank" rel="noreferrer">abrir PDF original ↗</a>. Los niveles 1–4 del PDF corresponden a 0–3 en Refugio.</p>}</>:<p>Este temario crea ejercicios nuevos para cada práctica. Abre la configuración para ajustar su contenido.</p>}
 <details className="syllabus-settings"><summary>Editar preguntas, calendario y configuración</summary>{children}</details></div>;
}
