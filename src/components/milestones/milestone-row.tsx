"use client";

import { Seal } from "@/components/brand/seal";
import { SourceBadge } from "@/components/source-badge";
import { useLanguage } from "@/hooks/use-language";
import { formatShortDate } from "@/i18n";
import type { Milestone } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MilestoneRowProps {
  milestone: Milestone;
  done: boolean;
  doneAt: string | null;
  stamping: boolean;
  onToggle: (id: string) => void;
  /** Compact rows (Home) hide the description and source. */
  compact?: boolean;
}

export function MilestoneRow({ milestone, done, doneAt, stamping, onToggle, compact = false }: MilestoneRowProps) {
  const { lang, t } = useLanguage();
  return (
    <li className="border-b border-rule last:border-b-0">
      <button
        type="button"
        aria-pressed={done}
        aria-label={done ? t("milestones.unconfirm", { title: milestone.title }) : t("milestones.confirm", { title: milestone.title })}
        onClick={() => onToggle(milestone.id)}
        className={cn("flex min-h-[52px] w-full items-start gap-3 rounded-lg py-3 text-left transition-colors hover:bg-hover/60 active:bg-hover", compact && "py-2")}
      >
        <Seal done={done} size={24} stamp={stamping} className="mt-px" />
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[15px] leading-snug", done ? "text-muted-foreground" : "text-foreground")}>{milestone.title}</span>
          {!compact && <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">{milestone.description}</span>}
          {done && doneAt && (
            <span className="tnum mt-1 block text-[12px] font-medium text-done">{t("milestones.confirmed_on", { date: formatShortDate(lang, doneAt) })}</span>
          )}
        </span>
      </button>
      {!compact && milestone.source && (
        <div className="-mt-2 pb-1 pl-9">
          <SourceBadge sourceInfo={milestone} itemTitle={milestone.title} />
        </div>
      )}
    </li>
  );
}
