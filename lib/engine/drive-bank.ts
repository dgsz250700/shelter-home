import {validateQuestions} from './import-questions';
export const DAILY_LEVELS = [1,1,1,2,2,2,3,3,4,4] as const;
export function driveFolderId(value:string){
 const raw=value.trim();
 if(/^[\w-]{5,200}$/.test(raw))return raw;
 try{const url=new URL(raw);if(url.protocol==='https:'&&url.hostname==='drive.google.com'){const id=url.pathname.match(/\/folders\/([\w-]+)/)?.[1];if(id&&/^[\w-]{5,200}$/.test(id))return id;}}catch{/* A folder link or identifier is required. */}
 throw new Error('Pega el enlace de una carpeta de Google Drive.');
}
export function validateDriveBank(value:unknown){
 const questions=validateQuestions(value,true);
 // Same wording is fine when the figure or the options differ (e.g. «¿Qué nota aparece?» over different staffs).
 const key=(q:typeof questions[number])=>q.sourceNumber?`#${q.sourceNumber}`:[q.prompt.trim().toLowerCase(),q.image??'',(q.choices??[]).map(c=>c.label.toLowerCase()).join('|')].join('§');
 if(new Set(questions.map(key)).size!==questions.length)throw new Error('Hay preguntas repetidas en el PDF. Revisa el banco.');
 // Any levels are fine (a PDF may stop at level 2); daily practice uses the levels present.
 if(questions.length<10)throw new Error('El banco necesita al menos 10 preguntas.');
 return questions;
}
export function sourceContainsPrompt(source:string,prompt:string){
 const compact=(s:string)=>s.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
 return compact(source).includes(compact(prompt));
}
