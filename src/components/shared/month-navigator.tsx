"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ALL_MONTHS } from "@/lib/constants";
import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/contexts/language-context";

interface MonthNavigatorProps {
  basePath: string;
  selectedMonth: number;
}

export function MonthNavigator({ basePath, selectedMonth }: MonthNavigatorProps) {
  const { currentMonth } = useAge();
  const { lang } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = selectedRef.current;
      const containerWidth = container.offsetWidth;
      const elementLeft = element.offsetLeft;
      const elementWidth = element.offsetWidth;
      container.scrollLeft = elementLeft - containerWidth / 2 + elementWidth / 2;
    }
  }, [selectedMonth]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide px-1"
        style={{ scrollBehavior: "smooth" }}
      >
        {ALL_MONTHS.map((month) => {
          const isSelected = month === selectedMonth;
          const isCurrent = month === currentMonth;

          return (
            <Link
              key={month}
              ref={isSelected ? selectedRef : undefined}
              href={`${basePath}/${month}`}
              className={cn(
                "flex-shrink-0 px-3.5 py-2 md:px-3 md:py-1.5 rounded-full text-sm font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isCurrent
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
              )}
            >
              {lang === "ko" ? `${month}개월` : `${month}m`}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
