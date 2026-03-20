import type { AppSettings, SavedExpression, Scenario } from "@/types";

const SETTINGS_KEY = "bep_settings";
const CUSTOM_SCENARIOS_KEY = "bep_custom_scenarios";
const SAVED_SCENARIOS_KEY = "bep_saved_scenarios";

export const DEFAULT_SETTINGS: AppSettings = {
  difficulty: "intermediate",
  industry: "general",
  personaStyle: "neutral",
  apiKey: "",
  timerEnabled: false,
};

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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

const EXPRESSIONS_KEY = "bep_expressions";

export function getSavedExpressions(): SavedExpression[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXPRESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExpression(expr: Omit<SavedExpression, "id" | "savedAt" | "learned">): SavedExpression {
  const existing = getSavedExpressions();
  const newExpr: SavedExpression = {
    ...expr,
    id: "expr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    savedAt: Date.now(),
    learned: false,
  };
  localStorage.setItem(EXPRESSIONS_KEY, JSON.stringify([newExpr, ...existing]));
  return newExpr;
}

export function toggleLearned(id: string): void {
  const existing = getSavedExpressions();
  const updated = existing.map((e) => e.id === id ? { ...e, learned: !e.learned } : e);
  localStorage.setItem(EXPRESSIONS_KEY, JSON.stringify(updated));
}

export function deleteExpression(id: string): void {
  const existing = getSavedExpressions();
  localStorage.setItem(EXPRESSIONS_KEY, JSON.stringify(existing.filter((e) => e.id !== id)));
}
