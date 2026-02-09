"use client";

import { useState, useEffect } from "react";
import { useBaby } from "@/contexts/baby-context";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface BabySetupModalProps {
  mode?: "create" | "edit";
  open?: boolean;
  onClose?: () => void;
}

export function BabySetupModal({ mode = "create", open, onClose }: BabySetupModalProps) {
  const { baby, hasBaby, setBaby } = useBaby();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [nameKo, setNameKo] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"boy" | "girl">("girl");

  const isEdit = mode === "edit";
  const isVisible = isEdit ? !!open : !hasBaby;

  useEffect(() => {
    if (isEdit && open && baby) {
      setName(baby.name);
      setNameKo(baby.nameKo || "");
      setBirthDate(baby.birthDate);
      setGender(baby.gender);
    }
  }, [isEdit, open, baby]);

  if (!isVisible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate) return;
    setBaby({
      name: name.trim(),
      nameKo: nameKo.trim() || undefined,
      birthDate,
      gender,
    });
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isEdit ? t("onboarding.edit_title") : t("onboarding.welcome")}
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {isEdit ? t("onboarding.edit_subtitle") : t("onboarding.subtitle")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="baby-name">
                {t("onboarding.name")}
              </label>
              <Input
                id="baby-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="baby-name-ko">
                {t("onboarding.name_ko")}
              </label>
              <Input
                id="baby-name-ko"
                value={nameKo}
                onChange={(e) => setNameKo(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="baby-birthday">
                {t("onboarding.birthday")}
              </label>
              <Input
                id="baby-birthday"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                {t("onboarding.gender")}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={gender === "boy" ? "default" : "outline"}
                  onClick={() => setGender("boy")}
                >
                  {t("onboarding.boy")}
                </Button>
                <Button
                  type="button"
                  variant={gender === "girl" ? "default" : "outline"}
                  onClick={() => setGender("girl")}
                >
                  {t("onboarding.girl")}
                </Button>
              </div>
            </div>

            <div className={`mt-2 flex gap-2 ${isEdit ? "" : "flex-col"}`}>
              {isEdit && (
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  {t("memo.cancel")}
                </Button>
              )}
              <Button type="submit" size="lg" className="flex-1">
                {isEdit ? t("memo.save") : t("onboarding.start")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
