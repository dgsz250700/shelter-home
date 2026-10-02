// Hand-drawn animated sheets that replace the generated SVG for specific cats.
// Built with scripts/build-cat-sprite.py: one row of equal cells sharing a ground line.
export type CatSprite={src:string;frames:number;width:number;height:number;seconds:number};
export const CAT_SPRITES:Record<string,CatSprite>={
 Milo:{src:'/art/cats/milo-peek.webp',frames:8,width:386,height:378,seconds:2.4},
};
export const spriteFor=(name?:string):CatSprite|undefined=>name?CAT_SPRITES[name]:undefined;
