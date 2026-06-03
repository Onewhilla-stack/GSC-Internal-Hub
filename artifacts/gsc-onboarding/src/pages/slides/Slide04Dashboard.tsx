export default function Slide04Dashboard() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Section 03</div>
            <div style={{ fontSize: "1vw", fontWeight: 700, fontFamily: "monospace", color: "#29ABE2" }}>COMMAND CENTRE</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Ref No.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>GSC-OBD-004</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", gap: "4vw", alignItems: "center" }}>
          {/* Left */}
          <div style={{ flex: 1.1 }}>
            <div style={{ fontSize: "4.5vw", fontWeight: 800, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "0.02em", marginBottom: "2.5vh" }}>
              THE<br /><span style={{ color: "#29ABE2" }}>DASHBOARD</span>
            </div>
            <div style={{ width: "6vw", height: "3px", background: "#F5C518", marginBottom: "2.5vh" }} />
            <div style={{ fontSize: "1.7vw", fontFamily: "'Barlow', sans-serif", fontWeight: 400, opacity: 0.85, lineHeight: 1.55, maxWidth: "34vw" }}>
              The Dashboard is the first screen after login. It summarises the current month's financial performance in real time.
            </div>
          </div>

          {/* Right — KPI cards */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Live Metrics Shown</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2vh" }}>
              <div style={{ border: "1px solid rgba(41,171,226,0.35)", background: "rgba(41,171,226,0.07)", padding: "1.5vh 1.2vw" }}>
                <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Metric</div>
                <div style={{ fontSize: "1.5vw", fontWeight: 700 }}>Monthly Revenue</div>
                <div style={{ fontSize: "1.1vw", opacity: 0.6, fontFamily: "'Barlow', sans-serif" }}>Total job income this month</div>
              </div>
              <div style={{ border: "1px solid rgba(41,171,226,0.35)", background: "rgba(41,171,226,0.07)", padding: "1.5vh 1.2vw" }}>
                <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Metric</div>
                <div style={{ fontSize: "1.5vw", fontWeight: 700 }}>Monthly Expenses</div>
                <div style={{ fontSize: "1.1vw", opacity: 0.6, fontFamily: "'Barlow', sans-serif" }}>Business costs logged</div>
              </div>
              <div style={{ border: "1px solid rgba(245,197,24,0.45)", background: "rgba(245,197,24,0.07)", padding: "1.5vh 1.2vw" }}>
                <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Metric</div>
                <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#F5C518" }}>Net Income</div>
                <div style={{ fontSize: "1.1vw", opacity: 0.6, fontFamily: "'Barlow', sans-serif" }}>Revenue minus all wages & costs</div>
              </div>
              <div style={{ border: "1px solid rgba(41,171,226,0.35)", background: "rgba(41,171,226,0.07)", padding: "1.5vh 1.2vw" }}>
                <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Metric</div>
                <div style={{ fontSize: "1.5vw", fontWeight: 700 }}>Top Clients</div>
                <div style={{ fontSize: "1.1vw", opacity: 0.6, fontFamily: "'Barlow', sans-serif" }}>Highest-revenue clients listed</div>
              </div>
            </div>

            <div style={{ border: "0.5px solid rgba(255,255,255,0.15)", padding: "1.2vh 1.2vw", background: "rgba(255,255,255,0.03)", marginTop: "0.5vh" }}>
              <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", marginBottom: "0.4vh" }}>Also visible</div>
              <div style={{ fontSize: "1.3vw", fontFamily: "'Barlow', sans-serif" }}>Recent jobs list and a monthly revenue chart — scrollable by month</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.15)", paddingTop: "1.5vh" }}>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Access</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>All Roles</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Data</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>Live from DB</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Page</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>04</div></div>
        </div>
      </div>
    </div>
  );
}
