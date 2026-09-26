import { NextResponse } from "next/server";
import { validateVerify, InvalidRequestError } from "@/lib/validation";
import { verifyAttempt } from "@/lib/attempt";
import { generateVerification } from "@/lib/feedback";
import { getQuestion } from "@/lib/course";
import { ProviderError } from "@/lib/openrouter";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const req = validateVerify(body);

    const secret = process.env.ATTEMPT_SIGNING_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: { code: "CONFIGURATION_ERROR", message: "Server configuration missing" } },
        { status: 500 }
      );
    }

    const token = verifyAttempt(req.attemptId, secret);
    if (!token) {
      return NextResponse.json(
        { error: { code: "INVALID_ATTEMPT", message: "Invalid or expired attempt token." } },
        { status: 400 }
      );
    }

    if (token.nextQuestionId !== req.nextQuestionId) {
      return NextResponse.json(
        { error: { code: "INVALID_ATTEMPT", message: "Mismatched question for verification." } },
        { status: 400 }
      );
    }

    const config = {
      apiKey: process.env.OPENROUTER_API_KEY || "",
      jevModel: process.env.OPENROUTER_JEV_MODEL || "typesafe/jev-1.13",
      generativeModel: process.env.OPENROUTER_GENERATIVE_MODEL || "deepseek/deepseek-v4.1-flash",
      signingSecret: secret,
    };

    if (!config.apiKey) {
      return NextResponse.json(
        { error: { code: "CONFIGURATION_ERROR", message: "Server configuration missing" } },
        { status: 500 }
      );
    }

    // Load question context
    let questionContext;
    try {
      questionContext = getQuestion(token.courseId, req.nextQuestionId);
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: "Unknown question." } },
        { status: 400 }
      );
    }

    const assessmentContext = {
      ...questionContext,
      answer: req.answer,
      explanation: req.explanation,
    };

    const verification = await generateVerification(assessmentContext, config);

    return NextResponse.json(verification, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": crypto.randomUUID(),
      }
    });

  } catch (error) {
    if (error instanceof InvalidRequestError) {
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: error.message } },
        { status: 400 }
      );
    }
    
    if (error instanceof ProviderError) {
      console.error("[Verify Provider Error]:", error.message);
      return NextResponse.json(
        { error: { code: "PROVIDER_FAILURE", message: "Live verification model failed." } },
        { status: 502 }
      );
    }
    
    console.error("[Verify Unexpected Error]:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
      { status: 500 }
    );
  }
}
