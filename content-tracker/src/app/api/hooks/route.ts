import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  const title = body.title.trim();

  // Check for API key upfront so we return a clear message instead of a cryptic
  // SDK error.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
      },
      { status: 500 }
    );
  }

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are a short-form video content strategist. The creator is @angeldoestuff, a bilingual NZ/Chinese creator posting daily China lifestyle, culture, and business content on Instagram Reels.

Suggest 3 viral hook formats for this video idea: "${title}"

Format each hook as a short one-liner the creator could use as their opening line or video angle. Be specific, punchy, and optimised for Instagram Reels retention.

Return JSON only: { "hooks": ["hook 1", "hook 2", "hook 3"] }`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 500 }
      );
    }

    // Tolerate markdown code fences, leading prose, etc. — grab the first JSON
    // object in the response.
    const raw = textBlock.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;

    let parsed: { hooks?: unknown };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Could not parse AI response as JSON. Raw text:", raw);
      return NextResponse.json(
        { error: "AI returned a non-JSON response. Check server logs." },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsed.hooks)) {
      return NextResponse.json(
        { error: "AI response missing 'hooks' array" },
        { status: 500 }
      );
    }

    return NextResponse.json({ hooks: parsed.hooks });
  } catch (error) {
    console.error("AI hook generation failed:", error);
    const detail =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Anthropic API call failed: ${detail}` },
      { status: 500 }
    );
  }
}
