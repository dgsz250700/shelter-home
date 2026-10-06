"use client";
import { useState } from "react";

// Archimedes' principle: a block in a liquid feels an upward push equal to the weight of the liquid it moves aside.
// It floats when it is less dense than the liquid (and sinks just enough to move its own weight of liquid).
const G = 9.8;
const MATERIALS = [
  { id: "corcho", label: "Corcho", density: 240, color: "#c99a62" },
  { id: "madera", label: "Madera", density: 600, color: "#a8713f" },
  { id: "hielo", label: "Hielo", density: 917, color: "#d8f0fb" },
  { id: "aluminio", label: "Aluminio", density: 2700, color: "#b9c0c8" },
  { id: "hierro", label: "Hierro", density: 7870, color: "#5d6470" },
] as const;
const LIQUIDS = [
  { id: "aceite", label: "Aceite", density: 920, color: "#f0cf6a" },
  { id: "agua", label: "Agua", density: 1000, color: "#8fd0ef" },
  { id: "mar", label: "Agua de mar", density: 1030, color: "#5fb0d4" },
  { id: "mercurio", label: "Mercurio", density: 13600, color: "#bcc3cb" },
] as const;
const QUESTION = {
  text: "Un cubo de hielo flota en agua. ¿Qué parte de él queda bajo el agua?",
  options: ["Casi todo (un 92 %)", "La mitad", "Muy poco (un 10 %)"],
  answer: 0,
  why: "El hielo tiene 917 kg/m³ y el agua 1000 kg/m³: se hunde hasta mover su propio peso de agua, el 92 % de su volumen. ¡Por eso los icebergs esconden casi todo bajo el mar!",
};
const fmt = (n: number, d = 1) => n.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: d });

export function ArchimedesSim() {
  const [material, setMaterial] = useState<(typeof MATERIALS)[number]["id"]>("madera");
  const [liquid, setLiquid] = useState<(typeof LIQUIDS)[number]["id"]>("agua");
  const [volume, setVolume] = useState(500); // cm³
  const [picked, setPicked] = useState<number | null>(null);
  const m = MATERIALS.find((x) => x.id === material)!;
  const l = LIQUIDS.find((x) => x.id === liquid)!;

  const floats = m.density < l.density;
  const share = floats ? m.density / l.density : 1; // part of the block under the surface
  const mass = (m.density * volume) / 1e6; // kg
  const weight = mass * G; // N
  const push = (l.density * volume * share * G) / 1e6; // N: weight of the liquid moved aside
  const apparent = Math.max(0, weight - push);

  // Drawing: a beaker; the liquid rises with the volume moved aside.
  const side = 30 + ((Math.cbrt(volume) - Math.cbrt(100)) / (Math.cbrt(1000) - Math.cbrt(100))) * 42;
  const level = 200 - 95 - ((volume * share) / 1000) * 34;
  const top = floats ? level - side * (1 - share) : 200 - side;
  const center = top + side / 2;
  const longest = Math.max(weight, push);
  const arrow = (force: number) => (force / longest) * 62;

  return (
    <div className="thermo-sim archimedes-sim">
      <p className="thermo-fixed">Empuje = peso del líquido desalojado · <span>flota si es menos denso que el líquido</span></p>
      <svg className="archimedes-scene" viewBox="0 0 300 215" role="img" aria-label={`${m.label} de ${volume} centímetros cúbicos en ${l.label}: ${floats ? "flota" : "se hunde"}`}>
        <defs>
          <marker id="arch-arrow-down" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#d1453b" /></marker>
          <marker id="arch-arrow-up" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#237f79" /></marker>
        </defs>
        <rect className="archimedes-liquid" x="62" y={level} width="176" height={200 - level} fill={l.color} />
        <line x1="62" x2="238" y1={level} y2={level} stroke="rgba(0,0,0,.25)" strokeDasharray="4 3" />
        <path d="M60 20 V202 H240 V20" fill="none" stroke="#34364f" strokeWidth="3" />
        <g className="archimedes-block" style={{ transform: `translateY(${top}px)` }}>
          <rect x={150 - side / 2} y={0} width={side} height={side} rx="3" fill={m.color} stroke="rgba(0,0,0,.35)" strokeWidth="1.5" />
        </g>
        <line x1="150" x2="150" y1={center} y2={center + arrow(weight)} stroke="#d1453b" strokeWidth="4" markerEnd="url(#arch-arrow-down)" />
        {push > 0 && <line x1="162" x2="162" y1={center} y2={center - arrow(push)} stroke="#237f79" strokeWidth="4" markerEnd="url(#arch-arrow-up)" />}
        <text x="250" y="40" className="archimedes-tag" fill="#d1453b">Peso</text>
        <text x="250" y="56" className="archimedes-tag" fill="#237f79">Empuje</text>
        <text x="150" y="14" textAnchor="middle" className="archimedes-result">{floats ? `¡Flota! (${Math.round(share * 100)} % sumergido)` : "Se hunde"}</text>
      </svg>
      <div className="thermo-readings">
        <div><small>Peso</small><strong style={{ color: "#d1453b" }}>{fmt(weight, 2)} N</strong><small>masa {fmt(mass * 1000, 0)} g</small></div>
        <div><small>Empuje</small><strong style={{ color: "#237f79" }}>{fmt(push, 2)} N</strong><small>desaloja {fmt(volume * share, 0)} cm³</small></div>
        <div><small>{floats ? "Equilibrio" : "Peso aparente"}</small><strong>{floats ? "Peso = empuje" : `${fmt(apparent, 2)} N`}</strong><small>{floats ? "flota quieto" : "lo que marcaría un dinamómetro"}</small></div>
      </div>
      <div className="archimedes-controls">
        <label>Objeto<select value={material} onChange={(e) => setMaterial(e.target.value as typeof material)}>{MATERIALS.map((x) => <option key={x.id} value={x.id}>{x.label} · {x.density} kg/m³</option>)}</select></label>
        <label>Líquido<select value={liquid} onChange={(e) => setLiquid(e.target.value as typeof liquid)}>{LIQUIDS.map((x) => <option key={x.id} value={x.id}>{x.label} · {x.density} kg/m³</option>)}</select></label>
      </div>
      <label className="thermo-slider">Tamaño del objeto: {volume} cm³
        <input type="range" min={100} max={1000} step={50} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
      </label>
      <div className="thermo-question">
        <strong>Predice: {QUESTION.text}</strong>
        <div>
          {QUESTION.options.map((option, i) => (
            <button key={option} type="button" aria-pressed={picked === i} className={picked === null ? "" : i === QUESTION.answer ? "is-right" : picked === i ? "is-wrong" : ""} onClick={() => setPicked(i)} disabled={picked !== null}>{option}</button>
          ))}
        </div>
        {picked !== null && <p>{picked === QUESTION.answer ? "¡Exacto! " : "Casi. "}{QUESTION.why} Pruébalo: elige Hielo y Agua. Y una sorpresa: ¿qué pasa con el hierro en mercurio?</p>}
      </div>
    </div>
  );
}
