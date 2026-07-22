"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  CircleStop,
  CloudUpload,
  Cpu,
  Database,
  Grid2X2,
  HardDrive,
  Maximize2,
  Minus,
  MoreHorizontal,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Webhook,
  Workflow,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NodeKind = "input" | "model" | "output";

type WorkflowNode = {
  id: string;
  kind: NodeKind;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  x: number;
  y: number;
  tone: string;
};

const NODE_WIDTH = 232;
const NODE_HEIGHT = 132;

const INITIAL_NODES: WorkflowNode[] = [
  {
    id: "camera",
    kind: "input",
    title: "Entrance camera",
    subtitle: "RTSP · 1920 × 1080",
    icon: Camera,
    x: 72,
    y: 178,
    tone: "#10b981",
  },
  {
    id: "detector",
    kind: "model",
    title: "Person detector",
    subtitle: "YOLOv8 · 94% confidence",
    icon: Cpu,
    x: 392,
    y: 178,
    tone: "#f97316",
  },
  {
    id: "alert",
    kind: "output",
    title: "Security alert",
    subtitle: "Webhook · Instant",
    icon: Bell,
    x: 712,
    y: 82,
    tone: "#8b5cf6",
  },
  {
    id: "storage",
    kind: "output",
    title: "Event storage",
    subtitle: "PostgreSQL · 30 days",
    icon: HardDrive,
    x: 712,
    y: 274,
    tone: "#3b82f6",
  },
];

const CONNECTIONS = [
  { from: "camera", to: "detector" },
  { from: "detector", to: "alert" },
  { from: "detector", to: "storage" },
];

const NODE_LIBRARY = [
  { label: "Camera stream", icon: Camera, tone: "bg-emerald-50 text-emerald-600" },
  { label: "Vision model", icon: Cpu, tone: "bg-orange-50 text-orange-600" },
  { label: "Webhook", icon: Webhook, tone: "bg-violet-50 text-violet-600" },
  { label: "Database", icon: Database, tone: "bg-blue-50 text-blue-600" },
];

const KIND_LABELS: Record<NodeKind, string> = {
  input: "Input",
  model: "AI model",
  output: "Output",
};

