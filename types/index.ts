export type Language = "en" | "ja";
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
export type SessionLength = 3 | 5 | 10;

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
  accuracy: number;
  range: number;
  interaction: number;
  coherence: number;
}

export type NaturalExpressionReason = "grammar" | "collocation" | "literal" | "set-phrase" | "formality" | "nuance";

export interface NaturalExpression {
  original: string;
  natural: string;
  chunk: string;
  explanation: string;
  example: string;
  reason: NaturalExpressionReason;
  chunkDetail: string;
}

export interface Feedback {
  scores: ScoreBreakdown;
  overall: number;
  encouragement: string;
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
  chunk: string;
  example: string;
  explanation: string;
  scenarioTitle: string;
  category: string;
  savedAt: number;
  learned: boolean;
  quizCount: number;
  reason?: NaturalExpressionReason;
  chunkDetail?: string;
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
  language: Language;
  topic: Topic;
  difficulty: Difficulty;
  industry: Industry;
  personaStyle: PersonaStyle;
  apiKey: string;
  sessionLength: SessionLength;
}

export interface CustomScenario extends Scenario {
  isCustom: true;
}
