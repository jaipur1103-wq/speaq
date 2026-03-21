import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { texts } = await req.json();
    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ translations: [] });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a translator. Translate English text to natural Japanese. Return only valid JSON, no markdown.",
        },
        {
          role: "user",
          content: `Translate each of these texts to Japanese. Return JSON: { "translations": ["<japanese1>", "<japanese2>", ...] }

Texts:
${texts.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 800,
    });

    const text = completion.choices[0].message.content?.trim() ?? "";
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(cleaned);
    return NextResponse.json({ translations: data.translations ?? [] });
  } catch (error) {
    console.error("translate error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
