import type { StoredDecision } from "./decision"

export interface DebateResult {
  originalThought: string
  rationalArgument: string
  emotionalArgument: string
  decision: StoredDecision
  reason: string
  timestamp: number
}

// For Convex document (includes the auto-generated _id)
interface DebateDocument extends DebateResult {
  _id: string
}
