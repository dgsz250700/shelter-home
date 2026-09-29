import type {CSSProperties} from 'react';
// The original transparent artwork is articulated at its anatomical joints.
const rigs = [
 {head:'polygon(18% 0,80% 0,83% 43%,69% 54%,40% 57%,17% 43%)',body:'polygon(32% 48%,72% 46%,81% 89%,33% 93%)',tail:'polygon(0 53%,32% 50%,36% 91%,0 91%)',pawY:84,eyes:[[47,38,22],[62,27,18]],fur:'#e6b16b'},
 {head:'polygon(24% 27%,78% 28%,80% 65%,63% 77%,31% 70%,20% 52%)',body:'polygon(37% 24%,77% 23%,89% 85%,27% 91%,25% 67%)',tail:'polygon(45% 0,85% 0,79% 30%,46% 30%)',pawY:81,eyes:[[36,56,8],[50,64,18]],fur:'#c8ae87'},
 {head:'polygon(49% 23%,100% 22%,100% 84%,57% 84%,47% 61%)',body:'polygon(0 45%,58% 41%,74% 76%,69% 99%,0 99%)',tail:'polygon(0 58%,25% 56%,38% 99%,0 100%)',pawY:82,eyes:[[61,59,35],[69,68,20]],fur:'#cec6bd'},
 {head:'polygon(32% 0,94% 0,94% 36%,78% 44%,45% 41%,33% 28%)',body:'polygon(31% 34%,82% 34%,91% 87%,23% 91%)',tail:'polygon(0 0,31% 0,36% 90%,0 90%)',pawY:84,eyes:[[60,33,-18],[75,22,-10]],fur:'#928a80'},
 {head:'polygon(23% 0,85% 0,86% 35%,69% 47%,36% 44%,23% 30%)',body:'polygon(30% 37%,80% 37%,78% 90%,21% 92%)',tail:'polygon(75% 62%,100% 62%,100% 93%,72% 94%)',pawY:83,eyes:[[42,27,12],[60,32,12]],fur:'#b69a75'},
 {head:'polygon(2% 8%,56% 8%,57% 47%,40% 59%,8% 57%,0 33%)',body:'polygon(31% 41%,84% 33%,92% 85%,55% 99%,12% 86%)',tail:'polygon(81% 15%,100% 15%,100% 80%,80% 80%)',pawY:78,eyes:[[29,43,-18],[44,34,-18]],fur:'#efc38d'},
];
// variant is the catalog's art cell; body is only a fallback for callers without a catalog cat.
export function CatArt({variant:catalogVariant,body='#c79765',sleeping=false}:{variant?:number;body?:string;belly?:string;sleeping?:boolean}) {
 const variants:Record<string,number>={'#c79765':0,'#8d9298':3,'#ddd8cb':2,'#756c66':4,'#e7a65a':5};
 const variant=catalogVariant!==undefined&&rigs[catalogVariant]?catalogVariant:variants[body]??1;
 const rig=rigs[variant];
 const style={'--head-clip':rig.head,'--body-clip':rig.body,'--tail-clip':rig.tail,'--paw-y':`${rig.pawY}%`,'--fur':rig.fur,backgroundPosition:`${(variant%3)*50}% ${Math.floor(variant/3)*100}%`} as CSSProperties;
 return <div className={`cat-art illustrated-cat kitten-${variant} ${sleeping?'kitten-sleeping':''}`} aria-hidden="true" style={style}>
 <span className="kitten-tail"/><span className="kitten-body"/>
 <span className="kitten-paw kitten-paw-left"/><span className="kitten-paw kitten-paw-right"/>
 <span className="kitten-head">{rig.eyes.map(([x,y,angle],i)=><i className="kitten-eyelid" key={i} style={{left:`${x}%`,top:`${y}%`,rotate:`${angle}deg`}}/>)}</span>
 </div>;
}
