/* components/SermonInput.js */
/*
  UPDATED: Now supports two input modes:
  1. Transcript Mode (original) — paste a full sermon transcript
  2. Outline Mode (new) — enter just a title, scriptures, main points,
     and key illustrations. Steeple uses the voice profile to generate
     content as if the pastor had preached a full sermon.
  
  The mode toggle only appears if the pastor has a voice profile
  (passed in via the hasVoiceProfile prop).
*/

"use client";

import { useState } from "react";

const CONTENT_TYPES = [
  { value: "blog", label: "Blog Post" },
  { value: "social", label: "Social Media Posts" },
  { value: "discussion", label: "Small Group Guide" },
  { value: "email", label: "Email Devotional" },
];

export default function SermonInput({ onGenerate, isLoading, hasVoiceProfile, churchProfile }) {
  // Input mode: "transcript" or "outline"
  const [mode, setMode] = useState(hasVoiceProfile ? "outline" : "transcript");

  // Shared fields
  const [sermonTitle, setSermonTitle] = useState("");
  const [scriptureRef, setScriptureRef] = useState("");
  const [selectedTypes, setSelectedTypes] = useState(["blog", "social", "discussion"]);

  // Transcript mode fields
  const [sermonText, setSermonText] = useState("");

  // Outline mode fields
  const [mainPoints, setMainPoints] = useState(["", "", ""]);
  const [keyIllustration, setKeyIllustration] = useState("");
  const [applicationPoint, setApplicationPoint] = useState("");

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const updatePoint = (index, value) => {
    const updated = [...mainPoints];
    updated[index] = value;
    setMainPoints(updated);
  };

  const addPoint = () => {
    if (mainPoints.length < 5) setMainPoints([...mainPoints, ""]);
  };

  const removePoint = (index) => {
    if (mainPoints.length > 1) setMainPoints(mainPoints.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (mode === "transcript") {
      if (!sermonText.trim()) {
        alert("Please paste your sermon transcript.");
        return;
      }
    } else {
      if (!sermonTitle.trim()) {
        alert("Please enter a sermon title.");
        return;
      }
      const filledPoints = mainPoints.filter((p) => p.trim());
      if (filledPoints.length === 0) {
        alert("Please enter at least one main point.");
        return;
      }
    }

    if (selectedTypes.length === 0) {
      alert("Please select at least one content type.");
      return;
    }

    onGenerate({
      mode,
      sermonText: mode === "transcript" ? sermonText : null,
      sermonTitle,
      scriptureRef,
      mainPoints: mode === "outline" ? mainPoints.filter((p) => p.trim()) : null,
      keyIllustration: mode === "outline" ? keyIllustration : null,
      applicationPoint: mode === "outline" ? applicationPoint : null,
      denomination: churchProfile?.denomination || "Non-denominational",
      tone: churchProfile?.tone || "conversational",
      contentTypes: selectedTypes,
    });
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
    transition: "border-color 0.2s, box-shadow 0.2s",
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
      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 700,
            margin: "0 0 6px",
          }}
        >
          {mode === "outline" ? "Your Sermon Outline" : "Your Sermon"}
        </h2>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: 0 }}>
          {mode === "outline"
            ? "Enter your main points and Steeple will generate content in your trained voice."
            : "Paste your transcript and we&apos;ll generate content that sounds like you."}
        </p>
      </div>

      {/* Mode toggle — only shows if they have a voice profile */}
      {hasVoiceProfile && (
        <div
          style={{
            display: "flex",
            background: "var(--color-surface-raised)",
            borderRadius: "8px",
            padding: "4px",
            marginBottom: "28px",
            border: "1px solid var(--color-border)",
          }}
        >
          {[
            { key: "outline", label: "From Outline" },
            { key: "transcript", label: "From Transcript" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "none",
                background: mode === m.key ? "var(--color-surface)" : "transparent",
                boxShadow: mode === m.key ? "var(--shadow-sm)" : "none",
                color: mode === m.key ? "var(--color-accent)" : "var(--color-text-secondary)",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                fontWeight: mode === m.key ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Sermon title + Scripture — shared across both modes */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>
            Sermon Title
            {mode === "transcript" && <span style={sublabelStyle}>(optional)</span>}
          </label>
          <input
            type="text"
            placeholder={'"Finding Rest in a Restless World"'}
            value={sermonTitle}
            onChange={(e) => setSermonTitle(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Scripture</label>
          <input
            type="text"
            placeholder="Matthew 11:28-30"
            value={scriptureRef}
            onChange={(e) => setScriptureRef(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* === TRANSCRIPT MODE === */}
      {mode === "transcript" && (
        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>Sermon Transcript</label>
          <textarea
            placeholder="Paste your full sermon transcript here..."
            value={sermonText}
            onChange={(e) => setSermonText(e.target.value)}
            rows={12}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "6px" }}>
            {sermonText.length > 0
              ? `${sermonText.split(/\s+/).filter(Boolean).length} words`
              : "Tip: Most sermons are 3,000-5,000 words"}
          </p>
        </div>
      )}

      {/* === OUTLINE MODE === */}
      {mode === "outline" && (
        <>
          {/* Main Points */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Main Points</label>
            {mainPoints.map((point, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "start",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--color-accent)",
                    minWidth: "20px",
                    paddingTop: "10px",
                  }}
                >
                  {index + 1}.
                </span>
                <textarea
                  placeholder={`Main point ${index + 1} — include any sub-points or key thoughts`}
                  value={point}
                  onChange={(e) => updatePoint(index, e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, flex: 1, resize: "vertical", lineHeight: 1.6 }}
                />
                {mainPoints.length > 1 && (
                  <button
                    onClick={() => removePoint(index)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-text-secondary)",
                      cursor: "pointer",
                      fontSize: "18px",
                      paddingTop: "8px",
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {mainPoints.length < 5 && (
              <button
                onClick={addPoint}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px dashed var(--color-border)",
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                + Add Point
              </button>
            )}
          </div>

          {/* Key Illustration */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>
              Key Illustration or Story
              <span style={sublabelStyle}>(optional)</span>
            </label>
            <textarea
              placeholder="Describe the main illustration, analogy, or personal story you plan to use..."
              value={keyIllustration}
              onChange={(e) => setKeyIllustration(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {/* Application */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>
              Application / Call to Action
              <span style={sublabelStyle}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="What should people do differently this week?"
              value={applicationPoint}
              onChange={(e) => setApplicationPoint(e.target.value)}
              style={inputStyle}
            />
          </div>
        </>
      )}

      {/* Content type pills */}
      <div style={{ marginBottom: "28px" }}>
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
        }}
        onMouseEnter={(e) => {
          if (!isLoading) e.target.style.background = "var(--color-accent-hover)";
        }}
        onMouseLeave={(e) => {
          if (!isLoading) e.target.style.background = "var(--color-accent)";
        }}
      >
        {isLoading ? "Generating your content..." : "Generate Content →"}
      </button>
    </div>
  );
}