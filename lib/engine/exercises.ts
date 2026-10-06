import {equivalentExpressions, parseExpression, expressionSymbols} from "./algebra";
import type { Family, Level, Exercise, Skill, Question } from "./types";
import { random } from "./random";
import { equations } from "./generators/equations";
import {legacyUnits} from "./generators/units-legacy";
import {geometry} from "./generators/geometry";
import {measurement} from "./generators/measurement";
import { units } from "./generators/units";
import { chemistry } from "./generators/chemistry";
import { gradeRhythm, parsePlayed, rhythmError, rhythmTolerance } from "./rhythm";
export function generate(
  family: Family,
  skillId: string,
  level: Level,
  seed: string,
): Exercise {
  if (family === "custom")
    throw new Error("Selecciona una pregunta del tutor.");
  if(family === "perimeter" || family === "area")return geometry(skillId,level,seed,family);
  return { equations, units, chemistry, measurement }[family](skillId, level, seed);
}
function baseExerciseFor(skill: Skill, question: Question): Exercise {
  if(skill.family === "units" && !question.seed.startsWith("v2:"))return legacyUnits(skill.id,question.level,question.seed);
  if(skill.family === "equations")return equations(skill.id,question.level,question.seed,skill.classTopic);
  if (skill.family !== "custom")
    return generate(skill.family, skill.id, question.level, question.seed);
  const bank = skill.questions ?? [];
  const matching = bank.filter((q) => q.level === question.level);
  const choices = matching.length ? matching : bank;
  if (!choices.length)
    throw new Error("Esta habilidad necesita al menos una pregunta.");
  const match = question.seed.match(/^(.*):(\d+)(:repaso)?$/);
  const base = match?.[1] ?? question.seed;
  const offset = Math.floor(random(base)() * choices.length);
  const index = Number(match?.[2] ?? 0) + (match?.[3] ? 3 : 0);
  const ordered=/^v[34]:/.test(question.seed)?choices.map(q=>({q,order:random(base+JSON.stringify(q))()})).sort((a,b)=>a.order-b.order).map(item=>item.q):choices;
  const picked = ordered[((/^v[34]:/.test(question.seed)?0:offset) + index) % ordered.length];
  return {
    ...picked,
    choices: question.seed.startsWith("v4:") && picked.answerFormat === "choice" ? picked.choices?.map(c=>({c,order:random(question.seed+":"+c.value)()})).sort((a,b)=>a.order-b.order).map(item=>item.c) : picked.choices,
    skillId: skill.id,
    level: question.level,
    seed: question.seed,
    errorSignatures: [],
  };
}
function numeric(raw: string): number | null {
  const text = raw.trim().replace(/\s+/g, "").replace(",", ".");
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(
      text,
    )
  )
    return null;
  const parts = text.split("/").map(Number);
  const result = parts.length === 2 ? parts[0] / parts[1] : parts[0];
  return Number.isFinite(result) && Math.abs(result) <= 1e12 ? result : null;
}
export type Evaluation =
  | { valid: false; message: string }
  | { valid: true; correct: boolean; errorType: string | null };
