"use client";
import { useState, type ComponentType } from "react";
import { ThermoSim } from "./thermo-sim";
import { ArchimedesSim } from "./archimedes-sim";
import { FluidsSim } from "./fluids-sim";

// The lab tab: a shelf of simulators to explore. A new simulator is one more entry here.
// Nothing is saved: it does not count as practice or change the streak.
const SIMULATORS: { id: string; emoji: string; title: string; topic: string; blurb: string; note: string; Sim: ComponentType }[] = [
  { id: "gases", emoji: "🌡️", title: "Gases", topic: "Termodinámica", blurb: "Presión, volumen y temperatura", note: "Gas ideal: PV = nRT, con 0,1 mol.", Sim: ThermoSim },
  { id: "flotacion", emoji: "🧊", title: "Flotación", topic: "Hidrostática", blurb: "El principio de Arquímedes", note: "Empuje = peso del líquido desalojado (g = 9,8 m/s²).", Sim: ArchimedesSim },
  { id: "hidrodinamica", emoji: "🚰", title: "Hidrodinámica", topic: "Fluidos en movimiento", blurb: "Torricelli, continuidad y Bernoulli", note: "Agua (1000 kg/m³), g = 9,8 m/s², sin rozamiento.", Sim: FluidsSim },
];

export function PhysicsLab() {
  // Tapping the open card again closes its simulator.
  const [selected, setSelected] = useState<string | null>(SIMULATORS[0].id);
  const current = SIMULATORS.find((s) => s.id === selected);
  return (
    <section className="physics-lab">
      <h2>Laboratorio</h2>
      <p className="lab-intro">Explora</p>
      <div className="lab-shelf" aria-label="Simuladores">
        {SIMULATORS.map((s) => (
          <button key={s.id} type="button" aria-expanded={s.id === selected} aria-controls="lab-stage" onClick={() => setSelected(s.id === selected ? null : s.id)}>
            <span className="lab-emoji" aria-hidden="true">{s.emoji}</span>
            <span><strong>{s.title}</strong><small>{s.topic} · {s.blurb}</small></span>
          </button>
        ))}
      </div>
      {current && (
        <div className="lab-stage" id="lab-stage" aria-label={current.title}>
          <current.Sim key={current.id} />
          <p className="lab-note">{current.topic} · {current.note}</p>
        </div>
      )}
    </section>
  );
}
