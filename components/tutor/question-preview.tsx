"use client";
import {MathText,QuestionContent} from "@/components/game/question-content";
import {MatchAnswer} from "@/components/game/match-answer";
import {RhythmAnswer} from "@/components/game/rhythm-answer";
import { useState } from "react";
import type { CustomQuestion } from "@/lib/engine/types";
import { evaluate } from "@/lib/engine/exercises";
import { ImageViewer } from "@/components/game/image-viewer";
export function QuestionPreview({ question }: { question: CustomQuestion }) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hint, setHint] = useState(0);
  const choices=question.answerFormat==="boolean"?[{value:"verdadero",label:"Verdadero"},{value:"falso",label:"Falso"}]:question.choices;
  return <div className="question-trial">
    <strong>Así lo verá Laura</strong>
    {question.answerFormat==="rhythm"&&question.rhythm?<>
      <QuestionContent prompt={question.prompt}/>
      <RhythmAnswer exercise={{...question,skillId:"preview",seed:"preview",errorSignatures:[]}} value={answer} onChange={setAnswer} disabled={false} revealed/>
      <small>Esta prueba no guarda intentos ni cambia el progreso del estudiante.</small>
    </>:<>
    {question.image && <ImageViewer src={question.image} alt={question.imageAlt} />}
    <QuestionContent prompt={question.prompt || "Escribe el enunciado para probarlo."}/>
    {question.answerFormat==="match"?<MatchAnswer exercise={{...question,seed:"preview"}} value={answer} onChange={setAnswer}/>:choices?.length?<fieldset className="answer-choices"><legend>Elige una respuesta</legend>{choices.map(c=><label key={c.value} className={answer===c.value?"choice-selected":""}><input type="radio" checked={answer===c.value} onChange={()=>{setAnswer(c.value);setFeedback("");}}/><span className="choice-value"><MathText text={c.label}/></span></label>)}</fieldset>:<label>Prueba una respuesta<input value={answer} onChange={e => {setAnswer(e.target.value); setFeedback("");}} placeholder={question.answerFormat === "expression" ? "Por ejemplo F/a" : "Escribe tu respuesta"} /></label>}
    <div className="trial-actions"><button type="button" className="secondary" disabled={!answer.trim() || !question.answer} onClick={() => {
      const result = evaluate({...question,choices, skillId:"preview",seed:"preview",errorSignatures:[]}, answer);
      setFeedback(!result.valid ? result.message : result.correct ? "Correcto. Esta respuesta sería aceptada." : "Todavía no coincide. Revisa la pista y prueba de nuevo.");
    }}>Comprobar respuesta</button><button type="button" className="quiet" disabled={hint===3} onClick={()=>setHint(h=>h+1)}>Ver pista {Math.min(3,hint+1)}</button></div>
    {hint>0 && <p className="trial-hint"><MathText text={question.hints[hint-1]}/></p>}
    {feedback && <p role="status">{feedback}</p>}
    <small>Esta prueba no guarda intentos ni cambia el progreso de Laura.</small>
    </>}
  </div>;
}
