export default function Slide08Features() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[8vh] pb-[6vh]">

        <div className="flex items-center gap-[1vw] mb-[1.5vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Platform</span>
        </div>

        <div className="font-display font-800 text-text tracking-tight" style={{fontSize: "4.2vw"}}>
          One platform. Two roles. Eight tabs.
        </div>
        <div className="mt-[0.5vh] h-[0.2vh] w-[10vw] bg-primary" />

        <div className="mt-[3.5vh] grid grid-cols-3 gap-[2vw] flex-1">

          {/* Planner */}
          <div className="bg-card border border-primary/30 rounded p-[2.5vh_2vw] flex flex-col">
            <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Supervisor — Planner</div>
            <div className="mt-[0.8vh] h-[0.15vh] w-full bg-primary/30" />
            <div className="mt-[1.5vh] flex flex-col gap-[1vh] flex-1">
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Draw any polygon or enter GPS vertices</div>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Select from 4 truck profiles + custom</div>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Rotation sweep + gap fill + entry/exit point</div>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Export plan JSON for AHS console import</div>
              </div>
            </div>
          </div>

          {/* Dashboard */}
          <div className="bg-card border border-primary/30 rounded p-[2.5vh_2vw] flex flex-col">
            <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Supervisor — Dashboard</div>
            <div className="mt-[0.8vh] h-[0.15vh] w-full bg-primary/30" />
            <div className="mt-[1.5vh] flex flex-col gap-[1vh] flex-1">
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Live site list with progress bars</div>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Canvas updates as drivers fill spots</div>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Progress sparkline + full history log</div>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Toast on 100% — status persisted to DB</div>
              </div>
            </div>
          </div>

          {/* Driver Work */}
          <div className="bg-card border border-primary/30 rounded p-[2.5vh_2vw] flex flex-col">
            <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Driver — Work Tab</div>
            <div className="mt-[0.8vh] h-[0.15vh] w-full bg-primary/30" />
            <div className="mt-[1.5vh] flex flex-col gap-[1vh] flex-1">
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>See assigned running sites instantly</div>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Current spot glows amber — farthest first</div>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>GPS coordinates shown for navigation</div>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary mt-[1vh] shrink-0" />
                <div className="font-body text-text" style={{fontSize: "1.8vw"}}>One tap Mark Done — next spot activates</div>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-[2.5vh] flex gap-[3vw] items-center">
          <div className="font-body font-500 text-muted" style={{fontSize: "1.8vw"}}>Also:</div>
          <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Simulation Tab — farthest-first dispatch animation</div>
          <div className="w-[0.15vw] h-[3vh] bg-white/20" />
          <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Map/GPS Tab — Leaflet + GPS polygon capture</div>
          <div className="w-[0.15vw] h-[3vh] bg-white/20" />
          <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Batch Excel Tab — multi-site import + export</div>
        </div>

      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>08 / 14</div>
    </div>
  );
}
