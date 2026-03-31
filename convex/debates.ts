import { internalMutation, mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"

function normalizeTimestamp(timestamp: number) {
  // Accept both unix seconds and unix milliseconds.
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
}

export const deleteExpiredDebateIfExpired = internalMutation({
  args: { id: v.id("debates") },
  handler: async (ctx, args) => {
    const debate = await ctx.db.get(args.id)
    if (!debate) return

    // Only delete when the doc is still marked as not-saved and its expiry has passed.
    if (debate.saved === true) return
    if (!debate.expiresAt) return
    if (debate.expiresAt > Date.now()) return

    await ctx.db.delete(args.id)
  },
})

export const saveDebate = mutation({
  args: {
    originalThought: v.string(),
    rationalArgument: v.string(),
    emotionalArgument: v.string(),
    decision: v.union(v.literal("SAVE"), v.literal("FORGET")),
    reason: v.string(),
    timestamp: v.number(),
    saved: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const normalizedTimestamp = normalizeTimestamp(args.timestamp)
    const expiresAt = args.saved === true ? undefined : now + 30 * 24 * 60 * 60 * 1000

    const id = await ctx.db.insert("debates", {
      ...args,
      timestamp: normalizedTimestamp,
      expiresAt,
    })

    // Dismissed debates should self-delete after 30 days.
    if (expiresAt) {
      const delayMs = Math.max(0, expiresAt - now)
      await ctx.scheduler.runAfter(
        delayMs,
        internal.debates.deleteExpiredDebateIfExpired,
        { id }
      )
    }

    return id
  },
})

export const markAsSaved = mutation({
  args: { id: v.id("debates") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { saved: true, expiresAt: undefined })
  },
})

export const deleteDebate = mutation({
  args: { id: v.id("debates"), userId: v.string() },
  handler: async (ctx, args) => {
    const debate = await ctx.db.get(args.id)
    if (!debate) return
    if (debate.userId !== args.userId) return
    await ctx.db.delete(args.id)
  },
})

export const getAllDebates = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const debates = await ctx.db.query("debates").collect()
    return debates
      .filter((d) => d.userId === args.userId)
      // Only show saved debates in history.
      .filter((d) => d.saved === true)
      .sort((a, b) => normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp))
      .map((d) => ({
        ...d,
        timestamp: normalizeTimestamp(d.timestamp),
      }))
  },
})

export const getRecentDebates = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    const debates = await ctx.db.query("debates").collect()
    return debates
      .filter((d) => d.userId === args.userId)
      .sort((a, b) => normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp))
      .slice(0, limit)
      .map((d) => ({
        _id: d._id,
        originalThought: d.originalThought,
        rationalArgument: d.rationalArgument,
        emotionalArgument: d.emotionalArgument,
        decision: d.decision,
        reason: d.reason,
        timestamp: normalizeTimestamp(d.timestamp),
      }))
  },
})

export const deleteExpiredDebates = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const all = await ctx.db.query("debates").collect()
    for (const debate of all) {
      if (debate.expiresAt && debate.expiresAt < now) {
        await ctx.db.delete(debate._id)
      }
    }
  },
})