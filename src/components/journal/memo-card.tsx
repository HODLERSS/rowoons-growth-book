"use client";

import Link from "next/link";
import type { Memo } from "@/lib/types";
import { useLanguage } from "@/hooks/use-language";
import { formatDate } from "@/i18n";

function preview(content: string, lines = 2): string {
  return content
    .split("\n")
    .map((l) => l.replace(/^[#>*-]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, lines)
    .join(" ");
}

export function MemoCard({ memo }: { memo: Memo }) {
  const { lang, t } = useLanguage();
  return (
    <li>
      <Link
        href={`/memo/view?id=${encodeURIComponent(memo.id)}`}
        className="block rounded-xl border border-rule bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-hover/40"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="min-w-0 flex-1 truncate text-[16px] font-semibold">{memo.title || t("journal.untitled")}</h2>
          <time dateTime={memo.updatedAt} className="tnum shrink-0 text-[12px] text-muted-foreground">
            {formatDate(lang, memo.updatedAt, { month: "short", day: "numeric", year: "numeric" })}
          </time>
        </div>
        {memo.content && <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">{preview(memo.content)}</p>}
      </Link>
    </li>
  );
}
