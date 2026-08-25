/** Stored in Convex; older rows may still use SAVE/FORGET. */
export type StoredDecision = "YES" | "NO" | "SAVE" | "FORGET"

export function normalizeDecision(raw: string | undefined): "YES" | "NO" {
  const u = (raw ?? "").toUpperCase().trim()
  if (u === "YES" || u === "SAVE") return "YES"
  if (u === "NO" || u === "FORGET") return "NO"
  return "NO"
}

export function decisionIsYes(d: string | undefined): boolean {
  return normalizeDecision(d) === "YES"
}
