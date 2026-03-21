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

Score the OVERALL session on 4 axes (0-100) using CEFR-aligned rubrics. Spoken English from voice input — ignore all punctuation.

- accuracy: Grammatical accuracy (tenses, articles, prepositions, sentence structure).
  90-100 (C2): Errors rare and imperceptible. 75-89 (C1): High control, minor slips only.
  55-74 (B2): Good control, errors don't cause misunderstanding. 35-54 (B1): Reasonably accurate in familiar contexts.
  15-34 (A2): Basic patterns but frequent errors. 0-14 (A1): Very limited control, meaning often unclear.

- range: Range of vocabulary and grammatical structures.
  90-100 (C2): Wide vocabulary including idioms, precise and varied structures. 75-89 (C1): Broad lexical repertoire, gaps covered by paraphrasing.
  55-74 (B2): Good range on familiar topics, varied structures. 35-54 (B1): Sufficient for routine situations, noticeable repetition.
  15-34 (A2): Limited vocabulary, relies on simple words. 0-14 (A1): Very basic words only.

- interaction: Ability to respond relevantly and maintain conversation.
  90-100 (C2): Interacts effortlessly, leads conversation. 75-89 (C1): Uses language flexibly for professional purposes.
  55-74 (B2): Interacts with spontaneity on familiar topics. 35-54 (B1): Keeps conversation going, responses adequate.
  15-34 (A2): Simple interaction, short responses to basic questions. 0-14 (A1): Minimal or off-topic; fails to maintain exchange.
  — Score below 35 if responses are under 10 words, off-topic, or fail to address what was asked.

- coherence: Logical organization, use of connectors, discourse structure.
  90-100 (C2): Full discourse markers, highly cohesive. 75-89 (C1): Clear, well-organized with appropriate connectors.
  55-74 (B2): Clear descriptions, logically connected ideas. 35-54 (B1): Basic connectors used (and, but, because, then).
  15-34 (A2): Simple sequences, minimal connectors. 0-14 (A1): No logical connection, just isolated words or phrases.

CRITICAL RULES:
- "strengths": Exactly 2 items. Each MUST start with [AxisName Score] in brackets. Then QUOTE a specific phrase the user actually said that demonstrates the strength. Be concrete — do NOT write vague praise.${isJa ? " Write content in Japanese but keep [AxisName Score] in English." : ""}
  Example: "[Accuracy 78]: You correctly used past tense in 'we had discussed this last week' — tense agreement was accurate throughout."
- "improvements": Exactly 2 items. Each MUST start with [AxisName Score]. QUOTE the user's actual phrase, then show a better version. Be specific.${isJa ? " Write content in Japanese but keep [AxisName Score] in English." : ""}
  Example: "[Coherence 52]: You said 'I want to make the budget more. It is important.' — better: 'I'd like to increase the budget because it's critical for Q3 delivery.'"
- "naturalExpressions": Pick 2-4 of the most useful corrections from across ALL turns. Return [] if English was already natural.
- "naturalExpressions[].explanation": One sentence why it sounds more natural.${isJa ? " Write in Japanese." : ""}
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
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json({ ...data, wordCount: totalWords });
  } catch (error) {
    console.error("feedback error:", error);
    return NextResponse.json({ error: "Failed to get feedback" }, { status: 500 });
  }
}
