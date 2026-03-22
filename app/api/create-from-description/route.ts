import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import type { Difficulty } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { description, difficulty } = await req.json() as { description: string; difficulty: Difficulty };

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an English speaking scenario generator. Always return valid JSON only, no markdown, no backticks.",
        },
        {
          role: "user",
          content: `Create a realistic English speaking practice scenario based on this description:
"${description}"

Difficulty: ${difficulty}

Return ONLY valid JSON with this exact structure:
{
  "category": "<choose best fit: Negotiation/Sales/1-on-1/Cross-team/Presentation/Client Meeting/Performance Review/Crisis Management/Partnership/Hiring/Travel/Restaurant/Shopping/Hotel/Social/Study/Daily Life>",
  "title": "<concise action-oriented title, max 8 words>",
  "brief": "<2 sentences: situation context + what the user needs to achieve>",
  "opener": "<what the counterpart says first, 1-2 sentences, natural spoken English>",
  "personaName": "<realistic first name>",
  "personaRole": "<job title or role, e.g. CFO, Client Manager>",
  "industry": "<general|technology|finance|consulting|healthcare|retail|manufacturing>",
  "personaStyle": "<friendly|neutral|tough>"
}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 600,
    });

    const text = completion.choices[0].message.content?.trim() ?? "";
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json({ ...data, difficulty });
  } catch (error) {
    console.error("create-from-description error:", error);
    return NextResponse.json({ error: "Failed to generate scenario" }, { status: 500 });
  }
}
