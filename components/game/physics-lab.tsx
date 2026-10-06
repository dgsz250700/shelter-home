"use client";
import { useState, type ComponentType } from "react";
import { ThermoSim } from "./thermo-sim";
import { ArchimedesSim } from "./archimedes-sim";

// The lab tab: a shelf of simulators to explore. A new simulator is one more entry here.
// Nothing is saved: it does not count as practice or change the streak.
const SIMULATORS: { id: string; emoji: string; title: string; topic: string; blurb: string; note: string; Sim: ComponentType }[] = [
  { id: "gases", emoji: "🌡️", title: "Gases", topic: "Termodinámica", blurb: "Presión, volumen y temperatura", note: "Gas ideal: PV = nRT, con 0,1 mol.", Sim: ThermoSim },
  { id: "flotacion", emoji: "🧊", title: "Flotación", topic: "Hidrostática", blurb: "El principio de Arquímedes", note: "Empuje = peso del líquido desalojado (g = 9,8 m/s²).", Sim: ArchimedesSim },
];

export function PhysicsLab() {
  const [selected, setSelected] = useState(SIMULATORS[0].id);
  const current = SIMULATORS.find((s) => s.id === selected) ?? SIMULATORS[0];
  return (
    <section className="physics-lab">
      <h2>Laboratorio</h2>
      <p className="lab-intro">Explora</p>
      <div className="lab-shelf" role="tablist" aria-label="Simuladores">
        {SIMULATORS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={s.id === current.id} onClick={() => setSelected(s.id)}>
            <span className="lab-emoji" aria-hidden="true">{s.emoji}</span>
            <span><strong>{s.title}</strong><small>{s.topic} · {s.blurb}</small></span>
          </button>
        ))}
      </div>
      <div className="lab-stage" role="tabpanel" aria-label={current.title}>
        <current.Sim key={current.id} />
        <p className="lab-note">{current.topic} · {current.note}</p>
      </div>
    </section>
  );
}
