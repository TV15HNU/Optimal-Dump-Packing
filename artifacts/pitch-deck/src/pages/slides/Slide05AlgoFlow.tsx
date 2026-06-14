export default function Slide05AlgoFlow() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[8vh] pb-[6vh]">

        <div className="flex items-center gap-[1vw] mb-[1.5vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Algorithm Pipeline</span>
        </div>

        <div className="font-display font-800 text-text tracking-tight" style={{fontSize: "4.2vw"}}>
          From raw polygon to optimal dispatch in &lt;200 ms
        </div>
        <div className="mt-[0.5vh] h-[0.2vh] w-[10vw] bg-primary" />

        {/* Flow diagram */}
        <div className="mt-[4vh] flex items-center gap-0 flex-1">

          {/* Step 1 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full bg-card border border-white/15 rounded p-[2vh_1vw] text-center">
              <div className="font-display font-700 text-muted uppercase tracking-widest" style={{fontSize: "1.2vw"}}>Input</div>
              <div className="font-display font-800 text-text mt-[0.8vh]" style={{fontSize: "1.8vw"}}>Polygon</div>
              <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>Draw or GPS capture any shape</div>
            </div>
          </div>

          <div className="font-display font-800 text-primary px-[0.8vw]" style={{fontSize: "2.5vw"}}>→</div>

          {/* Step 2 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full bg-card border border-primary/30 rounded p-[2vh_1vw] text-center">
              <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.2vw"}}>Stage 1</div>
              <div className="font-display font-800 text-text mt-[0.8vh]" style={{fontSize: "1.8vw"}}>Safety Inset</div>
              <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>Shrink by turning radius O(n)</div>
            </div>
          </div>

          <div className="font-display font-800 text-primary px-[0.8vw]" style={{fontSize: "2.5vw"}}>→</div>

          {/* Step 3 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full bg-card border border-primary/30 rounded p-[2vh_1vw] text-center">
              <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.2vw"}}>Stage 2</div>
              <div className="font-display font-800 text-text mt-[0.8vh]" style={{fontSize: "1.8vw"}}>Rotation Sweep</div>
              <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>0–60° in 12 evaluations</div>
            </div>
          </div>

          <div className="font-display font-800 text-primary px-[0.8vw]" style={{fontSize: "2.5vw"}}>→</div>

          {/* Step 4 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full bg-card border border-primary/30 rounded p-[2vh_1vw] text-center">
              <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.2vw"}}>Stage 3</div>
              <div className="font-display font-800 text-text mt-[0.8vh]" style={{fontSize: "1.8vw"}}>Best Hex Grid</div>
              <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>Max spots at optimal angle</div>
            </div>
          </div>

          <div className="font-display font-800 text-primary px-[0.8vw]" style={{fontSize: "2.5vw"}}>→</div>

          {/* Step 5 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full bg-card border border-primary/30 rounded p-[2vh_1vw] text-center">
              <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.2vw"}}>Stage 4</div>
              <div className="font-display font-800 text-text mt-[0.8vh]" style={{fontSize: "1.8vw"}}>Gap Fill</div>
              <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>Boundary voids captured</div>
            </div>
          </div>

          <div className="font-display font-800 text-primary px-[0.8vw]" style={{fontSize: "2.5vw"}}>→</div>

          {/* Step 6 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full bg-card border border-white/15 rounded p-[2vh_1vw] text-center" style={{background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.5)"}}>
              <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.2vw"}}>Output</div>
              <div className="font-display font-800 text-primary mt-[0.8vh]" style={{fontSize: "1.8vw"}}>Dispatch Plan</div>
              <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>Farthest-first ordered spots</div>
            </div>
          </div>

        </div>

        {/* Hex symmetry insight */}
        <div className="mt-[3vh] flex gap-[3vw] items-stretch">
          <div className="flex-1 bg-card border border-white/10 rounded p-[1.5vh_1.5vw]">
            <div className="font-display font-700 text-text" style={{fontSize: "1.8vw"}}>Hex symmetry insight</div>
            <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.7vw"}}>Rotating a hex grid by 60° gives an identical layout. Only 0–60° needs scanning — 12 evaluations covers the entire space.</div>
          </div>
          <div className="flex-1 bg-card border border-white/10 rounded p-[1.5vh_1.5vw]">
            <div className="font-display font-700 text-text" style={{fontSize: "1.8vw"}}>Dual engine</div>
            <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.7vw"}}>The same algorithm runs client-side for instant preview and server-side for final export — no round-trip latency during planning.</div>
          </div>
        </div>

      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>05 / 14</div>
    </div>
  );
}
