import type {CSSProperties} from 'react';
import type {ShelterCat} from '@/lib/data/shelter';
import {CatArt} from '@/components/scene/cat-art';
import {Icon} from './icons';
const adoptedOn=new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'long',timeZone:'America/Bogota'});
// One collectible card in Laura's cat album, tinted with the cat's own colors.
export function AlbumCard({cat,number}:{cat:ShelterCat;number:number}) {
 const cares=cat.careCount??0;
 return <article className={`album-card ${cat.adoptedAt?'adopted':''}`} style={{'--cat-body':cat.palette.body,'--cat-belly':cat.palette.belly} as CSSProperties}>
  <div className="album-photo">
   <span className="album-number">Nº {String(number).padStart(2,'0')}</span>
   <CatArt cat={cat} still/>
   {cat.adoptedAt&&<span className="album-stamp"><Icon name="home" size={14}/>Con hogar</span>}
  </div>
  <div className="album-info">
   <h3>{cat.name}</h3>
   <span className="album-trait">{cat.personality}</span>
   <p>{cat.story}</p>
   <small>{cat.adoptedAt?`Adoptado el ${adoptedOn.format(new Date(cat.adoptedAt))}`:<><Icon name="heart" size={13}/>{cares} {cares===1?'cuidado recibido':'cuidados recibidos'}</>}</small>
  </div>
 </article>;
}
