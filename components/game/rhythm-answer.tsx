"use client";
import { useEffect, useRef, useState } from "react";
import type { Exercise } from "@/lib/engine/types";
import { encodePlayed, findOnsets, gradeRhythm, loopbackDelay, noiseLevel, parsePlayed, rhythmTolerance, shortestGap, type Frame, type NoteStatus } from "@/lib/engine/rhythm";

// Plays one measure: count-in, the student plays it, the microphone finds the attacks.
// Nothing is recorded or uploaded: only the attack times (in eighths) become the answer.
const WORKLET = `
class Meter extends AudioWorkletProcessor {
  constructor(){super();this.sum=0;this.count=0;}
  process(inputs){
    const ch=inputs[0]&&inputs[0][0];
    if(ch){for(let i=0;i<ch.length;i++){this.sum+=ch[i]*ch[i];if(++this.count===256){this.port.postMessage([currentTime+(i+1)/sampleRate,this.sum/256]);this.sum=0;this.count=0;}}}
    return true;
  }
}
registerProcessor('meter', Meter);`;

const SENSITIVITY = { baja: 9, media: 6, alta: 4 } as const;
type Sensitivity = keyof typeof SENSITIVITY;
type Audio = { ctx: AudioContext; meter: AudioWorkletNode; stream?: MediaStream };
type Phase = { kind: "idle" } | { kind: "count"; beat: number } | { kind: "play" | "listen"; beat: number; progress: number } | { kind: "thinking" };
const STATUS_TEXT: Record<NoteStatus, string> = { ok: "a tiempo", close: "casi a tiempo", early: "adelantada", late: "atrasada", missing: "no la escuché" };

