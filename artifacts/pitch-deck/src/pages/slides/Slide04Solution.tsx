export default function Slide04Solution() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[8vh] pb-[6vh]">

        <div className="flex items-center gap-[1vw] mb-[1.5vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Our Solution</span>
        </div>

        <div className="font-display font-800 text-text tracking-tight" style={{fontSize: "4.2vw"}}>
          Five algorithms. One system. Maximum density.
        </div>
        <div className="mt-[0.5vh] h-[0.2vh] w-[10vw] bg-primary" />

        {/* 5 algorithm cards in a row */}
        <div className="mt-[3.5vh] grid grid-cols-5 gap-[1.5vw] flex-1">

          <div className="bg-card border border-primary/30 rounded flex flex-col p-[2vh_1.2vw]">
            <div className="font-display font-800 text-primary text-center" style={{fontSize: "2.8vw", lineHeight: 1}}>01</div>
            <div className="font-display font-700 text-text text-center mt-[1vh] uppercase tracking-wide" style={{fontSize: "1.4vw"}}>Polygon Inset</div>
            <div className="mt-[1vh] h-[0.15vh] w-full bg-primary/30" />
            <div className="font-body font-400 text-muted text-center mt-[1.2vh]" style={{fontSize: "1.7vw"}}>Shrinks zone by truck's turning radius. Every spot reachable — no edge overshoot.</div>
          </div>

          <div className="bg-card border border-primary/30 rounded flex flex-col p-[2vh_1.2vw]">
            <div className="font-display font-800 text-primary text-center" style={{fontSize: "2.8vw", lineHeight: 1}}>02</div>
            <div className="font-display font-700 text-text text-center mt-[1vh] uppercase tracking-wide" style={{fontSize: "1.4vw"}}>Hex Packing</div>
            <div className="mt-[1vh] h-[0.15vh] w-full bg-primary/30" />
            <div className="font-body font-400 text-muted text-center mt-[1.2vh]" style={{fontSize: "1.7vw"}}>90.7% theoretical density — the provable maximum for equal circles in 2D.</div>
          </div>

          <div className="bg-card border border-primary/30 rounded flex flex-col p-[2vh_1.2vw]">
            <div className="font-display font-800 text-primary text-center" style={{fontSize: "2.8vw", lineHeight: 1}}>03</div>
            <div className="font-display font-700 text-text text-center mt-[1vh] uppercase tracking-wide" style={{fontSize: "1.4vw"}}>Rotation Sweep</div>
            <div className="mt-[1vh] h-[0.15vh] w-full bg-primary/30" />
            <div className="font-body font-400 text-muted text-center mt-[1.2vh]" style={{fontSize: "1.7vw"}}>Tests 12 angles 0–60°. Picks the angle that fits the most spots in the polygon.</div>
          </div>

          <div className="bg-card border border-primary/30 rounded flex flex-col p-[2vh_1.2vw]">
            <div className="font-display font-800 text-primary text-center" style={{fontSize: "2.8vw", lineHeight: 1}}>04</div>
            <div className="font-display font-700 text-text text-center mt-[1vh] uppercase tracking-wide" style={{fontSize: "1.4vw"}}>Gap Fill</div>
            <div className="mt-[1vh] h-[0.15vh] w-full bg-primary/30" />
            <div className="font-body font-400 text-muted text-center mt-[1.2vh]" style={{fontSize: "1.7vw"}}>Second-pass raster scan captures boundary spots the primary grid misses.</div>
          </div>

          <div className="bg-card border border-primary/30 rounded flex flex-col p-[2vh_1.2vw]">
            <div className="font-display font-800 text-primary text-center" style={{fontSize: "2.8vw", lineHeight: 1}}>05</div>
            <div className="font-display font-700 text-text text-center mt-[1vh] uppercase tracking-wide" style={{fontSize: "1.4vw"}}>Farthest-First</div>
            <div className="mt-[1vh] h-[0.15vh] w-full bg-primary/30" />
            <div className="font-body font-400 text-muted text-center mt-[1.2vh]" style={{fontSize: "1.7vw"}}>Deep spots filled first. Trucks flow in — dump — flow out. Zero deadlock.</div>
          </div>

        </div>

        <div className="mt-[2.5vh] font-body font-500 text-muted" style={{fontSize: "1.9vw"}}>
          None of these five techniques is new — <span className="text-text">combining all five for autonomous dump planning is what no one has shipped.</span>
        </div>

      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>04 / 14</div>
    </div>
  );
}
