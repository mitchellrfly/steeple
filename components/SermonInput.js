/* components/SermonInput.js */
/*
  This is the main input form where the pastor:
  1. Pastes their sermon transcript
  2. Selects their denomination/theological tradition
  3. Picks their communication tone
  4. Enters the sermon title and scripture reference
  5. Hits "Generate Content"
  
  When submitted, it calls the parent's onGenerate function 
  with all the form data.
*/

"use client";

import { useState } from "react";

// These are the denomination options. This list matters a LOT — 
// it signals to pastors that you understand their world.
// We'll use these to shape the AI's theological framing.
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

// Communication tone — how the pastor sounds naturally
const TONES = [
  { value: "conversational", label: "Conversational & warm", desc: "Like talking to a friend" },
  { value: "academic", label: "Thoughtful & scholarly", desc: "Exegetical depth, careful language" },
  { value: "passionate", label: "Passionate & urgent", desc: "Bold, direct, calls to action" },
  { value: "pastoral", label: "Gentle & pastoral", desc: "Empathetic, encouraging, nurturing" },
  { value: "storytelling", label: "Story-driven", desc: "Narrative-heavy, illustrative" },
];

// What content to generate
const CONTENT_TYPES = [
  { value: "blog", label: "Blog Post" },
  { value: "social", label: "Social Media Posts" },
  { value: "discussion", label: "Small Group Guide" },
  { value: "email", label: "Email Devotional" },
];

export default function SermonInput({ onGenerate, isLoading }) {
  // Form state — each piece of data the pastor provides
  const [sermonText, setSermonText] = useState("");
  const [sermonTitle, setSermonTitle] = useState("");
  const [scriptureRef, setScriptureRef] = useState("");
  const [denomination, setDenomination] = useState("Non-denominational");
  const [tone, setTone] = useState("conversational");
  const [selectedTypes, setSelectedTypes] = useState(["blog", "social", "discussion"]);

  // Toggle a content type on/off
  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)  // Remove if already selected
        : [...prev, type]                  // Add if not selected
    );
  };

  // Handle form submission
  const handleSubmit = () => {
    // Basic validation
    if (!sermonText.trim()) {
      alert("Please paste your sermon transcript.");
      return;
    }
    if (selectedTypes.length === 0) {
      alert("Please select at least one content type to generate.");
      return;
    }

    // Send all the data up to the parent component
    onGenerate({
      sermonText,
      sermonTitle,
      scriptureRef,
      denomination,
      tone,
      contentTypes: selectedTypes,
    });
  };

  /* ---------- Inline styles ---------- */
  // Using inline styles so everything is in one file.
  // In production you'd move these to Tailwind classes or a CSS module.

  const sectionStyle = {
    marginBottom: "28px",
  };

  const labelStyle = {
    display: "block",
    fontFamily: "var(--font-display)",
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--color-text)",
    marginBottom: "8px",
  };

  const sublabelStyle = {
    fontSize: "13px",
    fontWeight: 400,
    color: "var(--color-text-secondary)",
    fontFamily: "var(--font-body)",
    marginLeft: "4px",
  };

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
    transition: "border-color 0.2s, box-shadow 0.2s",
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

  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--color-border)",
        padding: "32px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--color-text)",
            margin: 0,
          }}
        >
          Your Sermon
        </h2>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            marginTop: "6px",
          }}
        >
          Paste your transcript and tell us about your style. We&apos;ll generate
          content that sounds like you.
        </p>
      </div>

      {/* Sermon title + Scripture row */}
      <div style={{ display: "flex", gap: "16px", ...sectionStyle }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>
            Sermon Title
            <span style={sublabelStyle}>(optional)</span>
          </label>
          <input
            type="text"
            placeholder='e.g. "Finding Rest in a Restless World"'
            value={sermonTitle}
            onChange={(e) => setSermonTitle(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>
            Scripture
            <span style={sublabelStyle}>(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Matthew 11:28-30"
            value={scriptureRef}
            onChange={(e) => setScriptureRef(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Sermon transcript textarea */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Sermon Transcript</label>
        <textarea
          placeholder="Paste your full sermon transcript here..."
          value={sermonText}
          onChange={(e) => setSermonText(e.target.value)}
          rows={12}
          style={{
            ...inputStyle,
            resize: "vertical",
            lineHeight: 1.6,
          }}
        />
        <p
          style={{
            fontSize: "12px",
            color: "var(--color-text-secondary)",
            marginTop: "6px",
          }}
        >
          {sermonText.length > 0
            ? `${sermonText.split(/\s+/).filter(Boolean).length} words`
            : "Tip: Most sermons are 3,000–5,000 words"}
        </p>
      </div>

      {/* Denomination + Tone row */}
      <div style={{ display: "flex", gap: "16px", ...sectionStyle }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Tradition / Denomination</label>
          <select
            value={denomination}
            onChange={(e) => setDenomination(e.target.value)}
            style={selectStyle}
          >
            {DENOMINATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Your Communication Style</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            style={selectStyle}
          >
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} — {t.desc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content type checkboxes */}
      <div style={sectionStyle}>
        <label style={labelStyle}>What should we generate?</label>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {CONTENT_TYPES.map((ct) => {
            const isSelected = selectedTypes.includes(ct.value);
            return (
              <button
                key={ct.value}
                onClick={() => toggleType(ct.value)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "20px",
                  border: `1.5px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: isSelected ? "var(--color-accent-light)" : "var(--color-surface)",
                  color: isSelected ? "var(--color-accent)" : "var(--color-text-secondary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  fontWeight: isSelected ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {isSelected ? "✓ " : ""}
                {ct.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "14px 24px",
          borderRadius: "var(--radius)",
          border: "none",
          background: isLoading ? "var(--color-text-secondary)" : "var(--color-accent)",
          color: "white",
          fontFamily: "var(--font-body)",
          fontSize: "15px",
          fontWeight: 600,
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "background 0.2s ease",
          letterSpacing: "0.01em",
        }}
        onMouseEnter={(e) => {
          if (!isLoading) e.target.style.background = "var(--color-accent-hover)";
        }}
        onMouseLeave={(e) => {
          if (!isLoading) e.target.style.background = "var(--color-accent)";
        }}
      >
        {isLoading ? "Generating your content…" : "Generate Content →"}
      </button>
    </div>
  );
}
