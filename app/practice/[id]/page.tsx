"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Feedback, Message, NaturalExpression, Scenario, TurnScore } from "@/types";
import { saveExpression, getSettings } from "@/lib/storage";

type ChatItem =
  | { kind: "message"; data: Message }
  | { kind: "feedback"; data: Feedback; turn: number; scenarioTitle: string };

const difficultyColor: Record<string, string> = {
  beginner: "#34C759",
  intermediate: "#FF9500",
  advanced: "#FF3B30",
};

const AVATAR_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#C9A0DC", "#FFB347"];

function getAvatarColor(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function PracticePage() {
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [loadingReply, setLoadingReply] = useState(false);
  const [turnScores, setTurnScores] = useState<TurnScore[]>([]);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [turn, setTurn] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);

  // Timer
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [lastReplyAt, setLastReplyAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("current_scenario");
    if (!raw) { router.push("/"); return; }
    const s: Scenario = JSON.parse(raw);
    setScenario(s);
    setChatItems([{ kind: "message", data: { role: "counterpart", text: s.opener, timestamp: Date.now() } }]);
    setTimerEnabled(getSettings().timerEnabled ?? false);
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatItems, loadingFeedback, loadingReply]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechAPI) { setSpeechSupported(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SpeechAPI() as any;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      setInputText(finalText);
      setInterimText(interim);
    };
    rec.onerror = () => { setIsRecording(false); setInterimText(""); };
    rec.onend = () => { setIsRecording(false); setInterimText(""); };
    recognitionRef.current = rec;
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!timerEnabled || lastReplyAt === null) return;
    setTimeLeft(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [lastReplyAt, timerEnabled]);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(null);
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setInputText("");
      setInterimText("");
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSend = async () => {
    const text = (inputText + " " + interimText).trim();
    if (!text || !scenario) return;
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); }
    stopTimer();

    const userMsg: Message = { role: "user", text, timestamp: Date.now() };
    const currentTurn = turn;
    setChatItems((prev) => [...prev, { kind: "message", data: userMsg }]);
    setInputText("");
    setInterimText("");
    setTurn((t) => t + 1);

    const allMessages = chatItems
      .filter((i) => i.kind === "message")
      .map((i) => (i as { kind: "message"; data: Message }).data);

    const lastCounterpart = [...allMessages].reverse().find((m) => m.role === "counterpart");

    // Feedback
    setLoadingFeedback(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          counterpartMessage: lastCounterpart?.text ?? scenario.opener,
          userResponse: text,
        }),
      });
      const fb: Feedback = await res.json();
      setTurnScores((prev) => [...prev, { turn: currentTurn, overall: fb.overall, scores: fb.scores }]);
      setTimeout(() => {
        setChatItems((prev) => [
          ...prev,
          { kind: "feedback", data: fb, turn: currentTurn, scenarioTitle: scenario.title },
        ]);
      }, 500);
    } catch {
      // silent
    } finally {
      setLoadingFeedback(false);
    }

    // Counterpart reply
    setLoadingReply(true);
    try {
      const res = await fetch("/api/counterpart-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          conversationHistory: [...allMessages, userMsg],
          userMessage: text,
        }),
      });
      const { reply } = await res.json();
      setTimeout(() => {
        setChatItems((prev) => [
          ...prev,
          { kind: "message", data: { role: "counterpart", text: reply, timestamp: Date.now() } },
        ]);
        setLastReplyAt(Date.now());
      }, 1800);
    } catch {
      // silent
    } finally {
      setLoadingReply(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSaveExpression = (expr: NaturalExpression, scenarioTitle: string, exprKey: string) => {
    saveExpression({ ...expr, scenarioTitle });
    setSavedIds((prev) => new Set(prev).add(exprKey));
  };

  const handleBack = () => {
    if (turnScores.length > 0) {
      setShowSummary(true);
    } else {
      router.push("/");
    }
  };

  if (!scenario) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>
        Loading...
      </div>
    );
  }

  const hasInput = (inputText + interimText).trim().length > 0;
  const avgScore = turnScores.length
    ? Math.round(turnScores.reduce((a, b) => a + b.overall, 0) / turnScores.length)
    : null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", height: "100dvh", background: "var(--bg)" }}>

      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(var(--surface-rgb, 255,255,255), 0.85)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleBack}
            style={{
              background: "var(--surface2)",
              border: "none",
              borderRadius: 10,
              padding: "6px 12px",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            ← Back
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", fontWeight: 700 }}>
                {scenario.category}
              </span>
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: difficultyColor[scenario.difficulty] + "22", color: difficultyColor[scenario.difficulty], fontWeight: 700, textTransform: "capitalize" }}>
                {scenario.difficulty}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", lineHeight: 1.3, letterSpacing: "-0.01em" }}>{scenario.title}</div>
          </div>
          {avgScore !== null && <ScoreBadge score={avgScore} label="avg" />}
        </div>
      </div>

      {/* Briefing */}
      <div style={{
        padding: "12px 16px",
        background: "var(--accent-bg)",
        borderBottom: "1px solid var(--border)",
      }}>
        <p style={{ color: "var(--accent)", fontSize: 13, margin: "0 0 8px", lineHeight: 1.6, fontWeight: 500 }}>
          {scenario.brief}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {scenario.keyPhrases.map((p) => (
            <span key={p} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20,
              background: "var(--accent)", color: "#FFFFFF",
              fontWeight: 700, letterSpacing: "0.01em",
            }}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Score trend */}
      {turnScores.length > 0 && (
        <div style={{
          padding: "6px 16px",
          background: "var(--surface2)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflowX: "auto",
        }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            Progress
          </span>
          {turnScores.map((ts) => (
            <div key={ts.turn} style={{ display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>T{ts.turn}</span>
              <ScoreBadge score={ts.overall} small />
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {chatItems.map((item, i) =>
          item.kind === "message" ? (
            <ChatBubble key={i} msg={item.data} personaName={scenario.personaName} />
          ) : (
            <FeedbackPanel
              key={i}
              feedback={item.data}
              turn={item.turn}
              scenarioTitle={item.scenarioTitle}
              savedIds={savedIds}
              onSaveExpression={handleSaveExpression}
            />
          )
        )}
        {loadingFeedback && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "4px 0" }}>
            Analyzing your response...
          </div>
        )}
        {loadingReply && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <Avatar name={scenario.personaName} />
            <div style={{
              background: "var(--surface)",
              borderRadius: "18px 18px 18px 4px", padding: "12px 16px",
              fontSize: 13, color: "var(--text-muted)",
              boxShadow: "var(--shadow-sm)",
            }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: "12px 16px 24px",
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
      }}>
        {/* Timer bar */}
        {timeLeft !== null && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: timeLeft <= 5 ? "var(--red)" : "var(--text-secondary)", fontWeight: 700 }}>
                ⏱ {timeLeft}s
              </span>
              {timeLeft === 0 && (
                <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 600 }}>
                  Time&apos;s up! Send your response 🕐
                </span>
              )}
            </div>
            <div style={{ height: 3, background: "var(--surface2)", borderRadius: 2 }}>
              <div style={{
                width: `${(timeLeft / 30) * 100}%`,
                height: "100%",
                background: timeLeft <= 5 ? "var(--red)" : "var(--accent)",
                borderRadius: 2,
                transition: "width 1s linear, background 0.3s",
              }} />
            </div>
          </div>
        )}

        {!speechSupported && (
          <p style={{ fontSize: 12, color: "var(--orange)", marginBottom: 8 }}>
            ⚠️ Speech recognition not supported. Please use Chrome.
          </p>
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          {/* Mic button */}
          {speechSupported && (
            <button
              onClick={toggleRecording}
              className={isRecording ? "animate-pulse-ring" : ""}
              style={{
                width: 56, height: 56, borderRadius: "50%",
                border: `2px solid ${isRecording ? "var(--red)" : "transparent"}`,
                background: isRecording ? "rgba(255,59,48,0.1)" : "var(--accent)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s",
                boxShadow: isRecording ? "0 0 0 4px rgba(255,59,48,0.15)" : "0 4px 14px rgba(0,102,204,0.35)",
              }}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              <MicIcon recording={isRecording} />
            </button>
          )}

          {/* Text input + send */}
          <div style={{
            flex: 1,
            border: `1.5px solid ${timeLeft === 0 ? "var(--red)" : isRecording ? "var(--red)" : "var(--border)"}`,
            borderRadius: 16,
            padding: "8px 10px",
            background: "var(--surface2)",
            transition: "border-color 0.15s",
            display: "flex",
            alignItems: "flex-end",
            gap: 6,
          }}>
            <textarea
              value={inputText + (interimText ? " " + interimText : "")}
              onChange={(e) => { if (!isRecording) setInputText(e.target.value); }}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening..." : "Tap mic and speak, or type here..."}
              rows={2}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                resize: "none", color: interimText ? "var(--text-muted)" : "var(--text)",
                fontSize: 14, lineHeight: 1.5, fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!hasInput}
              style={{
                width: 36, height: 36, borderRadius: "50%", border: "none",
                background: hasInput ? "var(--accent)" : "var(--surface)",
                color: "#FFFFFF",
                cursor: hasInput ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.15s",
                boxShadow: hasInput ? "0 2px 8px rgba(0,102,204,0.3)" : "none",
                opacity: hasInput ? 1 : 0.4,
              }}
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, textAlign: "center" }}>
          Turn {turn} · {isRecording ? "Recording — tap mic to stop" : "Tap mic to speak"} · Enter to send
        </p>
      </div>

      {/* Session Summary Modal */}
      {showSummary && (
        <SessionSummary
          turnScores={turnScores}
          savedCount={savedIds.size}
          onContinue={() => setShowSummary(false)}
          onDone={() => router.push("/")}
        />
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: getAvatarColor(name),
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      color: "#FFFFFF", fontWeight: 700, fontSize: 13,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ChatBubble({ msg, personaName }: { msg: Message; personaName: string }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Avatar name={personaName} />
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{personaName}</span>
        </div>
      )}
      <div style={{
        maxWidth: "82%",
        marginLeft: isUser ? 0 : 38,
        padding: "12px 16px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "var(--accent)" : "var(--surface)",
        color: isUser ? "#FFFFFF" : "var(--text)",
        fontSize: 14, lineHeight: 1.6,
        boxShadow: "var(--shadow-sm)",
      }}>
        {msg.text}
      </div>
    </div>
  );
}