export default function WorkflowsPage() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [zoom, setZoom] = useState(100);
  const [isRunning, setIsRunning] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [saved, setSaved] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  function deployWorkflow() {
    setIsDeploying(true);
    window.setTimeout(() => setIsDeploying(false), 1200);
  }

  function moveNode(id: string, dx: number, dy: number) {
    setNodes((current) =>
      current.map((node) =>
        node.id === id
          ? { ...node, x: Math.max(24, node.x + dx), y: Math.max(56, node.y + dy) }
          : node,
      ),
    );
    setSaved(false);
  }

  function resetCanvas() {
    setNodes(INITIAL_NODES);
    setZoom(100);
    setSaved(true);
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#f8f7f4] text-stone-900">
      <header className="border-b border-stone-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-sm">
              <Workflow className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">Entrance monitoring</h1>
                <button
                  type="button"
                  aria-label="Workflow menu"
                  className="rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                {saved ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <CloudUpload className="h-3.5 w-3.5" />}
                {saved ? "All changes saved" : "Unsaved changes"}
                <span aria-hidden="true">·</span> Edited just now
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 hidden items-center gap-2 rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 sm:flex">
              <span className={`h-2 w-2 rounded-full ${isRunning ? "bg-emerald-500" : "bg-stone-400"}`} />
              {isRunning ? "Live · 24 FPS" : "Paused"}
            </div>
            <button
              type="button"
              onClick={() => setIsRunning((value) => !value)}
              className="flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {isRunning ? <CircleStop className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isRunning ? "Stop" : "Run"}
            </button>
            <button
              type="button"
              onClick={deployWorkflow}
              disabled={isDeploying}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#FF7300] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {isDeploying ? <Sparkles className="h-4 w-4 animate-pulse" /> : <CloudUpload className="h-4 w-4" />}
              {isDeploying ? "Deploying…" : "Deploy"}
            </button>
            <button
              type="button"
              aria-label="More actions"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="border-b border-stone-200 bg-white p-4 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              aria-label="Search nodes"
              placeholder="Search nodes…"
              className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Node library</p>
            <button type="button" className="text-xs font-bold text-orange-600 hover:text-orange-700">View all</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {NODE_LIBRARY.map((item) => (
              <button
                type="button"
                key={item.label}
                className="group flex min-h-14 items-center gap-3 rounded-xl border border-transparent px-2.5 text-left transition hover:border-stone-200 hover:bg-stone-50"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-700">{item.label}</span>
                <Plus className="hidden h-4 w-4 text-stone-300 group-hover:text-orange-500 xl:block" />
              </button>
            ))}
          </div>

          <div className="mt-6 hidden rounded-2xl bg-orange-100 p-4 text-stone-600 lg:block">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-500">
              <Zap className="h-3.5 w-3.5" /> Runtime health
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div><p className="text-lg font-bold tabular-nums">12ms</p><p className="text-[10px] text-stone-500">Latency</p></div>
              <div><p className="text-lg font-bold tabular-nums">99.9%</p><p className="text-[10px] text-stone-500">Uptime</p></div>
            </div>
          </div>
        </aside>

        <main className="relative min-h-[650px] flex-1 overflow-hidden bg-[#f8f7f4]">
          <div className="absolute left-5 top-5 z-30 flex items-center gap-2 rounded-xl border border-stone-200 bg-white/95 p-1.5 shadow-sm backdrop-blur">
            <button type="button" className="flex h-8 items-center gap-2 rounded-lg bg-stone-100 px-3 text-xs font-bold text-stone-700">
              <Grid2X2 className="h-3.5 w-3.5" /> Build
            </button>
            <button type="button" className="flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-bold text-stone-500 hover:bg-stone-50">
              <Radio className="h-3.5 w-3.5" /> Runs
            </button>
          </div>

          <div
            ref={canvasRef}
            className="absolute inset-0 overflow-auto"
            style={{
              backgroundImage: "radial-gradient(circle, #d6d3d1 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            <div className="relative h-[620px] min-w-[1040px] origin-top-left" style={{ transform: `scale(${zoom / 100})` }}>
              <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true">
                {CONNECTIONS.map((connection, index) => {
                  const from = nodeMap.get(connection.from);
                  const to = nodeMap.get(connection.to);
                  if (!from || !to) return null;
                  const x1 = from.x + NODE_WIDTH;
                  const y1 = from.y + NODE_HEIGHT / 2;
                  const x2 = to.x;
                  const y2 = to.y + NODE_HEIGHT / 2;
                  const control = Math.max(60, (x2 - x1) / 2);
                  const path = `M ${x1} ${y1} C ${x1 + control} ${y1}, ${x2 - control} ${y2}, ${x2} ${y2}`;

                  return (
                    <g key={`${connection.from}-${connection.to}`}>
                      <path d={path} fill="none" stroke="#e7e5e4" strokeWidth="5" />
                      <motion.path
                        d={path}
                        fill="none"
                        stroke={isRunning ? from.tone : "#a8a29e"}
                        strokeLinecap="round"
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: index * 0.08 }}
                      />
                      {isRunning ? (
                        <circle r="3.5" fill={from.tone}>
                          <animateMotion path={path} dur={`${2.1 + index * 0.25}s`} repeatCount="indefinite" />
                        </circle>
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              {nodes.map((node) => (
                <motion.article
                  key={node.id}
                  drag
                  dragMomentum={false}
                  onDragEnd={(_, info) => moveNode(node.id, info.offset.x, info.offset.y)}
                  style={{ left: node.x, top: node.y }}
                  className="group absolute z-20 h-[132px] w-[232px] cursor-grab rounded-2xl border border-stone-200 bg-white shadow-[0_8px_24px_rgba(28,25,23,0.07)] transition-shadow hover:shadow-[0_12px_32px_rgba(28,25,23,0.12)] active:cursor-grabbing"
                >
                  <div className="flex items-start gap-3 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: node.tone }}>
                      <node.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">{KIND_LABELS[node.kind]}</p>
                      <h2 className="mt-0.5 truncate text-sm font-bold text-stone-900">{node.title}</h2>
                      <p className="mt-1 truncate text-[11px] text-stone-500">{node.subtitle}</p>
                    </div>
                    <button type="button" aria-label={`Settings for ${node.title}`} className="rounded-lg p-1.5 text-stone-300 opacity-0 transition hover:bg-stone-100 hover:text-stone-600 group-hover:opacity-100">
                      <Settings2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? "bg-emerald-500" : "bg-stone-400"}`} />
                      {isRunning ? "Healthy" : "Idle"}
                    </span>
                    <span className="text-[10px] font-bold tabular-nums text-stone-400">{node.kind === "model" ? "12ms" : "24 FPS"}</span>
                  </div>
                  {node.kind !== "input" ? <span className="absolute -left-2 top-[58px] h-4 w-4 rounded-full border-[3px] border-white bg-stone-300 shadow-sm" /> : null}
                  {node.kind !== "output" ? <span className="absolute -right-2 top-[58px] h-4 w-4 rounded-full border-[3px] border-white shadow-sm" style={{ backgroundColor: node.tone }} /> : null}
                </motion.article>
              ))}
            </div>
          </div>

          <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-stone-200 bg-white/95 p-1.5 shadow-lg shadow-stone-900/5 backdrop-blur">
            <button type="button" onClick={() => setZoom((value) => Math.max(70, value - 10))} aria-label="Zoom out" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100">
              <Minus className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setZoom(100)} className="h-8 min-w-14 rounded-lg px-2 text-xs font-bold tabular-nums text-stone-600 hover:bg-stone-100">{zoom}%</button>
            <button type="button" onClick={() => setZoom((value) => Math.min(130, value + 10))} aria-label="Zoom in" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100">
              <Plus className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-stone-200" />
            <button type="button" onClick={resetCanvas} aria-label="Reset canvas" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Fit to screen" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          <button type="button" className="absolute bottom-5 right-5 z-30 hidden h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-600 shadow-sm transition hover:bg-stone-50 sm:flex">
            <Trash2 className="h-3.5 w-3.5" /> Clear canvas
          </button>
        </main>
      </div>
    </div>
  );
}
