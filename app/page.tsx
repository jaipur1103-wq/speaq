"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, PenLine, Plus, ChevronRight } from "lucide-react";
import ScenarioCard from "@/components/ScenarioCard";
import SettingsBar from "@/components/SettingsBar";
import SpeaqLogo from "@/components/SpeaqLogo";
import {
  DEFAULT_SETTINGS, getSettings, saveSettings, getSavedScenarios, saveGeneratedScenario,
  deleteSavedScenario, getCustomScenarios, deleteCustomScenario, getFavoriteIds,
  getStreak, getSavedExpressions,
} from "@/lib/db";
import { i18n } from "@/lib/i18n";
import type { AppSettings, Language, Scenario } from "@/types";

export default function Home() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const lang = settings.language ?? "en";
  const tr = i18n[lang];

  const reload = async () => {
    const [saved, custom, favs] = await Promise.all([
      getSavedScenarios(),
      getCustomScenarios(),
      getFavoriteIds(),
    ]);
    setSavedScenarios(saved);
    setCustomScenarios(custom);
    setFavoriteIds(favs);
  };

  useEffect(() => {
    (async () => {
      const [s, streak, exprs] = await Promise.all([
        getSettings(),
        getStreak(),
        getSavedExpressions(),
      ]);
      setSettings(s);
      setStreak(streak);
      setReviewCount(exprs.filter((e) => !e.learned).length);
      await reload();
    })();
  }, []);

  const handleSettingsChange = (s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  const toggleLang = () => {
    const newLang: Language = lang === "en" ? "ja" : "en";
    const newSettings = { ...settings, language: newLang };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const generateScenario = async () => {
    setSheetOpen(false);
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: settings.topic,
          difficulty: settings.difficulty,
          industry: settings.industry,
          personaStyle: settings.personaStyle,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const scenario: Scenario = {
        id: "gen_" + Date.now(),
        category: data.category,
        title: data.title, titleJa: data.titleJa,
        brief: data.brief, briefJa: data.briefJa,
        opener: data.opener, openerJa: data.openerJa,
        difficulty: data.difficulty, industry: data.industry,
        personaStyle: data.personaStyle, personaName: data.personaName,
        personaRole: data.personaRole,
      };
      await saveGeneratedScenario(scenario);
      await reload();
    } catch {
      setError(tr.generateFailed);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSaved = async (id: string) => { await deleteSavedScenario(id); await reload(); };
  const handleDeleteCustom = async (id: string) => { await deleteCustomScenario(id); await reload(); };

  const allScenarios = [...customScenarios, ...savedScenarios];
  const favoriteScenarios = allScenarios.filter((s) => favoriteIds.includes(s.id));
  const nonFavoriteScenarios = allScenarios.filter((s) => !favoriteIds.includes(s.id));

  // Current settings summary for action sheet
  const topicLabels: Record<string, string> = {
    business: lang === "ja" ? "ビジネス" : "Business",
    travel: lang === "ja" ? "旅行" : "Travel",
    daily: lang === "ja" ? "日常" : "Daily",
    social: lang === "ja" ? "交流" : "Social",
    study: lang === "ja" ? "学習" : "Study",
  };
  const diffLabels: Record<string, string> = {
    beginner: lang === "ja" ? "初級" : "Beginner",
    intermediate: lang === "ja" ? "中級" : "Intermediate",
    advanced: lang === "ja" ? "上級" : "Advanced",
  };
  const settingsSummary = [
    topicLabels[settings.topic] ?? settings.topic,
    diffLabels[settings.difficulty] ?? settings.difficulty,
    `${settings.sessionLength ?? 5} turns`,
  ].join(" · ");

  return (
    <main style={{ maxWidth: 640, width: "100%", margin: "0 auto", padding: "24px 16px 100px", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: streak > 0 || reviewCount > 0 ? 12 : 24 }}>
        <SpeaqLogo />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {streak > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 20,
              background: "rgba(255,149,0,0.12)", border: "1px solid rgba(255,149,0,0.3)",
            }}>
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#FF9500" }}>{streak}</span>
            </div>
          )}
          <button
            onClick={toggleLang}
            style={{
              padding: "6px 12px", borderRadius: 20,
              background: "var(--surface)", border: "1px solid var(--border)",
              color: "var(--accent)", fontSize: 12, fontWeight: 700,
              cursor: "pointer", boxShadow: "var(--shadow-sm)",
            }}
          >
            {lang === "en" ? "JA" : "EN"}
          </button>
        </div>
      </div>

      {/* 復習バナー */}
      {reviewCount > 0 && (
        <button
          onClick={() => router.push("/quiz")}
          style={{
            width: "100%", padding: "12px 16px", marginBottom: 20,
            background: "linear-gradient(135deg, #5856D6 0%, #AF52DE 100%)",
            border: "none", borderRadius: 14,
            display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer", boxShadow: "0 4px 14px rgba(88,86,214,0.25)",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 20 }}>🧠</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {lang === "ja" ? `学習中の表現が ${reviewCount}件あります` : `${reviewCount} expression(s) to review`}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>
              {lang === "ja" ? "クイズで復習する →" : "Start quiz →"}
            </div>
          </div>
        </button>
      )}

      {/* Generating toast */}
      {generating && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--accent)", borderRadius: 14,
          padding: "12px 16px", marginBottom: 20,
          boxShadow: "0 4px 20px rgba(0,102,204,0.3)",
        }}>
          <SpinnerIcon />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
            {tr.generating}
          </span>
        </div>
      )}

      {error && (
        <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      {/* Scenario list header */}
      {allScenarios.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
            {lang === "ja" ? "シナリオを選ぶ" : "Pick a scenario"}
          </span>
        </div>
      )}

      {/* Scenario list */}
      {allScenarios.length === 0 ? (
        <div style={{
          background: "var(--surface)", borderRadius: 20, boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}>
          {/* 上部：説明 */}
          <div style={{ textAlign: "center", padding: "40px 24px 24px" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, margin: "0 auto 16px",
              background: "linear-gradient(135deg, #007AFF, #5856D6)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={28} color="#fff" strokeWidth={1.8} />
            </div>
            <p style={{ fontWeight: 700, color: "var(--text)", marginBottom: 8, fontSize: 17 }}>
              {tr.noScenarios}
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 0 }}>
              {tr.noScenariosDesc}
            </p>
          </div>

          {/* 3ステップ */}
          <div style={{ display: "flex", justifyContent: "center", gap: 0, padding: "0 16px 24px" }}>
            {[
              { num: "①", label: lang === "ja" ? "設定して生成" : "Generate" },
              { num: "②", label: lang === "ja" ? "AIと会話練習" : "Practice" },
              { num: "③", label: lang === "ja" ? "表現を保存・復習" : "Review" },
            ].map((step, i) => (
              <div key={i} style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{step.num}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{step.label}</div>
                </div>
                {i < 2 && (
                  <div style={{ fontSize: 16, color: "var(--border)", flexShrink: 0 }}>→</div>
                )}
              </div>
            ))}
          </div>

          {/* 仕切り */}
          <div style={{ height: 1, background: "var(--border)", margin: "0 20px" }} />

          {/* 下部：現在の設定 + 生成ボタン */}
          <div style={{ padding: "20px 24px 28px" }}>
            {/* 設定サマリー */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Sparkles size={14} color="var(--text-muted)" strokeWidth={2} />
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                  {settingsSummary}
                </span>
              </div>
              <button
                onClick={() => setSettingsOpen(true)}
                style={{
                  fontSize: 13, color: "var(--accent)", fontWeight: 600,
                  background: "none", border: "none", cursor: "pointer", padding: "2px 0",
                  flexShrink: 0,
                }}
              >
                {lang === "ja" ? "変更" : "Change"}
              </button>
            </div>

            {/* 生成ボタン */}
            <button
              onClick={generateScenario}
              disabled={generating}
              style={{
                width: "100%", padding: "16px",
                background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
                border: "none", borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: generating ? "not-allowed" : "pointer",
                opacity: generating ? 0.7 : 1,
              }}
            >
              {generating ? <SpinnerIcon /> : <Sparkles size={18} color="#fff" strokeWidth={2} />}
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                {lang === "ja" ? "この設定で生成する" : "Generate with these settings"}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div>
          {favoriteScenarios.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>{tr.favorites}</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", minWidth: 0 }}>
                {favoriteScenarios.map((s) => (
                  <ScenarioCard key={s.id} scenario={s} isFavorite={true}
                    lang={settings.language}
                    onFavoriteChange={reload}
                    onDelete={s.id.startsWith("c_") ? handleDeleteCustom : handleDeleteSaved} />
                ))}
              </div>
            </div>
          )}
          {nonFavoriteScenarios.length > 0 && (
            <div>
              {favoriteScenarios.length > 0 && <SectionLabel>{tr.allScenarios}</SectionLabel>}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", minWidth: 0 }}>
                {nonFavoriteScenarios.map((s) => (
                  <ScenarioCard key={s.id} scenario={s} isFavorite={false}
                    lang={settings.language}
                    onFavoriteChange={reload}
                    onDelete={s.id.startsWith("c_") ? handleDeleteCustom : handleDeleteSaved} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings bottom sheet (controlled externally) */}
      <SettingsBar
        settings={settings}
        onChange={handleSettingsChange}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onGenerate={generateScenario}
      />

      {/* FAB */}
      <button
        onClick={() => setSheetOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: 82,
          right: 20,
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0,102,204,0.45), 0 1px 4px rgba(0,0,0,0.12)",
          zIndex: 110,
          transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s",
          transform: sheetOpen ? "scale(0.92)" : "scale(1)",
        }}
        aria-label={sheetOpen ? "Close" : "New scenario"}
      >
        <Plus
          size={26}
          color="#fff"
          strokeWidth={2.5}
          style={{
            transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
            transform: sheetOpen ? "rotate(45deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Action sheet backdrop */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            zIndex: 105,
          }}
        />
      )}

      {/* Action sheet */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        maxWidth: 640,
        margin: "0 auto",
        zIndex: 106,
        transform: sheetOpen ? "translateY(0)" : "translateY(110%)",
        transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        padding: "0 16px 28px",
        paddingBottom: "calc(28px + env(safe-area-inset-bottom))",
      }}>
        {/* Section label */}
        <div style={{
          fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: 10, paddingLeft: 4,
        }}>
          {lang === "ja" ? "新しいシナリオ" : "New Scenario"}
        </div>

        {/* Card 1: Generate */}
        <button
          onClick={() => { setSheetOpen(false); setTimeout(() => setSettingsOpen(true), 320); }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 16,
            padding: "18px 20px", marginBottom: 10,
            background: "var(--surface)", borderRadius: 20,
            boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
            border: "none", cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,102,204,0.35)",
          }}>
            <Sparkles size={24} color="#fff" strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)", marginBottom: 2, letterSpacing: "-0.01em" }}>
              {lang === "ja" ? "シナリオを生成" : "Generate Scenario"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {settingsSummary}
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-muted)" strokeWidth={2} />
        </button>

        {/* Card 2: Create */}
        <button
          onClick={() => { setSheetOpen(false); router.push("/create"); }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 16,
            padding: "18px 20px",
            background: "var(--surface)", borderRadius: 20,
            border: "none", cursor: "pointer",
            boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
            textAlign: "left",
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, #34C759 0%, #28A745 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(52,199,89,0.3)",
          }}>
            <PenLine size={24} color="#fff" strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)", marginBottom: 2, letterSpacing: "-0.01em" }}>
              {lang === "ja" ? "自分で作成" : "Create Your Own"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {lang === "ja" ? "オリジナルのシナリオを作成" : "Build your own scenario"}
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-muted)" strokeWidth={2} />
        </button>
      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function SpinnerIcon({ color = "#fff" }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
