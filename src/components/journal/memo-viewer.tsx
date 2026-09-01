"use client";

import ReactMarkdown from "react-markdown";
import type { Memo } from "@/lib/types";
import { useLanguage } from "@/hooks/use-language";
import { formatDate } from "@/i18n";

export function MemoViewer({ memo }: { memo: Memo }) {
  const { lang, t } = useLanguage();
  const edited = memo.updatedAt !== memo.createdAt;
  return (
    <article>
      <h2 className="font-display text-[24px] font-semibold leading-tight">{memo.title || t("journal.untitled")}</h2>
      <p className="tnum mt-1 text-[13px] text-muted-foreground">
        <time dateTime={memo.createdAt}>{formatDate(lang, memo.createdAt, { weekday: "short", year: "numeric", month: "long", day: "numeric" })}</time>
        {edited && <span> · {t("journal.edited", { date: formatDate(lang, memo.updatedAt, { month: "short", day: "numeric" }) })}</span>}
      </p>
      <div className="prose-dodam mt-4 border-t border-rule pt-4 text-[16px] leading-relaxed">
        {memo.content ? <ReactMarkdown>{memo.content}</ReactMarkdown> : <p className="text-muted-foreground">{t("journal.no_content")}</p>}
      </div>
    </article>
  );
}
