"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getCurrentMonth } from "@/lib/age-calculator";

export default function WatchOutsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/watch-outs/${getCurrentMonth()}`);
  }, [router]);

  return null;
}
