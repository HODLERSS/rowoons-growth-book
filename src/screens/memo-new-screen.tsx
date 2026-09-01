"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header, Screen } from "@/components/shell/header";
import { MemoEditor } from "@/components/journal/memo-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useMemos } from "@/hooks/use-memos";
import { useLanguage } from "@/hooks/use-language";
import { useAge } from "@/hooks/use-age";

export function MemoNewScreen() {
  const router = useRouter();
  const { create } = useMemos();
  const { t } = useLanguage();
  const { currentMonth } = useAge();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [askDiscard, setAskDiscard] = useState(false);
  const dirty = title.trim().length > 0 || content.trim().length > 0;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function save() {
    if (!dirty) return;
    const memo = create({ title: title.trim(), content: content.trim(), month: currentMonth });
    router.replace(`/memo/view?id=${encodeURIComponent(memo.id)}`);
  }

  return (
    <>
      <Header
        title={t("journal.new")}
        backHref="/memo"
        actions={
          <div className="flex items-center gap-1">
            <Link
              href="/memo"
              onClick={(e) => {
                if (dirty) {
                  e.preventDefault();
                  setAskDiscard(true);
                }
              }}
              className="flex h-11 items-center rounded-lg px-3 text-[0.9375rem] font-medium text-muted-foreground hover:bg-hover"
            >
              {t("journal.cancel")}
            </Link>
            <Button type="button" size="lg" onClick={save} disabled={!dirty}>
              {t("journal.save")}
            </Button>
          </div>
        }
      />
      <Screen>
        <MemoEditor title={title} content={content} onTitleChange={setTitle} onContentChange={setContent} />
      </Screen>
      <ConfirmDialog
        open={askDiscard}
        onOpenChange={setAskDiscard}
        title={t("journal.discard_title")}
        body={t("journal.discard_body")}
        confirmLabel={t("journal.discard")}
        cancelLabel={t("journal.keep_editing")}
        destructive
        onConfirm={() => router.push("/memo")}
      />
    </>
  );
}
