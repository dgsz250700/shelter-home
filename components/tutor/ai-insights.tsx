"use client";
import {track} from "@/components/telemetry/client";
import { ReadableText } from "@/components/game/readable-text";
import { useState } from "react";
import { Icon } from "@/components/game/icons";
export function AIInsights({
  initial,
  memory,
  messages,
  studentId,
}: {
  studentId?: string;
  initial?: { body: string; created_at: string; evidence_count: number } | null;
  memory: string;
  messages: { role: string; content: string; created_at: string }[];
}) {
  const [question,setQuestion] = useState("");
  const [report, setReport] = useState(initial?.body ?? "");
  const [count, setCount] = useState(initial?.evidence_count ?? 0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function analyze() {
    track("coach_requested",{mode:"teacher_report"});
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tutor/report", { method: "POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({question,studentId}) });
      const data = (await response.json()) as {
        report?: string;
        evidenceCount?: number;
        error?: string;
      };
      if (!response.ok || !data.report)
        throw new Error(data.error ?? "No se pudo generar.");
      track("coach_replied",{mode:"teacher_report"});
      setReport(data.report);
      setCount(data.evidenceCount ?? 0);
    } catch (e) {
      track("coach_failed",{mode:"teacher_report"});
      setError(e instanceof Error ? e.message : "No se pudo conectar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ai-insights" id="ai-progress">
      <div className="studio-heading">
        <Icon name="bulb" />
        <div>
          <h2>Lo esencial para la próxima práctica</h2>
          <p>
            Una observación y un siguiente paso.
          </p>
        </div>
      </div>
      <div className="teacher-question"><label>¿Qué te gustaría entender o preparar?<textarea rows={2} value={question} onChange={e=>setQuestion(e.target.value)} maxLength={2000} placeholder="¿Cómo le explico el cambio de unidades sin darle la respuesta?"/></label></div>
      <button
        className="secondary"
        disabled={busy}
        onClick={() => void analyze()}
      >
        {busy
          ? "Analizando la práctica…"
          : question.trim() ? "Consultar a Numa" : report
            ? "Actualizar análisis IA"
            : "Analizar con IA"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {report && (
        <article className="ai-report">
          <ReadableText text={report.split(/\s+/).length>100 ? report.split(/\s+/).slice(0,100).join(" ")+"…" : report}/>
          <small>
            Basado en {count} intentos registrados. Orientación IA, revisable
            por el tutor.
          </small>
        </article>
      )}
      {report && <div className="report-actions"><a className="primary" href="#new-skill"><Icon name="bulb"/> Preparar una práctica de refuerzo</a><button className="quiet" onClick={()=>{const blob=new Blob([report],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='plan-pedagogico-laura.txt';a.click();URL.revokeObjectURL(url);}}>Descargar análisis</button></div>}
      <details>
        <summary>Memoria y conversaciones de Laura</summary>
        <h3>Memoria pedagógica</h3>
        <p className="memory-text">
          {memory || "Aún no hay recuerdos guardados."}
        </p>

        {messages.length ? (
          messages.map((m, i) => (
            <article key={i} className="coach-message">
              <b>
                {m.role === "user" ? "Laura" : "Numa"} ·{" "}
                {new Date(m.created_at).toLocaleDateString("es")}
              </b>
              <ReadableText text={m.content}/>
            </article>
          ))
        ) : (
          <p>Aún no hay conversaciones.</p>
        )}
      </details>
    </section>
  );
}
