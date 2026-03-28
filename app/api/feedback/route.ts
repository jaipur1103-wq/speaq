import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Turn = { userMessage: string; counterpartMessage: string };

// ── Code-side filters ──────────────────────────────────────────────────────────

const VAGUE_PATTERNS = [
  "more natural", "sounds better", "more commonly used", "sounds awkward",
  "more fluent", "more polished", "sounds more", "is preferred", "is better",
  "contraction", "stylistic", "personal preference", "either is fine",
  "both are correct", "i've vs", "i have vs", "vs i've", "vs i have",
];

function isGenuineEvidence(evidence: string): boolean {
  if (!evidence || evidence.trim().length < 15) return false;
  const lower = evidence.toLowerCase();
  if (VAGUE_PATTERNS.some(p => lower.includes(p))) return false;
  return true;
}

const BAD_CHUNK_PATTERNS = [
  /^it'?s\s+~/i,
  /^i\s+~(\s+~)+/i,
  /^be\s+~/i,
  /^the\s+~\s+of\s+~/i,
  /^from\s+~\s+to\s+~/i,
];

function isValidChunk(chunk: string): boolean {
  if (!chunk || chunk.trim().length === 0) return false;
  // Count total tokens (words + "~" placeholders)
  const tokens = chunk.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return false;
  // Must have at least 2 fixed (non-~) words
  const fixedWords = tokens.filter(t => t !== "~" && !t.startsWith("~") && !t.endsWith("~"));
  if (fixedWords.length < 2) return false;
  if (BAD_CHUNK_PATTERNS.some(p => p.test(chunk.trim()))) return false;
  return true;
}

const BASIC_CHUNK_BLACKLIST = [
  /^i want/i, /^i need/i, /^can you/i,
  /^i think/i, /^please /i, /^thank you/i,
  /^let me/i, /^i will /i, /^i'll /i,
  /^i'd like to$/i, /^i don't/i,
];

function isUpgradeWorthwhile(original: string, natural: string): boolean {
  if (!original || !natural) return false;
  const orig = original.toLowerCase().trim();
  const nat = natural.toLowerCase().trim();
  if (orig === nat) return false;
  // Short phrases where only 1 token differs = synonym swap, no learning value
  const origTokens = orig.split(/\s+/);
  const natTokens = nat.split(/\s+/);
  if (origTokens.length === natTokens.length && origTokens.length <= 4) {
    const diffCount = origTokens.filter((w, i) => w !== natTokens[i]).length;
    if (diffCount <= 1) return false;
  }
  return true;
}

// ── Level guides ───────────────────────────────────────────────────────────────

const LEVEL_GUIDES: Record<string, string> = {
  beginner: `High school English is assumed — NEVER suggest phrases like "Can you~", "I want~", "I need~" (too elementary).
Target: simple but workplace-appropriate phrases (under 8 words). One step above what a beginner already knows.
Good examples: "I'll look into it." / "Could we schedule a time?" / "I'll get back to you on that."`,
  intermediate: `Avoid expressions a beginner already knows. Target: natural business collocations, hedging phrases, transition expressions.
Professional but conversational tone.
Good examples: "I was wondering if~" / "move forward with~" / "I appreciate your input" / "That being said~"`,
  advanced: `Avoid intermediate-level expressions. Target: sophisticated vocabulary, formal register, nuanced discourse.
Good examples: "I'd like to revisit the premise of~" / "contingent on~" / "from a strategic standpoint" / "ensure we're aligned on~"`,
};

