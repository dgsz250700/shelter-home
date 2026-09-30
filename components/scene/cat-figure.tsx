import {useId,type ReactNode} from 'react';
import {moodFor,type CatExpression,type CatLook,type CatPose,type Mood} from '@/lib/engine/cat-look';

type Ell={cx:number;cy:number;rx:number;ry:number;rot?:number};
type Limb=[number,number,number,number];
type Shape={view:'front'|'side';torso:Ell;haunches?:Ell[];belly?:Ell;paws?:Ell[];legs?:Limb[];tail:string;tailFront?:boolean;head:{x:number;y:number;tilt:number}};
// Drawn in a 200×200 box, ground at y≈190, side views face right.
const SHAPES:Record<CatPose|'walk',Shape>={
 sitSide:{view:'front',torso:{cx:100,cy:152,rx:33,ry:36},haunches:[{cx:73,cy:176,rx:17,ry:14},{cx:127,cy:176,rx:17,ry:14}],belly:{cx:100,cy:160,rx:19,ry:25},paws:[{cx:89,cy:186,rx:9,ry:7},{cx:111,cy:186,rx:9,ry:7}],tail:'M126 186 C150 191 168 187 177 172',head:{x:104,y:101,tilt:5}},
 sitWrap:{view:'front',torso:{cx:100,cy:152,rx:33,ry:36},haunches:[{cx:73,cy:176,rx:17,ry:14},{cx:127,cy:176,rx:17,ry:14}],belly:{cx:100,cy:160,rx:19,ry:25},paws:[{cx:89,cy:186,rx:9,ry:7},{cx:111,cy:186,rx:9,ry:7}],tail:'M126 184 C152 196 80 201 68 188',tailFront:true,head:{x:100,y:100,tilt:-4}},
 sitTilt:{view:'front',torso:{cx:100,cy:152,rx:33,ry:36},haunches:[{cx:73,cy:176,rx:17,ry:14},{cx:127,cy:176,rx:17,ry:14}],belly:{cx:100,cy:160,rx:19,ry:25},paws:[{cx:89,cy:186,rx:9,ry:7},{cx:111,cy:186,rx:9,ry:7}],tail:'M126 182 C162 180 164 142 152 128 C146 120 154 110 163 116',head:{x:97,y:99,tilt:-17}},
 sitTall:{view:'front',torso:{cx:100,cy:147,rx:28,ry:42},haunches:[{cx:77,cy:178,rx:15,ry:12},{cx:123,cy:178,rx:15,ry:12}],belly:{cx:100,cy:155,rx:16,ry:29},paws:[{cx:91,cy:187,rx:8,ry:6},{cx:109,cy:187,rx:8,ry:6}],tail:'M122 187 C150 190 152 168 141 160',head:{x:100,y:84,tilt:0}},
 crouch:{view:'front',torso:{cx:100,cy:170,rx:42,ry:22},haunches:[{cx:67,cy:180,rx:16,ry:11},{cx:133,cy:180,rx:16,ry:11}],paws:[{cx:87,cy:189,rx:9,ry:6},{cx:113,cy:189,rx:9,ry:6}],tail:'M136 182 C158 186 150 190 120 189',tailFront:true,head:{x:100,y:139,tilt:0}},
 pounce:{view:'side',torso:{cx:96,cy:154,rx:44,ry:21,rot:13},haunches:[{cx:60,cy:140,rx:19,ry:19}],legs:[[56,152,50,188],[68,154,70,188],[118,166,134,190],[130,164,150,190]],belly:{cx:100,cy:164,rx:26,ry:8,rot:13},tail:'M52 128 C30 102 54 76 40 54',head:{x:148,y:140,tilt:10}},
 curl:{view:'side',torso:{cx:96,cy:170,rx:54,ry:25},haunches:[{cx:62,cy:168,rx:24,ry:22}],paws:[{cx:150,cy:189,rx:10,ry:6},{cx:130,cy:191,rx:10,ry:6}],tail:'M48 176 C42 200 120 203 140 191',tailFront:true,head:{x:141,y:161,tilt:14}},
 bellyUp:{view:'side',torso:{cx:92,cy:170,rx:46,ry:23},belly:{cx:92,cy:160,rx:31,ry:12},legs:[[66,158,56,122],[84,152,85,116],[104,152,114,119],[120,158,136,128]],tail:'M48 178 C20 178 22 146 36 136',head:{x:148,y:165,tilt:-26}},
 walk:{view:'side',torso:{cx:94,cy:148,rx:46,ry:23},legs:[[64,158,60,188],[80,162,82,188],[112,162,116,188],[126,158,132,188]],belly:{cx:96,cy:160,rx:30,ry:9},tail:'M50 140 C26 128 32 96 46 86',head:{x:143,y:114,tilt:0}},
};
const SIZE={small:.76,medium:.88,large:1};
const BUILD={slim:.84,normal:1,chubby:1.24};
const TAIL={thin:5,normal:9,fluffy:15};
const EARS={small:.72,normal:1,large:1.32};
const EAR_TILT={back:24,normal:6,forward:-10};

