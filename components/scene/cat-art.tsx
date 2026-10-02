import type {CSSProperties} from 'react';
import {CatFigure} from './cat-figure';
import {DEFAULT_LOOK,type CatLook} from '@/lib/engine/cat-look';
import {spriteFor,spriteKeyframes,type SpriteSheet} from '@/lib/engine/cat-sprites';
import {SpriteRotation} from './sprite-rotation';
const sheetStyle=(sheet:SpriteSheet,name:string)=>({backgroundImage:`url(${sheet.src})`,aspectRatio:`${sheet.width}/${sheet.height}`,animationName:`cat-sprite-${name}`,'--frames':sheet.frames,'--loop':`${(sheet.rest??0)+sheet.seconds}s`,'--direction':sheet.pingPong?'alternate':'normal'}) as CSSProperties;
// A catalog cat, or the refuge's default cat where no specific cat applies.
// `still` prefers the cat's portrait photo over its animation.
export function CatArt({cat,still=false}:{cat?:CatLook&{name?:string};still?:boolean}) {
 const sprite=spriteFor(cat?.name);
 // eslint-disable-next-line @next/next/no-img-element -- small local portrait, sized by its card
 if(still&&sprite?.portrait)return <div className="cat-art illustrated-cat sprite-cat" aria-hidden="true"><img className="cat-portrait" src={sprite.portrait.src} width={sprite.portrait.width} height={sprite.portrait.height} alt=""/></div>;
 if(sprite&&cat?.name){
  const name=cat.name.toLowerCase();
  const {walk,react,alternates=[]}=sprite;
  // React hoists <style href> only when its child is a single string.
  const keyframes=[spriteKeyframes(name,sprite),...alternates.map((sheet,i)=>spriteKeyframes(`${name}-alt${i}`,sheet)),walk&&spriteKeyframes(`${name}-walk`,walk),react&&spriteKeyframes(`${name}-react`,react)].filter(Boolean).join('');
  const width=(sheet:SpriteSheet)=>`${sheet.width*(sheet.scale??1)/sprite.width*100}%`;
  const seconds=(sheet:SpriteSheet)=>(sheet.rest??0)+sheet.seconds;
  const idle=alternates.length?<SpriteRotation sheets={[{style:sheetStyle(sprite,name),seconds:seconds(sprite)},...alternates.map((sheet,i)=>({style:{...sheetStyle(sheet,`${name}-alt${i}`),width:width(sheet)},seconds:seconds(sheet)}))]}/>:<span className="cat-sprite idle" style={sheetStyle(sprite,name)}/>;
  // The walk sheet is drawn at the same pixel scale as the idle one, so the cat keeps its size when it starts walking.
  return <div className="cat-art illustrated-cat sprite-cat" aria-hidden="true"><style href={`cat-sprite-${name}`} precedence="default">{keyframes}</style>{idle}{walk&&<span className="cat-sprite walk" style={{...sheetStyle(walk,`${name}-walk`),width:width(walk)}}/>}{react&&<span className="cat-sprite react" style={{...sheetStyle(react,`${name}-react`),width:width(react)}}/>}</div>;
 }
 return <div className="cat-art illustrated-cat" aria-hidden="true"><CatFigure look={cat??DEFAULT_LOOK}/></div>;
}
