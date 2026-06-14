"use client";

import { Search, Bell, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

// Derive a friendly breadcrumb title from the current path segment.
function crumb(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean);
  const last = seg[seg.length - 1] ?? "overview";
  if (last === "overview") return "Home";
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

export default function TopBar() {
  const pathname = usePathname();
  const title = crumb(pathname);
  const { user } = useAuth();
  const displayName = user?.first_name || user?.email?.split("@")[0] || "U";
  const initials = displayName
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="fixed top-0 md:left-[272px] left-0 right-0 h-16 z-40 bg-[#fcfaf7]/80 backdrop-blur-md border-b border-stone-200 flex items-center px-4 md:px-8 gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest flex-1">
        <Link href="/home" className="hover:text-stone-900 transition-colors">
          Workspace
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-stone-900">{title}</span>
      </div>

      {/* Search */}
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-3.5 h-3.5" />
        <input
          type="text"
          placeholder="Search anything…"
          className="pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all w-52"
        />
      </div>

      {/* Notification */}
      <button className="relative p-2 bg-white border border-stone-200 rounded-xl text-stone-500 hover:text-stone-900 transition-all">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full" />
      </button>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-100 via-amber-100 to-orange-200 flex items-center justify-center text-[10px] font-bold text-orange-800 cursor-pointer shadow hover:scale-110 transition-transform">
        {initials}
      </div>
    </header>
  );
}
