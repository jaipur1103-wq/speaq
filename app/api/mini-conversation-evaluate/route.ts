import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { chunk, question, userResponse, lang } = await req.json();
    const isJa = lang === "ja";

    // Strip ~ placeholders to get the core words to look for
    const coreWords = chunk.replace(/~/g, "").replace(/\s+/g, " ").trim().toLowerCase();

    const prompt = `You are checking whether a learner used a specific English expression in their response.

Target chunk: "${chunk}"
(Note: "~" in the chunk means any word can fill that slot)
Core words to look for: "${coreWords}"

Learner's response: "${userResponse}"

STEP 1 — Detection: Do the core words of "${coreWords}" appear in the learner's response (allowing for different word order or minor inflection like -s, -ed, -ing)?

STEP 2 — Grammar check: If the words are present, is the grammar of that phrase correct?

Decision rules:
- used = true  → core words are present AND grammar of the phrase is correct
- used = false → core words are absent (they used completely different words), OR they attempted the phrase but with a clear grammar error

Return ONLY valid JSON, no markdown, no backticks:
{
  "used": true or false,
  "reason": "only when used is false: was it (A) absent — they used different words, or (B) attempted but wrong grammar/vocab? Be specific, 1-2 sentences. ${isJa ? "Write in Japanese." : "Write in English."}",
  "modelAnswer": "a natural 1-2 sentence example answer using the chunk. English only."
}

Examples:
- chunk: "have great potential", response: "This project has great potential" → used: true
- chunk: "have great potential", response: "This project has a great potential" → used: false (grammar error: 'potential' is uncountable, no 'a')
- chunk: "have great potential", response: "This project is very promising" → used: false (absent: used different words)
- chunk: "run into ~ issues", response: "We ran into some technical issues" → used: true`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 250,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (e) {
    console.error("mini-conversation-evaluate error", e);
    return NextResponse.json({ error: "Failed to evaluate response" }, { status: 500 });
  }
}
