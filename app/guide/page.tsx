"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings, saveSettings } from "@/lib/storage";
import SpeaqLogo from "@/components/SpeaqLogo";
import type { Language } from "@/types";

const STEPS_EN = [
  { number: "1", title: "Choose your settings", description: "Select a topic (Business, Travel, Daily Life…), difficulty level, and counterpart style.", icon: "⚙️" },
  { number: "2", title: "Generate a scenario", description: "Tap Generate — AI creates a unique, realistic situation tailored to your settings.", icon: "✨" },
  { number: "3", title: "Speak your response", description: "Tap the mic button and speak in English. No typing needed — your voice is transcribed automatically.", icon: "🎙" },
  { number: "4", title: "Get instant feedback", description: "After each response, receive a score across 4 axes: Clarity, Persuasion, Professionalism, and Strategy.", icon: "📊" },
  { number: "5", title: "Shadow & learn", description: "Tap 'Shadow this' to see a model response and practice repeating it out loud for natural phrasing.", icon: "🔄" },
  { number: "6", title: "Save expressions", description: "Save phrases you want to remember to your Notebook and quiz yourself later.", icon: "📒" },
];

const STEPS_JA = [
  { number: "1", title: "設定を選ぶ", description: "トピック（ビジネス、旅行、日常など）、難易度、相手のスタイルを選択します。", icon: "⚙️" },
  { number: "2", title: "シナリオを生成する", description: "「シナリオを生成」をタップ — AIが設定に合わせたリアルな練習状況を作成します。", icon: "✨" },
  { number: "3", title: "英語で話す", description: "マイクボタンをタップして英語で話してください。入力不要 — 音声が自動でテキストに変換されます。", icon: "🎙" },
  { number: "4", title: "即座にフィードバックを得る", description: "回答後、明瞭さ・説得力・プロ意識・戦略性の4軸でスコアが表示されます。", icon: "📊" },
  { number: "5", title: "シャドーイングで学ぶ", description: "「シャドーイング」をタップして模範回答を確認し、声に出して繰り返し練習しましょう。", icon: "🔄" },
  { number: "6", title: "表現を保存する", description: "覚えたいフレーズをノートに保存して、後でクイズで復習できます。", icon: "📒" },
];

const FEATURES_EN = [
  { icon: "🌍", title: "10+ topics", desc: "Business, Travel, Daily Life, Social, Study" },
  { icon: "📈", title: "3 difficulty levels", desc: "Beginner · Intermediate · Advanced" },
  { icon: "🔊", title: "Voice playback", desc: "Tap any message to hear it read aloud" },
  { icon: "⏱", title: "Timer mode", desc: "30-second countdown to simulate real pressure" },
  { icon: "⭐", title: "Favorites", desc: "Pin your most-used scenarios for quick access" },
  { icon: "📝", title: "Custom scenarios", desc: "Build your own practice situations" },
];

const FEATURES_JA = [
  { icon: "🌍", title: "10以上のトピック", desc: "ビジネス・旅行・日常・交流・学習" },
  { icon: "📈", title: "3段階の難易度", desc: "初級・中級・上級" },
  { icon: "🔊", title: "音声再生", desc: "メッセージをタップして読み上げ" },
  { icon: "⏱", title: "タイマーモード", desc: "30秒カウントダウンで本番さながらの緊張感" },
  { icon: "⭐", title: "お気に入り", desc: "よく使うシナリオをピン留め" },
  { icon: "📝", title: "カスタムシナリオ", desc: "オリジナルの練習シナリオを作成" },
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

  const heroSubtitle = lang === "ja" ? "AIスピーキング練習" : "AI Speaking Practice";
  const heroTitle = lang === "ja" ? <>リアルな会話。<br />リアルなフィードバック。</> : <>Real conversations.<br />Real feedback.</>;
  const heroDesc = lang === "ja"
    ? "いつでも、どこでも、恥ずかしくなく、リアルなシナリオで英語スピーキングを練習できます。"
    : "Practice English speaking in realistic scenarios — anytime, anywhere, without embarrassment.";
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
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          {heroSubtitle}
        </div>
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
