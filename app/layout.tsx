import type { Metadata } from "next"
import { Geist, Inter } from "next/font/google"
import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"
import { ConvexClientProvider } from "./ConvexClientProvider"
import { ThemeProvider } from "next-themes"
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SplitSense",
  description: "Let logic and emotion decide",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
        <body className={geist.className}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}