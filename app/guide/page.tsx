"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings, saveSettings } from "@/lib/storage";
import SpeaqLogo from "@/components/SpeaqLogo";
import type { Language } from "@/types";

const CONTENT = {
  en: {
    langToggle: "JA",
    startBtn: "Start Practicing",
    hero: {
      eyebrow: "English Speaking Practice",
      title: "Speak more.\nSound like yourself.",
      sub: "AI-powered practice built for the moment you freeze up.",
    },
    problem: {
      eyebrow: "The problem",
      title: "You know English.\nYou just can't use it.",
      items: [
        "Your vocabulary is fine. But the words don't come.",
        "You practiced. Yet the same simple phrases keep coming out.",
        "The gap between knowing and using never closes — until now.",
      ],
    },
    how: {
      eyebrow: "How it works",
      steps: [
        {
          num: "01",
          title: "Your scene,\ninstantly.",
          desc: "Describe any real situation. Speaq builds a full conversation scenario around it in seconds.",
        },
        {
          num: "02",
          title: "Speak.\nGet real feedback.",
          desc: "Use your voice. After each session, see exactly how a native speaker would have said it.",
        },
        {
          num: "03",
          title: "Save it.\nOwn it.",
          desc: "Add expressions to your Notebook. Quiz yourself until they come out without thinking.",
        },
      ],
    },
    loop: {
      eyebrow: "The Speaq loop",
      title: "Speak. Notice.\nOwn it.",
      sub: "Practice, feedback, and retention in one seamless loop.",
    },
  },
  ja: {
    langToggle: "EN",
    startBtn: "練習を始める",
    hero: {
      eyebrow: "英語スピーキング練習",
      title: "話すたびに、\n自分の英語になる。",
      sub: "「あのとき言えなかった」をなくすための、AIスピーキング練習。",
    },
    problem: {
      eyebrow: "こんな経験ありませんか",
      title: "英語はわかる。\nでも、使えない。",
      items: [
        "単語は知っている。でも、いざとなると出てこない。",
        "練習した。なのに、同じ表現しか口から出ない。",
        "「知っている英語」と「使える英語」の差が、ずっと埋まらない。",
      ],
    },
    how: {
      eyebrow: "使い方",
      steps: [
        {
          num: "01",
          title: "あなたの場面を、\nすぐに再現。",
          desc: "どんな状況でも大丈夫。AIが即座にリアルなシナリオを生成します。",
        },
        {
          num: "02",
          title: "話す。\nリアルなフィードバック。",
          desc: "マイクで話すだけ。セッション後、ネイティブならどう言うかがわかります。",
        },
        {
          num: "03",
          title: "保存して、\n自分のものにする。",
          desc: "気になった表現はノートに保存。クイズで繰り返して、咄嗟に出てくるまで鍛えます。",
        },
      ],
    },
    loop: {
      eyebrow: "Speaqのループ",
      title: "話して、気づいて、\n定着する。",
      sub: "練習・フィードバック・定着が、一つのループになっている。",
    },
  },
};

