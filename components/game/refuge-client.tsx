"use client";
import { useEffect, useState } from "react";
import {track} from "@/components/telemetry/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CatArt } from "@/components/scene/cat-art";
import { Shelter } from "@/components/scene/shelter";
import type { ShelterCat, RewardStatus } from "@/lib/data/shelter";
import type {
  Mastery,
  Skill,
  Question,
  ShelterState,
  Streak,
} from "@/lib/engine/types";
import {RescueProgress} from "./rescue-progress";
import {AdoptionMoment} from "./adoption-moment";
import {MissionWelcome} from "./mission-welcome";
import {PropTransparency} from "@/components/scene/refuge-prop";
import {FreePractice} from "./free-practice";
import {DAILY_CHANCES, nextCareReward, rewardCopy, careRecipient, type PracticeMode, type CareReward} from "@/lib/engine/challenge";
import type {PracticeSession} from "@/lib/data/student";
import { startMission } from "@/lib/data/actions";
import { Practice } from "./practice";
import { Icon } from "./icons";
import { SkillIcon } from "./skill-icon";



export function RefugeClient({
  cats,
  rewards,
  skills,
  queue,
  state,
  streak,
  userId,
  practiceDates,
  today,
  masteries,
  dailyTries,
}: {
  cats: ShelterCat[];
  rewards: RewardStatus;
  skills: Skill[];
  queue: Question[];
  state: ShelterState;
  streak: Streak;
  userId: string;
  practiceDates: string[];
  today: string;
  masteries: Mastery[];
  dailyTries:number;
}) {
  const router = useRouter();
  const topic = skills.find((s) => s.id === queue[0]?.skillId);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [view, setView] = useState<"home" | "skills" | "cats">("home");
  const [liveState, setLiveState] = useState(state);
  const [liveCats, setLiveCats] = useState(cats);
  const [liveStreak, setLiveStreak] = useState(streak);
  const [tries,setTries]=useState(dailyTries);
  const [celebration,setCelebration]=useState<{reward:CareReward;id:string;catId?:string;catName?:string}|null>(null);
  const [adoption,setAdoption]=useState<ShelterCat|null>(null);
  const [liveRewards,setLiveRewards]=useState(rewards);
  const residents=liveCats.filter(cat=>!cat.adoptedAt);
  const alumni=liveCats.filter(cat=>cat.adoptedAt);
  const nextReward=nextCareReward(liveStreak.total_days);
  const recipient=careRecipient(residents,nextReward);
  const [dates, setDates] = useState(practiceDates);
  useEffect(() => {
    if (!session) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [session]);
  const milestone =
    step < 1
      ? "Una nueva aventura"
      : step < 3
        ? "Cada paso cuenta"
        : step < 5
          ? "Paso a paso"
          : step < 7
            ? "Preparando el comedor"
            : step < 10
              ? "Unos pasos más"
              : "¡Reto completado!";
  const begin = async (mode:PracticeMode="daily",skillId?:string,level?:Skill["base_difficulty"]) => {
    setBusy(true);
    setError("");
    try {
      const started = await startMission(mode,skillId,level);
      track("mission_started",{}, {sessionId:started.sessionId,skillId:started.queue[0]?.skillId});
      setSession(started);
      setStep(started.completedSeeds.length);
      window.scrollTo({ top: 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos abrir la práctica. Inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className={`game-shell ${session ? "is-playing" : ""}`}>
      <PropTransparency/>
      <header className="game-header" inert={Boolean(session)}>
        <Link href="/" className="brand" aria-label="Refugio, inicio">
          <span className="brand-mark">
            <Icon name="paw" size={25} />
          </span>
          <span className="refuge-brand-name">Refugio <small>de Laura</small></span>
        </Link>
        <div className="header-actions">
          <span
            className="streak-chip"
            aria-label={`${liveStreak.current} ${liveStreak.current === 1 ? "día" : "días"} de racha`}
          >
            <Icon name="fire" size={22} />
            <b>{liveStreak.current}</b>

          </span>
          <Link href="/tutor" className="admin-link">
            <Icon name="gear" size={17} />
            Admin
          </Link>
        </div>
      </header>
      <div className="game-content">
        <div className="world-column" inert={Boolean(session)}>
          {session && (
            <div className="mission-track">
              <div>
                <Icon name="paw" />
                <strong>{milestone}</strong>
                <span>{Math.min(step, 10)}/10</span>
              </div>
              <div
                className="mission-dots"
                aria-label={`${step} de 10 pasos completados`}
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <i key={i} className={i < step ? "filled" : ""} />
                ))}
              </div>
            </div>
          )}
          <div hidden={view!=="home"&&!session}><Shelter today={today} lastCare={liveStreak.last_session_date} feedingUnlocked={dates.includes(today)} cats={residents} state={liveState} celebration={celebration} paused={Boolean(session)||view!=="home"} /></div>
          {!session && (
            <>
              <nav className="world-tabs" aria-label="Explorar el refugio">
                {(
                  [
                    { id: "home", label: "Mi refugio", icon: "home" },
                    { id: "cats", label: "Mis gatos", icon: "paw" },
                    { id: "skills", label: "Mis habilidades", icon: "book" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    className={view === item.id ? "selected" : ""}
                    aria-pressed={view===item.id} data-track={`view_${item.id}`} onClick={() => setView(item.id)}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </button>
                ))}
              </nav>
              {view === "cats" && (
                <section className="collection">
                  <h2>Tu pequeña familia</h2>
                  {liveCats.length===0&&<p>El primer reto logrado abre las puertas del refugio.</p>}
                  <div className="cat-list">
                    {residents.map((cat) => (
                      <article key={cat.id}><div className="family-portrait"><CatArt cat={cat} still/></div><div className="family-story"><h3>{cat.name}</h3><span>{cat.personality}</span><p>{cat.story}</p><small>{cat.careCount??0} cuidados recibidos</small></div></article>
                    ))}
                  </div>
                  {alumni.length>0&&<div className="adoption-album"><h3><Icon name="home"/>Ya tienen hogar</h3><p>Tu ayuda sigue siendo parte de su historia.</p><div className="cat-list">{alumni.map(cat=><article key={cat.id}><div className="family-portrait"><CatArt cat={cat} still/></div><div className="family-story"><h3>{cat.name}</h3><span>Adoptado el {new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'long',timeZone:'America/Bogota'}).format(new Date(cat.adoptedAt!))}</span><p>{cat.story}</p><small>Encontró un hogar gracias a tu constancia.</small></div></article>)}</div></div>}
                </section>
              )}
              {view === "skills" && (
                <section className="skill-map">
                  <h2>Mis habilidades</h2>
                  {skills.map((skill) => {
                    const mastery = masteries.find(
                      (m) => m.skill_id === skill.id,
                    );
                    return (
                      <div className="skill-row" key={skill.id}>
                        <SkillIcon skill={skill}/>
                        <div>
                          <strong>{skill.name}</strong>
                          <span>
                            Nivel{" "}
                            {(mastery?.current_level ?? skill.base_difficulty)-1}
                          </span>
                          <progress
                            aria-label={`Progreso en ${skill.name}`} max={100}
                            value={mastery?.mastery_score ?? 0}
                          />
                        </div>
                        <b>{Math.round(mastery?.mastery_score ?? 0)}%</b>
                      </div>
                    );
                  })}
                </section>
              )}
            </>
          )}
        </div>
        <div
          className="action-column" hidden={!session&&view!=="home"}
          role={session ? "dialog" : undefined}
          aria-modal={session ? true : undefined}
          aria-label={session ? (session.mode==="free" ? "Práctica libre" : "Práctica del día") : undefined}
        >
          {session && (
            <button className="practice-close" onClick={() => {track("mission_left",{step},{sessionId:session.sessionId});setSession(null);}}>
              <Icon name="close" />
              Volver al refugio
            </button>
          )}
          {session ? (
            <Practice
              key={session.sessionId}
              sessionId={session.sessionId}
              resumed={session}
              queue={session.queue}
              skills={skills}
              userId={userId}
              onStep={setStep}
              onReward={setLiveState}
              onDone={(result) => {
                setLiveStreak(result.streak);
                if(result.mode==="daily") {
                  setTries(result.dailyTry);
                  if(result.passed)setDates(previous=>[...previous,today]);
                }
                setLiveState(result.state);
                if(result.reward)setCelebration({reward:result.reward,id:session.sessionId,catId:result.careCat?.id,catName:result.careCat?.name});
                if(result.careCat)setLiveCats(previous=>previous.map(cat=>cat.id===result.careCat?.id?result.careCat:cat));
                setLiveRewards(result.rewards);
                if(result.adopted){setAdoption(result.adopted);setLiveCats(previous=>previous.map(cat=>cat.id===result.adopted?.id?result.adopted:cat));}
                if (result.cat)
                  setLiveCats((previous) =>
                    previous.some((c) => c.id === result.cat?.id)
                      ? previous
                      : [...previous, result.cat!],
                  );
                setSession(null);
                router.refresh();
              }}
            />
          ) : (
            <>
              <section className="mission-invite">
                <div className="mission-icon">
                  <Icon name="star" size={30} />
                </div>
                <h2>{dates.includes(today) ? "¡Reto de hoy logrado!" : rewardCopy[nextReward].title}</h2>
                <p>
                  {dates.includes(today) ? "Puedes seguir practicando a tu ritmo." : `${topic?.name ?? "Tu próxima habilidad"} · 7 de 10 al primer intento. Las pistas están disponibles.`}
                </p>
                {topic?.driveFileId&&<div className="daily-bank-ticket"><span>Preparado por tu profe</span><strong>{topic.name}</strong><div aria-label="Diez preguntas de dificultad progresiva">{[1,1,1,2,2,2,3,3,4,4].map((level,i)=><i key={i} style={{height:8+level*4}}/>)}</div><small>10 preguntas · empezamos suave y subimos el nivel</small></div>}
                <MissionWelcome recipient={recipient?.name} recipientCat={recipient} today={today} completed={dates.includes(today)} reward={nextReward} busy={busy} available={tries<DAILY_CHANCES&&queue.length>0} onStart={()=>void begin("daily")}/>
                <div className="mission-perks">
                  <span>
                    <Icon name="book" size={18} />
                    10 desafíos
                  </span>
                  <span>
                    <Icon name="heart" size={18} />A tu ritmo
                  </span>
                </div>
                <button
                  className="primary"
                  onClick={() => void begin("daily")}
                  disabled={busy || queue.length === 0 || dates.includes(today) || tries>=DAILY_CHANCES}
                >
                  {busy ? "Preparando…" : dates.includes(today) ? "¡Reto de hoy completo!" : tries>=DAILY_CHANCES ? "Mañana hay un nuevo reto" : tries>0 ? `Volver a intentarlo · ${tries+1}/3` : "Empezar reto · 1/3"}
                  <Icon name="arrow" />
                </button>
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
                {queue.length === 0 && (
                  <p>Activa una habilidad desde Admin para empezar.</p>
                )}
              </section>
              <RescueProgress rewards={liveRewards}/>
              <p className="care-journey"><Icon name="heart" size={18}/>{recipient?`Hoy cuidamos a ${recipient.name}`:'Tu primer rescate te espera'}</p>
              <FreePractice skills={skills} busy={busy} onStart={(id,level)=>void begin("free",id,level)}/>
            </>
          )}
        </div>
      </div>
      <AdoptionMoment cat={adoption} onClose={()=>setAdoption(null)}/>
    </main>
  );
}
