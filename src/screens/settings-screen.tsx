"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Download, Upload, Trash2, ExternalLink } from "lucide-react";
import { Header, Screen } from "@/components/shell/header";
import { Segmented } from "@/components/segmented";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ProfileDialog } from "@/components/profile/profile-dialog";
import { Button } from "@/components/ui/button";
import { useBaby, displayName, nameLang } from "@/hooks/use-baby";
import { useLanguage } from "@/hooks/use-language";
import { useSettings } from "@/hooks/use-settings";
import { usePush } from "@/hooks/use-push";
import { formatDate, type Language } from "@/i18n";
import { parseLocalDate } from "@/lib/age-calculator";
import { APP_VERSION, SOURCES, SUPPORT_EMAIL } from "@/lib/constants";
import { backupFilename, createBackup, isBackupFile, restoreBackup, clearAllData } from "@/lib/backup";
import { isNative } from "@/lib/platform";
import { cancelReminders, reminderStatus, scheduleReminders, type ReminderStatus } from "@/lib/reminders";
import { useHydrated } from "@/lib/store";
import type { BackupFile } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h2 className="px-1 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</h2>
      <div className="divide-y divide-rule rounded-xl border border-rule bg-surface">{children}</div>
    </section>
  );
}

function Row({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={"flex min-h-[3.25rem] items-center gap-3 px-4 py-2 " + (className ?? "")}>{children}</div>;
}

export function SettingsScreen() {
  const { baby } = useBaby();
  const { lang, setLang, t } = useLanguage();
  const hydrated = useHydrated();
  const [editing, setEditing] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [pendingImport, setPendingImport] = useState<BackupFile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const born = baby ? parseLocalDate(baby.birthDate) : null;

  async function exportBackup() {
    const data = JSON.stringify(createBackup(), null, 2);
    const filename = backupFilename();
    const file = new File([data], filename, { type: "application/json" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: "Sprout backup" });
        return;
      } catch {
        /* user cancelled or share failed; fall through to download */
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const parsed: unknown = JSON.parse(await f.text());
      if (!isBackupFile(parsed)) throw new Error("bad");
      setPendingImport(parsed);
    } catch {
      setMessage(t("settings.import_bad"));
    }
  }

  return (
    <>
      <Header title={t("settings.title")} backHref="/" />
      <Screen className="space-y-6">
        <Section title={t("settings.profile")}>
          <button type="button" onClick={() => setEditing(true)} className="flex min-h-[3.75rem] w-full items-center gap-3 px-4 py-2 text-left hover:bg-hover/60">
            <span className="min-w-0 flex-1">
              <span className="font-display block truncate text-[1.125rem] font-semibold" lang={hydrated && baby ? nameLang(displayName(baby, lang), lang) : lang}>{hydrated && baby ? displayName(baby, lang) : t("home.setup")}</span>
              {hydrated && born && <span className="tnum block text-[0.8125rem] text-muted-foreground">{t("age.born", { date: formatDate(lang, born) })}</span>}
            </span>
            <span className="text-[0.9375rem] font-semibold text-primary">{t("settings.edit_profile")}</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </Section>

        <Section title={t("settings.language")}>
          <Row>
            <Segmented
              label={t("settings.language")}
              value={lang}
              onChange={(v) => setLang(v as Language)}
              options={[
                { value: "en", label: "English" },
                { value: "ko", label: "한국어", lang: "ko" },
              ]}
              className="w-full"
            />
          </Row>
        </Section>

        <Section title={t("settings.notifications")}>{hydrated ? <NotificationsBody /> : <Row className="min-h-[4.75rem]" />}</Section>

        <Section title={t("settings.data")}>
          <Row>
            <p className="text-[0.875rem] leading-relaxed text-muted-foreground">{t("settings.local_note")}</p>
          </Row>
          <button type="button" onClick={exportBackup} className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-left hover:bg-hover/60">
            <Download className="size-5 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-medium">{t("settings.export")}</span>
              <span className="block text-[0.8125rem] text-muted-foreground">{t("settings.export_desc")}</span>
            </span>
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-left hover:bg-hover/60">
            <Upload className="size-5 text-primary" aria-hidden="true" />
            <span className="text-[0.9375rem] font-medium">{t("settings.import")}</span>
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label={t("settings.import")} onChange={onFile} tabIndex={-1} />
          <button type="button" onClick={() => setAskDelete(true)} className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-left text-danger hover:bg-hover/60">
            <Trash2 className="size-5" aria-hidden="true" />
            <span className="text-[0.9375rem] font-medium">{t("settings.delete_all")}</span>
          </button>
          {message && (
            <Row>
              <p role="status" aria-live="polite" className="text-[0.875rem] font-medium">
                {message}
              </p>
            </Row>
          )}
        </Section>

        <Section title={t("settings.about")}>
          <Row>
            <span className="tnum text-[0.9375rem]">{t("settings.version", { version: APP_VERSION })}</span>
          </Row>
          <Row className="flex-col items-start">
            <span className="text-[0.9375rem] font-medium">{t("settings.sources")}</span>
            <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">{t("settings.sources_desc")}</p>
            <ul className="mt-1 w-full">
              {SOURCES.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex min-h-[2.75rem] items-center gap-2 rounded text-[0.875rem] text-primary hover:underline">
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                    <span translate="no">{s.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Row>
          <Row>
            <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">{t("settings.disclaimer")}</p>
          </Row>
          <Link href="/privacy" className="flex min-h-[3.25rem] items-center justify-between px-4 text-[0.9375rem] font-medium hover:bg-hover/60">
            {t("settings.privacy")}
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
          <Link href="/terms" className="flex min-h-[3.25rem] items-center justify-between px-4 text-[0.9375rem] font-medium hover:bg-hover/60">
            {t("settings.terms")}
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="flex min-h-[3.25rem] items-center justify-between px-4 text-[0.9375rem] font-medium hover:bg-hover/60">
            {t("settings.contact")}
            <span className="text-[0.8125rem] text-muted-foreground" translate="no">
              {SUPPORT_EMAIL}
            </span>
          </a>
        </Section>
      </Screen>

      <ProfileDialog mode={baby ? "edit" : "create"} open={editing} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={t("settings.delete_all_title")}
        body={t("settings.delete_all_body")}
        confirmLabel={t("common.delete")}
        destructive
        onConfirm={() => {
          clearAllData();
          void cancelReminders();
          setAskDelete(false);
          setMessage(t("settings.deleted"));
        }}
      />
      <ConfirmDialog
        open={pendingImport !== null}
        onOpenChange={(o) => !o && setPendingImport(null)}
        title={t("settings.import_confirm_title")}
        body={t("settings.import_confirm_body")}
        confirmLabel={t("common.restore")}
        onConfirm={() => {
          if (pendingImport) restoreBackup(pendingImport);
          setPendingImport(null);
          setMessage(t("settings.import_ok"));
        }}
      />
    </>
  );
}

function NotificationsBody() {
  return isNative() ? <NativeReminders /> : <WebPush />;
}

function NativeReminders() {
  const { baby } = useBaby();
  const { lang, t } = useLanguage();
  const { settings, update } = useSettings();
  const [status, setStatus] = useState<ReminderStatus>("prompt");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    reminderStatus().then(setStatus).catch(() => {});
  }, []);
  const name = displayName(baby, lang);
  const on = settings.reminders && status === "granted";

  async function toggle() {
    if (!baby) return;
    setBusy(true);
    try {
      if (on) {
        await cancelReminders();
        update({ reminders: false });
      } else {
        const n = await scheduleReminders(baby, lang);
        const s = await reminderStatus();
        setStatus(s);
        update({ reminders: n > 0 });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
      <Row className="min-h-[4.75rem]">
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-medium">{t("settings.reminders")}</span>
          <span className="block text-[0.8125rem] text-muted-foreground">{status === "denied" ? t("settings.reminders_denied") : t("settings.reminders_desc", { name: name || "—" })}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={t("settings.reminders")}
          disabled={busy || !baby || status === "denied"}
          onClick={toggle}
          className={"relative h-8 w-[3.25rem] shrink-0 rounded-full transition-colors disabled:opacity-50 " + (on ? "bg-primary" : "bg-rule")}
        >
          <span className={"absolute top-1 size-6 rounded-full bg-surface shadow transition-transform " + (on ? "left-1 translate-x-5" : "left-1")} />
        </button>
      </Row>
  );
}

function WebPush() {
  const { t } = useLanguage();
  const { permission, subscribed, busy, error, subscribe, unsubscribe } = usePush();
  let body: React.ReactNode;
  if (permission === "unsupported") body = <p className="text-[0.875rem] text-muted-foreground">{t("notify.unsupported")}</p>;
  else if (permission === "denied") body = <p className="text-[0.875rem] text-muted-foreground">{t("notify.blocked")}</p>;
  else
    body = (
      <>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-medium">{subscribed ? t("notify.enabled") : t("notify.title")}</span>
          <span className="block text-[0.8125rem] text-muted-foreground">{error ?? t("notify.desc")}</span>
        </span>
        <Button type="button" variant={subscribed ? "outline" : "default"} size="lg" disabled={busy} onClick={subscribed ? unsubscribe : subscribe}>
          {busy ? t("notify.working") : subscribed ? t("notify.off") : t("notify.enable")}
        </Button>
      </>
    );
  return <Row className="min-h-[4.75rem]">{body}</Row>;
}