export default function GuidePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(() => getSettings().language ?? "en");

  const toggleLang = () => {
    const next: Language = lang === "en" ? "ja" : "en";
    setLang(next);
    saveSettings({ ...getSettings(), language: next });
  };

  const c = CONTENT[lang];

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gu-fade { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .gu-fade-1 { animation-delay: 0.05s; }
        .gu-fade-2 { animation-delay: 0.15s; }
        .gu-fade-3 { animation-delay: 0.25s; }
      `}</style>

      <main style={{
        maxWidth: 600,
        width: "100%",
        margin: "0 auto",
        minHeight: "100vh",
        background: "var(--bg)",
        paddingBottom: 120,
      }}>

        {/* ── Nav ── */}
        <nav style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(245,245,247,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}>
          <SpeaqLogo />
          <button
            onClick={toggleLang}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              background: "transparent",
              border: "1.5px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            {c.langToggle}
          </button>
        </nav>

        {/* ── Hero ── */}
        <section style={{ padding: "56px 24px 72px" }}>
          <div className="gu-fade gu-fade-1" style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 20,
          }}>
            {c.hero.eyebrow}
          </div>
          <h1 className="gu-fade gu-fade-2" style={{
            fontSize: "clamp(36px, 9vw, 52px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "var(--text)",
            margin: 0,
            marginBottom: 24,
            whiteSpace: "pre-line",
            wordBreak: "auto-phrase",
          } as React.CSSProperties}>
            {c.hero.title}
          </h1>
          <p className="gu-fade gu-fade-3" style={{
            fontSize: 17,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 380,
            fontWeight: 400,
          }}>
            {c.hero.sub}
          </p>
        </section>

        {/* ── Divider ── */}
        <Divider />

        {/* ── Problem ── */}
        <section style={{ padding: "72px 24px" }}>
          <Eyebrow>{c.problem.eyebrow}</Eyebrow>
          <h2 style={{
            fontSize: "clamp(28px, 7vw, 40px)",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
            color: "var(--text)",
            margin: "16px 0 40px",
            whiteSpace: "pre-line",
            wordBreak: "auto-phrase",
          } as React.CSSProperties}>
            {c.problem.title}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {c.problem.items.map((text, i) => (
              <div
                key={i}
                style={{
                  padding: "20px 0",
                  borderBottom: i < c.problem.items.length - 1
                    ? "1px solid var(--border)"
                    : "none",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 16,
                }}
              >
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  letterSpacing: "0.04em",
                  flexShrink: 0,
                  minWidth: 20,
                }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{
                  fontSize: 16,
                  color: "var(--text)",
                  lineHeight: 1.6,
                  fontWeight: 400,
                  wordBreak: "auto-phrase",
                } as React.CSSProperties}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Divider ── */}
        <Divider />

        {/* ── How it works ── */}
        <section style={{ padding: "72px 24px" }}>
          <Eyebrow>{c.how.eyebrow}</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 40 }}>
            {c.how.steps.map((step, i) => (
              <div
                key={step.num}
                style={{
                  padding: "32px 0",
                  borderBottom: i < c.how.steps.length - 1
                    ? "1px solid var(--border)"
                    : "none",
                }}
              >
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                  marginBottom: 16,
                }}>
                  {step.num}
                </div>
                <h3 style={{
                  fontSize: "clamp(22px, 5.5vw, 30px)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                  color: "var(--text)",
                  margin: "0 0 14px",
                  whiteSpace: "pre-line",
                  wordBreak: "auto-phrase",
                } as React.CSSProperties}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: 15,
                  color: "var(--text-secondary)",
                  lineHeight: 1.65,
                  margin: 0,
                  maxWidth: 400,
                }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Divider ── */}
        <Divider />

        {/* ── Loop statement ── */}
        <section style={{ padding: "72px 24px 80px", textAlign: "center" }}>
          <Eyebrow center>{c.loop.eyebrow}</Eyebrow>
          <h2 style={{
            fontSize: "clamp(32px, 8vw, 46px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.12,
            color: "var(--text)",
            margin: "16px 0 20px",
            whiteSpace: "pre-line",
            wordBreak: "auto-phrase",
          } as React.CSSProperties}>
            {c.loop.title}
          </h2>
          <p style={{
            fontSize: 15,
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: 0,
            maxWidth: 320,
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            {c.loop.sub}
          </p>
        </section>

      </main>

      {/* ── Sticky CTA ── */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "16px 24px 36px",
        background: "rgba(245,245,247,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid var(--border)",
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
      }}>
        <button
          onClick={() => router.push("/")}
          style={{
            width: "100%",
            maxWidth: 552,
            padding: "16px 24px",
            borderRadius: 14,
            background: "var(--text)",
            color: "var(--bg)",
            border: "none",
            fontWeight: 600,
            fontSize: 17,
            cursor: "pointer",
            letterSpacing: "-0.01em",
          }}
        >
          {c.startBtn}
        </button>
      </div>
    </>
  );
}

function Divider() {
  return (
    <div style={{
      height: 1,
      background: "var(--border)",
      margin: "0 24px",
    }} />
  );
}

function Eyebrow({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      textAlign: center ? "center" : "left",
    }}>
      {children}
    </div>
  );
}
