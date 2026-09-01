"use client";

import type { PlayTip } from "@/lib/types";
import type { MilestoneCategory } from "@/lib/types";
import { SourceBadge } from "@/components/source-badge";
import { CategoryLabel, DifficultyTag } from "@/components/tags";
import { useLanguage } from "@/hooks/use-language";

const CATS: MilestoneCategory[] = ["social", "language", "cognitive", "physical"];

export function TipCard({ tip }: { tip: PlayTip }) {
  const { t } = useLanguage();
  const category = CATS.includes(tip.category as MilestoneCategory) ? (tip.category as MilestoneCategory) : null;
  return (
    <article className="rounded-xl border border-rule bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[17px] font-semibold leading-snug">{tip.title}</h2>
        <DifficultyTag difficulty={tip.difficulty} />
      </div>
      {category && <CategoryLabel category={category} className="mt-1" />}
      <p className="mt-2 text-[15px] leading-relaxed text-foreground">{tip.description}</p>
      {tip.materials && tip.materials.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("play.materials")}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {tip.materials.map((m) => (
              <li key={m} className="rounded-full bg-hover px-2.5 py-1 text-[13px]">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
      {tip.source && (
        <div className="mt-2">
          <SourceBadge sourceInfo={tip} itemTitle={tip.title} />
        </div>
      )}
    </article>
  );
}
