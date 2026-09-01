import { Seal } from "@/components/brand/seal";

export function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Seal size={40} />
      <p className="max-w-[32ch] text-[15px] text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}
