import { GoogleGenerativeAI } from "@google/generative-ai"
import type { DebateResult } from "../lib/types"

const SYSTEM_INSTRUCTION =
  `You are SplitSense. The user gives you a thought or dilemma.
Return ONLY a raw JSON object with these exact keys:
- originalThought: repeat the user's input exactly
- rationalArgument: 2-3 sentences arguing from pure logic, data, risk analysis
- emotionalArgument: 2-3 sentences arguing from feelings, values, gut instinct
- decision: exactly 'SAVE' if this thought deserves action or attention, 
  'FORGET' if they should let it go
- reason: one sentence explaining the decision
- timestamp: current unix timestamp as a number
No markdown, no code fences, no explanation. Raw JSON only.`

export async function callGemini(userThought: string): Promise<DebateResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set")
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
  })

  const result = await model.generateContent(userThought)
  const text = result.response.text().trim()
  const jsonText = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()

  return JSON.parse(jsonText) as DebateResult
}
