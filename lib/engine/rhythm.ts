import type { Level } from "./types";

// Playing one measure on an instrument: the microphone finds the note attacks and they are
// compared with the written rhythm. Everything is measured in eighths (8 per 4/4 measure).
export type RhythmNote = [start: number, length: number];
export type RhythmSpec = { notes: RhythmNote[]; bpm: number; tiedIn?: boolean };
export type Frame = [time: number, power: number];

const db = (power: number) => 10 * Math.log10(power + 1e-12);

export function noiseLevel(frames: Frame[]) {
  const levels = frames.map(([, p]) => db(p)).sort((a, b) => a - b);
  return levels.length ? levels[Math.floor(levels.length / 2)] : -90;
}

// An attack is a quick jump in loudness (rise dB within 50 ms) above the background.
export function findOnsets(frames: Frame[], { noiseDb, rise = 6, gate = 10, minGap = 0.1 }: { noiseDb: number; rise?: number; gate?: number; minGap?: number }) {
  if (frames.length < 4) return [];
  const raw = frames.map(([, p]) => db(p));
  const level = raw.map((_, i) => (raw[Math.max(0, i - 2)] + raw[Math.max(0, i - 1)] + raw[i]) / 3);
  const step = (frames.at(-1)![0] - frames[0][0]) / (frames.length - 1);
  const look = Math.max(2, Math.round(0.05 / step));
  const onsets: number[] = [];
  let last = -Infinity;
  for (let i = 1; i < level.length; i++) {
    let lowest = i;
    for (let j = Math.max(0, i - look); j < i; j++) if (level[j] < level[lowest]) lowest = j;
    if (level[i] - level[lowest] < rise || level[i] < noiseDb + gate) continue;
    let start = lowest;
    while (start < i && level[start] < level[lowest] + 3) start++;
    const time = frames[start][0];
    if (time - last < minGap) continue;
    onsets.push(time);
    last = time;
  }
  return onsets;
}

// The microphone also hears the count-in clicks: their delay is the speaker + microphone latency.
export function loopbackDelay(onsets: number[], clicks: number[]) {
  const delays: number[] = [];
  for (const click of clicks) {
    const heard = onsets.find((o) => o >= click - 0.01 && o <= click + 0.25);
    if (heard !== undefined) delays.push(heard - click);
  }
  if (delays.length < 2) return null;
  delays.sort((a, b) => a - b);
  return delays[Math.floor(delays.length / 2)];
}

export const shortestGap = (notes: RhythmNote[]) => Math.min(...notes.map(([at], k) => (notes[k + 1]?.[0] ?? 8) - at));

// How far from the written attack still counts, in eighths: generous at first, stricter with each level.
export function rhythmTolerance(level: Level, notes: RhythmNote[]) {
  const share = { 1: 0.6, 2: 0.5, 3: 0.4, 4: 0.3 }[level];
  return Math.min(share, 0.45 * shortestGap(notes));
}

export type NoteStatus = "ok" | "close" | "early" | "late" | "missing";
export type NoteVerdict = { expected: number; played: number | null; offset: number | null; status: NoteStatus };
export type RhythmGrade = { notes: NoteVerdict[]; extra: number[]; passed: boolean };

// Each written attack takes the nearest played one, in order. Times in eighths from the downbeat.
export function gradeRhythm(expected: number[], played: number[], tolerance: number): RhythmGrade {
  const used = new Set<number>();
  let from = 0;
  const notes: NoteVerdict[] = expected.map((time, k) => {
    const next = expected[k + 1] ?? Infinity;
    const previous = expected[k - 1] ?? -Infinity;
    const low = Math.max(time - 2 * tolerance, (previous + time) / 2);
    const high = Math.min(time + 2 * tolerance, (time + next) / 2);
    let best = -1;
    for (let i = from; i < played.length; i++) {
      if (used.has(i) || played[i] < low) continue;
      if (played[i] > high) break;
      if (best < 0 || Math.abs(played[i] - time) < Math.abs(played[best] - time)) best = i;
    }
    if (best < 0) return { expected: time, played: null, offset: null, status: "missing" };
    used.add(best);
    from = best + 1;
    const offset = played[best] - time;
    const status: NoteStatus = Math.abs(offset) <= tolerance / 2 ? "ok" : Math.abs(offset) <= tolerance ? "close" : offset < 0 ? "early" : "late";
    return { expected: time, played: played[best], offset, status };
  });
  const extra = played.filter((_, i) => !used.has(i));
  return { notes, extra, passed: notes.every((n) => n.status === "ok" || n.status === "close") && extra.length === 0 };
}

// The answer sent to the server: the played attacks in eighths, "-" when nothing was heard.
export const MAX_PLAYED = 14;
export function encodePlayed(played: number[]) {
  return played.length ? played.slice(0, MAX_PLAYED).map((t) => String(Math.round(t * 100) / 100)).join(",") : "-";
}
export function parsePlayed(input: string): number[] | null {
  const text = input.trim();
  if (text === "-") return [];
  const parts = text.split(",");
  if (!text || parts.length > MAX_PLAYED || parts.some((p) => !/^-?\d(\.\d{1,2})?$/.test(p))) return null;
  const values = parts.map(Number);
  return values.every((v, i) => v >= -1 && v <= 8 && (i === 0 || v >= values[i - 1])) ? values : null;
}

export function rhythmError(grade: RhythmGrade) {
  if (grade.notes.some((n) => n.status === "missing")) return "NOTA_FALTANTE";
  if (grade.extra.length) return "NOTA_DE_MAS";
  if (grade.notes.some((n) => n.status === "early")) return "RITMO_ADELANTADO";
  return "RITMO_ATRASADO";
}
