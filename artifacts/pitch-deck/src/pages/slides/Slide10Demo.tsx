export default function Slide10Demo() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[8vh] pb-[6vh]">

        <div className="flex items-center gap-[1vw] mb-[1.5vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Live Demo</span>
        </div>

        <div className="font-display font-800 text-text tracking-tight" style={{fontSize: "4.2vw"}}>
          What you're about to see
        </div>
        <div className="mt-[0.5vh] h-[0.2vh] w-[10vw] bg-primary" />

        <div className="mt-[3.5vh] grid grid-cols-2 gap-[3vw] flex-1">

          {/* Left: Supervisor flow */}
          <div className="flex flex-col gap-[1.8vh]">
            <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.5vw"}}>Supervisor</div>

            <div className="flex items-start gap-[1.5vw]">
              <div className="font-display font-800 text-primary shrink-0 w-[3vw]" style={{fontSize: "2.5vw"}}>1</div>
              <div>
                <div className="font-display font-700 text-text" style={{fontSize: "1.9vw"}}>Draw an irregular dump polygon</div>
                <div className="font-body text-muted" style={{fontSize: "1.6vw"}}>Not a rectangle — the shape you'd find at a real mine bench</div>
              </div>
            </div>

            <div className="flex items-start gap-[1.5vw]">
              <div className="font-display font-800 text-primary shrink-0 w-[3vw]" style={{fontSize: "2.5vw"}}>2</div>
              <div>
                <div className="font-display font-700 text-text" style={{fontSize: "1.9vw"}}>Select CAT 793 — click Run Packing</div>
                <div className="font-body text-muted" style={{fontSize: "1.6vw"}}>Hex grid appears in &lt;50 ms. Rotation sweep chart shows 12 angles scored live.</div>
              </div>
            </div>

            <div className="flex items-start gap-[1.5vw]">
              <div className="font-display font-800 text-primary shrink-0 w-[3vw]" style={{fontSize: "2.5vw"}}>3</div>
              <div>
                <div className="font-display font-700 text-text" style={{fontSize: "1.9vw"}}>Fill Edge Gaps — set Entry point</div>
                <div className="font-body text-muted" style={{fontSize: "1.6vw"}}>Gap-fill spots appear. Dispatch order locks to farthest-first.</div>
              </div>
            </div>

            <div className="flex items-start gap-[1.5vw]">
              <div className="font-display font-800 text-primary shrink-0 w-[3vw]" style={{fontSize: "2.5vw"}}>4</div>
              <div>
                <div className="font-display font-700 text-text" style={{fontSize: "1.9vw"}}>Simulation tab — watch the fill</div>
                <div className="font-body text-muted" style={{fontSize: "1.6vw"}}>Amber glow travels from deepest spot toward entry. Each filled spot turns green.</div>
              </div>
            </div>
          </div>

          {/* Right: Supervisor Dashboard + Driver */}
          <div className="flex flex-col gap-[1.8vh]">
            <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.5vw"}}>Dashboard + Driver</div>

            <div className="flex items-start gap-[1.5vw]">
              <div className="font-display font-800 text-primary shrink-0 w-[3vw]" style={{fontSize: "2.5vw"}}>5</div>
              <div>
                <div className="font-display font-700 text-text" style={{fontSize: "1.9vw"}}>Dashboard — Start Demo Fill</div>
                <div className="font-body text-muted" style={{fontSize: "1.6vw"}}>Spots fill farthest-first every second. Canvas and sparkline update live. Toast at 100%.</div>
              </div>
            </div>

            <div className="flex items-start gap-[1.5vw]">
              <div className="font-display font-800 text-primary shrink-0 w-[3vw]" style={{fontSize: "2.5vw"}}>6</div>
              <div>
                <div className="font-display font-700 text-text" style={{fontSize: "1.9vw"}}>Driver Work tab — Mark Done</div>
                <div className="font-body text-muted" style={{fontSize: "1.6vw"}}>Sign in as Driver. Select site. Deepest pending spot glows amber. One tap — next spot activates.</div>
              </div>
            </div>

            <div className="flex items-start gap-[1.5vw]">
              <div className="font-display font-800 text-primary shrink-0 w-[3vw]" style={{fontSize: "2.5vw"}}>7</div>
              <div>
                <div className="font-display font-700 text-text" style={{fontSize: "1.9vw"}}>Supervisor sees it — within 10 seconds</div>
                <div className="font-body text-muted" style={{fontSize: "1.6vw"}}>Dashboard auto-refreshes. No page reload. Progress bar moves. History log records the event.</div>
              </div>
            </div>

            <div className="mt-auto bg-primary/10 border border-primary/30 rounded p-[1.5vh_1.5vw]">
              <div className="font-body font-500 text-text" style={{fontSize: "1.8vw"}}>
                Entire Planner → Simulation → Dashboard → Driver cycle runs end-to-end in this single browser tab.
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>10 / 14</div>
    </div>
  );
}
