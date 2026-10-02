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
// The student whose name matches a Drive folder, ignoring case and accents.
export async function studentNamed(db:TutorDb,folderName:string){
  const plain=(t:string)=>t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
  const {data}=await db.from("profiles").select("id,display_name").eq("role","student");
  const matches=(data??[]).filter(p=>plain(String(p.display_name))===plain(folderName));
  return matches.length===1?String(matches[0].id):null;
}
