"use client";

import { type AppSettings, type Difficulty, type Industry, type PersonaStyle } from "@/types";

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
}

const difficulties: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
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

const personas: { value: PersonaStyle; label: string; emoji: string }[] = [
  { value: "friendly", label: "Friendly", emoji: "😊" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "skeptical", label: "Skeptical", emoji: "🤨" },
  { value: "tough", label: "Tough", emoji: "😤" },
  { value: "enthusiastic", label: "Enthusiastic", emoji: "🚀" },
];

export default function SettingsBar({ settings, onChange }: Props) {
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        flexWrap: "wrap",
        gap: 14,
        alignItems: "center",
        boxShadow: "var(--shadow-sm)",
      }}
    >
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

      <Divider />

      <Group label="Counterpart">
        {personas.map((p) => (
          <Chip
            key={p.value}
            active={settings.personaStyle === p.value}
            onClick={() => set("personaStyle", p.value)}
            title={p.label}
          >
            {p.emoji}
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
      <div style={{ display: "flex", gap: 4 }}>{children}</div>
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
