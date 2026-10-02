import { NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/cta/schema";
import { generateWithClaude, NoKeyError } from "@/lib/server/claude";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const maxDuration = 60;

const limiter = createRateLimiter({
  perMinute: Number(process.env.CUE_RATE_PER_MIN ?? 10),
  perDay: Number(process.env.CUE_RATE_PER_DAY ?? 80),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reason: "no_key" }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = limiter.check(ip);
  if (!limit.ok) return NextResponse.json({ retryAfter: limit.retryAfter }, { status: 429 });

  try {
    const { candidates, model } = await generateWithClaude(parsed.data);
    if (candidates.length === 0) return NextResponse.json({ reason: "upstream" }, { status: 503 });
    return NextResponse.json({ engine: "ai", model, candidates });
  } catch (error) {
    const reason = error instanceof NoKeyError ? "no_key" : "upstream";
    console.error("[cue] generate failed:", error);
    return NextResponse.json({ reason }, { status: 503 });
  }
}
