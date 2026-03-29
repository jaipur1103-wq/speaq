"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getSavedExpressions, markQuizSuccess, getSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/db";
import { i18n } from "@/lib/i18n";
import type { Language, SavedExpression } from "@/types";
import SpeaqLogo from "@/components/SpeaqLogo";

type QuizMode = "today" | "all" | "weak";
type QuizPhase = "select" | "loading" | "quiz" | "result";
type QuizItem = SavedExpression & { quizPromptJa: string };

export default function QuizPage() {
  const [expressions, setExpressions] = useState<SavedExpression[]>([]);
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Language>(DEFAULT_SETTINGS.language);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [phase, setPhase] = useState<QuizPhase>("select");
  const [mode, setMode] = useState<QuizMode>("today");
  const [quizQueue, setQuizQueue] = useState<QuizItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSessionUsed, setQuizSessionUsed] = useState<Set<string>>(new Set());
  const [quizSessionCount, setQuizSessionCount] = useState(0);

  const tr = i18n[lang];

  useEffect(() => {
    (async () => {
      const [exprs, s] = await Promise.all([getSavedExpressions(), getSettings()]);
      setExpressions(exprs);
      setSettings(s);
      setLang(s.language);
    })();
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleLang = () => {
    const newLang: Language = lang === "en" ? "ja" : "en";
    setLang(newLang);
    const newSettings = { ...settings, language: newLang };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const toLearnCount = expressions.filter((e) => !e.learned && new Date(e.savedAt).toISOString().slice(0, 10) === todayStr).length;
  const learnedCount = expressions.filter((e) => e.learned).length;
  const weakCount = expressions.filter((e) => e.quizCount === 0).length;
  const masteryPct = expressions.length > 0 ? Math.round((learnedCount / expressions.length) * 100) : 0;

  const getQueueForMode = (m: QuizMode): SavedExpression[] => {
    if (m === "today") {
      const todayStr = new Date().toISOString().slice(0, 10);
      return expressions
        .filter((e) => !e.learned && new Date(e.savedAt).toISOString().slice(0, 10) === todayStr)
        .sort(() => Math.random() - 0.5);
    }
    if (m === "all") return [...expressions].sort(() => Math.random() - 0.5);
    // weak: quizCount === 0 first, then rest unlearned
    const neverRecalled = expressions.filter((e) => e.quizCount === 0).sort(() => Math.random() - 0.5);
    const rest = expressions.filter((e) => e.quizCount > 0 && !e.learned).sort(() => Math.random() - 0.5);
    return [...neverRecalled, ...rest];
  };

  const startQuiz = async (m: QuizMode) => {
    const pool = getQueueForMode(m);
    if (pool.length === 0) return;
    setMode(m);
    setPhase("loading");
    setQuizIndex(0);
    setQuizSessionUsed(new Set());
    setQuizSessionCount(0);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: pool.map((e) => e.natural) }),
      });
      const data = await res.json();
      const translations: string[] = data.translations ?? [];
      setQuizQueue(pool.map((e, i) => ({ ...e, quizPromptJa: translations[i] || e.explanation })));
    } catch {
      setQuizQueue(pool.map((e) => ({ ...e, quizPromptJa: e.explanation })));
    }
    setPhase("quiz");
  };

  const handleQuizUsed = async (id: string) => {
    const counted = await markQuizSuccess(id, quizSessionUsed);
    if (counted) {
      setQuizSessionUsed((prev) => new Set(prev).add(id));
      setQuizSessionCount((c) => c + 1);
      setExpressions(await getSavedExpressions());
    }
    advance();
  };

  const handleQuizNotUsed = () => advance();

  const advance = () => {
    const next = quizIndex + 1;
    if (next >= quizQueue.length) {
      setPhase("result");
    } else {
      setQuizIndex(next);
    }
  };

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
          >{lang === "en" ? "JA" : "EN"}</button>
          <button
            onClick={() => { setDark(!dark); document.documentElement.classList.toggle("dark"); }}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--surface)", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-sm)", color: "var(--text-secondary)",
            }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {phase === "select" && (
        <SelectScreen
          tr={tr}
          total={expressions.length}
          toLearnCount={toLearnCount}
          learnedCount={learnedCount}
          weakCount={weakCount}
          masteryPct={masteryPct}
          onStart={startQuiz}
        />
      )}

      {phase === "loading" && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 14 }}>
          ⏳ {lang === "ja" ? "準備中..." : "Preparing..."}
        </div>
      )}

      {phase === "quiz" && quizQueue.length > 0 && (
        <QuizCard
          key={`${quizQueue[quizIndex].id}-${quizIndex}`}
          card={quizQueue[quizIndex]}
          index={quizIndex}
          total={quizQueue.length}
          tr={tr}
          onUsed={() => handleQuizUsed(quizQueue[quizIndex].id)}
          onNotUsed={handleQuizNotUsed}
        />
      )}

      {phase === "result" && (
        <ResultScreen
          queue={quizQueue}
          sessionCount={quizSessionCount}
          sessionUsed={quizSessionUsed}
          learnedCount={expressions.filter((e) => e.learned).length}
          tr={tr}
          onAgain={() => startQuiz(mode)}
          onBack={() => setPhase("select")}
        />
      )}
    </main>
  );
}

