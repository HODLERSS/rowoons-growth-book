"use client";

import { ChevronDown, BookOpen } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import type { MonthlyNote } from "@/lib/types";

interface ParentNoteProps {
  note: MonthlyNote | null;
  /** Which of the three voices to show. */
  sections: ("milestone" | "watchout" | "cheerup")[];
  defaultOpen?: boolean;
}

export function ParentNote({ note, sections, defaultOpen = false }: ParentNoteProps) {
  const { t } = useLanguage();
  if (!note) return null;
  const labels = { milestone: t("note.milestone"), watchout: t("note.watchout"), cheerup: t("note.cheerup") } as const;
  return (
    <details className="group rounded-xl border border-rule bg-surface" open={defaultOpen}>
      <summary className="flex min-h-[3.25rem] cursor-pointer list-none items-center gap-3 px-4 py-2 text-[0.9375rem] font-medium [&::-webkit-details-marker]:hidden">
        <BookOpen className="size-[1.125rem] text-primary" aria-hidden="true" />
        <span className="flex-1">{t("note.label")}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-4 px-4 pb-4">
        {sections.map((s) => (
          <section key={s}>
            <h3 className="mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{labels[s]}</h3>
            <p className={s === "cheerup" ? "text-[0.9375rem] font-medium leading-relaxed" : "text-[0.9375rem] leading-relaxed"}>{note[s]}</p>
          </section>
        ))}
      </div>
    </details>
  );
}
