export default function Slide03Scale() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />

      {/* Large amber circle accent — top right */}
      <div className="absolute top-[-8vh] right-[-4vw] w-[28vw] h-[28vw] rounded-full border border-primary/10" />
      <div className="absolute top-[-4vh] right-[-1vw] w-[18vw] h-[18vw] rounded-full border border-primary/20" />

      <div className="absolute inset-0 flex flex-col pl-[8vw] pr-[8vw] pt-[10vh] pb-[8vh]">

        <div className="flex items-center gap-[1vw] mb-[2vh]">
          <div className="h-[0.25vh] w-[2vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Scale of Impact</span>
        </div>

        {/* Hero stat */}
        <div className="flex items-baseline gap-[1.5vw]">
          <div className="font-display font-800 text-primary tracking-tighter" style={{fontSize: "13vw", lineHeight: 1}}>$4.7M</div>
          <div className="font-display font-700 text-text" style={{fontSize: "3.5vw", lineHeight: 1.2}}>lost value<br />per dump zone<br />per year</div>
        </div>

        <div className="mt-[3vh] h-[0.2vh] w-[20vw] bg-primary" />

        {/* 3 contributing factors */}
        <div className="mt-[3vh] flex gap-[4vw]">
          <div>
            <div className="font-display font-800 text-primary" style={{fontSize: "3.8vw"}}>$800K</div>
            <div className="font-body font-400 text-muted mt-[0.5vh]" style={{fontSize: "1.8vw"}}>Dozer interventions<br />reduced 80%</div>
          </div>
          <div className="w-[0.15vw] bg-white/10 self-stretch" />
          <div>
            <div className="font-display font-800 text-primary" style={{fontSize: "3.8vw"}}>$2.4M</div>
            <div className="font-body font-400 text-muted mt-[0.5vh]" style={{fontSize: "1.8vw"}}>Increased spot capacity<br />+26% more dumps</div>
          </div>
          <div className="w-[0.15vw] bg-white/10 self-stretch" />
          <div>
            <div className="font-display font-800 text-primary" style={{fontSize: "3.8vw"}}>$1.5M</div>
            <div className="font-body font-400 text-muted mt-[0.5vh]" style={{fontSize: "1.8vw"}}>Cycle time savings<br />from farthest-first dispatch</div>
          </div>
        </div>

        <div className="mt-[3.5vh] bg-card border border-primary/20 rounded p-[1.5vh_2vw]">
          <div className="font-body font-500 text-text" style={{fontSize: "2vw"}}>
            A mine with <span className="text-primary font-600">10 active dump zones</span> recovers <span className="text-primary font-600">$47M/year</span> — before any hardware change.
          </div>
        </div>
      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>03 / 14</div>
    </div>
  );
}
