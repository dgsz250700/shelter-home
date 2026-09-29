import "server-only";
import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicConfig } from "./config";
import { database, isTutorPreview } from "./server";
import { prepareSkill } from "./catalog";
import type {
  Attempt,
  Mastery,
  Streak,
  Question,
  Level,
  ShelterState,
} from "@/lib/engine/types";
import { freeQueue, type PracticeMode, type CareReward } from "@/lib/engine/challenge";
import { selectDaily } from "@/lib/engine/selector";
import {
  dayKey,
  updateMastery,
  visibleStreak,
} from "@/lib/engine/mastery";
import { evaluate, exerciseFor } from "@/lib/engine/exercises";
import type { ShelterCat, RewardStatus } from "./shelter";
type LauraConnection = {db: SupabaseClient; userId:string; expiresAt:number};
let connected:LauraConnection|null=null;
let connecting:Promise<LauraConnection>|null=null;
export const studentClient = cache(async () => {
  if(connected && connected.expiresAt>Date.now()+60000)return connected;
  if(connecting)return connecting;
  connecting=(async()=>{
    const {url,key}=publicConfig();
    const db=connected?.db ?? createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const email=process.env.LAURA_EMAIL,password=process.env.LAURA_PASSWORD;
    if(!email||!password)throw new Error("Falta el acceso de Laura.");
    let auth=connected ? await db.auth.refreshSession() : await db.auth.signInWithPassword({email,password});
    if(auth.error && connected)auth=await db.auth.signInWithPassword({email,password});
    if(auth.error||!auth.data.user)throw new Error("El refugio necesita reconectar. Intentémoslo de nuevo.");
    connected={db,userId:auth.data.user.id,expiresAt:(auth.data.session?.expires_at ?? Math.floor(Date.now()/1000)+300)*1000};
    return connected;
  })();
  try{return await connecting;}finally{connecting=null;}
});
export async function loadPractice() {
  const { db, userId } = await studentClient();
  const [skills, masteries, streak, state, sessions, practiced] =
    await Promise.all([
      db
        .from("skills")
        .select("*,skill_levels(description)")
        .eq("active", true)
        .order("priority", { ascending: false }),
      db.from("skill_mastery").select("*").eq("user_id", userId),
      db.from("streaks").select("*").eq("user_id", userId).maybeSingle(),
      db
        .from("shelter_state")
        .select("food,blankets,lamps,clean_zones,affection,boxes,beds,treats,toys,yarn,vet_visits,last_care_date,last_reward")
        .eq("user_id", userId)
        .maybeSingle(),
      db
        .from("sessions")
        .select("date,passed,mode,daily_try,completed")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(60),
      db
        .from("attempts")
        .select("skill_id,sessions!inner(mode)")
        .eq("sessions.mode", "daily")
        .eq("user_id", userId)
        .gte("created_at", `${dayKey()}T00:00:00-05:00`)
        .order("created_at", { ascending: true })
        .limit(1),
    ]);
  if (
    skills.error ||
    masteries.error ||
    streak.error ||
    state.error ||
    sessions.error ||
    practiced.error
  )
    throw new Error("No pudimos cargar el refugio. Vuelve a intentarlo.");
  const prepared = (skills.data ?? [])
    .map(prepareSkill)
    .filter((s) => s.family !== "custom" || s.questions?.length);
  const streakData = (streak.data ?? {
    current: 0,
    best: 0,
    total_days: 0,
    last_session_date: null,
  }) as Streak;
  const queue = selectDaily(
    prepared,
    (masteries.data ?? []) as Mastery[],
    dayKey(),
    `daily-${dayKey()}-${crypto.randomUUID()}`,
    practiced.data?.[0]?.skill_id,
  );
  return {
    skills: prepared,
    masteries: (masteries.data ?? []) as Mastery[],
    queue,
    streak: { ...streakData, current: visibleStreak(streakData, dayKey()) },
    state: (state.data ?? {
      food: 0,
      blankets: 0,
      lamps: 0,
      clean_zones: 0,
      affection: 0,
    }) as ShelterState,
    userId,
    practiceDates: (sessions.data ?? []).filter(s=>s.passed && s.mode==="daily").map((s) => String(s.date)),
    dailyTries: Math.max(0,...(sessions.data??[]).filter(s=>s.mode==="daily" && s.date===dayKey() && s.completed).map(s=>Number(s.daily_try))),
    today: dayKey(),
  };
}
export type PracticeSession = {sessionId:string;queue:Question[];mode:PracticeMode;dailyTry:number;completedSeeds:string[];attempts:Attempt[]};
export async function createSession(mode:PracticeMode='daily',skillId?:string,level?:Level):Promise<PracticeSession> {
  if(!['daily','free'].includes(mode))throw new Error("Elige reto o práctica libre.");
  const {db,userId}=await studentClient();
  const practice=await loadPractice();
  const skill=practice.skills.find(s=>s.id===skillId);
  const queue=mode==='free' ? (skill && level ? freeQueue(skill,level,crypto.randomUUID()) : []) : practice.queue;
  if(queue.length!==10)throw new Error("Elige una habilidad y un nivel con preguntas.");
  const saved=await db.rpc('start_practice_atomic',{p_mode:mode,p_queue:queue.map(q=>q.family==='custom'?{...q,seed:q.seed.replace(/^v2:/,'v4:')}:q)});
  if(saved.error)throw new Error(saved.error.message.includes('DAILY_PASSED') ? '¡El reto ya está logrado! Puedes practicar libremente.' : saved.error.message.includes('DAILY_LIMIT') ? 'Hoy usaste tus tres oportunidades. La práctica libre sigue abierta.' : 'No pudimos abrir la práctica. Inténtalo otra vez.');
  const session=saved.data as {id:string;planned_queue:Question[];mode:PracticeMode;daily_try:number;completed_seeds:string[]};
  const attempts=await db.from('attempts').select('*').eq('session_id',session.id).eq('user_id',userId).order('created_at');
  if(attempts.error)throw new Error('No pudimos recuperar tus respuestas. Vuelve a abrir la práctica.');
  return {sessionId:session.id,queue:session.planned_queue,mode:session.mode,dailyTry:session.daily_try,completedSeeds:session.completed_seeds,attempts:attempts.data as Attempt[]};
}
export async function completeQuestion(sessionId:string,seed:string) {
  const {db}=await studentClient();
  const saved=await db.rpc('complete_question_atomic',{p_session:sessionId,p_seed:seed});
  if(saved.error)throw new Error('No se guardó este paso. Toca Siguiente paso otra vez.');
}
export async function saveAttempt(input: Omit<Attempt, "id" | "created_at"> & {request_id?:string}) {
  if(![1,2,3,4].includes(input.level)||typeof input.exercise_seed!=="string"||input.exercise_seed.length>200||typeof input.given_answer!=="string"||!Number.isFinite(input.response_ms)||!Number.isInteger(input.hint_level))throw new Error("Revisemos la respuesta antes de guardarla.");
  const {db,userId}=await studentClient();
  const requestId=input.request_id ?? crypto.randomUUID();
  if(!/^[0-9a-f-]{36}$/i.test(requestId))throw new Error("Vuelve a comprobar la respuesta.");
  const skillRow=await db.from("skills").select("*,skill_levels(description)").eq("id",input.skill_id).single();
  if(skillRow.error)throw new Error("No pudimos abrir esta habilidad. Tu respuesta sigue aquí.");
  const skill=prepareSkill(skillRow.data);
  const exercise=exerciseFor(skill,{skillId:skill.id,family:skill.family,level:input.level,seed:input.exercise_seed});
  const result=evaluate(exercise,input.given_answer);
  if(!result.valid)throw new Error(result.message);
  for(let retry=0;retry<3;retry++) {
    const [history,current]=await Promise.all([
      db.from("attempts").select("*").eq("user_id",userId).eq("skill_id",skill.id).order("created_at",{ascending:false}).limit(200),
      db.from("skill_mastery").select("*").eq("user_id",userId).eq("skill_id",skill.id).maybeSingle()
    ]);
    if(history.error||current.error)throw new Error("No pudimos leer tu avance. Reintenta: tu respuesta sigue aquí.");
    const row:Attempt={id:requestId,user_id:userId,skill_id:skill.id,level:input.level,exercise_seed:input.exercise_seed,prompt_text:exercise.prompt,expected_answer:exercise.answer,given_answer:input.given_answer,correct:result.correct,error_type:result.errorType,hint_level:Math.max(0,Math.min(3,input.hint_level)),response_ms:Math.max(0,Math.min(3600000,input.response_ms)),timing_version:input.timing_version===2?2:1,ai_help:Boolean(input.ai_help),session_id:input.session_id,created_at:new Date().toISOString()};
    const previous=current.data ?? {skill_id:skill.id,mastery_score:0,current_level:input.level,recent_accuracy:0,attempts_total:0,last_practiced_at:null};
    const next=updateMastery(previous,row,(history.data??[]).reverse() as Attempt[]);
    const saved=await db.rpc("record_attempt_atomic",{p_row:{...row,is_test:process.env.NODE_ENV!=="production" || await isTutorPreview()},p_mastery:next,p_expected_total:previous.attempts_total});
    if(saved.error?.message.includes("STALE_MASTERY"))continue;
    if(saved.error)throw new Error("No se confirmó el guardado. Vuelve a comprobar: no duplicaremos tu respuesta.");
    return saved.data as {state:ShelterState;duplicate:boolean};
  }
  throw new Error("El refugio está guardando otro avance. Prueba otra vez en un momento.");
}
export async function finishSession(sessionId:string,_correctCount:number,durationMs:number) {
  const {db}=await studentClient();
  const saved=await db.rpc("finish_mission_atomic",{p_session:sessionId,p_is_test:process.env.NODE_ENV!=="production" || await isTutorPreview(),p_duration:Math.max(0,Math.min(7200000,Math.round(durationMs)||0))});
  if(saved.error)throw new Error("Aún no se confirmó el reto. Reintenta; conservamos lo que ya guardaste.");
  const result=saved.data as {streak:Streak;cat:ShelterCat|null;adopted:ShelterCat|null;careCat:ShelterCat|null;rewards:RewardStatus;reward:CareReward|null;state:ShelterState;passed:boolean;correct:number;mode:PracticeMode;dailyTry:number};
  return {...result,streak:{...result.streak,current:visibleStreak(result.streak,dayKey())}};
}
export async function getTutorSummary() {
  const db = await database();
  const [skills, attempts, sessions, mastery, notes, streaks, profiles] =
    await Promise.all([
      db
        .from("skills")
        .select("*,skill_levels(description)")
        .order("created_at"),
      db
        .from("attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
      db.from("sessions").select("*").order("date", { ascending: false }),
      db.from("skill_mastery").select("*"),
      db
        .from("tutor_notes")
        .select("*")
        .order("created_at", { ascending: false }),
      db.from("streaks").select("*"),
      db.from("profiles").select("id").eq("role", "student").single(),
    ]);
  if (
    skills.error ||
    attempts.error ||
    sessions.error ||
    mastery.error ||
    notes.error ||
    streaks.error ||
    profiles.error
  )
    throw new Error("No pudimos cargar el panel.");
  return {
    skills: skills.data.map(prepareSkill),
    attempts: attempts.data as Attempt[],
    sessions: sessions.data,
    mastery: mastery.data as Mastery[],
    notes: notes.data,
    streaks: streaks.data,
    userId: profiles.data.id,
  };
}
