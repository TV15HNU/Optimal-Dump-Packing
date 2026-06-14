export default function Slide11Impact() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      {/* Large decorative background text */}
      <div className="absolute right-[4vw] top-[8vh] font-display font-800 text-primary opacity-[0.05] select-none" style={{fontSize: "25vw", lineHeight: 1}}>ROI</div>

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[8vh] pb-[6vh]">

        <div className="flex items-center gap-[1vw] mb-[1.5vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Business Impact</span>
        </div>

        <div className="font-display font-800 text-text tracking-tight" style={{fontSize: "4.2vw"}}>
          Zero hardware changes. Immediate ROI.
        </div>
        <div className="mt-[0.5vh] h-[0.2vh] w-[10vw] bg-primary" />

        <div className="mt-[3.5vh] grid grid-cols-2 gap-[3vw]">

          {/* Left: cost table */}
          <div>
            <div className="font-display font-700 text-text uppercase tracking-wide mb-[1.5vh]" style={{fontSize: "1.6vw"}}>Annual saving per dump zone</div>
            <div className="bg-card border border-white/10 rounded overflow-hidden">

              <div className="grid grid-cols-2 bg-white/5 border-b border-white/10 px-[1.5vw] py-[1vh]">
                <div className="font-display font-700 text-muted uppercase tracking-wide" style={{fontSize: "1.3vw"}}>Saving category</div>
                <div className="font-display font-700 text-primary uppercase tracking-wide text-right" style={{fontSize: "1.3vw"}}>Value</div>
              </div>

              <div className="grid grid-cols-2 px-[1.5vw] py-[1.2vh] border-b border-white/5">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Dozer interventions reduced 80%</div>
                <div className="font-display font-700 text-primary text-right" style={{fontSize: "1.7vw"}}>$800,000</div>
              </div>
              <div className="grid grid-cols-2 px-[1.5vw] py-[1.2vh] border-b border-white/5">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>+26% spot capacity per cycle</div>
                <div className="font-display font-700 text-primary text-right" style={{fontSize: "1.7vw"}}>$2,400,000</div>
              </div>
              <div className="grid grid-cols-2 px-[1.5vw] py-[1.2vh] border-b border-white/5">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Cycle time improvement</div>
                <div className="font-display font-700 text-primary text-right" style={{fontSize: "1.7vw"}}>$1,200,000</div>
              </div>
              <div className="grid grid-cols-2 px-[1.5vw] py-[1.2vh] border-b border-white/5">
                <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Safety event avoidance</div>
                <div className="font-display font-700 text-primary text-right" style={{fontSize: "1.7vw"}}>$300,000</div>
              </div>
              <div className="grid grid-cols-2 px-[1.5vw] py-[1.5vh] bg-primary/10">
                <div className="font-display font-700 text-text" style={{fontSize: "1.8vw"}}>Total per zone per year</div>
                <div className="font-display font-800 text-primary text-right" style={{fontSize: "1.8vw"}}>$4,700,000</div>
              </div>

            </div>
          </div>

          {/* Right: scale + market */}
          <div className="flex flex-col gap-[2vh]">

            <div className="bg-card border border-primary/30 rounded p-[2vh_2vw]">
              <div className="font-display font-700 text-muted uppercase tracking-widest" style={{fontSize: "1.3vw"}}>10 dump zones</div>
              <div className="font-display font-800 text-primary" style={{fontSize: "4.5vw", lineHeight: 1}}>$47M/yr</div>
              <div className="font-body text-muted" style={{fontSize: "1.6vw"}}>Total recoverable value at a single mine</div>
            </div>

            <div className="bg-card border border-white/10 rounded p-[2vh_2vw]">
              <div className="font-display font-700 text-text" style={{fontSize: "1.8vw"}}>Market opportunity</div>
              <div className="font-body text-muted mt-[0.8vh]" style={{fontSize: "1.7vw"}}>
                500+ large open-pit mines globally running AHS. SaaS licensing at $50K–$200K/site/year.
              </div>
              <div className="font-display font-700 text-primary mt-[0.8vh]" style={{fontSize: "2.2vw"}}>TAM: $2.5B/year</div>
            </div>

            <div className="bg-card border border-white/10 rounded p-[2vh_2vw]">
              <div className="font-display font-700 text-text" style={{fontSize: "1.8vw"}}>AHS vendor-agnostic</div>
              <div className="font-body text-muted mt-[0.8vh]" style={{fontSize: "1.7vw"}}>Open JSON export works with Caterpillar Command, Komatsu FrontRunner, Epiroc Scooptram, Sandvik.</div>
            </div>

          </div>
        </div>

      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>11 / 14</div>
    </div>
  );
}
