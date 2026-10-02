"use client";
import { useActionState, useEffect, useState, useRef } from "react";
import type { Skill, CustomQuestion, Level } from "@/lib/engine/types";
import {familyLabels,generatedFamilies,subjectFamily} from "@/lib/engine/families";
import {ExerciseDiagram} from "@/components/game/exercise-visual";
import { generate } from "@/lib/engine/exercises";
import { saveSkill, removeSkill, saveNote, skillAudience } from "@/lib/data/tutor-actions";
import {QuestionImageInput} from "./question-image-input";
import { QuestionStudio } from "./question-studio";
import { ImageViewer } from "@/components/game/image-viewer";
import { QuestionPreview } from "./question-preview";
import { Icon } from "@/components/game/icons";
const empty: {error:string;success:string;id?:string} = { error: "", success: "" };
type DraftQuestion = CustomQuestion & { localId: string };
const blank = (): DraftQuestion => ({
  localId: crypto.randomUUID(),
  prompt: "",
  answer: "",
  hints: ["", "", ""],
  level: 3,
  answerFormat: "number",
});
// Who sees this practice in their refuge. None checked means every student.
function SkillAudience({skillId}:{skillId?:string}){
  const [audience,setAudience]=useState<{students:{id:string;name:string}[];assigned:string[]}|null>(null);
  useEffect(()=>{let live=true;skillAudience(skillId).then(a=>{if(live)setAudience(a);}).catch(()=>{if(live)setAudience({students:[],assigned:[]});});return()=>{live=false;};},[skillId]);
  if(!audience)return <fieldset className="audience-picker"><legend>Para quién</legend><p>Cargando estudiantes…</p></fieldset>;
  if(audience.students.length<2)return null;
  return <fieldset className="audience-picker"><legend>Para quién</legend>
    <input type="hidden" name="assign" value="1"/>
    <div>{audience.students.map(s=><label key={s.id}><input type="checkbox" name="students" value={s.id} defaultChecked={audience.assigned.includes(s.id)}/>{s.name}</label>)}</div>
    <p>Sin marcar, la ven todos los estudiantes.</p>
  </fieldset>;
}
export function SkillEditor({ skill, draft, onSaved, importOpen=false }: { importOpen?:boolean; onSaved?: () => void; skill?: Skill; draft?: { name:string; description:string; classTopic?:string; subject:string; questions:CustomQuestion[] } }) {
  const [uploads,setUploads]=useState<Record<string,boolean>>({});
  const notified=useRef("");
  const [validationNotice,setValidationNotice]=useState("");
  const [clientId]=useState(()=>crypto.randomUUID());
  const [mode, setMode] = useState(
    skill?.family === "custom" ? "custom" : skill ? "generated" : "custom",
  );
  const [subject, setSubject] = useState(skill?.subject ?? draft?.subject ?? "matematicas");
  const [family,setFamily]=useState<Exclude<Skill["family"],"custom">>(skill&&skill.family!=="custom"?skill.family:subjectFamily(skill?.subject??draft?.subject??"matematicas"));
  const [questions, setQuestions] = useState<DraftQuestion[]>(() =>
    (skill?.questions ?? draft?.questions)?.length
      ? (skill?.questions ?? draft?.questions ?? []).map((q) => ({ ...q, localId: crypto.randomUUID() }))
      : [blank()],
  );
  const update = (id: string, patch: Partial<CustomQuestion>) =>
    setQuestions((old) =>
      old.map((q) => (q.localId === id ? { ...q, ...patch } : q)),
    );
  const addImported = (incoming: CustomQuestion[]) =>
    setQuestions((old) =>
      [
        ...old.filter((q) => q.prompt.trim() || q.answer.trim() || q.image),
        ...incoming.map((q) => ({ ...q, localId: crypto.randomUUID() })),
      ].slice(0, 60),
    );
  const [state, action, pending] = useActionState(saveSkill, empty);
  useEffect(()=>{if(state.success && state.id && notified.current!==state.id){notified.current=state.id;onSaved?.();}},[state.success,state.id,onSaved]);
  const [deletion, deleteAction, deleting] = useActionState(removeSkill, empty);
  return (
    <div className="skill-editor">
      <form data-track="skill_save" action={action} onReset={e=>e.preventDefault()} onInvalidCapture={e=>{setValidationNotice("Completa el campo señalado antes de guardar. Tu trabajo sigue aquí.");const element=e.target as HTMLElement;const details=element.closest("details");if(details)details.open=true;}}>
        {(validationNotice||state.error)&&<p role="alert" className="error">{state.error||validationNotice}</p>}
        <input type="hidden" name="clientId" value={clientId}/><input type="hidden" name="id" value={skill?.id ?? state.id ?? ""} />
        <div className="form-grid">
          <label>
            Nombre de la habilidad
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={skill?.name ?? draft?.name}
              placeholder="Por ejemplo: fracciones equivalentes"
            />
          </label>
          <label>
            Materia
            <select
              name="subject"
              value={subject}
              onChange={(e) => {setSubject(e.target.value);if(e.target.value==="musica")setMode("custom");}}
            >
              <option value="matematicas">Matemáticas</option>
              <option value="fisica">Física</option>
              <option value="quimica">Química</option>
              <option value="musica">Música</option>
            </select>
          </label>
        </div>
        <SkillAudience skillId={skill?.id}/>
        <details className="editor-settings"><summary>Objetivo y planificación (opcional)</summary><div className="form-grid">
          <label className="full-width">
            Qué quieres que practique
            <textarea
              name="description"
              defaultValue={skill?.description ?? draft?.description}
              placeholder="Describe el objetivo de esta práctica."
              rows={2}
            />
          </label>
          <label>
            Prioridad (1–10)
            <input
              type="number"
              name="priority"
              min={1}
              max={10}
              defaultValue={skill?.priority ?? 1}
              required
            />
          </label>
          <input type="hidden" name="difficulty" value="1"/>
          <label>Tema de clase<input name="classTopic" maxLength={300} defaultValue={skill?.classTopic ?? draft?.classTopic ?? ""} placeholder="Gases ideales, presión, termodinámica…"/></label>
        </div>
        <fieldset className="schedule-picker">
          <legend>Planifica su práctica</legend>
          <p>
            Un solo tema al día. Marca los días en que esta habilidad puede
            aparecer; sin marcar, participa todos los días.
          </p>
          <div className="weekday-options">
            {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"].map((day, index) => (
              <label key={day}>
                <input
                  type="checkbox"
                  name="practiceDay"
                  value={index}
                  defaultChecked={skill?.practiceDays?.includes(index)}
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
          <p>Diez preguntas: nivel 0 → 3. Los repasos conservan el nivel que necesita reforzar.</p>
        </fieldset>
        </details>
        <label className="check-label">
          <input
            type="checkbox"
            name="active"
            defaultChecked={skill?.active ?? false}
          />{" "}
          Incluir en las misiones de Laura
        </label>
        <label>
          Contenido de práctica
          <select
            name="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="custom">Mis propias preguntas y pistas</option>
            <option value="generated" disabled={subject==="musica"}>
              Ejercicios automáticos por microhabilidad{subject==="musica"?" (no disponible en música)":""}
            </option>
          </select>
        </label>
        {mode === "generated"&&<label>Microhabilidad del generador<select name="family" value={family} onChange={e=>setFamily(e.target.value as Exclude<Skill["family"],"custom">)}>{generatedFamilies.map(f=><option key={f} value={f}>{familyLabels[f]}</option>)}</select></label>}
        {mode === "custom" ? (
          <div className="question-bank">
            <details className="editor-import" open={importOpen}><summary>Añadir desde PDF, imagen o IA</summary><QuestionStudio onAdd={addImported}/></details>
            <div className="bank-toolbar">
              <h3>
                Banco · {questions.length}{" "}
                {questions.length === 1 ? "pregunta" : "preguntas"}
              </h3>
              <button
                type="button"
                className="quiet"
                onClick={() => {
                  const data = questions.map(({ localId, ...q }) => {
                    void localId;
                    return q;
                  });
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "preguntas-refugio.json";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Exportar JSON
              </button>
            </div>
            <p>
              Elige el tipo y completa la pregunta.
            </p>
            {questions.map((q, i) => (
              <details key={q.localId} className="question-accordion" open={i === 0 || i===questions.length-1 ? true : undefined}><summary><span className="question-number">{i+1}</span><span>{q.prompt || "Nueva pregunta"}<small>Nivel {q.level-1} · {q.answerFormat === "coefficients" ? "Coeficientes" : q.answerFormat === "fraction" ? "Fracción" : q.answerFormat === "expression" ? "Expresión" : q.answerFormat === "boolean" ? "Verdadero/falso" : q.answerFormat === "match" ? "Parejas" : q.answerFormat === "text" ? "Texto" : q.answerFormat === "choice" ? "Opciones" : "Número"}</small></span><Icon name="gear" size={18}/></summary><fieldset className="editable-question"><input type="hidden" name="sourceNumber" value={q.sourceNumber ?? ""}/>
                <legend>Pregunta {i + 1}</legend>
                  <label>
                    Tipo de pregunta
                    <select
                      name="format"
                      value={q.answerFormat}
                      onChange={(e) =>
                        update(q.localId, {
                          answer: "",
                          choices: e.target.value === "choice" ? Array.from({length:4},(_,i)=>({value:String.fromCharCode(65+i),label:""})) : undefined,
                          answerFormat: e.target
                            .value as CustomQuestion["answerFormat"],
                        })
                      }
                    >
                      <option value="boolean">Verdadero o falso</option><option value="match">Relacionar parejas</option><option value="text">Abierta · texto corto</option><option value="choice">Opción múltiple · A, B, C, D</option><option value="number">Número</option>
                      <option value="fraction">Fracción</option><option value="expression">Expresión con letras</option>
                      <option value="coefficients">Coeficientes: 2,1,2</option>
                    </select>
                  </label>

                <QuestionImageInput onBusy={busy=>setUploads(old=>({...old,[q.localId]:busy}))} onImage={(image,imageAlt)=>update(q.localId,{image,imageAlt})}/>
                <input type="hidden" name="matches" value={JSON.stringify(q.matches??[])}/><input type="hidden" name="choices" value={JSON.stringify(q.choices??[])}/><input type="hidden" name="image" value={q.image ?? ""} />
                <input type="hidden" name="imageAlt" value={q.imageAlt ?? ""} />
                {q.image && (
                  <div className="attached-image">
                    <ImageViewer src={q.image} alt={q.imageAlt} />
                    <button
                      type="button"
                      className="quiet"
                      onClick={() =>
                        update(q.localId, {
                          image: undefined,
                          imageAlt: undefined,
                        })
                      }
                    >
                      Quitar imagen
                    </button>
                  </div>
                )}
                <label>
                  Enunciado
                  <textarea
                    name="prompt"
                    required
                    value={q.prompt}
                    onChange={(e) =>
                      update(q.localId, { prompt: e.target.value })
                    }
                    rows={2}
                    placeholder="Escribe el problema completo."
                  />
                </label>
                {q.answerFormat==='match'&&<label>Parejas correctas (una por línea, separadas por =)<textarea rows={5} value={q.matches?.map(p=>`${p.left} = ${p.right}`).join('\n')??''} onChange={e=>{const matches=e.target.value.split('\n').slice(0,5).map(line=>{const [left,...right]=line.split('=');return {left,right:right.join('=')};});update(q.localId,{matches,answer:matches.map((_,i)=>i).join(',')});}} placeholder={'Presión = Pa\nMasa = kg\nVolumen = m³'}/></label>}
                {q.answerFormat==='choice'&&<fieldset className="manual-options"><legend>Opciones de respuesta</legend>{(q.choices??[]).map((choice,index)=><label key={index}><b>{String.fromCharCode(65+index)}</b><input aria-label={`Opción ${String.fromCharCode(65+index)}`} required maxLength={160} value={choice.label} onChange={e=>{const choices=[...(q.choices??[])];choices[index]={...choice,label:e.target.value};update(q.localId,{choices});}} placeholder={`Escribe la opción ${String.fromCharCode(65+index)}`}/></label>)}</fieldset>}
                <div className="form-grid">
                  <label>
                    Respuesta correcta
                    {q.answerFormat==='match'?<><input type="hidden" name="answer" value={q.answer}/><span>Las parejas de arriba son la solución.</span></>:q.answerFormat==='boolean'?<select name="answer" required value={q.answer} onChange={e=>update(q.localId,{answer:e.target.value})}><option value="">Elige la respuesta</option><option value="verdadero">Verdadero</option><option value="falso">Falso</option></select>:q.answerFormat==='choice'?<select name="answer" required value={q.answer} onChange={e=>update(q.localId,{answer:e.target.value})}><option value="">Elige la opción correcta</option>{q.choices?.filter(c=>c.value.trim()).map((c,i)=><option key={i} value={c.value}>{String.fromCharCode(65+i)} · {c.label}</option>)}</select>:<input
                      name="answer"
                      required
                      value={q.answer}
                      onChange={(e) =>
                        update(q.localId, { answer: e.target.value })
                      }
                      placeholder={q.answerFormat==="text"?"Ej. Calor sensible":"Ej. 0,5 o 1/2"}
                    />}
                  </label>
                  <label>
                    Nivel
                    <select
                      name="level"
                      value={q.level}
                      onChange={(e) =>
                        update(q.localId, {
                          level: Number(e.target.value) as Level,
                        })
                      }
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n-1}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <details className="optional-hints"><summary>Pistas personalizadas (opcional)</summary><p>Si las dejas vacías, habrá ayudas generales y la respuesta.</p>{[1, 2, 3].map((n) => (
                  <label key={n}>
                    Pista {n}:{" "}
                    {
                      ["idea clave", "primer paso", "procedimiento completo"][
                        n - 1
                      ]
                    }
                    <input
                      name={`hint${n}`}
                      value={q.hints[n - 1]}
                      onChange={(e) => {
                        const hints = [...q.hints] as CustomQuestion["hints"];
                        hints[n - 1] = e.target.value;
                        update(q.localId, { hints });
                      }}
                    />
                  </label>
                ))}</details>
                <div className="question-actions">
                  <button
                    type="button"
                    className="quiet"
                    onClick={() =>
                      setQuestions((old) => [
                        ...old,
                        { ...q, localId: crypto.randomUUID() },
                      ])
                    }
                  >
                    Duplicar pregunta
                  </button>
                  <button
                    type="button"
                    className="quiet"
                    disabled={i === 0}
                    onClick={() =>
                      setQuestions((old) => {
                        const copy = [...old];
                        [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                        return copy;
                      })
                    }
                  >
                    Subir
                  </button>
                </div>
                {questions.length > 1 && (
                  <button
                    type="button"
                    className="quiet danger"
                    onClick={() =>
                      setQuestions((old) => old.filter((_, j) => j !== i))
                    }
                  >
                    Quitar pregunta {i + 1}
                  </button>
                )}
                <details className="preview-toggle"><summary>Probar como Laura</summary><QuestionPreview question={q}/></details>
              </fieldset></details>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() => setQuestions((old) => [...old, blank()])}
            >
              <Icon name="plus" size={18} />
              Añadir pregunta
            </button>
          </div>
        ) : (
          <div className="live-examples">
            <h3>Ejemplos de lo que practicará</h3>
            <p>{familyLabels[family]}. Figuras y situaciones distintas para practicar una sola microhabilidad.</p>
            {([1,2,3,4] as Level[]).map(level=>{
              const e=generate(family,skill?.id??'preview',level,`v2:preview:${level-1}`);
              return <article key={level}><b>Nivel {level-1}</b><p>{e.prompt}</p><ExerciseDiagram key={`${family}:${level}`} exercise={e}/><small>Respuesta: {e.choices?.find(c=>c.value===e.answer)?.label??e.answer}</small></article>;
            })}
          </div>
        )}
        {state.error && (
          <p role="alert" className="error">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="success-message">
            {state.success}
          </p>
        )}
        <button className="primary save-skill" disabled={pending||Object.values(uploads).some(Boolean)}>
          {pending
            ? "Guardando…"
            : skill || state.id
              ? "Guardar cambios"
              : "Crear habilidad"}
          <Icon name="check" />
        </button>
      </form>
      {skill && (
        <form data-track="skill_delete" action={deleteAction} className="delete-form">
          {(validationNotice||state.error)&&<p role="alert" className="error">{state.error||validationNotice}</p>}
        <input type="hidden" name="clientId" value={clientId}/><input type="hidden" name="id" value={skill.id} />
          <button className="quiet danger" disabled={deleting}>
            Eliminar habilidad sin historial
          </button>
          {deletion.error && (
            <p role="alert" className="error">
              {deletion.error}
            </p>
          )}
          {deletion.success && <p role="status">{deletion.success}</p>}
        </form>
      )}
    </div>
  );
}
export function NoteForm({
  skillId,
  userId,
}: {
  skillId: string;
  userId: string;
}) {
  const [state, action, pending] = useActionState(saveNote, empty);
  return (
    <form data-track="skill_save" action={action} className="note-form">
      <input name="skill_id" type="hidden" value={skillId} />
      <input name="user_id" type="hidden" value={userId} />
      <label>
        Nota para ti
        <textarea
          name="body"
          rows={2}
          required
          placeholder="Qué conviene practicar, qué explicación ayudó…"
        />
      </label>
      <button className="secondary" disabled={pending}>
        Guardar nota
      </button>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && <p role="status">{state.success}</p>}
    </form>
  );
}
