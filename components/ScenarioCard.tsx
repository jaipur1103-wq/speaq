"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2, ChevronRight } from "lucide-react";
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
        boxShadow: "var(--shadow-md)",
        transition: "transform 0.15s, box-shadow 0.15s",
        border: isFavorite ? "1.5px solid rgba(255,149,0,0.35)" : "none",
        cursor: "pointer",
        overflow: "hidden",
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
      {/* Card body */}
      <div style={{ padding: "16px 18px" }}>
        {/* Badges row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", fontWeight: 700 }}>
            {scenario.category}
          </span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: difficultyColor[scenario.difficulty] + "20", color: difficultyColor[scenario.difficulty], fontWeight: 700, textTransform: "capitalize" }}>
            {scenario.difficulty}
          </span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "var(--surface2)", color: "var(--text-muted)", textTransform: "capitalize" }}>
            {scenario.industry}
          </span>
          <ChevronRight size={14} color="var(--text-muted)" style={{ marginLeft: "auto", flexShrink: 0 }} />
        </div>

        {/* Title */}
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 2, letterSpacing: "-0.01em" }}>
          {scenario.title}
        </div>
        {showTranslation && translation && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, lineHeight: 1.4 }}>
            {translation}
          </div>
        )}

        {/* Persona + translate */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {scenario.personaName} · {scenario.personaRole}
          </span>
          <button
            onClick={handleTranslate}
            style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 20,
              border: `1px solid ${showTranslation ? "var(--accent)" : "var(--border)"}`,
              background: showTranslation ? "var(--accent-bg)" : "transparent",
              color: showTranslation ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer", fontWeight: 600,
            }}
          >
            {translating ? tr.translating : showTranslation ? tr.hideTranslation : tr.translate}
          </button>
        </div>
      </div>

      {/* Footer action bar */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "stretch",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleFavorite}
          style={{
            flex: 1, height: 44, border: "none", background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            cursor: "pointer", color: isFavorite ? "#FF9500" : "var(--text-muted)",
            fontSize: 12, fontWeight: isFavorite ? 700 : 500,
            transition: "all 0.15s",
          }}
        >
          <Star
            size={15}
            strokeWidth={2}
            fill={isFavorite ? "#FF9500" : "none"}
            stroke={isFavorite ? "#FF9500" : "currentColor"}
          />
          {isFavorite ? (lang === "ja" ? "お気に入り済み" : "Favorited") : (lang === "ja" ? "お気に入り" : "Favorite")}
        </button>

        {onDelete && (
          <>
            <div style={{ width: 1, background: "var(--border)" }} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(lang === "ja" ? "このシナリオを削除しますか？" : "Delete this scenario?")) onDelete(scenario.id);
              }}
              style={{
                width: 80, height: 44, border: "none", background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                cursor: "pointer", color: "var(--text-muted)",
                fontSize: 12, fontWeight: 500,
                transition: "all 0.15s",
              }}
              aria-label="Delete scenario"
            >
              <Trash2 size={14} strokeWidth={2} />
              {lang === "ja" ? "削除" : "Delete"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
