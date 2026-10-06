"use client";
import { useEffect, useRef, useState } from "react";
import { Predict, type Question } from "./predict";

// First law of thermodynamics, ΔU = Q − W (W is the work the gas does: positive when it expands).
// 0,5 mol of an ideal monatomic gas, starting at 300 K in 10 L.
const N = 0.5, R = 8.314, T0 = 300, V0 = 10;
const CV = 1.5 * R, CP = 2.5 * R;
const P0 = (N * R * T0) / V0; // kPa (J/L)
const MAX_V = 16;

type Process = "isocorico" | "isobarico" | "isotermico" | "adiabatico";
type State = { Q: number; W: number; dU: number; T: number; V: number; P: number };

const PROCESSES: Record<Process, { title: string; rule: string; slider: string; min: number; max: number; step: number; start: number; unit: string; question: Question }> = {
  isocorico: {
    title: "Volumen fijo", rule: "El pistón está trabado: W = 0, todo el calor cambia la energía interna", slider: "Calor que le das (o le quitas) al gas", min: -400, max: 400, step: 20, start: 200, unit: "J",
    question: { text: "Calientas el gas con el pistón trabado. ¿Cuánto trabajo hace el gas?", options: ["Ninguno", "El mismo que el calor", "La mitad del calor"], answer: 0, why: "Sin moverse el pistón no hay trabajo (W = 0): todo el calor se queda como energía interna y la temperatura sube." },
  },
  isobarico: {
    title: "Presión fija", rule: "El pistón se mueve libre: parte del calor calienta el gas y parte empuja el pistón", slider: "Calor que le das (o le quitas) al gas", min: -400, max: 400, step: 20, start: 300, unit: "J",
    question: { text: "Le das calor al gas a presión constante. ¿Todo ese calor lo calienta?", options: ["No, una parte empuja el pistón", "Sí, todo lo calienta", "Lo calienta aún más de lo que le diste"], answer: 0, why: "Parte del calor se gasta en empujar el pistón (trabajo) y solo el resto sube la energía interna. Mira las barras: la de ΔU es más corta que la de Q." },
  },
  isotermico: {
    title: "Temperatura fija", rule: "La temperatura no cambia: ΔU = 0, así que el calor que entra sale como trabajo (Q = W)", slider: "Trabajo que hace el gas (expandirse +, comprimirlo −)", min: -400, max: 400, step: 20, start: 200, unit: "J",
    question: { text: "El gas se expande sin cambiar su temperatura. ¿De dónde sale la energía para empujar el pistón?", options: ["Del calor que recibe", "De su energía interna", "De ninguna parte"], answer: 0, why: "Si T no cambia, la energía interna tampoco (ΔU = 0). Entonces Q = W: todo el calor que entra se convierte en trabajo." },
  },
  adiabatico: {
    title: "Sin calor", rule: "Paredes aisladas: Q = 0, el trabajo sale (o entra) de la energía interna", slider: "Comprime o expande el gas", min: 7, max: 14, step: 0.5, start: 8, unit: "L",
    question: { text: "Comprimes el gas muy rápido, sin que entre ni salga calor. ¿Qué le pasa a su temperatura?", options: ["Sube", "Baja", "No cambia"], answer: 0, why: "Al comprimirlo haces trabajo sobre el gas (W negativo) y esa energía se queda adentro: ΔU = −W > 0. Por eso se calienta un inflador de bicicleta." },
  },
};

function compute(process: Process, x: number): State {
  if (process === "isocorico") { const T = T0 + x / (N * CV); return { Q: x, W: 0, dU: x, T, V: V0, P: (N * R * T) / V0 }; }
  if (process === "isobarico") { const dT = x / (N * CP); const T = T0 + dT; const W = N * R * dT; return { Q: x, W, dU: x - W, T, V: (N * R * T) / P0, P: P0 }; }
  if (process === "isotermico") { const V = V0 * Math.exp(x / (N * R * T0)); return { Q: x, W: x, dU: 0, T: T0, V, P: (N * R * T0) / V }; }
  const T = T0 * (V0 / x) ** (2 / 3);
  const dU = N * CV * (T - T0);
  return { Q: 0, W: -dU, dU, T, V: x, P: (N * R * T) / x };
}

// What is happening, in words: no numbers, only the direction of each energy.
function story({ Q, W, dU }: State) {
  const heat = Math.round(Q) > 0 ? "Entra calor" : Math.round(Q) < 0 ? "Sale calor" : "No entra ni sale calor";
  const work = Math.round(W) > 0 ? "el gas empuja el pistón" : Math.round(W) < 0 ? "el pistón comprime el gas" : "el pistón no se mueve";
  const inside = Math.round(dU) > 0 ? "el gas se calienta" : Math.round(dU) < 0 ? "el gas se enfría" : "la temperatura no cambia";
  return `${heat}, ${work} y ${inside}.`;
}
const heat = (T: number) => `hsl(${Math.round(220 - ((Math.min(450, Math.max(200, T)) - 200) / 250) * 220)} 80% 52%)`;

