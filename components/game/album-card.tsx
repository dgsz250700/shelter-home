'use client';
import {useRef,type CSSProperties} from 'react';
import type {ShelterCat} from '@/lib/data/shelter';
import {CatArt} from '@/components/scene/cat-art';
import {Icon} from './icons';
const adoptedOn=new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'long',timeZone:'America/Bogota'});
// One small collectible card in Laura's cat album; tapping it opens the full card with the story.
export function AlbumCard({cat}:{cat:ShelterCat}) {
 const dialog=useRef<HTMLDialogElement>(null);
 const cares=cat.careCount??0;
 // The streak Laura reached when this cat arrived, shown like an achievement.
 const badge=cat.arrivalStreak?<span className="album-number" aria-label={`Llegó con ${cat.arrivalStreak} ${cat.arrivalStreak===1?'día':'días'} de racha`}>{cat.arrivalStreak}<Icon name="fire" size={12}/></span>:null;
 const tint={'--cat-body':cat.palette.body,'--cat-belly':cat.palette.belly} as CSSProperties;
 return <>
  <button type="button" className={`album-card ${cat.adoptedAt?'adopted':''}`} style={tint} onClick={()=>dialog.current?.showModal()} aria-haspopup="dialog" aria-label={`Ver la lámina de ${cat.name}`}>
   <span className="album-photo">
    {badge}
    <CatArt cat={cat} still/>
    {cat.adoptedAt&&<span className="album-stamp"><Icon name="home" size={12}/></span>}
   </span>
   <span className="album-info"><strong>{cat.name}</strong><span className="album-trait">{cat.personality}</span>{cat.favorite&&<span className="album-fav"><Icon name="star" size={11}/>{cat.favorite}</span>}</span>
  </button>
  <dialog ref={dialog} className="album-detail" style={tint} aria-label={`Lámina de ${cat.name}`} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
   <button type="button" className="icon-button album-close" aria-label="Cerrar lámina" onClick={()=>dialog.current?.close()}><Icon name="close"/></button>
   <div className="album-photo">
    {badge}
    <CatArt cat={cat} still/>
    {cat.adoptedAt&&<span className="album-stamp"><Icon name="home" size={14}/>Con hogar</span>}
   </div>
   <div className="album-detail-info">
    <h3>{cat.name}</h3>
    <span className="album-trait">{cat.personality}</span>
    {cat.favorite&&<p className="album-favorite"><Icon name="star" size={15}/><b>Favorito:</b> {cat.favorite}</p>}
    <p>{cat.story}</p>
    <small>{cat.adoptedAt?<><Icon name="home" size={14}/>Adoptado el {adoptedOn.format(new Date(cat.adoptedAt))}. Encontró un hogar gracias a tu constancia.</>:<><Icon name="heart" size={14}/>{cares} {cares===1?'cuidado recibido':'cuidados recibidos'}</>}</small>
   </div>
  </dialog>
 </>;
}
