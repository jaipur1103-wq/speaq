"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Language, Scenario } from "@/types";
import { toggleFavorite } from "@/lib/storage";
import { i18n } from "@/lib/i18n";

interface Props {
  scenario: Scenario;
  onDelete?: (id: string) => void;
  isFavorite?: boolean;
  onFavoriteChange?: () => void;
  lang?: Language;
}

const difficultyColor: Record<string, string> = {
  beginner: "#34C759",
  intermediate: "#FF9500",
  advanced: "#FF3B30",
};

export default function ScenarioCard({ scenario, onDelete, isFavorite, onFavoriteChange, lang = "en" }: Props) {
  const router = useRouter();
  const tr = i18n[lang];
  const [translation, setTranslation] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);

  const handleStart = () => {
    sessionStorage.setItem("current_scenario", JSON.stringify(scenario));
    router.push(`/practice/${scenario.id}`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(scenario.id);
    onFavoriteChange?.();
  };

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showTranslation) { setShowTranslation(false); return; }
    if (translation) { setShowTranslation(true); return; }
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: [scenario.title] }),
      });
      const data = await res.json();
      setTranslation(data.translations?.[0] ?? null);
      setShowTranslation(true);
    } catch { /* silent */ } finally {
      setTranslating(false);
    }
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: 18,
        padding: "16px 18px",
        cursor: "pointer",
        boxShadow: "var(--shadow-md)",
        transition: "transform 0.15s, box-shadow 0.15s",
        border: isFavorite ? "1.5px solid rgba(255,149,0,0.4)" : "none",
      }}
      onClick={handleStart}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* Left: content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", fontWeight: 700 }}>
              {scenario.category}
            </span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: difficultyColor[scenario.difficulty] + "20", color: difficultyColor[scenario.difficulty], fontWeight: 700, textTransform: "capitalize" }}>
              {scenario.difficulty}
            </span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "var(--surface2)", color: "var(--text-muted)", textTransform: "capitalize" }}>
              {scenario.industry}
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 2, letterSpacing: "-0.01em" }}>
            {scenario.title}
          </div>
          {showTranslation && translation && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2, lineHeight: 1.4 }}>
              {translation}
            </div>
          )}
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
            {scenario.personaName} · {scenario.personaRole}
          </div>
          <button
            onClick={handleTranslate}
            style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20,
              border: `1px solid ${showTranslation ? "var(--accent)" : "var(--border)"}`,
              background: showTranslation ? "var(--accent-bg)" : "transparent",
              color: showTranslation ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer", fontWeight: 600,
            }}
          >
            {translating ? tr.translating : showTranslation ? tr.hideTranslation : tr.translate}
          </button>
        </div>

        {/* Right: buttons */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            onClick={handleFavorite}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "4px", opacity: isFavorite ? 1 : 0.3, transition: "opacity 0.15s" }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            ⭐
          </button>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); if (confirm("Delete this scenario?")) onDelete(scenario.id); }}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", borderRadius: 8, fontSize: 16, lineHeight: 1 }}
              aria-label="Delete scenario"
            >
              🗑
            </button>
          )}
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
