"use client";
import { useEffect, useRef, useState } from "react";

// Fluids in motion: Torricelli (a tank that empties through a hole) and continuity + Bernoulli (a pipe that narrows).
const G = 9.8;
const RHO = 1000; // water, kg/m³
const fmt = (n: number, d = 1) => n.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: d });

type Question = { text: string; options: string[]; answer: number; why: string };
function Predict({ q }: { q: Question }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="thermo-question">
      <strong>Predice: {q.text}</strong>
      <div>
        {q.options.map((option, i) => (
          <button key={option} type="button" aria-pressed={picked === i} className={picked === null ? "" : i === q.answer ? "is-right" : picked === i ? "is-wrong" : ""} onClick={() => setPicked(i)} disabled={picked !== null}>{option}</button>
        ))}
      </div>
      {picked !== null && <p>{picked === q.answer ? "¡Exacto! " : "Casi. "}{q.why}</p>}
    </div>
  );
}

// Torricelli: water leaves the hole as fast as if it had fallen from the surface, v = √(2gh).
function TorricelliSim() {
  const [h, setH] = useState(1); // water above the hole, m
  const [y0, setY0] = useState(0.8); // hole above the ground, m
  const [d, setD] = useState(2); // hole diameter, cm
  const v = Math.sqrt(2 * G * h);
  const t = Math.sqrt((2 * y0) / G);
  const range = v * t;
  const flow = Math.PI * (d / 200) ** 2 * v * 1000; // L/s
  const S = 50; // px per metre
  const ground = 192, wall = 92;
  const holeY = ground - y0 * S, levelY = holeY - h * S;
  const jet = Array.from({ length: 24 }, (_, i) => {
    const time = (t * i) / 23;
    return `${i ? "L" : "M"}${(wall + v * time * S).toFixed(1)} ${(holeY + 0.5 * G * time * time * S).toFixed(1)}`;
  }).join(" ");
  const landing = wall + range * S;
  return (
    <>
      <p className="thermo-fixed">v = √(2·g·h) · <span>el agua sale tan rápido como si cayera desde la superficie</span></p>
      <svg className="archimedes-scene" viewBox="0 0 320 215" role="img" aria-label={`El agua sale a ${fmt(v)} metros por segundo y cae a ${fmt(range, 2)} metros del tanque`}>
        <line x1="0" x2="320" y1={ground} y2={ground} stroke="#34364f" strokeWidth="2" />
        <rect x="22" y={levelY} width={wall - 22} height={ground - levelY} fill="#8fd0ef" className="fluid-water" />
        <path d={`M22 12 V${ground} H${wall} V12`} fill="none" stroke="#34364f" strokeWidth="3" />
        <line x1={wall + 6} x2={wall + 6} y1={levelY} y2={holeY} stroke="#237f79" strokeWidth="1.5" strokeDasharray="3 3" />
        <text x={wall + 10} y={(levelY + holeY) / 2 + 4} className="archimedes-tag" fill="#237f79">h = {fmt(h)} m</text>
        <path d={jet} fill="none" stroke="#4aa3d6" strokeWidth={1.5 + d * 0.9} strokeLinecap="round" className="fluid-jet" />
        <circle cx={wall} cy={holeY} r="3" fill="#34364f" />
        <ellipse cx={landing} cy={ground - 2} rx={6 + d * 2} ry="3" fill="#8fd0ef" />
        <line x1={wall} x2={landing} y1={ground + 6} y2={ground + 6} stroke="#d1453b" strokeWidth="1.5" />
        <text x={(wall + landing) / 2} y={ground + 19} textAnchor="middle" className="archimedes-tag" fill="#d1453b">alcance {fmt(range, 2)} m</text>
      </svg>
      <div className="thermo-readings">
        <div><small>Velocidad de salida</small><strong>{fmt(v, 2)} m/s</strong></div>
        <div><small>Tiempo de caída</small><strong>{fmt(t, 2)} s</strong></div>
        <div><small>Caudal</small><strong>{fmt(flow, 2)} L/s</strong><small>agujero de {d} cm</small></div>
      </div>
      <label className="thermo-slider">Altura del agua sobre el agujero: {fmt(h)} m
        <input type="range" min={0.2} max={2} step={0.1} value={h} onChange={(e) => setH(Number(e.target.value))} />
      </label>
      <label className="thermo-slider">Altura del agujero sobre el piso: {fmt(y0)} m
        <input type="range" min={0.2} max={1.5} step={0.1} value={y0} onChange={(e) => setY0(Number(e.target.value))} />
      </label>
      <label className="thermo-slider">Diámetro del agujero: {d} cm
        <input type="range" min={1} max={4} step={0.5} value={d} onChange={(e) => setD(Number(e.target.value))} />
      </label>
      <Predict q={{ text: "Si el agua sobre el agujero pasa de 0,5 m a 2 m (el cuádruple), la velocidad de salida…", options: ["Se duplica", "Se cuadruplica", "No cambia"], answer: 0, why: "La velocidad depende de la raíz de la altura: √4 = 2. Compruébalo: 0,5 m da 3,13 m/s y 2 m da 6,26 m/s." }} />
    </>
  );
}

