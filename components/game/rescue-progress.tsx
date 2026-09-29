import type {RewardStatus} from '@/lib/data/shelter';
import {Icon} from './icons';
export function RescueProgress({rewards}:{rewards:RewardStatus}){
 if(rewards.next==='waiting')return null;
 const adoption=rewards.next==='adoption',left=Math.max(0,rewards.needed-rewards.progressDays);
 return <section className="rescue-progress" aria-label="Próximas recompensas">
 <div className={adoption?'rescue-home':undefined}><Icon name={adoption?'home':'paw'} size={20}/><div><span>{adoption?'Próxima adopción':'Próxima llegada'} <b>{rewards.progressDays}/{rewards.needed} días de racha</b></span><progress aria-label={adoption?'Racha para la próxima adopción':'Racha para la próxima llegada'} value={rewards.progressDays} max={rewards.needed}/><small>{left===1?'1 día seguido':`${left} días seguidos`} para {adoption?'que un gato encuentre hogar':rewards.residents+rewards.adopted===0?'que llegue tu primer gato':'que llegue otro gato'}.</small></div></div>
 </section>;
}
