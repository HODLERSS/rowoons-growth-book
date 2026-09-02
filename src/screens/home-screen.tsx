"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Header, Screen } from "@/components/shell/header";
import { Wordmark } from "@/components/brand/wordmark";
import { ProfileCard } from "@/components/home/profile-card";
import { ThisMonthCard } from "@/components/home/this-month-card";
import { NoteCard } from "@/components/home/note-card";
import { ComingUpCard } from "@/components/home/coming-up-card";
import { JournalCard } from "@/components/home/journal-card";
import { NotifyCard } from "@/components/home/notify-card";
import { ProfileDialog } from "@/components/profile/profile-dialog";
import { useBaby } from "@/hooks/use-baby";
import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/hooks/use-language";

export function HomeScreen() {
  const { hasBaby, hydrated } = useBaby();
  const { currentMonth, ready } = useAge();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = hydrated && ((!hasBaby && !dismissed) || editing);

  return (
    <>
      <Header
        title={<Wordmark className="text-[1.375rem]" />}
        actions={
          <Link href="/settings" aria-label={t("nav.settings")} className="-mr-2 flex size-11 items-center justify-center rounded-lg hover:bg-hover">
            <Settings className="size-5" strokeWidth={1.8} aria-hidden="true" />
          </Link>
        }
      />
      <Screen className="space-y-4">
        <ProfileCard
          onEdit={() => {
            setDismissed(false);
            setEditing(true);
          }}
        />
        {hasBaby && ready && (
          <>
            <ThisMonthCard month={currentMonth} />
            <NoteCard month={currentMonth} />
            <ComingUpCard month={currentMonth} />
            <JournalCard />
            <NotifyCard />
          </>
        )}
      </Screen>
      <ProfileDialog
        mode={hasBaby ? "edit" : "create"}
        open={open}
        onClose={() => {
          setEditing(false);
          if (!hasBaby) setDismissed(true);
        }}
      />
    </>
  );
}
