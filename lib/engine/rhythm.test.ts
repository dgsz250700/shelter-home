import { describe, expect, it } from "vitest";
import { encodePlayed, findOnsets, gradeRhythm, loopbackDelay, parsePlayed, rhythmTolerance, type Frame, type RhythmNote } from "./rhythm";
import { evaluate } from "./exercises";
import type { Exercise } from "./types";

const SYNCOPA: RhythmNote[] = [[0, 2], [2, 1], [3, 2], [5, 1], [6, 2]];
const exercise = (notes: RhythmNote[], level: Exercise["level"] = 1): Exercise => ({
  skillId: "s", level, seed: "v4:x:0", prompt: "Toca este compás", answer: notes.map(([at]) => at).join(","),
  answerFormat: "rhythm", rhythm: { notes, bpm: 60 }, errorSignatures: [], hints: ["a", "b", "c"],
});

// A tone that starts at each time: loud while sounding, quiet in the gaps, 5 ms frames.
function tone(starts: number[], length = 0.3, until = 3): Frame[] {
  const frames: Frame[] = [];
  for (let t = 0; t < until; t += 0.005) frames.push([t, starts.some((s) => t >= s && t < s + length) ? 0.05 : 1e-7]);
  return frames;
}

describe("rhythm grading", () => {
  it("accepts a measure played on time and a little off", () => {
    expect(gradeRhythm([0, 2, 3, 5, 6], [0.05, 2.1, 2.9, 5, 6.2], 0.6).passed).toBe(true);
  });
  it("finds a missing note, an extra note and a late note", () => {
    expect(gradeRhythm([0, 2, 3, 5, 6], [0, 2, 5, 6], 0.6).notes[2].status).toBe("missing");
    const extra = gradeRhythm([0, 4], [0, 2, 4], 0.6);
    expect(extra.passed).toBe(false);
    expect(extra.extra).toEqual([2]);
    expect(gradeRhythm([0, 4], [0, 4.9], 0.6).notes[1].status).toBe("late");
  });
  it("gets stricter with each level but never wider than the gap between notes", () => {
    expect(rhythmTolerance(1, [[0, 4], [4, 4]])).toBeGreaterThan(rhythmTolerance(4, [[0, 4], [4, 4]]));
    expect(rhythmTolerance(1, SYNCOPA)).toBeLessThanOrEqual(0.45);
  });
});

describe("rhythm answers", () => {
  it("round-trips the played attacks and rejects anything else", () => {
    expect(parsePlayed(encodePlayed([0.004, 2.1234, 6]))).toEqual([0, 2.12, 6]);
    expect(parsePlayed(encodePlayed([]))).toEqual([]);
    for (const bad of ["", "a,b", "3,1", "12", "1.234"]) expect(parsePlayed(bad)).toBeNull();
  });
  it("is graded on the server like any other answer", () => {
    expect(evaluate(exercise(SYNCOPA), "0,2,3,5,6")).toEqual({ valid: true, correct: true, errorType: null });
    expect(evaluate(exercise(SYNCOPA), "0,2,5,6")).toMatchObject({ valid: true, correct: false, errorType: "NOTA_FALTANTE" });
    expect(evaluate(exercise(SYNCOPA), "-")).toMatchObject({ correct: false });
    expect(evaluate(exercise(SYNCOPA), "")).toMatchObject({ valid: false });
  });
  it("is stricter at higher levels", () => {
    const played = "0,2.4,3,5,6";
    expect(evaluate(exercise(SYNCOPA, 1), played)).toMatchObject({ correct: true });
    expect(evaluate(exercise(SYNCOPA, 4), played)).toMatchObject({ correct: false });
  });
});

describe("hearing the attacks", () => {
  it("finds each note start and the click latency", () => {
    const onsets = findOnsets(tone([0.5, 1.0, 1.25, 2.0], 0.2), { noiseDb: -70 });
    expect(onsets.map((t) => Math.round(t * 100) / 100)).toEqual([0.5, 1, 1.25, 2]);
    expect(loopbackDelay([0.53, 1.03, 1.54], [0.5, 1, 1.5])).toBeCloseTo(0.03);
    expect(loopbackDelay([2], [0.5, 1])).toBeNull();
  });
});
