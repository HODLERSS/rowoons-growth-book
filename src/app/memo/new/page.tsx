"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/shared/header";
import { Button } from "@/components/ui/button";
import { MemoEditor } from "@/components/memo/memo-editor";
import { useMemos } from "@/hooks/use-memos";
import { ArrowLeft, Save } from "lucide-react";

export default function NewMemoPage() {
  const router = useRouter();
  const { create } = useMemos();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  function handleSave() {
    if (!title.trim() && !content.trim()) return;
    setSaving(true);
    create({ title: title.trim(), content: content.trim() });
    router.push("/memo");
  }

  function handleCancel() {
    router.push("/memo");
  }

  const canSave = title.trim() || content.trim();

  return (
    <div className="flex flex-col h-full">
      <Header
        title="New Memo"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <ArrowLeft className="size-4" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canSave || saving}
            >
              <Save className="size-4" />
              Save
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-4 pb-8">
          <MemoEditor
            title={title}
            content={content}
            onTitleChange={setTitle}
            onContentChange={setContent}
          />
        </div>
      </div>
    </div>
  );
}
