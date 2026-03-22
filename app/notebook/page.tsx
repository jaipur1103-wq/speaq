"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getSavedExpressions, markQuizSuccess, deleteExpression, getSettings, saveSettings } from "@/lib/storage";
import { i18n } from "@/lib/i18n";
import type { Tr } from "@/lib/i18n";
import type { Language, SavedExpression } from "@/types";
import SpeaqLogo from "@/components/SpeaqLogo";

type Filter = "all" | "tolearn" | "learned" | "quiz" | "collection";
type QuizItem = import("@/types").SavedExpression & { quizPromptJa: string };

export default function NotebookPage() {
  const [expressions, setExpressions] = useState<SavedExpression[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Language>(() => getSettings().language ?? "en");

  // Quiz state
  const [quizQueue, setQuizQueue] = useState<QuizItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [quizSessionUsed, setQuizSessionUsed] = useState<Set<string>>(new Set());
  const [quizSessionCount, setQuizSessionCount] = useState(0);
  const [quizTranslating, setQuizTranslating] = useState(false);

  const tr = i18n[lang];

  const reload = () => setExpressions(getSavedExpressions());

  useEffect(() => {
    reload();
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleLang = () => {
    const newLang: Language = lang === "en" ? "ja" : "en";
    setLang(newLang);
    saveSettings({ ...getSettings(), language: newLang });
  };

  const handleDelete = (id: string) => {
    deleteExpression(id);
    reload();
  };

  const startQuiz = async () => {
    const toLearn = expressions.filter((e) => !e.learned);
    if (toLearn.length === 0) return;
    const shuffled = [...toLearn].sort(() => Math.random() - 0.5);
    setQuizIndex(0);
    setQuizDone(false);
    setQuizSessionUsed(new Set());
    setQuizSessionCount(0);
    setFilter("quiz");
    setQuizTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: shuffled.map((e) => e.natural) }),
      });
      const data = await res.json();
      const translations: string[] = data.translations ?? [];
      setQuizQueue(shuffled.map((e, i) => ({ ...e, quizPromptJa: translations[i] || e.explanation })));
    } catch {
      setQuizQueue(shuffled.map((e) => ({ ...e, quizPromptJa: e.explanation })));
    } finally {
      setQuizTranslating(false);
    }
  };

  const handleQuizUsed = (id: string) => {
    const counted = markQuizSuccess(id, quizSessionUsed);
    if (counted) {
      setQuizSessionUsed((prev) => new Set(prev).add(id));
      setQuizSessionCount((c) => c + 1);
      reload();
    }
    advanceQuiz();
  };

  const handleQuizNotUsed = () => {
    advanceQuiz();
  };

  const advanceQuiz = () => {
    const next = quizIndex + 1;
    if (next >= quizQueue.length) {
      setQuizDone(true);
    } else {
      setQuizIndex(next);
    }
  };

  const filtered = expressions.filter((e) => {
    if (filter === "tolearn") return !e.learned;
    if (filter === "learned") return e.learned;
    return true;
  });

  const toLearnCount = expressions.filter((e) => !e.learned).length;
  const learnedCount = expressions.filter((e) => e.learned).length;

  // Collection: group by category
  const categoryGroups = expressions.reduce<Record<string, SavedExpression[]>>((acc, e) => {
    const cat = e.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(e);
    return acc;
  }, {});

  return (
    <main style={{ maxWidth: 640, width: "100%", margin: "0 auto", padding: "24px 16px 88px", minHeight: "100vh" }}>
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
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-sm)", color: "var(--text-secondary)",
            }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <StatCard label={tr.saved} value={expressions.length} />
        <StatCard label={tr.toLearn} value={toLearnCount} color="var(--orange)" />
        <StatCard label={tr.totalLearned} value={learnedCount} color="var(--green)" />
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "tolearn", "learned", "collection"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1, padding: "8px 2px", borderRadius: 20,
                border: filter === f ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                background: filter === f ? "var(--accent-bg)" : "transparent",
                color: filter === f ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: filter === f ? 700 : 400,
                fontSize: 12, cursor: "pointer",
                transition: "all 0.15s",
                textAlign: "center",
              }}
            >
              {f === "all" ? tr.all : f === "tolearn" ? tr.toLearn : f === "learned" ? tr.learned : tr.collection}
            </button>
          ))}
        </div>
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
        quizTranslating ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 14 }}>
            ⏳ Preparing quiz...
          </div>
        ) : (
          <QuizPanel
            queue={quizQueue}
            index={quizIndex}
            done={quizDone}
            sessionCount={quizSessionCount}
            totalLearned={learnedCount}
            tr={tr}
            onUsed={handleQuizUsed}
            onNotUsed={handleQuizNotUsed}
            onDone={() => setFilter("all")}
            onAgain={startQuiz}
          />
        )
      )}

      {/* Collection mode */}
      {filter === "collection" && (
        <CollectionView groups={categoryGroups} tr={tr} onDelete={handleDelete} />
      )}

      {/* Expression list */}
      {filter !== "quiz" && filter !== "collection" && (
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
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>{tr.noExpressionsDesc}</p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((expr) => (
              <ExpressionCard
                key={expr.id}
                expr={expr}
                tr={tr}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )
      )}
    </main>
  );
}