// Continuity (A₁v₁ = A₂v₂) and Bernoulli: where the pipe narrows the water speeds up and its pressure drops.
function BernoulliSim() {
  const [v1, setV1] = useState(1); // m/s in the wide part
  const [d2, setD2] = useState(2.5); // cm, narrow part
  const D1 = 4; // cm, wide part
  const P1 = 20000; // Pa above the atmosphere, wide part
  const v2 = v1 * (D1 / d2) ** 2;
  const drop = 0.5 * RHO * (v2 * v2 - v1 * v1);
  const P2 = P1 - drop;
  const flow = Math.PI * (D1 / 200) ** 2 * v1 * 1000; // L/s
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ v1, v2, d2 });
  useEffect(() => {
    live.current = { v1, v2, d2 };
  }, [v1, v2, d2]);

  // Water particles: same flow everywhere, so they crowd and speed up in the narrow part.
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parts = Array.from({ length: 70 }, () => ({ x: Math.random(), lane: Math.random() * 2 - 1 }));
    let frame = 0, last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ratio = window.devicePixelRatio || 1;
      const w = el.clientWidth, h = el.clientHeight;
      if (el.width !== Math.round(w * ratio)) { el.width = Math.round(w * ratio); el.height = Math.round(h * ratio); }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { v1: speed1, v2: speed2, d2: narrow } = live.current;
      const mid = h * 0.68, wide = h * 0.24, thin = (wide * narrow) / D1;
      // Half-height of the pipe along x: wide, narrowing, narrow, widening, wide.
      const half = (x: number) => {
        const f = x / w;
        const k = f < 0.3 ? 0 : f < 0.4 ? (f - 0.3) / 0.1 : f < 0.6 ? 1 : f < 0.7 ? 1 - (f - 0.6) / 0.1 : 0;
        return wide + (thin - wide) * (k * k * (3 - 2 * k));
      };
      ctx.fillStyle = "#cfeaf7";
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) ctx.lineTo(x, mid - half(x));
      for (let x = w; x >= 0; x -= 4) ctx.lineTo(x, mid + half(x));
      ctx.fill();
      ctx.strokeStyle = "#34364f";
      ctx.lineWidth = 3;
      for (const sign of [-1, 1]) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) ctx.lineTo(x, mid + sign * half(x));
        ctx.stroke();
      }
      // Pressure columns: the water climbs higher where the pressure is higher.
      const columnScale = (h * 0.42) / P1;
      for (const [cx, pressure] of [[w * 0.15, P1], [w * 0.5, P1 - 0.5 * RHO * (speed2 * speed2 - speed1 * speed1)]] as const) {
        const top = mid - half(cx);
        const level = top - Math.max(0, pressure) * columnScale;
        ctx.fillStyle = "#8fd0ef";
        ctx.fillRect(cx - 5, level, 10, top - level);
        ctx.strokeStyle = "#34364f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 6, top); ctx.lineTo(cx - 6, 8); ctx.moveTo(cx + 6, top); ctx.lineTo(cx + 6, 8);
        ctx.stroke();
      }
      ctx.fillStyle = "#237f79";
      for (const p of parts) {
        const x = p.x * w;
        const local = (speed1 * wide * wide) / (half(x) * half(x)); // same flow: v ∝ 1/A
        p.x += (local * dt * (calm ? 0.04 : 0.09));
        if (p.x > 1) { p.x -= 1; p.lane = Math.random() * 2 - 1; }
        ctx.beginPath();
        ctx.arc(p.x * w, mid + p.lane * (half(p.x * w) - 4), 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <p className="thermo-fixed">A₁·v₁ = A₂·v₂ y Bernoulli · <span>donde el tubo se angosta, el agua va más rápido y su presión baja</span></p>
      <canvas ref={canvas} className="thermo-box fluid-pipe" role="img" aria-label={`El agua pasa de ${fmt(v1)} a ${fmt(v2)} metros por segundo y la presión baja de ${fmt(P1 / 1000)} a ${fmt(P2 / 1000)} kilopascales`} />
      <div className="thermo-readings">
        <div><small>Parte ancha (4 cm)</small><strong>{fmt(v1, 2)} m/s</strong><small>presión {fmt(P1 / 1000)} kPa</small></div>
        <div><small>Parte angosta ({fmt(d2)} cm)</small><strong>{fmt(v2, 2)} m/s</strong><small>presión {fmt(P2 / 1000)} kPa</small></div>
        <div><small>Caudal (igual en todo el tubo)</small><strong>{fmt(flow, 2)} L/s</strong></div>
      </div>
      <label className="thermo-slider">Velocidad en la parte ancha: {fmt(v1)} m/s
        <input type="range" min={0.5} max={1.5} step={0.1} value={v1} onChange={(e) => setV1(Number(e.target.value))} />
      </label>
      <label className="thermo-slider">Diámetro de la parte angosta: {fmt(d2)} cm
        <input type="range" min={2} max={4} step={0.25} value={d2} onChange={(e) => setD2(Number(e.target.value))} />
      </label>
      <Predict q={{ text: "Cuando el tubo se angosta, ¿qué pasa con la presión del agua ahí?", options: ["Baja", "Sube", "No cambia"], answer: 0, why: "El agua acelera para que pase el mismo caudal, y esa energía de movimiento sale de la presión (Bernoulli). Mira el tubito de la mitad: el agua sube menos." }} />
    </>
  );
}

export function FluidsSim() {
  const [law, setLaw] = useState<"torricelli" | "bernoulli">("torricelli");
  return (
    <div className="thermo-sim">
      <div className="thermo-laws" role="tablist" aria-label="Ley de fluidos">
        <button type="button" role="tab" aria-selected={law === "torricelli"} onClick={() => setLaw("torricelli")}>Torricelli</button>
        <button type="button" role="tab" aria-selected={law === "bernoulli"} onClick={() => setLaw("bernoulli")}>Continuidad y Bernoulli</button>
      </div>
      {law === "torricelli" ? <TorricelliSim /> : <BernoulliSim />}
    </div>
  );
}
