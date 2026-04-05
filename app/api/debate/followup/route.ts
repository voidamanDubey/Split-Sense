import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { normalizeDecision } from "@/lib/decision"

const FOLLOWUP_PROMPT = `You are SplitSense. The user is having a conversation about a dilemma.
They have countered or responded to the initial Logic and Emotion arguments.
Respond as both voices reacting to the user's latest message.

Be boldly honest and completely non-biased. Do not sugarcoat or tell the user 
what they want to hear. Challenge their thinking directly if needed.

Infer the core choice in the dilemma. Return ONLY a raw JSON object with these exact keys:
- logicReply: 2-3 sentences responding from pure logic to the user's counter
- emotionReply: 2-3 sentences responding from pure emotion to the user's counter
- decision: exactly "YES", "NO", or "RESOLVED". Use "YES" or "NO" to indicate whether they should take the affirmative path (based on combined weight of logicReply and emotionReply; if those conflict, pick YES only if the affirmative path is still overall justified). Use "RESOLVED" ONLY when the user shows clear peaceful closure like "ok I won't", "thanks", "you're right", "that makes sense", "I'll think about it". Do NOT use "RESOLVED" for defiance or rebellion like "I'll do it anyway", "I don't care", "screw it" — those get a firm YES or NO with a stronger pushback.
- reason: direct. Use exactly ONE of these shapes:
  - If logic and emotion align: "Both emotionally and logically, you should <action>."
  - If they conflict: "Emotionally, you should <action>. Logically, you should <action>."
  If self-harm, suicide, or violence: decision MUST be "NO" and reason MUST urge immediate help—never encourage harm.

No markdown, no code fences, no explanation. Raw JSON only.`

