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
  titleJa?: string;
  brief: string;
  briefJa?: string;
  opener: string;
  openerJa?: string;
  difficulty: Difficulty;
  industry: Industry;
  personaStyle: PersonaStyle;
  personaName: string;
  personaRole: string;
}

export interface Message {
  role: "user" | "counterpart";
  text: string;
  textJa?: string;
  timestamp: number;
}

export type NaturalExpressionReason = "grammar" | "collocation" | "literal" | "set-phrase" | "formality" | "nuance";

export interface ImprovementItem {
  originalPhrase: string;
  improvedPhrase: string;
  comment: string;
  suggestedResponse: string;
}

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
  conversationSummary?: string;
  encouragement: string;
  strengths: string[];
  improvements: ImprovementItem[];
  wordCount: number;
  naturalExpressions: NaturalExpression[];
  insightMode?: boolean;
}

export interface PhraseExample {
  scene: string;
  sentence: string;
  sentenceJa?: string;
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
  examples?: PhraseExample[];
}

export interface ScoreRecord {
  id: string;
  date: string;
  scenarioTitle: string;
  scenarioCategory?: string;
  difficulty?: Difficulty;
  turnCount: number;
  conversationSummary?: string;
  encouragement?: string;
  strengths?: string[];
  improvements?: ImprovementItem[];
  expressionCount?: number;
  naturalChunks?: string[];
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
