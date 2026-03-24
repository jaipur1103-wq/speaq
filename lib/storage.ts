import type { AppSettings, SavedExpression, Scenario, ScoreRecord } from "@/types";

const SETTINGS_KEY = "bep_settings";
const CUSTOM_SCENARIOS_KEY = "bep_custom_scenarios";
const SAVED_SCENARIOS_KEY = "bep_saved_scenarios";
const EXPRESSIONS_KEY = "bep_expressions";
const SCORE_HISTORY_KEY = "bep_score_history";
const FAVORITES_KEY = "bep_favorites";
const FIRST_VISIT_KEY = "bep_first_visit_done";

const DEMO_SCENARIO: Scenario = {
  id: "demo_001",
  category: "business",
  title: "Introduce yourself in a business meeting",
  titleJa: "ビジネス会議で自己紹介する",
  brief: "You're joining a new project team and need to introduce yourself to international colleagues.",
  briefJa: "新しいプロジェクトチームに加わり、海外の同僚に自己紹介します。",
  opener: "Hi everyone, glad to have you on board. Could you start by introducing yourself?",
  openerJa: "皆さん、ようこそ。まず自己紹介をお願いできますか？",
  difficulty: "intermediate",
  industry: "general",
  personaStyle: "neutral",
  personaName: "Alex",
  personaRole: "Project Manager",
};

export function initDemoScenario(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FIRST_VISIT_KEY)) return;
  const existing = getSavedScenarios();
  if (existing.length === 0) {
    localStorage.setItem(SAVED_SCENARIOS_KEY, JSON.stringify([DEMO_SCENARIO]));
  }
  localStorage.setItem(FIRST_VISIT_KEY, "1");
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "ja",
  topic: "business",
  difficulty: "intermediate",
  industry: "general",
  personaStyle: "neutral",
  apiKey: "",
  sessionLength: 5,
};

const VALID_INDUSTRIES = ["general", "technology", "finance", "consulting", "healthcare", "retail", "manufacturing"];

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (parsed.industry && !VALID_INDUSTRIES.includes(parsed.industry)) {
      parsed.industry = DEFAULT_SETTINGS.industry;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("speaq:langchange", { detail: settings.language }));
  }
}

export function getCustomScenarios(): Scenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_SCENARIOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomScenario(scenario: Scenario): void {
  const existing = getCustomScenarios();
  const updated = [scenario, ...existing];
  localStorage.setItem(CUSTOM_SCENARIOS_KEY, JSON.stringify(updated));
}

export function deleteCustomScenario(id: string): void {
  const existing = getCustomScenarios();
  localStorage.setItem(CUSTOM_SCENARIOS_KEY, JSON.stringify(existing.filter((s) => s.id !== id)));
}

export function getSavedScenarios(): Scenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_SCENARIOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGeneratedScenario(scenario: Scenario): void {
  const existing = getSavedScenarios();
  const updated = [scenario, ...existing].slice(0, 20);
  localStorage.setItem(SAVED_SCENARIOS_KEY, JSON.stringify(updated));
}

export function deleteSavedScenario(id: string): void {
  const existing = getSavedScenarios();
  localStorage.setItem(SAVED_SCENARIOS_KEY, JSON.stringify(existing.filter((s) => s.id !== id)));
}

export function getSavedExpressions(): SavedExpression[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXPRESSIONS_KEY);
    if (!raw) return [];
    const parsed: SavedExpression[] = JSON.parse(raw);
    return parsed.map((e) => ({
      ...e,
      chunk: e.chunk ?? "",
      example: e.example ?? "",
      category: e.category ?? "",
      quizCount: e.quizCount ?? 0,
    }));
  } catch {
    return [];
  }
}

export function saveExpression(expr: Omit<SavedExpression, "id" | "savedAt" | "learned" | "quizCount">): SavedExpression {
  const existing = getSavedExpressions();
  const newExpr: SavedExpression = {
    ...expr,
    id: "expr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    savedAt: Date.now(),
    learned: false,
    quizCount: 0,
  };
  localStorage.setItem(EXPRESSIONS_KEY, JSON.stringify([newExpr, ...existing]));
  return newExpr;
}

// Quizで「使えた」を押したとき呼ぶ。sessionUsedIdsに既にあればカウントしない。
// trueを返したらカウント済み（累計カウンター更新が必要）、falseはスキップ。
export function markQuizSuccess(id: string, sessionUsedIds: Set<string>): boolean {
  if (sessionUsedIds.has(id)) return false;
  const existing = getSavedExpressions();
  const updated = existing.map((e) =>
    e.id === id ? { ...e, quizCount: e.quizCount + 1, learned: true } : e
  );
  localStorage.setItem(EXPRESSIONS_KEY, JSON.stringify(updated));
  return true;
}

export function deleteExpression(id: string): void {
  const existing = getSavedExpressions();
  localStorage.setItem(EXPRESSIONS_KEY, JSON.stringify(existing.filter((e) => e.id !== id)));
}

// Score history
export function getScoreHistory(): ScoreRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SCORE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveScoreRecord(record: Omit<ScoreRecord, "id">): void {
  const existing = getScoreHistory();
  const newRecord: ScoreRecord = {
    ...record,
    id: "score_" + Date.now(),
  };
  const updated = [newRecord, ...existing].slice(0, 100);
  localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(updated));
}

// Streak
export function getStreak(): number {
  const history = getScoreHistory();
  if (history.length === 0) return 0;
  const uniqueDates = [...new Set(history.map((r) => r.date))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
  let streak = 0;
  let cursor = new Date(uniqueDates[0]);
  for (const date of uniqueDates) {
    if (date === cursor.toISOString().slice(0, 10)) {
      streak++;
      cursor = new Date(cursor.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

// Favorites
export function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(id: string): void {
  const existing = getFavoriteIds();
  const updated = existing.includes(id)
    ? existing.filter((f) => f !== id)
    : [id, ...existing];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
}
