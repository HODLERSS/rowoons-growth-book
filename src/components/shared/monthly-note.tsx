"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getMonthlyNote } from "@/lib/content-loader";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

interface MonthlyNoteProps {
  month: number;
  variant: "milestones" | "play-tips" | "watch-outs";
}

const VARIANT_CONFIG = {
  milestones: {
    icon: "🌱",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    sections: ["milestone", "cheerup"] as const,
  },
  "play-tips": {
    icon: "🎨",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    iconBg: "bg-violet-100 dark:bg-violet-900/50",
    sections: ["milestone", "cheerup"] as const,
  },
  "watch-outs": {
    icon: "💛",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    sections: ["watchout", "cheerup"] as const,
  },
};

export function MonthlyNote({ month, variant }: MonthlyNoteProps) {
  const [open, setOpen] = useState(false);
  const { lang, t } = useLanguage();
  const note = getMonthlyNote(month, lang);
  const config = VARIANT_CONFIG[variant];

  if (!note) return null;

  return (
    <div className={cn("rounded-lg border", config.bg, config.border)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left"
      >
        <span
          className={cn(
            "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm",
            config.iconBg
          )}
        >
          {config.icon}
        </span>
        <span className="text-sm font-medium flex-1">{t("note.label")}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 space-y-2.5">
          {config.sections.map((section) => (
            <p
              key={section}
              className={cn(
                "text-sm leading-relaxed",
                section === "cheerup"
                  ? "text-muted-foreground/80 italic"
                  : "text-muted-foreground"
              )}
            >
              {note[section]}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
