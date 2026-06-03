export default function Slide06Clients() {
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
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Section 05</div>
            <div style={{ fontSize: "1vw", fontWeight: 700, fontFamily: "monospace", color: "#29ABE2" }}>CLIENT REGISTRY</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5, fontFamily: "'Barlow', sans-serif" }}>Ref No.</div>
            <div style={{ fontSize: "1vw", fontFamily: "monospace" }}>GSC-OBD-006</div>
          </div>
        </div>

        {/* Content — two columns */}
        <div style={{ flex: 1, display: "flex", gap: "4vw", alignItems: "flex-start", marginTop: "2vh" }}>
          {/* Left — Client DB */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "4vw", fontWeight: 800, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "0.02em", marginBottom: "2vh" }}>
              CLIENT<br /><span style={{ color: "#29ABE2" }}>DATABASE</span>
            </div>
            <div style={{ width: "6vw", height: "3px", background: "#F5C518", marginBottom: "2vh" }} />
            <div style={{ fontSize: "1.6vw", fontFamily: "'Barlow', sans-serif", fontWeight: 400, opacity: 0.85, lineHeight: 1.5, marginBottom: "2.5vh" }}>
              Every client gets a unique GSC-format code. The database stores their name, contact, location, and service status.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
              <div style={{ display: "flex", gap: "1vw", padding: "0.9vh 1vw", border: "0.5px solid rgba(41,171,226,0.25)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "0.75vw", fontFamily: "monospace", color: "#29ABE2", minWidth: "7vw" }}>CODE</div>
                <div style={{ fontSize: "1.2vw", fontFamily: "'Barlow', sans-serif" }}>Auto-assigned — GSC-001, GSC-002…</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", padding: "0.9vh 1vw", border: "0.5px solid rgba(41,171,226,0.25)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "0.75vw", fontFamily: "monospace", color: "#29ABE2", minWidth: "7vw" }}>NAME</div>
                <div style={{ fontSize: "1.2vw", fontFamily: "'Barlow', sans-serif" }}>Full client name</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", padding: "0.9vh 1vw", border: "0.5px solid rgba(41,171,226,0.25)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "0.75vw", fontFamily: "monospace", color: "#29ABE2", minWidth: "7vw" }}>LOCATION</div>
                <div style={{ fontSize: "1.2vw", fontFamily: "'Barlow', sans-serif" }}>Area / neighbourhood in Nairobi</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", padding: "0.9vh 1vw", border: "0.5px solid rgba(41,171,226,0.25)", background: "rgba(41,171,226,0.05)" }}>
                <div style={{ fontSize: "0.75vw", fontFamily: "monospace", color: "#29ABE2", minWidth: "7vw" }}>STATUS</div>
                <div style={{ fontSize: "1.2vw", fontFamily: "'Barlow', sans-serif" }}>Active / Inactive</div>
              </div>
            </div>
          </div>

          {/* Right — Receipts */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "4vw", fontWeight: 800, textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "0.02em", marginBottom: "2vh" }}>
              RECEIPT<br /><span style={{ color: "#F5C518" }}>GENERATOR</span>
            </div>
            <div style={{ width: "6vw", height: "3px", background: "#29ABE2", marginBottom: "2vh" }} />
            <div style={{ fontSize: "1.6vw", fontFamily: "'Barlow', sans-serif", fontWeight: 400, opacity: 0.85, lineHeight: 1.5, marginBottom: "2.5vh" }}>
              Generate a printable receipt for any job — line items auto-populate from the job record. Print directly from browser.
            </div>

            <div style={{ border: "1px solid rgba(245,197,24,0.45)", background: "rgba(245,197,24,0.06)", padding: "1.5vh 1.5vw", marginBottom: "1.5vh" }}>
              <div style={{ fontSize: "0.7vw", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6, fontFamily: "'Barlow', sans-serif", marginBottom: "0.8vh" }}>Receipt Format</div>
              <div style={{ fontSize: "1.4vw", fontFamily: "monospace", color: "#F5C518" }}>GSC-RCT-001, GSC-RCT-002…</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.8vh" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw", padding: "0.8vh 1vw", border: "0.5px solid rgba(245,197,24,0.25)", background: "rgba(245,197,24,0.04)" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", background: "#F5C518", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1.2vw", fontFamily: "'Barlow', sans-serif" }}>Multiple services itemised on one receipt</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw", padding: "0.8vh 1vw", border: "0.5px solid rgba(245,197,24,0.25)", background: "rgba(245,197,24,0.04)" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", background: "#F5C518", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1.2vw", fontFamily: "'Barlow', sans-serif" }}>Total auto-summed across line items</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw", padding: "0.8vh 1vw", border: "0.5px solid rgba(245,197,24,0.25)", background: "rgba(245,197,24,0.04)" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", background: "#F5C518", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1.2vw", fontFamily: "'Barlow', sans-serif" }}>Shows "Multiple Services" when 2+ items</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid rgba(255,255,255,0.15)", paddingTop: "1.5vh" }}>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Access</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>Directors only (edit)</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Receipt Format</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>Print-ready PDF</div></div>
          <div><div style={{ fontSize: "0.6vw", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.4, fontFamily: "'Barlow', sans-serif" }}>Page</div><div style={{ fontSize: "0.9vw", fontFamily: "monospace" }}>06</div></div>
        </div>
      </div>
    </div>
  );
}
