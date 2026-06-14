export default function Slide09Dispatch() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[8vh] pb-[6vh]">

        <div className="flex items-center gap-[1vw] mb-[1.5vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Dispatch Order</span>
        </div>

        <div className="font-display font-800 text-text tracking-tight" style={{fontSize: "4.2vw"}}>
          Spot placement is only half the problem.
        </div>
        <div className="mt-[0.5vh] h-[0.2vh] w-[10vw] bg-primary" />

        <div className="mt-[3.5vh] grid grid-cols-2 gap-[3vw] flex-1">

          {/* Before */}
          <div className="bg-card border border-white/10 rounded p-[2.5vh_2vw] flex flex-col">
            <div className="font-display font-700 text-muted uppercase tracking-widest" style={{fontSize: "1.5vw"}}>Before — Sequential Fill</div>
            <div className="mt-[1.5vh] flex flex-col gap-[1.5vh] flex-1">

              {/* Access road */}
              <div className="border border-dashed border-white/20 rounded p-[1.5vh_1vw] text-center">
                <div className="font-display font-600 text-muted" style={{fontSize: "1.4vw"}}>ACCESS ROAD / ENTRY</div>
                <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>Spots 1, 2, 3 fill first — nearest to entry</div>
              </div>

              <div className="font-display font-700 text-red-400" style={{fontSize: "2.2vw"}}>
                Incoming truck blocked by returning truck at spot 1
              </div>
              <div className="font-body text-muted" style={{fontSize: "1.8vw"}}>
                On a site with 8–12 trucks, every new inbound truck must weave past every returning truck at the entry. Queue stacking begins after the 3rd truck arrives.
              </div>
              <div className="mt-auto bg-red-500/10 border border-red-500/30 rounded p-[1vh_1.2vw]">
                <div className="font-display font-700 text-red-400" style={{fontSize: "1.8vw"}}>Result: traffic deadlock + blown cycle times</div>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="bg-card border border-primary/30 rounded p-[2.5vh_2vw] flex flex-col">
            <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.5vw"}}>After — Farthest-First Dispatch</div>
            <div className="mt-[1.5vh] flex flex-col gap-[1.5vh] flex-1">

              {/* Deepest spot */}
              <div className="border border-primary/30 rounded p-[1.5vh_1vw] text-center" style={{background: "rgba(245,158,11,0.08)"}}>
                <div className="font-display font-600 text-primary" style={{fontSize: "1.4vw"}}>DEEPEST SPOT — FILLS FIRST</div>
                <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>Trucks travel to the back of the polygon first</div>
              </div>

              <div className="font-display font-700 text-green-400" style={{fontSize: "2.2vw"}}>
                Inbound and outbound never cross paths
              </div>
              <div className="font-body text-muted" style={{fontSize: "1.8vw"}}>
                Trucks go deep, dump, exit. The access road sees only one direction of traffic at any moment. No weaving, no queuing.
              </div>
              <div className="mt-auto bg-green-500/10 border border-green-500/30 rounded p-[1vh_1.2vw]">
                <div className="font-display font-700 text-green-400" style={{fontSize: "1.8vw"}}>Deadlock eliminated by sort order alone — O(n log n)</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>09 / 14</div>
    </div>
  );
}
