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
  Lock,
  Mail,
  MessageCircle,
  MessagesSquare,
  Pencil,
  User,
  Video,
  Crown,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";

const navItems = [
  { name: "Home",      icon: LayoutDashboard, href: "/home" },
  { name: "Projects",  icon: FolderKanban,    href: "/projects" },
  { name: "Dataverse", icon: Globe2,          href: "/dataverse" },
  { name: "Train",     icon: Cpu,             href: "/train" },
  { name: "Workflows", icon: Workflow,        href: "/workflows" },
  { name: "Deploy",    icon: Send,            href: "/deploy" },
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
    <aside className="hidden md:flex w-72 h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-orange-100 flex flex-col border-r border-orange-200 fixed left-0 top-0 z-50">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-orange-200">
        <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-200/60">
          <Fingerprint className="text-orange-400 w-6 h-6" />
        </div>
        <span className="text-orange-950 font-bold text-2xl tracking-tight">VisioX</span>
        <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full border border-orange-200 uppercase tracking-widest">
          Beta
        </span>
      </div>

      <div className="px-4 py-4 border-b border-orange-200">
        <button className="w-full text-left group">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-orange-950">VisioX Workspace</p>
              <p className="mt-1 truncate text-sm font-semibold text-orange-700/70">
                Professional Plan - 1 Member
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-orange-400 transition group-hover:text-orange-600" />
          </div>
        </button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <p className="text-xs font-bold text-orange-700/60 uppercase tracking-widest px-3 mb-3">
          Development Hub
        </p>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 ${
                active
                  ? "bg-white text-orange-700 ring-1 ring-orange-200 shadow-sm shadow-orange-200/50"
                  : "text-orange-950/70 hover:bg-white/70 hover:text-orange-950"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-5 h-5 ${active ? "text-orange-500" : "text-orange-800/45 group-hover:text-orange-700"}`}
                />
                <span className="text-lg font-medium">{item.name}</span>
              </div>
              {active && (
                <motion.div
                  layoutId="platform-active-indicator"
                  className="w-1 h-3.5 bg-orange-300 rounded-full"
                />
              )}
            </Link>
          );
        })}

      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-orange-200 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-orange-950/65 hover:text-orange-950 hover:bg-white/70 rounded-xl transition-all text-base">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </button>

        <div className="relative group">
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-all hover:bg-white/70 focus-visible:bg-white/70 focus-visible:outline-none">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-100 via-amber-100 to-orange-200 flex items-center justify-center text-xs font-bold text-orange-800 shadow">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-orange-950 text-base font-bold truncate">{displayName}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-orange-500" />
          </button>

          <div className="pointer-events-none absolute bottom-0 left-[calc(100%+8px)] z-[70] w-64 translate-y-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <div className="rounded-lg border border-stone-200 bg-white shadow-2xl shadow-slate-900/15">
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 via-amber-100 to-orange-200 flex items-center justify-center text-xs font-bold text-orange-800 shadow">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-700">{displayName}</p>
                  <p className="truncate text-xs font-medium text-slate-500">{displayEmail}</p>
                </div>
              </div>

              <div className="border-t border-stone-200 py-2">
                <button className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-stone-50 hover:text-slate-900">
                  <User className="h-4 w-4 text-slate-400" />
                  Account Settings
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-stone-50 hover:text-slate-900"
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                  Sign Out
                </button>
              </div>

              <div className="border-t border-stone-200 py-2">
                <p className="px-4 pb-1 text-xs font-bold text-slate-800">Resources</p>
                <Link href="/about/blog" className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-stone-50 hover:text-slate-900">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Documentation
                </Link>
                <button className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-stone-50 hover:text-slate-900">
                  <MessagesSquare className="h-4 w-4 text-slate-400" />
                  Community Forum
                </button>
                <button className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-stone-50 hover:text-slate-900">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Changelog
                </button>
              </div>

              <div className="border-t border-stone-200 py-2">
                <p className="px-4 pb-1 text-xs font-bold text-slate-800">Get Help</p>
                <button className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-stone-50 hover:text-slate-900">
                  <Pencil className="h-4 w-4 text-slate-400" />
                  Send Feedback
                </button>
                <button className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-stone-50 hover:text-slate-900">
                  <Bug className="h-4 w-4 text-slate-400" />
                  Report a Bug
                </button>
                {[
                  { label: "Email Support", icon: Mail },
                  { label: "Chat", icon: MessageCircle },
                  { label: "Talk with an Expert", icon: Video },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-slate-400"
                    disabled
                  >
                    <item.icon className="h-4 w-4 text-slate-300" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))}
            </div>
          </div>
          </div>
        </div>

        <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-orange-300 bg-white/70 px-3 py-2.5 text-base font-bold text-orange-600 transition hover:bg-white">
          <Crown className="w-5 h-5" />
          Upgrade
        </button>
      </div>
    </aside>
  );
}
