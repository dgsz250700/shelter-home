"use client";
import {RefugeProp} from "./refuge-prop";
import {useCatLife} from "./use-cat-life";
import {rewardCopy, type CareReward} from "@/lib/engine/challenge";
import {careEnergy} from "@/lib/engine/care";
import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import type { ShelterCat } from "@/lib/data/shelter";
import type { ShelterState } from "@/lib/engine/types";
import { CatArt } from "./cat-art";
import { Icon } from "@/components/game/icons";

export function Shelter({
  cats,
  state,
  compact = false,
  feedingUnlocked = false,
  today,
  lastCare,
  celebration=null,
  paused=false,
}: {
  cats: ShelterCat[];
  state?: ShelterState;
  compact?: boolean;
  feedingUnlocked?: boolean;
  today?:string;
  lastCare?:string|null;
  celebration?:{reward:CareReward;id:string;catId?:string;catName?:string}|null;
  paused?:boolean;
}) {
  const [selected, setSelected] = useState<ShelterCat | null>(null);
  const [interaction,setInteraction]=useState<{object:string;id:string}|null>(null);
  const activate=(object:string)=>({role:'button' as const,tabIndex:0,onClick:()=>setInteraction({object,id:crypto.randomUUID()}),onKeyDown:(event:KeyboardEvent<HTMLDivElement>)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setInteraction({object,id:crypto.randomUUID()});}}});
  const life=useCatLife(cats,(state?.beds??0)>0,selected?.id,paused,celebration,interaction);
  const energy=feedingUnlocked?100:careEnergy(state?.last_care_date??lastCare,today??new Date().toISOString().slice(0,10));
  return (
    <div ref={life}
      className={`room-world rescue-world painted-world ${compact ? "room-compact" : ""} ${feedingUnlocked ? "daily-cared" : "daily-waiting"} ${energy<85 ? "needs-care" : ""}`}
    >
      <Image className="room-illustration" src="/art/refuge-courtyard.webp" alt="Refugio de animales: patio soleado, enfermería, casitas de adopción y comedor" fill sizes="(max-width: 760px) 100vw, 95vw" priority />
      {!compact && <div className="refuge-greeting"><h1>Hola, Laura</h1><p>{feedingUnlocked ? "Un ratito más, un paso más." : "Lo que hoy practicas, mañana será más fácil."}</p></div>}
      <div className="world-atmosphere" aria-hidden="true"><span/><span/><span/></div>
      <div className="shelter-objects" aria-label="Objetos de los gatos">
       <div {...activate("ball")} data-object="ball" className={`cat-ball ${celebration?.reward==='toy'||celebration?.reward==='yarn'?'gift-arrival':''}`}><RefugeProp kind="ball" label="Pelota de tela para los gatos"/></div>
       <div {...activate("scratcher")} data-object="scratcher" className="courtyard-scratcher"><RefugeProp kind="scratcher" label="Rascador del patio"/></div>
       <div {...activate("basket")} data-object="basket" className="courtyard-basket"><RefugeProp kind="basket" label="Cesta de mantas del refugio"/></div>
       {(state?.beds??0)>0 && <div {...activate("bed")} data-object="bed" className={`cat-bed ${celebration?.reward==='bed'?'gift-arrival':''}`}><RefugeProp kind="bed" label="Camita ganada"/></div>}
       {(state?.boxes??0)>0 && <div {...activate("box")} data-object="box" className={`cat-box ${celebration?.reward==='box'?'gift-arrival':''}`}><RefugeProp kind="box" label="Caja de Milo"/></div>}
       {(state?.food??0)>0 && <div {...activate("food")} data-object="food" className={`cat-bowl ${celebration?.reward==='food'?'gift-arrival':''}`}><RefugeProp kind="food" label="Comida ganada"/></div>}
       {(state?.treats??0)>0 && <div {...activate("treat")} data-object="treat" className={`cat-treat ${celebration?.reward==='treat'?'gift-arrival':''}`} aria-label="Churu ganado"/>}
       {(state?.yarn??0)>0&&<div {...activate("yarn")} data-object="yarn" className={`cat-yarn ${celebration?.reward==='yarn'?'gift-arrival':''}`}><RefugeProp kind="ball" label="Ovillo ganado"/></div>}
       {(state?.toys??0)>0&&<div {...activate("toy")} data-object="toy" className={`cat-toy ${celebration?.reward==='toy'?'gift-arrival':''}`}><RefugeProp kind="scratcher" label="Juguete rascador ganado"/></div>}
       {(state?.vet_visits??0)>0&&<div {...activate("vet")} data-object="vet" className={`cat-vet ${celebration?.reward==='vet'?'gift-arrival':''}`} aria-label="Visita veterinaria ganada"><Icon name="heart" size={22}/><span>Cuidado veterinario</span></div>}
      </div>
      <div className="room-cats">
        {cats.map((cat, index) => (
          <button
            key={cat.id} data-cat-id={cat.id} data-pose="idle"
            className={`room-cat cat-${index % 7} personality-${cat.personality.normalize("NFD").replace(/[\u0300-\u036f]/g,"")} ${selected?.id === cat.id ? "patted" : ""}`}
            data-track={`cat_${cat.id}`} aria-label={`Conocer a ${cat.name}`}
            onClick={() => {
              setSelected(cat);
            }}
          >
            <div className="cat-facing"><CatArt cat={cat}/></div>
            <i className="cat-reaction" aria-hidden="true"><Icon name="heart" size={20}/></i>
            <span>
              {cat.name}

            </span>
          </button>
        ))}
      </div>
      {celebration && <div key={celebration.id} className="reward-note" role="status"><Icon name="paw"/><span>{celebration.catName&&<b>{celebration.catName}: </b>}{rewardCopy[celebration.reward].delivered}</span></div>}
      {selected && (
        <div
          className="cat-story"
          role="dialog"
          aria-label={`Historia de ${selected.name}`}
        >
          <button
            className="icon-button"
            aria-label="Cerrar historia"
            onClick={() => setSelected(null)}
          >
            <Icon name="close" />
          </button>
          <div className="story-portrait"><CatArt cat={selected}/></div>
          <strong>{selected.name} te saluda</strong>
          <span>{selected.personality}</span>
          <p>{selected.story}</p><p className="cat-wellbeing">{feedingUnlocked ? "El cuidado del refugio ya está listo por hoy." : "Espera tus cuidados de hoy. Logra el reto para ayudarle."}</p>{energy<100&&<small>Energía: {energy}/100. El reto logrado la recupera.</small>}
        </div>
      )}
    </div>
  );
}
