"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import Link from "next/link"
import Lenis from "lenis"
import { useUser, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { DebateResult } from "@/lib/types"
import type { StoredDecision } from "@/lib/decision"
import { decisionIsYes } from "@/lib/decision"

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"

//Text Animations
import ShinyText from "./components/TextAnimations/ShinyText/Shinytext"
import StarBorder from "./components/TextAnimations/StarBorder/StarBorder"
// import Gradient from "./components/TextAnimations/Gradient/Gradient"

//Animated Backgrounds import
import SoftAurora from "./components/SoftAurora/SoftAurora"
// import LiquidChrome from "./components/LiquidChrome/LiquidChrome"

//icons
import { History, MessageSquareShare, PanelLeftClose, PanelLeftOpen, Pencil, Plus, SquaresExclude, TextSearch, Trash2 } from "lucide-react"

import { useTheme } from "next-themes"



type Message =
| { role: "user" | "logic" | "emotion" | "system"; content: string; decision?: never }
| { role: "decision"; content: string; decision: string }

type RecentChat = {
  _id: string
  originalThought: string
  rationalArgument: string
  emotionalArgument: string
  decision: StoredDecision
  reason: string
  timestamp: number
  messages?: Message[]
}

function normalizeTimestamp(ts: number) {
  // If the model or DB stored unix seconds, convert to milliseconds.
  return ts < 1_000_000_000_000 ? ts * 1000 : ts
}

function useTypewriter(text: string, speed = 14, start = false, instant = false) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)
  const completedRef = useRef(false)
  const lastTextRef = useRef<string>("")

  useEffect(() => {
    // If the text changed, allow animation again (new bubble content).
    if (lastTextRef.current !== text) {
      lastTextRef.current = text
      completedRef.current = false
    }

    // Once a bubble has finished (or was instantly rendered), never re-animate it
    // unless its text changes.
    if (completedRef.current) return

    if (instant) {
      setDisplayed(text ?? "")
      setDone(true)
      completedRef.current = true
      return
    }

    if (!start || !text) return
    setDisplayed("")
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
        completedRef.current = true
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, start, speed, instant])

  return { displayed, done }
}

function TypingBubble({
  text,
  start,
  voice,
  onDone,
  instant = false,
}: {
  text: string
  start: boolean
  voice: "logic" | "emotion"
  onDone?: () => void
  instant?: boolean
}) {
  const { displayed, done } = useTypewriter(text, 14, start, instant)

  useEffect(() => {
    if (done && onDone) onDone()
  }, [done])

  const isLogic = voice === "logic"

  return (
    <div
      className={`rounded-xl p-4 animate-[fadeIn_0.350s_ease-in] will-change-transform
      ${isLogic
        ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 dark:shadow-[0_0_20px_rgba(59,130,246,0.1)]"
        : "bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 dark:shadow-[0_0_20px_rgba(59,130,246,0.1)]"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide mb-2 
        ${isLogic
          ? "text-blue-600 dark:text-blue-300"
          : "text-amber-600 dark:text-amber-300"
        }`}
      >
        {isLogic ? "Logic" : "Emotion"}
      </p>
  
      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        {displayed}
        {!done && <span className="animate-pulse">▍</span>}
      </p>
    </div>
  )
}

