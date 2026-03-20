import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import type { Difficulty, Industry, PersonaStyle } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const INDUSTRIES: Record<Industry, string> = {
  technology: "tech/software/startup",
  finance: "banking/investment/fintech",
  consulting: "management consulting/advisory",
  healthcare: "pharma/hospital/medtech",
  retail: "e-commerce/consumer goods/FMCG",
  manufacturing: "industrial/supply chain/operations",
  general: "general business",
};

const PERSONAS: Record<PersonaStyle, string> = {
  friendly: "warm and collaborative, easy to talk to",
  skeptical: "doubtful and questioning, needs convincing with data",
  tough: "demanding and assertive, pushes back hard",
  neutral: "professional and balanced, straightforward",
  enthusiastic: "energetic and positive, looking for opportunities",
};

const DIFFICULTIES: Record<Difficulty, string> = {
  beginner:
    "CEFR A2-B1 only. Extremely easy, low-stakes situation. No business jargon whatsoever. " +
    "Friendly small-talk level. Counterpart is very patient and encouraging. " +
    "Short simple sentences only. Example: asking for a meeting time, introducing yourself, saying thank you.",
  intermediate:
    "CEFR B1-B2. Conversational business English. Accessible vocabulary. " +
    "Counterpart is professional but approachable. Mild challenges only. Real but manageable situations.",
  advanced:
    "CEFR C1-C2. Sophisticated business language, complex negotiations, high stakes. " +
    "Counterpart is challenging and demanding. Use industry-specific terminology.",
};

export async function POST(req: NextRequest) {
  try {
    const { difficulty, industry, personaStyle } = await req.json() as {
      difficulty: Difficulty;
      industry: Industry;
      personaStyle: PersonaStyle;
    };

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a business English scenario generator. Always return valid JSON only, no markdown, no backticks.",
        },
        {
          role: "user",
          content: `Generate a realistic business English speaking scenario for practice.

Industry: ${INDUSTRIES[industry]}
Difficulty: ${difficulty} — ${DIFFICULTIES[difficulty]}
Counterpart persona: ${PERSONAS[personaStyle]}

Return ONLY valid JSON with this exact structure:
{
  "category": "<one of: Negotiation, Sales, 1-on-1, Cross-team, Presentation, Client Meeting, Performance Review, Crisis Management, Partnership, Hiring>",
  "title": "<concise action-oriented title, max 8 words>",
  "brief": "<2 sentences: situation context + what the user needs to achieve>",
  "opener": "<what the counterpart says first, 1-2 sentences, natural spoken English>",
  "keyPhrases": ["<phrase1>", "<phrase2>", "<phrase3>", "<phrase4>", "<phrase5>"],
  "personaName": "<realistic first name>",
  "personaRole": "<job title, e.g. CFO, Product Manager, Client Director>"
}

Requirements:
- Make it a specific, realistic scenario (include numbers, context, stakes)
- Opener should feel natural, not scripted
- Key phrases should be business vocabulary relevant to the scenario
- Vary the scenario type`,
        },
      ],
      temperature: 0.9,
      max_tokens: 600,
    });

    const text = completion.choices[0].message.content?.trim() ?? "";
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json({ ...data, difficulty, industry, personaStyle });
  } catch (error) {
    console.error("generate-scenario error:", error);
    return NextResponse.json({ error: "Failed to generate scenario" }, { status: 500 });
  }
}
