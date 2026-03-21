export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Topic = "business" | "travel" | "daily" | "social" | "study";
export type Industry =
  | "general"
  | "technology"
  | "finance"
  | "consulting"
  | "healthcare"
  | "retail"
  | "manufacturing";

export type PersonaStyle = "friendly" | "neutral" | "tough";

export interface Scenario {
  id: string;
  category: string;
  title: string;
  brief: string;
  opener: string;
  keyPhrases: string[];
  difficulty: Difficulty;
  industry: Industry;
  personaStyle: PersonaStyle;
  personaName: string;
  personaRole: string;
}

export interface Message {
  role: "user" | "counterpart";
  text: string;
  timestamp: number;
}

export interface ScoreBreakdown {
  clarity: number;
  persuasion: number;
  professionalism: number;
  strategy: number;
}

export interface NaturalExpression {
  original: string;
  natural: string;
  explanation: string;
}

export interface Feedback {
  scores: ScoreBreakdown;
  overall: number;
  strengths: string[];
  improvements: string[];
  foundPhrases: string[];
  wordCount: number;
  suggestedResponse: string;
  naturalExpressions: NaturalExpression[];
}

export interface SavedExpression {
  id: string;
  original: string;
  natural: string;
  explanation: string;
  scenarioTitle: string;
  savedAt: number;
  learned: boolean;
}

export interface TurnScore {
  turn: number;
  overall: number;
  scores: ScoreBreakdown;
}

export interface ScoreRecord {
  id: string;
  date: string;
  scenarioTitle: string;
  overall: number;
  scores: ScoreBreakdown;
  turnCount: number;
}

export interface AppSettings {
  topic: Topic;
  difficulty: Difficulty;
  industry: Industry;
  personaStyle: PersonaStyle;
  apiKey: string;
  timerEnabled: boolean;
}

export interface CustomScenario extends Scenario {
  isCustom: true;
}
