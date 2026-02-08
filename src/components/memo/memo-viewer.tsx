"use client";

import ReactMarkdown from "react-markdown";
import { Memo } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";

interface MemoViewerProps {
  memo: Memo;
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MemoViewer({ memo }: MemoViewerProps) {
  const { lang, t } = useLanguage();
  const locale = lang === "ko" ? "ko-KR" : "en-US";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-xl font-bold leading-tight">
          {memo.title || t("memo.untitled")}
        </h1>

        <p className="text-xs text-muted-foreground">
          {formatDate(memo.createdAt, locale)}
          {memo.updatedAt !== memo.createdAt && (
            <span> ({t("memo.edited")} {formatDate(memo.updatedAt, locale)})</span>
          )}
        </p>

        {memo.tags && memo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {memo.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-warm-200/60 pt-4">
        <div className="prose prose-sm max-w-none">
          {memo.content ? (
            <ReactMarkdown>{memo.content}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">{t("memo.no_content")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
