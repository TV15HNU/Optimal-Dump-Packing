export default function Slide07Architecture() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[8vh] pb-[6vh]">

        <div className="flex items-center gap-[1vw] mb-[1.5vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>System Architecture</span>
        </div>

        <div className="font-display font-800 text-text tracking-tight" style={{fontSize: "4.2vw"}}>
          Contract-first. Stateless compute. Real-time sync.
        </div>
        <div className="mt-[0.5vh] h-[0.2vh] w-[10vw] bg-primary" />

        <div className="mt-[3.5vh] flex gap-[3vw] flex-1">

          {/* Left: architecture layers */}
          <div className="flex-1 flex flex-col gap-[2vh]">

            <div className="bg-card border border-white/10 rounded p-[1.5vh_1.5vw]">
              <div className="flex items-center gap-[1.5vw]">
                <div className="font-display font-800 text-primary shrink-0" style={{fontSize: "1.8vw"}}>BROWSER</div>
                <div className="flex-1 h-[0.1vh] bg-white/10" />
                <div className="font-body text-muted" style={{fontSize: "1.5vw"}}>React 19 + Vite 7</div>
              </div>
              <div className="mt-[0.8vh] font-body text-text" style={{fontSize: "1.7vw"}}>
                localEngine.ts — client-side hex packing for instant preview · Clerk JS for auth · React Query hooks from codegen
              </div>
            </div>

            <div className="flex items-center gap-[1vw] pl-[2vw]">
              <div className="font-display font-700 text-muted" style={{fontSize: "1.5vw"}}>Clerk session cookie + JSON over HTTPS</div>
              <div className="font-display font-800 text-primary" style={{fontSize: "2vw"}}>↕</div>
            </div>

            <div className="bg-card border border-primary/30 rounded p-[1.5vh_1.5vw]">
              <div className="flex items-center gap-[1.5vw]">
                <div className="font-display font-800 text-primary shrink-0" style={{fontSize: "1.8vw"}}>API SERVER</div>
                <div className="flex-1 h-[0.1vh] bg-white/10" />
                <div className="font-body text-muted" style={{fontSize: "1.5vw"}}>Express 5 · port 8080</div>
              </div>
              <div className="mt-[0.8vh] font-body text-text" style={{fontSize: "1.7vw"}}>
                hexPacker.ts — server-side packing · Clerk middleware · /api/v1/pack · /api/v1/sites · /api/v1/trucks
              </div>
            </div>

            <div className="flex items-center gap-[1vw] pl-[2vw]">
              <div className="font-display font-700 text-muted" style={{fontSize: "1.5vw"}}>Parameterised SQL — no ORM</div>
              <div className="font-display font-800 text-primary" style={{fontSize: "2vw"}}>↕</div>
            </div>

            <div className="bg-card border border-white/10 rounded p-[1.5vh_1.5vw]">
              <div className="flex items-center gap-[1.5vw]">
                <div className="font-display font-800 text-primary shrink-0" style={{fontSize: "1.8vw"}}>POSTGRESQL</div>
                <div className="flex-1 h-[0.1vh] bg-white/10" />
                <div className="font-body text-muted" style={{fontSize: "1.5vw"}}>Replit-managed</div>
              </div>
              <div className="mt-[0.8vh] font-body text-text" style={{fontSize: "1.7vw"}}>
                4 tables · sites · spot_progress · site_progress_snapshots · custom_trucks · JSONB plan storage
              </div>
            </div>

          </div>

          {/* Right: key design decisions */}
          <div className="w-[28vw] flex flex-col gap-[2vh]">
            <div className="font-display font-700 text-text uppercase tracking-widest" style={{fontSize: "1.5vw"}}>Key decisions</div>

            <div className="border-l-[0.3vw] border-primary pl-[1.2vw]">
              <div className="font-display font-700 text-text" style={{fontSize: "1.7vw"}}>OpenAPI-first</div>
              <div className="font-body text-muted" style={{fontSize: "1.5vw"}}>Spec → Orval codegen → typed React Query hooks. Frontend and backend always in sync.</div>
            </div>

            <div className="border-l-[0.3vw] border-primary pl-[1.2vw]">
              <div className="font-display font-700 text-text" style={{fontSize: "1.7vw"}}>Stateless compute</div>
              <div className="font-body text-muted" style={{fontSize: "1.5vw"}}>Packing is pure math — no shared state between requests. Scales horizontally with zero refactoring.</div>
            </div>

            <div className="border-l-[0.3vw] border-primary pl-[1.2vw]">
              <div className="font-display font-700 text-text" style={{fontSize: "1.7vw"}}>Role-aware from one bundle</div>
              <div className="font-body text-muted" style={{fontSize: "1.5vw"}}>Supervisor and Driver UIs share the same app, auth, and context. Role stored in localStorage.</div>
            </div>

            <div className="border-l-[0.3vw] border-primary pl-[1.2vw]">
              <div className="font-display font-700 text-text" style={{fontSize: "1.7vw"}}>10-second supervisor sync</div>
              <div className="font-body text-muted" style={{fontSize: "1.5vw"}}>Dashboard polls site detail every 10s. Driver progress appears without page reload.</div>
            </div>
          </div>

        </div>
      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>07 / 14</div>
    </div>
  );
}
