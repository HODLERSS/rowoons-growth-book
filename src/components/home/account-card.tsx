"use client";

import { useState } from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/account/sign-in-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useSettings } from "@/hooks/use-settings";

/** True while the guest invitation is on Home (the push card yields to it so Home stays within its element budget). */
export function useAccountInvite(): boolean {
  const { enabled, ready, user } = useAuth();
  const { settings } = useSettings();
  return enabled && ready && !user && !settings.accountDismissed;
}

/** Guests get one calm invitation to back up; dismissed once, it stays gone. Signed-in users never see it. */
export function AccountCard() {
  const show = useAccountInvite();
  const { update } = useSettings();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  if (!show) return null;
  return (
    <section aria-labelledby="account-card" className="rounded-xl border border-rule bg-surface p-4">
      <div className="flex items-start gap-3">
        <CloudUpload className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="account-card" className="text-[0.9375rem] font-semibold">
            {t("account.guest_title")}
          </h2>
          <p className="text-[0.8125rem] text-muted-foreground">{t("account.guest_desc")}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={() => update({ accountDismissed: true })}>
          {t("account.later")}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => setOpen(true)}>
          {t("account.sign_in")}
        </Button>
      </div>
      <SignInDialog open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
