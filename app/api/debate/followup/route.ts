import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const FOLLOWUP_PROMPT = `You are SplitSense. The user is having a conversation about a dilemma.
They have countered or responded to the initial Logic and Emotion arguments.
Respond as both voices reacting to the user's latest message.

Be boldly honest and completely non-biased. Do not sugarcoat or tell the user 
what they want to hear. Challenge their thinking directly if needed.

Return ONLY a raw JSON object with these exact keys:
- logicReply: 2-3 sentences responding from pure logic to the user's counter
- emotionReply: 2-3 sentences responding from pure emotion to the user's counter
- decision: exactly "SAVE" or "FORGET" based on the updated context after this counter
- reason: one direct sentence.
  If logic and emotion disagree, format exactly:
  "Emotionally, you should <action>. Logically, you should <action>."
  If they agree, format exactly:
  "Both emotionally and logically, you should <action>."

No markdown, no code fences, no explanation. Raw JSON only.`

function stripDecisionLeak(text: string) {
  return text
    .replace(/[\s,]*["']?decision["']?\s*[:=-]\s*["']?(SAVE|FORGET)["']?/gi, "")
    .replace(/[\s,]*["']?reason["']?\s*[:=-]\s*[\s\S]*$/gi, "")
    .replace(/\s+\}/g, " ")
    .trim()
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
      decision: "SAVE" | "FORGET"
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
        decision: "SAVE" | "FORGET"
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
    const decisionMatch = cleaned.match(/["']?decision["']?\s*[:=-]\s*["']?(SAVE|FORGET)["']?/i)
    const reasonMatch = cleaned.match(
      /["']?reason["']?\s*[:=-]\s*(?:"([^"]+)"|'([^']+)'|([\s\S]*?))(?=$|\n\s*["']?[A-Za-z_])/i
    )
    const decision = (decisionMatch?.[1] || "").toUpperCase() as "SAVE" | "FORGET"
    const reason = (reasonMatch?.[1] || reasonMatch?.[2] || reasonMatch?.[3] || "").trim()
    if (logicReply && emotionReply && (decision === "SAVE" || decision === "FORGET") && reason) {
      return { logicReply, emotionReply, decision, reason }
    }
  }

  const logicBlock = cleaned.match(/(?:^|\n)\s*logic\s*[:\-]\s*([\s\S]*?)(?=\n\s*emotion\s*[:\-]|$)/i)
  const emotionBlock = cleaned.match(/(?:^|\n)\s*emotion\s*[:\-]\s*([\s\S]*)$/i)
  if (logicBlock && emotionBlock) {
    const logicReply = stripDecisionLeak(logicBlock[1].trim())
    const emotionReply = stripDecisionLeak(emotionBlock[1].trim())
    const decisionMatch = cleaned.match(/["']?decision["']?\s*[:=-]\s*["']?(SAVE|FORGET)["']?/i)
    const reasonMatch = cleaned.match(/["']?reason["']?\s*[:=-]\s*([\s\S]*)$/i)
    const decision = (decisionMatch?.[1] || "").toUpperCase() as "SAVE" | "FORGET"
    const reason = (reasonMatch?.[1] || "").trim()
    if (logicReply && emotionReply && (decision === "SAVE" || decision === "FORGET") && reason) {
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
      decision: "SAVE" | "FORGET"
      reason: string
    }
    try {
      parsed = extractJsonObject(jsonText)
    } catch {
      parsed = parseFollowupLenient(jsonText)
    }
    if (
      !parsed.logicReply ||
      !parsed.emotionReply ||
      (parsed.decision !== "SAVE" && parsed.decision !== "FORGET") ||
      !parsed.reason
    ) {
      throw new Error("Follow-up response missing required fields")
    }

    parsed.logicReply = stripDecisionLeak(parsed.logicReply)
    parsed.emotionReply = stripDecisionLeak(parsed.emotionReply)

    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    )
  }
}