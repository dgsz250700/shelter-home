'use client';
import {useEffect,useState,type CSSProperties} from 'react';
// Plays a cat's sheets one after another: each runs once (rest included), then the next starts from its first frame.
// `skip` seconds of the very first turn are skipped (the opening rest), so the cat moves right away.
export function SpriteRotation({sheets,skip=0}:{sheets:{style:CSSProperties;seconds:number}[];skip?:number}) {
 const [turn,setTurn]=useState(0);
 const current=sheets[turn%sheets.length];
 useEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const timer=setTimeout(()=>setTurn(n=>n+1),(current.seconds-(turn===0?skip:0))*1000);
  return()=>clearTimeout(timer);
 },[turn,current.seconds,skip]);
 return <span key={turn} className="cat-sprite idle" style={{...current.style,animationDelay:turn===0&&skip?`-${skip}s`:'0s'}}/>;
}
