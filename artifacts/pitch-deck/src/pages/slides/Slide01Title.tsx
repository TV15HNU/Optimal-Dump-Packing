export default function Slide01Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      {/* Hex grid background motif */}
      <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "4vw 4vw"}} />
      {/* Amber left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />
      {/* Top amber rule */}
      <div className="absolute top-[12vh] left-[6vw] right-[6vw] h-[0.15vh] bg-primary opacity-40" />

      <div className="absolute inset-0 flex flex-col justify-between pl-[8vw] pr-[8vw] pt-[14vh] pb-[8vh]">

        {/* Category label */}
        <div className="flex items-center gap-[1.5vw]">
          <div className="h-[0.3vh] w-[3vw] bg-primary" />
          <span className="font-display font-600 text-primary uppercase tracking-widest" style={{fontSize: "1.6vw"}}>
            Industrial AI · Mining Automation · Hackathon Finals 2026
          </span>
        </div>

        {/* Main title block */}
        <div>
          <div className="font-display font-800 tracking-tight text-text leading-none" style={{fontSize: "7.5vw", textWrap: "balance"}}>
            OPTIMAL
          </div>
          <div className="font-display font-800 tracking-tight text-primary leading-none" style={{fontSize: "7.5vw", textWrap: "balance"}}>
            DUMP PACKING
          </div>
          <div className="mt-[2.5vh] font-body font-400 text-muted" style={{fontSize: "2.2vw"}}>
            Adaptive Polygon Spot-Point Packing for Autonomous Mining Haul Trucks
          </div>

          {/* Problem statement strip */}
          <div className="mt-[3vh] flex items-center gap-[2vw]">
            <div className="h-[4.5vh] w-[0.4vw] bg-primary shrink-0" />
            <div className="font-body font-500 text-text" style={{fontSize: "2vw"}}>
              Current autonomous systems waste <span className="text-primary font-600">59% of every dump terrace.</span> We fix that in under 200 ms.
            </div>
          </div>
        </div>

        {/* Team strip at bottom */}
        <div className="flex items-end justify-between">
          <div>
            <div className="font-display font-700 text-muted uppercase tracking-widest" style={{fontSize: "1.4vw"}}>Team</div>
            <div className="font-display font-800 text-text mt-[0.4vh]" style={{fontSize: "2.8vw"}}>YOUR TEAM NAME</div>
          </div>
          <div className="flex gap-[4vw]">
            <div className="text-right">
              <div className="font-body font-600 text-text" style={{fontSize: "1.9vw"}}>Member Name 1</div>
              <div className="font-body font-400 text-muted mt-[0.3vh]" style={{fontSize: "1.5vw"}}>Role</div>
            </div>
            <div className="text-right">
              <div className="font-body font-600 text-text" style={{fontSize: "1.9vw"}}>Member Name 2</div>
              <div className="font-body font-400 text-muted mt-[0.3vh]" style={{fontSize: "1.5vw"}}>Role</div>
            </div>
            <div className="text-right">
              <div className="font-body font-600 text-text" style={{fontSize: "1.9vw"}}>Member Name 3</div>
              <div className="font-body font-400 text-muted mt-[0.3vh]" style={{fontSize: "1.5vw"}}>Role</div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide number */}
      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>01 / 14</div>
    </div>
  );
}
