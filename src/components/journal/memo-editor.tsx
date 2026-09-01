"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

interface MemoEditorProps {
  title: string;
  content: string;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
}

export function MemoEditor({ title, content, onTitleChange, onContentChange }: MemoEditorProps) {
  const [preview, setPreview] = useState(false);
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <label className="sr-only" htmlFor="memo-title">
        {t("journal.placeholder_title")}
      </label>
      <input
        id="memo-title"
        name="title"
        type="text"
        autoComplete="off"
        placeholder={t("journal.placeholder_title")}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="h-12 w-full rounded-lg border border-rule bg-surface px-3 text-[17px] font-semibold placeholder:text-muted-foreground/70 focus-visible:border-primary"
      />
      <div role="group" aria-label={t("journal.preview")} className="flex gap-1 rounded-lg bg-hover p-1">
        {(["write", "preview"] as const).map((mode) => {
          const active = preview === (mode === "preview");
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={active}
              onClick={() => setPreview(mode === "preview")}
              className={cn(
                "h-11 flex-1 rounded-md text-[14px] font-semibold transition-colors",
                active ? "bg-surface text-foreground shadow-[0_1px_0_var(--gb-rule)]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(mode === "write" ? "journal.write" : "journal.preview")}
            </button>
          );
        })}
      </div>
      {preview ? (
        <div className="prose-dodam min-h-[40vh] rounded-lg border border-rule bg-surface p-4 text-[15px]">
          {content ? <ReactMarkdown>{content}</ReactMarkdown> : <p className="text-muted-foreground">{t("journal.preview_empty")}</p>}
        </div>
      ) : (
        <>
          <label className="sr-only" htmlFor="memo-content">
            {t("journal.placeholder_body")}
          </label>
          <textarea
            id="memo-content"
            name="content"
            placeholder={t("journal.placeholder_body")}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="min-h-[40vh] w-full resize-y rounded-lg border border-rule bg-surface p-3 text-[15px] leading-relaxed placeholder:text-muted-foreground/70 focus-visible:border-primary"
          />
        </>
      )}
    </div>
  );
}
