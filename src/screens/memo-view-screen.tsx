"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Header, Screen } from "@/components/shell/header";
import { MemoViewer } from "@/components/journal/memo-viewer";
import { MemoEditor } from "@/components/journal/memo-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useMemos } from "@/hooks/use-memos";
import { useLanguage } from "@/hooks/use-language";
import { useHydrated } from "@/lib/store";

function Inner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const router = useRouter();
  const { get, update, remove } = useMemos();
  const { t } = useLanguage();
  const hydrated = useHydrated();
  const memo = get(id);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [askDelete, setAskDelete] = useState(false);

  if (!hydrated) {
    return (
      <>
        <Header title={t("journal.title")} backHref="/memo" />
        <Screen>
          <p className="text-[15px] text-muted-foreground" aria-live="polite">
            {t("journal.loading")}
          </p>
        </Screen>
      </>
    );
  }

  if (!memo) {
    return (
      <>
        <Header title={t("journal.title")} backHref="/memo" />
        <Screen>
          <EmptyState
            text={t("journal.not_found")}
            action={
              <Link href="/memo" className="flex h-11 items-center rounded-lg border border-rule px-4 text-[15px] font-semibold hover:bg-hover">
                {t("nav.journal")}
              </Link>
            }
          />
        </Screen>
      </>
    );
  }

  function startEdit() {
    setTitle(memo!.title);
    setContent(memo!.content);
    setEditing(true);
  }
  function save() {
    update(memo!.id, { title: title.trim(), content: content.trim() });
    setEditing(false);
  }
  function confirmDelete() {
    remove(memo!.id);
    router.replace("/memo");
  }

  return (
    <>
      <Header
        title={editing ? t("journal.edit_title") : t("journal.title")}
        backHref={editing ? undefined : "/memo"}
        actions={
          editing ? (
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="lg" onClick={() => setEditing(false)}>
                {t("journal.cancel")}
              </Button>
              <Button type="button" size="lg" onClick={save}>
                {t("journal.save")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center">
              <button type="button" onClick={startEdit} aria-label={t("journal.edit")} className="flex size-11 items-center justify-center rounded-lg hover:bg-hover">
                <Pencil className="size-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setAskDelete(true)} aria-label={t("journal.delete")} className="flex size-11 items-center justify-center rounded-lg text-danger hover:bg-hover">
                <Trash2 className="size-5" aria-hidden="true" />
              </button>
            </div>
          )
        }
      />
      <Screen>{editing ? <MemoEditor title={title} content={content} onTitleChange={setTitle} onContentChange={setContent} /> : <MemoViewer memo={memo} />}</Screen>
      <ConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={t("journal.delete_title")}
        body={t("journal.delete_body", { title: memo.title || t("journal.untitled") })}
        confirmLabel={t("journal.delete")}
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}

export function MemoViewScreen() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
