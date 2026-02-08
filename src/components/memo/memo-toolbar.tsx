"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

interface MemoToolbarProps {
  onEdit?: () => void;
  onDelete?: () => void;
  showEdit?: boolean;
  showDelete?: boolean;
}

export function MemoToolbar({
  onEdit,
  onDelete,
  showEdit = true,
  showDelete = true,
}: MemoToolbarProps) {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/memo")}
        className="text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("memo.back")}
      </Button>

      <div className="flex items-center gap-2">
        {showEdit && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="size-4" />
            {t("memo.edit")}
          </Button>
        )}
        {showDelete && onDelete && (
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="size-4" />
            {t("memo.delete")}
          </Button>
        )}
      </div>
    </div>
  );
}
