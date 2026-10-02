// Hand-drawn animated sheets that replace the generated SVG for specific cats.
// Built with scripts/build-cat-sprite.py: one row of equal cells sharing a ground line.
// `pingPong` plays forward then back, for sheets whose last frame does not lead into the first.
// `rest` holds the first frame still for that many seconds before each play;
// with `restAtEnd` it holds the last frame instead (a story that ends asleep, for example).
// `walk` is an optional walk cycle: the cat then strolls between resting spots instead of staying put.
// `react` plays once when Laura taps the cat (for example, a hiss).
// `scale` is the size of the cat in that sheet relative to the main sheet (sheets drawn bigger use < 1).
// `alternates` are more idle sheets; the cat takes turns playing each one (main sheet first).
// `portrait` is a still photo for places that should not animate (cat cards, welcome window).
export type SpriteSheet={src:string;frames:number;width:number;height:number;seconds:number;rest?:number;restAtEnd?:boolean;pingPong?:boolean;scale?:number};
export type CatSprite=SpriteSheet&{alternates?:SpriteSheet[];walk?:SpriteSheet;react?:SpriteSheet;portrait?:{src:string;width:number;height:number}};
export const CAT_SPRITES:Record<string,CatSprite>={
 Milo:{src:'/art/cats/milo-peek.webp?v=2',frames:18,width:294,height:272,seconds:2.6,rest:4,
  // Takes turns with the box story (frames 4–24 of box_milo.png), which ends asleep in the box.
  alternates:[{src:'/art/cats/milo-box.webp',frames:21,width:316,height:255,seconds:3,rest:4,restAtEnd:true}],
  portrait:{src:'/art/cats/milo-portrait.webp',width:511,height:640}},
};
export const spriteFor=(name?:string):CatSprite|undefined=>name?CAT_SPRITES[name]:undefined;
// Keyframes for one sprite: the frames in order, with the rest held on the first (or last) frame.
export function spriteKeyframes(name:string,sprite:SpriteSheet){
 const share=Math.round((sprite.rest??0)/((sprite.rest??0)+sprite.seconds)*1000)/10;
 const steps=sprite.restAtEnd?`0%{background-position-x:0%}${100-share}%,100%{background-position-x:100%}`:`0%,${share}%{background-position-x:0%}100%{background-position-x:100%}`;
 return `@keyframes cat-sprite-${name.toLowerCase()}{${steps}}`;
}
