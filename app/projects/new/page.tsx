"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Lock, Globe } from "lucide-react";
import BlueprintGrid from "@/components/BlueprintGrid";
import { projects } from "@/lib/api";

const TASK_TYPES: { value: string; label: string }[] = [
  { value: "object_detection", label: "Object Detection" },
  { value: "image_classification", label: "Image Classification" },
  { value: "semantic_segmentation", label: "Semantic Segmentation" },
  { value: "instance_segmentation", label: "Instance Segmentation" },
  { value: "keypoint_detection", label: "Keypoint Detection" },
  { value: "video_annotation", label: "Video Annotation" },
];

export default function NewProjectPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState(TASK_TYPES[0].value);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter a project name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await projects.create({
        name: name.trim(),
        task_type: taskType,
        description: description.trim() || undefined,
        is_public: isPublic,
      });
      router.push("/projects");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />
      <main className="flex-grow p-6 z-10 max-w-xl mx-auto w-full">
        <Link
          href="/projects"
          className={[
            "inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900",
            "mb-8 transition-colors",
          ].join(" ")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to projects
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8"
        >
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mb-1">New project</h1>
          <p className="text-stone-500 text-sm font-medium mb-8">
            Set up a project, then add datasets and annotation jobs.
          </p>

          {error && (
            <div
              className={["mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm", "rounded-xl"].join(
                " ",
              )}
            >
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* ── Project form ──────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-stone-400 tracking-widest mb-2">Project name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Warehouse QC — Line A"
                  minLength={3}
                  className={[
                    "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
                  ].join(" ")}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 tracking-widest mb-2">Task type</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className={[
                    "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
                  ].join(" ")}
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 tracking-widest mb-2">
                  Description <span className="font-normal text-stone-400 normal-case tracking-normal">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Short summary for your team"
                  className={[
                    "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
                    "resize-none",
                  ].join(" ")}
                />
              </div>

              {/* ── Visibility toggle ───────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold text-stone-400 tracking-widest mb-2">Visibility</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border px-4 py-3.5
                      text-left transition-all ${
                        !isPublic
                          ? "border-orange-400 bg-orange-50 ring-2 ring-orange-400/20"
                          : "border-stone-200 bg-stone-50 hover:border-stone-300"
                      }`}
                  >
                    <div
                      className={[
                        "flex items-center gap-2 text-sm font-bold",
                        !isPublic ? "text-orange-700" : "text-stone-700",
                      ].join(" ")}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Private
                    </div>
                    <p className="text-[11px] leading-relaxed text-stone-400">
                      Only you and people you share with can access this project.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border px-4 py-3.5
                      text-left transition-all ${
                        isPublic
                          ? "border-orange-400 bg-orange-50 ring-2 ring-orange-400/20"
                          : "border-stone-200 bg-stone-50 hover:border-stone-300"
                      }`}
                  >
                    <div
                      className={[
                        "flex items-center gap-2 text-sm font-bold",
                        isPublic ? "text-orange-700" : "text-stone-700",
                      ].join(" ")}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Public
                    </div>
                    <p className="text-[11px] leading-relaxed text-stone-400">
                      Anyone with the link can view this project.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className={[
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white",
                    "rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-[1.02]",
                    "active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none",
                  ].join(" ")}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? "Creating…" : "Create project"}
                </button>

                <Link
                  href="/projects"
                  className={[
                    "flex-1 flex items-center justify-center px-4 py-3 border border-stone-200 rounded-xl",
                    "text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors",
                  ].join(" ")}
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
