// Hand-drawn animated sheets that replace the generated SVG for specific cats.
// Built with scripts/build-cat-sprite.py: one row of equal cells sharing a ground line.
// `pingPong` plays forward then back, for sheets whose last frame does not lead into the first.
// `rest` holds the first frame still for that many seconds before each play.
// `portrait` is a still photo for places that should not animate (cat cards, welcome window).
export type CatSprite={src:string;frames:number;width:number;height:number;seconds:number;rest?:number;pingPong?:boolean;portrait?:{src:string;width:number;height:number}};
export const CAT_SPRITES:Record<string,CatSprite>={
 Milo:{src:'/art/cats/milo-peek.webp?v=2',frames:18,width:294,height:272,seconds:2.6,rest:4,portrait:{src:'/art/cats/milo-portrait.webp',width:511,height:640}},
};
export const spriteFor=(name?:string):CatSprite|undefined=>name?CAT_SPRITES[name]:undefined;
// Keyframes for one sprite: still on the first frame during the rest, then the frames in order.
export function spriteKeyframes(name:string,sprite:CatSprite){
 const still=Math.round((sprite.rest??0)/((sprite.rest??0)+sprite.seconds)*1000)/10;
 return `@keyframes cat-sprite-${name.toLowerCase()}{0%,${still}%{background-position-x:0%}100%{background-position-x:100%}}`;
}
