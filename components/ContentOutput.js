/* components/ContentOutput.js */
/*
  UPDATED: Now includes a "Refine" feature.
  
  After content is generated, the pastor can:
  1. Click "Refine" on any content piece
  2. Explain what they don't like and why
  3. Steeple regenerates that specific piece incorporating the feedback
  4. The critique is saved to Supabase so future generations avoid the same issues
  
  This is the learning loop that makes Steeple smarter over time.
*/

"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";
import { supabase } from "../lib/supabase";

const TAB_CONFIG = {
  blog: { label: "Blog Post", icon: "📝" },
  social: { label: "Social Media", icon: "📱" },
  discussion: { label: "Discussion Guide", icon: "💬" },
  email: { label: "Email Devotional", icon: "✉️" },
};

export default function ContentOutput({ content, onContentUpdate, churchCode, churchProfile }) {
  const availableTabs = Object.keys(content).filter(
    (key) => content[key] && content[key].trim().length > 0
  );

  const [activeTab, setActiveTab] = useState(availableTabs[0] || "blog");

  // Refine state
  const [isRefining, setIsRefining] = useState(false);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [critique, setCritique] = useState("");
  const [refineError, setRefineError] = useState(null);

  if (availableTabs.length === 0) return null;

  // Handle the refine/critique submission
  const handleRefine = async () => {
    if (!critique.trim()) return;

    setIsRefining(true);
    setRefineError(null);

    try {
      // Step 1: Send the critique to Claude to regenerate
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "refine",
          contentType: activeTab,
          originalContent: content[activeTab],
          critique: critique,
          denomination: churchProfile?.denomination || "Non-denominational",
          tone: churchProfile?.tone || "conversational",
          voiceProfile: churchProfile?.voice_profile || null,
          doctrinalStatement: churchProfile?.doctrinal_statement || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      // Step 2: Save the critique to Supabase for future reference
      if (churchCode) {
        await supabase.from("feedback").insert({
          church_code: churchCode,
          content_type: activeTab,
          original_content: content[activeTab].substring(0, 2000),
          critique: critique,
        });
      }

      // Step 3: Update the content in the parent
      if (onContentUpdate && data.content) {
        onContentUpdate(activeTab, data.content);
      }

      // Reset the refine UI
      setCritique("");
      setShowRefineInput(false);
    } catch (err) {
      console.error("Refine error:", err);
      setRefineError(err.message);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div
      className="fade-in-up"
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-md)",
        overflow: "hidden",
      }}
    >
      {/* Success header */}
      <div style={{
        background: "var(--color-accent-light)",
        borderBottom: "1px solid var(--color-border)",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>✓</span>
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-accent)",
          }}>
            Content Generated
          </span>
        </div>
        <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          {availableTabs.length} content types ready
        </span>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface-raised)",
        overflowX: "auto",
      }}>
        {availableTabs.map((tab) => {
          const config = TAB_CONFIG[tab] || { label: tab, icon: "📄" };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setShowRefineInput(false);
                setCritique("");
                setRefineError(null);
              }}
              style={{
                padding: "14px 24px",
                border: "none",
                borderBottom: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
                background: isActive ? "var(--color-surface)" : "transparent",
                color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>{config.icon}</span>
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div style={{ padding: "28px 32px" }}>
        {/* Action buttons row */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
          marginBottom: "16px",
        }}>
          <button
            onClick={() => {
              setShowRefineInput(!showRefineInput);
              setRefineError(null);
            }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: "6px",
              border: `1px solid ${showRefineInput ? "var(--color-accent)" : "var(--color-border)"}`,
              background: showRefineInput ? "var(--color-accent-light)" : "var(--color-surface)",
              color: showRefineInput ? "var(--color-accent)" : "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            ✏️ Refine
          </button>
          <CopyButton text={content[activeTab]} />
        </div>

        {/* Refine input area */}
        {showRefineInput && (
          <div style={{
            background: "var(--color-warm-light)",
            border: "1px solid #E8DFC0",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "16px",
          }}>
            <label style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "8px",
              color: "var(--color-text)",
            }}>
              What would you like to change?
            </label>
            <p style={{
              fontSize: "13px",
              color: "var(--color-text-secondary)",
              marginBottom: "12px",
              lineHeight: 1.5,
            }}>
              Explain what doesn&apos;t sound right and why. Be specific about theological
              concerns — Steeple will learn from your feedback and avoid similar issues in the future.
            </p>
            <textarea
              placeholder={'Example: "The phrase about condemnation vs conviction isn\'t theologically accurate for our tradition. We believe condemnation is the result of unrepentant sin, not an identity statement..."'}
              value={critique}
              onChange={(e) => setCritique(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                color: "var(--color-text)",
                background: "var(--color-surface)",
                boxSizing: "border-box",
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />

            {refineError && (
              <p style={{ fontSize: "13px", color: "var(--color-error)", marginTop: "8px" }}>
                {refineError}
              </p>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button
                onClick={handleRefine}
                disabled={isRefining || !critique.trim()}
                style={{
                  padding: "10px 20px",
                  borderRadius: "var(--radius)",
                  border: "none",
                  background: isRefining ? "var(--color-text-secondary)" : "var(--color-accent)",
                  color: "white",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: isRefining ? "not-allowed" : "pointer",
                }}
              >
                {isRefining ? "Refining..." : "Refine This Content →"}
              </button>
              <button
                onClick={() => { setShowRefineInput(false); setCritique(""); setRefineError(null); }}
                style={{
                  padding: "10px 20px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* The generated content */}
        <div style={{
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          lineHeight: 1.8,
          color: "var(--color-text)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: "600px",
          overflowY: "auto",
          padding: "20px 24px",
          background: "var(--color-surface-raised)",
          borderRadius: "8px",
          border: "1px solid var(--color-border)",
        }}>
          {content[activeTab]}
        </div>
      </div>
    </div>
  );
}