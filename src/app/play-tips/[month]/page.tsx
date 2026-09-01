import { ALL_MONTHS } from "@/lib/constants";
import { getMonthBundle } from "@/lib/content-loader";
import { PlayScreen } from "@/screens/play-screen";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_MONTHS.map((m) => ({ month: String(m) }));
}

export default async function Page({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  const m = Number(month);
  return <PlayScreen month={m} content={getMonthBundle(m)} />;
}
