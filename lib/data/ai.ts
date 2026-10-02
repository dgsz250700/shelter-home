import {behaviorEvidence} from "./telemetry";
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { studentClient, studentName, loadPractice } from "./student";
import { tutorDatabase } from "./tutor-auth";
import { publicConfig } from "./config";
import { deepseek } from "@/lib/ai/deepseek";
import {
  learningEvidence,
  redactLearningText,
  COACH_SYSTEM,
} from "@/lib/engine/learning-context";
import { prepareSkill } from "./catalog";
import { exerciseFor } from "@/lib/engine/exercises";
import type { Attempt, Mastery, Level } from "@/lib/engine/types";
export type CoachContext = {
  sessionId: string;
  skillId: string;
  seed: string;
  level: Level;
};
export function aiStore() {
  const { url } = publicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("No pudimos abrir la memoria del tutor.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function reserveAI(
  id: string,
  userId: string,
  kind: "coach" | "questions" | "report",
) {
  if (!/^[0-9a-f-]{36}$/i.test(id))
    throw new Error("La solicitud no es válida.");
  const store = aiStore();
  const { data, error } = await store.rpc("reserve_ai_request", {
    p_id: id,
    p_user_id: userId,
    p_kind: kind,
  });
  if (error) throw new Error("No pudimos preparar al tutor. Intenta de nuevo.");
  if (data !== "reserved")
    throw new Error(
      data === "day_limit"
        ? "Llegamos al límite de ayuda IA de hoy. Tus ejercicios y pistas siguen disponibles."
        : data === "minute_limit"
          ? "Hagamos una pausa breve antes de otra consulta."
          : data === "duplicate"
            ? "Esta consulta ya se procesó. Abre de nuevo el tutor para ver la respuesta."
            : "El tutor está preparando otra respuesta. Espera un momento.",
    );
  return store;
}
export async function completeAI(
  id: string,
  status: "completed" | "failed",
  model?: string,
  tokens = 0,
) {
  const { error } = await aiStore()
    .from("ai_requests")
    .update({ status, model, tokens, error_code:status==="failed"?"operation_failed":null })
    .eq("id", id).eq("status","pending");
  if (error) throw new Error("No pudimos cerrar la consulta IA.");
}
export async function learnerEvidence(userId: string) {
  const store = aiStore();
  const [attempts, skills, mastery] = await Promise.all([
    store
      .from("attempts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    store.from("skills").select("id,name"),
    store.from("skill_mastery").select("*").eq("user_id", userId),
  ]);
  if (attempts.error || skills.error || mastery.error)
    throw new Error("No pudimos leer el progreso.");
  return {
    evidence: learningEvidence(
      attempts.data as Attempt[],
      skills.data,
      mastery.data as Mastery[],
    ),
    attemptCount: attempts.data.length,
    behavior: await behaviorEvidence(),
  };
}
export async function coachState() {
  const { db, userId } = await studentClient();
  const [history, memory] = await Promise.all([
    db
      .from("coach_messages")
      .select("id,role,content,created_at,exercise_seed")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(24),
    db
      .from("learner_memory")
      .select("notes,updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (history.error || memory.error)
    throw new Error("No pudimos cargar el tutor.");
  return {
    messages: (history.data ?? []).reverse(),
    memory: memory.data?.notes ?? "",
  };
}
export async function editMemory(notes: string, userId?: string) {
  const cleaned = redactLearningText(notes).trim().slice(0, 1800);
  const actor = userId
    ? { db: await tutorDatabase(), userId }
    : await studentClient();
  const { error } = await actor.db
    .from("learner_memory")
    .upsert({
      user_id: actor.userId,
      notes: cleaned,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error("No pudimos guardar la memoria.");
  return cleaned;
}
export async function askCoach(input: {
  requestId: string;
  message: string;
  context?: CoachContext;
  mode?: string;
}) {
  if (
    typeof input.message !== "string" ||
    !input.message.trim() ||
    input.message.length > 1600
  )
    throw new Error("Escribe una pregunta de hasta 1.600 caracteres.");
  const { db, userId } = await studentClient();
  const context = input.context;
  let exercise = null;
  if (context) {
    if (
      ![1, 2, 3, 4].includes(context.level) ||
      typeof context.seed !== "string" ||
      context.seed.length > 160
    )
      throw new Error("El ejercicio no está disponible.");
    const [session, row] = await Promise.all([
      db
        .from("sessions")
        .select("id")
        .eq("id", context.sessionId)
        .eq("user_id", userId)
        .single(),
      db
        .from("skills")
        .select("*,skill_levels(description)")
        .eq("id", context.skillId)
        .single(),
    ]);
    if (session.error || row.error)
      throw new Error("Abre una misión para consultar este ejercicio.");
    const skill = prepareSkill(row.data);
    exercise = exerciseFor(skill, {
      skillId: skill.id,
      family: skill.family,
      level: context.level,
      seed: context.seed,
    });
  }
  const started=Date.now();
  const previous=await aiStore().from("ai_requests").select("status").eq("id",input.requestId).eq("user_id",userId).maybeSingle();
  if(previous.data?.status==='completed'){
    const [saved,state]=await Promise.all([aiStore().from("coach_messages").select("content").eq("request_id",input.requestId).eq("user_id",userId).eq("role","assistant").single(),coachState()]);
    if(saved.error)throw new Error("La respuesta está guardada, pero no pudimos abrirla. Intenta de nuevo.");
    return {reply:saved.data.content as string,memory:state.memory};
  }
  const store = await reserveAI(input.requestId, userId, "coach");
  try {
    const [state, evidence, practice] = await Promise.all([
      coachState(),
      learnerEvidence(userId),
      loadPractice(),
    ]);
    const message = redactLearningText(input.message.trim());
    const result = await deepseek(
      [
        {
          role: "system",
          content: COACH_SYSTEM + "\nDATOS REALES Y EJERCICIO VIGENTE (responde sobre este ejercicio, no los de conversaciones anteriores):\n" + JSON.stringify({
            alias: (await studentName()) || "la estudiante",
            todayTopic: practice.skills.find(s => s.id === practice.queue[0]?.skillId)?.name ?? null,
            memory: state.memory,
            evidence: evidence.evidence,
            behavior: evidence.behavior,
            exercise: exercise
              ? {
                  prompt: exercise.prompt,
                  answer: exercise.answer,
                  hints: exercise.hints,
                }
              : null,
            mode: input.mode ?? "general",
          }),
        },
        ...state.messages
          .filter(m => context ? m.exercise_seed === context.seed : !m.exercise_seed)
          .slice(-14)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        { role: "user", content: message },
      ],
      1600,
    );
    const output = result.json as { reply?: unknown; memory?: unknown };
    if (
      typeof output.reply !== "string" ||
      !output.reply.trim() ||
      output.reply.length > 6500
    )
      throw new Error(
        "El tutor no pudo completar su explicación. Intenta de nuevo.",
      );
    const reply = redactLearningText(output.reply.trim());
    const memory =
      typeof output.memory === "string"
        ? redactLearningText(output.memory).slice(0, 1800)
        : state.memory;
    const saved=await store.rpc("save_coach_atomic",{p_request:input.requestId,p_user:userId,p_memory:memory,p_model:result.model,p_tokens:result.tokens,p_latency:Date.now()-started,p_messages:[
      {role:"user",content:message,memory_before:state.memory,skill_id:context?.skillId??null,exercise_seed:context?.seed??null,created_at:new Date().toISOString()},
      {role:"assistant",content:reply,skill_id:context?.skillId??null,exercise_seed:context?.seed??null,created_at:new Date(Date.now()+1).toISOString()}
    ]});
    if(saved.error)throw new Error("No se confirmó la conversación. Reintenta; tu mensaje sigue aquí.");
    const persisted=await store.from("learner_memory").select("notes").eq("user_id",userId).single();
    if(persisted.error)throw new Error("La respuesta está guardada. Reintenta para abrirla.");
    return { reply, memory:persisted.data.notes as string };
  } catch (error) {
    await completeAI(input.requestId, "failed").catch(()=>console.warn("ai_finalization_pending"));
    throw error;
  }
}
export async function tutorReport(question = "") {
  if (typeof question !== "string" || question.length > 2000) throw new Error("Escribe una consulta de hasta 2.000 caracteres.");
  const db = await tutorDatabase();
  const { data: auth } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("id")
    .eq("role", "student")
    .order("created_at")
    .limit(1)
    .single();
  if (!auth.user || !profile)
    throw new Error("No se encontró el perfil de Laura.");
  const id = crypto.randomUUID();
  await reserveAI(id, auth.user.id, "report");
  try {
    const evidence = await learnerEvidence(profile.id);
    const { data: memory } = await db
      .from("learner_memory")
      .select("notes")
      .eq("user_id", profile.id)
      .maybeSingle();
    const result = await deepseek(
      [
        {
          role: "system",
          content:
            'Eres un tutor pedagógico en español. Analiza únicamente estos datos reales y su tamaño de muestra. No diagnostiques ni supongas que lentitud es falta de capacidad. Distingue dificultad, dependencia de pistas y tiempo activo. Los tiempos antiguos sin medición fiable son null. Responde primero la consulta específica del profesor si la hay, con una explicación pedagógica útil y ejemplos. Propón una acción concreta para la próxima práctica de UN solo tema, con un ejemplo y criterio de mejora. Si el profesor pregunta por una habilidad, la acción debe trabajar ESA habilidad aunque el tema diario guardado sea otro: el plan es una propuesta, no cambia la sesión actual. Sin consulta específica, prioriza la dificultad observada más relevante. Evalúa comprensión y autonomía; no inventes límites de segundos ni metas de rapidez sin una base temporal suficiente. Si hay pocos datos dilo. No inventes porcentajes ni logros. Antes de redactar comprueba matemáticamente todos tus ejemplos y que cada criterio coincida con el ejercicio: cantidades equivalentes deben identificarse como iguales, y una conversión correcta nunca debe etiquetarse como error. Texto plano, máximo 90 palabras, solo dos párrafos: observación y próximo paso. Devuelve JSON {"report":"análisis y plan para el tutor humano"}.',
        },
        {
          role: "user",
          content: JSON.stringify({ ...evidence, memory: memory?.notes ?? "", tutorQuestion: redactLearningText(question) }),
        },
      ],
      8000,
      true,
    );
    const output = result.json as { report?: unknown };
    if (typeof output.report !== "string" || !output.report.trim())
      throw new Error("No se pudo completar el análisis.");
    const saved = await aiStore()
      .from("ai_reports")
      .insert({
        user_id: profile.id,
        body: output.report,
        evidence_count: evidence.attemptCount,
      });
    if (saved.error) throw new Error("No se pudo guardar el informe.");
    await completeAI(id, "completed", result.model, result.tokens);
    return { report: output.report, evidenceCount: evidence.attemptCount };
  } catch (error) {
    await completeAI(id, "failed").catch(()=>console.warn("ai_finalization_pending"));
    throw error;
  }
}

export async function aiOverview(userId: string) {
  const db = await tutorDatabase();
  const [memory, history, report] = await Promise.all([
    db
      .from("learner_memory")
      .select("notes")
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("coach_messages")
      .select("role,content,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("ai_reports")
      .select("body,created_at,evidence_count")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (memory.error || history.error || report.error)
    throw new Error("No pudimos cargar la memoria del tutor.");
  return {
    memory: memory.data?.notes ?? "",
    messages: (history.data ?? []).reverse(),
    report: report.data,
  };
}
