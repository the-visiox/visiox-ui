"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUp,
  Bot,
  ChevronDown,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const firstName = user?.first_name || user?.email?.split("@")[0] || "there";

  return (
    <main className="relative min-h-screen overflow-hidden bg-white px-6 py-10 text-stone-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(circle_at_50%_18%,rgba(251,146,60,0.14),transparent_46%)]" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-6xl flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-1 flex-col items-center justify-center text-center"
        >
          <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-orange-600 shadow-sm shadow-orange-100">
            <Bot className="h-3.5 w-3.5" />
            VisioX Agent
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#202033] md:text-5xl">
            Hi {firstName}, what are you building?
          </h1>
          <p className="mt-4 text-sm font-medium text-stone-500 md:text-base">
            Build and deploy computer vision solutions with AI.
          </p>

          <div className="mt-10 w-full max-w-3xl rounded-3xl bg-orange-50 p-4 shadow-2xl shadow-orange-100/80">
            <div className="rounded-2xl border border-orange-200 bg-white p-4 text-left shadow-sm">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Find people wearing hardhats."
                className="h-20 w-full resize-none bg-transparent text-base text-stone-800 outline-none placeholder:text-stone-400"
              />
              <div className="mt-2 flex items-center justify-between">
                <button className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-200">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                  Agent
                  <ChevronDown className="h-3 w-3" />
                </button>
                <div className="flex items-center gap-3">
                  <button className="rounded-full p-2 text-stone-400 transition hover:bg-orange-50 hover:text-orange-500">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-300 text-orange-950 shadow-lg shadow-orange-100 transition hover:bg-orange-400 active:scale-95">
                    <ArrowUp className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/deploy"
              className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-100"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Try Existing Models
            </Link>
            <Link
              href="/datasets"
              className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Use My Own Data
            </Link>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
          className="mb-0 w-full max-w-5xl rounded-t-3xl border border-orange-100 bg-orange-50/70 p-5 shadow-2xl shadow-orange-100/70 md:min-h-[330px]"
        >
          <div className="mb-4 flex items-center gap-2">
            <button className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-orange-600 shadow-sm">
              Conversations
            </button>
            <button className="rounded-lg px-3 py-2 text-xs font-semibold text-stone-500 transition hover:bg-white hover:text-stone-800">
              Examples
            </button>
          </div>
          <div className="flex max-w-sm items-center gap-3 rounded-xl border border-orange-100 bg-white p-3 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-stone-700">New conversation</p>
              <p className="mt-1 text-xs font-medium text-stone-400">3 days ago</p>
            </div>
          </div>
        </motion.section>
      </section>
    </main>
  );
}
