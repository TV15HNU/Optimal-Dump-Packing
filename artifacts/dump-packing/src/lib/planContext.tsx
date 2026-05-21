import { createContext, useContext, useState, type ReactNode } from "react";
import type { LocalPackResult } from "@/engine/localEngine";

interface PlanContextValue {
  currentPlan: LocalPackResult | null;
  setCurrentPlan: (plan: LocalPackResult | null) => void;
}

const PlanContext = createContext<PlanContextValue>({
  currentPlan: null,
  setCurrentPlan: () => {},
});

export function PlanContextProvider({ children }: { children: ReactNode }) {
  const [currentPlan, setCurrentPlan] = useState<LocalPackResult | null>(null);
  return (
    <PlanContext.Provider value={{ currentPlan, setCurrentPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlanContext() {
  return useContext(PlanContext);
}
