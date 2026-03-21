"use client";

import { useRouter } from "next/navigation";
import type { Scenario } from "@/types";
import { toggleFavorite } from "@/lib/storage";

interface Props {
  scenario: Scenario;
  onDelete?: (id: string) => void;
  isFavorite?: boolean;
  onFavoriteChange?: () => void;
}

const difficultyColor: Record<string, string> = {
  beginner: "#34C759",
  intermediate: "#FF9500",
  advanced: "#FF3B30",
};

export default function ScenarioCard({ scenario, onDelete, isFavorite, onFavoriteChange }: Props) {
  const router = useRouter();

  const handleStart = () => {
    sessionStorage.setItem("current_scenario", JSON.stringify(scenario));
    router.push(`/practice/${scenario.id}`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(scenario.id);
    onFavoriteChange?.();
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: 18,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--text-muted)",
              fontWeight: 700,
            }}
          >
            {scenario.category}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              background: difficultyColor[scenario.difficulty] + "20",
              color: difficultyColor[scenario.difficulty],
              fontWeight: 700,
              textTransform: "capitalize",
            }}
          >
            {scenario.difficulty}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              background: "var(--surface2)",
              color: "var(--text-muted)",
              textTransform: "capitalize",
            }}
          >
            {scenario.industry}
          </span>
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: "var(--text)",
            marginBottom: 4,
            letterSpacing: "-0.01em",
          }}
        >
          {scenario.title}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
          {scenario.personaName} · {scenario.personaRole}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={handleFavorite}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            padding: "4px",
            opacity: isFavorite ? 1 : 0.3,
            transition: "opacity 0.15s",
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          ⭐
        </button>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this scenario?")) onDelete(scenario.id);
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "4px",
              borderRadius: 8,
              fontSize: 16,
              lineHeight: 1,
            }}
            aria-label="Delete scenario"
          >
            🗑
          </button>
        )}
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "var(--surface2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