export function FirstLawSim() {
  const [process, setProcess] = useState<Process>("isocorico");
  const [x, setX] = useState(PROCESSES.isocorico.start);
  const info = PROCESSES[process];
  const s = compute(process, x);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ s, process });
  useEffect(() => {
    live.current = { s, process };
  });

  function choose(next: Process) {
    setProcess(next);
    setX(PROCESSES[next].start);
  }

  // Gas particles in a cylinder: faster and redder when hotter; the piston follows the volume.
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parts = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), a: Math.random() * Math.PI * 2 }));
    let frame = 0, last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ratio = window.devicePixelRatio || 1;
      const w = el.clientWidth, h = el.clientHeight;
      if (el.width !== Math.round(w * ratio)) { el.width = Math.round(w * ratio); el.height = Math.round(h * ratio); }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { s: st, process: pr } = live.current;
      const pad = 16, boxH = h - 2 * pad - 26, boxW = ((w - 2 * pad - 30) * st.V) / MAX_V;
      ctx.fillStyle = "rgba(35,127,121,0.06)";
      ctx.fillRect(pad, pad, boxW, boxH);
      // Insulated walls are thick and striped; the others are a plain line.
      ctx.strokeStyle = pr === "adiabatico" ? "#c98a12" : "#34364f";
      ctx.lineWidth = pr === "adiabatico" ? 7 : 3;
      ctx.beginPath();
      ctx.moveTo(pad + boxW, pad); ctx.lineTo(pad, pad); ctx.lineTo(pad, pad + boxH); ctx.lineTo(pad + boxW, pad + boxH);
      ctx.stroke();
      ctx.fillStyle = "#8a8fa8";
      ctx.fillRect(pad + boxW, pad - 4, 10, boxH + 8);
      ctx.fillRect(pad + boxW + 10, pad + boxH / 2 - 4, w, 8);
      ctx.font = "20px system-ui";
      ctx.textAlign = "center";
      if (pr === "isocorico") ctx.fillText("🔒", pad + boxW + 22, pad + boxH / 2 - 10);
      // Heat source under the cylinder: flame when heat goes in, ice when it goes out.
      if (pr !== "adiabatico" && Math.round(st.Q) !== 0) {
        const icon = st.Q > 0 ? "🔥" : "❄️";
        const count = Math.min(5, 1 + Math.floor(Math.abs(st.Q) / 100));
        for (let i = 0; i < count; i++) ctx.fillText(icon, pad + (boxW * (i + 0.5)) / count, pad + boxH + 24);
      }
      const speed = (calm ? 0.25 : 0.55) * Math.sqrt(st.T / 300);
      ctx.fillStyle = heat(st.T);
      for (const p of parts) {
        p.x += ((Math.cos(p.a) * speed * dt) / boxW) * 160;
        p.y += ((Math.sin(p.a) * speed * dt) / boxH) * 160;
        if (p.x < 0) { p.x = -p.x; p.a = Math.PI - p.a; }
        if (p.x > 1) { p.x = Math.max(0, 2 - p.x); p.a = Math.PI - p.a; }
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

  // Energy bars from a zero line: Q in, W out, ΔU change.
  const SCALE = 500;
  const bars = [
    { label: "Q · calor que entra", value: s.Q, color: "#e8794f" },
    { label: "W · trabajo del gas", value: s.W, color: "#5b7fd6" },
    { label: "ΔU · energía interna", value: s.dU, color: "#2f9e5b" },
  ];

  return (
    <div className="thermo-sim">
      <div className="thermo-laws" role="tablist" aria-label="Tipo de proceso">
        {(Object.keys(PROCESSES) as Process[]).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={process === key} onClick={() => choose(key)}>{PROCESSES[key].title}</button>
        ))}
      </div>
      <p className="thermo-fixed">ΔU = Q − W · <span>{info.rule}</span></p>
      <canvas ref={canvas} className="thermo-box first-law-box" role="img" aria-label={story(s)} />
      <div className="first-law-equation" aria-live="polite">
        <span>ΔU = Q − W</span>
        <strong>{story(s)}</strong>
      </div>
      <svg className="first-law-bars" viewBox="0 0 320 96" role="img" aria-label="Barras de energía">
        <line x1="200" x2="200" y1="4" y2="92" />
        {bars.map((b, i) => {
          const width = (Math.min(SCALE, Math.abs(b.value)) / SCALE) * 112;
          const y = 8 + i * 30;
          return (
            <g key={b.label}>
              <text x="4" y={y + 14}>{b.label}</text>
              <rect x={b.value >= 0 ? 200 : 200 - width} y={y} width={Math.max(1, width)} height="18" rx="4" fill={b.color} />
            </g>
          );
        })}
      </svg>
      <label className="thermo-slider">{info.slider}
        <input type="range" min={info.min} max={info.max} step={info.step} value={x} onChange={(e) => setX(Number(e.target.value))} />
      </label>
      <Predict key={process} q={info.question} />
    </div>
  );
}
