'use client';
import {useEffect,useRef,useState} from 'react';
import {CatArt} from '@/components/scene/cat-art';
import {DEFAULT_LOOK,type CatLook} from '@/lib/engine/cat-look';
import {RefugeProp} from '@/components/scene/refuge-prop';
import {rewardCopy,type CareReward} from '@/lib/engine/challenge';
import {Icon} from './icons';
const stories:Record<CareReward,string>={food:'Un plato lleno y un momento tranquilo. Tu reto de hoy prepara su comida.',bed:'Después de explorar tanto, una camita cómoda será el mejor descanso.',box:'Una caja puede ser un castillo. Hoy puedes preparar su próximo escondite.',treat:'Un churu para saborear despacito después de tu reto.',toy:'Un juguete nuevo para perseguir, saltar y compartir.',yarn:'Un ovillo de estambre para despertar su curiosidad.',vet:'Hoy toca un cuidado especial en la enfermería: su vacuna del juego.'};
// Before any cat arrives, Milo welcomes Laura.
const MILO={...DEFAULT_LOOK,name:'Milo'};
export function MissionWelcome({today,completed,reward,busy,available,onStart,recipient,recipientCat}:{recipient?:string;recipientCat?:CatLook&{name:string};today:string;completed:boolean;reward:CareReward;busy:boolean;available:boolean;onStart:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);
 const [entry]=useState({today,completed});
 useEffect(()=>{let seen=false;try{seen=sessionStorage.getItem(`refugio:welcome:${entry.today}`)==='yes';}catch{/* The invitation can still be closed without storage. */}if(!seen)dialog.current?.showModal();},[entry]);
 function close(){try{sessionStorage.setItem(`refugio:welcome:${today}`,'yes');}catch{/* A new visit may show the invitation again. */}dialog.current?.close();}
 return <><button className="mission-reopen" onClick={()=>dialog.current?.showModal()}><Icon name="paw" size={16}/>Ver misión de hoy</button><dialog ref={dialog} className="mission-welcome" aria-labelledby="welcome-title" onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close();}}>
 <button className="icon-button welcome-close" aria-label="Cerrar misión del día" onClick={close}><Icon name="close"/></button>
 <div className="welcome-art"><CatArt cat={recipientCat??MILO} still/>{!completed&&['food','box','bed'].includes(reward)&&<RefugeProp kind={reward as 'food'|'box'|'bed'}/>}</div>
 <h2 id="welcome-title">{completed?'Hoy hiciste la diferencia':rewardCopy[reward].title}</h2>
 <p>{!completed&&recipient&&<strong>{recipient} cuenta contigo. </strong>}{completed?'Tus gatos ya recibieron su cuidado de hoy. Puedes pasar a saludarlos o practicar un poquito más, a tu ritmo.':stories[reward]}</p>
 {!completed&&<p className="welcome-goal">Logra 7 de 10 respuestas al primer intento. Tienes tres oportunidades y puedes pedir pistas.</p>}
 {completed||!available?<button className="primary" onClick={close}>Entrar a mi refugio<Icon name="arrow"/></button>:<><button className="primary" disabled={busy} onClick={()=>{close();onStart();}}>Ayudar con el reto de hoy<Icon name="arrow"/></button><button className="quiet welcome-later" onClick={close}>Primero quiero ver a mis gatos</button></>}
 </dialog></>;
}