function FeedbackPanel({
  feedback, turn, scenarioTitle, savedIds, onSaveExpression,
}: {
  feedback: Feedback;
  turn: number;
  scenarioTitle: string;
  savedIds: Set<string>;
  onSaveExpression: (expr: NaturalExpression, scenarioTitle: string, key: string) => void;
}) {
  const [showSuggested, setShowSuggested] = useState(false);
  const overall = feedback.overall;
  const scoreColor = overall >= 70 ? "var(--green)" : overall >= 40 ? "var(--orange)" : "var(--red)";

  return (
    <div className="animate-fade-slide-up" style={{
      background: "var(--surface)",
      borderRadius: 18,
      padding: "16px 18px",
      boxShadow: "var(--shadow-md)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Turn {turn} Feedback
        </span>
        <span style={{ padding: "4px 12px", borderRadius: 20, background: scoreColor + "22", color: scoreColor, fontWeight: 700, fontSize: 15 }}>
          {overall}/100
        </span>
      </div>

      {/* Score bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {(Object.entries(feedback.scores) as [string, number][]).map(([key, val]) => (
          <ScoreRow key={key} label={key} value={val} />
        ))}
      </div>

      {/* Strengths */}
      {feedback.strengths.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>✓ What worked</SectionLabel>
          {feedback.strengths.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", paddingLeft: 12, lineHeight: 1.6, borderLeft: "2.5px solid var(--green)", marginBottom: 4 }}>
              {s}
            </div>
          ))}
        </div>
      )}

      {/* Improvements */}
      {feedback.improvements.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>→ Try next time</SectionLabel>
          {feedback.improvements.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", paddingLeft: 12, lineHeight: 1.6, borderLeft: "2.5px solid var(--orange)", marginBottom: 4 }}>
              {s}
            </div>
          ))}
        </div>
      )}

      {/* Natural expressions */}
      {feedback.naturalExpressions?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>💬 More natural</SectionLabel>
          {feedback.naturalExpressions.map((expr, i) => {
            const key = `${turn}-${i}`;
            const saved = savedIds.has(key);
            return (
              <div key={i} style={{
                background: "var(--surface2)",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 8,
              }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, textDecoration: "line-through" }}>
                  {expr.original}
                </div>
                <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 700, marginBottom: 5 }}>
                  → {expr.natural}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>
                  {expr.explanation}
                </div>
                <button
                  onClick={() => !saved && onSaveExpression(expr, scenarioTitle, key)}
                  disabled={saved}
                  style={{
                    fontSize: 12, padding: "4px 12px", borderRadius: 20,
                    border: `1.5px solid ${saved ? "var(--green)" : "var(--border)"}`,
                    background: saved ? "rgba(52,199,89,0.12)" : "transparent",
                    color: saved ? "var(--green)" : "var(--text-muted)",
                    cursor: saved ? "default" : "pointer",
                    fontWeight: 700,
                  }}
                >
                  {saved ? "✓ Saved" : "+ Save to Notebook"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Found key phrases */}
      {feedback.foundPhrases?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
          {feedback.foundPhrases.map((p, i) => (
            <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--accent-bg)", color: "var(--accent)", fontWeight: 700 }}>
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Suggested response + Shadowing */}
      {feedback.suggestedResponse && (
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowSuggested(!showSuggested)}
              style={{ fontSize: 12, color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
            >
              {showSuggested ? "Hide" : "Show"} model response
            </button>
          </div>
          {showSuggested && (
            <div style={{
              marginTop: 10, padding: "12px 14px",
              background: "var(--surface2)", borderRadius: 12,
              fontSize: 13, color: "var(--text-secondary)",
              fontStyle: "italic", lineHeight: 1.6,
            }}>
              &ldquo;{feedback.suggestedResponse}&rdquo;
            </div>
          )}
          {showSuggested && (
            <ShadowSection suggestedResponse={feedback.suggestedResponse} />
          )}
        </div>
      )}
    </div>
  );
}

function ShadowSection({ suggestedResponse }: { suggestedResponse: string }) {
  const [mode, setMode] = useState<"idle" | "recording" | "result">("idle");
  const [score, setScore] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<{ word: string; matched: boolean }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechAPI) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SpeechAPI() as any;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = Array.from(e.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join(" ");
      const normalize = (s: string) =>
        s.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
      const modelWords = normalize(suggestedResponse);
      const userWords = normalize(text);
      const matched = modelWords.filter((w) => userWords.includes(w));
      const sc = modelWords.length > 0 ? Math.round((matched.length / modelWords.length) * 100) : 0;
      setScore(sc);
      setHighlights(modelWords.map((w) => ({ word: w, matched: userWords.includes(w) })));
      setMode("result");
    };
    rec.onerror = () => setMode("idle");
    rec.onend = () => setMode((prev) => (prev === "recording" ? "idle" : prev));
    recRef.current = rec;
  }, [suggestedResponse]);

  const startShadow = () => {
    if (!recRef.current) return;
    setScore(null);
    setHighlights([]);
    setMode("recording");
    recRef.current.start();
  };

  const stopShadow = () => {
    recRef.current?.stop();
  };

  if (!recRef.current && mode === "idle") return null;

  return (
    <div style={{ marginTop: 12 }}>
      {mode === "idle" && (
        <button
          onClick={startShadow}
          style={{
            fontSize: 12, padding: "6px 14px", borderRadius: 20,
            border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-secondary)",
            cursor: "pointer", fontWeight: 600,
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          🎙 Shadow this
        </button>
      )}

      {mode === "recording" && (
        <div style={{
          padding: "10px 14px", borderRadius: 12,
          background: "rgba(255,59,48,0.08)", border: "1px solid var(--red)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13, color: "var(--red)", fontWeight: 700 }}>🔴 Recording...</span>
          <button
            onClick={stopShadow}
            style={{
              fontSize: 12, padding: "4px 12px", borderRadius: 20,
              background: "var(--red)", color: "#FFFFFF",
              border: "none", cursor: "pointer", fontWeight: 700,
            }}
          >
            Stop
          </button>
        </div>
      )}

      {mode === "result" && score !== null && (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--surface2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
              Shadow Match: {score}%
            </span>
            <button
              onClick={startShadow}
              style={{
                fontSize: 12, padding: "3px 10px", borderRadius: 20,
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text-muted)", cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.8, flexWrap: "wrap", display: "flex", gap: 4 }}>
            {highlights.map((h, i) => (
              <span key={i} style={{
                padding: "1px 5px", borderRadius: 4,
                background: h.matched ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.15)",
                color: h.matched ? "var(--green)" : "var(--red)",
                fontWeight: h.matched ? 600 : 400,
                fontSize: 12,
              }}>
                {h.word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionSummary({
  turnScores, savedCount, onContinue, onDone,
}: {
  turnScores: TurnScore[];
  savedCount: number;
  onContinue: () => void;
  onDone: () => void;
}) {
  const avg = Math.round(turnScores.reduce((a, b) => a + b.overall, 0) / turnScores.length);
  const trend = turnScores.length >= 2
    ? turnScores[turnScores.length - 1].overall - turnScores[0].overall
    : 0;

  const axisKeys: (keyof TurnScore["scores"])[] = ["clarity", "persuasion", "professionalism", "strategy"];
  const axisAvgs = axisKeys.map((key) => ({
    key,
    value: Math.round(turnScores.reduce((a, b) => a + b.scores[key], 0) / turnScores.length),
  }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 100,
      backdropFilter: "blur(4px)",
    }}>
      <div className="animate-fade-slide-up" style={{
        background: "var(--surface)", borderRadius: "24px 24px 0 0",
        padding: "28px 24px 40px",
        width: "100%", maxWidth: 640,
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Session Complete
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            {turnScores.length} turn{turnScores.length !== 1 ? "s" : ""} completed
          </p>
        </div>

        {/* Overall score */}
        <div style={{
          background: "var(--surface2)", borderRadius: 16, padding: "18px 20px", marginBottom: 16,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Overall Average
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: avg >= 70 ? "var(--green)" : avg >= 40 ? "var(--orange)" : "var(--red)", letterSpacing: "-0.02em" }}>
              {avg}/100
            </div>
          </div>
          {trend !== 0 && (
            <div style={{ fontSize: 14, fontWeight: 700, color: trend > 0 ? "var(--green)" : "var(--red)" }}>
              {trend > 0 ? "↑" : "↓"} {Math.abs(trend)} pts
            </div>
          )}
        </div>

        {/* Turn progression */}
        {turnScores.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
              Turn Scores
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {turnScores.map((ts, i) => (
                <div key={ts.turn} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {i > 0 && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>→</span>}
                  <ScoreBadge score={ts.overall} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Axis averages */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
            Axis Averages
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {axisAvgs.map(({ key, value }) => (
              <ScoreRow key={key} label={key} value={value} />
            ))}
          </div>
        </div>

        {/* Saved expressions */}
        {savedCount > 0 && (
          <div style={{
            background: "var(--accent-bg)", borderRadius: 12, padding: "12px 16px", marginBottom: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
              📒 {savedCount} expression{savedCount !== 1 ? "s" : ""} saved this session
            </span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onContinue}
            style={{
              flex: 1, padding: "14px",
              background: "var(--surface2)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 14,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            Continue Practice
          </button>
          <button
            onClick={onDone}
            style={{
              flex: 1, padding: "14px",
              background: "var(--accent)", color: "#FFFFFF",
              border: "none", borderRadius: 14,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,102,204,0.3)",
            }}
          >
            Done → Home
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "var(--green)" : value >= 40 ? "var(--orange)" : "var(--red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 120, textTransform: "capitalize" }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, width: 28, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ScoreBadge({ score, label, small }: { score: number; label?: string; small?: boolean }) {
  const color = score >= 70 ? "var(--green)" : score >= 40 ? "var(--orange)" : "var(--red)";
  return (
    <span style={{
      padding: small ? "2px 7px" : "3px 11px", borderRadius: 20,
      background: color + "22", color, fontWeight: 700,
      fontSize: small ? 11 : 13,
    }}>
      {score}{label ? ` ${label}` : ""}
    </span>
  );
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)",
          display: "inline-block",
          animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }`}</style>
    </span>
  );
}

function MicIcon({ recording }: { recording: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={recording ? "var(--red)" : "#FFFFFF"}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
