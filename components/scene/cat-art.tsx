import type {CSSProperties} from 'react';
import {CatFigure} from './cat-figure';
import {DEFAULT_LOOK,type CatLook} from '@/lib/engine/cat-look';
import {spriteFor} from '@/lib/engine/cat-sprites';
// A catalog cat, or the refuge's default cat where no specific cat applies.
// `still` prefers the cat's portrait photo over its animation.
export function CatArt({cat,still=false}:{cat?:CatLook&{name?:string};still?:boolean}) {
 const sprite=spriteFor(cat?.name);
 // eslint-disable-next-line @next/next/no-img-element -- small local portrait, sized by its card
 if(still&&sprite?.portrait)return <div className="cat-art illustrated-cat sprite-cat" aria-hidden="true"><img className="cat-portrait" src={sprite.portrait.src} width={sprite.portrait.width} height={sprite.portrait.height} alt=""/></div>;
 if(sprite)return <div className="cat-art illustrated-cat sprite-cat" aria-hidden="true"><span className="cat-sprite" style={{backgroundImage:`url(${sprite.src})`,aspectRatio:`${sprite.width}/${sprite.height}`,'--frames':sprite.frames,'--loop':`${sprite.seconds}s`,'--direction':sprite.pingPong?'alternate':'normal'} as CSSProperties}/></div>;
 return <div className="cat-art illustrated-cat" aria-hidden="true"><CatFigure look={cat??DEFAULT_LOOK}/></div>;
}