function shade(hex:string,amount:number){
 const n=parseInt(hex.replace('#','').padEnd(6,'0').slice(0,6),16);
 const f=(v:number)=>Math.round(amount<0?v*(1+amount):v+(255-v)*amount).toString(16).padStart(2,'0');
 return `#${f(n>>16&255)}${f(n>>8&255)}${f(n&255)}`;
}
const E=({e,...rest}:{e:Ell}&React.SVGProps<SVGEllipseElement>)=><ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} transform={e.rot?`rotate(${e.rot} ${e.cx} ${e.cy})`:undefined} {...rest}/>;

function Eyes({x,y,expression,r}:{x:number;y:number;expression:CatExpression;r:number}){
 const ink='#2d2420',g=r*.42,dy=y-r*.04;
 const pair=(draw:(cx:number,side:number)=>ReactNode)=><>{draw(x-g,-1)}{draw(x+g,1)}</>;
 const round=(size:number,look=[0,0])=>pair(cx=><g key={cx}><ellipse cx={cx} cy={dy} rx={size} ry={size*1.1} fill={ink}/><circle cx={cx+look[0]-size*.3} cy={dy+look[1]-size*.4} r={size*.36} fill="#fff"/></g>);
 switch(expression){
  case 'grumpy':return <>{pair((cx,side)=><g key={cx}><path d={`M${cx-6} ${dy-1} L${cx+6} ${dy-1} Q${cx+6} ${dy+6} ${cx} ${dy+6} Q${cx-6} ${dy+6} ${cx-6} ${dy-1}Z`} fill="#fff8e6" stroke={ink} strokeWidth="1.4"/><circle cx={cx+2.6} cy={dy+2.4} r="2.6" fill={ink}/><path d={`M${cx-side*6} ${dy-3.5} L${cx+side*7} ${dy-9}`} stroke={ink} strokeWidth="2.4" strokeLinecap="round"/></g>)}</>;
  case 'sleepy':return pair(cx=><path key={cx} d={`M${cx-5.5} ${dy} Q${cx} ${dy+4.5} ${cx+5.5} ${dy}`} stroke={ink} strokeWidth="2.2" fill="none" strokeLinecap="round"/>);
  case 'happy':return pair(cx=><path key={cx} d={`M${cx-5.5} ${dy+2} Q${cx} ${dy-5} ${cx+5.5} ${dy+2}`} stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round"/>);
  case 'alert':return round(5.4,[1.5,0]);
  case 'scared':return <>{round(7.6,[0,0])}{pair((cx,side)=><path key={`b${cx}`} d={`M${cx-side*5} ${dy-15} L${cx+side*6} ${dy-10.5}`} stroke={ink} strokeWidth="2" strokeLinecap="round"/>)}</>;
  case 'curious':return <>{round(5.6,[-1,-1.5])}<path d={`M${x+g-5} ${dy-11} Q${x+g} ${dy-15} ${x+g+5} ${dy-11}`} stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round"/></>;
  case 'calm':return pair((cx,side)=><g key={cx}><path d={`M${cx-5.5} ${dy+1} Q${cx} ${dy+4} ${cx+5.5} ${dy+1}`} stroke={ink} strokeWidth="2.2" fill="none" strokeLinecap="round"/><path d={`M${cx+side*5.5} ${dy+1} l${side*2.5} -2.5`} stroke={ink} strokeWidth="1.6" strokeLinecap="round"/></g>);
  case 'crazy':return <><ellipse cx={x-g} cy={dy} rx="7.8" ry="8.6" fill="#fff8e6" stroke={ink} strokeWidth="1.6"/><circle cx={x-g+2} cy={dy+1} r="3.4" fill={ink}/><ellipse cx={x+g} cy={dy} rx="4" ry="4.4" fill="#fff8e6" stroke={ink} strokeWidth="1.6"/><circle cx={x+g-1} cy={dy-1} r="1.8" fill={ink}/></>;
 }
}
function Mouth({x,y,expression,r}:{x:number;y:number;expression:CatExpression;r:number}){
 const ink='#4a3530',my=y+r*.36;
 const w=<path d={`M${x-6} ${my} Q${x-3} ${my+4} ${x} ${my} Q${x+3} ${my+4} ${x+6} ${my}`} stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round"/>;
 switch(expression){
  case 'grumpy':return <path d={`M${x-6} ${my+3} Q${x} ${my-2} ${x+6} ${my+3}`} stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round"/>;
  case 'scared':return <ellipse cx={x} cy={my+2} rx="2.6" ry="3.2" fill={ink}/>;
  case 'alert':return <path d={`M${x-5} ${my+1} Q${x} ${my+4} ${x+6} ${my-2}`} stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round"/>;
  case 'happy':return <><path d={`M${x-7} ${my} Q${x-3.5} ${my+6} ${x} ${my} Q${x+3.5} ${my+6} ${x+7} ${my}`} stroke={ink} strokeWidth="1.8" fill="#e8807c" strokeLinecap="round"/></>;
  case 'crazy':return <><path d={`M${x-8} ${my-1} Q${x} ${my+10} ${x+8} ${my-1}Z`} fill={ink}/><path d={`M${x-1} ${my+3} q4 0 4 7 q-3 3 -6 0z`} fill="#ef8b86"/></>;
  default:return w;
 }
}
function Head({x,y,tilt,r,look,mood,body,line,stripe,fluffy,filter,children}:{children?:ReactNode;x:number;y:number;tilt:number;r:number;look:CatLook;mood:Mood;body:string;line:string;stripe:string;fluffy:boolean;filter?:string}){
 const e=EARS[look.ears as keyof typeof EARS]??1,tiltEar=EAR_TILT[mood.ears],cheek=look.build==='chubby'?1.14:look.build==='slim'?1.02:1.08;
 const ear=(side:number)=><g key={side} transform={`translate(${side*r*.5} ${-r*.6}) rotate(${side*tiltEar}) scale(${side*e} ${e})`}>
  <path d="M-12 5 L6 -27 L15 6 Z" fill={body} stroke={line} strokeWidth="2.2" strokeLinejoin="round"/><path d="M-5 3 L6 -17 L10 3 Z" fill="#f3aaa2"/></g>;
 const bicolor=look.pattern==='bicolor';
 return <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
  <g filter={filter}>{ear(-1)}{ear(1)}
   <ellipse cx="0" cy="0" rx={r*cheek} ry={r*.9} fill={body} stroke={line} strokeWidth="2.2"/>
   {fluffy&&<path d={`M${-r*cheek+2} ${r*.1} l-7 4 l6 3 l-5 5 l8 0 M${r*cheek-2} ${r*.1} l7 4 l-6 3 l5 5 l-8 0`} fill={body} stroke={line} strokeWidth="1.8" strokeLinejoin="round"/>}
  </g>
  {bicolor&&<><path d={`M-4 ${-r*.88} Q0 ${-r*.4} ${-r*.18} ${r*.05} L${r*.18} ${r*.05} Q0 ${-r*.4} 4 ${-r*.88}Z`} fill={look.palette.belly}/><ellipse cx="0" cy={r*.4} rx={r*.58} ry={r*.4} fill={look.palette.belly}/></>}
  {look.pattern==='atigrado'&&<path d={`M${-r*.28} ${-r*.82} L${-r*.2} ${-r*.52} M0 ${-r*.9} L0 ${-r*.56} M${r*.28} ${-r*.82} L${r*.2} ${-r*.52} M${-r*cheek+1} ${-r*.05} l${r*.24} ${r*.06} M${r*cheek-1} ${-r*.05} l${-r*.24} ${r*.06}`} stroke={stripe} strokeWidth="3" strokeLinecap="round"/>}
  {(mood.expression==='happy'||mood.expression==='scared')&&<><ellipse cx={-r*.62} cy={r*.26} rx="5" ry="3" fill="#f28f8f" opacity=".45"/><ellipse cx={r*.62} cy={r*.26} rx="5" ry="3" fill="#f28f8f" opacity=".45"/></>}
  <Eyes x={0} y={0} r={r} expression={mood.expression}/>
  <path d={`M-3 ${r*.17} L3 ${r*.17} L0 ${r*.26}Z`} fill="#e07e7b" stroke="#c96a67" strokeWidth="1" strokeLinejoin="round"/>
  <Mouth x={0} y={0} r={r} expression={mood.expression}/>
  {children}
  <path d={`M${-r*.5} ${r*.24} l${-r*.5} ${-r*.08} M${-r*.5} ${r*.33} l${-r*.5} ${r*.06} M${r*.5} ${r*.24} l${r*.5} ${-r*.08} M${r*.5} ${r*.33} l${r*.5} ${r*.06}`} stroke={line} strokeWidth="1.1" strokeLinecap="round" opacity=".7"/>
 </g>;
}
function Accessory({kind,x,y,r}:{kind:string;x:number;y:number;r:number}){
 const ny=y+r*.84;
 if(kind==='moño')return <g transform={`translate(${x+r*.62} ${y-r*.66})`}><path d="M0 0 L-9 -6 L-9 6Z M0 0 L9 -6 L9 6Z" fill="#e8577a" stroke="#b83d5c" strokeWidth="1.2" strokeLinejoin="round"/><circle r="2.6" fill="#b83d5c"/></g>;
 if(kind==='cascabel')return <g><path d={`M${x-r*.62} ${ny-2} Q${x} ${ny+5} ${x+r*.62} ${ny-2}`} stroke="#2f7fb8" strokeWidth="4" fill="none" strokeLinecap="round"/><circle cx={x} cy={ny+6} r="4.4" fill="#f2c230" stroke="#b58a12" strokeWidth="1.2"/></g>;
 if(kind==='pañuelo')return <path d={`M${x-r*.66} ${ny-3} Q${x} ${ny+3} ${x+r*.66} ${ny-3} L${x} ${ny+15}Z`} fill="#3f8f6b" stroke="#2c6a4f" strokeWidth="1.2" strokeLinejoin="round"/>;
 return null;
}
function Extra({kind,x,y}:{kind:Mood['extra'];x:number;y:number}){
 if(kind==='zzz')return <g className="cat-zzz" fill="#6f86a8" fontWeight="800" fontFamily="inherit"><text x={x+16} y={y-24} fontSize="15">z</text><text x={x+28} y={y-38} fontSize="11">z</text></g>;
 if(kind==='sweat')return <path d={`M${x+34} ${y-22} q4 7 0 10 q-4 -3 0 -10z`} fill="#8cc8ec" stroke="#5a9fcb" strokeWidth="1"/>;
 if(kind==='butterfly')return <g transform="translate(166 48)"><g className="cat-butterfly"><path d="M0 0 C-10 -12 -16 2 -2 3 C-14 6 -8 16 0 4 C8 16 14 6 2 3 C16 2 10 -12 0 0Z" fill="#f2b33d" stroke="#c1841c" strokeWidth="1"/></g></g>;
 if(kind==='spin')return <g stroke="#e0694f" strokeWidth="2" fill="none" strokeLinecap="round"><path d={`M${x-12} ${y-40} q6 -8 12 0`}/><path d={`M${x+10} ${y-44} q6 -8 12 0`}/></g>;
 return null;
}
function Figure({pose,look,mood,uid}:{pose:CatPose|'walk';look:CatLook;mood:Mood;uid:string}){
 const s=SHAPES[pose],b=BUILD[look.build as keyof typeof BUILD]??1,fluffy=look.coat==='fluffy',tailW=TAIL[look.tail as keyof typeof TAIL]??9;
 const body=look.palette.body,belly=look.palette.belly,line=shade(body,-.42),stripe=shade(body,-.28);
 const fat=(e:Ell):Ell=>s.view==='front'?{...e,rx:e.rx*b,cx:100+(e.cx-100)*b}:{...e,ry:e.ry*b,rx:e.rx*(1+(b-1)*.35)};
 const filter=fluffy?`url(#${uid}-fluff)`:undefined,fill=look.pattern==='ahumado'?`url(#${uid}-smoke)`:body;
 const r=look.build==='chubby'?30:28,paw=look.pattern==='bicolor'?belly:body;
 const tail=<g filter={look.tail==='fluffy'||fluffy?filter:undefined}><path d={s.tail} stroke={line} strokeWidth={tailW+4} fill="none" strokeLinecap="round"/><path d={s.tail} stroke={fill} strokeWidth={tailW} fill="none" strokeLinecap="round"/>
  {look.pattern==='atigrado'&&<path d={s.tail} stroke={stripe} strokeWidth={tailW} strokeDasharray="3 8" fill="none"/>}</g>;
 return <>
  {!s.tailFront&&<g className="cat-tail">{tail}</g>}
  {s.legs&&<g className="cat-legs">{s.legs.map(([x1,y1,x2,y2],i)=><g key={i} className={i%2?'cat-leg-b':'cat-leg-a'}><path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={line} strokeWidth={12*b} strokeLinecap="round"/><path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={i%3===0?fill:paw} strokeWidth={12*b-4} strokeLinecap="round"/></g>)}</g>}
  <g className="cat-body"><g filter={filter}>{s.haunches?.map((h,i)=><E key={i} e={fat(h)} fill={fill} stroke={line} strokeWidth="2.2"/>)}<E e={fat(s.torso)} fill={fill} stroke={line} strokeWidth="2.2"/></g>
   {s.belly&&<E e={fat(s.belly)} fill={belly}/>}
   {fluffy&&s.view==='front'&&<ellipse cx="100" cy={s.head.y+27} rx={15*b} ry="10" fill={belly} filter={filter}/>}
   {look.pattern==='atigrado'&&<path d={s.view==='front'?`M${100-30*b} ${s.torso.cy-6} q8 4 10 12 M${100+30*b} ${s.torso.cy-6} q-8 4 -10 12 M${100-32*b} ${s.torso.cy+10} q8 3 9 10 M${100+32*b} ${s.torso.cy+10} q-8 3 -9 10`:`M${s.torso.cx-20} ${s.torso.cy-s.torso.ry*b+3} q4 10 0 16 M${s.torso.cx} ${s.torso.cy-s.torso.ry*b+1} q4 10 0 16 M${s.torso.cx+20} ${s.torso.cy-s.torso.ry*b+3} q4 10 0 16`} stroke={stripe} strokeWidth="3.2" fill="none" strokeLinecap="round"/>}
   {s.paws?.map((p,i)=><E key={i} e={fat(p)} fill={paw} stroke={line} strokeWidth="2"/>)}
  </g>
  {s.tailFront&&<g className="cat-tail">{tail}</g>}
  <g className="cat-head"><Head x={s.head.x} y={s.head.y} tilt={s.head.tilt} r={r} look={look} mood={mood} body={fill} line={line} stripe={stripe} fluffy={fluffy} filter={filter}>
   {look.accessories?.map(a=><Accessory key={a} kind={a} x={0} y={0} r={r}/>)}</Head></g>
  <Extra kind={mood.extra} x={s.head.x} y={s.head.y}/>
 </>;
}
// A catalog cat: size, build, coat, tail and ears vary the drawing; personality picks pose and expression.
export function CatFigure({look}:{look:CatLook}){
 const uid=useId().replace(/:/g,''),mood=moodFor(look.personality),scale=SIZE[look.size as keyof typeof SIZE]??.88;
 const body=look.palette.body;
 const walkMood:Mood={...mood,pose:'sitSide',expression:mood.expression==='sleepy'?'calm':mood.expression,extra:undefined};
 const sleepMood:Mood={pose:'curl',expression:'sleepy',ears:'normal',extra:'zzz'};
 return <svg className="cat-figure" viewBox="0 0 200 200" aria-hidden="true" data-personality={look.personality}>
  <defs>
   <filter id={`${uid}-fluff`} filterUnits="userSpaceOnUse" x="-240" y="-240" width="480" height="480"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="1" seed="4"/><feDisplacementMap in="SourceGraphic" scale="5.5" xChannelSelector="R" yChannelSelector="G"/></filter>
   <linearGradient id={`${uid}-smoke`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={shade(body,-.3)}/><stop offset=".7" stopColor={body}/></linearGradient>
  </defs>
  <ellipse cx="100" cy="193" rx={52*scale} ry="5" fill="#3d2a1a" opacity=".13"/>
  <g transform={`translate(${100*(1-scale)} ${196*(1-scale)}) scale(${scale})`}>
   <g className="pose-base"><Figure pose={mood.pose} look={look} mood={mood} uid={uid}/></g>
   <g className="pose-walk"><Figure pose="walk" look={look} mood={walkMood} uid={uid}/></g>
   <g className="pose-sleep"><Figure pose="curl" look={look} mood={sleepMood} uid={uid}/></g>
  </g>
 </svg>;
}
