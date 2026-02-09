"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAge } from "@/hooks/use-age";

export default function PlayTipsRedirect() {
  const router = useRouter();
  const { currentMonth } = useAge();

  useEffect(() => {
    router.replace(`/play-tips/${currentMonth}`);
  }, [currentMonth, router]);

  return null;
}
