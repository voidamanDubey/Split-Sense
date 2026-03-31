"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useUser, UserButton, SignInButton } from "@clerk/nextjs"
import Link from "next/link"
import { History, PanelLeftClose, PanelLeftOpen, Plus, SquaresExclude, Trash2 } from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { useTheme } from "next-themes"

//background imports
import SoftAurora from "../components/SoftAurora/SoftAurora"

//text animations imports
import ShinyText from "../components/TextAnimations/ShinyText/Shinytext"

export default function HistoryPage() {
  const { user } = useUser()
  const [isSidebarPinnedOpen, setIsSidebarPinnedOpen] = useState(true)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const { theme } = useTheme();
  const debates = useQuery(api.debates.getAllDebates,
    user?.id ? { userId: user.id } : "skip"
  )

  const recentDebates = useQuery(
    api.debates.getRecentDebates,
    user?.id ? { userId: user.id, limit: 20 } : "skip"
  )

  const deleteDebate = useMutation(api.debates.deleteDebate)
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
      
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        data-lenis-prevent
        className={`group 
          border-r border-gray-100 dark:border-zinc-800 
          bg-gray-50/70 dark:bg-zinc-900/80 
          sticky top-0 h-screen overflow-y-auto 
          transition-all duration-500 ease-in-out ${
            isSidebarExpanded ? "w-72 px-3 py-4" : "w-16 px-2 py-4"
        }`}
      >

        {/* Logo + Toggle */}
        <div className="mt-2 mb-4">
          {isSidebarExpanded ? (
            <div className="relative px-2 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors">
              <div className="flex items-center">
                <SquaresExclude className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </div>

              <button
                onClick={() => setIsSidebarPinnedOpen((prev) => !prev)}
                className="absolute right-1 top-1/2 -translate-y-1/2 
                p-1.5 rounded-md 
                border border-gray-200 dark:border-zinc-700 
                bg-white dark:bg-zinc-800 
                opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {isSidebarPinnedOpen
                  ? <PanelLeftClose className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  : <PanelLeftOpen className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
              </button>
            </div>
          ) : (
            <div className="group relative flex justify-center py-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors">
              <SquaresExclude className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
          )}
        </div>

        {isSidebarExpanded ? (
          <>
            <div className="mb-4">
              <Link
                href="/"
                className="block w-full bg-gray-900 text-white dark:bg-white dark:text-black py-2 rounded-lg text-sm font-medium text-center hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
              >
                + New Chat
              </Link>
            </div>

            <div className="mb-4">
              <Link
                href="/history"
                className="flex items-center gap-2 text-sm font-medium px-2 py-2 rounded-md 
                bg-gray-200 dark:bg-zinc-800 
                border border-gray-300 dark:border-zinc-700"
              >
                <History className="w-4 h-4" />
                View history
              </Link>
            </div>

            <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2 mb-2">
              Recent chats
            </p>

            <div className="space-y-1">
              {recentDebates?.map((debate) => (
                <Link
                  key={debate._id}
                  href="/"
                  className="block px-2 py-2 rounded-md 
                  hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {debate.originalThought}
                  </p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-2 flex flex-col items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-full bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </Link>

            <Link
              href="/history"
              className="p-2 rounded-md 
              bg-gray-200 dark:bg-zinc-800 
              border border-gray-300 dark:border-zinc-700"
            >
              <History className="w-4 h-4" />
            </Link>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 
          sticky top-0 z-10 
          bg-white/60 dark:bg-zinc-900/60 
          backdrop-blur-md 
          border-b border-white/10 dark:border-white/5 
          transition-colors duration-300">

          <Link href="/" className="flex items-center gap-2">
            <SquaresExclude className="w-6 h-6" />
            <h1 className="text-xl font-semibold">SplitSense</h1>
          </Link>

          {user ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Login
              </button>
            </SignInButton>
          )}
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto pt-16 pb-10">
          <h1 className="text-4xl font-semibold mb-6">
          <ShinyText
              text="History"
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
            </h1>

          {debates?.length === 0 && (
            <p className="text-gray-400 dark:text-gray-500 text-center py-20">
              No saved debates yet.
            </p>
          )}

          <div className="space-y-4">
            {debates?.map((debate) => (
              <div
                key={debate._id}
                className="rounded-2xl p-5 space-y-3
                bg-transparent 
                border border-gray-600 dark:border-white/10
                hover:border-gray-900 dark:hover:border-white/20
                transition-all duration-300"                
              >
                <div className="flex justify-between">
                  <p className="font-medium text-sm">
                    {debate.originalThought}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-300 border border-green-300/30">
                      SAVED
                    </span>

                  <button
                    onClick={() => user?.id && deleteDebate({ id: debate._id, userId: user.id })}
                    className="p-1.5 rounded-md border border-gray-200 dark:border-zinc-700 
                    text-gray-500 dark:text-gray-400 
                    hover:text-red-600 hover:border-red-200 border border-black dark:hover:border-red-400/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  </div>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {debate.reason}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                      {/* LOGIC */}
                <div className="rounded-2xl p-5 
                  bg-blue-50
                  bg-gradient-to-br from-blue-500/10 to-transparent 
                  border border-blue-100
                  border border-blue-500/40 
                  dark:bg-blue-900/30 
                  dark:shadow-[0_0_20px_rgba(59,130,246,0.1)]
                  dark:border-blue-800
                  backdrop-blur-md
                  transition-all duration-300"
                >
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">
                    Logic
                  </p>

                  <p className="text-sm text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    {debate.rationalArgument}
                  </p>
                </div>

                      {/* EMOTION */}
                <div className="rounded-2xl p-5
                  bg-amber-50 
                  bg-gradient-to-br from-amber-500/10 to-transparent 
                  border border-amber-100
                  border border-amber-500/40 
                   dark:bg-amber-900/30 
                   dark:shadow-[0_0_20px_rgba(59,130,246,0.1)]
                   dark:border-amber-800
                  backdrop-blur-md
                  transition-all duration-300"
                >
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">
                    Emotion
                  </p>

                  <p className="text-sm text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    {debate.emotionalArgument}
                  </p>
                </div>

                </div>
              <p className="text-xs text-gray-500 dark:tex-gray-400 mt-2">
                {new Date(debate.timestamp > 1e12 ? debate.timestamp : debate.timestamp * 1000).toLocaleString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
                
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatedThemeToggler />
      </div>
    </main>
  )
}