"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eye, Pencil } from "lucide-react";

interface MemoEditorProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
}

export function MemoEditor({
  title,
  content,
  onTitleChange,
  onContentChange,
}: MemoEditorProps) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Memo title..."
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="text-base font-semibold border-warm-200 focus-visible:border-warm-400"
      />

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPreview(!preview)}
          className="text-xs text-muted-foreground"
        >
          {preview ? (
            <>
              <Pencil className="size-3.5" />
              Edit
            </>
          ) : (
            <>
              <Eye className="size-3.5" />
              Preview
            </>
          )}
        </Button>
      </div>

      {preview ? (
        <div className="prose prose-sm max-w-none rounded-md border border-warm-200 bg-card p-4 min-h-[200px]">
          {content ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">Nothing to preview</p>
          )}
        </div>
      ) : (
        <Textarea
          placeholder="Write your memo here... (supports markdown)"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className="min-h-[300px] md:min-h-[200px] resize-y border-warm-200 focus-visible:border-warm-400"
        />
      )}
    </div>
  );
}
