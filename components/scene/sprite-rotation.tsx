'use client';
import {useEffect,useState,type CSSProperties} from 'react';
// Plays a cat's sheets one after another: each runs once (rest included), then the next starts from its first frame.
export function SpriteRotation({sheets}:{sheets:{style:CSSProperties;seconds:number}[]}) {
 const [turn,setTurn]=useState(0);
 const current=sheets[turn%sheets.length];
 useEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const timer=setTimeout(()=>setTurn(n=>n+1),current.seconds*1000);
  return()=>clearTimeout(timer);
 },[turn,current.seconds]);
 return <span key={turn} className="cat-sprite idle" style={{...current.style,animationDelay:'0s'}}/>;
}
