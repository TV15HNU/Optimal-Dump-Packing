export default function Slide02Problem() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[8vh] pb-[6vh]">

        {/* Section label */}
        <div className="flex items-center gap-[1vw] mb-[1.5vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>The Problem</span>
        </div>

        <div className="font-display font-800 text-text tracking-tight" style={{fontSize: "4.5vw", lineHeight: 1.05}}>
          Autonomous trucks fill dump zones with<br />a system built for rectangles — not reality.
        </div>
        <div className="mt-[0.5vh] h-[0.2vh] w-[12vw] bg-primary" />

        {/* Problem cards — 2 rows of 2 + 1 wide */}
        <div className="mt-[3vh] grid grid-cols-2 gap-[2vh] flex-1">

          <div className="bg-card border border-white/10 rounded p-[2vh_2vw]">
            <div className="font-display font-700 text-primary uppercase tracking-wide" style={{fontSize: "1.5vw"}}>Rectangular Grids</div>
            <div className="font-body font-400 text-text mt-[0.8vh]" style={{fontSize: "2vw"}}>Dump terraces are never rectangles. Fixed grids leave triangular voids at every irregular edge.</div>
            <div className="font-display font-700 text-primary mt-[1vh]" style={{fontSize: "2.2vw"}}>41% average utilisation</div>
          </div>

          <div className="bg-card border border-white/10 rounded p-[2vh_2vw]">
            <div className="font-display font-700 text-primary uppercase tracking-wide" style={{fontSize: "1.5vw"}}>No Turning-Radius Awareness</div>
            <div className="font-body font-400 text-text mt-[0.8vh]" style={{fontSize: "2vw"}}>Spots near polygon edges force multi-point turns on 300-tonne trucks — a daily safety hazard.</div>
            <div className="font-display font-700 text-primary mt-[1vh]" style={{fontSize: "2.2vw"}}>#1 cause of AHS safety stops</div>
          </div>

          <div className="bg-card border border-white/10 rounded p-[2vh_2vw]">
            <div className="font-display font-700 text-primary uppercase tracking-wide" style={{fontSize: "1.5vw"}}>Traffic Deadlock</div>
            <div className="font-body font-400 text-text mt-[0.8vh]" style={{fontSize: "2vw"}}>Filling spots nearest the entry first blocks returning trucks — queue stacking on every busy site.</div>
            <div className="font-display font-700 text-primary mt-[1vh]" style={{fontSize: "2.2vw"}}>8–12 trucks stacking per zone</div>
          </div>

          <div className="bg-card border border-white/10 rounded p-[2vh_2vw]">
            <div className="font-display font-700 text-primary uppercase tracking-wide" style={{fontSize: "1.5vw"}}>Expensive Corrections</div>
            <div className="font-body font-400 text-text mt-[0.8vh]" style={{fontSize: "2vw"}}>When spots run out or are badly placed, operators halt AHS and deploy the dozer — 1 to 4 hours lost.</div>
            <div className="font-display font-700 text-primary mt-[1vh]" style={{fontSize: "2.2vw"}}>$2,000–$8,000 per event</div>
          </div>

        </div>
      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>02 / 14</div>
    </div>
  );
}
