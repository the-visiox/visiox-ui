"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Globe2,
  Workflow,
  Cpu,
  Send,
  ChevronRight,
  Fingerprint,
  LogOut,
  Bell,
  Bug,
  FileText,
  MessagesSquare,
  Pencil,
  User,
  Crown,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";

const navItems = [
  { name: "Home", icon: LayoutDashboard, href: "/home" },
  { name: "Projects", icon: FolderKanban, href: "/projects" },
  { name: "Dataverse", icon: Globe2, href: "/dataverse" },
  { name: "Train", icon: Cpu, href: "/train" },
  { name: "Workflows", icon: Workflow, href: "/workflows" },
  { name: "Deploy", icon: Send, href: "/deploy" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const displayName = user?.first_name || user?.email?.split("@")[0] || "nhattan chu";
  const displayEmail = user?.email || "chunhattan2001@gmail.com";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={[
        "hidden md:flex w-64 h-screen bg-[#faf8f5]/95 backdrop-blur-md",
        "flex-col border-r border-stone-200/80 fixed left-0 top-0 z-50",
      ].join(" ")}
    >
      {/* Brand */}
      <div className="p-5 flex items-center gap-3 border-b border-stone-200/80">
        <div
          className={[
            "w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-xs",
            "border border-stone-200/80 text-orange-500",
          ].join(" ")}
        >
          <Fingerprint className="w-5 h-5" />
        </div>
        <span className="text-stone-900 font-bold text-xl tracking-tight">VisioX</span>
        <span
          className={[
            "ml-auto px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-full",
            "border border-orange-200/60 uppercase tracking-wider",
          ].join(" ")}
        >
          Beta
        </span>
      </div>

      {/* Workspace Selector */}
      <div className="px-3 py-3 border-b border-stone-200/80">
        <button className="w-full text-left p-2 rounded-xl hover:bg-stone-100/70 transition-colors group">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-stone-900">VisioX Workspace</p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-stone-400">Professional Plan</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-400 transition group-hover:text-stone-700" />
          </div>
        </button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-3 mb-2">Development Hub</p>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center justify-between px-3 h-10 rounded-xl
                text-sm transition-all duration-150 ${
                  active
                    ? "bg-orange-50/80 text-orange-700 font-semibold border border-orange-200/60 shadow-xs"
                    : "font-medium text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"
                }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-4 h-4 ${active ? "text-orange-500" : "text-stone-400 group-hover:text-stone-600"}`}
                />
                <span>{item.name}</span>
              </div>
              {active && (
                <motion.div layoutId="platform-active-indicator" className="w-1 h-3.5 bg-orange-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-stone-200/80 space-y-2">
        <button
          className={[
            "w-full flex items-center gap-3 px-3 h-9 text-stone-600 hover:text-stone-900",
            "hover:bg-stone-100/80 rounded-xl transition-colors text-xs font-medium",
          ].join(" ")}
        >
          <Bell className="w-4 h-4 text-stone-400" />
          <span>Notifications</span>
        </button>

        <div className="relative group">
          <button
            className={[
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors",
              "hover:bg-stone-100/80 focus-visible:bg-stone-100/80 focus-visible:outline-none",
            ].join(" ")}
          >
            <div
              className={[
                "w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex",
                "items-center justify-center text-[11px] font-bold text-white shadow-xs",
              ].join(" ")}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-stone-900 text-xs font-bold truncate">{displayName}</p>
              <p className="text-stone-400 text-[10px] truncate">{displayEmail}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>

          <div
            className={[
              "pointer-events-none absolute bottom-0 left-[calc(100%+8px)] z-[70] w-64 translate-y-2",
              "opacity-0 transition-all duration-150 group-hover:pointer-events-auto",
              "group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto",
              "group-focus-within:translate-y-0 group-focus-within:opacity-100",
            ].join(" ")}
          >
            <div
              className={["rounded-2xl border border-stone-200 bg-white shadow-2xl p-1.5", "shadow-stone-950/10"].join(" ")}
            >
              <div className="flex items-center gap-3 p-3">
                <div
                  className={[
                    "w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500",
                    "flex items-center justify-center text-xs font-bold text-white shadow-xs",
                  ].join(" ")}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-stone-900">{displayName}</p>
                  <p className="truncate text-[11px] font-medium text-stone-400">{displayEmail}</p>
                </div>
              </div>

              <div className="border-t border-stone-100 py-1.5">
                <button
                  className={[
                    "flex w-full items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 transition",
                    "hover:bg-stone-50 hover:text-stone-900",
                  ].join(" ")}
                >
                  <User className="h-3.5 w-3.5 text-stone-400" />
                  Account Settings
                </button>
                <button
                  onClick={logout}
                  className={[
                    "flex w-full items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 transition",
                    "hover:bg-stone-50 hover:text-stone-900",
                  ].join(" ")}
                >
                  <LogOut className="h-3.5 w-3.5 text-stone-400" />
                  Sign Out
                </button>
              </div>

              <div className="border-t border-stone-100 py-1.5">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">Resources</p>
                <Link
                  href="/about/blog"
                  className={[
                    "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 transition",
                    "hover:bg-stone-50 hover:text-stone-900",
                  ].join(" ")}
                >
                  <FileText className="h-3.5 w-3.5 text-stone-400" />
                  Documentation
                </Link>
                <button
                  className={[
                    "flex w-full items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 transition",
                    "hover:bg-stone-50 hover:text-stone-900",
                  ].join(" ")}
                >
                  <MessagesSquare className="h-3.5 w-3.5 text-stone-400" />
                  Community Forum
                </button>
              </div>

              <div className="border-t border-stone-100 py-1.5">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">Get Help</p>
                <button
                  className={[
                    "flex w-full items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 transition",
                    "hover:bg-stone-50 hover:text-stone-900",
                  ].join(" ")}
                >
                  <Pencil className="h-3.5 w-3.5 text-stone-400" />
                  Send Feedback
                </button>
                <button
                  className={[
                    "flex w-full items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 transition",
                    "hover:bg-stone-50 hover:text-stone-900",
                  ].join(" ")}
                >
                  <Bug className="h-3.5 w-3.5 text-stone-400" />
                  Report a Bug
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          className={[
            "w-full flex items-center justify-center gap-2 rounded-xl border border-orange-200",
            "bg-orange-50/70 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-100",
          ].join(" ")}
        >
          <Crown className="w-3.5 h-3.5 text-orange-500" />
          Upgrade Plan
        </button>
      </div>
    </aside>
  );
}
