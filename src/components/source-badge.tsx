"use client";

import { BookOpen, ExternalLink } from "lucide-react";
import type { SourceInfo } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";

interface SourceBadgeProps {
  sourceInfo: SourceInfo;
  itemTitle: string;
}

export function SourceBadge({ sourceInfo, itemTitle }: SourceBadgeProps) {
  const { t } = useLanguage();
  if (!sourceInfo.source) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={t("source.aria", { source: sourceInfo.source })}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[0.75rem] font-medium text-muted-foreground hover:bg-hover hover:text-foreground"
        >
          <BookOpen className="size-3.5" aria-hidden="true" />
          <span translate="no">{sourceInfo.source}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] overscroll-contain sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6 text-base leading-snug">{itemTitle}</DialogTitle>
          <DialogDescription className="text-[0.8125rem]">
            {t("source.label")}: <span translate="no">{sourceInfo.source}</span>
          </DialogDescription>
        </DialogHeader>
        {sourceInfo.sourceQuote && (
          <blockquote className="border-l-2 border-primary/40 pl-3">
            <p className="text-[0.9375rem] leading-relaxed text-foreground">“{sourceInfo.sourceQuote}”</p>
          </blockquote>
        )}
        {sourceInfo.sourceUrl && (
          <a
            href={sourceInfo.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rule text-[0.9375rem] font-medium hover:bg-hover"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            {t("source.view")}
          </a>
        )}
        <p className="text-[0.75rem] leading-relaxed text-muted-foreground">{t("source.disclaimer", { source: sourceInfo.source })}</p>
      </DialogContent>
    </Dialog>
  );
}
