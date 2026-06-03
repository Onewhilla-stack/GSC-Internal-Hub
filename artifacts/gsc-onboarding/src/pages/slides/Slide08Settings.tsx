export default function Slide08Settings() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Section 07</div>
            <div style={{ fontSize: "1vw", fontWeight: 700, fontFamily: "monospace", color: "#29ABE2" }}>CONFIGURATION</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Ref No.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>GSC-OBD-008</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", gap: "5vw", alignItems: "center" }}>
          {/* Left */}
          <div style={{ flex: 1.1 }}>
            <div style={{ fontSize: "4.5vw", fontWeight: 800, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "0.02em", marginBottom: "2.5vh" }}>
              SYSTEM<br /><span style={{ color: "#29ABE2" }}>SETTINGS</span>
            </div>
            <div style={{ width: "6vw", height: "3px", background: "#F5C518", marginBottom: "2.5vh" }} />
            <div style={{ fontSize: "1.7vw", fontFamily: "'Barlow', sans-serif", fontWeight: 400, opacity: 0.85, lineHeight: 1.55, maxWidth: "36vw" }}>
              Directors can configure the global parameters that drive all automatic calculations across jobs and the dashboard.
            </div>
          </div>

          {/* Right — settings parameters */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", marginBottom: "1.5vh" }}>Configurable Parameters</div>

            <div style={{ border: "1px solid rgba(245,197,24,0.5)", background: "rgba(245,197,24,0.06)", padding: "2vh 1.8vw", marginBottom: "2vh" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2vh" }}>
                <div>
                  <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6, fontFamily: "'Barlow', sans-serif" }}>Parameter</div>
                  <div style={{ fontSize: "1.8vw", fontWeight: 800, color: "#F5C518" }}>Wage Rate</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6, fontFamily: "'Barlow', sans-serif" }}>Default</div>
                  <div style={{ fontSize: "1.5vw", fontFamily: "monospace" }}>KES 1,000</div>
                </div>
              </div>
              <div style={{ borderTop: "0.5px solid rgba(245,197,24,0.3)", paddingTop: "1.2vh" }}>
                <div style={{ fontSize: "1.3vw", fontFamily: "'Barlow', sans-serif", opacity: 0.85 }}>Daily pay per team member. Changes here flow through to all new job wage calculations automatically.</div>
              </div>
            </div>

            <div style={{ border: "1px solid rgba(41,171,226,0.4)", background: "rgba(41,171,226,0.06)", padding: "2vh 1.8vw" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2vh" }}>
                <div>
                  <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6, fontFamily: "'Barlow', sans-serif" }}>Parameter</div>
                  <div style={{ fontSize: "1.8vw", fontWeight: 800, color: "#29ABE2" }}>Monthly Rent</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.65vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6, fontFamily: "'Barlow', sans-serif" }}>Unit</div>
                  <div style={{ fontSize: "1.5vw", fontFamily: "monospace" }}>KES / month</div>
                </div>
              </div>
              <div style={{ borderTop: "0.5px solid rgba(41,171,226,0.3)", paddingTop: "1.2vh" }}>
                <div style={{ fontSize: "1.3vw", fontFamily: "'Barlow', sans-serif", opacity: 0.85 }}>Recurring overhead cost. Reflected in the dashboard's monthly expense total.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.15)", paddingTop: "1.5vh" }}>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Access</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>Directors only</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Impact</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>All job calculations</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Page</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>08</div></div>
        </div>
      </div>
    </div>
  );
}
