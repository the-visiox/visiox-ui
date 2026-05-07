"use client";

import { type ComponentPropsWithoutRef, useRef, useState } from "react";
import { motion } from "framer-motion";
import { 
  Camera, 
  Cpu, 
  Play, 
  Plus, 
  Settings, 
  ArrowRight,
  Monitor,
  Bell,
  HardDrive,
  Trash2,
  Save,
  Zap
} from "lucide-react";
import BlueprintGrid from "@/components/BlueprintGrid";

const INITIAL_NODES = [
  { id: "1", type: "source", title: "CCTV Stream 01", icon: Camera, x: 100, y: 150, color: "#22c55e" },
  { id: "2", type: "model", title: "YOLOv8 Detector", icon: Cpu, x: 450, y: 300, color: "#FF7300" },
  { id: "3", type: "action", title: "Alert Webhook", icon: Bell, x: 800, y: 150, color: "#6735E0" },
  { id: "4", type: "action", title: "Save to DB", icon: HardDrive, x: 800, y: 450, color: "#3b82f6" },
];

const INITIAL_CONNECTIONS = [
  { from: "1", to: "2" },
  { from: "2", to: "3" },
  { from: "2", to: "4" },
];

const NODE_WIDTH = 224; // w-56

export default function WorkflowsPage() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const connections = INITIAL_CONNECTIONS;

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1500);
  };

  const updateNodePos = (id: string, x: number, y: number) => {
    // Functional update to avoid stale closures
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-screen overflow-hidden bg-[#fcfaf7]">
      <BlueprintGrid />
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-8 z-30 flex justify-between items-center bg-gradient-to-b from-[#fcfaf7] via-[#fcfaf7]/80 to-transparent">
        <div>
          <div className="flex items-center gap-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">
            <span>Workspace</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-stone-900">Workflows</span>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Active Pipeline Builder</h1>
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${isSaving ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-400'}`}>
               <Save className={`w-3 h-3 ${isSaving ? 'animate-bounce' : ''}`} />
               <span>{isSaving ? 'Saving Changes...' : 'All Changes Saved'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white/80 backdrop-blur-md border border-stone-200 rounded-xl text-sm font-bold shadow-sm">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-stone-600">Pipeline Online</span>
             </div>
             <div className="w-[1px] h-4 bg-stone-200" />
             <div className="text-stone-400">Throughput: <span className="text-stone-900">1.2 GB/s</span></div>
          </div>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-[#1c1917] text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>Deploy Workflow</span>
          </button>
        </div>
      </div>

      {/* Builder Canvas */}
      <div className="flex-grow relative mt-24" ref={containerRef}>
        {/* SVG Connections Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-300">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
            </marker>
          </defs>
          
          {connections.map((conn, idx) => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            // Updated Connection Points based on actual width
            const x1 = fromNode.x + NODE_WIDTH;
            const y1 = fromNode.y + 40; // Approx center of header
            const x2 = toNode.x;
            const y2 = toNode.y + 40;
            const midX = (x1 + x2) / 2;

            // Smoother Cubic Bezier path
            const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

            return (
              <g key={`${conn.from}-${conn.to}`}>
                {/* Visual link body */}
                <path 
                  d={path} 
                  stroke="rgba(0,0,0,0.03)" 
                  strokeWidth="8" 
                  fill="none" 
                />
                <motion.path 
                  d={path} 
                  stroke={fromNode.color} 
                  strokeWidth="2" 
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                />
                
                {/* Data Pips */}
                <motion.circle 
                  r="3" 
                  fill={fromNode.color}
                  filter="blur(1px)"
                >
                  <animateMotion 
                    path={path} 
                    dur={`${2 + (idx % 3) * 0.5}s`}
                    repeatCount="indefinite" 
                  />
                </motion.circle>
              </g>
            );
          })}
        </svg>

        {/* Nodes Layer */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
          {nodes.map((node) => (
            <motion.div
              key={node.id}
              drag
              dragMomentum={false}
              onDrag={(e, info) => {
                // Stabilized position update using absolute point relative to container
                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                void rect;
                // info.delta is safer for incremental updates in frame-motion if used carefully
                updateNodePos(node.id, node.x + info.delta.x, node.y + info.delta.y);
              }}
              style={{ x: node.x, y: node.y }}
              className="absolute w-[224px] bg-white border border-stone-200 rounded-3xl shadow-xl pointer-events-auto cursor-grab active:cursor-grabbing group hover:border-orange-500/50 hover:shadow-2xl transition-all duration-300"
            >
              {/* Node Header */}
              <div className="p-4 border-b border-stone-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110"
                    style={{ backgroundColor: node.color }}
                   >
                     <node.icon className="w-5 h-5" />
                   </div>
                   <div>
                     <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{node.type}</p>
                     <h3 className="text-xs font-bold text-stone-900 leading-tight">{node.title}</h3>
                   </div>
                </div>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                   <button className="p-1 text-stone-300 hover:text-stone-600"><Settings className="w-3 h-3" /></button>
                   <button className="p-1 text-stone-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Node Body */}
              <div className="p-4">
                {node.type === 'model' && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-stone-500">
                      <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-orange-500" /> Confidence</span>
                      <span className="text-stone-900">94%</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-orange-500"
                        initial={{ width: 0 }}
                        animate={{ width: "94%" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-[10px] text-stone-400 font-medium">Latency: <span className="text-stone-900">12ms</span></p>
                  </div>
                )}

                {node.type === 'source' && (
                  <div className="relative rounded-2xl overflow-hidden h-24 bg-stone-900 group/video">
                     <img src="https://images.unsplash.com/photo-1541888941255-0816962f28fb?q=80&w=400" className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" alt="stream" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                     <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-red-500 text-[8px] font-bold text-white rounded-full uppercase shadow-lg shadow-red-500/20">
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                        Live Feed
                     </div>
                  </div>
                )}

                {node.type === 'action' && (
                  <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                     <div className={`w-2 h-2 rounded-full ${node.color === '#6735E0' ? 'bg-[#6735E0]' : 'bg-blue-500'}`} />
                     <span className="text-[10px] font-bold text-stone-600 truncate">{node.title} initialized</span>
                  </div>
                )}
              </div>

              {/* Port Markers */}
              {node.type !== 'action' && (
                <div className="absolute top-10 -right-2 w-4 h-4 bg-white border-2 border-orange-500 rounded-full z-30 shadow-sm" />
              )}
              {node.type !== 'source' && (
                <div className="absolute top-10 -left-2 w-4 h-4 bg-white border-2 border-stone-300 rounded-full z-30 shadow-sm" />
              )}

              {/* Node Footer */}
              <div className="px-4 pb-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <button className="text-[9px] font-bold text-orange-500 hover:underline">Config Params</button>
                 <ArrowRight className="w-3 h-3 text-stone-400" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="absolute right-8 bottom-8 z-30 flex flex-col gap-3">
          <button className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xl text-stone-600 hover:text-orange-500 hover:scale-110 active:scale-95 transition-all group relative">
             <Plus className="w-6 h-6" />
             <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-stone-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">Add Pipeline Node</div>
          </button>
          <button className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xl text-stone-600 hover:text-[#6735E0] hover:scale-110 transition-all group relative">
             <Monitor className="w-6 h-6" />
             <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-stone-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">Open Cloud Monitor</div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronRight(props: ComponentPropsWithoutRef<"svg">) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
