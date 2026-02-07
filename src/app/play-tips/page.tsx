"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getCurrentMonth } from "@/lib/age-calculator";

export default function PlayTipsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/play-tips/${getCurrentMonth()}`);
  }, [router]);

  return null;
}
