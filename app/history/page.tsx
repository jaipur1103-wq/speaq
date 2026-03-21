"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getScoreHistory, getSettings, saveSettings } from "@/lib/storage";
import { i18n } from "@/lib/i18n";
import type { Tr } from "@/lib/i18n";
import type { Language, ScoreRecord } from "@/types";
import SpeaqLogo from "@/components/SpeaqLogo";

export default function HistoryPage() {
  const [history, setHistory] = useState<ScoreRecord[]>([]);
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Language>(() => getSettings().language ?? "en");

  const tr = i18n[lang];

  useEffect(() => {
    setHistory(getScoreHistory());
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleLang = () => {
    const newLang: Language = lang === "en" ? "ja" : "en";
    setLang(newLang);
    const s = getSettings();
    saveSettings({ ...s, language: newLang });
  };

  const avg = history.length
    ? Math.round(history.reduce((a, b) => a + b.overall, 0) / history.length)
    : null;

  const best = history.length
    ? Math.max(...history.map((r) => r.overall))
    : null;

  const scoreColor = (s: number) =>
    s >= 75 ? "var(--green)" : s >= 35 ? "var(--orange)" : "var(--red)";

  const toCEFR = (score: number) => {
    if (score >= 90) return "C2";
    if (score >= 75) return "C1";
    if (score >= 55) return "B2";
    if (score >= 35) return "B1";
    if (score >= 15) return "A2";
    return "A1";
  };

  return (
    <main style={{ maxWidth: 640, width: "100%", margin: "0 auto", padding: "24px 16px 88px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SpeaqLogo />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={toggleLang}
            style={{
              padding: "6px 10px", borderRadius: 20,
              background: "var(--surface)", border: "1px solid var(--border)",
              color: "var(--accent)", fontSize: 12, fontWeight: 700,
              cursor: "pointer", boxShadow: "var(--shadow-sm)",
            }}
          >
            {lang === "en" ? "JA" : "EN"}
          </button>
          <button
            onClick={() => { setDark(!dark); document.documentElement.classList.toggle("dark"); }}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--surface)", border: "none",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-sm)", color: "var(--text-secondary)",
            }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Stats */}
      {history.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <StatCard label={tr.sessions} value={history.length} />
          <StatCard label={tr.avgScore} value={avg ?? 0} color={scoreColor(avg ?? 0)} />
          <StatCard label={tr.best} value={best ?? 0} color={scoreColor(best ?? 0)} />
        </div>
      )}

      {/* History list */}
      {history.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "56px 24px",
          color: "var(--text-muted)", background: "var(--surface)",
          borderRadius: 18, boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
          <p style={{ fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, fontSize: 15 }}>
            {tr.noHistory}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            {tr.noHistoryDesc}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {history.map((record) => (
            <HistoryCard key={record.id} record={record} tr={tr} />
          ))}
        </div>
      )}
    </main>
  );
}

function toCEFR(score: number): string {
  if (score >= 90) return "C2";
  if (score >= 75) return "C1";
  if (score >= 55) return "B2";
  if (score >= 35) return "B1";
  if (score >= 15) return "A2";
  return "A1";
}

function HistoryCard({ record, tr }: { record: ScoreRecord; tr: Tr }) {
  const color = record.overall >= 75 ? "var(--green)" : record.overall >= 35 ? "var(--orange)" : "var(--red)";
  const axes = Object.entries(record.scores) as [string, number][];
  const axisLabel = (key: string) => {
    const map: Record<string, string> = {
      accuracy: tr.accuracy,
      range: tr.range,
      interaction: tr.interaction,
      coherence: tr.coherence,
    };
    return map[key] ?? key;
  };

  return (
    <div style={{
      background: "var(--surface)", borderRadius: 18, padding: "16px 18px",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 3, letterSpacing: "-0.01em" }}>
            {record.scenarioTitle}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {record.date} · {record.turnCount} {record.turnCount !== 1 ? tr.turns : tr.turnSingular}
          </div>
        </div>
        <span style={{
          padding: "4px 12px", borderRadius: 20,
          background: color + "22", color, fontWeight: 700, fontSize: 15,
        }}>
          {toCEFR(record.overall)}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {axes.map(([key, val]) => (
          <div key={key} style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 10,
            background: "var(--surface2)",
            color: "var(--text-secondary)",
          }}>
            <span>{axisLabel(key)}</span>
            <span style={{ fontWeight: 700, marginLeft: 4, color: val >= 75 ? "var(--green)" : val >= 35 ? "var(--orange)" : "var(--red)" }}>
              {toCEFR(val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      flex: 1, background: "var(--surface)",
      borderRadius: 14, padding: "14px 16px", textAlign: "center",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? "var(--text)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}
