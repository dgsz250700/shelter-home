"use server";
import { revalidatePath } from "next/cache";
import { tutorDatabase } from "./tutor-auth";
import { assignSkill } from "./skill-audience";
import type { CustomQuestion } from "@/lib/engine/types";
import {isGeneratedFamily,subjectFamily} from "@/lib/engine/families";
import {validateDriveBank} from "@/lib/engine/drive-bank";
import {validateQuestions} from "@/lib/engine/import-questions";
type ActionState = { error: string; success: string; id?: string };
export async function skillAudience(skillId?:string):Promise<{students:{id:string;name:string}[];assigned:string[]}>{
  const db=await tutorDatabase();
  const [{data:students},{data:rows}]=await Promise.all([
    db.from("profiles").select("id,display_name").eq("role","student").order("created_at"),
    skillId?db.from("skill_students").select("user_id").eq("skill_id",skillId):Promise.resolve({data:[] as {user_id:string}[]}),
  ]);
  return {students:(students??[]).map(s=>({id:String(s.id),name:String(s.display_name)})),assigned:(rows??[]).map(r=>String(r.user_id))};
}
export async function saveSkill(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const db = await tutorDatabase();
    const id = String(form.get("id") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || name;
    const subject = String(form.get("subject") ?? "");
    const mode = String(form.get("mode") ?? "generated");
    const family=String(form.get("family")??subjectFamily(subject));
    if(mode!=="custom"&&!isGeneratedFamily(family))return {error:"Selecciona un generador disponible.",success:""};
    if(subject==="musica"&&mode!=="custom")return {error:"Para música usa tus propias preguntas: todavía no hay un generador de música.",success:""};
    const priority = Number(form.get("priority"));
    const difficulty = Number(form.get("difficulty"));
    if (
      !name ||
      name.length > 100 ||
      !description ||
      !["matematicas", "fisica", "quimica", "musica"].includes(subject) ||
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 10 ||
      !Number.isInteger(difficulty) ||
      difficulty < 1 ||
      difficulty > 4
    )
      return {
        error: "Completa los campos. Prioridad de 1 a 10 y nivel de 1 a 4.",
        success: "",
      };
    const questions: CustomQuestion[] = [];
    if (mode === "custom") {
      const prompts = form.getAll("prompt");
      for (let i = 0; i < prompts.length; i++) {
        const prompt = String(prompts[i]).trim();
        let answer = String(form.getAll("answer")[i] ?? "").trim();
        const format = String(form.getAll("format")[i] ?? "number");
        if (format === "coefficients")
          answer = answer
            .split(/[,;\s]+/)
            .map(Number)
            .join(",");
        const level = Number(form.getAll("level")[i]);
        const hints = [1, 2, 3].map((n) =>
          String(form.getAll(`hint${n}`)[i] ?? "").trim(),
        ) as [string, string, string];
        let choices:unknown=[],matches:unknown=[];
        try{choices=JSON.parse(String(form.getAll("choices")[i]??"[]"));matches=JSON.parse(String(form.getAll("matches")[i]??"[]"));}catch{return {error:`Pregunta ${i+1}: revisa las opciones.`,success:""};}
        try{
          questions.push(...validateQuestions([{sourceNumber:Number(form.getAll("sourceNumber")[i]),prompt,answer,hints,level,answerFormat:format,choices,matches,image:String(form.getAll("image")[i]??""),imageAlt:String(form.getAll("imageAlt")[i]??"")}],true));
        }catch(error){return {error:`Pregunta ${i+1}: ${error instanceof Error?error.message.replace(/^Pregunta 1: /,""):"revisa su contenido."}`,success:""};}
      }
      if (!questions.length)
        return { error: "Añade al menos una pregunta propia.", success: "" };
    }
    if (questions.length > 60)
      return { error: "Guarda hasta 60 preguntas por habilidad.", success: "" };
    if (questions.reduce((n, q) => n + (q.image?.length ?? 0), 0) > 3000000)
      return {
        error:
          "Las imágenes juntas superan 3 MB. Recorta más o divide el material en dos habilidades.",
        success: "",
      };
    if(id){
      const source=await db.from("skills").select("drive_file_id").eq("id",id).maybeSingle();
      if(source.error)throw new Error("No pudimos comprobar el banco. Reintenta.");
      if(source.data?.drive_file_id && form.get("active")==="on"){
        if(mode!=="custom")throw new Error("Un banco de Drive debe conservar sus preguntas propias.");
        validateDriveBank(questions);
      }
    }
    const practiceDays = form
      .getAll("practiceDay")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    const fixedLevel = false;
    const classTopic=String(form.get("classTopic")??"").trim().slice(0,300);
    const values = {
      name,
      description,
      subject,
      active: form.get("active") === "on",
      priority,
      base_difficulty: difficulty,
    };
    const levels = ([1, 2, 3, 4] as const).map((level) => ({
      level,
      description: JSON.stringify(mode === "custom" ? {kind:"custom",practiceDays,fixedLevel,classTopic,questions:questions.filter(q=>q.level===level)} : {kind:"generated",family,practiceDays,fixedLevel,classTopic}),
    }));
    const saved=await db.rpc("save_skill_atomic",{p_id:id || String(form.get("clientId") || crypto.randomUUID()),p_values:{...values,is_test:process.env.NODE_ENV!=="production"},p_levels:levels});
    if(saved.error)throw new Error("No se guardaron cambios. Tus preguntas siguen aquí; vuelve a intentarlo.");
    if(form.get("assign")==="1")await assignSkill(db,String(saved.data),form.getAll("students").map(String));
    revalidatePath("/tutor");
    revalidatePath("/");
    return {
      error: "",
      id: String(saved.data),
      success: values.active ? "Preguntas guardadas. Ya están disponibles en el refugio." : "Borrador guardado. Puedes activarlo cuando quieras.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo guardar. Inténtalo de nuevo.",
      success: "",
    };
  }
}
export async function removeSkill(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const db = await tutorDatabase();
    const { error } = await db
      .from("skills")
      .delete()
      .eq("id", String(form.get("id")));
    if (error)
      return {
        error:
          "Esta habilidad tiene progreso guardado. Desactívala para conservarlo.",
        success: "",
      };
    revalidatePath("/tutor");
    revalidatePath("/");
    return { error: "", success: "Habilidad eliminada." };
  } catch {
    return { error: "No se pudo eliminar la habilidad.", success: "" };
  }
}
export async function saveNote(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const db = await tutorDatabase();
    const body = String(form.get("body") ?? "").trim();
    if (!body) return { error: "Escribe una nota.", success: "" };
    const { error } = await db.from("tutor_notes").insert({
      user_id: String(form.get("user_id")),
      skill_id: String(form.get("skill_id")),
      body,
    });
    if (error) throw error;
    revalidatePath("/tutor");
    return { error: "", success: "Nota guardada." };
  } catch {
    return { error: "No se pudo guardar la nota.", success: "" };
  }
}
export async function saveClassTopic(skillId:string,topic:string){
 if(typeof topic!=='string'||topic.length>300)throw new Error('El tema admite hasta 300 caracteres.');
 const db=await tutorDatabase();const {data:skill,error}=await db.from('skills').select('*,skill_levels(level,description)').eq('id',skillId).single();
 if(error||!skill)throw new Error('Elige una microhabilidad disponible.');
 const levels=(skill.skill_levels as {level:number;description:string}[]).map(l=>{let config:Record<string,unknown>={kind:'generated'};try{config=JSON.parse(l.description) as Record<string,unknown>;}catch{/* Plain legacy generator description. */}return {level:l.level,description:JSON.stringify({...config,classTopic:topic.trim(),fixedLevel:false})};});
 const saved=await db.rpc('save_skill_atomic',{p_id:skillId,p_values:{name:skill.name,description:skill.description,subject:skill.subject,priority:skill.priority,active:skill.active,base_difficulty:1,is_test:process.env.NODE_ENV!=='production'},p_levels:levels});
 if(saved.error)throw new Error('No se guardó el tema. Reintenta.');revalidatePath('/');revalidatePath('/tutor');return {success:true};
}

export async function setBankActive(id:string,active:boolean):Promise<{error?:string}> {
 try {
  if(typeof id!=="string"||typeof active!=="boolean")throw new Error("Revisa el temario seleccionado.");
  const db=await tutorDatabase();
  const result=await db.from('skills').select('*,skill_levels(*)').eq('id',id).single();
  if(result.error||!result.data)throw new Error('No encontramos este temario. Actualiza la página.');
  if(active&&result.data.drive_file_id){
   const {prepareSkill}=await import('./catalog');
   validateDriveBank(prepareSkill(result.data).questions);
  }
  const updated=await db.from('skills').update({active}).eq('id',id);
  if(updated.error)throw new Error('No se pudo guardar el cambio. Inténtalo de nuevo.');
  revalidatePath('/tutor');revalidatePath('/');
  return {};
 }catch(error){return {error:error instanceof Error?error.message:'No se pudo actualizar el temario.'};}
}
