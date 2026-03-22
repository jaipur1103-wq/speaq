"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getSavedExpressions, deleteExpression, getSettings, saveSettings } from "@/lib/storage";
import { i18n } from "@/lib/i18n";
import type { Tr } from "@/lib/i18n";
import type { Language, SavedExpression } from "@/types";
import SpeaqLogo from "@/components/SpeaqLogo";

type Filter = "all" | "tolearn" | "learned" | "collection";

export default function NotebookPage() {
  const [expressions, setExpressions] = useState<SavedExpression[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Language>(() => getSettings().language ?? "en");

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
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
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

      {/* Collection mode */}
      {filter === "collection" && (
        <CollectionView groups={categoryGroups} tr={tr} onDelete={handleDelete} />
      )}

      {/* Expression list */}
      {filter !== "collection" && (
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
