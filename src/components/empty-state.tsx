import { Leaf } from "@/components/brand/leaf";

export function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Leaf size={40} />
      <p className="max-w-[32ch] text-[0.9375rem] text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}
