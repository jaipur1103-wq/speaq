import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { scenarioBrief, conversationSoFar, lastCounterpartMessage, language } = await req.json();
    const isJa = language === "ja";

    const prompt = `You are an English speaking coach helping a Japanese business person practice English conversation.

Scenario: ${scenarioBrief}
Last message from counterpart: "${lastCounterpartMessage}"
${conversationSoFar ? `Conversation so far:\n${conversationSoFar}` : ""}

Generate a 3-level hint for how the learner could respond. Return ONLY valid JSON, no markdown, no backticks.

{
  "keywords": ["keyword or short phrase 1", "keyword or short phrase 2", "keyword or short phrase 3"],
  "starter": "A sentence starter, ending with ...",
  "full": "A complete natural response example"
}

Rules:
- keywords: 2-4 useful words/short phrases they could use (English only)
- starter: First 6-10 words of a natural response, ending with "..." (English only)
- full: A complete, natural 1-2 sentence response (English only)
- Keep it appropriate for ${isJa ? "intermediate Japanese business learner" : "business English learner"}
- Be concise and natural`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 300,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const hint = JSON.parse(jsonMatch[0]);
    return NextResponse.json(hint);
  } catch (e) {
    console.error("hint error", e);
    return NextResponse.json({ error: "Failed to generate hint" }, { status: 500 });
  }
}
