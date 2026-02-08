"use client";

import { SourceInfo } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, BookOpen } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface SourceModalProps {
  sourceInfo: SourceInfo;
  itemTitle: string;
}

export function SourceBadge({ sourceInfo, itemTitle }: SourceModalProps) {
  const { t } = useLanguage();

  if (!sourceInfo.source) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80 hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0">
          <BookOpen className="h-2.5 w-2.5" />
          <span className="hover:underline">{sourceInfo.source}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug pr-6">
            {itemTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Source information for {itemTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {sourceInfo.source}
            </Badge>
          </div>

          {sourceInfo.sourceQuote && (
            <blockquote className="border-l-2 border-primary/30 pl-3 py-1">
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                &ldquo;{sourceInfo.sourceQuote}&rdquo;
              </p>
            </blockquote>
          )}

          {sourceInfo.sourceUrl && (
            <Button variant="outline" size="sm" asChild className="w-full">
              <a
                href={sourceInfo.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("source.view_original")}
              </a>
            </Button>
          )}

          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
            {t("source.disclaimer").replace("{source}", sourceInfo.source)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
