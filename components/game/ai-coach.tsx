"use client";
import {track} from "@/components/telemetry/client";
import Image from "next/image";
import { ReadableText } from "./readable-text";
import { useEffect, useRef, useState } from "react";
import type { CoachContext } from "@/lib/data/ai";
import { Icon } from "./icons";
type Message = {
  role: "user" | "assistant";
  content: string;
  id?: string;
  created_at?: string;
};
export function AICoach({
  context,
  onHelp,
  onBusyChange,
}: {
  context?: CoachContext;
  onHelp?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [open, setOpen] = useState(false),
    [messages, setMessages] = useState<Message[]>([]),
    [draft, setDraft] = useState(""),
    [memory, setMemory] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [memoryOpen, setMemoryOpen] = useState(false),
    [loaded, setLoaded] = useState(false);
  const history = useRef<HTMLDivElement>(null);
  const gate = useRef(false);
  const pending=useRef<{key:string;id:string}|null>(null);
  useEffect(() => {
    if (!open || loaded) return;
    let active = true;
    fetch("/api/coach")
      .then((r) => r.json())
      .then(
        (data: { messages?: Message[]; memory?: string; error?: string }) => {
          if (!active) return;
          if (data.error) {
            setError(data.error);
            return;
          }
          setMessages(data.messages ?? []);
          setMemory(data.memory ?? "");
          setLoaded(true);
        },
      )
      .catch(() => {
        if (active)
          setError(
            "No pudimos cargar la conversación. Cierra y vuelve a abrir el tutor.",
          );
      });
    return () => {
      active = false;
    };
  }, [open, loaded]);
  useEffect(() => {
    history.current?.scrollTo({
      top: history.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);
  async function send(text: string, mode = "general") {
    if (!text.trim() || gate.current) return;
    gate.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    const key=JSON.stringify([text,context,mode]);
    if(pending.current?.key!==key)pending.current={key,id:crypto.randomUUID()};
    track('coach_requested',{mode},context);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: pending.current.id,
          message: text,
          context,
          mode,
        }),
      });
      const result = (await response.json()) as {
        reply?: string;
        memory?: string;
        error?: string;
      };
      if (!response.ok || !result.reply) {
        pending.current=null;
        throw new Error(
          result.error ?? "No llegó la respuesta. Intenta de nuevo.",
        );
      }
      pending.current=null;
      track("coach_replied",{mode},context);
      onHelp?.();
      setMessages((old) => [
        ...old,
        { role: "user", content: text },
        { role: "assistant", content: result.reply! },
      ]);
      setMemory(result.memory ?? memory);
      setDraft("");
      setLoaded(true);
    } catch (e) {
      track("coach_failed",{mode},context);
      setError(e instanceof Error ? e.message : "No pudimos conectar.");
    } finally {
      gate.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  async function saveMemory() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      const response = await fetch("/api/coach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memory }),
      });
      const data = (await response.json()) as {
        memory?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      setMemory(data.memory ?? "");
      track("memory_saved");
      setMemoryOpen(false);
    } catch {
      setError("No se pudo guardar la memoria.");
    } finally {
      gate.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <section className={`coach-widget ${context ? "in-exercise" : ""}`}>
      <button
        type="button"
        className="coach-launch"
        aria-expanded={open}
        onClick={() => {if(!open)track("coach_opened",{},context);setOpen((v) => !v);}}
      >
        <span className="numa-mark">
          <Image src="/art/numa.webp" alt="" width={64} height={64}/>
        </span>
        <span>
          <strong>
            {context ? "¿Lo pensamos juntos?" : "Numa, tu tutor IA"}
          </strong>
          <small>
            {context
              ? "Una pista, un ejemplo o paso a paso"
              : "Recuerda tu práctica y te ayuda a avanzar"}
          </small>
        </span>
        <Icon name={open ? "close" : "arrow"} size={18} />
      </button>
      {open && (
        <div className="coach-panel">
          <header>
            <div>
              <strong>Numa · Tutor IA</strong>
              <p>
                {context
                  ? "Estamos trabajando en este ejercicio."
                  : "Hablemos de lo que estás aprendiendo."}
              </p>
            </div>
            <button
              type="button"
              className="quiet"
              onClick={() => setMemoryOpen((v) => !v)}
            >
              Lo que recuerdo
            </button>
          </header>
          {memoryOpen && (
            <div className="coach-memory">
              <label>
                Memoria de aprendizaje
                <textarea
                  value={memory}
                  onChange={(e) => setMemory(e.target.value)}
                  maxLength={1800}
                  rows={5}
                />
              </label>
              <p>
                Puedes corregirla o dejarla vacía. Conserva solo preferencias y
                dificultades de estudio. El profe puede revisar la conversación.
              </p>
              <button
                type="button"
                className="secondary"
                disabled={busy || !loaded}
                onClick={() => void saveMemory()}
              >
                Guardar memoria
              </button>
            </div>
          )}
          <div ref={history} className="coach-history" aria-live="polite">
            {!loaded && <p role="status">Cargando tu conversación…</p>}
            {loaded && messages.length === 0 && !busy && (
              <p className="coach-welcome">
                Vamos a encontrar el siguiente paso. Cuéntame qué parte te
                cuesta o elige una ayuda.
              </p>
            )}
            {messages.map((m, i) => (
              <article
                key={m.id ?? i}
                className={`coach-message from-${m.role}`}
              >
                <b>{m.role === "user" ? "Tú" : "Numa"}</b>
                <ReadableText text={m.content}/>
              </article>
            ))}
            {busy && (
              <p role="status" className="coach-thinking">
                Numa está preparando una ayuda…
              </p>
            )}
          </div>
          <div className="coach-prompts">
            {(context
              ? [
                  ["Dame solo una pista para empezar.", "pista"],
                  ["Explícame este ejercicio paso a paso.", "explicación"],
                  ["Ayúdame a entender mi error.", "revisión"],
                ]
              : [
                  ["¿Qué me conviene practicar y por qué?", "general"],
                  ["Ayúdame a organizar mi próxima práctica.", "general"],
                ]
            ).map(([text, mode]) => (
              <button
                type="button"
                key={text}
                disabled={busy || !loaded}
                onClick={() => void send(text, mode)}
              >
                {text}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft, context ? "pregunta" : "general");
            }}
          >
            <label
              className="sr-only"
              htmlFor={`coach-${context?.seed ?? "home"}`}
            >
              Pregunta a Numa
            </label>
            <textarea
              id={`coach-${context?.seed ?? "home"}`}
              rows={2}
              maxLength={1600}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="No entiendo por qué se divide…"
              disabled={busy || !loaded}
            />
            <button className="primary" disabled={busy || !loaded || !draft.trim()}>
              Enviar
              <Icon name="arrow" size={18} />
            </button>
          </form>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="coach-disclosure">
            Tutor IA con DeepSeek. Tus preguntas y datos de práctica se usan
            para ayudarte; puede equivocarse. No compartas información privada.
          </p>
        </div>
      )}
    </section>
  );
}
