/* components/ContentOutput.js */
/*
  UPDATED: Now renders markdown as formatted text.
  - ** becomes bold
  - * becomes italic
  - ## becomes headings
  - --- becomes visual dividers between social media posts
  - Lists render as actual lists
  
  Uses react-markdown for reliable parsing.
*/

"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import CopyButton from "./CopyButton";
import { supabase } from "../lib/supabase";

const TAB_CONFIG = {
  blog: { label: "Blog Post", icon: "📝" },
  social: { label: "Social Media", icon: "📱" },
  discussion: { label: "Discussion Guide", icon: "💬" },
  email: { label: "Email Devotional", icon: "✉️" },
};

/* 
  Custom styles for rendered markdown content.
  These make the output look polished and professional.
*/
const markdownStyles = {
  container: {
    fontFamily: "var(--font-body)",
    fontSize: "14px",
    lineHeight: 1.8,
    color: "var(--color-text)",
    maxHeight: "600px",
    overflowY: "auto",
    padding: "24px 28px",
    background: "var(--color-surface-raised)",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
  },
};

/* Custom components for react-markdown to style each element */
function getMarkdownComponents(activeTab) {
  return {
  h1: ({ children }) => (
    <h1 style={{
      fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700,
      color: "var(--color-text)", margin: "24px 0 12px", lineHeight: 1.3,
    }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 style={{
      fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700,
      color: "var(--color-text)", margin: "24px 0 10px", lineHeight: 1.3,
      borderBottom: "1px solid var(--color-border)", paddingBottom: "8px",
    }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={{
      fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700,
      color: "var(--color-text)", margin: "20px 0 8px", lineHeight: 1.3,
    }}>{children}</h3>
  ),
  p: ({ children }) => (
    <p style={{ margin: "0 0 14px", lineHeight: 1.8 }}>{children}</p>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 700, color: "var(--color-text)" }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ fontStyle: "italic", color: "var(--color-text)" }}>{children}</em>
  ),
  hr: () => (
    <div style={{
      borderTop: "2px solid var(--color-accent-light)",
      margin: "24px 0",
      position: "relative",
    }}>
      {activeTab === "social" && (
        <div style={{
          position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)",
          background: "var(--color-surface-raised)", padding: "0 12px",
          fontSize: "11px", color: "var(--color-text-secondary)", fontWeight: 600,
          letterSpacing: "0.05em", textTransform: "uppercase",
        }}>
          Next Post
        </div>
      )}
    </div>
  ),
  ul: ({ children }) => (
    <ul style={{
      margin: "8px 0 16px", paddingLeft: "24px",
      listStyleType: "disc",
    }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{
      margin: "8px 0 16px", paddingLeft: "24px",
      listStyleType: "decimal",
    }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ margin: "4px 0", lineHeight: 1.7 }}>{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: "3px solid var(--color-accent)",
      margin: "16px 0",
      paddingLeft: "16px",
      color: "var(--color-text-secondary)",
      fontStyle: "italic",
    }}>{children}</blockquote>
  ),
  };
}

export default function ContentOutput({ content, onContentUpdate, churchCode, churchProfile }) {
  const availableTabs = Object.keys(content).filter(
    (key) => content[key] && content[key].trim().length > 0
  );

  const [activeTab, setActiveTab] = useState(availableTabs[0] || "blog");
  const [isRefining, setIsRefining] = useState(false);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [critique, setCritique] = useState("");
  const [refineError, setRefineError] = useState(null);

  if (availableTabs.length === 0) return null;

  const handleRefine = async () => {
    if (!critique.trim()) return;
    setIsRefining(true);
    setRefineError(null);

    try {
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
      if (!response.ok) throw new Error(data.error || "Something went wrong.");

      if (churchCode) {
        await supabase.from("feedback").insert({
          church_code: churchCode,
          content_type: activeTab,
          original_content: content[activeTab].substring(0, 2000),
          critique: critique,
        });
      }

      if (onContentUpdate && data.content) {
        onContentUpdate(activeTab, data.content);
      }

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
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>✓</span>
          <span style={{
            fontFamily: "var(--font-display)", fontSize: "16px",
            fontWeight: 600, color: "var(--color-accent)",
          }}>Content Generated</span>
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
                padding: "14px 24px", border: "none",
                borderBottom: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
                background: isActive ? "var(--color-surface)" : "transparent",
                color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                fontFamily: "var(--font-body)", fontSize: "13px",
                fontWeight: isActive ? 600 : 500, cursor: "pointer",
                whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px",
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
        {/* Action buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "16px" }}>
          <button
            onClick={() => { setShowRefineInput(!showRefineInput); setRefineError(null); }}
            style={{
              fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600,
              padding: "6px 14px", borderRadius: "6px",
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

        {/* Refine input */}
        {showRefineInput && (
          <div style={{
            background: "var(--color-warm-light)", border: "1px solid #E8DFC0",
            borderRadius: "8px", padding: "20px", marginBottom: "16px",
          }}>
            <label style={{
              display: "block", fontFamily: "var(--font-display)",
              fontSize: "14px", fontWeight: 600, marginBottom: "8px",
            }}>
              What would you like to change?
            </label>
            <p style={{
              fontSize: "13px", color: "var(--color-text-secondary)",
              marginBottom: "12px", lineHeight: 1.5,
            }}>
              Explain what doesn&apos;t sound right and why. Steeple will learn from
              your feedback and avoid similar issues in the future.
            </p>
            <textarea
              placeholder={"Example: \"The phrase about condemnation vs conviction isn't theologically accurate for our tradition...\""}
              value={critique}
              onChange={(e) => setCritique(e.target.value)}
              rows={4}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)", fontFamily: "var(--font-body)",
                fontSize: "14px", color: "var(--color-text)", background: "var(--color-surface)",
                boxSizing: "border-box", resize: "vertical", lineHeight: 1.6,
              }}
            />
            {refineError && (
              <p style={{ fontSize: "13px", color: "var(--color-error)", marginTop: "8px" }}>{refineError}</p>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button onClick={handleRefine} disabled={isRefining || !critique.trim()} style={{
                padding: "10px 20px", borderRadius: "var(--radius)", border: "none",
                background: isRefining ? "var(--color-text-secondary)" : "var(--color-accent)",
                color: "white", fontFamily: "var(--font-body)", fontSize: "13px",
                fontWeight: 600, cursor: isRefining ? "not-allowed" : "pointer",
              }}>
                {isRefining ? "Refining..." : "Refine This Content →"}
              </button>
              <button onClick={() => { setShowRefineInput(false); setCritique(""); setRefineError(null); }} style={{
                padding: "10px 20px", borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)", background: "var(--color-surface)",
                color: "var(--color-text-secondary)", fontSize: "13px", cursor: "pointer",
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rendered markdown content */}
        <div style={markdownStyles.container}>
          <ReactMarkdown components={getMarkdownComponents(activeTab)}>
            {content[activeTab]}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}