// ─── Quiz Panel ───────────────────────────────────────────────

function QuizPanel({
  queue, index, done, sessionCount, totalLearned, tr,
  onUsed, onNotUsed, onDone, onAgain,
}: {
  queue: QuizItem[];
  index: number;
  done: boolean;
  sessionCount: number;
  totalLearned: number;
  tr: Tr;
  onUsed: (id: string) => void;
  onNotUsed: () => void;
  onDone: () => void;
  onAgain: () => void;
}) {
  if (done) {
    return (
      <div style={{
        background: "var(--surface)", borderRadius: 20, padding: "36px 24px",
        textAlign: "center", boxShadow: "var(--shadow-md)",
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.02em" }}>
          {tr.quizComplete}
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
          {tr.quizScore(sessionCount, queue.length)}
        </div>
        <div style={{ fontSize: 14, color: "var(--green)", fontWeight: 700, marginBottom: 4 }}>
          {tr.totalLearned}: {totalLearned}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 28 }}>
          {tr.notebookNote}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onAgain} style={{
            flex: 1, padding: "13px", borderRadius: 12,
            background: "var(--accent)", color: "#FFFFFF",
            border: "none", fontWeight: 700, fontSize: 15,
            cursor: "pointer", boxShadow: "0 4px 14px rgba(0,102,204,0.3)",
          }}>
            {tr.quizAgain}
          </button>
          <button onClick={onDone} style={{
            flex: 1, padding: "13px", borderRadius: 12,
            background: "var(--surface2)", color: "var(--text)",
            border: "1px solid var(--border)", fontWeight: 600, fontSize: 14,
            cursor: "pointer",
          }}>
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
    <QuizCard
      key={`${card.id}-${index}`}
      card={card}
      remaining={remaining}
      total={queue.length}
      index={index}
      tr={tr}
      onUsed={() => onUsed(card.id)}
      onNotUsed={onNotUsed}
    />
  );
}

// ─── Quiz Card (per-expression, self-contained speech) ────────

