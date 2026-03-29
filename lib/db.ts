import { createClient } from "@/lib/supabase/client";
import type { AppSettings, SavedExpression, Scenario, ScoreRecord } from "@/types";

export const DEFAULT_SETTINGS: AppSettings = {
  language: "ja",
  topic: "business",
  difficulty: "beginner",
  industry: "general",
  personaStyle: "neutral",
  apiKey: "",
  sessionLength: 5,
};

const VALID_INDUSTRIES = [
  "general", "technology", "finance", "consulting",
  "healthcare", "retail", "manufacturing",
];

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_SETTINGS;

  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) return DEFAULT_SETTINGS;

  const industry = VALID_INDUSTRIES.includes(data.industry)
    ? data.industry
    : DEFAULT_SETTINGS.industry;

  return {
    language: data.language ?? DEFAULT_SETTINGS.language,
    topic: data.topic ?? DEFAULT_SETTINGS.topic,
    difficulty: data.difficulty ?? DEFAULT_SETTINGS.difficulty,
    industry,
    personaStyle: data.persona_style ?? DEFAULT_SETTINGS.personaStyle,
    apiKey: "",
    sessionLength: data.session_length ?? DEFAULT_SETTINGS.sessionLength,
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("settings").upsert({
    user_id: user.id,
    language: settings.language,
    topic: settings.topic,
    difficulty: settings.difficulty,
    industry: settings.industry,
    persona_style: settings.personaStyle,
    session_length: settings.sessionLength,
    updated_at: new Date().toISOString(),
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("speaq:langchange", { detail: settings.language }));
  }
}

// ── Scenarios ──────────────────────────────────────────────────────────────────

export async function getSavedScenarios(): Promise<Scenario[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("scenarios")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_custom", false)
    .order("created_at", { ascending: false });

  return (data ?? []).map(rowToScenario);
}

export async function getCustomScenarios(): Promise<Scenario[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("scenarios")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_custom", true)
    .order("created_at", { ascending: false });

  return (data ?? []).map(rowToScenario);
}

export async function saveGeneratedScenario(scenario: Scenario): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("scenarios").upsert({
    ...scenarioToRow(scenario),
    user_id: user.id,
    is_custom: false,
  });
}

export async function saveCustomScenario(scenario: Scenario): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("scenarios").insert({
    ...scenarioToRow(scenario),
    user_id: user.id,
    is_custom: true,
  });
}

export async function deleteSavedScenario(id: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("scenarios").delete().eq("id", id).eq("user_id", user.id);
}

export async function deleteCustomScenario(id: string): Promise<void> {
  return deleteSavedScenario(id);
}

// ── Favorites ──────────────────────────────────────────────────────────────────

export async function getFavoriteIds(): Promise<string[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("scenarios")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_favorite", true);

  return (data ?? []).map((r: { id: string }) => r.id);
}

export async function toggleFavorite(id: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from("scenarios")
    .select("is_favorite")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  await supabase
    .from("scenarios")
    .update({ is_favorite: !data?.is_favorite })
    .eq("id", id)
    .eq("user_id", user.id);
}

// ── Expressions ───────────────────────────────────────────────────────────────

export async function getSavedExpressions(): Promise<SavedExpression[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("expressions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map(rowToExpression);
}

export async function saveExpression(
  expr: Omit<SavedExpression, "id" | "savedAt" | "learned" | "quizCount">
): Promise<SavedExpression> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const newExpr: SavedExpression = {
    ...expr,
    id: "expr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    savedAt: Date.now(),
    learned: false,
    quizCount: 0,
  };

  if (!user) return newExpr;

  await supabase.from("expressions").insert({
    id: newExpr.id,
    user_id: user.id,
    original: newExpr.original,
    natural_text: newExpr.natural,
    chunk: newExpr.chunk,
    chunk_detail: newExpr.chunkDetail ?? "",
    example: newExpr.example,
    explanation: newExpr.explanation,
    reason: newExpr.reason ?? "",
    scenario_title: newExpr.scenarioTitle,
    category: newExpr.category,
    learned: false,
    quiz_count: 0,
    saved_at: newExpr.savedAt,
  });

  return newExpr;
}

