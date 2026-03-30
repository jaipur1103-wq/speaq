import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { chunk, question, userResponse, lang } = await req.json();
    const isJa = lang === "ja";

    const prompt = `You are an English speaking coach evaluating a learner's response.

Target chunk expression: "${chunk}"
AI question: "${question}"
Learner's response: "${userResponse}"

Evaluate whether the learner successfully used the chunk expression. Return ONLY valid JSON, no markdown, no backticks:

{
  "used": true or false,
  "reason": "explanation of why they could not use it (only when used is false)",
  "modelAnswer": "a natural 1-2 sentence model answer that uses the chunk expression"
}

Rules:
- "used": true if the learner used the chunk expression correctly (or very close to it). false if they did not use it, or used it with a clear grammar/vocabulary error.
- "reason": only required when used is false. Explain specifically why: did they miss the opportunity (used different words instead), or did they attempt it but made a grammar error, or a vocabulary error? Be specific and concise (1-2 sentences). ${isJa ? "Write in Japanese." : "Write in English."}
- "modelAnswer": always provide a natural example answer using the chunk. English only.`;

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
