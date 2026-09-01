"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { MilestoneRow } from "@/components/milestones/milestone-row";
import { useStamp } from "@/components/milestones/milestone-list";
import { useLanguage } from "@/hooks/use-language";
import { useMilestones } from "@/hooks/use-milestones";
import { useMonthContent } from "@/lib/month-content";

export function ThisMonthCard({ month }: { month: number }) {
  const { lang, t } = useLanguage();
  const { stats } = useMilestones();
  const { onToggle, isCompleted, completedAt, stamping } = useStamp();
  const content = useMonthContent(month, lang);
  const all = content?.milestones ?? [];
  const { done, total, percentage } = stats(all.map((m) => m.id));
  const pending = all.filter((m) => !isCompleted(m.id)).slice(0, 4);

  return (
    <section aria-labelledby="this-month" className="rounded-xl border border-rule bg-surface px-4 pt-4 pb-2">
      <div className="flex items-baseline justify-between">
        <h2 id="this-month" className="text-[1rem] font-semibold">
          {t("home.this_month")}
        </h2>
        <span className="tnum text-[0.8125rem] text-muted-foreground">{t("home.confirmed", { done, total })}</span>
      </div>
      <ProgressBar value={percentage} label={t("home.confirmed", { done, total })} className="mt-2" />
      {!content ? (
        <div className="h-[13.75rem]" aria-hidden="true" />
      ) : total === 0 ? (
        <p className="py-4 text-[0.9375rem] text-muted-foreground">{t("home.no_milestones", { month })}</p>
      ) : pending.length === 0 ? (
        <p className="py-4 text-[0.9375rem] text-muted-foreground">{t("home.all_done", { month })}</p>
      ) : (
        <ul className="mt-1">
          {pending.map((m) => (
            <MilestoneRow key={m.id} milestone={m} done={isCompleted(m.id)} doneAt={completedAt(m.id)} stamping={stamping === m.id} onToggle={onToggle} compact />
          ))}
        </ul>
      )}
      <Link href={`/milestones/${month}`} className="-mx-2 flex h-11 items-center justify-between rounded-lg px-2 text-[0.9375rem] font-semibold text-primary hover:bg-hover">
        {t("home.see_all", { count: total })}
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
