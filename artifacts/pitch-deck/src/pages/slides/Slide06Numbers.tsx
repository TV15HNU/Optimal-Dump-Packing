export default function Slide06Numbers() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[8vh] pb-[6vh]">

        <div className="flex items-center gap-[1vw] mb-[1.5vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Performance</span>
        </div>

        <div className="font-display font-800 text-text tracking-tight" style={{fontSize: "4.2vw"}}>
          What the algorithm actually delivers
        </div>
        <div className="mt-[0.5vh] h-[0.2vh] w-[10vw] bg-primary" />

        {/* 4 big stats */}
        <div className="mt-[3.5vh] grid grid-cols-4 gap-[2vw]">

          <div className="bg-card border border-primary/30 rounded p-[2.5vh_1.5vw] text-center">
            <div className="font-display font-800 text-primary" style={{fontSize: "6vw", lineHeight: 1}}>2.4×</div>
            <div className="font-display font-700 text-text mt-[1vh]" style={{fontSize: "1.8vw"}}>Density improvement</div>
            <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>over current AHS systems</div>
          </div>

          <div className="bg-card border border-primary/30 rounded p-[2.5vh_1.5vw] text-center">
            <div className="font-display font-800 text-primary" style={{fontSize: "6vw", lineHeight: 1}}>+35%</div>
            <div className="font-display font-700 text-text mt-[1vh]" style={{fontSize: "1.8vw"}}>Peak spot gain</div>
            <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>trapezoidal polygons</div>
          </div>

          <div className="bg-card border border-primary/30 rounded p-[2.5vh_1.5vw] text-center">
            <div className="font-display font-800 text-primary" style={{fontSize: "6vw", lineHeight: 1}}>&lt;200ms</div>
            <div className="font-display font-700 text-text mt-[1vh]" style={{fontSize: "1.8vw"}}>Planning time</div>
            <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>any polygon, any truck</div>
          </div>

          <div className="bg-card border border-primary/30 rounded p-[2.5vh_1.5vw] text-center">
            <div className="font-display font-800 text-primary" style={{fontSize: "6vw", lineHeight: 1}}>90%</div>
            <div className="font-display font-700 text-text mt-[1vh]" style={{fontSize: "1.8vw"}}>Area utilisation</div>
            <div className="font-body text-muted mt-[0.5vh]" style={{fontSize: "1.5vw"}}>vs 41% fixed-grid baseline</div>
          </div>

        </div>

        {/* Benchmark table */}
        <div className="mt-[3vh] bg-card border border-white/10 rounded overflow-hidden">
          <div className="grid grid-cols-4 bg-white/5 border-b border-white/10 px-[2vw] py-[1vh]">
            <div className="font-display font-700 text-muted uppercase tracking-wide" style={{fontSize: "1.4vw"}}>Polygon</div>
            <div className="font-display font-700 text-muted uppercase tracking-wide" style={{fontSize: "1.4vw"}}>Truck</div>
            <div className="font-display font-700 text-muted uppercase tracking-wide" style={{fontSize: "1.4vw"}}>Hex Spots</div>
            <div className="font-display font-700 text-primary uppercase tracking-wide" style={{fontSize: "1.4vw"}}>Improvement</div>
          </div>
          <div className="grid grid-cols-4 px-[2vw] py-[1vh] border-b border-white/5">
            <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Rectangle 200×150m</div>
            <div className="font-body text-muted" style={{fontSize: "1.7vw"}}>CAT 793</div>
            <div className="font-body text-text" style={{fontSize: "1.7vw"}}>52 vs 42</div>
            <div className="font-display font-700 text-primary" style={{fontSize: "1.7vw"}}>+23.8%</div>
          </div>
          <div className="grid grid-cols-4 px-[2vw] py-[1vh] border-b border-white/5">
            <div className="font-body text-text" style={{fontSize: "1.7vw"}}>L-Shape Terrace</div>
            <div className="font-body text-muted" style={{fontSize: "1.7vw"}}>CAT 793</div>
            <div className="font-body text-text" style={{fontSize: "1.7vw"}}>71 vs 57</div>
            <div className="font-display font-700 text-primary" style={{fontSize: "1.7vw"}}>+24.6%</div>
          </div>
          <div className="grid grid-cols-4 px-[2vw] py-[1vh]">
            <div className="font-body text-text" style={{fontSize: "1.7vw"}}>Trapezoidal Bench</div>
            <div className="font-body text-muted" style={{fontSize: "1.7vw"}}>CAT 793</div>
            <div className="font-body text-text" style={{fontSize: "1.7vw"}}>61 vs 45</div>
            <div className="font-display font-700 text-primary" style={{fontSize: "1.7vw"}}>+35.6%</div>
          </div>
        </div>

      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>06 / 14</div>
    </div>
  );
}
