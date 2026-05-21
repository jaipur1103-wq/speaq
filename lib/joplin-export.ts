import type { SavedExpression, ScoreRecord } from "@/types";

const REASON_LABEL: Record<string, string> = {
  grammar: "文法",
  collocation: "コロケーション",
  literal: "直訳",
  "set-phrase": "定型表現",
  formality: "フォーマリティ",
  nuance: "ニュアンス",
};

const CATEGORY_LABEL: Record<string, { ja: string; en: string; icon: string }> = {
  business: { ja: "ビジネス", en: "Business", icon: "💼" },
  travel:   { ja: "旅行",     en: "Travel",   icon: "✈️" },
  daily:    { ja: "日常",     en: "Daily Life", icon: "🏠" },
  social:   { ja: "交流",     en: "Social",   icon: "🤝" },
  study:    { ja: "学習",     en: "Study",    icon: "📚" },
};

function toTopicKey(cat: string): string {
  const lower = (cat || "").toLowerCase().replace(/[-\s]+/g, "");
  if (["negotiation","sales","1on1","crossteam","presentation","clientmeeting","performancereview","crisismanagement","partnership","hiring"].includes(lower)) return "business";
  if (["travel","restaurant","shopping","hotel"].includes(lower)) return "travel";
  if (["dailylife","daily"].includes(lower)) return "daily";
  if (["social"].includes(lower)) return "social";
  if (["study"].includes(lower)) return "study";
  return "business";
}

export function buildExpressionsMarkdown(expressions: SavedExpression[], lang: "en" | "ja"): string {
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
  const isJa = lang === "ja";

  const lines: string[] = [
    isJa ? "# Speaq フレーズノート" : "# Speaq Phrase Notebook",
    `_${isJa ? "エクスポート" : "Exported"}: ${today}_`,
    "",
    "---",
    "",
  ];

  const groups: Record<string, SavedExpression[]> = {};
  for (const expr of expressions) {
    const topic = toTopicKey(expr.category);
    if (!groups[topic]) groups[topic] = [];
    groups[topic].push(expr);
  }

  for (const [cat, items] of Object.entries(groups).sort()) {
    const c = CATEGORY_LABEL[cat];
    const label = c ? `${c.icon} ${isJa ? c.ja : c.en}` : cat;
    lines.push(`## ${label} (${items.length})`);
    lines.push("");

    for (const expr of items) {
      const chunk = expr.chunk || expr.natural;
      const reasonLabel = expr.reason ? REASON_LABEL[expr.reason] : null;
      const learnedMark = expr.learned ? "✓" : "○";

      lines.push(`### ${learnedMark} \`${chunk}\``);
      if (reasonLabel) lines.push(`**${isJa ? "種類" : "Type"}**: ${reasonLabel}`);
      if (expr.chunkDetail) lines.push(`**${isJa ? "使いどころ" : "Usage"}**: ${expr.chunkDetail}`);
      if (expr.example) lines.push(`> "${expr.example}"`);
      if (expr.original && expr.original !== expr.natural) {
        lines.push(`${isJa ? "元の表現" : "Original"}: ~~${expr.original}~~ → **${expr.natural}**`);
      }
      if (expr.explanation) lines.push(`${isJa ? "解説" : "Note"}: ${expr.explanation}`);
      lines.push(`_${isJa ? "保存" : "Saved"}: ${new Date(expr.savedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} · ${expr.scenarioTitle}_`);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function buildHistoryMarkdown(history: ScoreRecord[], lang: "en" | "ja"): string {
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
  const isJa = lang === "ja";

  const diffLabel: Record<string, string> = isJa
    ? { beginner: "初級", intermediate: "中級", advanced: "上級" }
    : { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

  const lines: string[] = [
    isJa ? "# Speaq 練習履歴" : "# Speaq Practice History",
    `_${isJa ? "エクスポート" : "Exported"}: ${today}_`,
    "",
    "---",
    "",
  ];

  for (const record of history) {
    const diff = record.difficulty ? diffLabel[record.difficulty] : null;
    const meta = [
      `${isJa ? "ターン" : "Turns"}: ${record.turnCount}`,
      diff,
      record.scenarioCategory,
    ].filter(Boolean).join(" · ");

    lines.push(`## ${record.date} · ${record.scenarioTitle}`);
    lines.push(meta);
    lines.push("");

    if (record.encouragement) {
      lines.push(`> ${record.encouragement}`);
      lines.push("");
    }

    if (record.strengths && record.strengths.length > 0) {
      lines.push(`**${isJa ? "良かった点" : "Strengths"}**`);
      for (const s of record.strengths) lines.push(`- ${s}`);
      lines.push("");
    }

    if (record.improvements && record.improvements.length > 0) {
      lines.push(`**${isJa ? "改善点" : "Improvements"}**`);
      for (const imp of record.improvements) {
        if (typeof imp === "string") {
          lines.push(`- ${imp}`);
        } else {
          if (imp.originalPhrase && imp.improvedPhrase) {
            lines.push(`- ~~${imp.originalPhrase}~~ → **${imp.improvedPhrase}**`);
            if (imp.comment) lines.push(`  ${imp.comment}`);
          } else {
            lines.push(`- ${imp.comment}`);
          }
        }
      }
      lines.push("");
    }

    if (record.naturalChunks && record.naturalChunks.length > 0) {
      lines.push(`**${isJa ? "習得表現" : "Native expressions"}**: ${record.naturalChunks.join(" · ")}`);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

export async function sendToJoplinAPI(
  title: string,
  body: string,
  token: string,
  port = 41184
): Promise<{ success: boolean; noteId?: string; error?: string }> {
  try {
    const res = await fetch(`http://localhost:${port}/notes?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${text}` };
    }
    const data = await res.json();
    return { success: true, noteId: data.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

const JOPLIN_TOKEN_KEY = "speaq_joplin_token";
const JOPLIN_PORT_KEY = "speaq_joplin_port";

export function getJoplinToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(JOPLIN_TOKEN_KEY) ?? "";
}

export function saveJoplinToken(token: string): void {
  localStorage.setItem(JOPLIN_TOKEN_KEY, token);
}

export function getJoplinPort(): number {
  if (typeof window === "undefined") return 41184;
  return parseInt(localStorage.getItem(JOPLIN_PORT_KEY) ?? "41184", 10);
}

export function saveJoplinPort(port: number): void {
  localStorage.setItem(JOPLIN_PORT_KEY, String(port));
}