// ─── Select Screen ────────────────────────────────────────────

function SelectScreen({
  tr, total, toLearnCount, learnedCount, weakCount, masteryPct, onStart,
}: {
  tr: typeof i18n.en | typeof i18n.ja;
  total: number;
  toLearnCount: number;
  learnedCount: number;
  weakCount: number;
  masteryPct: number;
  onStart: (mode: QuizMode) => void;
}) {
  const modes: { key: QuizMode; label: string; desc: string; count: number; color: string }[] = [
    { key: "today", label: tr.quizModeToday, desc: tr.quizModeTodayDesc(toLearnCount), count: toLearnCount, color: "var(--accent)" },
    { key: "all", label: tr.quizModeAll, desc: tr.quizModeAllDesc(total), count: total, color: "var(--orange)" },
    { key: "weak", label: tr.quizModeWeak, desc: tr.quizModeWeakDesc(weakCount), count: weakCount, color: "#FF3B30" },
  ];

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <StatCard label={tr.saved} value={total} />
        <StatCard label={tr.toLearn} value={toLearnCount} color="var(--orange)" />
        <StatCard label={tr.learned} value={learnedCount} color="var(--green)" />
      </div>

      {/* Mastery bar */}
      <div style={{
        background: "var(--surface)", borderRadius: 14, padding: "14px 18px",
        marginBottom: 24, boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{tr.masteryRate}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>{masteryPct}%</span>
        </div>
        <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3 }}>
          <div style={{ width: `${masteryPct}%`, height: "100%", background: "var(--green)", borderRadius: 3, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* Mode cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {modes.map(({ key, label, desc, count, color }) => (
          <button
            key={key}
            onClick={() => count > 0 ? onStart(key) : undefined}
            disabled={count === 0}
            style={{
              width: "100%", padding: "18px 20px",
              background: "var(--surface)", borderRadius: 18,
              border: `1.5px solid ${count > 0 ? "var(--border)" : "var(--border)"}`,
              boxShadow: count > 0 ? "var(--shadow-sm)" : "none",
              cursor: count > 0 ? "pointer" : "not-allowed",
              opacity: count === 0 ? 0.5 : 1,
              textAlign: "left",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</div>
            </div>
            <div style={{
              minWidth: 40, height: 40, borderRadius: "50%",
              background: count > 0 ? color : "var(--surface2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: count > 0 ? "#fff" : "var(--text-muted)",
              fontSize: 14, fontWeight: 700,
            }}>
              {count}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Quiz Card ─────────────────────────────────────────────────

function QuizCard({
  card, index, total, tr, onUsed, onNotUsed,
}: {
  card: QuizItem;
  index: number;
  total: number;
  tr: typeof i18n.en | typeof i18n.ja;
  onUsed: () => void;
  onNotUsed: () => void;
}) {
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setAnswerRevealed(false);
    setTranscription("");
    setIsRecording(false);
    setIsTranscribing(false);
    if (!navigator.mediaDevices?.getUserMedia) setSpeechSupported(false);
    return () => { mediaRecorderRef.current?.stop(); };
  }, [index]);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
        const recorder = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const ext = mimeType.includes("webm") ? "webm" : "mp4";
          const file = new File([blob], `recording.${ext}`, { type: mimeType });
          setIsTranscribing(true);
          try {
            const fd = new FormData();
            fd.append("audio", file);
            const res = await fetch("/api/transcribe", { method: "POST", body: fd });
            const data = await res.json();
            setTranscription(data.text?.trim() ?? "");
          } catch { /* silent */ } finally {
            setIsTranscribing(false);
          }
        };
        mediaRecorderRef.current = recorder;
        setTranscription("");
        recorder.start();
        setIsRecording(true);
      } catch {
        setSpeechSupported(false);
      }
    }
  };

  return (
    <div style={{
      background: "var(--surface)", borderRadius: 20, padding: "28px 24px",
      boxShadow: "var(--shadow-md)",
    }}>
      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {index + 1} / {total}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{card.scenarioTitle}</span>
      </div>
      <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2, marginBottom: 24 }}>
        <div style={{
          width: `${((index + 1) / total) * 100}%`,
          height: "100%", background: "var(--accent)", borderRadius: 2, transition: "width 0.3s ease",
        }} />
      </div>

      {/* Prompt */}
      <div style={{
        background: "var(--surface2)", borderRadius: 14, padding: "18px 20px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>
          {tr.quizSpeakPrompt}
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", lineHeight: 1.6 }}>
          {card.quizPromptJa}
        </div>
      </div>

      {/* Voice / Answer */}
      {!answerRevealed && (
        <div style={{ marginBottom: 16 }}>
          {speechSupported ? (
            isTranscribing ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 0" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2.5px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Transcribing...</div>
              </div>
            ) : (
              <button
                onClick={toggleRecording}
                style={{
                  width: "100%", padding: "13px", borderRadius: 12,
                  background: isRecording ? "#FF3B30" : "var(--surface2)",
                  color: isRecording ? "#FFFFFF" : "var(--text)",
                  border: isRecording ? "none" : "1px solid var(--border)",
                  fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {isRecording ? "🔴 Recording... (tap to stop)" : "🎙 Tap to speak"}
              </button>
            )
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "10px 0" }}>
              ⚠️ Microphone not available.
            </div>
          )}

          {/* Transcription — prominent display */}
          {transcription && !isTranscribing && (
            <div style={{
              marginTop: 12, padding: "16px 18px",
              background: "var(--accent-bg)", borderRadius: 12,
              border: "1.5px solid var(--accent)",
            }}>
              <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>You said</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", lineHeight: 1.6 }}>{transcription}</div>
            </div>
          )}

          <button
            onClick={() => setAnswerRevealed(true)}
            style={{
              width: "100%", marginTop: 12, padding: "13px",
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

      {answerRevealed && (
        <div style={{ marginBottom: 20 }}>
          {/* Comparison: You said vs Model answer */}
          {transcription && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              <div style={{ padding: "14px 16px", background: "var(--surface2)", borderRadius: 12, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>You said</div>
                <div style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6 }}>{transcription}</div>
              </div>
              <div style={{ padding: "14px 16px", background: "var(--accent-bg)", borderRadius: 12, border: "1.5px solid var(--accent)" }}>
                <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>{tr.quizModelAnswer}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", lineHeight: 1.5 }}>{card.natural}</div>
              </div>
            </div>
          )}

          <div style={{ background: "var(--surface2)", borderRadius: 14, padding: "18px 20px" }}>
            {!transcription && (
              <div style={{ marginBottom: card.chunk ? 14 : 0 }}>
                <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>
                  {tr.quizModelAnswer}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em", lineHeight: 1.5 }}>
                  &ldquo;{card.natural}&rdquo;
                </div>
              </div>
            )}
            {card.chunk && (
              <div style={{ paddingTop: transcription ? 0 : 14, borderTop: transcription ? "none" : "1px solid var(--border)", marginBottom: card.explanation ? 14 : 0 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>
                  {tr.quizChunk}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>🔑 {card.chunk}</div>
              </div>
            )}
            {(card.chunkDetail || card.explanation) && (
              <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>
                  {tr.quizUsage}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{card.chunkDetail || card.explanation}</div>
              </div>
            )}
          </div>
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

// ─── Result Screen ─────────────────────────────────────────────

function ResultScreen({
  queue, sessionCount, sessionUsed, learnedCount, tr, onAgain, onBack,
}: {
  queue: QuizItem[];
  sessionCount: number;
  sessionUsed: Set<string>;
  learnedCount: number;
  tr: typeof i18n.en | typeof i18n.ja;
  onAgain: () => void;
  onBack: () => void;
}) {
  const masteredItems = queue.filter((q) => sessionUsed.has(q.id));

  return (
    <div>
      <div style={{
        background: "var(--surface)", borderRadius: 20, padding: "36px 24px",
        textAlign: "center", boxShadow: "var(--shadow-md)", marginBottom: 16,
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 12, letterSpacing: "-0.02em" }}>
          {tr.quizComplete}
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
          {sessionCount} / {queue.length}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
          {tr.quizScore(sessionCount, queue.length)}
        </div>
        <div style={{ fontSize: 14, color: "var(--green)", fontWeight: 700, marginBottom: 24 }}>
          {tr.totalLearned}: {learnedCount}
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
          <button onClick={onBack} style={{
            flex: 1, padding: "13px", borderRadius: 12,
            background: "var(--surface2)", color: "var(--text)",
            border: "1px solid var(--border)", fontWeight: 600, fontSize: 14,
            cursor: "pointer",
          }}>
            {tr.backToList}
          </button>
        </div>
      </div>

      {masteredItems.length > 0 && (
        <div style={{ background: "var(--surface)", borderRadius: 18, padding: "20px 20px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
            ✓ {tr.masteredThisSession}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {masteredItems.map((item) => (
              <div key={item.id} style={{
                background: "var(--surface2)", borderRadius: 12, padding: "12px 14px",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                  {item.natural}
                </div>
                {item.chunk && (
                  <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>🔑 {item.chunk}</div>
                )}
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{item.scenarioTitle}</div>
              </div>
            ))}
          </div>
        </div>
      )}
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
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? "var(--text)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}
