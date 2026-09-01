"use client";

import { Header, Screen } from "@/components/shell/header";
import { MonthChips } from "@/components/month-chips";
import { ParentNote } from "@/components/parent-note";
import { EmptyState } from "@/components/empty-state";
import { AlertCard } from "@/components/safety/alert-card";
import { useLanguage } from "@/hooks/use-language";
import type { MonthBundle } from "@/lib/month-content";

export function SafetyScreen({ month, content }: { month: number; content: MonthBundle }) {
  const { lang, t } = useLanguage();
  const items = content[lang].watchOuts;
  return (
    <>
      <Header title={t("safety.title")} subtitle={t(items.length === 1 ? "safety.subtitle_one" : "safety.subtitle", { month, count: items.length })} />
      <Screen className="space-y-4">
        <MonthChips basePath="/watch-outs" selectedMonth={month} />
        <ParentNote note={content[lang].note} sections={["watchout", "cheerup"]} />
        {items.length === 0 ? (
          <EmptyState text={t("safety.empty", { month })} />
        ) : (
          <div className="space-y-3">
            {items.map((w) => (
              <AlertCard key={w.id} watchOut={w} />
            ))}
          </div>
        )}
      </Screen>
    </>
  );
}
