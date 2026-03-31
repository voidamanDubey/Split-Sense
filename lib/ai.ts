import Groq from "groq-sdk"
import type { DebateResult } from "./types"

const SYSTEM_INSTRUCTION = `You are SplitSense. The user gives you a thought or dilemma.
Be boldly honest and completely non-biased. Do not sugarcoat or tell the user 
what they want to hear. Challenge their thinking directly if needed.

Return ONLY a raw JSON object with these exact keys:
- originalThought: repeat the user's input exactly
- rationalArgument: 2-3 sentences arguing from pure logic, data, risk analysis
- emotionalArgument: 2-3 sentences arguing from feelings, values, gut instinct
- decision: exactly 'SAVE' if this thought deserves action or attention, 'FORGET' if they should let it go
- reason: one sentence that is direct and non-diplomatic.
  If logic and emotion point to different actions, format exactly:
  "Emotionally, you should <action>. Logically, you should <action>."
  If they align, format exactly:
  "Both emotionally and logically, you should <action>."
- timestamp: current unix timestamp as a number
No markdown, no code fences, no explanation. Raw JSON only.`

export async function callGemini(userThought: string): Promise<DebateResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set")
  }

  const groq = new Groq({ apiKey })

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: userThought }
    ],
    temperature: 0.7,
  })

  const text = completion.choices[0]?.message?.content?.trim() ?? ""
  const jsonText = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()

  const parsed = JSON.parse(jsonText) as DebateResult
  parsed.timestamp = Date.now()
  return parsed
}