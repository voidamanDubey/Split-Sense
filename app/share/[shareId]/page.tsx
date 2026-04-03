"use client"

import { use } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { decisionIsYes } from "@/lib/decision"

import SoftAurora from "@/app/components/SoftAurora/SoftAurora"
import StarBorder from "@/app/components/TextAnimations/StarBorder/StarBorder"
import { AnimatedThemeToggler } from "@/app/components/ui/animated-theme-toggler"

export default function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>
}) {
  const { shareId } = use(params)
  const debate = useQuery(api.debates.getDebateByShareId, { shareId })

  if (debate === undefined) {
    return (
      <main className="relative min-h-screen bg-transparent text-gray-900 dark:text-white flex items-center justify-center">
        <div className="fixed inset-0 -z-10 w-screen h-screen">
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
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </main>
    )
  }

  if (debate === null) {
    return (
      <main className="relative min-h-screen bg-transparent text-gray-900 dark:text-white flex items-center justify-center">
        <div className="fixed inset-0 -z-10 w-screen h-screen">
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
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">This shared chat doesn’t exist.</p>
          <Link href="/" className="text-sm text-gray-900 dark:text-white underline">
            Go home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-transparent text-gray-900 dark:text-white">
      <div className="fixed inset-0 -z-10 w-screen h-screen">
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

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            ← 
          </Link>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">SplitSense</p>
          <div className="w-16" />
        </div>

        <div className="border border-gray-100 dark:border-white/10 rounded-xl p-5 space-y-3 bg-transparent dark:bg-zinc-900/60 backdrop-blur-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-sm text-gray-700 dark:text-gray-200">Dilemma: </span>
            {debate.originalThought}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl p-5 
                  bg-transparent
                  bg-linear-to-br from-blue-500/10 to-transparent 
                  border border-blue-100
                  dark:bg-blue-900/30 
                  dark:shadow-[0_0_20px_rgba(59,130,246,0.1)]
                  dark:border-blue-800
                  backdrop-blur-md
                  transition-all duration-300">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">Logic</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{debate.rationalArgument}</p>
            </div>
            <div className="rounded-2xl p-5
                  bg-transparent
                  bg-linear-to-br from-amber-500/10 to-transparent 
                  border border-amber-500/40 
                   dark:bg-amber-900/30 
                   dark:shadow-[0_0_20px_rgba(59,130,246,0.1)]
                   dark:border-amber-800
                  backdrop-blur-md
                  transition-all duration-300">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Emotion</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{debate.emotionalArgument}</p>
            </div>
          </div>
          <div className="border border-gray-100 dark:border-white/10 rounded-xl p-4 text-center space-y-1 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Decision</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">
              {decisionIsYes(debate.decision) ? (
                <span className="text-green-600">Yes</span>
              ) : (
                <span className="text-red-600">No</span>
              )}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{debate.reason}</p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(debate.timestamp).toLocaleString("en-IN", {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <Link href="/">
            <StarBorder
              as="div"
              color="#baf9ff"
              speed="5s"
              className="w-full min-w-[180px] 
              bg-white/10 dark:bg-white/10
              backdrop-blur-md 
              text-black dark:text-white 
              // bg-black dark:bg-white 
              py-3 rounded-xl font-medium 
              hover:bg-white/30 
              transition-all 
              opacity-90
              hover:opacity-100
              flex items-center justify-center gap-2 cursor-pointer"
            >
              New Chat
            </StarBorder>
            </Link>
          </div>
      </div>
    </main>
  )
}

