import { NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { callGemini } from "@/lib/ai"
import { api } from "@/convex/_generated/api"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

export async function POST(request: Request) {
  try {
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
    }

    const body = await request.json()
    const { userThought } = body as { userThought?: string }

    if (typeof userThought !== "string") {
      throw new Error("userThought is required")
    }

    const debateResult = await callGemini(userThought)

    const convex = new ConvexHttpClient(convexUrl)
    await convex.mutation(api.debates.saveDebate, {
      originalThought: debateResult.originalThought,
      rationalArgument: debateResult.rationalArgument,
      emotionalArgument: debateResult.emotionalArgument,
      decision: debateResult.decision,
      reason: debateResult.reason,
      timestamp: debateResult.timestamp,
    })

    return NextResponse.json(debateResult)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}
