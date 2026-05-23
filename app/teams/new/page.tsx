"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import BlueprintGrid from "@/components/BlueprintGrid";
import { teams } from "@/lib/api";

export default function NewTeamPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Team name should be at least 2 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await teams.create(trimmed);
      router.push("/projects/new");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create team.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />
      <main className="flex-grow p-6 z-10 max-w-xl mx-auto w-full">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to overview
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">New team</h1>
              <p className="text-stone-500 text-sm font-medium">
                You will be the owner and can invite members later.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                Team name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Vision Lab"
                minLength={2}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
                autoComplete="organization"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? "Creating…" : "Create team"}
              </button>
              <Link
                href="/projects/new"
                className="px-4 py-3 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
