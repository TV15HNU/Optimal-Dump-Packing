import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { PlanContextProvider } from "@/lib/planContext";
import PlannerTab from "@/components/PlannerTab";
import SimulationTab from "@/components/SimulationTab";
import AnalyticsTab from "@/components/AnalyticsTab";
import MapTab from "@/components/MapTab";
import ExportTab from "@/components/ExportTab";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } }
});

const TABS = [
  { id: "planner",    label: "Planner" },
  { id: "simulation", label: "Simulation" },
  { id: "analytics",  label: "Analytics" },
  { id: "map",        label: "Map / GPS" },
  { id: "export",     label: "Export" },
] as const;

type TabId = typeof TABS[number]["id"];

function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("planner");

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground tracking-tight leading-none">
            OPTIMAL DUMP PACKING
          </span>
          <span className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase leading-tight mt-0.5">
            Adaptive Polygon Spot-Point Packing
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
          <span>Engine Online</span>
        </div>
      </header>

      <nav className="flex items-center gap-0.5 px-4 pt-2 border-b border-border bg-card shrink-0">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
            className={`relative px-4 py-2 text-xs font-medium transition-colors rounded-t outline-none ${
              activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="active-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
            className="h-full">
            {activeTab === "planner"    && <PlannerTab />}
            {activeTab === "simulation" && <SimulationTab />}
            {activeTab === "analytics"  && <AnalyticsTab />}
            {activeTab === "map"        && <MapTab />}
            {activeTab === "export"     && <ExportTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlanContextProvider>
        <TooltipProvider>
          <Dashboard />
          <Toaster />
        </TooltipProvider>
      </PlanContextProvider>
    </QueryClientProvider>
  );
}

export default App;
