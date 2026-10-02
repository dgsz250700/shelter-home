import type {Skill} from '@/lib/engine/types';
export function SkillIcon({skill}:{skill:Skill}) {
 const shape=skill.family==='perimeter'||skill.family==='area';
 const conversion=skill.family==='units'||skill.family==='measurement'||/conversi[oó]n|unidades/i.test(skill.name);
 if(skill.subject==='musica')return <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>;
 return <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
 {shape?<><path d="M4 4h16v16H4Z"/>{skill.family==='area'?<path d="M4 12h16M12 4v16"/>:<path d="M7 2h10M22 7v10"/>}</>:conversion?<><path d="M3 7h18l-4-4M21 17H3l4 4M7 11v2m5-3v4m5-3v2"/></>:skill.family==='chemistry'||skill.subject==='quimica'?<><path d="M9 2h6M10 2v7L4 19q-1 3 3 3h10q4 0 3-3L14 9V2M7 15h10"/><circle cx="11" cy="18" r="1"/></>:skill.subject==='fisica'&&!/despej|ecuaci/i.test(skill.name)?<><circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(55 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-55 12 12)"/></>:<><path d="m3 6 6 12M9 6 3 18M14 9h7m-7 6h7"/></>}
 </svg>;
}
