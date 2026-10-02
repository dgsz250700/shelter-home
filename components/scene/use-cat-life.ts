'use client';
import {useEffect,useRef} from 'react';
import type {ShelterCat} from '@/lib/data/shelter';
import type {CareReward} from '@/lib/engine/challenge';
import {chooseActivity,places,type CatMotion,type Point} from './cat-behavior';
import {canStand,clearSegment,footprintAt,routeTo,type Obstacle,type Footprint} from './cat-navigation';
import {spriteFor} from '@/lib/engine/cat-sprites';
type Resident=CatMotion&{route:Point[];object?:string;blocked:number};
export function useCatLife(cats:ShelterCat[],hasBed:boolean,selected:string|undefined,paused:boolean,celebration:{reward:CareReward;id:string;catId?:string}|null,interaction:{object:string;id:string}|null=null) {
 const room=useRef<HTMLDivElement>(null);
 const state=useRef({selected,paused,celebration,hasBed,interaction});
 useEffect(()=>{state.current={selected,paused,celebration,hasBed,interaction};},[selected,paused,celebration,hasBed,interaction]);
 useEffect(()=>{
  const root=room.current;if(!root)return;
  const nodes=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-cat-id]'));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let width=1,height=1,visible=true,frame=0,last=0,lastGift='',lastInteraction='',lastSelected:string|undefined;
  let furniture:Obstacle[]=[],sizes:Footprint[]=[],objects=new Map<string,Point>();
  const motion:Resident[]=[];
  // Sprite cats play their loop in one spot instead of walking around.
  const stays=cats.map(cat=>Boolean(spriteFor(cat.name)));
  function measure(){
   if(!root||!root.clientWidth||!root.clientHeight)return;
   width=root.clientWidth;height=root.clientHeight;const bounds=root.getBoundingClientRect();
   sizes=nodes.map(node=>({width:node.offsetWidth*.78/width,height:node.offsetHeight*.82/height,bottom:22/height}));
   furniture=[];objects=new Map();
   root.querySelectorAll<HTMLElement>('[data-object]').forEach(node=>{
    const rect=node.getBoundingClientRect(),w=rect.width*.68/width,h=rect.height*.55/height;
    const x=(rect.left+rect.width/2-bounds.left)/width,y=(rect.top+rect.height*.75-bounds.top)/height;
    furniture.push({x:x-w/2,y:y-h,width:w,height:h});objects.set(node.dataset.object!,{x,y});
   });
   // Repack after responsive resizing, with real sprite footprints and furniture bounds.
   motion.length=0;
   cats.forEach((_,i)=>{
    const occupied=[...furniture,...motion.map((m,j)=>footprintAt(m.position,sizes[j]))];
    const positions:Point[]=[];for(let y=.94;y>=.55;y-=.035)for(let x=.12;x<=.9;x+=.035)positions.push({x,y});
    const preferred={x:.35+(i%3)*.21,y:.72+Math.floor(i/3)*.16};
    positions.sort((a,b)=>Math.hypot(a.x-preferred.x,a.y-preferred.y)-Math.hypot(b.x-preferred.x,b.y-preferred.y));
    const position=positions.find(p=>canStand(p,sizes[i],occupied))??preferred;
    motion.push({position,target:position,pose:'idle',arrival:'idle',remaining:1+i*.7,direction:1,route:[],blocked:0});
   });
  }
  function obstacles(i:number,reserve=false){return [...furniture,...motion.flatMap((m,j)=>j===i?[]:[footprintAt(m.position,sizes[j]),...(reserve&&m.route.length?[footprintAt(m.target,sizes[j])]:[])])];}
  function send(i:number,target:Point,arrival:CatMotion['arrival'],duration:number,object?:string){
   const m=motion[i];if(stays[i])return;if(object&&motion.some((other,j)=>j!==i&&other.object===object)){m.remaining=2;return;}
   const route=routeTo(m.position,target,sizes[i],obstacles(i,true));
   if(!route.length){m.remaining=2;return;}
   const destination=route.at(-1)!;
   // An inaccessible object must not trigger eating or playing from across the room.
   if(object&&Math.hypot(destination.x-target.x,destination.y-target.y)>.23){m.remaining=2;return;}
   m.route=route;m.target=destination;m.arrival=arrival;m.pose='walk';m.remaining=duration;m.object=object;m.blocked=0;
  }
  measure();
  const size=new ResizeObserver(measure);size.observe(root);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;});observer.observe(root);
  const mutation=new MutationObserver(measure);mutation.observe(root.querySelector('.shelter-objects')!,{childList:true});
  function tick(now:number){
   const delta=last?Math.min((now-last)/1000,.05):0;last=now;
   const active=visible&&!document.hidden&&!state.current.paused;
   root!.dataset.motion=active&&!reduced.matches?'on':'off';
   if(active){
    if(state.current.celebration&&lastGift!==state.current.celebration.id&&motion[0]){
     lastGift=state.current.celebration.id;const reward=state.current.celebration.reward;
     const index=Math.max(0,cats.findIndex(c=>c.id===state.current.celebration?.catId));
     const target=objects.get(reward)??places.food;
     send(index,target,reward==='bed'?'sleep':['box','toy','yarn'].includes(reward)?'play':reward==='vet'?'happy':'eat',12,reward);
    }
    if(state.current.interaction&&state.current.interaction.id!==lastInteraction){
     lastInteraction=state.current.interaction.id;
     const key=state.current.interaction.object,target=objects.get(key);
     const walkers=target?motion.map((cat,i)=>({i,distance:Math.hypot(cat.position.x-target.x,cat.position.y-target.y)})).filter(({i})=>!stays[i]):[];
     if(target&&walkers.length){const nearest=walkers.sort((a,b)=>a.distance-b.distance)[0];send(nearest.i,target,['bed','basket'].includes(key)?'sleep':['food','treat'].includes(key)?'eat':key==='vet'?'happy':'play',8,key);}
    }
    if(state.current.selected!==lastSelected){lastSelected=state.current.selected;const i=cats.findIndex(c=>c.id===lastSelected);if(i>=0){motion[i].pose='happy';motion[i].route=[];motion[i].object=undefined;motion[i].remaining=4;}}
    motion.forEach((m,i)=>{
     const node=nodes[i];if(!node)return;
     if(!reduced.matches){
      if(m.pose==='walk'&&m.route.length){
       const next=m.route[0],dx=(next.x-m.position.x)*width,dy=(next.y-m.position.y)*height,distance=Math.hypot(dx,dy),step=delta*(cats[i].personality==='juguetón'?48:32);
       const factor=Math.min(1,step/Math.max(.001,distance));const candidate={x:m.position.x+dx/width*factor,y:m.position.y+dy/height*factor};
       if(clearSegment(m.position,candidate,sizes[i],obstacles(i))){
        m.position=candidate;m.blocked=0;if(Math.abs(dx)>1)m.direction=dx>0?1:-1;
        if(distance<=step){m.route.shift();if(!m.route.length){m.pose=m.arrival;const object=m.object?objects.get(m.object):undefined;if(object)m.direction=object.x>m.position.x?1:-1;}}
       }else{m.blocked+=delta;if(m.blocked>1){m.route=[];m.pose='idle';m.remaining=.5+Math.random();m.object=undefined;m.blocked=0;}}
      }else if(state.current.selected!==cats[i].id&&!stays[i]){
       m.remaining-=delta;if(m.remaining<=0){
        m.object=undefined;
        const careObjects=['food','box','toy','yarn'].filter(key=>objects.has(key)&&!motion.some(other=>other.object===key));
        if(careObjects.length&&Math.random()<.2){const key=careObjects[Math.floor(Math.random()*careObjects.length)];send(i,objects.get(key)!,key==='food'?'eat':'play',6,key);return;}
        const action=chooseActivity(cats[i].personality,m.position,motion.filter((_,j)=>j!==i).map(p=>p.position),state.current.hasBed,Math.random);
        const object=action.target===places.ball?'ball':action.target===places.bed?'bed':undefined;
        if(action.pose==='walk')send(i,object?objects.get(object)??action.target:action.target,action.arrival,action.remaining,object);
        else Object.assign(m,action);
       }
      }
     }
     node.style.transform=`translate3d(${width*m.position.x-node.offsetWidth/2}px,${height*m.position.y-node.offsetHeight}px,0)`;
     node.style.zIndex=String(Math.round(m.position.y*100));node.dataset.pose=m.pose;node.style.setProperty('--facing',String(m.direction));
    });
    root!.dataset.ball=motion.some(m=>m.pose==='play'&&['ball','yarn'].includes(m.object??''))?'playing':'still';
   }
   frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);size.disconnect();observer.disconnect();mutation.disconnect();};
 },[cats]);
 return room;
}
