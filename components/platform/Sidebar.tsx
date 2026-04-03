"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Database,
  Workflow,
  Cpu,
  Send,
  Settings,
  HelpCircle,
  ChevronRight,
  Fingerprint,
  LogOut,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";

const navItems = [
  { name: "Overview",  icon: LayoutDashboard, href: "/overview" },
  { name: "Projects",  icon: FolderKanban,    href: "/projects" },
  { name: "Datasets",  icon: Database,        href: "/datasets" },
  { name: "Workflows", icon: Workflow,         href: "/workflows" },
  { name: "Train",     icon: Cpu,             href: "/train" },
  { name: "Deploy",    icon: Send,            href: "/deploy" },
];

const solutionItems = [
  { name: "Manufacturing", href: "/solutions/manufacturing-industrial" },
  { name: "Security",      href: "/solutions/surveillance-security" },
  { name: "Smart Cities",  href: "/solutions/transportation-smart-cities" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-64 h-screen bg-[#1c1917] flex flex-col border-r border-stone-800 fixed left-0 top-0 z-50">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-stone-800">
        <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20">
          <Fingerprint className="text-white w-5 h-5" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">VisioX</span>
        <span className="ml-auto px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-bold rounded-full border border-orange-500/20 uppercase tracking-widest">
          Beta
        </span>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <p className="text-[9px] font-bold text-stone-600 uppercase tracking-widest px-3 mb-3">
          Development Hub
        </p>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 ${
                active
                  ? "bg-orange-500/10 text-orange-400"
                  : "text-stone-400 hover:bg-stone-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-4 h-4 ${active ? "text-orange-400" : "text-stone-500 group-hover:text-stone-300"}`}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              {active && (
                <motion.div
                  layoutId="platform-active-indicator"
                  className="w-1 h-3.5 bg-orange-500 rounded-full"
                />
              )}
            </Link>
          );
        })}

        <p className="text-[9px] font-bold text-stone-600 uppercase tracking-widest px-3 mt-6 mb-3">
          Industry Solutions
        </p>
        {solutionItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                active
                  ? "bg-orange-500/10 text-orange-400"
                  : "text-stone-500 hover:bg-stone-800/60 hover:text-white"
              }`}
            >
              <span>{item.name}</span>
              <ChevronRight
                className={`w-3 h-3 ${active ? "text-orange-400" : "text-stone-700"}`}
              />
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-stone-800 space-y-0.5">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-stone-500 hover:text-white hover:bg-stone-800/60 rounded-lg transition-all text-xs group">
          <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
          <span>Project Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 text-stone-500 hover:text-white hover:bg-stone-800/60 rounded-lg transition-all text-xs">
          <HelpCircle className="w-4 h-4" />
          <span>Documentation</span>
        </button>

        {/* User panel */}
        <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
          <div className="flex items-center gap-3 p-2 bg-stone-900/50 rounded-xl border border-stone-800">
            <div className="w-8 h-8 rounded-lg bg-[#6735E0] flex items-center justify-center text-[10px] font-bold text-white shadow">
              JS
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-white text-[11px] font-bold truncate">John's Workspace</p>
              <p className="text-[9px] text-stone-500 truncate">Professional Plan</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all text-[11px] font-bold group"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
