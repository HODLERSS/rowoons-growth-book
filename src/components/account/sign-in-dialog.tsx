"use client";

import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeafMark } from "@/components/brand/leaf";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { isNative } from "@/lib/platform";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="var(--brand-google-yellow)" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="var(--brand-google-red)" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="var(--brand-google-green)" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="var(--brand-google-blue)" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.1 35.6 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function SignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // App Store guideline 4.8: a third-party login in the iOS app must be paired with Sign in with Apple. Until the
  // Apple provider is wired (needs the developer account), the native app offers the email link only.
  const showGoogle = !isNative() || process.env.NEXT_PUBLIC_NATIVE_GOOGLE_SIGNIN === "1";

  async function google() {
    setBusy("google");
    setMessage(null);
    const r = await signInWithGoogle();
    if (!r.ok) setMessage({ kind: "error", text: t("account.error") });
    setBusy(null);
  }
  async function sendLink(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage({ kind: "error", text: t("account.email_invalid") });
      return;
    }
    setBusy("email");
    setMessage(null);
    const r = await signInWithEmail(email);
    setMessage(r.ok ? { kind: "ok", text: t("account.email_sent") } : { kind: "error", text: t("account.error") });
    setBusy(null);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] overscroll-contain sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="items-center text-center">
          <LeafMark size={48} className="mb-1" />
          <DialogTitle className="font-display text-[1.375rem]">{t("account.sign_in")}</DialogTitle>
          <DialogDescription className="text-[0.9375rem]">{t("account.guest_desc")}</DialogDescription>
        </DialogHeader>
        {showGoogle && (
          <>
            <Button type="button" variant="outline" size="lg" className="w-full gap-2" onClick={google} disabled={busy !== null}>
              <GoogleMark />
              {t("account.google")}
            </Button>
            <div className="flex items-center gap-3 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span className="h-px flex-1 bg-rule" />
              {t("account.or")}
              <span className="h-px flex-1 bg-rule" />
            </div>
          </>
        )}
        <form onSubmit={sendLink} noValidate className="space-y-2">
          <label htmlFor="account-email" className="text-[0.875rem] font-semibold">
            {t("account.email_label")}
          </label>
          <Input id="account-email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-[1rem]" />
          <Button type="submit" size="lg" className="w-full gap-2" disabled={busy !== null}>
            <Mail className="size-4" aria-hidden="true" />
            {t("account.email_send")}
          </Button>
        </form>
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={"text-[0.875rem] " + (message.kind === "error" ? "text-danger" : "text-done")}>
            {message.text}
          </p>
        )}
        <p className="text-[0.75rem] leading-relaxed text-muted-foreground">{t("account.privacy_note")}</p>
      </DialogContent>
    </Dialog>
  );
}
