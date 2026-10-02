// Hand-drawn animated sheets that replace the generated SVG for specific cats.
// Built with scripts/build-cat-sprite.py: one row of equal cells sharing a ground line.
// `pingPong` plays forward then back, for sheets whose last frame does not lead into the first.
export type CatSprite={src:string;frames:number;width:number;height:number;seconds:number;pingPong?:boolean};
export const CAT_SPRITES:Record<string,CatSprite>={
 Milo:{src:'/art/cats/milo-peek.webp?v=2',frames:18,width:294,height:272,seconds:2.6},
};
export const spriteFor=(name?:string):CatSprite|undefined=>name?CAT_SPRITES[name]:undefined;
