"use client";

import type { WatchOut } from "@/lib/types";
import { SourceBadge } from "@/components/source-badge";
import { SeverityTag } from "@/components/tags";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

const BORDER = { urgent: "border-l-danger", caution: "border-l-caution", info: "border-l-info" } as const;

export function AlertCard({ watchOut }: { watchOut: WatchOut }) {
  const { t } = useLanguage();
  return (
    <article className={cn("rounded-xl border border-rule border-l-4 bg-surface p-4", BORDER[watchOut.severity])}>
      <SeverityTag severity={watchOut.severity} />
      <h2 className="mt-1.5 text-[17px] font-semibold leading-snug">{watchOut.title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed">{watchOut.description}</p>
      {watchOut.action && (
        <div className="mt-3 rounded-lg bg-hover p-3">
          <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("safety.action")}</h3>
          <p className="text-[15px] leading-relaxed">{watchOut.action}</p>
        </div>
      )}
      {watchOut.source && (
        <div className="mt-2">
          <SourceBadge sourceInfo={watchOut} itemTitle={watchOut.title} />
        </div>
      )}
    </article>
  );
}
