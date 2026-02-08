"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";

interface ConfirmDeleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
}

export function ConfirmDelete({
  open,
  onOpenChange,
  onConfirm,
  title = "this memo",
}: ConfirmDeleteProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("memo.delete_title")}</DialogTitle>
          <DialogDescription>
            {t("memo.delete_confirm").replace("{title}", title)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("memo.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("memo.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