function QuizCard({
  card, remaining, total, index, tr, onUsed, onNotUsed,
}: {
  card: QuizItem;
  remaining: number;
  total: number;
  index: number;
  tr: Tr;
  onUsed: () => void;
  onNotUsed: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Reset on card change
    setIsRecording(false);
    setTranscription("");
    setAnswerRevealed(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechAPI) { setSpeechSupported(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SpeechAPI() as any;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      setTranscription((finalText + interim).trim());
    };
    rec.onend = () => setIsRecording(false);
    rec.onerror = () => setIsRecording(false);
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch { /* ignore */ } };
  }, [index]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscription("");
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const chunkDisplay = card.chunk || card.natural;

  return (
    <div className="animate-fade-slide-up" style={{
      background: "var(--surface)", borderRadius: 20, padding: "28px 24px",
      boxShadow: "var(--shadow-md)",
    }}>
      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Quiz
        </span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>{remaining}</span>
      </div>
      <div style={{ height: 3, background: "var(--surface2)", borderRadius: 2, marginBottom: 24 }}>
        <div style={{
          width: `${(index / total) * 100}%`,
          height: "100%", background: "var(--accent)", borderRadius: 2, transition: "width 0.3s ease",
        }} />
      </div>

      {/* Scenario label */}
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
        {card.scenarioTitle}
      </div>

      {/* Prompt: Japanese translation of natural expression */}
      <div style={{
        background: "var(--surface2)", borderRadius: 14, padding: "18px 20px",
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>
          {tr.quizSpeakPrompt}
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", lineHeight: 1.6 }}>
          {card.quizPromptJa}
        </div>
      </div>

      {/* Voice input */}
      {!answerRevealed && (
        <div style={{ marginBottom: 16 }}>
          {speechSupported ? (
            <button
              onClick={toggleRecording}
              style={{
                width: "100%", padding: "13px",
                borderRadius: 12,
                background: isRecording ? "#FF3B30" : "var(--surface2)",
                color: isRecording ? "#FFFFFF" : "var(--text)",
                border: isRecording ? "none" : "1px solid var(--border)",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {isRecording ? "🔴 Recording... (tap to stop)" : "🎙 Tap to speak"}
            </button>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "10px 0" }}>
              ⚠️ Speech not supported. Use Chrome.
            </div>
          )}

          {transcription && (
            <div style={{
              marginTop: 10, padding: "12px 16px",
              background: "var(--surface2)", borderRadius: 10,
              fontSize: 14, color: "var(--text)", lineHeight: 1.5,
              border: "1px solid var(--border)",
            }}>
              &ldquo;{transcription}&rdquo;
            </div>
          )}

          <button
            onClick={() => setAnswerRevealed(true)}
            style={{
              width: "100%", marginTop: 10, padding: "13px",
              background: "var(--accent)", color: "#FFFFFF",
              border: "none", borderRadius: 12,
              fontWeight: 700, fontSize: 15, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,102,204,0.3)",
            }}
          >
            {tr.quizShowAnswer}
          </button>
        </div>
      )}

      {/* Answer revealed */}
      {answerRevealed && (
        <div className="animate-fade-slide-up" style={{ marginBottom: 20 }}>
          {transcription && (
            <div style={{
              marginBottom: 14, padding: "12px 16px",
              background: "var(--surface2)", borderRadius: 10,
              fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5,
              border: "1px solid var(--border)",
            }}>
              &ldquo;{transcription}&rdquo;
            </div>
          )}

          <div style={{ background: "var(--surface2)", borderRadius: 14, padding: "18px 20px" }}>
            {/* Model Answer */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>
                {tr.quizModelAnswer}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em", lineHeight: 1.5 }}>
                &ldquo;{card.natural}&rdquo;
              </div>
            </div>

            {/* Key Pattern */}
            {card.chunk && (
              <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>
                  {tr.quizChunk}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>
                  🔑 {card.chunk}
                </div>
              </div>
            )}

            {/* When to use */}
            {card.explanation && (
              <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>
                  {tr.quizUsage}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {card.explanation}
                </div>
              </div>
            )}
          </div>

          {/* Self-evaluate */}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={onNotUsed} style={{
              flex: 1, padding: "13px",
              background: "var(--surface2)", color: "var(--text-secondary)",
              border: "1px solid var(--border)", borderRadius: 12,
              fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>
              {tr.quizNotUsed}
            </button>
            <button onClick={onUsed} style={{
              flex: 1, padding: "13px",
              background: "var(--green)", color: "#FFFFFF",
              border: "none", borderRadius: 12,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(52,199,89,0.3)",
            }}>
              {tr.quizUsed}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Collection View ──────────────────────────────────────────

function CollectionView({
  groups, tr, onDelete,
}: {
  groups: Record<string, SavedExpression[]>;
  tr: Tr;
  onDelete: (id: string) => void;
}) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const cats = Object.keys(groups).sort();

  if (cats.length === 0) {
    return (
      <div style={{
        textAlign: "center", padding: "56px 24px",
        color: "var(--text-muted)", background: "var(--surface)",
        borderRadius: 18, boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>📁</div>
        <p style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: 15 }}>{tr.noExpressions}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {cats.map((cat) => {
        const items = groups[cat];
        const learnedInCat = items.filter((e) => e.learned).length;
        const isExpanded = expandedCats.has(cat);
        return (
          <div key={cat} style={{
            background: "var(--surface)", borderRadius: 18,
            overflow: "hidden", boxShadow: "var(--shadow-sm)",
          }}>
            <button
              onClick={() => toggleCat(cat)}
              style={{
                width: "100%", padding: "16px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "transparent", border: "none", cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                  📁 {cat}
                </div>
                <div style={{ fontSize: 12, color: learnedInCat === items.length ? "var(--green)" : "var(--text-muted)", fontWeight: 600 }}>
                  {tr.learnedBadge(learnedInCat, items.length)}
                </div>
              </div>
              <span style={{ fontSize: 16, color: "var(--text-muted)", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
            </button>

            {isExpanded && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px 12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((expr) => (
                    <ExpressionCard key={expr.id} expr={expr} tr={tr} onDelete={onDelete} compact />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Expression Card ──────────────────────────────────────────

const REASON_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  grammar:     { label: "🔧 文法",       bg: "rgba(255,149,0,0.15)",  color: "#FF9500" },
  collocation: { label: "🔗 コロケーション", bg: "rgba(0,102,204,0.12)", color: "#0066CC" },
  literal:     { label: "🇯🇵 直訳",       bg: "rgba(255,59,48,0.12)",  color: "#FF3B30" },
  "set-phrase":{ label: "💬 定型表現",    bg: "rgba(175,82,222,0.12)", color: "#AF52DE" },
  formality:   { label: "🎯 フォーマリティ", bg: "rgba(0,199,190,0.12)",  color: "#00C7BE" },
  nuance:      { label: "🌀 ニュアンス",   bg: "rgba(142,142,147,0.15)", color: "#8E8E93" },
};

function ExpressionCard({
  expr, tr, onDelete, compact = false,
}: {
  expr: SavedExpression;
  tr: Tr;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const date = new Date(expr.savedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  const chunkDisplay = expr.chunk || expr.natural;
  const badge = expr.reason ? REASON_BADGE[expr.reason] : null;

  return (
    <div style={{
      background: compact ? "var(--surface2)" : "var(--surface)",
      border: `1.5px solid ${expr.learned ? "rgba(52,199,89,0.3)" : "transparent"}`,
      borderRadius: compact ? 12 : 18,
      padding: compact ? "12px 14px" : "16px 18px",
      boxShadow: compact ? "none" : "var(--shadow-sm)",
      opacity: expr.learned ? 0.85 : 1,
    }}>
      {/* Header: scenario + date + learned badge */}
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{expr.scenarioTitle}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {expr.learned && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", background: "rgba(52,199,89,0.12)", padding: "2px 8px", borderRadius: 10 }}>
              ✓ {tr.learned}
            </span>
          )}
          <span>{date}</span>
        </div>
      </div>

      {/* Reason badge */}
      {badge && (
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        </div>
      )}

      {/* Chunk */}
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)", marginBottom: 4, letterSpacing: "-0.01em" }}>
        🔑 {chunkDisplay}
      </div>

      {/* Chunk detail */}
      {expr.chunkDetail && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 6 }}>
          {expr.chunkDetail}
        </div>
      )}

      {/* Example */}
      {expr.example && (
        <div style={{
          fontSize: 13, color: "var(--text)", lineHeight: 1.6,
          fontStyle: "italic", marginBottom: 10,
          padding: "8px 12px", background: compact ? "var(--surface)" : "var(--surface2)", borderRadius: 8,
        }}>
          &ldquo;{expr.example}&rdquo;
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {expr.quizCount > 0 && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
            ✓ ×{expr.quizCount}
          </span>
        )}
        <button
          onClick={() => onDelete(expr.id)}
          style={{
            marginLeft: "auto",
            padding: "5px 12px", borderRadius: 20,
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
