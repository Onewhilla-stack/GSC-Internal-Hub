export default function Slide09GetStarted() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#1B3A5C", fontFamily: "'Barlow Condensed', sans-serif", color: "#FFFFFF" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "2vw 2vh" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "10vw 10vh" }} />
      <div style={{ position: "absolute", top: "3vh", left: "3vw", right: "3vw", bottom: "3vh", border: "1px solid rgba(41,171,226,0.35)" }} />
      <div style={{ position: "absolute", top: "5vh", left: "5vw", right: "5vw", bottom: "5vh", border: "0.5px solid rgba(41,171,226,0.15)" }} />
      {/* Full-height golden bar — cover-matching closing accent */}
      <div style={{ position: "absolute", top: "3vh", left: "3vw", width: "0.4vw", height: "20vh", background: "#F5C518" }} />

      <div style={{ padding: "7vh 7vw", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", position: "relative", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Section 08</div>
            <div style={{ fontSize: "1vw", fontWeight: 700, fontFamily: "monospace", color: "#29ABE2" }}>DAY ONE CHECKLIST</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Ref No.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>GSC-OBD-009</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", gap: "4vw", alignItems: "center" }}>
          {/* Left — headline */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "4.5vw", fontWeight: 800, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "0.02em", marginBottom: "2.5vh" }}>
              GET<br /><span style={{ color: "#F5C518" }}>STARTED</span>
            </div>
            <div style={{ width: "6vw", height: "3px", background: "#29ABE2", marginBottom: "2.5vh" }} />
            <div style={{ fontSize: "1.7vw", fontFamily: "'Barlow', sans-serif", fontWeight: 400, opacity: 0.85, lineHeight: 1.55, maxWidth: "36vw", marginBottom: "3vh" }}>
              Follow these steps on your first day. The system is live — your login credentials were issued separately.
            </div>

            {/* Quick reference box */}
            <div style={{ border: "1px solid rgba(245,197,24,0.5)", background: "rgba(245,197,24,0.06)", padding: "1.8vh 1.5vw" }}>
              <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6, fontFamily: "'Barlow', sans-serif", marginBottom: "1vh" }}>Credentials (change after first login)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6vh" }}>
                <div style={{ display: "flex", gap: "1vw" }}>
                  <div style={{ fontSize: "0.7vw", textTransform: "uppercase", opacity: 0.5, fontFamily: "monospace", minWidth: "7vw" }}>Director</div>
                  <div style={{ fontSize: "1.2vw", fontFamily: "monospace" }}>director1 or director2 / gsc2026</div>
                </div>
                <div style={{ display: "flex", gap: "1vw" }}>
                  <div style={{ fontSize: "0.7vw", textTransform: "uppercase", opacity: 0.5, fontFamily: "monospace", minWidth: "7vw" }}>Worker</div>
                  <div style={{ fontSize: "1.2vw", fontFamily: "monospace" }}>worker / gsc0000</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — checklist */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", marginBottom: "1.2vh" }}>Day One Steps</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
              <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start", padding: "1.2vh 1.2vw", border: "1px solid rgba(41,171,226,0.3)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "2vw", fontWeight: 800, color: "#29ABE2", lineHeight: 1, minWidth: "2.5vw" }}>01</div>
                <div>
                  <div style={{ fontSize: "1.5vw", fontWeight: 700 }}>Log in at the GSC Hub URL</div>
                  <div style={{ fontSize: "1.15vw", opacity: 0.65, fontFamily: "'Barlow', sans-serif" }}>Use the credentials above to access the system</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start", padding: "1.2vh 1.2vw", border: "1px solid rgba(41,171,226,0.3)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "2vw", fontWeight: 800, color: "#29ABE2", lineHeight: 1, minWidth: "2.5vw" }}>02</div>
                <div>
                  <div style={{ fontSize: "1.5vw", fontWeight: 700 }}>Review the Dashboard</div>
                  <div style={{ fontSize: "1.15vw", opacity: 0.65, fontFamily: "'Barlow', sans-serif" }}>Familiarise yourself with current month figures</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start", padding: "1.2vh 1.2vw", border: "1px solid rgba(41,171,226,0.3)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "2vw", fontWeight: 800, color: "#29ABE2", lineHeight: 1, minWidth: "2.5vw" }}>03</div>
                <div>
                  <div style={{ fontSize: "1.5vw", fontWeight: 700 }}>Check the Client Database</div>
                  <div style={{ fontSize: "1.15vw", opacity: 0.65, fontFamily: "'Barlow', sans-serif" }}>Browse existing clients and their job history</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start", padding: "1.2vh 1.2vw", border: "1px solid rgba(245,197,24,0.35)", background: "rgba(245,197,24,0.05)" }}>
                <div style={{ fontSize: "2vw", fontWeight: 800, color: "#F5C518", lineHeight: 1, minWidth: "2.5vw" }}>04</div>
                <div>
                  <div style={{ fontSize: "1.5vw", fontWeight: 700 }}>Log your first job (Directors)</div>
                  <div style={{ fontSize: "1.15vw", opacity: 0.65, fontFamily: "'Barlow', sans-serif" }}>Job Tracker — select client, date, team size, amount</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start", padding: "1.2vh 1.2vw", border: "1px solid rgba(245,197,24,0.35)", background: "rgba(245,197,24,0.05)" }}>
                <div style={{ fontSize: "2vw", fontWeight: 800, color: "#F5C518", lineHeight: 1, minWidth: "2.5vw" }}>05</div>
                <div>
                  <div style={{ fontSize: "1.5vw", fontWeight: 700 }}>Verify Settings (Directors)</div>
                  <div style={{ fontSize: "1.15vw", opacity: 0.65, fontFamily: "'Barlow', sans-serif" }}>Confirm wage rate and rent are correct for your team</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.15)", paddingTop: "1.5vh" }}>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Status</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>SYSTEM LIVE</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Support</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>Gold Standard Cleaners</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Page</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>09</div></div>
        </div>
      </div>
    </div>
  );
}
