"use client";

import { Header, Screen } from "@/components/shell/header";
import { MonthChips } from "@/components/month-chips";
import { EmptyState } from "@/components/empty-state";
import { TipCard } from "@/components/play/tip-card";
import { useLanguage } from "@/hooks/use-language";
import type { MonthBundle } from "@/lib/month-content";

export function PlayScreen({ month, content }: { month: number; content: MonthBundle }) {
  const { lang, t } = useLanguage();
  const tips = content[lang].playTips;
  return (
    <>
      <Header title={t("play.title")} subtitle={t(tips.length === 1 ? "play.subtitle_one" : "play.subtitle", { month, count: tips.length })} />
      <Screen className="space-y-4">
        <MonthChips basePath="/play-tips" selectedMonth={month} />
        {tips.length === 0 ? (
          <EmptyState text={t("play.empty", { month })} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {tips.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>
        )}
      </Screen>
    </>
  );
}
