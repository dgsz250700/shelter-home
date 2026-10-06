"use client";
import { useState } from "react";

// "Predice": a quick question before trying it in the simulator. Nothing is saved.
export type Question = { text: string; options: string[]; answer: number; why: string };
// The options are shown in an order taken from the question's text: the right one is not always first,
// and the order stays the same on every visit (no random numbers, so server and browser agree).
function order(q: Question) {
  let seed = 0;
  for (const ch of q.text) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  // A well-mixed number generator (mulberry32) seeded by the text, then a Fisher–Yates shuffle.
  const next = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const indexes = q.options.map((_, i) => i);
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes;
}

export function Predict({ q }: { q: Question }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="thermo-question">
      <strong>Predice: {q.text}</strong>
      <div>
        {order(q).map((i) => (
          <button key={q.options[i]} type="button" aria-pressed={picked === i} className={picked === null ? "" : i === q.answer ? "is-right" : picked === i ? "is-wrong" : ""} onClick={() => setPicked(i)} disabled={picked !== null}>{q.options[i]}</button>
        ))}
      </div>
      {picked !== null && <p>{picked === q.answer ? "¡Exacto! " : "Casi. "}{q.why}</p>}
    </div>
  );
}

