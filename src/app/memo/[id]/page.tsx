"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/shared/header";
import { Button } from "@/components/ui/button";
import { MemoViewer } from "@/components/memo/memo-viewer";
import { MemoEditor } from "@/components/memo/memo-editor";
import { MemoToolbar } from "@/components/memo/memo-toolbar";
import { ConfirmDelete } from "@/components/memo/confirm-delete";
import { useMemos } from "@/hooks/use-memos";
import { useLanguage } from "@/contexts/language-context";
import { Memo } from "@/lib/types";
import { Save, X } from "lucide-react";

export default function MemoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { get, update, remove } = useMemos();
  const { t } = useLanguage();

  const [memo, setMemo] = useState<Memo | undefined>();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    const found = get(params.id);
    if (!found) {
      router.push("/memo");
      return;
    }
    setMemo(found);
    setTitle(found.title);
    setContent(found.content);
  }, [params.id, get, router]);

  if (!memo) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t("memo.title")} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">{t("memo.loading")}</p>
        </div>
      </div>
    );
  }

  function handleEdit() {
    setTitle(memo!.title);
    setContent(memo!.content);
    setEditing(true);
  }

  function handleCancelEdit() {
    setTitle(memo!.title);
    setContent(memo!.content);
    setEditing(false);
  }

  function handleSave() {
    const updated = update(memo!.id, {
      title: title.trim(),
      content: content.trim(),
    });
    if (updated) {
      setMemo(updated);
      setEditing(false);
    }
  }

  function handleDelete() {
    remove(memo!.id);
    router.push("/memo");
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={editing ? t("memo.edit") + " " + t("memo.title") : memo.title || t("memo.title")}
        actions={
          editing ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="size-4" />
                {t("memo.cancel")}
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="size-4" />
                {t("memo.save")}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-4 pb-8">
          {!editing && (
            <MemoToolbar
              onEdit={handleEdit}
              onDelete={() => setShowDelete(true)}
            />
          )}

          {editing ? (
            <MemoEditor
              title={title}
              content={content}
              onTitleChange={setTitle}
              onContentChange={setContent}
            />
          ) : (
            <MemoViewer memo={memo} />
          )}
        </div>
      </div>

      <ConfirmDelete
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title={memo.title || "this memo"}
      />
    </div>
  );
}
