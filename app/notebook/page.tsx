"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSavedExpressions, toggleLearned, deleteExpression, getSettings, saveSettings } from "@/lib/storage";
import { i18n } from "@/lib/i18n";
import type { Tr } from "@/lib/i18n";
import type { Language, SavedExpression } from "@/types";
import SpeaqLogo from "@/components/SpeaqLogo";

type Filter = "all" | "tolearn" | "learned" | "quiz";

export default function NotebookPage() {
  const router = useRouter();
  const [expressions, setExpressions] = useState<SavedExpression[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Language>(() => getSettings().language ?? "en");

  // Quiz state
  const [quizQueue, setQuizQueue] = useState<SavedExpression[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const tr = i18n[lang];

  useEffect(() => {
    setExpressions(getSavedExpressions());
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleLang = () => {
    const newLang: Language = lang === "en" ? "ja" : "en";
    setLang(newLang);
    const s = getSettings();
    saveSettings({ ...s, language: newLang });
  };

  const handleToggle = (id: string) => {
    toggleLearned(id);
    setExpressions(getSavedExpressions());
  };

  const handleDelete = (id: string) => {
    deleteExpression(id);
    setExpressions(getSavedExpressions());
  };

  const startQuiz = () => {
    const toLearn = expressions.filter((e) => !e.learned);
    if (toLearn.length === 0) return;
    const shuffled = [...toLearn].sort(() => Math.random() - 0.5);
    setQuizQueue(shuffled);
    setQuizIndex(0);
    setQuizRevealed(false);
    setQuizCorrect(0);
    setQuizDone(false);
    setFilter("quiz");
  };

  const handleQuizGotIt = () => {
    const next = quizIndex + 1;
    setQuizCorrect((c) => c + 1);
    if (next >= quizQueue.length) {
      setQuizDone(true);
    } else {
      setQuizIndex(next);
      setQuizRevealed(false);
    }
  };

  const handleQuizNotYet = () => {
    const next = quizIndex + 1;
    if (next >= quizQueue.length) {
      setQuizDone(true);
    } else {
      setQuizIndex(next);
      setQuizRevealed(false);
    }
  };

  const filtered = expressions.filter((e) => {
    if (filter === "tolearn") return !e.learned;
    if (filter === "learned") return e.learned;
    return true;
  });

  const toLearnCount = expressions.filter((e) => !e.learned).length;
  const learnedCount = expressions.filter((e) => e.learned).length;

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
        <NavTab active icon="📒" label={tr.navNotebook} />
        <NavTab onClick={() => router.push("/history")} icon="📊" label={tr.navHistory} />
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <StatCard label={tr.saved} value={expressions.length} />
        <StatCard label={tr.toLearn} value={toLearnCount} color="var(--orange)" />
        <StatCard label={tr.learned} value={learnedCount} color="var(--green)" />
      </div>

      {/* Filter + Quiz tabs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {/* Row 1: All / To Learn / Learned */}
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "tolearn", "learned"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: 20,
                border: filter === f ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                background: filter === f ? "var(--accent-bg)" : "transparent",
                color: filter === f ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: filter === f ? 700 : 400,
                fontSize: 13, cursor: "pointer",
                transition: "all 0.15s",
                textAlign: "center",
              }}
            >
              {f === "all" ? tr.all : f === "tolearn" ? tr.toLearn : tr.learned}
            </button>
          ))}
        </div>
        {/* Row 2: Quiz button */}
        <button
          onClick={toLearnCount > 0 ? startQuiz : undefined}
          style={{
            width: "100%", padding: "10px",
            borderRadius: 12,
            border: filter === "quiz" ? "1.5px solid var(--accent)" : "none",
            background: filter === "quiz" ? "var(--accent-bg)" : toLearnCount > 0 ? "var(--accent)" : "var(--surface2)",
            color: filter === "quiz" ? "var(--accent)" : toLearnCount > 0 ? "#FFFFFF" : "var(--text-muted)",
            fontWeight: 700,
            fontSize: 14, cursor: toLearnCount > 0 ? "pointer" : "not-allowed",
            transition: "all 0.15s",
            boxShadow: toLearnCount > 0 && filter !== "quiz" ? "0 4px 14px rgba(0,102,204,0.25)" : "none",
          }}
        >
          {toLearnCount > 0 ? tr.quizCount(toLearnCount) : tr.quiz}
        </button>
      </div>

      {/* Quiz mode */}
      {filter === "quiz" && (
        <QuizPanel
          queue={quizQueue}
          index={quizIndex}
          revealed={quizRevealed}
          done={quizDone}
          correct={quizCorrect}
          tr={tr}
          onReveal={() => setQuizRevealed(true)}
          onGotIt={handleQuizGotIt}
          onNotYet={handleQuizNotYet}
          onDone={() => setFilter("all")}
          onAgain={startQuiz}
        />
      )}

      {/* Expression list */}
      {filter !== "quiz" && (
        filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "56px 24px",
            color: "var(--text-muted)", background: "var(--surface)",
            borderRadius: 18, boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📒</div>
            <p style={{ fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, fontSize: 15 }}>
              {filter === "all" ? tr.noExpressions : filter === "tolearn" ? tr.toLearn : tr.learned}
            </p>
            {filter === "all" && (
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                {tr.noExpressionsDesc}
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((expr) => (
              <ExpressionCard
                key={expr.id}
                expr={expr}
                tr={tr}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )
      )}
    </main>
  );
}

function QuizPanel({
  queue, index, revealed, done, correct, tr,
  onReveal, onGotIt, onNotYet, onDone, onAgain,
}: {
  queue: SavedExpression[];
  index: number;
  revealed: boolean;
  done: boolean;
  correct: number;
  tr: Tr;
  onReveal: () => void;
  onGotIt: () => void;
  onNotYet: () => void;
  onDone: () => void;
  onAgain: () => void;
}) {
  if (done) {
    const pct = queue.length > 0 ? Math.round((correct / queue.length) * 100) : 0;
    return (
      <div style={{
        background: "var(--surface)", borderRadius: 20, padding: "36px 24px",
        textAlign: "center", boxShadow: "var(--shadow-md)",
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.02em" }}>
          {tr.quizComplete}
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: pct >= 70 ? "var(--green)" : "var(--orange)", marginBottom: 6 }}>
          {tr.quizScore(correct, queue.length)}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 28 }}>
          {tr.notebookNote}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onAgain}
            style={{
              flex: 1, padding: "13px", borderRadius: 12,
              background: "var(--accent)", color: "#FFFFFF",
              border: "none", fontWeight: 700, fontSize: 15,
              cursor: "pointer", boxShadow: "0 4px 14px rgba(0,102,204,0.3)",
            }}
          >
            {tr.quizAgain}
          </button>
          <button
            onClick={onDone}
            style={{
              flex: 1, padding: "13px", borderRadius: 12,
              background: "var(--surface2)", color: "var(--text)",
              border: "1px solid var(--border)", fontWeight: 600, fontSize: 14,
              cursor: "pointer",
            }}
          >
            {tr.backToList}
          </button>
        </div>
      </div>
    );
  }

  if (queue.length === 0) return null;
  const card = queue[index];
  const remaining = queue.length - index;

  return (
    <div className="animate-fade-slide-up" style={{
      background: "var(--surface)", borderRadius: 20, padding: "28px 24px",
      boxShadow: "var(--shadow-md)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Quiz
        </span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
          {remaining}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--surface2)", borderRadius: 2, marginBottom: 24 }}>
        <div style={{
          width: `${((index) / queue.length) * 100}%`,
          height: "100%", background: "var(--accent)", borderRadius: 2, transition: "width 0.3s ease",
        }} />
      </div>

      {/* Card front */}
      <div style={{
        background: "var(--surface2)", borderRadius: 14, padding: "24px",
        textAlign: "center", marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          {card.scenarioTitle}
        </div>
        <div style={{ fontSize: 18, color: "var(--text)", fontWeight: 600, lineHeight: 1.5, marginBottom: revealed ? 20 : 0 }}>
          &ldquo;{card.original}&rdquo;
        </div>

        {revealed && (
          <div className="animate-fade-slide-up" style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
            <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>
              {tr.moreNatural}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
              → {card.natural}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {card.explanation}
            </div>
          </div>
        )}
      </div>

      {!revealed ? (
        <button
          onClick={onReveal}
          style={{
            width: "100%", padding: "13px",
            background: "var(--accent)", color: "#FFFFFF",
            border: "none", borderRadius: 12,
            fontWeight: 700, fontSize: 15, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,102,204,0.3)",
          }}
        >
          {tr.showModelResponse}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onNotYet}
            style={{
              flex: 1, padding: "13px",
              background: "var(--surface2)", color: "var(--text-secondary)",
              border: "1px solid var(--border)", borderRadius: 12,
              fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            {tr.tryAgain}
          </button>
          <button
            onClick={onGotIt}
            style={{
              flex: 1, padding: "13px",
              background: "var(--green)", color: "#FFFFFF",
              border: "none", borderRadius: 12,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(52,199,89,0.3)",
            }}
          >
            {tr.markLearned} ✓
          </button>
        </div>
      )}
    </div>
  );
}

function ExpressionCard({
  expr, tr, onToggle, onDelete,
}: {
  expr: SavedExpression;
  tr: Tr;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const date = new Date(expr.savedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });

  return (
    <div style={{
      background: "var(--surface)",
      border: `1.5px solid ${expr.learned ? "rgba(52,199,89,0.3)" : "transparent"}`,
      borderRadius: 18,
      padding: "16px 18px",
      boxShadow: "var(--shadow-sm)",
      opacity: expr.learned ? 0.75 : 1,
      transition: "opacity 0.2s",
    }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
        <span>{expr.scenarioTitle}</span>
        <span>{date}</span>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, textDecoration: "line-through" }}>
        {expr.original}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.01em" }}>
        → {expr.natural}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
        {expr.explanation}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onToggle(expr.id)}
          style={{
            padding: "6px 14px", borderRadius: 20,
            border: expr.learned ? "1.5px solid var(--green)" : "1px solid var(--border)",
            background: expr.learned ? "rgba(52,199,89,0.12)" : "transparent",
            color: expr.learned ? "var(--green)" : "var(--text-secondary)",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {expr.learned ? `✓ ${tr.learned}` : tr.markLearned}
        </button>
        <button
          onClick={() => onDelete(expr.id)}
          style={{
            padding: "6px 12px", borderRadius: 20,
            border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-muted)",
            fontSize: 12, cursor: "pointer",
          }}
        >
          {tr.deleteBtn}
        </button>
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
