"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUp, Bot, ChevronDown, MessageSquare, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<"conversations" | "examples">("conversations");
  const firstName = user?.first_name || user?.email?.split("@")[0] || "there";

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#fcfaf7] px-4 py-8 text-stone-900 sm:px-6 sm:py-12">
      <div
        className={[
          "pointer-events-none absolute inset-x-0 top-0 h-[480px]",
          "bg-[radial-gradient(circle_at_50%_15%,rgba(249,115,22,0.08),transparent_50%)]",
        ].join(" ")}
      />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-1 flex-col items-center justify-center text-center w-full max-w-3xl"
        >
          <div
            className={[
              "mb-6 inline-flex h-7 items-center justify-center gap-2 rounded-full border",
              "border-orange-200/80 bg-orange-50/80 px-3.5 text-[11px] font-bold uppercase tracking-wider",
              "text-orange-600 shadow-xs",
            ].join(" ")}
          >
            <Bot className="h-3.5 w-3.5 shrink-0" />
            <span>VisioX Vision Agent</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl md:text-5xl">
            Hi {firstName}, what are you building?
          </h1>
          <p className="mt-3 text-sm font-medium text-stone-500 sm:text-base">
            Build, annotate, train, and deploy computer vision workflows with AI.
          </p>

          <div className="mt-8 w-full rounded-2xl border border-stone-200/80 bg-white p-2 shadow-xl shadow-stone-900/5 transition-all focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-500/10">
            <div className="p-3 text-left">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe your vision model or task, e.g. 'Detect defects on solar panels and alert via webhook'…"
                rows={3}
                className={[
                  "w-full resize-none bg-transparent text-sm font-medium text-stone-800 outline-none",
                  "placeholder:text-stone-400",
                ].join(" ")}
              />
              <div className="mt-2 flex items-center justify-between pt-2 border-t border-stone-100">
                <button
                  type="button"
                  className={[
                    "inline-flex items-center gap-1.5 rounded-lg bg-stone-100/80 px-2.5 py-1.5 text-xs",
                    "font-semibold text-stone-600 transition hover:bg-stone-200/70",
                  ].join(" ")}
                >
                  <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                  <span>Agent Mode</span>
                  <ChevronDown className="h-3 w-3 text-stone-400" />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    title="Reset prompt"
                    className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Send prompt"
                    disabled={!prompt.trim()}
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white",
                      "shadow-xs transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
                    ].join(" ")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/deploy"
              className={[
                "inline-flex items-center gap-2 rounded-xl border border-stone-200/90 bg-white px-3.5",
                "py-2 text-xs font-semibold text-stone-700 shadow-xs transition-all hover:border-orange-300 hover:bg-orange-50/40 hover:text-stone-900",
              ].join(" ")}
            >
              <Wand2 className="h-3.5 w-3.5 text-orange-500" />
              Try Existing Models
            </Link>
            <Link
              href="/projects"
              className={[
                "inline-flex items-center gap-2 rounded-xl border border-stone-200/90 bg-white px-3.5",
                "py-2 text-xs font-semibold text-stone-700 shadow-xs transition-all hover:border-orange-300 hover:bg-orange-50/40 hover:text-stone-900",
              ].join(" ")}
            >
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              Use My Own Data
            </Link>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className={[
            "mt-10 w-full max-w-4xl rounded-2xl border border-stone-200/80 bg-white p-5",
            "shadow-xs",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("conversations")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "conversations"
                  ? "bg-orange-50 text-orange-700 border border-orange-200/60 font-bold"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              Recent Sessions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("examples")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "examples"
                  ? "bg-orange-50 text-orange-700 border border-orange-200/60 font-bold"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              Prompt Examples
            </button>
          </div>

          {activeTab === "conversations" ? (
            <div className="flex max-w-md items-center gap-3.5 rounded-xl border border-stone-200/70 bg-stone-50/50 p-3.5 transition-colors hover:border-orange-200 hover:bg-white">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-stone-900 truncate">Object detection assistant session</p>
                <p className="mt-0.5 text-[11px] font-medium text-stone-400">Ready to continue · 3 days ago</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-left">
              {[
                { title: "Defect Detection", prompt: "Detect scratches and dents on manufactured metallic parts." },
                { title: "Traffic Analysis", prompt: "Count vehicles and estimate congestion levels from traffic camera RTSP stream." },
              ].map((ex) => (
                <div
                  key={ex.title}
                  onClick={() => setPrompt(ex.prompt)}
                  className="cursor-pointer rounded-xl border border-stone-200/70 bg-stone-50/50 p-3.5 transition-all hover:border-orange-300 hover:bg-white"
                >
                  <p className="text-xs font-bold text-stone-900">{ex.title}</p>
                  <p className="mt-1 text-[11px] text-stone-500 leading-relaxed">{ex.prompt}</p>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </section>
    </main>
  );
}
