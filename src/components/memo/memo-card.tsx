"use client";

import Link from "next/link";
import { Memo } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";

interface MemoCardProps {
  memo: Memo;
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPreview(content: string, lines = 2): string {
  return content.split("\n").filter(Boolean).slice(0, lines).join("\n");
}

export function MemoCard({ memo }: MemoCardProps) {
  const { lang, t } = useLanguage();
  const locale = lang === "ko" ? "ko-KR" : "en-US";

  return (
    <Link href={`/memo/${memo.id}`}>
      <Card className="py-4 hover:shadow-md transition-shadow cursor-pointer border-warm-200/50 hover:border-warm-300/60">
        <CardContent className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-1">
              {memo.title || t("memo.untitled")}
            </h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(memo.updatedAt, locale)}
            </span>
          </div>

          {memo.content && (
            <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
              {getPreview(memo.content)}
            </p>
          )}

          {memo.tags && memo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {memo.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