export const normalizedText=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g," ").replace(/[.!?]+$/,"");
// Written answers: separators like "-", ",", "/" or "y" between words do not matter ("Re - Si" = "re si" = "Re, Si").
export const looseText=(text:string)=>normalizedText(text).replace(/[-–—,;:/|·.]+/g," ").replace(/\sy\s/g," ").replace(/\s+/g," ").trim();
export function evaluate(exercise: Exercise, input: string): Evaluation {
  if (input.length > 100)
    return { valid: false, message: "La respuesta es demasiado larga." };
  if(exercise.answerFormat === "text"){
    if(!input.trim())return {valid:false,message:"Escribe una respuesta corta."};
    const correct=looseText(input)===looseText(exercise.answer);
    return {valid:true,correct,errorType:correct?null:"RESPUESTA_CONCEPTUAL"};
  }
  if(exercise.answerFormat === "rhythm"){
    const played=parsePlayed(input);
    if(!played||!exercise.rhythm)return {valid:false,message:"Toca el compás primero."};
    const grade=gradeRhythm(exercise.rhythm.notes.map(([at])=>at),played,rhythmTolerance(exercise.level,exercise.rhythm.notes));
    return {valid:true,correct:grade.passed,errorType:grade.passed?null:rhythmError(grade)};
  }
  if(exercise.answerFormat === "match"){
    const values=input.split(","); const count=exercise.matches?.length??0;
    if(!count||values.length!==count||new Set(values).size!==count||values.some(v=>!/^\d+$/.test(v)||Number(v)>=count))return {valid:false,message:"Relaciona cada elemento con una opción diferente."};
    const correct=values.every((v,i)=>Number(v)===i);return {valid:true,correct,errorType:correct?null:"ASOCIACION_INCORRECTA"};
  }
  if(exercise.answerFormat === "choice" || exercise.answerFormat === "boolean"){
    const value=exercise.choices?.find(c=>normalizedText(c.value)===normalizedText(input))?.value;
    if(!exercise.choices?.some(c=>c.value===value))return {valid:false,message:"Elige una de las opciones."};
    return {valid:true,correct:value===exercise.answer,errorType:value===exercise.answer?null:exercise.errorSignatures.find(s=>s.value===value)?.errorType??"UNKNOWN"};
  }
  if (exercise.answerFormat === "expression") {
    const raw=input.trim();
    const pieces=raw.split('=');
    if(pieces.length>2 || (pieces.length===2 && pieces[0].trim()!==exercise.target))return {valid:false,message:`Escribe solo la expresión${exercise.target ? ` o ${exercise.target} = …` : ''}.`};
    const value=pieces.at(-1) ?? '';
    const allowed=expressionSymbols(exercise.formula ?? exercise.answer);
    try {
      parseExpression(value);
      if(expressionSymbols(value).some(s=>!allowed.includes(s)))return {valid:false,message:'Usa las letras de la fórmula; mayúsculas y minúsculas son distintas.'};
      if(exercise.target && expressionSymbols(value).includes(exercise.target))return {valid:true,correct:false,errorType:'VARIABLE_SIN_AISLAR'};
      if(equivalentExpressions(value,exercise.answer))return {valid:true,correct:true,errorType:null};
      return {valid:true,correct:false,errorType:exercise.errorSignatures.find(s=>equivalentExpressions(value,s.value))?.errorType ?? 'UNKNOWN'};
    } catch {return {valid:false,message:'Completa la expresión con letras, operaciones y paréntesis. Por ejemplo F/a.'};}
  }
  if (exercise.answerFormat === "coefficients") {
    const parts = input.trim().split(/[,;\s]+/);
    const expected = exercise.answer.split(",").map(Number);
    if (
      parts.length !== expected.length ||
      parts.some(
        (v) => !/^\d+$/.test(v) || Number(v) <= 0 || Number(v) > 100000,
      )
    )
      return {
        valid: false,
        message: `Escribe ${expected.length} enteros positivos separados por comas.`,
      };
    const numbers = parts.map(Number),
      answer = numbers.join(",");
    if (answer === exercise.answer)
      return { valid: true, correct: true, errorType: null };
    const ratios = numbers.map((n, i) => n / expected[i]);
    const multiple =
      ratios.every((r) => Math.abs(r - ratios[0]) < 1e-9) && ratios[0] > 1;
    return {
      valid: true,
      correct: false,
      errorType: multiple
        ? "RATIO_NO_MINIMO"
        : (exercise.errorSignatures.find((s) => s.value === answer)
            ?.errorType ?? "UNKNOWN"),
    };
  }
  const value = numeric(input);
  if (value === null)
    return {
      valid: false,
      message: "Escribe un número o una fracción, por ejemplo 0,5 o 1/2.",
    };
  const expected = numeric(exercise.answer);
  if (expected === null) throw new Error("Respuesta canónica inválida");
  const close = (a: number, b: number) =>
    Math.abs(a - b) <= (exercise.tolerance ?? 1e-9);
  if (close(value, expected))
    return { valid: true, correct: true, errorType: null };
  return {
    valid: true,
    correct: false,
    errorType:
      exercise.errorSignatures.find((s) => {
        const v = numeric(s.value);
        return v !== null && close(value, v);
      })?.errorType ?? "UNKNOWN",
  };
}

// Recognition alternates with recall; answer values keep the same server grading and error taxonomy.
export function exerciseFor(skill:Skill,question:Question):Exercise {
 const exercise=baseExerciseFor(skill,question);
 const position=Number(question.seed.match(/:(\d+)(?::repaso)?$/)?.[1]??0);
 if(exercise.choices || skill.family==='custom' || position%3===2)return exercise;
 const wrong:string[]=[];
 for(const signature of exercise.errorSignatures){
  const result=evaluate(exercise,signature.value);
  if(!result.valid || result.correct)continue;
  if(wrong.some(answer=>{const comparison=evaluate({...exercise,answer},signature.value);return comparison.valid&&comparison.correct;}))continue;
  wrong.push(signature.value);if(wrong.length===2)break;
 }
 if(wrong.length<2)return exercise;
 const values=[exercise.answer,...wrong],rng=random(`${question.seed}:choices`);
 for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
 return {...exercise,choices:values.map(value=>({value,label:exercise.answerFormat==='expression'?`${exercise.target??''} = ${value.replaceAll('*',' · ')}`:exercise.answerFormat==='coefficients'?`(${value.split(',').join(', ')})`:value.replace('.',',')}))};
}
