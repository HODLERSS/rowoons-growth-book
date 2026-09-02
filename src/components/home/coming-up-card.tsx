"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SeverityTag } from "@/components/tags";
import { Button } from "@/components/ui/button";
import { useAcks } from "@/hooks/use-acks";
import { useLanguage } from "@/hooks/use-language";
import { MONTH_RANGE } from "@/lib/constants";
import { useMonthContent } from "@/lib/month-content";

/**
 * Next month, one month early: the top unacknowledged watch-out (babies start rolling, climbing and
 * grabbing before the calendar says so) and the first milestones to expect.
 */
export function ComingUpCard({ month }: { month: number }) {
  const next = month + 1;
  const { lang, t } = useLanguage();
  const { isAcked, ack } = useAcks();
  const content = useMonthContent(Math.min(next, MONTH_RANGE.max), lang);
  if (next > MONTH_RANGE.max || !content) return null;
  const watchOut = content.watchOuts.find((w) => !isAcked(w.id)) ?? null;
  const milestones = content.milestones.slice(0, 2);
  if (!watchOut && milestones.length === 0) return null;

  return (
    <section aria-labelledby="coming-up" className="rounded-xl border border-rule bg-surface px-4 pt-4 pb-2">
      <div className="flex items-baseline justify-between">
        <h2 id="coming-up" className="text-[1rem] font-semibold">
          {t("home.coming_up")}
        </h2>
        <span className="tnum text-[0.8125rem] text-muted-foreground">{t("home.coming_up_month", { month: next })}</span>
      </div>

      {watchOut && (
        <div className="mt-3">
          <SeverityTag severity={watchOut.severity} />
          <p className="mt-1.5 text-[0.9375rem] font-semibold leading-snug">{watchOut.title}</p>
          <p className="mt-1 text-[0.875rem] leading-relaxed text-muted-foreground">{watchOut.action ?? watchOut.description}</p>
          <div className="-mr-2 flex justify-end">
            <Button type="button" variant="ghost" size="lg" onClick={() => ack(watchOut.id)}>
              {t("home.got_it")}
            </Button>
          </div>
        </div>
      )}

      {milestones.length > 0 && (
        <div className={watchOut ? "mt-1 border-t border-rule pt-3" : "mt-3"}>
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("home.coming_up_next")}</p>
          <ul className="mt-1 space-y-0.5">
            {milestones.map((m) => (
              <li key={m.id} className="text-[0.9375rem] leading-snug">
                {m.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href={`/milestones/${next}`} className="-mx-2 mt-1 flex h-11 items-center justify-between rounded-lg px-2 text-[0.9375rem] font-semibold text-primary hover:bg-hover">
        {t("home.see_month", { month: next })}
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
