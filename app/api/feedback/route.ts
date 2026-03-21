import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Turn = { userMessage: string; counterpartMessage: string };

export async function POST(req: NextRequest) {
  try {
    const { scenario, turns, language }: { scenario: { title: string; brief: string; difficulty: string; personaName: string; personaRole: string; keyPhrases: string[] }; turns: Turn[]; language: string } = await req.json();
    const isJa = language === "ja";

    const systemContent = isJa
      ? "You are an English speaking coach. The learner's language is Japanese. You MUST write strengths, improvements, and naturalExpressions[].explanation in Japanese. All other fields (original, natural, chunk, example, suggestedResponse) remain in English. Always return valid JSON only, no markdown, no backticks."
      : "You are an English speaking coach. Always return valid JSON only, no markdown, no backticks.";

    const turnsText = turns.map((t, i) =>
      `[Turn ${i + 1}]\n${scenario.personaName} said: "${t.counterpartMessage}"\nUser responded: "${t.userMessage}"`
    ).join("\n\n");

    const totalWords = turns.reduce((sum, t) => sum + t.userMessage.trim().split(/\s+/).filter(Boolean).length, 0);

    const cefrGuide = scenario.difficulty === "beginner"
      ? `CEFR target: A2. Score 80-100 if the user communicates at A2 level (familiar phrases, simple sentences, basic topics). A2 does NOT require perfect grammar — reward clear intent and basic communication. Score below 60 only if communication broke down entirely.`
      : scenario.difficulty === "intermediate"
      ? `CEFR target: B1-B2. Score 75-90 for B2 (handles unfamiliar topics, some fluency, good range). Score 60-74 for B1 (manages familiar situations, simple connected sentences). Score below 60 if mostly broken phrases.`
      : `CEFR target: C1-C2. Score 85-100 for near-native fluency, complex language, precision. Score 70-84 for C1-level competence. Score below 70 if clearly below C level.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemContent },
        {
          role: "user",
          content: `${isJa ? "⚠️ MANDATORY: Write strengths[], improvements[], and naturalExpressions[].explanation IN JAPANESE. Do NOT use English for these fields.\n\n" : ""}Analyze this English conversation session (${turns.length} turn${turns.length > 1 ? "s" : ""}).

Scenario: ${scenario.title}
Situation: ${scenario.brief}
Difficulty: ${scenario.difficulty}
Counterpart: ${scenario.personaName} (${scenario.personaRole})
Key vocabulary: ${scenario.keyPhrases.join(", ")}

${turnsText}

${cefrGuide}

Score the OVERALL session on 4 axes (0-100). CEFR scale: 90-100=C2, 75-89=C1, 55-74=B2, 35-54=B1, 15-34=A2, 0-14=A1. Spoken English — ignore all punctuation.
- accuracy: grammatical accuracy (tenses, articles, prepositions, sentence structure)
- range: range and variety of vocabulary and grammatical structures
- interaction: relevance and substance of responses; score below 35 if under 10 words, off-topic, or ignores the question
- coherence: logical organization and use of connectors

CRITICAL RULES:
- "strengths": Exactly 2 items. Each MUST start with [AxisName Score] in brackets. Then QUOTE a specific phrase the user actually said that demonstrates the strength. Be concrete — do NOT write vague praise.${isJa ? " Write content in Japanese but keep [AxisName Score] in English." : ""}
  Example: "[Accuracy 78]: You correctly used past tense in 'we had discussed this last week' — tense agreement was accurate throughout."
- "improvements": Exactly 2 items. Each MUST start with [AxisName Score]. Use 「」to quote English phrases (never use double quotes inside JSON strings).${isJa ? " Add a brief Japanese explanation. Example: [Coherence 52]：「I want to make the budget more」→「I'd like to increase the budget because it's critical for Q3」理由を付けることで主張に説得力が出ます。" : " Example: [Coherence 52]: 「I want to make the budget more.」— better: 「I'd like to increase the budget because it's critical for Q3.」"}
- "naturalExpressions": Pick 2-4 of the most useful corrections from across ALL turns. Return [] if English was already natural.
- "naturalExpressions[].explanation": One concrete sentence about WHEN and HOW to use this in this specific business scene (negotiation/refusal/request etc). Do NOT write generic phrases like "more natural".${isJa ? " Write in Japanese. Example: 交渉で断りを入れながら代替案を示す場面で使います。" : " Example: Use this when pushing back without damaging the relationship."}
- "naturalExpressions[].chunk": Core pattern with "~" for variable part. E.g. "I'd strongly recommend ~". Keep short (3-6 words + ~).
- "naturalExpressions[].example": One short English example sentence using the chunk.
- "suggestedResponse": A better version of the user's LAST turn response in English.

Return ONLY valid JSON:
{
  "scores": { "accuracy": <number>, "range": <number>, "interaction": <number>, "coherence": <number> },
  "overall": <number>,
  "encouragement": "",
  "strengths": ["<[AxisName Score]${isJa ? " 具体的な良かった点" : " specific strength with quoted phrase"}>", "<[AxisName Score]${isJa ? " 具体的な良かった点" : " specific strength"}>"],
  "improvements": ["<[AxisName Score]${isJa ? " 引用→改善案" : " quoted phrase → better version"}>", "<[AxisName Score]${isJa ? " 引用→改善案" : " quoted phrase → better version"}>"],
  "foundPhrases": [],
  "suggestedResponse": "<natural English response for the last turn>",
  "naturalExpressions": [
    {
      "original": "<user's phrase from any turn>",
      "natural": "<more natural English>",
      "chunk": "<core pattern e.g. 'I'd strongly recommend ~'>",
      "explanation": "<${isJa ? "日本語で理由" : "why more natural"}>",
      "example": "<short English example using the chunk>"
    }
  ]
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1600,
    });

    const text = completion.choices[0].message.content?.trim() ?? "";
    // Strip markdown fences, then extract the first complete JSON object
    const stripped = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response");
    const data = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ ...data, wordCount: totalWords });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("feedback error:", msg);
    return NextResponse.json({ error: "Failed to get feedback", detail: msg }, { status: 500 });
  }
}