export async function markQuizSuccess(
  id: string,
  sessionUsedIds: Set<string>
): Promise<boolean> {
  if (sessionUsedIds.has(id)) return false;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("expressions")
    .select("quiz_count")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  await supabase
    .from("expressions")
    .update({ quiz_count: (data?.quiz_count ?? 0) + 1, learned: true })
    .eq("id", id)
    .eq("user_id", user.id);

  return true;
}

export async function deleteExpression(id: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("expressions").delete().eq("id", id).eq("user_id", user.id);
}

// ── Score records ─────────────────────────────────────────────────────────────

export async function getScoreHistory(): Promise<ScoreRecord[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("score_records")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map(rowToScoreRecord);
}

export async function saveScoreRecord(record: Omit<ScoreRecord, "id">): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("score_records").insert({
    id: "score_" + Date.now(),
    user_id: user.id,
    date: record.date,
    scenario_title: record.scenarioTitle,
    turn_count: record.turnCount,
    scenario_category: record.scenarioCategory,
    difficulty: record.difficulty,
    conversation_summary: record.conversationSummary,
    encouragement: record.encouragement,
    strengths: record.strengths ?? [],
    improvements: record.improvements ?? [],
    expression_count: record.expressionCount ?? 0,
    natural_chunks: record.naturalChunks ?? [],
  });
}

export async function getStreak(): Promise<number> {
  const history = await getScoreHistory();
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

// ── Row mappers ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToScenario(row: any): Scenario {
  return {
    id: row.id,
    category: row.category ?? "",
    title: row.title,
    titleJa: row.title_ja ?? undefined,
    brief: row.brief ?? "",
    briefJa: row.brief_ja ?? undefined,
    opener: row.opener ?? "",
    openerJa: row.opener_ja ?? undefined,
    difficulty: row.difficulty ?? "beginner",
    industry: row.industry ?? "general",
    personaStyle: row.persona_style ?? "neutral",
    personaName: row.persona_name ?? "",
    personaRole: row.persona_role ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scenarioToRow(scenario: Scenario): Record<string, unknown> {
  return {
    id: scenario.id,
    category: scenario.category,
    title: scenario.title,
    title_ja: scenario.titleJa,
    brief: scenario.brief,
    brief_ja: scenario.briefJa,
    opener: scenario.opener,
    opener_ja: scenario.openerJa,
    difficulty: scenario.difficulty,
    industry: scenario.industry,
    persona_style: scenario.personaStyle,
    persona_name: scenario.personaName,
    persona_role: scenario.personaRole,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToExpression(row: any): SavedExpression {
  return {
    id: row.id,
    original: row.original ?? "",
    natural: row.natural_text ?? "",
    chunk: row.chunk ?? "",
    chunkDetail: row.chunk_detail ?? "",
    example: row.example ?? "",
    explanation: row.explanation ?? "",
    reason: row.reason || undefined,
    scenarioTitle: row.scenario_title ?? "",
    category: row.category ?? "",
    savedAt: row.saved_at ?? 0,
    learned: row.learned ?? false,
    quizCount: row.quiz_count ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToScoreRecord(row: any): ScoreRecord {
  return {
    id: row.id,
    date: row.date ?? "",
    scenarioTitle: row.scenario_title ?? "",
    scenarioCategory: row.scenario_category ?? undefined,
    difficulty: row.difficulty ?? undefined,
    turnCount: row.turn_count ?? 0,
    conversationSummary: row.conversation_summary ?? undefined,
    encouragement: row.encouragement ?? undefined,
    strengths: row.strengths ?? [],
    improvements: row.improvements ?? undefined,
    expressionCount: row.expression_count ?? undefined,
    naturalChunks: row.natural_chunks ?? [],
  };
}
