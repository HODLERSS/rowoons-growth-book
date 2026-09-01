"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ALL_MONTHS } from "@/lib/constants";
import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/hooks/use-language";

interface MonthChipsProps {
  basePath: string;
  selectedMonth: number;
}

export function MonthChips({ basePath, selectedMonth }: MonthChipsProps) {
  const { currentMonth } = useAge();
  const { t } = useLanguage();
  const selectedRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
  }, [selectedMonth]);

  return (
    <nav aria-label={t("months.label")} className="-mx-4">
      <ul className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-1">
        {ALL_MONTHS.map((month) => {
          const selected = month === selectedMonth;
          const current = month === currentMonth;
          return (
            <li key={month} className="shrink-0">
              <Link
                ref={selected ? selectedRef : undefined}
                href={`${basePath}/${month}`}
                aria-current={selected ? "page" : undefined}
                aria-label={current ? t("months.current", { month }) : t("months.aria", { month })}
                className={cn(
                  "tnum flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[0.9375rem] font-semibold transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : current
                      ? "bg-hover text-primary ring-1 ring-primary/40 hover:bg-rule"
                      : "bg-hover text-muted-foreground hover:bg-rule hover:text-foreground"
                )}
              >
                {month}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
