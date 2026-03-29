type Decision = "SAVE" | "FORGET"

export interface DebateResult {
  originalThought: string
  rationalArgument: string
  emotionalArgument: string
  decision: Decision
  reason: string
  timestamp: number
}

// For Convex document (includes the auto-generated _id)
interface DebateDocument extends DebateResult {
  _id: string
}
