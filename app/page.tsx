import { isConfigured } from "@/lib/data/config";
import { loadPractice } from "@/lib/data/student";
import { getShelter, getRewardStatus } from "@/lib/data/shelter";
import { RefugeClient } from "@/components/game/refuge-client";
import { StudentPicker } from "@/components/game/student-picker";
import { currentStudentId, listStudents } from "@/lib/data/student-access";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (!isConfigured())
    return (
      <main className="auth-shell">
        <h1>Refugio en preparación</h1>
        <p>Conecta Supabase para abrir la puerta del refugio.</p>
      </main>
    );
  // Each student has their own refuge; the device remembers who chose it.
  const [studentId, students] = await Promise.all([currentStudentId(), listStudents()]);
  const student = students.find((s) => s.id === studentId);
  if (!student) return <StudentPicker students={students} />;
  const [practice, cats, rewards] = await Promise.all([loadPractice(), getShelter(), getRewardStatus()]);
  return <RefugeClient cats={cats} rewards={rewards} studentName={student.name} canSwitch={students.length > 1} {...practice} />;
}
