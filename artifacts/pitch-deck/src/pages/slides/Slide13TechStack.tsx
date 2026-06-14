export default function Slide13TechStack() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[8vh] pb-[6vh]">

        <div className="flex items-center gap-[1vw] mb-[1.5vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Built With</span>
        </div>

        <div className="font-display font-800 text-text tracking-tight" style={{fontSize: "4.2vw"}}>
          Production stack. Zero compromises.
        </div>
        <div className="mt-[0.5vh] h-[0.2vh] w-[10vw] bg-primary" />

        <div className="mt-[3.5vh] grid grid-cols-3 gap-[2vw] flex-1">

          {/* Frontend */}
          <div className="bg-card border border-white/10 rounded p-[2vh_2vw] flex flex-col">
            <div className="font-display font-700 text-primary uppercase tracking-widest mb-[1.5vh]" style={{fontSize: "1.4vw"}}>Frontend</div>
            <div className="flex flex-col gap-[1.2vh]">
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>React 19 + Vite 7</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>UI + bundler</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Tailwind CSS v4</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>Styling</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Framer Motion</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>Animation</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Recharts</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>Analytics charts</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Leaflet</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>GPS map</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>SheetJS</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>Excel batch import</div>
              </div>
            </div>
          </div>

          {/* Backend */}
          <div className="bg-card border border-white/10 rounded p-[2vh_2vw] flex flex-col">
            <div className="font-display font-700 text-primary uppercase tracking-widest mb-[1.5vh]" style={{fontSize: "1.4vw"}}>Backend</div>
            <div className="flex flex-col gap-[1.2vh]">
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Node.js 24</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>Runtime</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>TypeScript 5.9</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>Strict types</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Express 5</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>API server</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>PostgreSQL</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>Database</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Clerk Auth</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>Auth + roles</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>pnpm workspaces</div>
                <div className="font-body text-muted" style={{fontSize: "1.4vw"}}>Monorepo</div>
              </div>
            </div>
          </div>

          {/* Engineering decisions */}
          <div className="bg-card border border-primary/30 rounded p-[2vh_2vw] flex flex-col">
            <div className="font-display font-700 text-primary uppercase tracking-widest mb-[1.5vh]" style={{fontSize: "1.4vw"}}>Engineering Decisions</div>
            <div className="flex flex-col gap-[1.5vh]">
              <div>
                <div className="font-display font-700 text-text" style={{fontSize: "1.7vw"}}>Contract-first API</div>
                <div className="font-body text-muted" style={{fontSize: "1.5vw"}}>OpenAPI → Orval codegen → typed React Query hooks. Never out of sync.</div>
              </div>
              <div className="h-[0.1vh] bg-white/10" />
              <div>
                <div className="font-display font-700 text-text" style={{fontSize: "1.7vw"}}>Pure TypeScript algorithms</div>
                <div className="font-body text-muted" style={{fontSize: "1.5vw"}}>All geometry is deterministic, zero native deps, runs on client and server equally.</div>
              </div>
              <div className="h-[0.1vh] bg-white/10" />
              <div>
                <div className="font-display font-700 text-text" style={{fontSize: "1.7vw"}}>No ORM — raw SQL</div>
                <div className="font-body text-muted" style={{fontSize: "1.5vw"}}>Full control, parameterised queries, JSONB plan storage. Zero injection risk.</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>13 / 14</div>
    </div>
  );
}
