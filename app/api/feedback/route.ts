import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Turn = { userMessage: string; counterpartMessage: string };

export async function POST(req: NextRequest) {
  try {
    const { scenario, turns, language }: { scenario: { title: string; brief: string; difficulty: string; personaName: string; personaRole: string }; turns: Turn[]; language: string } = await req.json();
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
${turnsText}

${cefrGuide}

Score the OVERALL session on 4 axes (0-100). CEFR scale: 90-100=C2, 75-89=C1, 55-74=B2, 35-54=B1, 15-34=A2, 0-14=A1.
IMPORTANT: This is TRANSCRIBED VOICE INPUT. There is no punctuation. Do NOT deduct points for missing punctuation. Do NOT mention punctuation anywhere in the feedback.
- accuracy: grammatical accuracy (tenses, articles, prepositions, sentence structure only — never punctuation)
- range: range and variety of vocabulary and grammatical structures
- interaction: relevance and substance of responses; score below 35 if under 10 words, off-topic, or ignores the question
- coherence: logical organization and use of connectors

CRITICAL RULES:
- "strengths": Exactly 2 items. Each MUST start with [AxisName] (e.g. [Accuracy]). Then QUOTE a specific phrase the user actually said that demonstrates the strength. Be concrete — do NOT write vague praise.${isJa ? " Write content in Japanese but keep [AxisName] in English." : ""}
  Example: "[Accuracy]: 「we had discussed this last week」で過去完了を正確に使えていた。時制の一致が会話全体を通じて安定していました。"
- "improvements": Exactly 2 items. Start with [AxisName]. Quote the user's actual phrase using 「」, then suggest a better version appropriate for difficulty=${scenario.difficulty} (beginner=A2 / intermediate=B1-B2 / advanced=C1-C2). Add 1-2 sentences on why the improvement helps communication.${isJa ? " Write in Japanese but keep [AxisName] in English. Example: [Range]：「we have many problems」より「we've been running into quite a few issues」の方が語彙の幅が広がります。問題に継続的に遭遇している状況を具体的に伝えられます。" : " Example: [Range]: 「we have many problems」→ 「we've been running into quite a few issues」shows stronger vocabulary range and conveys ongoing difficulty more precisely."}
- "naturalExpressions": Pick 2-4 corrections. Base them on the same phrases identified in improvements where possible. LEVEL FILTER — beginner: A2 expressions only; intermediate: B1-B2 only; advanced: C1-C2 only. Current difficulty: ${scenario.difficulty}
- "naturalExpressions[].reason": grammar / collocation / literal / set-phrase / formality / nuance
- "naturalExpressions[].explanation": 1-2 sentences why original is wrong, angled by reason — grammar: cite the exact rule; collocation: name wrong pair and right pair; literal: name Japanese source phrase and why it fails; set-phrase: why fixed phrase is expected; formality: scene + register mismatch; nuance: contrast what original vs natural implies.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].chunk": A specific English expression with real learning value extracted DIRECTLY from natural. Can be any type: collocation, phrasal verb, idiom, set phrase, discourse marker. Replace variable content with ~. Minimum 3 meaningful fixed words. GOOD: 「run into ~ issues」「It might be worth ~ing」「quite a few ~」「Having said that, ~」BAD (forbidden): 「It's ~」「from ~ to ~」「I ~ ~」「the ~ of ~」— grammar structure only, zero learning value.
- "naturalExpressions[].chunkDetail": 1-2 sentences: what ~ stands for, when to use it, one practical tip.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].example": One short English example sentence using the chunk.
- "naturalExpressions[].natural": Apply the MINIMAL fix for the identified issue. For collocation: swap only the problematic word. For grammar: fix only the grammatical error. Do NOT restructure the whole sentence unnecessarily.
- "suggestedResponse": A better version of the user's LAST turn response in English.

EXAMPLES of ideal naturalExpression quality (follow this standard exactly):
Collocation: { "original": "it has the big potential", "natural": "it has great potential", "reason": "collocation", "explanation": "「big」does not collocate with「potential」. Natural pairings: great / enormous / tremendous potential.", "chunk": "have great potential", "chunkDetail": "「great potential」is a fixed collocation. Use have/show great potential to say something is very promising.", "example": "This approach has great potential for cutting costs." }
Grammar: { "original": "I look forward to see you", "natural": "I look forward to seeing you", "reason": "grammar", "explanation": "「look forward to」requires a gerund (-ing), not an infinitive. The「to」here is a preposition.", "chunk": "look forward to ~ing", "chunkDetail": "After「look forward to」, always use the -ing form.「~ing」is the activity you are anticipating.", "example": "I look forward to hearing your thoughts." }

Return ONLY valid JSON:
{
  "scores": { "accuracy": <number>, "range": <number>, "interaction": <number>, "coherence": <number> },
  "overall": <number>,
  "encouragement": "",
  "strengths": ["<[AxisName]${isJa ? " ユーザーの発言を引用して具体的に褒める" : " quote user phrase + specific praise"}>", "<[AxisName]${isJa ? " 具体的な良かった点" : " specific strength"}>"],
  "improvements": ["<[AxisName]${isJa ? " 「ユーザーの発言」→ 改善案 + なぜ良いか" : " 「user phrase」→ better version + why"}>", "<[AxisName]${isJa ? " 「ユーザーの発言」→ 改善案 + なぜ良いか" : " 「user phrase」→ better version + why"}>"],
  "suggestedResponse": "<natural English response for the last turn>",
  "naturalExpressions": [
    {
      "original": "<user's phrase from any turn>",
      "natural": "<more natural English>",
      "reason": "<grammar|collocation|literal|set-phrase|formality|nuance>",
      "chunk": "<core pattern e.g. I'd strongly recommend ~>",
      "explanation": "<${isJa ? "日本語で1〜2文：なぜ元の表現が不自然か（問題点のみ）" : "1-2 sentences: why the original is unnatural (problem only)"}>",
      "chunkDetail": "<${isJa ? "日本語で1〜2文：チャンクの使い方・~に何が入るか・実践アドバイス" : "1-2 sentences: how to use the chunk, what ~ stands for, practical tip"}>",
      "example": "<short English example using the chunk>"
    }
  ]
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
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
