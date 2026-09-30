import type {Level, Question, Skill} from './types';
export const DAILY_TARGET = 7;
export const DAILY_CHANCES = 3;
export type PracticeMode = 'daily' | 'free';
export type CareReward = 'food' | 'box' | 'bed' | 'treat' | 'toy' | 'yarn' | 'vet';
export const rewardCopy: Record<CareReward, {title:string;delivered:string}> = {
  food: {title:'Un plato de comida',delivered:'¡La comida está servida!'},
  box: {title:'Una caja para explorar',delivered:'¡Una caja nueva para esconderse y jugar!'},
  bed: {title:'Una camita para descansar',delivered:'¡La camita está lista! Hora de acomodarse.'},
  treat: {title:'Un churu para compartir',delivered:'¡Un churu! Un premio cremoso después de tanto explorar.'},
  toy: {title:'Un juguete para estrenar',delivered:'¡Un juguete nuevo! Que empiece el juego.'},
  yarn: {title:'Una bola de estambre',delivered:'¡El estambre está listo para unas patitas curiosas!'},
  vet: {title:'Una visita a la veterinaria',delivered:'Vacuna del juego recibida. Un cuidado más para crecer fuerte.'},
};
export const CARE_CYCLE:readonly CareReward[]=['bed','food','box','treat','toy','yarn','vet'];
export function nextCareReward(totalDays:number):CareReward {
  return CARE_CYCLE[Math.max(0,Math.floor(totalDays)) % CARE_CYCLE.length];
}
export function practiceLevels(skill:Skill):Level[] {
  return skill.family==='custom' ? [...new Set(skill.questions?.map(q=>q.level)??[])].sort() : [1,2,3,4];
}
export function freeQueue(skill:Skill,level:Level,seed:string):Question[] {
  if(!practiceLevels(skill).includes(level))throw new Error('Este nivel aún no tiene preguntas. Elige otro.');
  return Array.from({length:10},(_,i)=>({skillId:skill.id,family:skill.family,level,seed:`v2:${seed}:${i}`}));
}

export function careRecipient<T extends {id:string;personality:string;careCount?:number;adoptedAt?:string|null}>(cats:T[],reward:CareReward):T|undefined {
 const preferred:Record<CareReward,string[]>={food:[],bed:['dormilón','asustadizo'],box:['curioso'],treat:['cariñoso','gruñón','elegante'],toy:['travieso','loquito'],yarn:['travieso','curioso'],vet:[]};
 return cats.filter(c=>!c.adoptedAt).sort((a,b)=>(a.careCount??0)-(b.careCount??0)||Number(preferred[reward].includes(b.personality))-Number(preferred[reward].includes(a.personality))||a.id.localeCompare(b.id))[0];
}
