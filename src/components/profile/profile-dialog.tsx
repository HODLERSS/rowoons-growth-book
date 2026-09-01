"use client";

import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeafMark } from "@/components/brand/leaf";
import { Segmented } from "@/components/segmented";
import { useBaby } from "@/hooks/use-baby";
import { useLanguage } from "@/hooks/use-language";
import { useSettings } from "@/hooks/use-settings";
import { parseLocalDate, toLocalISO } from "@/lib/age-calculator";
import { scheduleReminders } from "@/lib/reminders";
import { isNative } from "@/lib/platform";
import type { Language } from "@/i18n";

interface ProfileDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onClose: () => void;
}

export function ProfileDialog({ mode, open, onClose }: ProfileDialogProps) {
  const { baby, setBaby } = useBaby();
  const { lang, setLang, t } = useLanguage();
  const { settings } = useSettings();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] overscroll-contain sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        {open && (
          <ProfileForm
            key={`${mode}-${baby?.name ?? ""}-${baby?.birthDate ?? ""}`}
            mode={mode}
            initial={mode === "edit" ? baby : null}
            lang={lang}
            setLang={setLang}
            t={t}
            onSubmit={(info) => {
              setBaby(info);
              if (isNative() && settings.reminders) void scheduleReminders(info.nameKo && lang === "ko" ? info.nameKo : info.name, info.birthDate, lang);
              onClose();
            }}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormProps {
  mode: "create" | "edit";
  initial: { name: string; nameKo?: string; birthDate: string } | null;
  lang: Language;
  setLang: (l: Language) => void;
  t: ReturnType<typeof useLanguage>["t"];
  onSubmit: (info: { name: string; nameKo?: string; birthDate: string }) => void;
  onCancel: () => void;
}

function ProfileForm({ mode, initial, lang, setLang, t, onSubmit, onCancel }: FormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nameAlt, setNameAlt] = useState(initial?.nameKo ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [errors, setErrors] = useState<{ name?: string; date?: string }>({});
  const today = toLocalISO(new Date());
  const isEdit = mode === "edit";

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: { name?: string; date?: string } = {};
    if (!name.trim()) next.name = t("onboarding.name_required");
    if (!birthDate) next.date = t("onboarding.date_required");
    else if (!parseLocalDate(birthDate)) next.date = t("onboarding.date_invalid");
    else if (birthDate > today) next.date = t("onboarding.date_future");
    setErrors(next);
    if (next.name) {
      document.getElementById("profile-name")?.focus();
      return;
    }
    if (next.date) {
      document.getElementById("profile-birthday")?.focus();
      return;
    }
    onSubmit({ name: name.trim(), nameKo: nameAlt.trim() || undefined, birthDate });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader className="items-center text-center">
        <LeafMark size={48} className="mb-1" />
        <DialogTitle className="font-display text-[1.375rem]">{isEdit ? t("onboarding.edit_title") : t("onboarding.welcome")}</DialogTitle>
        <DialogDescription className="text-[0.9375rem]">{isEdit ? t("onboarding.edit_subtitle") : t("onboarding.subtitle")}</DialogDescription>
      </DialogHeader>

      {!isEdit && (
        <Segmented
          label={t("settings.language")}
          value={lang}
          onChange={(v) => setLang(v as Language)}
          options={[
            { value: "en", label: "English" },
            { value: "ko", label: "한국어", lang: "ko" },
          ]}
        />
      )}

      <div className="space-y-1.5">
        <label htmlFor="profile-name" className="text-[0.875rem] font-semibold">
          {t("onboarding.name")}
        </label>
        <Input
          id="profile-name"
          name="babyName"
          autoComplete="off"
          spellCheck={false}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "profile-name-error" : undefined}
          className="h-12 text-[1rem]"
        />
        {errors.name && (
          <p id="profile-name-error" role="alert" className="text-[0.8125rem] text-danger">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="profile-name-alt" className="text-[0.875rem] font-semibold">
          {t("onboarding.name_alt")}
        </label>
        <Input id="profile-name-alt" name="babyNameAlt" autoComplete="off" spellCheck={false} value={nameAlt} onChange={(e) => setNameAlt(e.target.value)} className="h-12 text-[1rem]" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="profile-birthday" className="text-[0.875rem] font-semibold">
          {t("onboarding.birthday")}
        </label>
        <Input
          id="profile-birthday"
          name="birthday"
          type="date"
          max={today}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          aria-invalid={!!errors.date}
          aria-describedby={errors.date ? "profile-birthday-error" : undefined}
          className="h-12 text-[1rem]"
        />
        {errors.date && (
          <p id="profile-birthday-error" role="alert" className="text-[0.8125rem] text-danger">
            {errors.date}
          </p>
        )}
      </div>

      <p className="text-[0.75rem] leading-relaxed text-muted-foreground">{t("onboarding.disclaimer")}</p>

      <div className="flex gap-2 pt-1">
        {isEdit && (
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1">
          {isEdit ? t("common.save") : t("onboarding.start")}
        </Button>
      </div>
    </form>
  );
}
