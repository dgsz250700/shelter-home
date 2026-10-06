"use client";
import { useEffect, useRef, useState } from "react";

// A small ideal-gas lab: particles in a box with a piston. One quantity stays fixed, one is moved
// with the slider, and the third follows PV = nRT. Nothing is saved: it is only for exploring.
const N_MOL = 0.1; // mol: 300 K in 2.5 L gives about 100 kPa (one atmosphere)
const R = 8.314; // J/(mol·K); J/L = kPa
const PARTICLES = 46;
const MAX_V = 5;

type Law = "boyle" | "charles" | "gay";
const LAWS: Record<Law, { title: string; fixed: string; rule: string; question: string; options: string[]; answer: number; why: string }> = {
  boyle: {
    title: "Ley de Boyle",
    fixed: "Temperatura fija: 300 K",
    rule: "Menos volumen → más presión (P × V se mantiene)",
    question: "Si reduces el volumen a la mitad, ¿qué pasa con la presión?",
    options: ["Se duplica", "Se reduce a la mitad", "No cambia"],
    answer: 0,
    why: "Las partículas tienen menos espacio y chocan contra las paredes el doble de seguido.",
  },
  charles: {
    title: "Ley de Charles",
    fixed: "Presión fija: 100 kPa",
    rule: "Más temperatura → más volumen (V ÷ T se mantiene)",
    question: "Si calientas el gas sin cambiar la presión, ¿qué hace el pistón?",
    options: ["Se mueve hacia afuera", "Se mueve hacia adentro", "Se queda quieto"],
    answer: 0,
    why: "Las partículas van más rápido y empujan el pistón hasta que la presión vuelve a ser la misma.",
  },
  gay: {
    title: "Ley de Gay-Lussac",
    fixed: "Volumen fijo: 2,5 L",
    rule: "Más temperatura → más presión (P ÷ T se mantiene)",
    question: "Si la temperatura pasa de 300 K a 600 K, ¿qué pasa con la presión?",
    options: ["Se duplica", "Aumenta un poco", "Baja"],
    answer: 0,
    why: "Al doble de temperatura en kelvin, las partículas chocan más fuerte y más seguido: el doble de presión.",
  },
};

function state(law: Law, value: number) {
  if (law === "boyle") return { T: 300, V: value, P: (N_MOL * R * 300) / value };
  if (law === "charles") return { T: value, V: (N_MOL * R * value) / 100, P: 100 };
  return { T: value, V: 2.5, P: (N_MOL * R * value) / 2.5 };
}
const RANGE: Record<Law, { min: number; max: number; step: number; start: number }> = {
  boyle: { min: 1, max: 4.5, step: 0.1, start: 2.5 },
  charles: { min: 150, max: 600, step: 10, start: 300 },
  gay: { min: 150, max: 600, step: 10, start: 300 },
};
const fmt = (n: number, d = 1) => n.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: d });
// Cold particles are blue, hot ones red.
const heat = (T: number) => `hsl(${Math.round(220 - ((Math.min(600, Math.max(150, T)) - 150) / 450) * 220)} 80% 52%)`;