const FEW_SHOT_EXAMPLES: Record<string, string> = {
  beginner: `FEW-SHOT EXAMPLES (beginner) — show how to UPGRADE the user's expression:
✅ GOOD: original="I want to talk about the deadline", natural="I'd like to go over the deadline"
   chunk="go over ~" — replaces basic "talk about", workplace phrasal verb
✅ GOOD: original="Can we meet tomorrow?", natural="Could we schedule a time tomorrow?"
   chunk="Could we schedule a time" — polite upgrade from basic "Can we~"
✅ GOOD: original="I will finish it soon", natural="I'll get back to you on that shortly"
   chunk="get back to you on ~" — more professional than "I will finish"
❌ SKIP: original="I think it's good", natural="I believe it's good" — synonym swap, A1→A1, no learning value
❌ SKIP: original="I'll do it", natural="I will do it" — contraction only, skip
❌ SKIP: original="I need more time", natural="I require more time" — trivial synonym, skip`,

  intermediate: `FEW-SHOT EXAMPLES (intermediate) — show how to UPGRADE the user's expression:
✅ GOOD: original="I think there might be a problem", natural="I have some concerns about this"
   chunk="I have some concerns about ~" — professional hedging, avoids blunt "I think there's a problem"
✅ GOOD: original="Let's talk about this later", natural="Let's table this and revisit it later"
   chunk="table this and revisit ~" — business idiom for deferring decisions
✅ GOOD: original="That's a good point", natural="That's a valid point, and I'd add that~"
   chunk="That's a valid point" — more precise than "good", builds on the conversation
❌ SKIP: original="I'd like to discuss this", natural="I would like to discuss this" — no real upgrade
❌ SKIP: original="I was wondering if we could proceed", natural="I was thinking if we could proceed" — trivial swap
❌ SKIP: original="move forward with this plan", natural="proceed with this plan" — synonym, skip`,

  advanced: `FEW-SHOT EXAMPLES (advanced) — show how to UPGRADE the user's expression:
✅ GOOD: original="I think we should reconsider this", natural="I'd like to revisit the premise of this approach"
   chunk="revisit the premise of ~" — sophisticated, shows critical thinking
✅ GOOD: original="This depends on the budget", natural="This is contingent on budget approval"
   chunk="contingent on ~" — formal register appropriate for advanced business
✅ GOOD: original="From a business point of view", natural="From a strategic standpoint"
   chunk="from a strategic standpoint" — high-register discourse phrase
❌ SKIP: original="ensure we're aligned", natural="make sure we agree" — downgrade, skip
❌ SKIP: original="I was wondering if~", natural="I was thinking if~" — trivial swap
❌ SKIP: original="contingent on approval", natural="subject to approval" — synonym at same level`,
};

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { scenario, turns, language }: {
      scenario: { title: string; brief: string; difficulty: string; personaName: string; personaRole: string };
      turns: Turn[];
      language: string;
    } = await req.json();

    const isJa = language === "ja";
    const totalWords = turns.reduce((sum, t) => sum + t.userMessage.trim().split(/\s+/).filter(Boolean).length, 0);

    const turnsText = turns.map((t, i) =>
      `[Turn ${i + 1}]\n${scenario.personaName} said: "${t.counterpartMessage}"\nUser responded: "${t.userMessage}"`
    ).join("\n\n");

    const levelGuide = LEVEL_GUIDES[scenario.difficulty] ?? LEVEL_GUIDES.intermediate;
    const fewShot = FEW_SHOT_EXAMPLES[scenario.difficulty] ?? FEW_SHOT_EXAMPLES.intermediate;

    // ── Call 1: main feedback (encouragement / strengths / improvements) ──────
    const mainSystemContent = isJa
      ? "You are an English speaking coach. The learner's language is Japanese. You MUST write encouragement, strengths, improvements[].comment in Japanese. All other fields (suggestedResponse, errorEvidence) remain in English. Always return valid JSON only, no markdown, no backticks."
      : "You are an English speaking coach. Always return valid JSON only, no markdown, no backticks.";

    const mainPrompt = `${isJa ? "⚠️ MANDATORY: Write encouragement, strengths[], improvements[].comment IN JAPANESE.\n\n" : ""}Analyze this English conversation session (${turns.length} turn${turns.length > 1 ? "s" : ""}).

Scenario: ${scenario.title}
Situation: ${scenario.brief}
Difficulty: ${scenario.difficulty}
Counterpart: ${scenario.personaName} (${scenario.personaRole})
${turnsText}

IMPORTANT: This is TRANSCRIBED VOICE INPUT — no punctuation exists. Do NOT mention punctuation anywhere.

⚠️ SCOPE: Evaluate ONLY the lines marked "User responded:". NEVER evaluate or quote ${scenario.personaName}'s lines.

CRITICAL RULES:

- "conversationSummary": 1-2 sentences. What topics and key points were discussed.${isJa ? " Write in Japanese." : ""}

- "encouragement": One sentence. Honest overall impression of the User's responses only.${isJa ? " Write in Japanese." : ""}

- "strengths": 1-3 items. Analyze ONLY "User responded:" lines. Never quote from ${scenario.personaName}'s lines.
  Only genuine strengths. Quote using 「」, name specific linguistic feature.
  FORBIDDEN: "good job", "well done", "natural English".
  ${isJa ? "Write in Japanese. Example: 「I was wondering if ~」という形を使えていました。ネイティブが依頼するときによく使う丁寧な構造です。" : "Example: You used 「I was wondering if ~」— the standard native structure for polite requests."}

- "improvements": 0-2 items. Analyze ONLY "User responded:" lines. Do NOT evaluate ${scenario.personaName}'s speech.
  Fill "errorEvidence" FIRST with ONE of:
  (a) Grammar rule violated: name rule + show violation
  (b) Wrong collocation pair: name wrong + correct
  (c) Literal translation failure: name source + why it fails
  (d) Register mismatch: name register + why it conflicts
  If you cannot write specific errorEvidence of type (a)-(d), do NOT include that improvement.
  DO NOT include: contractions, synonyms, stylistic variation.
  - "originalPhrase": The clause or sentence containing the problematic expression (English, 8-15 words of context so it's clear where it occurred).
  - "improvedPhrase": The natural replacement (English, phrase-level, concise — NOT a full sentence).
  - "comment": Quote 「phrase」, explain via errorEvidence, add why it matters.
    FORBIDDEN: "more natural", "sounds better", "sounds awkward".${isJa ? " Write in Japanese." : ""}
  - "suggestedResponse": Full natural English response for that turn.

EXAMPLES:
Collocation: { "errorEvidence": "big + potential is unnatural; correct: great/enormous/tremendous + potential", "originalPhrase": "I think this project has big potential for our team", "improvedPhrase": "great potential", "comment": "...", "suggestedResponse": "..." }
Grammar: { "errorEvidence": "look forward to requires gerund [-ing]; 'to' is preposition here, not infinitive marker; user wrote 'look forward to see'", "originalPhrase": "I look forward to see you at the meeting next week", "improvedPhrase": "look forward to seeing", "comment": "...", "suggestedResponse": "..." }

Return ONLY valid JSON:
{
  "conversationSummary": "<${isJa ? "日本語1〜2文" : "1-2 sentences"}>",
  "encouragement": "<${isJa ? "日本語で1文" : "one honest sentence"}>",
  "strengths": ["<${isJa ? "「発言」＋言語的特徴" : "「phrase」+ feature"}>"],
  "improvements": [
    {
      "errorEvidence": "<specific rule / collocation / literal / register>",
      "originalPhrase": "<exact phrase user said>",
      "improvedPhrase": "<natural replacement phrase>",
      "comment": "<${isJa ? "「発言」→ 理由 + なぜ重要か" : "「phrase」→ reason + why it matters"}>",
      "suggestedResponse": "<full natural English response>"
    }
  ]
}`;

    // ── Call 2: naturalExpressions (focused, level-constrained) ───────────────
    const exprSystemContent = isJa
      ? `You are a business English expression coach for ${scenario.difficulty} level learners.
LEVEL: ${scenario.difficulty}
${levelGuide}
Your ONLY task: extract 2-4 high-value expressions the learner should study.
Priority: collocations, idioms, phrasal verbs, discourse markers, hedging expressions.
⚠️ Write explanation and chunkDetail IN JAPANESE. All other fields in English.
Always return valid JSON only, no markdown, no backticks.`
      : `You are a business English expression coach for ${scenario.difficulty} level learners.
LEVEL: ${scenario.difficulty}
${levelGuide}
Your ONLY task: extract 2-4 high-value expressions the learner should study.
Priority: collocations, idioms, phrasal verbs, discourse markers, hedging expressions.
Always return valid JSON only, no markdown, no backticks.`;

    const exprPrompt = `Extract 2-4 expressions for a ${scenario.difficulty} level learner from this conversation.

Scenario: ${scenario.title}
Counterpart: ${scenario.personaName} (${scenario.personaRole})
${turnsText}

SOURCE RULE: Find phrases in the User's responses where a native business professional would express the same idea more naturally or effectively.
INCLUDE: User said something correct but basic/common, AND there is a meaningfully more professional way to say it.
SKIP: User's expression is already sophisticated for ${scenario.difficulty} level.
SKIP: The only difference is a contraction or single synonym swap (e.g., "big" → "large", "I will" → "I'll").
SKIP: The natural version changes the meaning rather than the register.

${fewShot}

CHUNK RULES (strictly enforced):
- 3-8 total tokens (words + ~ placeholders)
- At least 2 fixed (non-~) meaningful words
- FORBIDDEN patterns: "It's ~", "I ~ ~", "be ~", "the ~ of ~", "from ~ to ~", single word + ~
- GOOD patterns: "run into ~ issues", "It might be worth ~ing", "move forward with ~", "Having said that,~"

For each expression:
- "original": the phrase as used by the User (the less natural or less effective version)
- "natural": What a native business professional would say to express the SAME idea. This is an upgrade, not just a fix — aim for at least one sophistication level above what the user said. Restructuring is allowed if it produces a meaningfully more professional expression.
- "reason": grammar / collocation / literal / set-phrase / formality / nuance
- "explanation": 1-2 sentences. Cite exact grammar rule, name wrong/correct collocation pair, or explain nuance.${isJa ? " Write in Japanese." : ""}
- "chunk": core learnable pattern (see CHUNK RULES above)
- "chunkDetail": what ~ stands for, when to use it, one practical tip.${isJa ? " Write in Japanese." : ""}
- "example": one short English sentence using the chunk

Return ONLY valid JSON:
{
  "naturalExpressions": [
    {
      "original": "<phrase>",
      "natural": "<minimal fix>",
      "reason": "<grammar|collocation|literal|set-phrase|formality|nuance>",
      "explanation": "<${isJa ? "日本語：具体的な問題点" : "specific rule or reason"}>",
      "chunk": "<core pattern>",
      "chunkDetail": "<${isJa ? "日本語：使い方・実践アドバイス" : "usage and tip"}>",
      "example": "<short English sentence>"
    }
  ]
}`;

    // ── Run both calls in parallel ─────────────────────────────────────────────
    const [mainResult, exprResult] = await Promise.all([
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: mainSystemContent },
          { role: "user", content: mainPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: exprSystemContent },
          { role: "user", content: exprPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    ]);

    // ── Parse main response ────────────────────────────────────────────────────
    const mainText = mainResult.choices[0].message.content?.trim() ?? "";
    const mainStripped = mainText.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
    const mainMatch = mainStripped.match(/\{[\s\S]*\}/);
    if (!mainMatch) throw new Error("No JSON in main response");
    const mainData = JSON.parse(mainMatch[0]);

    // Filter vague improvements
    if (Array.isArray(mainData.improvements)) {
      mainData.improvements = mainData.improvements.filter((imp: { errorEvidence?: string }) =>
        isGenuineEvidence(imp.errorEvidence ?? "")
      );
    }

    // ── Parse expressions response ─────────────────────────────────────────────
    const exprText = exprResult.choices[0].message.content?.trim() ?? "";
    const exprStripped = exprText.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
    const exprMatch = exprStripped.match(/\{[\s\S]*\}/);
    let naturalExpressions: unknown[] = [];
    if (exprMatch) {
      const exprData = JSON.parse(exprMatch[0]);
      if (Array.isArray(exprData.naturalExpressions)) {
        // Code-side chunk quality filter
        naturalExpressions = exprData.naturalExpressions.filter((expr: { chunk?: string; original?: string; natural?: string }) =>
          isValidChunk(expr.chunk ?? "") &&
          !BASIC_CHUNK_BLACKLIST.some(p => p.test(expr.chunk ?? "")) &&
          isUpgradeWorthwhile(expr.original ?? "", expr.natural ?? "")
        );
      }
    }

    const insightMode = mainData.improvements.length === 0;

    return NextResponse.json({
      ...mainData,
      naturalExpressions,
      wordCount: totalWords,
      insightMode,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("feedback error:", msg);
    return NextResponse.json({ error: "Failed to get feedback", detail: msg }, { status: 500 });
  }
}
