"use client";

import { type AppSettings, type Difficulty, type Industry, type PersonaStyle, type Topic } from "@/types";

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
}

const difficulties: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const topics: { value: Topic; label: string }[] = [
  { value: "business", label: "Business" },
  { value: "travel", label: "Travel" },
  { value: "daily", label: "Daily Life" },
  { value: "social", label: "Social" },
  { value: "study", label: "Study" },
];

const industries: { value: Industry; label: string }[] = [
  { value: "general", label: "General" },
  { value: "technology", label: "Tech" },
  { value: "finance", label: "Finance" },
  { value: "consulting", label: "Consulting" },
  { value: "healthcare", label: "Healthcare" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
];

const personas: { value: PersonaStyle; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "neutral", label: "Neutral" },
  { value: "tough", label: "Tough" },
];

export default function SettingsBar({ settings, onChange }: Props) {
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: 16,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Row 1: Topic — 1行スクロール */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
          Topic
        </span>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", flexWrap: "nowrap", scrollbarWidth: "none" }}>
          {topics.map((t) => (
            <Chip key={t.value} active={settings.topic === t.value} onClick={() => set("topic", t.value)}>
              {t.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Row 2: Difficulty / Industry / Counterpart / Timer */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Group label="Difficulty">
          {difficulties.map((d) => (
            <Chip
              key={d.value}
              active={settings.difficulty === d.value}
              onClick={() => set("difficulty", d.value)}
            >
              {d.label}
            </Chip>
          ))}
        </Group>

        {settings.topic === "business" && (
          <>
            <Divider />
            <Group label="Industry">
              <select
                value={settings.industry}
                onChange={(e) => set("industry", e.target.value as Industry)}
                style={{
                  background: "var(--surface2)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "4px 10px",
                  fontSize: 13,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {industries.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </Group>
          </>
        )}

        <Divider />

        <Group label="Counterpart">
          {personas.map((p) => (
            <Chip
              key={p.value}
              active={settings.personaStyle === p.value}
              onClick={() => set("personaStyle", p.value)}
            >
              {p.label}
            </Chip>
          ))}
        </Group>

        <Divider />

        <Group label="Timer">
          <button
            onClick={() => set("timerEnabled", !settings.timerEnabled)}
            title={settings.timerEnabled ? "Timer ON — 30s countdown" : "Timer OFF"}
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              border: settings.timerEnabled ? "1.5px solid var(--accent)" : "1px solid var(--border)",
              background: settings.timerEnabled ? "var(--accent-bg)" : "transparent",
              color: settings.timerEnabled ? "var(--accent)" : "var(--text-secondary)",
              fontSize: 13,
              fontWeight: settings.timerEnabled ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {settings.timerEnabled ? "⏱ ON" : "⏱ OFF"}
          </button>
        </Group>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 24,
        background: "var(--border)",
        flexShrink: 0,
      }}
    />
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: "4px 11px",
        borderRadius: 20,
        border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        background: active ? "var(--accent-bg)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}
