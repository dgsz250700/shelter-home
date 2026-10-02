import type {CSSProperties} from 'react';
import {CatFigure} from './cat-figure';
import {DEFAULT_LOOK,type CatLook} from '@/lib/engine/cat-look';
import {spriteFor} from '@/lib/engine/cat-sprites';
// A catalog cat, or the refuge's default cat where no specific cat applies.
export function CatArt({cat}:{cat?:CatLook&{name?:string}}) {
 const sprite=spriteFor(cat?.name);
 if(sprite)return <div className="cat-art illustrated-cat sprite-cat" aria-hidden="true"><span className="cat-sprite" style={{backgroundImage:`url(${sprite.src})`,aspectRatio:`${sprite.width}/${sprite.height}`,'--frames':sprite.frames,'--loop':`${sprite.seconds}s`} as CSSProperties}/></div>;
 return <div className="cat-art illustrated-cat" aria-hidden="true"><CatFigure look={cat??DEFAULT_LOOK}/></div>;
}
