"use client";

import { useMemo } from "react";
import { Header, Screen } from "@/components/shell/header";
import { MonthChips } from "@/components/month-chips";
import { ParentNote } from "@/components/parent-note";
import { ProgressBar } from "@/components/progress-bar";
import { EmptyState } from "@/components/empty-state";
import { MilestoneSections } from "@/components/milestones/milestone-list";
import { useLanguage } from "@/hooks/use-language";
import { useMilestones } from "@/hooks/use-milestones";
import { byCategory as splitByCategory, type MonthBundle } from "@/lib/month-content";

export function MilestonesScreen({ month, content }: { month: number; content: MonthBundle }) {
  const { lang, t } = useLanguage();
  const { stats } = useMilestones();
  const all = content[lang].milestones;
  const byCategory = useMemo(() => splitByCategory(all), [all]);
  const { done, total, percentage } = stats(all.map((m) => m.id));
  const subtitle = t(all.length === 1 ? "milestones.subtitle_one" : "milestones.subtitle", { month, count: all.length });

  return (
    <>
      <Header title={t("milestones.title")} subtitle={subtitle} />
      <Screen className="space-y-4">
        <MonthChips basePath="/milestones" selectedMonth={month} />
        <ParentNote note={content[lang].note} sections={["milestone", "cheerup"]} />
        {all.length === 0 ? (
          <EmptyState text={t("milestones.empty", { month })} />
        ) : (
          <>
            <section aria-label={t("milestones.progress", { done, total })} className="rounded-xl border border-rule bg-surface p-4">
              <div className="mb-2 flex items-center justify-between text-[0.9375rem]">
                <span className="font-semibold">{t("milestones.progress", { done, total })}</span>
                <span className="tnum font-semibold text-primary">{percentage}%</span>
              </div>
              <ProgressBar value={percentage} label={t("milestones.progress", { done, total })} />
            </section>
            <MilestoneSections byCategory={byCategory} />
          </>
        )}
      </Screen>
    </>
  );
}
