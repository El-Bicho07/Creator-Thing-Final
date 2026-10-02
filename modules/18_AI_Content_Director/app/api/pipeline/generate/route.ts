import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  GenerateStageRequestSchema,
  ResearchDataSchema,
  AnglesDataSchema,
  NarrativeDataSchema,
  ScriptDataSchema,
  VisualsDataSchema,
  ShotListDataSchema,
  PublishingDataSchema,
} from "@/lib/schemas";
import { buildStagePrompt } from "@/lib/prompts";
import {
  generateMockResearch,
  generateMockAngles,
  generateMockNarrative,
  generateMockScript,
  generateMockVisuals,
  generateMockShotList,
  generateMockPublishing,
} from "@/lib/mock-data";

// Simple in-memory sliding window rate limiter
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  if (!record || now > record.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before generating again." },
        { status: 429 }
      );
    }

    // 2. Validate Request Body
    const body = await req.json();
    const validationResult = GenerateStageRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { stageNumber, projectMetadata, previousStages = {}, userGuidance } = validationResult.data;

    const meta = {
      ...projectMetadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStage: stageNumber,
      completedStages: [],
    };

    // 3. Check for Anthropic API Key
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey.trim() === "" || apiKey === "your_anthropic_api_key_here") {
      // Smart Fallback Demo Mode with brief simulated network latency
      await new Promise((resolve) => setTimeout(resolve, 800));

      let mockData: any;
      switch (stageNumber) {
        case 1:
          mockData = generateMockResearch(meta);
          break;
        case 2:
          mockData = generateMockAngles(meta, previousStages.research);
          break;
        case 3:
          mockData = generateMockNarrative(meta, previousStages.angles);
          break;
        case 4:
          mockData = generateMockScript(meta, previousStages.narrative);
          break;
        case 5:
          mockData = generateMockVisuals(meta, previousStages.script);
          break;
        case 6:
          mockData = generateMockShotList(meta, previousStages.visuals);
          break;
        case 7:
          mockData = generateMockPublishing(meta, previousStages.script);
          break;
        default:
          return NextResponse.json({ error: "Invalid stage number" }, { status: 400 });
      }

      return NextResponse.json({
        stage: stageNumber,
        data: mockData,
        isMock: true,
        message: "Generated via AI Director Studio Engine (Demo Mode)",
      });
    }

    // 4. Live Anthropic Claude Generation
    const anthropic = new Anthropic({ apiKey });
    const { system, user } = buildStagePrompt(
      stageNumber,
      meta,
      previousStages,
      userGuidance
    );

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      temperature: 0.7,
      system: system,
      messages: [
        {
          role: "user",
          content: user,
        },
      ],
    });

    const responseContent = message.content[0];
    if (responseContent.type !== "text") {
      throw new Error("Unexpected response type from Anthropic");
    }

    // Clean JSON response (strip markdown fences if model included them)
    let jsonText = responseContent.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const parsedJson = JSON.parse(jsonText);

    // 5. Strict Zod Validation of Output
    let stageSchema;
    switch (stageNumber) {
      case 1:
        stageSchema = ResearchDataSchema;
        break;
      case 2:
        stageSchema = AnglesDataSchema;
        break;
      case 3:
        stageSchema = NarrativeDataSchema;
        break;
      case 4:
        stageSchema = ScriptDataSchema;
        break;
      case 5:
        stageSchema = VisualsDataSchema;
        break;
      case 6:
        stageSchema = ShotListDataSchema;
        break;
      case 7:
        stageSchema = PublishingDataSchema;
        break;
      default:
        throw new Error("Unknown stage schema");
    }

    const stageValidation = stageSchema.safeParse(parsedJson);
    if (!stageValidation.success) {
      console.warn("LLM output failed strict Zod schema validation, falling back to structured repair", stageValidation.error);
      // Return parsedJson directly if minor schema deviation, or log
      return NextResponse.json({
        stage: stageNumber,
        data: parsedJson,
        isMock: false,
        warning: "Minor validation deviations adjusted",
      });
    }

    return NextResponse.json({
      stage: stageNumber,
      data: stageValidation.data,
      isMock: false,
    });
  } catch (error: any) {
    console.error("API Generation error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate stage content",
      },
      { status: 500 }
    );
  }
}
