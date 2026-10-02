import type {RewardStatus} from '@/lib/data/shelter';
import {Icon} from './icons';
export function RescueProgress({rewards}:{rewards:RewardStatus}){
 if(rewards.next==='waiting')return null;
 const adoption=rewards.next==='adoption';
 // Two complete free practices take one day off the next arrival (once per cat).
 const boost=rewards.boost,saved=!adoption&&boost?.used?1:0;
 const needed=rewards.needed-saved,left=Math.max(0,needed-rewards.progressDays);
 return <section className="rescue-progress" aria-label="Próximas recompensas">
 <div className={adoption?'rescue-home':undefined}><Icon name={adoption?'home':'paw'} size={20}/><div><span>{adoption?'Próxima adopción':'Próxima llegada'} <b>{rewards.progressDays}/{needed} días de racha</b></span><progress aria-label={adoption?'Racha para la próxima adopción':'Racha para la próxima llegada'} value={rewards.progressDays} max={needed}/><small>{left===1?'1 día seguido':`${left} días seguidos`} para {adoption?'que un gato encuentre hogar':rewards.residents+rewards.adopted===0?'que llegue tu primer gato':'que llegue otro gato'}.{saved?' Ya adelantaste un día con tus prácticas.':''}</small></div></div>
 {!adoption&&boost?.available&&<div className="rescue-boost"><Icon name="star" size={20}/><div><span>Adelanta un día de racha <b>{boost.practices}/2 prácticas</b></span><progress aria-label="Prácticas para adelantar un día" value={boost.practices} max={2}/><small>Completa {2-boost.practices===1?'1 práctica libre más':'2 prácticas libres'} y tu próximo gatito llegará un día antes.</small></div></div>}
 </section>;
}
