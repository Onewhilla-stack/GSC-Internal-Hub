export default function Slide05JobTracker() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#1B3A5C", fontFamily: "'Barlow Condensed', sans-serif", color: "#FFFFFF" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "2vw 2vh" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "10vw 10vh" }} />
      <div style={{ position: "absolute", top: "3vh", left: "3vw", right: "3vw", bottom: "3vh", border: "1px solid rgba(41,171,226,0.35)" }} />
      <div style={{ position: "absolute", top: "5vh", left: "5vw", right: "5vw", bottom: "5vh", border: "0.5px solid rgba(41,171,226,0.15)" }} />
      <div style={{ position: "absolute", top: "3vh", left: "3vw", width: "0.4vw", height: "20vh", background: "#F5C518" }} />

      <div style={{ padding: "7vh 7vw", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", position: "relative", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Section 04</div>
            <div style={{ fontSize: "1vw", fontWeight: 700, fontFamily: "monospace", color: "#29ABE2" }}>OPERATIONS LOG</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Ref No.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>GSC-OBD-005</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", gap: "4vw", alignItems: "flex-start", marginTop: "2vh" }}>
          {/* Left */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "4.5vw", fontWeight: 800, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "0.02em", marginBottom: "2vh" }}>
              JOB<br /><span style={{ color: "#29ABE2" }}>TRACKER</span>
            </div>
            <div style={{ width: "6vw", height: "3px", background: "#F5C518", marginBottom: "2vh" }} />
            <div style={{ fontSize: "1.6vw", fontFamily: "'Barlow', sans-serif", fontWeight: 400, opacity: 0.85, lineHeight: 1.55, marginBottom: "2.5vh" }}>
              Log every cleaning job as it happens. Wages are auto-calculated from team size — directors can view, add, edit, and delete.
            </div>

            {/* Wage formula */}
            <div style={{ border: "1px solid rgba(245,197,24,0.5)", background: "rgba(245,197,24,0.06)", padding: "1.5vh 1.5vw" }}>
              <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6, fontFamily: "'Barlow', sans-serif", marginBottom: "0.8vh" }}>Auto-Calculation</div>
              <div style={{ fontSize: "1.5vw", fontFamily: "monospace", color: "#F5C518" }}>wages = team members × KES 1,000 / day</div>
              <div style={{ fontSize: "1.2vw", fontFamily: "monospace", marginTop: "0.5vh" }}>net income = amount − wages</div>
            </div>
          </div>

          {/* Right — fields */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", marginBottom: "1vh" }}>Fields per Job Entry</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
              <div style={{ display: "flex", gap: "1vw", padding: "0.9vh 1vw", border: "0.5px solid rgba(41,171,226,0.25)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "0.8vw", fontFamily: "monospace", color: "#29ABE2", minWidth: "8vw" }}>CLIENT</div>
                <div style={{ fontSize: "1.25vw", fontFamily: "'Barlow', sans-serif" }}>Select from client database</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", padding: "0.9vh 1vw", border: "0.5px solid rgba(41,171,226,0.25)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "0.8vw", fontFamily: "monospace", color: "#29ABE2", minWidth: "8vw" }}>SERVICE</div>
                <div style={{ fontSize: "1.25vw", fontFamily: "'Barlow', sans-serif" }}>Residential, Commercial, Deep Clean, etc.</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", padding: "0.9vh 1vw", border: "0.5px solid rgba(41,171,226,0.25)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "0.8vw", fontFamily: "monospace", color: "#29ABE2", minWidth: "8vw" }}>DATE</div>
                <div style={{ fontSize: "1.25vw", fontFamily: "'Barlow', sans-serif" }}>Date the job was completed</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", padding: "0.9vh 1vw", border: "0.5px solid rgba(41,171,226,0.25)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "0.8vw", fontFamily: "monospace", color: "#29ABE2", minWidth: "8vw" }}>TEAM SIZE</div>
                <div style={{ fontSize: "1.25vw", fontFamily: "'Barlow', sans-serif" }}>Number of cleaners deployed</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", padding: "0.9vh 1vw", border: "0.5px solid rgba(41,171,226,0.25)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "0.8vw", fontFamily: "monospace", color: "#29ABE2", minWidth: "8vw" }}>AMOUNT</div>
                <div style={{ fontSize: "1.25vw", fontFamily: "'Barlow', sans-serif" }}>Total charged to client (KES)</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", padding: "0.9vh 1vw", border: "0.5px solid rgba(41,171,226,0.25)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "0.8vw", fontFamily: "monospace", color: "#29ABE2", minWidth: "8vw" }}>NOTES</div>
                <div style={{ fontSize: "1.25vw", fontFamily: "'Barlow', sans-serif" }}>Optional job notes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.15)", paddingTop: "1.5vh" }}>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Access</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>Directors (edit) / Workers (view)</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Wage Default</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>KES 1,000 / person / day</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Page</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>05</div></div>
        </div>
      </div>
    </div>
  );
}
