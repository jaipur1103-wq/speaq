"use client";

import { useRouter } from "next/navigation";
import SpeaqLogo from "@/components/SpeaqLogo";

const STEPS = [
  {
    number: "1",
    title: "Choose your settings",
    description: "Select a topic (Business, Travel, Daily Life…), difficulty level, and counterpart style.",
    icon: "⚙️",
  },
  {
    number: "2",
    title: "Generate a scenario",
    description: "Tap Generate — AI creates a unique, realistic situation tailored to your settings.",
    icon: "✨",
  },
  {
    number: "3",
    title: "Speak your response",
    description: "Tap the mic button and speak in English. No typing needed — your voice is transcribed automatically.",
    icon: "🎙",
  },
  {
    number: "4",
    title: "Get instant feedback",
    description: "After each response, receive a score across 4 axes: Clarity, Persuasion, Professionalism, and Strategy.",
    icon: "📊",
  },
  {
    number: "5",
    title: "Shadow & learn",
    description: "Tap 'Shadow this' to see a model response and practice repeating it out loud for natural phrasing.",
    icon: "🔄",
  },
  {
    number: "6",
    title: "Save expressions",
    description: "Save phrases you want to remember to your Notebook and quiz yourself later.",
    icon: "📒",
  },
];

const FEATURES = [
  { icon: "🌍", title: "10+ topics", desc: "Business, Travel, Daily Life, Social, Study" },
  { icon: "📈", title: "3 difficulty levels", desc: "Beginner · Intermediate · Advanced" },
  { icon: "🔊", title: "Voice playback", desc: "Tap any message to hear it read aloud" },
  { icon: "⏱", title: "Timer mode", desc: "30-second countdown to simulate real pressure" },
  { icon: "⭐", title: "Favorites", desc: "Pin your most-used scenarios for quick access" },
  { icon: "📝", title: "Custom scenarios", desc: "Build your own practice situations" },
];

export default function GuidePage() {
  const router = useRouter();

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <SpeaqLogo />
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "8px 16px", borderRadius: 20,
            background: "var(--accent)", color: "#fff",
            border: "none", fontWeight: 700, fontSize: 13,
            cursor: "pointer",
          }}
        >
          Start →
        </button>
      </div>

      {/* Hero */}
      <div style={{
        background: "var(--accent)", borderRadius: 20, padding: "28px 24px",
        marginBottom: 28, textAlign: "center",
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          AI Speaking Practice
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 10 }}>
          Real conversations.<br />Real feedback.
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
          Practice English speaking in realistic scenarios — anytime, anywhere, without embarrassment.
        </div>
      </div>

      {/* How it works */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>How it works</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {STEPS.map((step) => (
            <div key={step.number} style={{
              background: "var(--surface)", borderRadius: 16, padding: "16px 18px",
              display: "flex", gap: 14, alignItems: "flex-start",
              boxShadow: "var(--shadow-sm)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--accent-bg)", color: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 14, flexShrink: 0,
              }}>
                {step.number}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 3 }}>
                  {step.icon} {step.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Features</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              background: "var(--surface)", borderRadius: 16, padding: "14px 16px",
              boxShadow: "var(--shadow-sm)",
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 3 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push("/")}
        style={{
          width: "100%", padding: "16px",
          borderRadius: 16, background: "var(--accent)", color: "#fff",
          border: "none", fontWeight: 800, fontSize: 16,
          cursor: "pointer", letterSpacing: "-0.01em",
          boxShadow: "0 4px 14px rgba(0,102,204,0.35)",
        }}
      >
        Start Practicing →
      </button>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.07em", color: "var(--text-muted)",
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}
