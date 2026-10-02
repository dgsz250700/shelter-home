import "server-only";
import type { tutorDatabase } from "./tutor-auth";
type TutorDb = Awaited<ReturnType<typeof tutorDatabase>>;
// Who a skill is for: the chosen students, or everyone when none is chosen.
export async function assignSkill(db:TutorDb,skillId:string,studentIds:string[]){
  const {data:students,error}=await db.from("profiles").select("id").eq("role","student");
  if(error)throw new Error("No pudimos guardar para quién es esta práctica.");
  const valid=[...new Set(studentIds)].filter(id=>students?.some(s=>s.id===id));
  const cleared=await db.from("skill_students").delete().eq("skill_id",skillId);
  if(cleared.error)throw new Error("No pudimos guardar para quién es esta práctica.");
  if(valid.length){const added=await db.from("skill_students").insert(valid.map(user_id=>({skill_id:skillId,user_id})));if(added.error)throw new Error("No pudimos guardar para quién es esta práctica.");}
}
