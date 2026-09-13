"use client";

import { useState } from "react";
import { LogOut, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SignInDialog } from "@/components/account/sign-in-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";

/** Settings › Account: sign in, or see who is signed in, sign out, delete the account. */
export function AccountSection({ onMessage }: { onMessage: (text: string) => void }) {
  const { enabled, ready, user, email, signOut, deleteAccount } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!enabled) return null;

  if (!ready) return <div className="min-h-[4.75rem]" />;

  if (!user) {
    return (
      <>
        <div className="flex min-h-[4.75rem] items-center gap-3 px-4 py-2">
          <UserRound className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-medium">{t("account.guest_title")}</span>
            <span className="block text-[0.8125rem] text-muted-foreground">{t("account.guest_short")}</span>
          </span>
          <Button type="button" size="lg" onClick={() => setOpen(true)}>
            {t("account.sign_in")}
          </Button>
        </div>
        <SignInDialog open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="flex min-h-[3.25rem] items-center gap-3 px-4 py-3">
        <UserRound className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-medium">{t("account.signed_in_as", { email: email ?? "" })}</span>
          <span className="block text-[0.8125rem] text-muted-foreground">{t("account.synced")}</span>
        </span>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await signOut();
          setBusy(false);
          onMessage(t("account.sign_out_note"));
        }}
        className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-left hover:bg-hover/60 disabled:opacity-50"
      >
        <LogOut className="size-5 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-medium">{t("account.sign_out")}</span>
          <span className="block text-[0.8125rem] text-muted-foreground">{t("account.sign_out_note")}</span>
        </span>
      </button>
      <button type="button" disabled={busy} onClick={() => setAskDelete(true)} className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-left text-danger hover:bg-hover/60 disabled:opacity-50">
        <Trash2 className="size-5" aria-hidden="true" />
        <span className="text-[0.9375rem] font-medium">{t("account.delete")}</span>
      </button>
      <ConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={t("account.delete_title")}
        body={t("account.delete_body")}
        confirmLabel={t("common.delete")}
        destructive
        onConfirm={async () => {
          setAskDelete(false);
          setBusy(true);
          const r = await deleteAccount();
          setBusy(false);
          onMessage(r.ok ? t("account.deleted") : t("account.error"));
        }}
      />
    </>
  );
}
