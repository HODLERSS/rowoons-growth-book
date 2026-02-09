"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BabyInfo } from "@/lib/types";
import { getBabyProfile, saveBabyProfile } from "@/lib/baby-storage";

interface BabyContextValue {
  baby: BabyInfo | null;
  setBaby: (info: BabyInfo) => void;
  hasBaby: boolean;
}

const BabyContext = createContext<BabyContextValue>({
  baby: null,
  setBaby: () => {},
  hasBaby: false,
});

export function BabyProvider({ children }: { children: React.ReactNode }) {
  const [baby, setBabyState] = useState<BabyInfo | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setBabyState(getBabyProfile());
    setMounted(true);
  }, []);

  const setBaby = useCallback((info: BabyInfo) => {
    saveBabyProfile(info);
    setBabyState(info);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <BabyContext.Provider value={{ baby, setBaby, hasBaby: baby !== null }}>
      {children}
    </BabyContext.Provider>
  );
}

export function useBaby() {
  return useContext(BabyContext);
}
