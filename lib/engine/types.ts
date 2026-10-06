export type Level = 1 | 2 | 3 | 4;
export type Family = "equations" | "units" | "chemistry" | "perimeter" | "area" | "measurement" | "custom";
export type Exercise = {
  skillId: string;
  level: Level;
  seed: string;
  prompt: string;
  displayPrompt?: string;
  answer: string;
  answerFormat: "number" | "fraction" | "coefficients" | "expression" | "choice" | "text" | "boolean" | "match" | "rhythm";
  matches?: {left:string;right:string}[];
  choices?: {value:string;label:string}[];
  unitScale?: {units:string[];source:string;target:string;stepFactor:number};
  visual?: ExerciseVisual;
  conversion?: {value:number;source:string;target:string;factor:number};
  formula?: string;
  target?: string;
  symbolMeaning?: string;
  tolerance?: number;
  image?: string;
  imageAlt?: string;
  rhythm?: import("./rhythm").RhythmSpec;
  errorSignatures: { value: string; errorType: string }[];
  hints: [string, string, string];
};
export type CustomQuestion = {
  sourceNumber?: number;
  matches?: {left:string;right:string}[];
  choices?: {value:string;label:string}[];
  image?: string;
  imageAlt?: string;
  rhythm?: import("./rhythm").RhythmSpec;
  prompt: string;
  answer: string;
  hints: [string, string, string];
  answerFormat: Exercise["answerFormat"];
  level: Level;
};
export type Skill = {
  driveFileId?: string;
  id: string;
  name: string;
  subject: string;
  description: string;
  active: boolean;
  priority: number;
  base_difficulty: Level;
  created_at: string;
  family: Family;
  questions?: CustomQuestion[];
  practiceDays?: number[];
  fixedLevel?: boolean;
  classTopic?: string;
};
export type Mastery = {
  skill_id: string;
  mastery_score: number;
  current_level: Level;
  recent_accuracy: number;
  attempts_total: number;
  last_practiced_at: string | null;
};
export type Attempt = {
  timing_version?: number;
  ai_help?: boolean;
  user_id: string;
  id: string;
  skill_id: string;
  level: Level;
  exercise_seed: string;
  prompt_text: string;
  expected_answer: string;
  given_answer: string;
  correct: boolean;
  response_ms: number;
  hint_level: number;
  error_type: string | null;
  session_id: string;
  created_at: string;
};
export type Question = {
  skillId: string;
  family: Family;
  level: Level;
  seed: string;
  reinforced?: boolean;
};
export type Streak = {
  current: number;
  best: number;
  total_days: number;
  last_session_date: string | null;
};
export type ShelterState = {
  toys?: number;
  yarn?: number;
  vet_visits?: number;
  boxes?: number;
  beds?: number;
  treats?: number;
  last_reward?: import("./challenge").CareReward | null;
  last_care_date?: string;
  food: number;
  blankets: number;
  lamps: number;
  clean_zones: number;
  affection: number;
};

export type ExerciseVisual =
 | {kind:'geometry';shape:'rectangle'|'triangle'|'cutout'|'mosaic';width:number;height:number;cut?:number;unit:string;highlight:'border'|'surface';description:string}
 | {kind:'conversion';instrument:'ladder'|'vessel'|'balance'|'gauge'|'density';value:number;source:string;target:string;equivalence:string;description:string}
 | {kind:'situation';scene:'fence'|'blanket'|'bottle'|'scale'|'pump'|'material';description:string};
