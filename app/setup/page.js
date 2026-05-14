/* app/setup/page.js */
/*
  UPDATED: Now includes an optional website URL field.
  When provided, Steeple scans the church website for doctrinal
  statements and "What We Believe" content. This gets stored
  alongside the voice profile to ensure theological accuracy.
*/

"use client";

import { useState } from "react";

const DENOMINATIONS = [
  "Non-denominational",
  "Southern Baptist (SBC)",
  "United Methodist",
  "Assemblies of God",
  "Presbyterian (PCA)",
  "Presbyterian (PCUSA)",
  "Lutheran (LCMS)",
  "Lutheran (ELCA)",
  "Church of Christ",
  "Catholic",
  "Episcopal / Anglican",
  "Reformed / Calvinist",
  "Pentecostal / Charismatic",
  "Church of the Nazarene",
  "Evangelical Free",
  "Other",
];

const TONES = [
  { value: "conversational", label: "Conversational & warm" },
  { value: "academic", label: "Thoughtful & scholarly" },
  { value: "passionate", label: "Passionate & urgent" },
  { value: "pastoral", label: "Gentle & pastoral" },
  { value: "storytelling", label: "Story-driven" },
];

export default function SetupPage() {
  const [churchName, setChurchName] = useState("");
  const [churchCode, setChurchCode] = useState("");
  const [denomination, setDenomination] = useState("Non-denominational");
  const [tone, setTone] = useState("conversational");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [transcripts, setTranscripts] = useState(["", "", ""]);

  // Website scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  // Main submission state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");

  const updateTranscript = (index, value) => {
    const updated = [...transcripts];
    updated[index] = value;
    setTranscripts(updated);
  };

  const addTranscriptSlot = () => {
    if (transcripts.length < 4) setTranscripts([...transcripts, ""]);
  };

  const removeTranscriptSlot = (index) => {
    if (transcripts.length > 1) setTranscripts(transcripts.filter((_, i) => i !== index));
  };

  // Scan the church website for doctrinal content
  const handleScanWebsite = async () => {
    if (!websiteUrl.trim()) return;

    setIsScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      const response = await fetch("/api/scan-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not scan website.");
      }

      setScanResult(data);
    } catch (err) {
      setScanError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle full setup submission
  const handleSubmit = async () => {
    if (!churchName.trim()) { setError("Please enter your church name."); return; }
    if (!churchCode.trim()) { setError("Please create a church code."); return; }
    if (churchCode.includes(" ")) {
      setError("Church code cannot contain spaces. Use hyphens instead.");
      return;
    }

    const filledTranscripts = transcripts.filter((t) => t.trim().length > 0);
    if (filledTranscripts.length === 0) {
      setError("Please paste at least one sermon transcript for voice training.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisStep("Claude is reading your sermons and learning your voice. This takes 20-30 seconds...");

    try {
      const response = await fetch("/api/analyze-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcripts: filledTranscripts,
          churchName,
          churchCode: churchCode.toLowerCase().trim(),
          denomination,
          tone,
          doctrinalStatement: scanResult?.doctrinalStatement || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      localStorage.setItem("steeple_church_code", data.churchCode);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ---- Styles ---- */
  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
    fontFamily: "var(--font-body)",
    fontSize: "14px",
    color: "var(--color-text)",
    background: "var(--color-surface)",
    boxSizing: "border-box",
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236B6560' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: "36px",
  };

  const labelStyle = {
    display: "block",
    fontFamily: "var(--font-display)",
    fontSize: "15px",
    fontWeight: 600,
    marginBottom: "8px",
  };

  // --- SUCCESS SCREEN ---
  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>✓</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>
            Your voice profile is ready
          </h1>
          <p style={{ fontSize: "16px", color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: "12px" }}>
            Steeple has learned your preaching style
            {scanResult?.doctrinalStatement ? " and your church's doctrinal positions" : ""}.
            All generated content will match your voice and theological framework.
          </p>

          <div style={{
            background: "var(--color-warm-light)",
            border: "1px solid #E8DFC0",
            borderRadius: "var(--radius)",
            padding: "20px",
            margin: "32px 0",
          }}>
            <p style={{ fontSize: "13px", color: "var(--color-warm)", fontWeight: 600, marginBottom: "8px" }}>
              YOUR CHURCH CODE
            </p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 700, margin: 0, letterSpacing: "0.02em" }}>
              {churchCode.toLowerCase().trim()}
            </p>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
              Save this code. You&apos;ll use it to access your profile each time.
            </p>
          </div>

          <a href="/" style={{
            display: "inline-block",
            padding: "14px 32px",
            borderRadius: "var(--radius)",
            background: "var(--color-accent)",
            color: "white",
            fontFamily: "var(--font-body)",
            fontSize: "15px",
            fontWeight: 600,
            textDecoration: "none",
          }}>
            Start Generating Content →
          </a>
        </div>
      </div>
    );
  }

  // --- MAIN SETUP FORM ---
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <nav style={{
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        padding: "14px 32px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: "var(--color-accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display)",
        }}>S</div>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700 }}>Steeple</span>
      </nav>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 700, marginBottom: "12px" }}>
            Set up your church
          </h1>
          <p style={{ fontSize: "16px", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Paste a few past sermon transcripts and Steeple will learn your preaching voice.
            Optionally add your website so we can learn your doctrinal positions too.
          </p>
        </div>

        <div style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--color-border)",
          padding: "32px",
          boxShadow: "var(--shadow-sm)",
        }}>
          {/* Church Name + Code */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Church Name</label>
              <input type="text" placeholder="Grace Community Church" value={churchName}
                onChange={(e) => setChurchName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Church Code</label>
              <input type="text" placeholder="grace-community" value={churchCode}
                onChange={(e) => setChurchCode(e.target.value.toLowerCase().replace(/\s/g, "-"))} style={inputStyle} />
              <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                A unique ID for your church. Use lowercase and hyphens.
              </p>
            </div>
          </div>

          {/* Denomination + Tone */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Tradition / Denomination</label>
              <select value={denomination} onChange={(e) => setDenomination(e.target.value)} style={selectStyle}>
                {DENOMINATIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Communication Style</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} style={selectStyle}>
                {TONES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
              </select>
            </div>
          </div>

          {/* Website URL — NEW */}
          <div style={{
            borderTop: "1px solid var(--color-border)",
            paddingTop: "24px",
            marginBottom: "24px",
          }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
              Church Website
              <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--color-text-secondary)", marginLeft: "8px" }}>
                (optional)
              </span>
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
              We&apos;ll scan your website for your &quot;What We Believe&quot; or doctrinal statement
              to ensure generated content aligns with your theology.
            </p>

            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <input
                type="text"
                placeholder="https://yourchurch.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleScanWebsite}
                disabled={isScanning || !websiteUrl.trim()}
                style={{
                  padding: "10px 20px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--color-border)",
                  background: isScanning ? "var(--color-surface-raised)" : "var(--color-surface)",
                  color: isScanning ? "var(--color-text-secondary)" : "var(--color-accent)",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: isScanning ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {isScanning ? "Scanning..." : "Scan Website"}
              </button>
            </div>

            {scanError && (
              <p style={{ fontSize: "13px", color: "var(--color-error)", marginBottom: "12px" }}>
                {scanError}
              </p>
            )}

            {scanResult && scanResult.doctrinalStatement && (
              <div style={{
                background: "var(--color-accent-light)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ color: "var(--color-accent)", fontWeight: 600, fontSize: "13px" }}>
                    ✓ Doctrinal statement found
                  </span>
                </div>
                <p style={{
                  fontSize: "13px", color: "var(--color-text-secondary)",
                  lineHeight: 1.6, maxHeight: "120px", overflowY: "auto",
                  margin: 0,
                }}>
                  {scanResult.doctrinalStatement.substring(0, 500)}
                  {scanResult.doctrinalStatement.length > 500 ? "..." : ""}
                </p>
              </div>
            )}

            {scanResult && !scanResult.doctrinalStatement && (
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                {scanResult.message || "No doctrinal statement found. You can still proceed."}
              </p>
            )}
          </div>

          {/* Voice Training Section */}
          <div style={{
            borderTop: "1px solid var(--color-border)",
            paddingTop: "24px",
            marginBottom: "24px",
          }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
              Voice Training
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "20px" }}>
              Paste 2-4 of your past sermon transcripts below. The more you provide,
              the better Steeple will match your voice.
            </p>
          </div>

          {/* Transcript inputs */}
          {transcripts.map((transcript, index) => (
            <div key={index} style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Sermon {index + 1}</label>
                {transcripts.length > 1 && (
                  <button onClick={() => removeTranscriptSlot(index)}
                    style={{ fontSize: "12px", color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer" }}>
                    Remove
                  </button>
                )}
              </div>
              <textarea
                placeholder={`Paste sermon transcript ${index + 1} here...`}
                value={transcript}
                onChange={(e) => updateTranscript(index, e.target.value)}
                rows={8}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
              {transcript.length > 0 && (
                <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                  {transcript.split(/\s+/).filter(Boolean).length} words
                </p>
              )}
            </div>
          ))}

          {transcripts.length < 4 && (
            <button onClick={addTranscriptSlot} style={{
              padding: "8px 16px", borderRadius: "var(--radius)",
              border: "1px dashed var(--color-border)", background: "transparent",
              color: "var(--color-text-secondary)", fontSize: "13px", cursor: "pointer",
              width: "100%", marginBottom: "28px", fontFamily: "var(--font-body)",
            }}>
              + Add Another Sermon Transcript ({transcripts.length}/4)
            </button>
          )}

          {error && (
            <div style={{
              padding: "12px 16px", background: "var(--color-error-light)",
              borderRadius: "var(--radius)", border: "1px solid #FECACA",
              color: "var(--color-error)", fontSize: "14px", marginBottom: "20px",
            }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={isAnalyzing} style={{
            width: "100%", padding: "14px 24px", borderRadius: "var(--radius)",
            border: "none",
            background: isAnalyzing ? "var(--color-text-secondary)" : "var(--color-accent)",
            color: "white", fontFamily: "var(--font-body)", fontSize: "15px",
            fontWeight: 600, cursor: isAnalyzing ? "not-allowed" : "pointer",
          }}>
            {isAnalyzing ? analysisStep : "Analyze & Save Voice Profile →"}
          </button>
        </div>
      </div>
    </div>
  );
}
