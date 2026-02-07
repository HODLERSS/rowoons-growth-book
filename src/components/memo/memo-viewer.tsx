"use client";

import ReactMarkdown from "react-markdown";
import { Memo } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface MemoViewerProps {
  memo: Memo;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MemoViewer({ memo }: MemoViewerProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-xl font-bold leading-tight">
          {memo.title || "Untitled"}
        </h1>

        <p className="text-xs text-muted-foreground">
          {formatDate(memo.createdAt)}
          {memo.updatedAt !== memo.createdAt && (
            <span> (edited {formatDate(memo.updatedAt)})</span>
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
            <p className="text-muted-foreground italic">No content</p>
          )}
        </div>
      </div>
    </div>
  );
}
