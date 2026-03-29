"use client";

import { useEffect, useState } from "react";
import { getScoreHistory, getSettings, saveSettings, getSavedExpressions, DEFAULT_SETTINGS } from "@/lib/storage";
import type { Language, ScoreRecord } from "@/types";
import SpeaqLogo from "@/components/SpeaqLogo";
import { ChevronDown, ChevronUp } from "lucide-react";

const difficultyColor: Record<string, string> = {
  beginner: "#34C759",
  intermediate: "#FF9500",
  advanced: "#FF3B30",
};

const difficultyLabel: Record<string, Record<string, string>> = {
  en: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
  ja: { beginner: "初級", intermediate: "中級", advanced: "上級" },
};

export default function HistoryPage() {
  const [history, setHistory] = useState<ScoreRecord[]>([]);
  const [expressionCount, setExpressionCount] = useState(0);
  const [lang, setLang] = useState<Language>(DEFAULT_SETTINGS.language);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      const [h, exprs, s] = await Promise.all([
        getScoreHistory(),
        getSavedExpressions(),
        getSettings(),
      ]);
      setHistory(h);
      setExpressionCount(exprs.length);
      setSettings(s);
      setLang(s.language);
    })();
  }, []);

  const toggleLang = () => {
    const newLang: Language = lang === "en" ? "ja" : "en";
    setLang(newLang);
    const newSettings = { ...settings, language: newLang };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const isJa = lang === "ja";

  // Stats
  const totalTurns = history.reduce((s, r) => s + r.turnCount, 0);
  const recentDates = getRecentDays(history, 7);

  return (
    <main style={{ maxWidth: 640, width: "100%", margin: "0 auto", padding: "24px 16px 88px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <SpeaqLogo />
        <button
          onClick={toggleLang}
          style={{
            padding: "6px 12px", borderRadius: 20,
            background: "var(--surface)", border: "1px solid var(--border)",
            color: "var(--accent)", fontSize: 12, fontWeight: 700,
            cursor: "pointer", boxShadow: "var(--shadow-sm)",
          }}
        >
          {lang === "en" ? "JA" : "EN"}
        </button>
      </div>

      {history.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 24px",
          color: "var(--text-muted)", background: "var(--surface)",
          borderRadius: 20, boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #007AFF, #5856D6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>📊</div>
          <p style={{ fontWeight: 700, color: "var(--text)", marginBottom: 8, fontSize: 17 }}>
            {isJa ? "履歴がありません" : "No history yet"}
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>
            {isJa ? "練習セッションを完了すると履歴が表示されます。" : "Complete a practice session to see your history here."}
          </p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <StatPill value={history.length} label={isJa ? "セッション" : "Sessions"} />
            <StatPill value={totalTurns} label={isJa ? "総ターン" : "Total turns"} />
            <StatPill value={expressionCount} label={isJa ? "保存表現" : "Expressions"} />
            <StatPill value={recentDates.filter(Boolean).length} label={isJa ? "直近7日" : "Last 7 days"} />
          </div>


          {/* Section label */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 10 }}>
            {isJa ? "セッション履歴" : "Session History"}
          </div>

          {/* History list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((record) => (
              <HistoryCard key={record.id} record={record} isJa={isJa} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function HistoryCard({ record, isJa }: { record: ScoreRecord; isJa: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const hasDetail = !!(
    (record.strengths && record.strengths.length > 0) ||
    (record.improvements && record.improvements.length > 0) ||
    (record.naturalChunks && record.naturalChunks.length > 0)
  );
  const diffColor = record.difficulty ? difficultyColor[record.difficulty] : "var(--text-muted)";
  const diffLabel = record.difficulty ? (difficultyLabel[isJa ? "ja" : "en"][record.difficulty] ?? record.difficulty) : null;

  return (
    <div style={{
      background: "var(--surface)", borderRadius: 18,
      boxShadow: "var(--shadow-sm)", overflow: "hidden",
      borderLeft: `4px solid ${diffColor}`,
    }}>
      {/* Main row */}
      <div
        style={{ padding: "14px 16px", cursor: hasDetail ? "pointer" : "default" }}
        onClick={() => hasDetail && setExpanded((v) => !v)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
              {record.scenarioCategory && (
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", fontWeight: 700 }}>
                  {record.scenarioCategory}
                </span>
              )}
              {diffLabel && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: diffColor + "20", color: diffColor, fontWeight: 700 }}>
                  {diffLabel}
                </span>
              )}
              {record.expressionCount != null && record.expressionCount > 0 && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "var(--surface2)", color: "var(--text-muted)", fontWeight: 600 }}>
                  📒 {record.expressionCount}
                </span>
              )}
            </div>
            {/* Title */}
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 3, letterSpacing: "-0.01em" }}>
              {record.scenarioTitle}
            </div>
            {/* Meta */}
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {record.date} · {record.turnCount} {isJa ? "ターン" : record.turnCount !== 1 ? "turns" : "turn"}
            </div>
          </div>
          {hasDetail && (
            <div style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          )}
        </div>

      </div>

      {/* Expanded detail */}
      {expanded && hasDetail && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px" }}>
          {record.strengths && record.strengths.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#34C759", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                {isJa ? "✓ 良かった点" : "✓ Strengths"}
              </div>
              {record.strengths.map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 4, paddingLeft: 10, borderLeft: "2px solid #34C759" }}>
                  {s}
                </div>
              ))}
            </div>
          )}

          {record.improvements && record.improvements.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                {isJa ? "→ 改善点" : "→ Improvements"}
              </div>
              {record.improvements.map((imp, i) => {
                const hasPhrasePair = typeof imp !== "string" && imp.originalPhrase && imp.improvedPhrase;
                return (
                  <div key={i} style={{ marginBottom: 10, paddingLeft: 10, borderLeft: "2px solid var(--accent)" }}>
                    {hasPhrasePair && (
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>
                        <span style={{ color: "var(--text-muted)", textDecoration: "line-through" }}>
                          {(imp as { originalPhrase: string }).originalPhrase}
                        </span>
                        <span style={{ color: "var(--text-muted)", margin: "0 6px" }}>→</span>
                        <span style={{ color: "var(--accent)" }}>
                          {(imp as { improvedPhrase: string }).improvedPhrase}
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      {typeof imp === "string" ? imp : imp.comment}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {record.naturalChunks && record.naturalChunks.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                {isJa ? "💬 ネイティブの言い回し" : "💬 Native expressions"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {record.naturalChunks.map((chunk, i) => (
                  <span key={i} style={{
                    fontSize: 12, fontWeight: 600,
                    padding: "4px 10px", borderRadius: 20,
                    background: "var(--surface2)", color: "var(--text)",
                  }}>
                    {chunk}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <div style={{
      flex: 1, background: "var(--surface)", borderRadius: 14,
      padding: "12px 14px", boxShadow: "var(--shadow-sm)", textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

function getRecentDays(history: ScoreRecord[], days: number): boolean[] {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const dateStr = d.toISOString().slice(0, 10);
    return history.some((r) => r.date === dateStr);
  });
}

