export default function Slide07Expenses() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Section 06</div>
            <div style={{ fontSize: "1vw", fontWeight: 700, fontFamily: "monospace", color: "#29ABE2" }}>COST TRACKING</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Ref No.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>GSC-OBD-007</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", gap: "4vw", alignItems: "flex-start", marginTop: "2vh" }}>
          {/* Left — expenses */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "4.5vw", fontWeight: 800, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "0.02em", marginBottom: "2vh" }}>
              EXPENSE<br /><span style={{ color: "#29ABE2" }}>TRACKER</span>
            </div>
            <div style={{ width: "6vw", height: "3px", background: "#F5C518", marginBottom: "2vh" }} />
            <div style={{ fontSize: "1.6vw", fontFamily: "'Barlow', sans-serif", fontWeight: 400, opacity: 0.85, lineHeight: 1.5, marginBottom: "2.5vh" }}>
              Log all business costs — from cleaning supplies to rent. Filter by month or category. Import multiple entries at once via CSV.
            </div>

            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", marginBottom: "1vh" }}>Expense Categories</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8vh" }}>
              <div style={{ padding: "0.6vh 1vw", border: "0.5px solid rgba(41,171,226,0.4)", fontSize: "1.15vw", background: "rgba(41,171,226,0.08)" }}>Supplies</div>
              <div style={{ padding: "0.6vh 1vw", border: "0.5px solid rgba(41,171,226,0.4)", fontSize: "1.15vw", background: "rgba(41,171,226,0.08)" }}>Rent</div>
              <div style={{ padding: "0.6vh 1vw", border: "0.5px solid rgba(41,171,226,0.4)", fontSize: "1.15vw", background: "rgba(41,171,226,0.08)" }}>Transport</div>
              <div style={{ padding: "0.6vh 1vw", border: "0.5px solid rgba(41,171,226,0.4)", fontSize: "1.15vw", background: "rgba(41,171,226,0.08)" }}>Equipment</div>
              <div style={{ padding: "0.6vh 1vw", border: "0.5px solid rgba(41,171,226,0.4)", fontSize: "1.15vw", background: "rgba(41,171,226,0.08)" }}>Utilities</div>
              <div style={{ padding: "0.6vh 1vw", border: "0.5px solid rgba(41,171,226,0.4)", fontSize: "1.15vw", background: "rgba(41,171,226,0.08)" }}>Marketing</div>
              <div style={{ padding: "0.6vh 1vw", border: "0.5px solid rgba(41,171,226,0.4)", fontSize: "1.15vw", background: "rgba(41,171,226,0.08)" }}>Other</div>
            </div>

            <div style={{ marginTop: "2vh", border: "1px solid rgba(245,197,24,0.45)", background: "rgba(245,197,24,0.06)", padding: "1.2vh 1.2vw" }}>
              <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6, fontFamily: "'Barlow', sans-serif", marginBottom: "0.5vh" }}>CSV Import</div>
              <div style={{ fontSize: "1.35vw", fontFamily: "'Barlow', sans-serif" }}>Upload a CSV with multiple expense rows — the system previews them before saving</div>
            </div>
          </div>

          {/* Right — analytics */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "4.5vw", fontWeight: 800, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "0.02em", marginBottom: "2vh" }}>
              ANALYTICS<br /><span style={{ color: "#F5C518" }}>& TRENDS</span>
            </div>
            <div style={{ width: "6vw", height: "3px", background: "#29ABE2", marginBottom: "2vh" }} />
            <div style={{ fontSize: "1.6vw", fontFamily: "'Barlow', sans-serif", fontWeight: 400, opacity: 0.85, lineHeight: 1.5, marginBottom: "2.5vh" }}>
              Month-over-month charts show revenue and expense trends side by side. See which months performed best and where costs spiked.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1.2vw", padding: "1vh 1.2vw", border: "0.5px solid rgba(245,197,24,0.3)", background: "rgba(245,197,24,0.05)" }}>
                <div style={{ width: "3vw", height: "3vw", border: "1px solid rgba(245,197,24,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: "1.6vw", color: "#F5C518", fontWeight: 700 }}>$</div>
                </div>
                <div>
                  <div style={{ fontSize: "1.4vw", fontWeight: 700 }}>Revenue vs Expense Chart</div>
                  <div style={{ fontSize: "1.15vw", opacity: 0.65, fontFamily: "'Barlow', sans-serif" }}>Recharts bar chart — monthly view</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.2vw", padding: "1vh 1.2vw", border: "0.5px solid rgba(41,171,226,0.3)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ width: "3vw", height: "3vw", border: "1px solid rgba(41,171,226,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: "1.6vw", color: "#29ABE2", fontWeight: 700 }}>#</div>
                </div>
                <div>
                  <div style={{ fontSize: "1.4vw", fontWeight: 700 }}>Monthly Summary Cards</div>
                  <div style={{ fontSize: "1.15vw", opacity: 0.65, fontFamily: "'Barlow', sans-serif" }}>Income, costs, and trend vs prior month</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.2vw", padding: "1vh 1.2vw", border: "0.5px solid rgba(41,171,226,0.3)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ width: "3vw", height: "3vw", border: "1px solid rgba(41,171,226,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: "1.6vw", color: "#29ABE2", fontWeight: 700 }}>%</div>
                </div>
                <div>
                  <div style={{ fontSize: "1.4vw", fontWeight: 700 }}>Expense Breakdown</div>
                  <div style={{ fontSize: "1.15vw", opacity: 0.65, fontFamily: "'Barlow', sans-serif" }}>By category — pie view per month</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.15)", paddingTop: "1.5vh" }}>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Access</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>Directors only</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Import</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>CSV supported</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Page</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>07</div></div>
        </div>
      </div>
    </div>
  );
}
