import { NextResponse } from "next/server";
import { DEMO_RESULT } from "@/lib/demo";
import { MIN_CHARS, Result } from "@/lib/types";
export const maxDuration = 60;
const err = (error: string, status = 400) => NextResponse.json({ error }, { status });
const demo = (notice: string) => NextResponse.json({ ...DEMO_RESULT, demo: true, notice });
const isStr = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0;

function valid(x: any): x is Result {
  return x && isStr(x.title) && Array.isArray(x.alternativeTitles) && x.alternativeTitles.every(isStr) && isStr(x.description) &&
    Array.isArray(x.chapters) && x.chapters.length > 0 && x.chapters.every((c: any) => isStr(c?.timestamp) && isStr(c?.title) && isStr(c?.summary)) &&
    Array.isArray(x.highlights) && x.highlights.length > 0 && x.highlights.every((h: any) => isStr(h?.timestamp) && isStr(h?.title) && isStr(h?.text) && isStr(h?.reason) && isStr(h?.type));
}

const PROMPT = `You are an expert podcast producer. Analyze the COMPLETE transcript below and return ONLY JSON:
{"title":string,"alternativeTitles":[3 strings],"description":string (100-160 words),"chapters":[{"timestamp":string,"title":string,"summary":string}] (5-10 items),"highlights":[{"timestamp":string,"title":string,"text":string,"reason":string,"type":string}] (5-8 items)}
Rules:
- Use only facts stated in the transcript. Never invent facts, names, numbers or quotes. Highlight "text" must be an exact quote from the transcript.
- Use the transcript's own timestamps when present (format as MM:SS or HH:MM:SS). If there are none, estimate proportionally and write the timestamp like "~12:00 (AI estimated)".
- Chapters must follow meaningful topic changes, in chronological order, first chapter starting at the beginning.
- "type" is a short label such as Key insight, Quotable, Advice, Data point, Story, Warning.`;

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return err("Invalid request."); }
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) return err("Please provide a transcript.");
  if (transcript.length < MIN_CHARS) return err(`Transcript is too short. Add at least ${MIN_CHARS} characters.`);
  if (transcript.length > 400_000) return err("Transcript is too long (max 400,000 characters).", 413);

  const key = process.env.GEMINI_API_KEY;
  if (!key) return demo("Demo Mode: no GEMINI_API_KEY is set, so sample results are shown.");

  const section = typeof body.section === "string" ? body.section : "";
  const extra = section ? `\nThis is a regeneration of the "${section}" section: give a fresh, noticeably different take on it while still following all rules.` : "";
  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${PROMPT}${extra}\n\nTRANSCRIPT:\n${transcript}` }] }],
        generationConfig: { responseMimeType: "application/json", temperature: section ? 0.9 : 0.4 },
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok) {
  const errorText = await res.text();
  console.error("Gemini API error:", res.status, errorText);

  if (res.status === 503) {
    return err(
      "Gemini is temporarily busy. Please try again in a few seconds.",
      503
    );
  }

  return err(
    `Gemini API error (${res.status}): ${errorText}`,
    res.status
  );
}
    const data = await res.json();
    const raw: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
    let parsed: unknown;
    try { parsed = JSON.parse(raw.replace(/^```json|```$/gm, "").trim()); } catch { return err("The AI returned an unreadable response. Please try again.", 502); }
    if (!valid(parsed)) return err("The AI response was incomplete. Please try again.", 502);
    const { title, alternativeTitles, description, chapters, highlights } = parsed;
    return NextResponse.json({ title, alternativeTitles: alternativeTitles.slice(0, 3), description, chapters, highlights });
  } catch {
    return demo("Demo Mode: couldn't reach Gemini. Showing sample results.");
  }
}