export function ThermoSim() {
  const [law, setLaw] = useState<Law>("boyle");
  const [value, setValue] = useState(RANGE.boyle.start);
  const [picked, setPicked] = useState<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef(state("boyle", RANGE.boyle.start));
  const { T, V, P } = state(law, value);
  useEffect(() => {
    live.current = { T, V, P };
  }, [T, V, P]);

  function choose(next: Law) {
    setLaw(next);
    setValue(RANGE[next].start);
    setPicked(null);
  }

  // Particles bounce inside the box; the piston (right wall) follows the volume.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parts = Array.from({ length: PARTICLES }, () => ({ x: Math.random(), y: Math.random(), a: Math.random() * Math.PI * 2 }));
    let hits: { y: number; age: number }[] = [];
    let frame = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ratio = window.devicePixelRatio || 1;
      const w = el.clientWidth, h = el.clientHeight;
      if (el.width !== Math.round(w * ratio)) { el.width = Math.round(w * ratio); el.height = Math.round(h * ratio); }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { T: temp, V: vol } = live.current;
      const pad = 14, boxH = h - 2 * pad, boxW = ((w - 2 * pad - 26) * vol) / MAX_V;
      // Box, piston and handle.
      ctx.fillStyle = "rgba(35,127,121,0.06)";
      ctx.fillRect(pad, pad, boxW, boxH);
      ctx.strokeStyle = "#34364f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pad + boxW, pad); ctx.lineTo(pad, pad); ctx.lineTo(pad, pad + boxH); ctx.lineTo(pad + boxW, pad + boxH);
      ctx.stroke();
      ctx.fillStyle = "#8a8fa8";
      ctx.fillRect(pad + boxW, pad - 4, 10, boxH + 8);
      ctx.fillRect(pad + boxW + 10, pad + boxH / 2 - 4, w, 8);
      // Collisions with the piston glow for a moment: more glow, more pressure.
      hits = hits.filter((hit) => (hit.age += dt) < 0.35);
      for (const hit of hits) {
        ctx.fillStyle = `rgba(232,117,105,${0.8 * (1 - hit.age / 0.35)})`;
        ctx.beginPath();
        ctx.arc(pad + boxW - 1, pad + hit.y * boxH, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      const speed = (calm ? 0.25 : 0.55) * Math.sqrt(temp / 300);
      ctx.fillStyle = heat(temp);
      for (const p of parts) {
        p.x += ((Math.cos(p.a) * speed * dt) / boxW) * 160;
        p.y += ((Math.sin(p.a) * speed * dt) / boxH) * 160;
        if (p.x < 0) { p.x = -p.x; p.a = Math.PI - p.a; }
        if (p.x > 1) { p.x = Math.max(0, 2 - p.x); p.a = Math.PI - p.a; hits.push({ y: p.y, age: 0 }); }
        if (p.y < 0) { p.y = -p.y; p.a = -p.a; }
        if (p.y > 1) { p.y = 2 - p.y; p.a = -p.a; }
        ctx.beginPath();
        ctx.arc(pad + 5 + p.x * (boxW - 10), pad + 5 + p.y * (boxH - 10), 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  const range = RANGE[law];
  const info = LAWS[law];
  // Graph of the relation the law describes, with the current point.
  const graph = (() => {
    const xs = Array.from({ length: 40 }, (_, i) => range.min + ((range.max - range.min) * i) / 39);
    const ys = xs.map((x) => (law === "boyle" ? state(law, x).P : law === "charles" ? state(law, x).V : state(law, x).P));
    const yMax = law === "charles" ? MAX_V : Math.max(...ys) * 1.05;
    const px = (x: number) => 34 + ((x - range.min) / (range.max - range.min)) * 250;
    const py = (y: number) => 120 - (y / yMax) * 105;
    const current = law === "charles" ? V : P;
    return { path: xs.map((x, i) => `${i ? "L" : "M"}${px(x).toFixed(1)} ${py(ys[i]).toFixed(1)}`).join(" "), dot: [px(value), py(current)], yMax, xLabel: law === "boyle" ? "Volumen (L)" : "Temperatura (K)", yLabel: law === "charles" ? "Volumen (L)" : "Presión (kPa)" };
  })();

  return (
    <div className="thermo-sim">
      <div className="thermo-laws" role="tablist" aria-label="Ley de los gases">
        {(Object.keys(LAWS) as Law[]).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={law === key} onClick={() => choose(key)}>{LAWS[key].title}</button>
        ))}
      </div>
      <p className="thermo-fixed">{info.fixed} · <span>{info.rule}</span></p>
      <canvas ref={canvas} className="thermo-box" aria-label={`Gas con ${fmt(V)} litros a ${Math.round(T)} kelvin y ${fmt(P)} kilopascales`} role="img" />
      <div className="thermo-readings">
        <div><small>Temperatura</small><strong style={{ color: heat(T) }}>{Math.round(T)} K</strong><small>{Math.round(T - 273)} °C</small></div>
        <div><small>Volumen</small><strong>{fmt(V)} L</strong></div>
        <div><small>Presión</small><strong>{fmt(P)} kPa</strong><span className="thermo-meter"><span style={{ width: `${Math.min(100, (P / 260) * 100)}%` }} /></span></div>
      </div>
      <label className="thermo-slider">
        {law === "boyle" ? "Mueve el pistón (volumen)" : "Calienta o enfría el gas (temperatura)"}
        <input type="range" min={range.min} max={range.max} step={range.step} value={value} onChange={(e) => setValue(Number(e.target.value))} />
      </label>
      <svg className="thermo-graph" viewBox="0 0 300 145" role="img" aria-label={`Gráfica de ${graph.yLabel} contra ${graph.xLabel}`}>
        <line x1="34" y1="120" x2="290" y2="120" />
        <line x1="34" y1="10" x2="34" y2="120" />
        <path d={graph.path} />
        <circle cx={graph.dot[0]} cy={graph.dot[1]} r="6" />
        <text x="34" y="132" textAnchor="middle">{fmt(range.min, law === "boyle" ? 1 : 0)}</text>
        <text x="284" y="132" textAnchor="middle">{fmt(range.max, law === "boyle" ? 1 : 0)}</text>
        <text x="30" y="18" textAnchor="end">{fmt(graph.yMax, 0)}</text>
        <text x="30" y="122" textAnchor="end">0</text>
        <text x="162" y="140" textAnchor="middle">{graph.xLabel}</text>
        <text x="10" y="70" textAnchor="middle" transform="rotate(-90 10 70)">{graph.yLabel}</text>
      </svg>
      <div className="thermo-question">
        <strong>Predice: {info.question}</strong>
        <div>
          {info.options.map((option, i) => (
            <button key={option} type="button" aria-pressed={picked === i} className={picked === null ? "" : i === info.answer ? "is-right" : picked === i ? "is-wrong" : ""} onClick={() => setPicked(i)} disabled={picked !== null}>{option}</button>
          ))}
        </div>
        {picked !== null && <p>{picked === info.answer ? "¡Exacto! " : "Casi. "}{info.why} Compruébalo con el control de arriba.</p>}
      </div>
    </div>
  );
}
