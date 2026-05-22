import { useEffect, useRef } from "react";
import { useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { PlanContextProvider } from "@/lib/planContext";
import PlannerTab from "@/components/PlannerTab";
import SimulationTab from "@/components/SimulationTab";
import AnalyticsTab from "@/components/AnalyticsTab";
import MapTab from "@/components/MapTab";
import ExportImportTab from "@/components/ExportImportTab";
import DashboardTab from "@/components/DashboardTab";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#f59e0b",
    colorForeground: "#f1f5f9",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#ef4444",
    colorBackground: "#1a1f2e",
    colorInput: "#0f1117",
    colorInputForeground: "#f1f5f9",
    colorNeutral: "#334155",
    fontFamily: "Inter, sans-serif",
    borderRadius: "4px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#1a1f2e] border border-[#334155] rounded w-[420px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#f1f5f9] font-bold",
    headerSubtitle: "text-[#94a3b8]",
    socialButtonsBlockButtonText: "text-[#f1f5f9]",
    formFieldLabel: "text-[#94a3b8]",
    footerActionLink: "text-[#f59e0b]",
    footerActionText: "text-[#94a3b8]",
    dividerText: "text-[#64748b]",
    identityPreviewEditButton: "text-[#f59e0b]",
    formFieldSuccessText: "text-[#22c55e]",
    alertText: "text-[#f1f5f9]",
    logoBox: "mb-2",
    logoImage: "w-12 h-12",
    socialButtonsBlockButton: "border-[#334155] bg-[#0f1117] hover:bg-[#1e2433]",
    formButtonPrimary: "bg-[#f59e0b] text-[#0f1117] font-semibold hover:bg-[#d97706]",
    formFieldInput: "bg-[#0f1117] border-[#334155] text-[#f1f5f9] font-mono",
    footerAction: "border-t border-[#334155]",
    dividerLine: "bg-[#334155]",
    alert: "border-[#334155]",
    otpCodeFieldInput: "border-[#334155] bg-[#0f1117] text-[#f1f5f9]",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

const TABS = [
  { id: "planner",    label: "Planner" },
  { id: "simulation", label: "Simulation" },
  { id: "analytics",  label: "Analytics" },
  { id: "map",        label: "Map / GPS" },
  { id: "export",     label: "Export/Import" },
  { id: "dashboard",  label: "Dashboard" },
] as const;

type TabId = typeof TABS[number]["id"];

function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("planner");
  const { signOut } = useClerk();
  const { user } = useUser();

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
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
          <span>Engine Online</span>
          {user && (
            <>
              <span className="text-border">|</span>
              <span className="text-foreground">{user.primaryEmailAddress?.emailAddress ?? user.username}</span>
              <button
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                className="text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-0.5 hover:border-primary/50">
                Sign out
              </button>
            </>
          )}
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
            {activeTab === "export"     && <ExportImportTab />}
            {activeTab === "dashboard"  && <DashboardTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function AppContent() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlanContextProvider>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={() => (
              <>
                <Show when="signed-in"><Dashboard /></Show>
                <Show when="signed-out">
                  <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background gap-8 px-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold tracking-tight mb-1">OPTIMAL DUMP PACKING</div>
                      <div className="text-xs text-muted-foreground font-mono tracking-widest uppercase">
                        Adaptive Polygon Spot-Point Packing
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <a href={`${basePath}/sign-in`}
                        className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded hover:opacity-90">
                        Sign In
                      </a>
                      <a href={`${basePath}/sign-up`}
                        className="px-5 py-2.5 border border-border text-sm rounded hover:bg-muted">
                        Create Account
                      </a>
                    </div>
                  </div>
                </Show>
              </>
            )} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </PlanContextProvider>
    </QueryClientProvider>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your account" } },
        signUp: { start: { title: "Create your account", subtitle: "Get started with Optimal Dump Packing" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <AppContent />
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
