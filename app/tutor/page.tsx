import {DriveLibrary} from "@/components/tutor/drive-library";
import {LearningProgress} from "@/components/tutor/learning-progress";
import {usageData} from "@/lib/data/telemetry";
import { CatalogBrowser } from "@/components/tutor/catalog-browser";
import Image from "next/image";
import { TutorWorkspace } from "@/components/tutor/workspace";
import { PracticeLab } from "@/components/tutor/practice-lab";
import Link from "next/link";
import { requireTutor } from "@/lib/data/session";
import { getTutorSummary } from "@/lib/data/student";
import { signOut } from "@/lib/data/auth";
import { band, visibleStreak, dayKey } from "@/lib/engine/mastery";
import { SkillEditor, NoteForm } from "@/components/tutor/skill-editor";
import { AIInsights } from "@/components/tutor/ai-insights";
import { aiOverview } from "@/lib/data/ai";
import { Icon } from "@/components/game/icons";
export default async function Tutor({ searchParams }: { searchParams: Promise<{ estudiante?: string; vista?: string }> }) {
  await requireTutor();
  const params = await searchParams;
  const data = await getTutorSummary(params.estudiante);
  const name = data.student.name;
  const [ai,usage] = await Promise.all([aiOverview(data.userId),usageData()]);
  const completed = data.sessions.filter((s) => s.completed);
  const streak = data.streaks[0];

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Icon name="paw" />
          </span>
          michilingo.
        </Link>
        <nav>
          <Link className="secondary" href="/">
            <Icon name="home" size={19} />
            Ver refugio
          </Link>
          <form action={signOut}>
            <button className="quiet">Salir</button>
          </form>
        </nav>
      </header>
      <div className="admin-heading">
        <div>
          <h1>La práctica de {name}</h1>
          <p>
            Revisa su avance y prepara la siguiente microhabilidad.
          </p>
        </div>
        <Image className="admin-mascot" src="/art/numa.webp" width={160} height={160} alt="Numa listo para preparar una práctica"/>
        <a href="#drive" className="primary">
          <Icon name="plus" />
          Nueva microhabilidad
        </a>
      </div>
      <TutorWorkspace students={data.students} current={data.student.id} initial={params.vista}>
      <DriveLibrary key={data.student.id} skills={data.skills} studentName={name}/>

      <section
        id="progress"
        className="admin-stats"
        aria-label="Resumen de práctica"
      >
        {[
          [
            "Racha actual",
            streak ? `${visibleStreak(streak, dayKey())} ${visibleStreak(streak, dayKey()) === 1 ? "día" : "días"}` : "0 días",
          ],
          ["Mejor racha", `${streak?.best ?? 0} ${streak?.best === 1 ? "día" : "días"}`],
          [
            "Tiempo de práctica",
            `${Math.round(completed.reduce((n, s) => n + s.duration_ms, 0) / 60000)} min`,
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
      <LearningProgress attempts={data.attempts} skills={data.skills} today={dayKey()} events={usage.events}/>
      <section id="catalog" className="admin-catalog">
        <h2>
          Tus temarios <span>{data.skills.length}</span>
        </h2>
        <p>
          Elige qué practica {name}.
        </p>
        <CatalogBrowser key={data.student.id} skills={data.skills}>
        {data.skills.map((skill) => {
          const attempts = data.attempts.filter((a) => a.skill_id === skill.id);
          const mastery=data.mastery.find(m=>m.skill_id===skill.id);
          const accuracy=(rows:typeof attempts)=>Math.round(rows.filter(a=>a.correct).length/rows.length*100);
          return (
            <details className="admin-skill" key={skill.id}>
              <summary>
                <Icon name="book" />
                <div>
                  <strong>{skill.name}</strong>
                  <span>
                    {skill.family === "custom"
                      ? `${skill.questions?.length ?? 0} preguntas propias`
                      : "Ejercicios automáticos"}{" "}
                    · {band(mastery?.mastery_score ?? 0)}
                  </span>
                </div>
                <span
                  className={skill.active ? "active-label" : "inactive-label"}
                >
                  {skill.active ? "Activa" : "Pausada"}
                </span>
                <b>
                  {attempts.length ? `${accuracy(attempts)}%` : "Sin práctica"}
                </b>
                <Icon name="plus" size={20} />
              </summary>
              <div className="admin-skill-body">
                <SkillEditor skill={skill} />
                <h3>Notas del tutor</h3>
                {data.notes
                  .filter((n) => n.skill_id === skill.id)
                  .map((n) => (
                    <p className="saved-note" key={n.id}>
                      {n.body}
                    </p>
                  ))}
                <NoteForm skillId={skill.id} userId={data.userId} />
              </div>
            </details>
          );
        })}
        </CatalogBrowser>
      </section>
      <section className="new-skill-section" id="new-skill">
        <PracticeLab skills={data.skills}/>
        <details className="tutor-analysis"><summary>Análisis de {name} (opcional)</summary><AIInsights key={data.student.id} studentId={data.student.id} initial={ai.report} memory={ai.memory} messages={ai.messages}/></details>
      </section>
      </TutorWorkspace>
    </main>
  );
}
