"use client";
import {MathText,QuestionContent} from "./question-content";
import {MatchAnswer} from "./match-answer";
import {RhythmAnswer} from "./rhythm-answer";
import {Calculator} from "./calculator";
import {ExerciseDiagram} from "./exercise-visual";
import {track} from "@/components/telemetry/client";
import {expressionSymbols} from "@/lib/engine/algebra";

import { useActiveTime } from "./use-active-time";
import { ImageViewer } from "./image-viewer";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { completeMission, recordAttempt, finishQuestion } from "@/lib/data/actions";
import { evaluate, exerciseFor } from "@/lib/engine/exercises";
import { reinforce } from "@/lib/engine/selector";
import type { Question, ShelterState, Skill } from "@/lib/engine/types";
import { Icon } from "./icons";
import { DAILY_TARGET, DAILY_CHANCES, rewardCopy } from "@/lib/engine/challenge";
import type { PracticeSession } from "@/lib/data/student";
import { CatArt } from "@/components/scene/cat-art";
type Completion = Awaited<ReturnType<typeof completeMission>>;
export function Practice({
  sessionId,
  queue,
  skills,
  onDone,
  onReward,
  onStep,
  userId,
  resumed,
}: {
  resumed: PracticeSession;
  sessionId: string;
  queue: Question[];
  skills: Skill[];
  onDone: (result: Completion) => void;
  onReward: (state: ShelterState) => void;
  onStep: (step: number) => void;
  userId: string;
}) {
  const [items, setItems] = useState(queue.slice(0, 10));
  const [index, setIndex] = useState(Math.min(9,resumed.completedSeeds.length));
  const currentAttempts=resumed.attempts.filter(a=>a.exercise_seed===queue[Math.min(9,resumed.completedSeeds.length)]?.seed);
  const [answer, setAnswer] = useState(currentAttempts.at(-1)?.given_answer ?? "");
  const [hint, setHint] = useState(Math.min(3,Math.max(0,...currentAttempts.map(a=>a.hint_level+(a.correct?0:1)))));
  const [message, setMessage] = useState("");
  const [correct, setCorrect] = useState(resumed.completedSeeds.filter(seed=>resumed.attempts.find(a=>a.exercise_seed===seed)?.correct).length);
  const [busy, setBusy] = useState(false);
  const [solved, setSolved] = useState(currentAttempts.some(a=>a.correct));
  const [wrong, setWrong] = useState(currentAttempts.some(a=>!a.correct));
  // One chance per question; the last two, the hardest, get two. After the last miss the answer is shown.
  const chancesFor=(step:number)=>step>=8?2:1;
  const [misses, setMisses] = useState(currentAttempts.filter(a=>!a.correct).length);
  const [review, setReview] = useState(!currentAttempts.some(a=>a.correct)&&currentAttempts.filter(a=>!a.correct).length>=chancesFor(Math.min(9,resumed.completedSeeds.length)));
  // The last answer that was checked: a played rhythm shows its note-by-note result only after checking.
  const [checked, setChecked] = useState(currentAttempts.at(-1)?.given_answer ?? "");
  const [flash, setFlash] = useState<{kind:"good"|"bad";seed:string}|null>(null);
  const [result, setResult] = useState<Completion | null>(null);
  const [skillResults, setSkillResults] = useState<
    Record<string, { correct: number; total: number }>
  >({});


  const gate = useRef(false);
  const edits=useRef({edits:0,deletes:0,clears:0});
  const pendingAttempt=useRef<{id:string;key:string}|null>(null);
  const field = useRef<HTMLInputElement>(null);
  const cursor = useRef<{ start: number; end: number } | null>(null);
  const question = items[index];
  const skill = skills.find((s) => s.id === question?.skillId);
  const exercise = useMemo(
    () => (question && skill ? exerciseFor(skill, question) : null),
    [question, skill],
  );
  const presentationChoices = exercise && resumed.attempts.some(a=>a.exercise_seed===exercise.seed && !exercise.choices?.some(c=>c.value===a.given_answer)) ? undefined : exercise?.choices;
  useEffect(()=>{
    if(!question)return;
    const context={sessionId,skillId:question.skillId};
    track('question_viewed',{level:question.level,step:index,format:presentationChoices?'choice':'open'},context);
    return()=>{if(edits.current.edits)track('answer_edited',{...edits.current,step:index},context);edits.current={edits:0,deletes:0,clears:0};};
  },[question,sessionId,index,exercise,presentationChoices]);
  const activeTime = useActiveTime(
    question?.seed ?? "complete",
    busy || solved || Boolean(result),
  );
  const sessionTime = useActiveTime(sessionId, Boolean(result));
  useEffect(() => {
    field.current?.focus({ preventScroll: true });
  }, [question?.seed]);
  const capture = () => {
    if (field.current)
      cursor.current = {
        start: field.current.selectionStart ?? answer.length,
        end: field.current.selectionEnd ?? answer.length,
      };
  };
  const edit = (key: string) => {
    if (solved || busy) return;
    edits.current.edits++;if(key==="back")edits.current.deletes++;if(key==="clear")edits.current.clears++;
    const selection = cursor.current ?? {
      start: answer.length,
      end: answer.length,
    };
    let next = answer;
    let caret = selection.start;
    if (key === "clear") {
      next = "";
      caret = 0;
    } else if (key === "back") {
      const start =
        selection.start === selection.end
          ? Math.max(0, selection.start - 1)
          : selection.start;
      next = answer.slice(0, start) + answer.slice(selection.end);
      caret = start;
    } else {
      next =
        answer.slice(0, selection.start) + key + answer.slice(selection.end);
      caret = selection.start + key.length;
    }
    if (next.length > 60) return;
    setAnswer(next);
    cursor.current = { start: caret, end: caret };
    requestAnimationFrame(() => {
      field.current?.focus({ preventScroll: true });
      field.current?.setSelectionRange(caret, caret);
    });
  };
  const check = async () => {
    if (gate.current || solved || !exercise || !skill) return;
    const evaluated = evaluate(exercise, answer);
    if (!evaluated.valid) {
      track("input_invalid",{step:index}, {sessionId,skillId:skill.id});
      setMessage(evaluated.message);
      return;
    }
    gate.current = true;
    setBusy(true);
    setMessage("");
    const responseMs = activeTime.read();
    if(edits.current.edits)track("answer_edited",{...edits.current,step:index},{sessionId,skillId:skill.id});
    edits.current={edits:0,deletes:0,clears:0};
    try {
      const attemptKey=JSON.stringify([sessionId,exercise.seed,answer,hint]);
      if(pendingAttempt.current?.key!==attemptKey)pendingAttempt.current={id:crypto.randomUUID(),key:attemptKey};
      const saved = await recordAttempt({
        request_id:pendingAttempt.current.id,
        user_id: userId,
        skill_id: skill.id,
        level: exercise.level,
        exercise_seed: exercise.seed,
        prompt_text: exercise.prompt,
        expected_answer: exercise.answer,
        given_answer: answer,
        correct: evaluated.correct,
        response_ms: responseMs,
        timing_version: 2,
        ai_help: false,
        hint_level: hint,
        error_type: evaluated.errorType,
        session_id: sessionId,
      });
      pendingAttempt.current=null;
      setChecked(answer);
      onReward(saved.state);
      activeTime.reset();
      setSkillResults((previous) => ({
        ...previous,
        [skill.name]: {
          correct:
            (previous[skill.name]?.correct ?? 0) + (evaluated.correct ? 1 : 0),
          total: (previous[skill.name]?.total ?? 0) + 1,
        },
      }));
      setFlash({kind:evaluated.correct?"good":"bad",seed:exercise.seed});
      if (evaluated.correct) {
        if(!wrong)setCorrect((n) => n + 1);
        setSolved(true);
        setMessage(
          [
            skill.family === "equations" ? "¡Bien! Dejaste la letra sola." : "¡Bien! Resolviste este paso.",
            "¡Ese paso está resuelto!",
            "¡Seguimos avanzando!",
          ][index % 3],
        );
      } else {
        if (!wrong) setItems((old) => reinforce(old, index).slice(0, 10));
        setWrong(true);
        const missed=misses+1;
        setMisses(missed);
        if(missed>=chancesFor(index)){
          track("solution_viewed",{step:index,reason:"no_chances_left"},{sessionId,skillId:skill.id});
          setMessage("");
          setReview(true);
        }else{
          setHint((h) => Math.min(3, h + 1));
          setMessage(`${exercise.hints[Math.min(hint, 2)]} Te queda una oportunidad.`);
        }
      }
    } catch {
      track("save_failed",{reason:"attempt",step:index},{sessionId,skillId:skill.id});
      setMessage(
        "No se guardó la respuesta. Comprueba tu conexión y vuelve a intentarlo.",
      );
    } finally {
      gate.current = false;
      setBusy(false);
    }
  };
  const advance = async () => {
    if (gate.current || !question) return;
    gate.current=true;setBusy(true);
    try {
      await finishQuestion(sessionId,question.seed);
      if(index===9) {
        const completion=await completeMission(sessionId,correct,sessionTime.read()+resumed.attempts.reduce((sum,a)=>sum+a.response_ms,0));
        setResult(completion);onReward(completion.state);onStep(10);
      } else {
        setIndex(n=>n+1);onStep(index+1);setAnswer("");cursor.current=null;setHint(0);setMessage("");setSolved(false);setWrong(false);setMisses(0);setReview(false);setChecked("");
      }
    } catch {setMessage("Tu avance sigue aquí. Toca el botón de nuevo para guardarlo.");}
    finally {gate.current=false;setBusy(false);}
  };
  const finishFlash = useEffectEvent((seed: string, good: boolean) => {
    setFlash(null);
    if (good && question?.seed === seed) void advance();
  });
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => finishFlash(flash.seed, flash.kind === "good"), flash.kind === "good" ? 1200 : 900);
    return () => clearTimeout(timer);
  }, [flash]);
  if (result)
    return (
      <section className="exercise-sheet mission-complete">
        <div className="completion-stars">
          <Icon name="star" />
          <Icon name="star" size={44} />
          <Icon name="star" />
        </div>
        <CatArt cat={result.cat??undefined}/>
        <h1>
          {result.cat
            ? `¡${result.cat.name} está en casa!`
            : result.mode === "free" ? "¡Una práctica más para ti!" : result.passed ? "¡Reto logrado!" : "Ya sabes qué practicar"}
        </h1>
        <p>
          {result.cat?.story ??
            (result.reward ? rewardCopy[result.reward].delivered : result.mode === "free" ? "Cada práctica hace más fácil el siguiente paso." : !result.passed ? `La meta es ${DAILY_TARGET} de 10 al primer intento. ${result.dailyTry<DAILY_CHANCES ? `Te quedan ${DAILY_CHANCES-result.dailyTry} oportunidades hoy. Puedes repasar antes de volver a intentarlo.` : "Hoy puedes seguir practicando libremente. Mañana tienes tres oportunidades nuevas."}` : "Tu progreso quedó guardado.")}
        </p>
        <div className="completion-stats">
          <strong>
            {result.correct}/10<span>correctas al primer intento</span>
          </strong>
          <strong>
            <Icon name="fire" />
            {result.streak.current}
            <span>{result.streak.current === 1 ? "día" : "días"} de racha</span>
          </strong>
        </div>
        <p hidden={!Object.keys(skillResults).length}>
          {Object.entries(skillResults).some(
            ([, value]) => value.correct < value.total,
          )
            ? `Mañana daremos un poco más de cariño a ${Object.entries(skillResults).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0][0]}. Cada intento cuenta.`
            : `¡Gran práctica! ${Object.keys(skillResults).join(", ")}: hoy resolviste todos sus desafíos.`}
        </p>
        <button className="primary" onClick={() => onDone(result)}>
          {result.reward ? "Ver la recompensa en mi refugio" : "Volver al refugio"}
          <Icon name="arrow" />
        </button>
      </section>
    );
  if (!exercise || !skill)
    return (
      <section className="exercise-sheet">
        <h2>No hay preguntas disponibles.</h2>
        <p>El tutor puede activar una habilidad desde Admin.</p>
      </section>
    );
  const prompt = (exercise.displayPrompt ?? exercise.prompt)
    .replace(/^Despeja x:\s*/, "")
    .replace(/^Convierte\s*/, "")
    .replace(/^(Balancea|Verifica y completa):?\s*/, "")
    .replace(/\. Escribe todos los coeficientes mínimos.*$/, "");
  return (
    <section className={`exercise-sheet ${solved ? "answer-success" : ""} ${flash ? `answer-flash-${flash.kind}` : ""}`}>
      {flash && createPortal(
        <div key={`${flash.kind}:${flash.seed}`} className={`answer-face ${flash.kind}`} aria-hidden="true">
          <svg viewBox="0 0 64 64" width="96" height="96">
            <circle cx="32" cy="32" r="29" />
            <circle cx="22" cy="26" r="3.5" className="eye" />
            <circle cx="42" cy="26" r="3.5" className="eye" />
            <path d={flash.kind === "good" ? "M19 38q13 13 26 0" : "M19 46q13-12 26 0"} />
          </svg>
        </div>,
        document.body,
      )}
      <div className="exercise-meta">
        <span>
          {index + 1} de 10{question.reinforced ? " · Repaso" : ""}
        </span>
      </div>
      {skill.family === "custom" ? <QuestionContent prompt={exercise.prompt}/> : <>{!/[¿?]/.test(prompt) && <h2 className="question-instruction">
        {skill.family === "equations"
          ? `Deja ${exercise.target ?? "la incógnita"} sola`
          : skill.family === "units"
            ? "Cambia la unidad, conserva la cantidad"
            : skill.family === "chemistry"
              ? "Equilibra la reacción"
              : skill.family === "area" ? "Mide la superficie" : skill.family === "perimeter" ? "Recorre el contorno" : skill.family === "measurement" ? "Elige qué necesitas medir" : "Tu siguiente desafío"}
      </h2>}
      {exercise.symbolMeaning && <p className="formula-legend">{exercise.symbolMeaning}</p>}
      <p
        className={`question-prompt ${prompt.length > (exercise.visual ? 45 : 75) ? "long-prompt" : ""}`}
      >
        {skill.family === "chemistry"
          ? prompt
              .split(/(\d+)/)
              .map((part, i) =>
                /^\d+$/.test(part) ? <sub key={i}>{part}</sub> : part,
              )
          : exercise.formula ? exercise.formula.replaceAll("*", " · ") : prompt}
      </p>
      </>}
      <ExerciseDiagram key={`visual:${exercise.seed}`} exercise={exercise}/>
      {exercise.image && exercise.answerFormat!=="rhythm" && (
        <ImageViewer src={exercise.image} alt={exercise.imageAlt} />
      )}
      {exercise.answerFormat==="rhythm"?<RhythmAnswer key={exercise.seed} exercise={exercise} value={answer} onChange={setAnswer} disabled={busy||solved||review} revealed={answer!==""&&answer===checked}/>:exercise.answerFormat==="match"?<MatchAnswer exercise={exercise} value={answer} onChange={setAnswer} disabled={busy||solved||review}/>:presentationChoices ? <fieldset className="answer-choices" disabled={busy||solved||review}><legend className="sr-only">Elige la respuesta correcta</legend>{presentationChoices.map((choice,i)=><label key={choice.value} className={answer===choice.value?'choice-selected':''}><input type="radio" name={`choice-${exercise.seed}`} value={choice.value} checked={answer===choice.value} onChange={()=>{setAnswer(choice.value);track('control_used',{control:'answer_choice',format:'choice',step:index},{sessionId,skillId:skill.id});}}/><span className="choice-letter">{String.fromCharCode(65+i)}</span><span className="choice-value"><MathText text={choice.label}/></span><Icon name="check" size={18}/></label>)}</fieldset> : <>
      <label className="answer-label" htmlFor="answer">
        {exercise.answerFormat === "coefficients"
          ? "Coeficientes, separados por comas"
          : exercise.target ? `${exercise.target} =` : "Tu respuesta"}
      </label>
      <div className="answer-wrap">
        <input
          ref={field}
          id="answer"
          readOnly={exercise.answerFormat!=="text"||busy||solved||review}
          inputMode={exercise.answerFormat==="text"?"text":"none"}
          onChange={e=>{if(exercise.answerFormat==="text"&&!busy&&!solved&&!review)setAnswer(e.target.value.slice(0,100));}}
          value={answer}
          aria-label="Respuesta"
          placeholder={
            exercise.answerFormat === "coefficients" ? "2,1,2" : "Escribe aquí…"
          }
          onSelect={capture}
          onClick={capture}
          onKeyDown={(event) => {
            if(exercise.answerFormat==="text")return;
            if ((exercise.answerFormat === "expression" ? /^[A-Za-z0-9+*()/\-]$/ : /^[0-9.,/\-]$/).test(event.key)) {
              event.preventDefault();
              edit(event.key);
            } else if (event.key === "Backspace") {
              event.preventDefault();
              edit("back");
            } else if (event.key === "Delete") {
              event.preventDefault();
              edit("clear");
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (solved) void advance();
              else void check();
            }
          }}
        />
        <button
          className="delete-key"
          aria-label="Borrar último carácter"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => edit("back")}
          disabled={busy || solved}
        >
          <Icon name="erase" />
        </button>
      </div>
      {!solved && !review && exercise.answerFormat!=="text" && (
        <div className="keypad" aria-label="Teclado de respuesta">
          {(exercise.answerFormat === "expression" ? [...new Set([...expressionSymbols(exercise.formula ?? exercise.answer).filter(s=>s!==exercise.target), ...(exercise.answer.match(/\d/g) ?? []), "1", "2"]), "+", "-", "*", "/", "(", ")", "clear"] : [
            "1",
            "2",
            "3",
            ",",
            "4",
            "5",
            "6",
            ".",
            "7",
            "8",
            "9",
            "-",
            "/",
            "0",
            "clear",
          ]).map((key) => (
            <button
              className={`key ${["-", "/", "clear"].includes(key) ? "auxiliary" : ""} ${key === "clear" ? "clear-key" : ""}`}
              key={key}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => edit(key)}
              disabled={busy}
            >
              {key === "clear" ? "Limpiar" : key === "-" ? "−" : key === "*" ? "×" : key}
            </button>
          ))}
        </div>
      )}
      </>}
      {exercise.answerFormat!=="rhythm"&&<Calculator key={`calculator:${exercise.seed}`} sessionId={sessionId} skillId={skill.id}/>}
      {message && (
        <div className={`feedback ${solved ? "good" : ""}`} role="status">
          <Icon name={solved ? "check" : "bulb"} size={23} />
          <p><MathText text={message}/></p>
        </div>
      )}
      {review && (
        <div className="worked-answer">
          {exercise.answerFormat==="rhythm"?<strong>Lo vemos juntos: escucha cómo suena el compás y cuenta los pulsos.</strong>:<strong>Lo vemos juntos: <MathText text={exercise.choices?.find(c=>c.value===exercise.answer)?.label??exercise.answer}/></strong>}
          <p><MathText text={exercise.hints[2]}/></p>
        </div>
      )}
      {solved || review ? (
        <button
          className="primary"
          onClick={() => void advance()}
          disabled={busy}
        >
          {busy
            ? "Guardando…"
            : index === 9
              ? (resumed.mode === "free" ? "Terminar práctica" : "Terminar reto")
              : "Siguiente paso"}
          <Icon name="arrow" />
        </button>
      ) : (
        <>
          <button
            className="primary"
            onClick={() => void check()}
            disabled={busy || !answer}
          >
            {busy ? "Guardando…" : "Comprobar"}
            <Icon name="check" />
          </button>
          <div className="question-options">
            <button
              className="quiet"
              disabled={busy}
              onClick={() => {
                track("hint_requested",{hint_level:Math.min(3,hint+1),step:index},{sessionId,skillId:skill.id});
                setMessage(exercise.hints[Math.min(hint, 2)]);
                setHint((n) => Math.min(3, n + 1));
              }}
            >
              <Icon name="bulb" size={19} />
              Una pista{hint > 0 ? ` · ${hint}/3` : ""}
            </button>
            {wrong && (
              <button className="quiet" onClick={() => {track("solution_viewed",{step:index},{sessionId,skillId:skill.id});setReview(true);}}>
                Ver solución y seguir
              </button>
            )}
          </div>
        </>
      )}
      <footer className="exercise-footer">
        <span className={`subject subject-${skill.subject}`}>
          <Icon name="book" size={15} />
          {skill.name}
        </span>
        <span>{resumed.mode === "free" ? "Práctica libre · " : `Oportunidad ${resumed.dailyTry}/3 · `}Nivel {exercise.level - 1}</span>
      </footer>
    </section>
  );
}
