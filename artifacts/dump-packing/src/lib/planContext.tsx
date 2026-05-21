import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { LocalPackResult, TruckConfig } from "@/engine/localEngine";

interface PlanContextValue {
  currentPlan: LocalPackResult | null;
  currentPolygon: { pts: { x: number; y: number }[]; closed: boolean } | null;
  setCurrentPlan: (plan: LocalPackResult | null) => void;
  setCurrentPolygon: (p: { pts: { x: number; y: number }[]; closed: boolean } | null) => void;
  customTrucks: TruckConfig[];
  addCustomTruck: (t: TruckConfig) => void;
  removeCustomTruck: (id: string) => void;
}

const PlanContext = createContext<PlanContextValue>({
  currentPlan: null,
  currentPolygon: null,
  setCurrentPlan: () => {},
  setCurrentPolygon: () => {},
  customTrucks: [],
  addCustomTruck: () => {},
  removeCustomTruck: () => {},
});

export function PlanContextProvider({ children }: { children: ReactNode }) {
  const [currentPlan, setCurrentPlan]       = useState<LocalPackResult | null>(null);
  const [currentPolygon, setCurrentPolygon] = useState<{ pts: { x: number; y: number }[]; closed: boolean } | null>(null);
  const [customTrucks, setCustomTrucks]     = useState<TruckConfig[]>([]);

  const addCustomTruck = useCallback((t: TruckConfig) => {
    setCustomTrucks((prev) => [...prev.filter((c) => c.id !== t.id), t]);
  }, []);

  const removeCustomTruck = useCallback((id: string) => {
    setCustomTrucks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <PlanContext.Provider value={{ currentPlan, setCurrentPlan, currentPolygon, setCurrentPolygon, customTrucks, addCustomTruck, removeCustomTruck }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlanContext() {
  return useContext(PlanContext);
}
