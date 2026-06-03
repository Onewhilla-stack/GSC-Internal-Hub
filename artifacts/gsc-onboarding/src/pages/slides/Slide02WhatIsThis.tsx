export default function Slide02WhatIsThis() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Section 01</div>
            <div style={{ fontSize: "1vw", fontWeight: 700, fontFamily: "monospace", color: "#29ABE2" }}>SYSTEM OVERVIEW</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Ref No.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>GSC-OBD-002</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", gap: "5vw", alignItems: "center", marginTop: "3vh" }}>
          {/* Left — headline + description */}
          <div style={{ flex: 1.2 }}>
            <div style={{ fontSize: "4.5vw", fontWeight: 800, lineHeight: 0.92, letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: "2.5vh" }}>
              WHAT IS<br /><span style={{ color: "#29ABE2" }}>THE HUB?</span>
            </div>
            <div style={{ width: "6vw", height: "3px", background: "#F5C518", marginBottom: "2.5vh" }} />
            <div style={{ fontSize: "1.8vw", fontWeight: 400, lineHeight: 1.55, opacity: 0.85, fontFamily: "'Barlow', sans-serif", maxWidth: "36vw" }}>
              The GSC Hub is Gold Standard Cleaners' internal management platform — a single place to track jobs, manage clients, log expenses, generate receipts, and monitor the business.
            </div>
          </div>

          {/* Right — module list */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.2vh" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", marginBottom: "0.5vh" }}>Modules Included</div>
            {[
              { code: "M-01", name: "Dashboard", desc: "Revenue, expenses & net income at a glance" },
              { code: "M-02", name: "Job Tracker", desc: "Log cleaning jobs, team size & earnings" },
              { code: "M-03", name: "Client Database", desc: "Client records with GSC-001 codes" },
              { code: "M-04", name: "Expense Tracker", desc: "Log business expenses by category" },
              { code: "M-05", name: "Receipt Generator", desc: "Produce and print official GSC receipts" },
              { code: "M-06", name: "Analytics", desc: "Month-over-month revenue trends" },
              { code: "M-07", name: "Settings", desc: "Wage rates and rent configuration" },
            ].map((m) => (
              <div key={m.code} style={{ display: "flex", alignItems: "center", gap: "1.2vw", padding: "0.8vh 1vw", border: "0.5px solid rgba(41,171,226,0.25)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "0.85vw", fontFamily: "monospace", color: "#F5C518", minWidth: "4vw" }}>{m.code}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "1.3vw", fontWeight: 700, letterSpacing: "0.05em" }}>{m.name}</div>
                  <div style={{ fontSize: "1.1vw", opacity: 0.6, fontFamily: "'Barlow', sans-serif", fontWeight: 300 }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.15)", paddingTop: "1.5vh" }}>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Status</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>ACTIVE</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Location</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>Nairobi, Kenya</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Page</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>02</div></div>
        </div>
      </div>
    </div>
  );
}
