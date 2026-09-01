"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useMemos } from "@/hooks/use-memos";
import { useLanguage } from "@/hooks/use-language";
import { formatShortDate } from "@/i18n";

export function JournalCard() {
  const { memos } = useMemos();
  const { lang, t } = useLanguage();
  const recent = memos.slice(0, 3);
  return (
    <section aria-labelledby="journal-card" className="rounded-xl border border-rule bg-surface px-4 py-2">
      <div className="flex h-11 items-center justify-between">
        <h2 id="journal-card" className="text-[1rem] font-semibold">
          {t("home.journal")}
        </h2>
        <Link href="/memo/new" className="-mr-2 flex h-11 items-center gap-1 rounded-lg px-2 text-[0.9375rem] font-semibold text-primary hover:bg-hover">
          <Plus className="size-4" aria-hidden="true" />
          {t("home.write")}
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="pb-3 text-[0.9375rem] leading-relaxed text-muted-foreground">{t("journal.empty")}</p>
      ) : (
        <ul>
          {recent.map((m) => (
            <li key={m.id} className="-mx-4 border-t border-rule px-4 transition-colors hover:bg-hover">
              <Link href={`/memo/view?id=${encodeURIComponent(m.id)}`} className="flex min-h-[3rem] items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{m.title || t("journal.untitled")}</span>
                <time dateTime={m.updatedAt} className="tnum shrink-0 text-[0.75rem] text-muted-foreground">
                  {formatShortDate(lang, m.updatedAt)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
