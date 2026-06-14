export default function Slide14ThankYou() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg font-body">
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: "radial-gradient(circle, #f59e0b 1.5px, transparent 1.5px)", backgroundSize: "5vw 5vw"}} />
      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[0.5vw] bg-primary" />
      {/* Bottom amber rule */}
      <div className="absolute bottom-[14vh] left-[6vw] right-[6vw] h-[0.15vh] bg-primary opacity-40" />

      {/* Concentric rings — decorative */}
      <div className="absolute right-[-10vw] bottom-[-15vh] w-[60vw] h-[60vw] rounded-full border border-primary/10" />
      <div className="absolute right-[-6vw] bottom-[-10vh] w-[40vw] h-[40vw] rounded-full border border-primary/15" />
      <div className="absolute right-[-2vw] bottom-[-5vh] w-[22vw] h-[22vw] rounded-full border border-primary/20" />

      <div className="absolute inset-0 flex flex-col justify-center pl-[8vw] pr-[46vw]">

        <div className="font-display font-700 text-primary uppercase tracking-widest" style={{fontSize: "1.6vw"}}>
          Optimal Dump Packing — Hackathon Finals 2026
        </div>

        <div className="mt-[2.5vh] font-display font-800 text-text tracking-tighter" style={{fontSize: "7vw", lineHeight: 1}}>
          THANK
        </div>
        <div className="font-display font-800 text-primary tracking-tighter" style={{fontSize: "7vw", lineHeight: 1}}>
          YOU.
        </div>

        <div className="mt-[3vh] h-[0.2vh] w-[8vw] bg-primary" />

        <div className="mt-[3vh] font-display font-700 text-text" style={{fontSize: "2.8vw"}}>
          Stage is open for questions.
        </div>

        <div className="mt-[2.5vh] font-body font-400 text-muted" style={{fontSize: "1.9vw"}}>
          Pack more dirt. Move less metal. Mine smarter.
        </div>

        <div className="mt-[4vh] flex gap-[3vw]">
          <div>
            <div className="font-display font-600 text-muted uppercase tracking-widest" style={{fontSize: "1.2vw"}}>Team</div>
            <div className="font-display font-700 text-text mt-[0.4vh]" style={{fontSize: "2.2vw"}}>YOUR TEAM NAME</div>
          </div>
        </div>

      </div>

      <div className="absolute bottom-[3vh] right-[4vw] font-display font-600 text-muted opacity-40" style={{fontSize: "1.4vw"}}>14 / 14</div>
    </div>
  );
}
