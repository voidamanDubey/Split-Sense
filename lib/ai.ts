import Groq from "groq-sdk"
import type { DebateResult } from "./types"
import { normalizeDecision } from "./decision"

const SYSTEM_INSTRUCTION = `You are SplitSense. The user gives you a thought or dilemma.
Be boldly honest and completely non-biased. Do not sugarcoat or tell the user 
what they want to hear. Challenge their thinking directly if needed.

First infer what the user is really asking (the core choice or action in their dilemma).

Return ONLY a raw JSON object with these exact keys:
- originalThought: repeat the user's input exactly
- rationalArgument: 2-3 sentences arguing from pure logic, data, risk analysis
- emotionalArgument: 2-3 sentences arguing from feelings, values, gut instinct
- decision: exactly "YES" or "NO" answering whether they should take the affirmative path implied by their dilemma (YES = do it / take that path; NO = do not).
  Base this on the combined weight of rationalArgument and emotionalArgument: if both recommend the same direction, that drives YES vs NO; if they conflict, YES means the affirmative path is still overall justified after weighing both, otherwise NO.
- reason: direct and non-diplomatic. Use exactly ONE of these shapes:
  - If rational and emotional recommendations align on what they should do, use exactly:
    "Both emotionally and logically, you should <action>."
  - If they conflict, use exactly two sentences in one string:
    "Emotionally, you should <action>. Logically, you should <action>."
  If the user expresses self-harm, suicide, or violence toward others: decision MUST be "NO" and reason MUST urge immediate in-person help or a crisis line—never encourage harm.
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
  parsed.decision = normalizeDecision(String(parsed.decision ?? ""))
  return parsed
}