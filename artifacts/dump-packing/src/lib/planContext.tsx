import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { LocalPackResult, TruckConfig, Pt } from "@/engine/localEngine";

interface PlanContextValue {
  currentPlan: LocalPackResult | null;
  currentPolygon: { pts: Pt[]; closed: boolean } | null;
  entryPoint: Pt | null;
  exitPoint: Pt | null;
  selectedTruck: TruckConfig | null;
  setCurrentPlan: (plan: LocalPackResult | null) => void;
  setCurrentPolygon: (p: { pts: Pt[]; closed: boolean } | null) => void;
  setEntryPoint: (p: Pt | null) => void;
  setExitPoint: (p: Pt | null) => void;
  setSelectedTruck: (t: TruckConfig | null) => void;
  customTrucks: TruckConfig[];
  addCustomTruck: (t: TruckConfig) => void;
  removeCustomTruck: (id: string) => void;
}

const PlanContext = createContext<PlanContextValue>({
  currentPlan: null, currentPolygon: null,
  entryPoint: null, exitPoint: null, selectedTruck: null,
  setCurrentPlan: () => {}, setCurrentPolygon: () => {},
  setEntryPoint: () => {}, setExitPoint: () => {},
  setSelectedTruck: () => {},
  customTrucks: [], addCustomTruck: () => {}, removeCustomTruck: () => {},
});

export function PlanContextProvider({ children }: { children: ReactNode }) {
  const [currentPlan, setCurrentPlan]       = useState<LocalPackResult | null>(null);
  const [currentPolygon, setCurrentPolygon] = useState<{ pts: Pt[]; closed: boolean } | null>(null);
  const [entryPoint, setEntryPoint]         = useState<Pt | null>(null);
  const [exitPoint, setExitPoint]           = useState<Pt | null>(null);
  const [selectedTruck, setSelectedTruck]   = useState<TruckConfig | null>(null);
  const [customTrucks, setCustomTrucks]     = useState<TruckConfig[]>([]);

  const addCustomTruck = useCallback((t: TruckConfig) => {
    setCustomTrucks((prev) => [...prev.filter((c) => c.id !== t.id), t]);
  }, []);

  const removeCustomTruck = useCallback((id: string) => {
    setCustomTrucks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <PlanContext.Provider value={{
      currentPlan, setCurrentPlan,
      currentPolygon, setCurrentPolygon,
      entryPoint, setEntryPoint,
      exitPoint, setExitPoint,
      selectedTruck, setSelectedTruck,
      customTrucks, addCustomTruck, removeCustomTruck,
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlanContext() {
  return useContext(PlanContext);
}
