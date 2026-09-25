import type {ShelterCat} from '@/lib/data/shelter';
import {RESCUE_DAYS} from '@/lib/engine/challenge';
import {Icon} from './icons';
export function RescueProgress({cats,streak}:{cats:ShelterCat[];streak:number}){
 const target=RESCUE_DAYS[cats.length];
 const candidate=cats.filter(c=>!c.adoptedAt).sort((a,b)=>(b.careCount??0)-(a.careCount??0))[0];
 return <section className="rescue-progress" aria-label="Próximas recompensas">
 {target&&<div><Icon name="paw" size={20}/><div><span>Próximo rescate <b>{Math.min(streak,target)}/{target} días de racha</b></span><progress aria-label="Racha para el próximo rescate" value={Math.min(streak,target)} max={target}/><small>{Math.max(0,target-streak)} {target-streak===1?'día':'días'} para abrir otra puerta.</small></div></div>}
 {candidate&&<div className="rescue-home"><Icon name="home" size={20}/><div><span>Un hogar para {candidate.name}<b>{Math.min(candidate.careCount??0,3)}/3 cuidados</b></span><progress aria-label={`Cuidados de ${candidate.name}`} value={Math.min(candidate.careCount??0,3)} max={3}/></div></div>}
 </section>;
}
