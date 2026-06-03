export default function Slide01Cover() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#1B3A5C", fontFamily: "'Barlow Condensed', sans-serif", color: "#FFFFFF" }}>
      {/* Fine grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "2vw 2vh" }} />
      {/* Major grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "10vw 10vh" }} />
      {/* Outer border */}
      <div style={{ position: "absolute", top: "3vh", left: "3vw", right: "3vw", bottom: "3vh", border: "1px solid rgba(41,171,226,0.35)" }} />
      {/* Inner border */}
      <div style={{ position: "absolute", top: "5vh", left: "5vw", right: "5vw", bottom: "5vh", border: "0.5px solid rgba(41,171,226,0.15)" }} />

      {/* Golden accent bar — left edge */}
      <div style={{ position: "absolute", top: "3vh", left: "3vw", width: "0.4vw", height: "20vh", background: "#F5C518" }} />

      {/* Top metadata row */}
      <div style={{ position: "absolute", top: "4.5vh", left: "7vw", right: "7vw", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Drawing No.</div>
          <div style={{ fontSize: "1vw", fontWeight: 700, fontFamily: "monospace", color: "#F5C518" }}>GSC-OBD-001</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Date</div>
          <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>2026-06-03</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ position: "absolute", top: "50%", left: "7vw", transform: "translateY(-52%)" }}>
        <div style={{ fontSize: "0.9vw", textTransform: "uppercase", letterSpacing: "0.35em", opacity: 0.5, marginBottom: "1.5vh", fontFamily: "'Barlow', sans-serif" }}>
          Project Title
        </div>
        <div style={{ fontSize: "7.5vw", fontWeight: 800, lineHeight: 0.88, letterSpacing: "0.02em", textTransform: "uppercase" }}>
          GOLD
        </div>
        <div style={{ fontSize: "7.5vw", fontWeight: 800, lineHeight: 0.88, letterSpacing: "0.02em", textTransform: "uppercase", color: "#29ABE2" }}>
          STANDARD
        </div>
        <div style={{ fontSize: "7.5vw", fontWeight: 300, lineHeight: 0.88, letterSpacing: "0.02em", textTransform: "uppercase" }}>
          CLEANERS
        </div>
        <div style={{ width: "8vw", height: "3px", background: "#F5C518", marginTop: "2.5vh", marginBottom: "2vh" }} />
        <div style={{ fontSize: "1.6vw", fontWeight: 300, opacity: 0.75, fontFamily: "'Barlow', sans-serif", letterSpacing: "0.05em" }}>
          Internal System — Team Onboarding & Handover
        </div>
      </div>

      {/* Right panel — classification block */}
      <div style={{ position: "absolute", top: "50%", right: "7vw", transform: "translateY(-50%)", width: "20vw", border: "1px solid rgba(41,171,226,0.4)", background: "rgba(41,171,226,0.06)" }}>
        <div style={{ padding: "1.2vh 1.2vw", borderBottom: "1px solid rgba(41,171,226,0.3)" }}>
          <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>System</div>
          <div style={{ fontSize: "1.1vw", fontFamily: "monospace" }}>GSC HUB v1.0</div>
        </div>
        <div style={{ padding: "1.2vh 1.2vw", borderBottom: "1px solid rgba(41,171,226,0.3)" }}>
          <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Audience</div>
          <div style={{ fontSize: "1.1vw", fontFamily: "monospace" }}>Directors + Workers</div>
        </div>
        <div style={{ padding: "1.2vh 1.2vw", borderBottom: "1px solid rgba(41,171,226,0.3)" }}>
          <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Classification</div>
          <div style={{ fontSize: "1.1vw", fontFamily: "monospace", color: "#F5C518" }}>INTERNAL</div>
        </div>
        <div style={{ padding: "1.2vh 1.2vw" }}>
          <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Slides</div>
          <div style={{ fontSize: "1.1vw", fontFamily: "monospace" }}>9 Pages</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "4vh", left: "7vw", right: "7vw", display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.15)", paddingTop: "1.5vh" }}>
        <div>
          <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Prepared By</div>
          <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>Gold Standard Cleaners, Nairobi</div>
        </div>
        <div>
          <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Currency</div>
          <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>KES (Kenyan Shillings)</div>
        </div>
        <div>
          <div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Page</div>
          <div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>01</div>
        </div>
      </div>
    </div>
  );
}
