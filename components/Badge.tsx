"use client";

import { ReactNode } from "react";

interface BadgeProps {
  children: string;
  icon?: ReactNode;
  accentHex?: string;
  className?: string;
}

export default function Badge({ children, icon, accentHex = "#FF7300", className = "" }: BadgeProps) {
  // Truncate to maximum 5 words
  const words = children.trim().split(/\s+/);
  const truncatedText = words.length > 5 ? words.slice(0, 5).join(" ") + "..." : children;

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs
        font-black uppercase tracking-widest border ${className}`}
      style={{
        backgroundColor: `${accentHex}10`,
        color: accentHex,
        borderColor: `${accentHex}30`,
      }}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="line-clamp-2 leading-tight">{truncatedText}</span>
    </div>
  );
}
