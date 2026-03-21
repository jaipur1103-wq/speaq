"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getScoreHistory, getSettings, saveSettings } from "@/lib/storage";
import { i18n } from "@/lib/i18n";
import type { Tr } from "@/lib/i18n";
import type { Language, ScoreRecord } from "@/types";
import SpeaqLogo from "@/components/SpeaqLogo";

export default function HistoryPage() {
  const router = useRouter();
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
    s >= 70 ? "var(--green)" : s >= 40 ? "var(--orange)" : "var(--red)";

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px", minHeight: "100vh" }}>
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
              cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--surface2)", borderRadius: 14, padding: 4 }}>
        <NavTab onClick={() => router.push("/")} icon="🎙" label={tr.navPractice} />
        <NavTab onClick={() => router.push("/notebook")} icon="📒" label={tr.navNotebook} />
        <NavTab active icon="📊" label={tr.navHistory} />
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

function HistoryCard({ record, tr }: { record: ScoreRecord; tr: Tr }) {
  const color = record.overall >= 70 ? "var(--green)" : record.overall >= 40 ? "var(--orange)" : "var(--red)";
  const axes = Object.entries(record.scores) as [string, number][];
  const axisLabel = (key: string) => {
    const map: Record<string, string> = {
      clarity: tr.clarity,
      persuasion: tr.persuasion,
      professionalism: tr.professionalism,
      strategy: tr.strategy,
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
          {record.overall}
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
            <span style={{ fontWeight: 700, marginLeft: 4, color: val >= 70 ? "var(--green)" : val >= 40 ? "var(--orange)" : "var(--red)" }}>
              {val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavTab({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "10px 0", borderRadius: 11, border: "none",
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--text)" : "var(--text-muted)",
        cursor: "pointer",
        boxShadow: active ? "var(--shadow-sm)" : "none",
        transition: "all 0.15s",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, letterSpacing: "0.01em" }}>{label}</span>
    </button>
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