function stripDecisionLeak(text: string) {
  return text
    .replace(/^\s*["']?(logicReply|emotionReply)["']?\s*[:=-]\s*/i, "")
    .replace(/[\s,]*["']?logicReply["']?\s*[:=-]\s*/gi, " ")
    .replace(/[\s,]*["']?emotionReply["']?\s*[:=-]\s*/gi, " ")
    .replace(/[\s,]*["']?decision["']?\s*[:=-]\s*["']?(YES|NO|SAVE|FORGET)["']?/gi, "")
    .replace(/[\s,]*["']?reason["']?\s*[:=-]\s*[\s\S]*$/gi, "")
    .replace(/\s+\}/g, " ")
    .trim()
}

function stripEmotionFromLogic(logicReply: string, emotionReply: string) {
  let logic = logicReply.trim()
  const emotion = emotionReply.trim()

  // If model accidentally pasted the Emotion section into logic, cut it out.
  const emotionSectionIdx = logic.search(/\bEMOTION\b\s*[:\-]/i)
  if (emotionSectionIdx !== -1) {
    logic = logic.slice(0, emotionSectionIdx).trim()
  }

  // If logic contains the full emotion reply (common failure), remove the duplicated tail.
  if (emotion.length >= 20) {
    const idx = logic.indexOf(emotion)
    if (idx !== -1) {
      logic = logic.slice(0, idx).trim()
    }
  }

  // Remove any trailing punctuation left behind.
  logic = logic.replace(/[\s,;:.-]+$/g, "").trim()
  return logic
}

function extractJsonObject(text: string) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()

  try {
    return JSON.parse(cleaned) as {
      logicReply: string
      emotionReply: string
      decision: "YES" | "NO" | "SAVE" | "FORGET" | "RESOLVED"
      reason: string
    }
  } catch {
    const firstBrace = cleaned.indexOf("{")
    const lastBrace = cleaned.lastIndexOf("}")
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sliced = cleaned.slice(firstBrace, lastBrace + 1)
      return JSON.parse(sliced) as {
        logicReply: string
        emotionReply: string
        decision: "YES" | "NO" | "SAVE" | "FORGET" | "RESOLVED"
        reason: string
      }
    }
    throw new Error("Model returned invalid follow-up JSON")
  }
}

function parseFollowupLenient(text: string) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()

  const logicField = cleaned.match(
    /["']?logicReply["']?\s*[:=-]\s*(?:"([^"]+)"|'([^']+)'|([^,\n][\s\S]*?))(?=,\s*["']?emotionReply["']?\s*[:=-]|$)/i
  )
  const emotionField = cleaned.match(
    /["']?emotionReply["']?\s*[:=-]\s*(?:"([^"]+)"|'([^']+)'|([\s\S]*))$/i
  )
  if (logicField && emotionField) {
    const logicReply = stripDecisionLeak((logicField[1] || logicField[2] || logicField[3] || "").trim())
    const emotionReply = stripDecisionLeak((emotionField[1] || emotionField[2] || emotionField[3] || "").trim())
    const decisionMatch = cleaned.match(/["']?decision["']?\s*[:=-]\s*["']?(YES|NO|SAVE|FORGET|RESOLVED)["']?/i)
    const reasonMatch = cleaned.match(
      /["']?reason["']?\s*[:=-]\s*(?:"([^"]+)"|'([^']+)'|([\s\S]*?))(?=$|\n\s*["']?[A-Za-z_])/i
    )
    const decision = normalizeDecision(decisionMatch?.[1] || "")
    const reason = (reasonMatch?.[1] || reasonMatch?.[2] || reasonMatch?.[3] || "").trim()
    if (logicReply && emotionReply && reason) {
      return { logicReply, emotionReply, decision, reason }
    }
  }

  const logicBlock = cleaned.match(/(?:^|\n)\s*logic\s*[:\-]\s*([\s\S]*?)(?=\n\s*emotion\s*[:\-]|$)/i)
  const emotionBlock = cleaned.match(/(?:^|\n)\s*emotion\s*[:\-]\s*([\s\S]*)$/i)
  if (logicBlock && emotionBlock) {
    const logicReply = stripDecisionLeak(logicBlock[1].trim())
    const emotionReply = stripDecisionLeak(emotionBlock[1].trim())
    const decisionMatch = cleaned.match(/["']?decision["']?\s*[:=-]\s*["']?(YES|NO|SAVE|FORGET)["']?/i)
    const reasonMatch = cleaned.match(/["']?reason["']?\s*[:=-]\s*([\s\S]*)$/i)
    const decision = normalizeDecision(decisionMatch?.[1] || "")
    const reason = (reasonMatch?.[1] || "").trim()
    if (logicReply && emotionReply && reason) {
      return { logicReply, emotionReply, decision, reason }
    }
  }

  throw new Error("Model returned invalid follow-up format")
}

export async function POST(request: Request) {
  try {
    const { originalThought, messages, userMessage } = await request.json()
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set")
    }

    const groq = new Groq({ apiKey })

    const context = messages
      .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n")

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: FOLLOWUP_PROMPT },
        {
          role: "user",
          content: `Original dilemma: ${originalThought}\n\nConversation so far:\n${context}\n\nUser just said: ${userMessage}`,
        },
      ],
      temperature: 0.7,
    })

    const text = completion.choices[0]?.message?.content?.trim() ?? ""
    const jsonText = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim()

    let parsed: {
      logicReply: string
      emotionReply: string
      decision: "YES" | "NO" | "RESOLVED"
      reason: string
    }
    try {
      const raw = extractJsonObject(jsonText)
      parsed = {
        ...raw,
        decision: normalizeDecision(String(raw.decision ?? "")),
      }
    } catch {
      parsed = parseFollowupLenient(jsonText)
    }
    if (!parsed.logicReply || !parsed.emotionReply || !parsed.reason) {
      throw new Error("Follow-up response missing required fields")
    }

    parsed.logicReply = stripDecisionLeak(parsed.logicReply)
    parsed.emotionReply = stripDecisionLeak(parsed.emotionReply)
    parsed.logicReply = stripEmotionFromLogic(parsed.logicReply, parsed.emotionReply)

    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    )
  }
}