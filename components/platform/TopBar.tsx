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
    <header
      className={[
        "sticky top-0 z-40 bg-[#fcfaf7]/85 backdrop-blur-md",
        "border-b border-stone-200/80 flex items-center h-14 px-4 sm:px-6 gap-4",
      ].join(" ")}
    >
      {/* Breadcrumb */}
      <div
        className={[
          "flex items-center gap-2 text-stone-400 text-[11px] font-bold uppercase",
          "tracking-wider flex-1 min-w-0",
        ].join(" ")}
      >
        <Link href="/home" className="hover:text-stone-900 transition-colors">
          Workspace
        </Link>
        <ChevronRight className="w-3 h-3 text-stone-300 shrink-0" />
        <span className="text-stone-900 truncate">{title}</span>
      </div>

      {/* Search */}
      <div className="relative hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-3.5 h-3.5" />
        <input
          type="text"
          placeholder="Search datasets, models, jobs…"
          className={[
            "pl-8 pr-12 h-9 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900",
            "placeholder:text-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all w-60 md:w-72",
          ].join(" ")}
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-400 border border-stone-200">
          ⌘K
        </kbd>
      </div>

      {/* Notification */}
      <button
        type="button"
        aria-label="View notifications"
        className={[
          "relative flex h-9 w-9 items-center justify-center bg-white border border-stone-200 rounded-xl text-stone-500",
          "hover:text-stone-900 hover:bg-stone-50 transition-colors",
        ].join(" ")}
      >
        <Bell className="w-4 h-4" />
        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-500 rounded-full" />
      </button>

      {/* Avatar */}
      <div
        title={displayName}
        className={[
          "w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex",
          "items-center justify-center text-[11px] font-bold text-white shadow-xs",
          "cursor-pointer hover:opacity-90 transition-opacity ring-2 ring-white",
        ].join(" ")}
      >
        {initials}
      </div>
    </header>
  );
}
