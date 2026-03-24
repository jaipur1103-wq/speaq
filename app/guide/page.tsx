"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings, saveSettings } from "@/lib/storage";
import SpeaqLogo from "@/components/SpeaqLogo";
import type { Language } from "@/types";

const STEPS_EN = [
  { number: "1", title: "Build your scenario", description: "Tomorrow's meeting, a client negotiation, any situation. AI instantly generates a realistic scenario for your exact context.", icon: "✨" },
  { number: "2", title: "Speak with AI", description: "Tap the mic and speak in English. Your voice is transcribed automatically. After your session, get honest feedback and natural expressions you can actually use.", icon: "🎙" },
  { number: "3", title: "Make expressions stick", description: "Save key phrases to your Notebook. Quiz yourself with chunk-based practice — say it, self-evaluate, repeat until it's yours.", icon: "📒" },
];

const STEPS_JA = [
  { number: "1", title: "シナリオを作る", description: "明日の会議、取引先との交渉、どんなシーンでも。AIが即座にリアルな練習シナリオを生成します。", icon: "✨" },
  { number: "2", title: "AIと話す", description: "マイクをタップして英語で話すだけ。音声は自動でテキストに変換されます。セッション後は、あなたが本当に使えるようになる表現をフィードバック。採点ではなく、コーチング。", icon: "🎙" },
  { number: "3", title: "表現を定着させる", description: "気になった表現をノートに保存。クイズで繰り返し練習して、自分のものにします。", icon: "📒" },
];

const FEATURES_EN = [
  { icon: "✨", title: "Custom scenarios", desc: "AI generates a scenario for your exact situation" },
  { icon: "🎙", title: "Voice input", desc: "Speak naturally — transcription is automatic" },
  { icon: "💬", title: "Honest feedback", desc: "Coaching, not scoring — real expressions you can use next time" },
  { icon: "📒", title: "Expression notebook", desc: "Save and manage phrases that matter to you" },
  { icon: "🧠", title: "Chunk quiz", desc: "Repeat until key expressions are truly yours" },
  { icon: "⭐", title: "Favorites", desc: "Pin your most-used scenarios for quick access" },
];

const FEATURES_JA = [
  { icon: "✨", title: "カスタムシナリオ", desc: "あなたのシーンに合ったシナリオをAIが即座に生成" },
  { icon: "🎙", title: "音声入力", desc: "話すだけ。文字起こしは自動" },
  { icon: "💬", title: "正直なフィードバック", desc: "採点ではなくコーチング。次に使える表現を提示" },
  { icon: "📒", title: "表現ノート", desc: "気になった表現を保存して管理" },
  { icon: "🧠", title: "クイズで定着", desc: "繰り返し練習して、自分のものにする" },
  { icon: "⭐", title: "お気に入り", desc: "よく使うシナリオをすぐ呼び出せる" },
];

export default function GuidePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(() => getSettings().language ?? "en");

  const toggleLang = () => {
    const newLang: Language = lang === "en" ? "ja" : "en";
    setLang(newLang);
    const s = getSettings();
    saveSettings({ ...s, language: newLang });
  };

  const steps = lang === "ja" ? STEPS_JA : STEPS_EN;
  const features = lang === "ja" ? FEATURES_JA : FEATURES_EN;

  const heroTitle = lang === "ja" ? <>明日使う英語を、<br />今日練習する。</> : <>Practice tomorrow's<br />English, today.</>;
  const heroDesc = lang === "ja"
    ? "知らなかった表現と出会い、使うたびに自分のものになる。"
    : "Meet new expressions. Make them yours.";
  const howItWorksLabel = lang === "ja" ? "使い方" : "How it works";
  const featuresLabel = lang === "ja" ? "機能" : "Features";
  const startBtn = lang === "ja" ? "練習を始める →" : "Start Practicing →";
  const startShort = lang === "ja" ? "始める →" : "Start →";

  return (
    <main style={{ maxWidth: 640, width: "100%", margin: "0 auto", padding: "24px 16px 80px", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
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
            onClick={() => router.push("/")}
            style={{
              padding: "8px 16px", borderRadius: 20,
              background: "var(--accent)", color: "#fff",
              border: "none", fontWeight: 700, fontSize: 13,
              cursor: "pointer",
            }}
          >
            {startShort}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        background: "var(--accent)", borderRadius: 20, padding: "28px 24px",
        marginBottom: 28, textAlign: "center",
      }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 10 }}>
          {heroTitle}
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
          {heroDesc}
        </div>
      </div>

      {/* How it works */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>{howItWorksLabel}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((step) => (
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
        <SectionTitle>{featuresLabel}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {features.map((f) => (
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
        {startBtn}
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
