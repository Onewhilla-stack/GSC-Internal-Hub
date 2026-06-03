export default function Slide03Login() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Section 02</div>
            <div style={{ fontSize: "1vw", fontWeight: 700, fontFamily: "monospace", color: "#29ABE2" }}>ACCESS & ROLES</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Ref No.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>GSC-OBD-003</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "4vh" }}>
          <div style={{ fontSize: "4.5vw", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 0.95 }}>
            LOGIN &<br /><span style={{ color: "#29ABE2" }}>USER ROLES</span>
          </div>
          <div style={{ width: "6vw", height: "3px", background: "#F5C518" }} />

          <div style={{ display: "flex", gap: "3vw" }}>
            {/* Director card */}
            <div style={{ flex: 1, border: "1px solid rgba(245,197,24,0.6)", background: "rgba(245,197,24,0.06)", padding: "2.5vh 2vw" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "1.5vh" }}>
                <div style={{ width: "0.4vw", height: "4vh", background: "#F5C518" }} />
                <div>
                  <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6, fontFamily: "'Barlow', sans-serif" }}>Role</div>
                  <div style={{ fontSize: "2vw", fontWeight: 800, color: "#F5C518", letterSpacing: "0.05em" }}>DIRECTOR</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1vh", marginBottom: "2vh" }}>
                <div style={{ display: "flex", gap: "1vw" }}>
                  <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", minWidth: "6vw" }}>Username</div>
                  <div style={{ fontSize: "1.2vw", fontFamily: "monospace" }}>director1 / director2</div>
                </div>
                <div style={{ display: "flex", gap: "1vw" }}>
                  <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", minWidth: "6vw" }}>Password</div>
                  <div style={{ fontSize: "1.2vw", fontFamily: "monospace" }}>gsc2026</div>
                </div>
              </div>
              <div style={{ borderTop: "0.5px solid rgba(245,197,24,0.3)", paddingTop: "1.5vh" }}>
                <div style={{ fontSize: "0.75vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", marginBottom: "0.8vh" }}>Permissions</div>
                <div style={{ fontSize: "1.3vw", fontWeight: 400, fontFamily: "'Barlow', sans-serif", lineHeight: 1.5 }}>Full access — create, edit, delete jobs, expenses, clients, receipts. View all analytics and configure settings.</div>
              </div>
            </div>

            {/* Worker card */}
            <div style={{ flex: 1, border: "1px solid rgba(41,171,226,0.45)", background: "rgba(41,171,226,0.06)", padding: "2.5vh 2vw" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "1.5vh" }}>
                <div style={{ width: "0.4vw", height: "4vh", background: "#29ABE2" }} />
                <div>
                  <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6, fontFamily: "'Barlow', sans-serif" }}>Role</div>
                  <div style={{ fontSize: "2vw", fontWeight: 800, color: "#29ABE2", letterSpacing: "0.05em" }}>WORKER</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1vh", marginBottom: "2vh" }}>
                <div style={{ display: "flex", gap: "1vw" }}>
                  <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", minWidth: "6vw" }}>Username</div>
                  <div style={{ fontSize: "1.2vw", fontFamily: "monospace" }}>worker</div>
                </div>
                <div style={{ display: "flex", gap: "1vw" }}>
                  <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", minWidth: "6vw" }}>Password</div>
                  <div style={{ fontSize: "1.2vw", fontFamily: "monospace" }}>gsc0000</div>
                </div>
              </div>
              <div style={{ borderTop: "0.5px solid rgba(41,171,226,0.3)", paddingTop: "1.5vh" }}>
                <div style={{ fontSize: "0.75vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.5, fontFamily: "'Barlow', sans-serif", marginBottom: "0.8vh" }}>Permissions</div>
                <div style={{ fontSize: "1.3vw", fontWeight: 400, fontFamily: "'Barlow', sans-serif", lineHeight: 1.5 }}>View-only access — browse dashboard, jobs, clients, and receipts. Cannot add, edit, or delete any records.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.15)", paddingTop: "1.5vh" }}>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Status</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>ACTIVE</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Auth</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>Session-based</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Page</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>03</div></div>
        </div>
      </div>
    </div>
  );
}
