import {CatFigure} from './cat-figure';
import {DEFAULT_LOOK,type CatLook} from '@/lib/engine/cat-look';
// A catalog cat, or the refuge's default cat where no specific cat applies.
export function CatArt({cat}:{cat?:CatLook}) {
 return <div className="cat-art illustrated-cat" aria-hidden="true"><CatFigure look={cat??DEFAULT_LOOK}/></div>;
}