export default function Home() {
  const { isSignedIn, user } = useUser()
  const [thought, setThought] = useState("")
  const [result, setResult] = useState<DebateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [hasUsedFree, setHasUsedFree] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [chatStatus, setChatStatus] = useState<"active" | "saved" | "dismissed">("active")
  const [showLoginWall, setShowLoginWall] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [followUp, setFollowUp] = useState("")
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [isSidebarPinnedOpen, setIsSidebarPinnedOpen] = useState(true)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [optimisticRecent, setOptimisticRecent] = useState<RecentChat[]>([])
  const [chatSearch, setChatSearch] = useState("")
  const [chatTitleEdits, setChatTitleEdits] = useState<Map<string, string>>(new Map())
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingChatTitle, setEditingChatTitle] = useState<string>("")

  const [startLogic, setStartLogic] = useState(false)
  const [startEmotion, setStartEmotion] = useState(false)
  const [logicDone, setLogicDone] = useState(false)
  const [emotionDone, setEmotionDone] = useState(false)
  const [showDecision, setShowDecision] = useState(false)
  const [restoreInstant, setRestoreInstant] = useState(false)
  const { theme } = useTheme();
  const [pendingDecision, setPendingDecision] = useState<{ content: string; decision: string } | null>(null)
  const [pendingEmotion, setPendingEmotion] = useState<string | null>(null)
  const [isRestoredChat, setIsRestoredChat] = useState(false)
  


  const saveDebateMutation = useMutation(api.debates.saveDebate)
  const markAsSaved = useMutation(api.debates.markAsSaved)
  const deleteDebateMutation = useMutation(api.debates.deleteDebate)
  const ensureShareLinkMutation = useMutation(api.debates.ensureShareLink)
  const updateMessagesMutation = useMutation(api.debates.updateMessages)
  const recentDebates = useQuery(
    api.debates.getRecentDebates,
    user?.id ? { userId: user.id, limit: 20 } : "skip"
  )

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const AUTH_DRAFT_KEY = "splitSenseAuthDraftV1"
  const restoreInFlightRef = useRef(false)

  function persistDraftForAuth() {
    try {
      if (typeof window === "undefined") return
      sessionStorage.setItem(
        AUTH_DRAFT_KEY,
        JSON.stringify({
          thought,
          result,
          messages,
        })
      )
    } catch {
      // best-effort only
    }
  }

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    })

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  // If auth changes (Clerk modal) and we had an active draft, restore it from sessionStorage.
  useEffect(() => {
    if (!isSignedIn) return
    if (savedId !== null) return
    if (!user?.id) return
    if (restoreInFlightRef.current) return

    const raw = (() => {
      try {
        return sessionStorage.getItem(AUTH_DRAFT_KEY)
      } catch {
        return null
      }
    })()
    if (!raw) return

    const draft = JSON.parse(raw) as {
      thought?: string
      result?: DebateResult | null
      messages?: Message[]
    }
    if (!draft.thought || !draft.result || !draft.messages) return

    restoreInFlightRef.current = true
    setRestoreInstant(true)
    setThought(draft.thought)
    setResult(draft.result)
    setMessages(draft.messages)
    setIsSaved(false)
    setChatStatus("active")
    setShowDecision(true)
    setShowActions(true)
    // Ensure the conversation sections actually render after restore.
    if (draft.messages.some((m) => m.role === "logic")) {
      setStartLogic(true)
      setLogicDone(true)
    }
    if (draft.messages.some((m) => m.role === "emotion")) {
      setStartEmotion(true)
      setEmotionDone(true)
    }

    saveDebateMutation({
      ...draft.result,
      saved: false,
      userId: user.id,
    })
      .then((id) => {
        setSavedId(id)
        setActiveChatId(id as string)
        // Remove any anonymous "temp-..." entry for the same draft to avoid duplicates.
        setOptimisticRecent((prev) =>
          prev.filter(
            (c) =>
              !(
                typeof c._id === "string" &&
                c._id.startsWith("temp-") &&
                c.originalThought === draft.result!.originalThought
              )
          )
        )
      })
      .finally(() => {
        try {
          sessionStorage.removeItem(AUTH_DRAFT_KEY)
        } catch {
          // ignore
        }
        setRestoreInstant(false)
        restoreInFlightRef.current = false
      })
  }, [isSignedIn, savedId, user?.id, saveDebateMutation])

  // Auto scroll as content grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, startLogic, startEmotion, showDecision, showFollowUp, showActions, followUpLoading])

  useEffect(() => {
    if (logicDone) {
      setTimeout(() => setStartEmotion(true), 300)
    }
  }, [logicDone])

  useEffect(() => {
    if (emotionDone) {
      setTimeout(() => setShowDecision(true), 400)
      setTimeout(() => setShowActions(true), 900)
    }
  }, [emotionDone])

  async function handleSubmit() {
    if (!thought.trim()) return

    if (hasUsedFree && !isSignedIn) {
      setShowLoginWall(true)
      return
    }

    setLoading(true)
    setError("")
    setResult(null)
    setMessages([])
    setStartLogic(false)
    setStartEmotion(false)
    setLogicDone(false)
    setEmotionDone(false)
    setShowDecision(false)
    setShowFollowUp(false)
    setShowActions(false)
    setSavedId(null)
    setActiveChatId(null)
    setIsSaved(false)
    setChatStatus("active")
    setShowLoginWall(false)
    setIsRestoredChat(false)
    const thoughtSnapshot = thought.trim()
    const tempId = `temp-${Date.now()}`
    setOptimisticRecent((prev) => [
      {
        _id: tempId,
        originalThought: thoughtSnapshot,
        rationalArgument: "",
        emotionalArgument: "",
        decision: "NO",
        reason: "",
        timestamp: Date.now(),
      },
      ...prev.filter((item) => item._id !== tempId),
    ])
    setActiveChatId(tempId)

    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userThought: thought }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Something went wrong")
      }
      const data: DebateResult = await res.json()

      // Only persist to Convex when signed in. If signed out, keep it local
      // and let the post-login restore save it once with the real userId.
      const id = user?.id
        ? await saveDebateMutation({
            ...data,
            saved: false,
            userId: user.id,
          })
        : null

      setSavedId(id)
      setActiveChatId((id as string) ?? tempId)
      setResult(data)
      setMessages([
        { role: "logic", content: data.rationalArgument },
        { role: "emotion", content: data.emotionalArgument },
      ])
      setOptimisticRecent((prev) => [
        {
          _id: (id as string) ?? tempId,
          originalThought: data.originalThought,
          rationalArgument: data.rationalArgument,
          emotionalArgument: data.emotionalArgument,
          decision: data.decision,
          reason: data.reason,
          timestamp: data.timestamp,
        },
        ...prev.filter((item) => item._id !== tempId && item._id !== (id as string)),
      ])
      setHasUsedFree(true)
      setTimeout(() => setStartLogic(true), 400)
    } catch (e) {
      setOptimisticRecent((prev) => prev.filter((item) => item._id !== tempId))
      setActiveChatId(null)
      setError(e instanceof Error ? e.message : "Failed to get a response. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleFollowUp() {
    if (!followUp.trim() || !isSignedIn) return
    setFollowUpLoading(true)
    // Force the decision to refresh per turn (avoid showing stale decision while thinking).
    setShowDecision(false)

    const userMessage = followUp
    setFollowUp("")

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ]
    setMessages(newMessages)

    try {
      const res = await fetch("/api/debate/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalThought: thought,
          messages: newMessages,
          userMessage,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Something went wrong")
      }
      const data = await res.json()
      console.log("followup data:", data.decision, data.reason)

      setResult((prev) => {
        const base: DebateResult =
          prev ??
          ({
            originalThought: thought,
            rationalArgument: "",
            emotionalArgument: "",
            decision: data.decision ?? "NO",
            reason: data.reason ?? "",
            timestamp: Date.now(),
          } as DebateResult)

        return {
          ...base,
          decision: data.decision ?? base.decision,
          reason: data.reason ?? base.reason,
        }
      })
     // store pending decision to show after animation
      setPendingDecision({ content: data.reason, decision: data.decision })
      setPendingEmotion(data.emotionReply)  // ← store emotion separately so it loads in sequance
      setMessages((prev: Message[]) => [
        ...prev,
        { role: "logic" as const, content: data.logicReply },
        // { role: "emotion" as const, content: data.emotionReply },
      ])
        // save full conversation to Convex
        if (savedId) {
          const updatedMessages = [
            { role: "logic" as const, content: result?.rationalArgument ?? "" },
            { role: "emotion" as const, content: result?.emotionalArgument ?? "" },
            { role: "decision" as const, content: result?.reason ?? "", decision: String(result?.decision ?? "") }, 
            ...messages.slice(2),
            { role: "user" as const, content: userMessage },
            { role: "logic" as const, content: data.logicReply },
            { role: "emotion" as const, content: data.emotionReply },
            { role: "decision" as const, content: data.reason, decision: data.decision },
          ]
          updateMessagesMutation({
            id: savedId as any,
            messages: updatedMessages,
          })
          .then(() => console.log("✅ messages saved to Convex:", updatedMessages.length))
          .catch((e) => console.log("❌ failed to save messages:", e))
        }
      setTimeout(() => {
        setShowDecision(true)
        setShowActions(true)
      }, 50)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get a response. Please try again.")
    } finally {
      setFollowUpLoading(false)
      setShowFollowUp(true)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  async function handleSave() {
    if (!isSignedIn) return
    if (!savedId) return
    await markAsSaved({ id: savedId as any })
    setIsSaved(true)
    setChatStatus("saved")
    setShowFollowUp(false)
    setShowActions(false)
  }

  function handleNewChat() {
    setThought("")
    setResult(null)
    setError("")
    setMessages([])
    setFollowUp("")
    setFollowUpLoading(false)
    setShowFollowUp(false)
    setShowActions(false)
    setStartLogic(false)
    setStartEmotion(false)
    setLogicDone(false)
    setEmotionDone(false)
    setShowDecision(false)
    setSavedId(null)
    setActiveChatId(null)
    setIsSaved(false)
    setChatStatus("active")
    setIsRestoredChat(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleOpenRecent(debate: {
    _id: string
    originalThought: string
    rationalArgument: string
    emotionalArgument: string
    decision: StoredDecision
    reason: string
    timestamp: number
    messages?: Message[]
  }) {
    setActiveChatId(debate._id)
    setSavedId(debate._id)
    setThought(debate.originalThought)
    setResult({
      originalThought: debate.originalThought,
      rationalArgument: debate.rationalArgument,
      emotionalArgument: debate.emotionalArgument,
      decision: debate.decision,
      reason: debate.reason,
      timestamp: debate.timestamp,
    })
    setRestoreInstant(true)
     // if full conversation exists use it, otherwise just show initial response
      // if (debate.messages && debate.messages.length > 0) {
      //   setMessages(debate.messages as Message[])
      // } else {
      //   setMessages([
      //     { role: "logic", content: debate.rationalArgument },
      //     { role: "emotion", content: debate.emotionalArgument },
      //   ])
      // }
    setIsRestoredChat(true)
    setShowDecision(false)
    setShowActions(true)
    setStartLogic(false)
    setStartEmotion(false)
    setLogicDone(false)
    setEmotionDone(false)
    setChatStatus("active")
    setIsSaved(false)
    setError("")

    if (debate.messages && debate.messages.length > 0) {
      setMessages(debate.messages as Message[])
    } else {
      setMessages([
        { role: "logic", content: debate.rationalArgument },
        { role: "emotion", content: debate.emotionalArgument },
      ])
    }
  
    // set result LAST
    setResult({
      originalThought: debate.originalThought,
      rationalArgument: debate.rationalArgument,
      emotionalArgument: debate.emotionalArgument,
      decision: debate.decision,
      reason: debate.reason,
      timestamp: debate.timestamp,
    })
    
    setTimeout(() => setRestoreInstant(false), 100)
  }

  async function handleShareCurrentChat() {
    if (!result) return
    if (!user?.id || !savedId) return
    const shareId = await ensureShareLinkMutation({ id: savedId as any, userId: user.id })
    const url = `${window.location.origin}/share/${shareId}`
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "SplitSense Chat", url })
        return
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url)
  }

  const conversationMessages = isRestoredChat ? messages : messages.slice(2)
  const recentMerged = [
    ...optimisticRecent.filter(
      (item) => !recentDebates?.some((d) => String(d._id) === String(item._id))
    ),
    ...(recentDebates ?? []),
  ]
  const filteredRecentChats = useMemo(() => {
    const term = chatSearch.trim().toLowerCase()
    if (!term) return recentMerged
    return recentMerged.filter((chat) => chat.originalThought.toLowerCase().includes(term))
  }, [chatSearch, recentMerged])
  const isSidebarExpanded = isSidebarPinnedOpen || isSidebarHovered

  return (
    <main className="relative min-h-screen bg-transparent text-gray-900 dark:text-white flex transition-colors duration-300">
          {/* Background 1*/}
      <div className="fixed inset-0 -z-10">
        <SoftAurora
          speed={0.4}
          scale={1.5}
          brightness={0.8}
          color1="#e0e7ff"
          color2="#fefce8"
          noiseFrequency={2.5}
          noiseAmplitude={1}
          bandHeight={0.5}
          bandSpread={1}
          octaveDecay={0.1}
          layerOffset={0}
          colorSpeed={1}
          enableMouseInteraction
          mouseInfluence={0.25}
        />
      </div>

      {/* Background 2*/}
      {/* <div className="fixed inset-0 -z-10">
          <LiquidChrome
            baseColor={[0.1, 0.1, 0.1]}
            speed={0.5}
            amplitude={0.4}
            interactive={true}
          />
        </div> */}
      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`flex flex-col border-r border-gray-100 dark:border-zinc-800 
          bg-gray-50/70 dark:bg-zinc-900/80 
          sticky top-0 h-screen min-h-0 overflow-hidden 
          transition-all duration-500 ease-in-out ${
            isSidebarExpanded ? "w-72 px-3 py-4" : "w-16 px-2 py-4"
        }`}
      >
        <div className="mt-2 mb-4 shrink-0">
        {isSidebarExpanded ? (
          <div
            className="group relative px-2 py-2 rounded-md 
            hover:bg-gray-200 dark:hover:bg-zinc-800 
            transition-colors"
            >
      <div className="flex items-center">
        <SquaresExclude className="w-5 h-5 text-gray-800 dark:text-gray-200" />
      </div>

      <button
        onClick={() => setIsSidebarPinnedOpen((prev) => !prev)}
        className="absolute right-1 top-1/2 -translate-y-1/2 
        p-1.5 rounded-md 
        border border-gray-200 dark:border-zinc-700 
        bg-white dark:bg-zinc-800 
        opacity-0 group-hover:opacity-100 
        transition-opacity"
        aria-label={isSidebarPinnedOpen ? "Unpin sidebar" : "Pin sidebar open"}
      >
        {isSidebarPinnedOpen ? (
          <PanelLeftClose className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        ) : (
          <PanelLeftOpen className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        )}
      </button>
    </div>
    ) : (
    <div
      className="group relative flex justify-center py-2 rounded-md 
      hover:bg-gray-200 dark:hover:bg-zinc-800 
      transition-colors"
    >
      <SquaresExclude className="w-5 h-5 text-gray-700 dark:text-gray-300" />
    </div>
  )}
</div>

        {isSidebarExpanded ? (
          <>
          <div className="mb-4 shrink-0">
            <button
              onClick={handleNewChat}
              className="w-full bg-gray-900 text-white  dark:bg-white dark:text-black py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              + New chat
            </button>
          </div>
          <div className="mb-4 shrink-0">
            <Link
              href="/history"
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 transition-colors px-2 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-800"
            >
              <History className="w-4 h-4" />
              View history
            </Link>
          </div>
          <div className="mb-3 px-1 shrink-0">
            <div className="flex items-center gap-2 border border-gray-200 rounded-md bg-white px-2 py-1.5">
              <TextSearch className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Search chats..."
                className="w-full text-sm text-gray-700 dark:text-gray-300 bg-transparent outline-none dark:placeholder-gray-500"
              />
            </div>
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-400 px-2 mb-2 shrink-0">Recent chats</p>
          <div
            data-lenis-prevent
            className="min-h-0 flex-1 overflow-y-auto space-y-1 overscroll-contain"
          >
            {filteredRecentChats.map((debate) => {
              const id = debate._id as string
              const displayTitle = chatTitleEdits.get(id) ?? debate.originalThought
              const words = displayTitle.trim().split(/\s+/)
              const firstFive = words.slice(0, 5).join(" ")
              const truncated = words.length > 5 ? `${firstFive}...` : firstFive
              const isEditing = editingChatId === id

              return (
                <div
                  key={id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (isEditing) return
                    handleOpenRecent({
                      _id: id,
                      originalThought: debate.originalThought,
                      rationalArgument: debate.rationalArgument,
                      emotionalArgument: debate.emotionalArgument,
                      decision: debate.decision,
                      reason: debate.reason,
                      timestamp: debate.timestamp,
                      messages: debate.messages as Message[] | undefined,
                      // saved: debate.saved, 
                    })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      ;(e.currentTarget as HTMLDivElement).click()
                    }
                  }}
                  className={`group w-full select-none text-left px-2 py-2 rounded-md transition-colors ${
                    activeChatId === debate._id
                      ? "bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700"
                      : "hover:bg-gray-200 dark:hover:bg-zinc-800"
                  }`}
                  title={displayTitle}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editingChatTitle}
                          onChange={(e) => setEditingChatTitle(e.target.value)}
                          onBlur={() => {
                            const trimmed = editingChatTitle.trim()
                            setChatTitleEdits((prev) => {
                              const next = new Map(prev)
                              if (trimmed) next.set(id, trimmed)
                              else next.delete(id)
                              return next
                            })
                            setEditingChatId(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur()
                            if (e.key === "Escape") setEditingChatId(null)
                          }}
                          className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md px-2 py-1 text-sm text-gray-900 dark:text-white outline-none"
                        />
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{truncated}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="p-1 rounded-md hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                        aria-label="Edit chat title"
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingChatId(id)
                          setEditingChatTitle(displayTitle)
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300 cursor-pointer" />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded-md hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                        aria-label="Share chat"
                        title="Share"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!user?.id) return
                          const shareId = await ensureShareLinkMutation({ id: id as any, userId: user.id })
                          const url = `${window.location.origin}/share/${shareId}`
                          if (typeof navigator !== "undefined" && navigator.share) {
                            try {
                              await navigator.share({ title: "SplitSense Chat", url })
                              return
                            } catch {
                              // fall through to clipboard
                            }
                          }
                          await navigator.clipboard.writeText(url)
                        }}
                      >
                        <MessageSquareShare className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300 cursor-pointer" />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded-md hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                        aria-label="Delete chat"
                        title="Delete"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!user?.id) return
                          const idToDelete = id
                          // Optimistic remove from sidebar list.
                          setOptimisticRecent((prev) => prev.filter((c) => c._id !== idToDelete))
                          if (activeChatId === idToDelete) {
                            handleNewChat()
                          }
                          await deleteDebateMutation({ id: idToDelete as any, userId: user.id })
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300 cursor-pointer" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {isSignedIn && recentMerged.length === 0 && (
              <p className="text-xs text-gray-400 px-2">No chats yet.</p>
            )}
            {!isSignedIn && (
              <p className="text-xs text-gray-400 px-2">Sign in to see recent chats.</p>
            )}
          </div>
          </>
        ) : (
          <div className="mt-2 flex flex-col items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-full bg-black text-white hover:bg-gray-800 transition-colors"
              aria-label="New chat"
              title="New chat"
            >
              <Plus className="w-4 h-4" />
            </Link>
            <Link
              href="/history"
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
              aria-label="View history"
              title="View history"
            >
              <History className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setIsSidebarPinnedOpen(true)}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Search chats"
              title="Search chats"
            >
              <TextSearch className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      <div className="flex-1 bg-transparent">
            {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 
            sticky top-0 z-10 
            bg-white/60 dark:bg-zinc-900/60 
            shadow-[0_6px_8px_-6px_rgba(0,0,0,0.1)]
            backdrop-blur-md 
            border-b border-white/10 dark:border-white/5 
            transition-colors duration-300">

          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <SquaresExclude className="w-6 h-6 text-gray-800 dark:text-gray-200 mr-2" />
              <h1 className="text-xl font-semibold tracking-tight">SplitSense
              </h1>
            </Link>
          </div>

          <div>
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button onClick={persistDraftForAuth} className="text-sm text-gray-500 dark:text-gray-400 
                hover:text-gray-900 dark:hover:text-white 
                transition-colors cursor-pointer">
                  Login
                </button>
              </SignInButton>
            )}
          </div>

        </div>

      {/* Hero input */}
      <div className="relative">
  {!result && (
    <div className="absolute inset-0 -z-10">
      {/* <SoftAurora
        speed={0.4}
        scale={1.5}
        brightness={0.8}
        color1="#e0e7ff"
        color2="#fefce8"
        noiseFrequency={2.5}
        noiseAmplitude={1}
        bandHeight={0.5}
        bandSpread={1}
        octaveDecay={0.1}
        layerOffset={0}
        colorSpeed={1}
        enableMouseInteraction
        mouseInfluence={0.25}
      /> */}
    </div>
  )}
        <div className="max-w-2xl mx-auto px-6 pt-16 pb-10">
          
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
            <ShinyText
              text="What's on your mind?"
              speed={3}
              delay={0}
              color={theme === "dark" ? "#b5b5b5" : "#1f2937"}
              shineColor="#ffffff"
              spread={120}
              direction="left"
              yoyo={false}
              pauseOnHover={false}
              disabled={false}
            />
          </h2>
          <p className=" text-gray-500 text-lg mb-10">Let logic and emotion decide.</p>

          <div className="space-y-3">
          <textarea
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  if (!loading && thought.trim()) handleSubmit()
                }
              }}
              placeholder="Should I quit my job and start a startup..."
              rows={4}
              disabled={loading || !!result}
              readOnly={!!result}
              className="w-full border border-gray-200 dark:border-zinc-700 
              rounded-xl px-4 py-3 
              text-gray-900 dark:text-white 
              bg-white dark:bg-zinc-800 
              placeholder-gray-400 dark:placeholder-gray-500 
              focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white 
              resize-none text-base"
            />
            <StarBorder
              as="button"
              onClick={handleSubmit}
              disabled={loading || !!result || !thought.trim()}
              color="#baf9ff"
              speed="5s"
              className="w-full min-w-[180px] 
              bg-white/10 dark:bg-white/10 
              backdrop-blur-md 
              text-white dark:text-white 
              py-3 rounded-xl font-medium 
              hover:bg-white/30 
              transition-all 
              disabled:opacity-50 disabled:cursor-not-allowed 
              flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white dark:text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Thinking...
                </>
              ) : (
                "Help me Decide"
              )}
            </StarBorder>
          </div>

          {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

          {showLoginWall && (
            <div className="mt-6 border border-gray-200 rounded-xl p-6 text-center space-y-3">
              <p className="font-medium text-gray-900">You've used your free debate</p>
              <p className="text-sm  dark:text-gray-500 text-gray-600">Sign up free to keep splitting your thoughts</p>
              <SignUpButton mode="modal">
                <button onClick={persistDraftForAuth} className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                  Sign up free
                </button>
              </SignUpButton>
            </div>
          )}
        </div>

        {/* Chat area */}
        {result && (
          <div className="max-w-2xl mx-auto px-6 pb-32 space-y-4">
            {/* Original thought */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-500 dark:bg-zinc-800">
              <span className="font-medium text-gray-700 dark:text-white">Your thought: </span>
              {result.originalThought}
              <p className="text-xs text-gray-400 mt-2" suppressHydrationWarning>
                {new Date(normalizeTimestamp(result.timestamp)).toLocaleString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* Initial Logic */}
            {startLogic && (
              <TypingBubble
                text={result.rationalArgument}
                start={startLogic}
                voice="logic"
                instant={restoreInstant}
                onDone={() => setLogicDone(true)}
              />
            )}

            {/* Initial Emotion */}
            {startEmotion && (
              <TypingBubble
                text={result.emotionalArgument}
                start={startEmotion}
                voice="emotion"
                instant={restoreInstant}
                onDone={() => setEmotionDone(true)}
              />
            )}

            {/* Decision */}
            {showDecision && (
              <div key={`decision-${messages.length}`} className="border border-gray-100 rounded-xl p-5 text-center space-y-2">
                <p className="text-md text-gray-700 dark:text-gray-300 font-bold">Decision</p>
                <p className="text-base font-bold text-gray-900">
                  {decisionIsYes(result?.decision) ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-red-600">No</span>
                  )}
                </p>
                <p className="text-md dark:text-gray-400 text-gray-700 text-sm pt-1 italic font-serif">{result.reason}</p>
              </div>
            )}

            {/* Follow-up conversation messages */}
            {conversationMessages.map((msg, i) => (
              <div key={i}>
                {msg.role === "user" && (
                  <div className="flex justify-end">
                    <div className="bg-gray-900 text-white rounded-xl px-4 py-3 text-sm max-w-xs leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                )}
                {(msg.role === "logic" || msg.role === "emotion") && (
                  <TypingBubble
                    key={`${i}-${msg.role}-${msg.content}`}
                    text={msg.content}
                    start={true}
                    voice={msg.role}
                    instant={restoreInstant}
                    onDone={
                      msg.role === "logic" && i === conversationMessages.length - 1
                        ? () => {
                            if (pendingEmotion) {
                              setMessages((prev: Message[]) => [
                                ...prev,
                                { role: "emotion" as const, content: pendingEmotion },
                              ])
                              setPendingEmotion(null)
                            }
                          }
                        : msg.role === "emotion" && i === conversationMessages.length - 1
                        ? () => {
                            if (pendingDecision) {
                              setMessages((prev: Message[]) => [
                                ...prev,
                                { role: "decision" as const, content: pendingDecision.content, decision: pendingDecision.decision },
                              ])
                              setPendingDecision(null)
                            }
                          }
                        : undefined
                    }
                  />
                )}
                {msg.role === "decision" && (
                  <div className="border border-gray-100 rounded-xl p-5 text-center space-y-2">
                    <p className="text-md text-gray-700 dark:text-gray-300 font-bold">Decision</p>
                    {msg.decision !== "RESOLVED" && (
                      <p className="text-base font-bold">
                        {msg.decision === "YES" || msg.decision === "SAVE" ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-red-600">No</span>
                        )}
                      </p>
                    )}
                    <p className="text-md dark:text-gray-400 text-gray-700 text-sm pt-1 italic font-serif">
                      {msg.content}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {followUpLoading && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Thinking...
              </div>
            )}

            {/* Follow-up input */}
            {showActions && chatStatus === "active" && (
              <div className="space-y-3 pt-2">
                {isSignedIn ? (
                  <>
                    <div className="flex gap-2">
                      <textarea
                        ref={inputRef}
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleFollowUp()
                          }
                        }}
                        placeholder="Counter their argument or ask more..."
                        rows={2}
                        className="flex-1 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white dark:bg-zinc-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white resize-none"
                      />
                      <button
                        onClick={handleFollowUp}
                        disabled={!followUp.trim() || followUpLoading}
                        className="bg-gray-900 text-white dark:bg-white dark:text-black px-4 rounded-xl text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleSave}
                        className="flex-1 
                        bg-gray-900 text-white 
                        dark:bg-white dark:text-black 
                        py-2.5 rounded-xl text-sm font-medium 
                        hover:bg-gray-700 dark:hover:bg-gray-200 
                        transition-colors"
                      >
                        save
                      </button>
                      <button
                        onClick={() => {
                          // Dismiss means: do not mark saved in DB.
                          // The debate doc is created with a 30-day expiry and will be deleted then.
                          setIsSaved(false)
                          setChatStatus("dismissed")
                          setShowFollowUp(false)
                          setShowActions(false)
                        }}
                        className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-medium hover:border-gray-400 hover:text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        dismiss
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="border border-gray-200 rounded-xl p-5 text-center space-y-3">
                    <p className="font-medium dark:text-gray-300 text-gray-900 text-sm">Want to continue the conversation?</p>
                    <p className="text-xs text-gray-400">Sign up for free to counter argue, save debates and view history</p>
                    <div className="flex gap-2 justify-center">
                        <SignUpButton
                          mode="modal"
                        >
                        <button onClick={persistDraftForAuth} className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors cursor-pointer">
                            Sign up for free
                          </button>
                        </SignUpButton>

                        <SignInButton
                          mode="modal"
                        >
                          <button onClick={persistDraftForAuth} className="border border-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:border-gray-400 transition-colors cursor-pointer">
                            Sign in
                          </button>
                        </SignInButton>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isSaved && (
              <p className="text-center text-xs text-green-500 pb-4">✓ Saved to your history</p>
            )}

            {chatStatus !== "active" && (
              <div className="flex gap-2">
                <button
                  onClick={handleNewChat}
                  className="flex-1 border border-gray-200 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors"
                >
                  New chat
                </button>
                <button
                  onClick={handleShareCurrentChat}
                  className="px-3 border border-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:border-gray-400 transition-colors"
                  aria-label="Share chat"
                  title="Share chat"
                >
                  <MessageSquareShare className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
        </div>

        {/* Theme Toggler */}
        <div className="fixed bottom-6 right-6 z-50 *:cursor-pointer">
          <AnimatedThemeToggler />
        </div>
        
      </div>
    </main>
  )
}