export default function Slide12Comparison() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[8vh] pb-[6vh]">

        <div className="flex items-center gap-[1vw] mb-[1.5vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Competitive Gap</span>
        </div>

        <div className="font-display font-800 text-text tracking-tight" style={{fontSize: "4.2vw"}}>
          Nothing in production does all of this today.
        </div>
        <div className="mt-[0.5vh] h-[0.2vh] w-[10vw] bg-primary" />

        <div className="mt-[3.5vh] bg-card border border-white/10 rounded overflow-hidden flex-1">

          {/* Header */}
          <div className="grid px-[2vw] py-[1.2vh] bg-white/5 border-b border-white/10" style={{gridTemplateColumns: "2fr 1fr 1fr"}}>
            <div className="font-display font-700 text-muted uppercase tracking-wide" style={{fontSize: "1.4vw"}}>Capability</div>
            <div className="font-display font-700 text-muted uppercase tracking-wide text-center" style={{fontSize: "1.4vw"}}>Fixed-Grid AHS</div>
            <div className="font-display font-700 text-primary uppercase tracking-wide text-center" style={{fontSize: "1.4vw"}}>Optimal Dump Packing</div>
          </div>

          <div className="grid px-[2vw] py-[1.2vh] border-b border-white/5" style={{gridTemplateColumns: "2fr 1fr 1fr"}}>
            <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Polygon-aware planning</div>
            <div className="font-display font-700 text-red-400 text-center" style={{fontSize: "1.8vw"}}>Rectangle only</div>
            <div className="font-display font-700 text-green-400 text-center" style={{fontSize: "1.8vw"}}>Any polygon</div>
          </div>

          <div className="grid px-[2vw] py-[1.2vh] border-b border-white/5" style={{gridTemplateColumns: "2fr 1fr 1fr"}}>
            <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Rotation optimisation</div>
            <div className="font-display font-700 text-red-400 text-center" style={{fontSize: "1.8vw"}}>Fixed 0°</div>
            <div className="font-display font-700 text-green-400 text-center" style={{fontSize: "1.8vw"}}>0–60° sweep</div>
          </div>

          <div className="grid px-[2vw] py-[1.2vh] border-b border-white/5" style={{gridTemplateColumns: "2fr 1fr 1fr"}}>
            <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Turning radius safety</div>
            <div className="font-display font-700 text-red-400 text-center" style={{fontSize: "1.8vw"}}>Conservative buffer</div>
            <div className="font-display font-700 text-green-400 text-center" style={{fontSize: "1.8vw"}}>Exact inset</div>
          </div>

          <div className="grid px-[2vw] py-[1.2vh] border-b border-white/5" style={{gridTemplateColumns: "2fr 1fr 1fr"}}>
            <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Traffic-optimal dispatch</div>
            <div className="font-display font-700 text-red-400 text-center" style={{fontSize: "1.8vw"}}>Sequential</div>
            <div className="font-display font-700 text-green-400 text-center" style={{fontSize: "1.8vw"}}>Farthest-first</div>
          </div>

          <div className="grid px-[2vw] py-[1.2vh] border-b border-white/5" style={{gridTemplateColumns: "2fr 1fr 1fr"}}>
            <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Real-time driver tracking</div>
            <div className="font-display font-700 text-red-400 text-center" style={{fontSize: "1.8vw"}}>AHS console only</div>
            <div className="font-display font-700 text-green-400 text-center" style={{fontSize: "1.8vw"}}>Web dashboard + app</div>
          </div>

          <div className="grid px-[2vw] py-[1.2vh] border-b border-white/5" style={{gridTemplateColumns: "2fr 1fr 1fr"}}>
            <div className="font-body text-text" style={{fontSize: "1.8vw"}}>Planning time</div>
            <div className="font-display font-700 text-red-400 text-center" style={{fontSize: "1.8vw"}}>30–120 min</div>
            <div className="font-display font-700 text-green-400 text-center" style={{fontSize: "1.8vw"}}>&lt;200 ms</div>
          </div>

          <div className="grid px-[2vw] py-[1.4vh]" style={{gridTemplateColumns: "2fr 1fr 1fr", background: "rgba(245,158,11,0.06)"}}>
            <div className="font-display font-700 text-text" style={{fontSize: "1.8vw"}}>Area utilisation achieved</div>
            <div className="font-display font-700 text-red-400 text-center" style={{fontSize: "1.8vw"}}>~41%</div>
            <div className="font-display font-800 text-primary text-center" style={{fontSize: "1.8vw"}}>~90%</div>
          </div>

        </div>

      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>12 / 14</div>
    </div>
  );
}
