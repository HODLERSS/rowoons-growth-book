"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useMonthContent } from "@/lib/month-content";

export function NoteCard({ month }: { month: number }) {
  const { lang, t } = useLanguage();
  const content = useMonthContent(month, lang);
  const note = content?.note;
  if (!note) return null;
  return (
    <section aria-labelledby="note-card" className="rounded-xl border border-rule bg-surface px-4 pt-4 pb-2">
      <h2 id="note-card" className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {t("home.note_title", { month })}
      </h2>
      <p className="mt-2 text-[1.0625rem] leading-relaxed">{note.cheerup}</p>
      <Link href={`/milestones/${month}`} className="-mx-2 mt-1 flex h-11 items-center justify-between rounded-lg px-2 text-[0.9375rem] font-semibold text-primary hover:bg-hover">
        {t("home.note_more")}
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
