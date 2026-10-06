// Hand-drawn animated sheets that replace the generated SVG for specific cats.
// Built with scripts/build-cat-sprite.py: one row of equal cells sharing a ground line.
// `pingPong` plays forward then back, for sheets whose last frame does not lead into the first.
// `rest` holds the first frame still for that many seconds before each play;
// with `restAtEnd` it holds the last frame instead (a story that ends asleep, for example).
// `walk` is an optional walk cycle: the cat then strolls between resting spots instead of staying put.
// `react` plays once when Laura taps the cat (for example, a hiss).
// `scale` is the size of the cat in that sheet relative to the main sheet (sheets drawn bigger use < 1).
// `alternates` are more idle sheets; the cat takes turns playing each one (main sheet first).
// `startNow` skips the rest the first time, so the cat moves as soon as the refuge opens.
// `portrait` is a still photo for places that should not animate (cat cards, welcome window).
export type SpriteSheet={src:string;frames:number;width:number;height:number;seconds:number;rest?:number;restAtEnd?:boolean;pingPong?:boolean;scale?:number};
export type CatSprite=SpriteSheet&{startNow?:boolean;alternates?:SpriteSheet[];walk?:SpriteSheet;react?:SpriteSheet;portrait?:{src:string;width:number;height:number}};
export const CAT_SPRITES:Record<string,CatSprite>={
 Milo:{src:'/art/cats/milo-peek.webp?v=2',frames:18,width:294,height:272,seconds:2.6,rest:4,startNow:true,
  // Takes turns with the box story (frames 4–24 of box_milo.png), which ends asleep in the box.
  alternates:[{src:'/art/cats/milo-box.webp',frames:21,width:316,height:255,seconds:3,rest:4,restAtEnd:true}],
  portrait:{src:'/art/cats/milo-portrait.webp',width:511,height:640}},
 // Energetic: takes turns jumping and chasing her tail, with short rests.
 Lilo:{src:'/art/cats/lilo-jump.webp',frames:24,width:302,height:249,seconds:2.7,rest:1.5,
  alternates:[{src:'/art/cats/lilo-tail.webp',frames:24,width:310,height:245,seconds:3,rest:1.5}],
  portrait:{src:'/art/cats/lilo-portrait.webp',width:200,height:245}},
 // Elegant: grooms, then looks around like royalty; now and then walks to another spot.
 Venus:{src:'/art/cats/venus-groom.webp',frames:24,width:230,height:263,seconds:3.4,rest:3,
  alternates:[{src:'/art/cats/venus-royal.webp',frames:28,width:176,height:246,seconds:4,rest:2}],
  walk:{src:'/art/cats/venus-walk.webp',frames:24,width:242,height:212,seconds:2.6},
  portrait:{src:'/art/cats/venus-portrait.webp',width:416,height:640}},
 // Grumpy: sits sulking, strolls now and then, and hisses when tapped.
 Miel:{src:'/art/cats/miel-idle.webp',frames:24,width:208,height:228,seconds:3,rest:3,
  walk:{src:'/art/cats/miel-walk.webp',frames:24,width:262,height:217,seconds:2.4},
  react:{src:'/art/cats/miel-hiss.webp',frames:8,width:336,height:328,seconds:1.8,scale:.735},
  portrait:{src:'/art/cats/miel-portrait.webp',width:640,height:640}},
};
export const spriteFor=(name?:string):CatSprite|undefined=>name?CAT_SPRITES[name]:undefined;
// Keyframes for one sprite: the frames in order, with the rest held on the first (or last) frame.
export function spriteKeyframes(name:string,sprite:SpriteSheet){
 const share=Math.round((sprite.rest??0)/((sprite.rest??0)+sprite.seconds)*1000)/10;
 const steps=sprite.restAtEnd?`0%{background-position-x:0%}${100-share}%,100%{background-position-x:100%}`:`0%,${share}%{background-position-x:0%}100%{background-position-x:100%}`;
 return `@keyframes cat-sprite-${name.toLowerCase()}{${steps}}`;
}
