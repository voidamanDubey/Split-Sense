import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  debates: defineTable({
    originalThought: v.string(),
    rationalArgument: v.string(),
    emotionalArgument: v.string(),
    decision: v.union(
      v.literal("YES"),
      v.literal("NO"),
      v.literal("SAVE"),
      v.literal("FORGET")
    ),
    reason: v.string(),
    timestamp: v.number(),
    saved: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
    userId: v.optional(v.string()),
    shareId: v.optional(v.string()),
    messages: v.optional(v.array(v.object({
      role: v.string(),
      content: v.string(),
      decision: v.optional(v.string()),
    }))),
  }),
})