export function RhythmAnswer({ exercise, value, onChange, disabled, revealed }: { exercise: Exercise; value: string; onChange: (answer: string) => void; disabled: boolean; revealed: boolean }) {
  const spec = exercise.rhythm!;
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [sensitivity, setSensitivity] = useState<Sensitivity>("media");
  const [error, setError] = useState("");
  const [heardClicks, setHeardClicks] = useState(true);
  const audio = useRef<Audio | null>(null);
  const frames = useRef<Frame[]>([]);
  const busy = phase.kind !== "idle";

  useEffect(() => () => {
    audio.current?.stream?.getTracks().forEach((t) => t.stop());
    void audio.current?.ctx.close();
  }, []);

  async function ready(withMic: boolean) {
    if (!audio.current) {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" })));
      const meter = new AudioWorkletNode(ctx, "meter");
      const silent = ctx.createGain();
      silent.gain.value = 0;
      meter.connect(silent).connect(ctx.destination);
      meter.port.onmessage = (event: MessageEvent<Frame>) => void frames.current.push(event.data);
      audio.current = { ctx, meter };
    }
    const a = audio.current;
    if (a.ctx.state !== "running") await a.ctx.resume();
    if (withMic && !a.stream) {
      a.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      a.ctx.createMediaStreamSource(a.stream).connect(a.meter);
    }
    return a;
  }

  // A soft wood-block tick.
  function click(ctx: AudioContext, at: number, strong: boolean) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(strong ? 1050 : 800, at);
    osc.frequency.exponentialRampToValueAtTime(strong ? 700 : 550, at + 0.04);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(strong ? 0.5 : 0.35, at + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.06);
  }

  // A warm string tone on A: violin-like overtones, gentle vibrato, a soft room echo.
  function bow(ctx: AudioContext, at: number, length: number) {
    const harmonics = [0, 1, 0.55, 0.38, 0.22, 0.16, 0.1, 0.07, 0.05, 0.03];
    const wave = ctx.createPeriodicWave(new Float32Array(harmonics.length), new Float32Array(harmonics));
    const end = at + Math.max(0.12, length - 0.04);
    const voice = ctx.createGain();
    voice.gain.setValueAtTime(0.0001, at);
    voice.gain.linearRampToValueAtTime(0.16, at + 0.05);
    voice.gain.linearRampToValueAtTime(0.12, at + 0.15);
    voice.gain.setValueAtTime(0.12, Math.max(at + 0.15, end - 0.08));
    voice.gain.linearRampToValueAtTime(0.0001, end);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1700;
    filter.Q.value = 0.5;
    const vibrato = ctx.createOscillator();
    const depth = ctx.createGain();
    vibrato.frequency.value = 5.5;
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(3.5, at + Math.min(0.35, length * 0.6));
    vibrato.connect(depth);
    const strings = [-3, 3].map((cents) => {
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(wave);
      osc.frequency.value = 440;
      osc.detune.value = cents;
      depth.connect(osc.frequency);
      osc.connect(filter);
      return osc;
    });
    filter.connect(voice).connect(ctx.destination);
    const echo = ctx.createDelay();
    const tail = ctx.createGain();
    echo.delayTime.value = 0.09;
    tail.gain.value = 0.22;
    voice.connect(echo).connect(tail).connect(echo);
    tail.connect(ctx.destination);
    for (const node of [...strings, vibrato]) {
      node.start(at);
      node.stop(end + 0.05);
    }
  }

  function animate(ctx: AudioContext, start: number, beat: number, kind: "play" | "listen", done: () => void) {
    const end = start + 4 * beat;
    const tick = () => {
      const now = ctx.currentTime;
      if (now < start) setPhase({ kind: "count", beat: Math.min(4, Math.max(1, Math.floor((now - (start - 4 * beat)) / beat) + 1)) });
      else if (now < end) setPhase({ kind, beat: Math.floor((now - start) / beat) + 1, progress: (now - start) / (4 * beat) });
      else return done();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async function listen() {
    setError("");
    const { ctx } = await ready(false);
    const beat = 60 / spec.bpm;
    const start = ctx.currentTime + 0.2 + 4 * beat;
    for (let k = 0; k < 4; k++) click(ctx, start - (4 - k) * beat, k === 0);
    for (const [at, length] of spec.notes) bow(ctx, start + (at * beat) / 2, (length * beat) / 2);
    animate(ctx, start, beat, "listen", () => setPhase({ kind: "idle" }));
  }

  async function play() {
    setError("");
    let a: Audio;
    try {
      a = await ready(true);
    } catch {
      setError("No pude usar el micrófono. Revisa que el navegador tenga permiso para escuchar.");
      return;
    }
    const { ctx } = a;
    const beat = 60 / spec.bpm;
    const eighth = beat / 2;
    const quiet = ctx.currentTime + 0.1;
    const firstClick = quiet + 0.5;
    const start = firstClick + 4 * beat;
    const clicks = [0, 1, 2, 3].map((k) => firstClick + k * beat);
    clicks.forEach((at, k) => click(ctx, at, k === 0));
    frames.current = [];
    animate(ctx, start, beat, "play", () => {
      setPhase({ kind: "thinking" });
      setTimeout(() => {
        const all = frames.current;
        const noiseDb = noiseLevel(all.filter(([t]) => t >= quiet + 0.05 && t < firstClick - 0.02));
        const minGap = Math.min(0.2, Math.max(0.07, 0.45 * shortestGap(spec.notes) * eighth));
        const onsets = findOnsets(all.filter(([t]) => t >= firstClick - 0.05), { noiseDb, rise: SENSITIVITY[sensitivity], minGap });
        const heard = loopbackDelay(onsets, clicks);
        setHeardClicks(heard !== null);
        const loop = heard ?? ctx.outputLatency + ctx.baseLatency + 0.02;
        const played = onsets.map((o) => (o - loop - start) / eighth).filter((t) => t > -0.6 && t < 7.8);
        onChange(encodePlayed(played));
        setPhase({ kind: "idle" });
      }, 350);
    });
  }

  const played = parsePlayed(value);
  const grade = played && revealed ? gradeRhythm(spec.notes.map(([at]) => at), played, rhythmTolerance(exercise.level, spec.notes)) : null;
  const color: Record<NoteStatus, string> = { ok: "var(--rhythm-good)", close: "var(--rhythm-close)", early: "var(--rhythm-bad)", late: "var(--rhythm-bad)", missing: "var(--rhythm-bad)" };
  const x = (eighths: number) => 10 + (eighths / 8) * 380;
  const moving = phase.kind === "play" || phase.kind === "listen";

  return (
    <div className="rhythm-answer">
      {exercise.image && (
        <figure className="rhythm-score">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={exercise.image} alt={exercise.imageAlt ?? "Compás para tocar"} />
          {moving && <span className="rhythm-cursor" style={{ left: `${phase.progress * 100}%` }} />}
        </figure>
      )}
      {spec.tiedIn && <p className="rhythm-note">Empieza con una nota ligada del compás anterior: tócala al empezar.</p>}
      <div className="rhythm-beats" aria-live="polite">
        {[1, 2, 3, 4].map((b) => (
          <span key={b} className={(phase.kind === "count" || moving) && "beat" in phase && phase.beat === b ? (phase.kind === "count" ? "is-count" : "is-now") : ""}>{b}</span>
        ))}
        <strong>{phase.kind === "count" ? "Prepárate…" : phase.kind === "play" ? "¡Toca!" : phase.kind === "listen" ? "Escucha" : phase.kind === "thinking" ? "Escuchando…" : value && !revealed ? "¡Listo! Ya te escuché." : ""}</strong>
      </div>
      <div className="rhythm-actions">
        {!disabled && <button type="button" className="rhythm-play" onClick={play} disabled={busy}>🎻 {value ? "Tocar otra vez" : "Tocar"}</button>}
        <button type="button" onClick={listen} disabled={busy}>▶ Escuchar cómo suena</button>
      </div>
      {error && <p className="rhythm-error" role="alert">{error}</p>}
      {grade && (
        <div className="rhythm-result">
          <svg viewBox="0 0 400 60" role="img" aria-label="Notas escritas y notas tocadas">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => <line key={k} x1={x(k)} x2={x(k)} y1={4} y2={50} stroke="var(--rhythm-line)" strokeWidth={k % 2 ? 0.5 : 1.2} />)}
            {grade.notes.map((n, k) => <rect key={k} x={x(n.expected) + 1} y={8} width={Math.max(6, x(spec.notes[k][1]) - x(0) - 3)} height={14} rx={5} fill={color[n.status]} />)}
            {grade.notes.map((n, k) => n.played !== null && <path key={k} d={`M${x(n.played)} 28 l-5 10 h10 z`} fill="currentColor" />)}
            {grade.extra.map((t, k) => <path key={`e${k}`} d={`M${x(t)} 28 l-5 10 h10 z`} fill="var(--rhythm-bad)" />)}
          </svg>
          <ol>
            {grade.notes.map((n, k) => <li key={k} style={{ color: color[n.status] }}>Nota {k + 1}: {STATUS_TEXT[n.status]}</li>)}
            {grade.extra.length > 0 && <li style={{ color: "var(--rhythm-bad)" }}>{grade.extra.length === 1 ? "Escuché una nota de más" : `Escuché ${grade.extra.length} notas de más`}</li>}
          </ol>
        </div>
      )}
      <details className="rhythm-help">
        <summary>¿No te escucha bien?</summary>
        <p>Toca cerca del celular, sin audífonos Bluetooth. Empieza en pizzicato o con arcos bien separados.</p>
        <label>Sensibilidad
          <select value={sensitivity} onChange={(e) => setSensitivity(e.target.value as Sensitivity)} disabled={busy}>
            <option value="baja">Baja (hay ruido alrededor)</option>
            <option value="media">Media</option>
            <option value="alta">Alta (notas suaves o ligadas)</option>
          </select>
        </label>
        {!heardClicks && <p>No escuché el metrónomo por el micrófono; sube un poco el volumen.</p>}
      </details>
    </div>
  );
}
