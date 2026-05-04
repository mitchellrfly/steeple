/* components/ContentOutput.js */
/*
  This component displays the AI-generated content in a tabbed interface.
  Each tab shows a different content type (blog post, social media, etc.)
  with a copy button for each section.
  
  Props:
  - content: an object like { blog: "...", social: "...", discussion: "..." }
*/

"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";

// Map the content type keys to human-readable labels and icons
const TAB_CONFIG = {
  blog: { label: "Blog Post", icon: "📝" },
  social: { label: "Social Media", icon: "📱" },
  discussion: { label: "Discussion Guide", icon: "💬" },
  email: { label: "Email Devotional", icon: "✉️" },
};

export default function ContentOutput({ content }) {
  // Get the list of content types that were actually generated
  const availableTabs = Object.keys(content).filter(
    (key) => content[key] && content[key].trim().length > 0
  );

  // Track which tab is currently active
  const [activeTab, setActiveTab] = useState(availableTabs[0] || "blog");

  if (availableTabs.length === 0) {
    return null; // Nothing to show
  }

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
      <div
        style={{
          background: "var(--color-accent-light)",
          borderBottom: "1px solid var(--color-border)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>✓</span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--color-accent)",
            }}
          >
            Content Generated
          </span>
        </div>
        <span
          style={{
            fontSize: "13px",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          {availableTabs.length} content types ready
        </span>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface-raised)",
          overflowX: "auto",
        }}
      >
        {availableTabs.map((tab) => {
          const config = TAB_CONFIG[tab] || { label: tab, icon: "📄" };
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "14px 24px",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--color-accent)"
                  : "2px solid transparent",
                background: isActive ? "var(--color-surface)" : "transparent",
                color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
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
        {/* Copy button row */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "16px",
          }}
        >
          <CopyButton text={content[activeTab]} />
        </div>

        {/* The actual generated content */}
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            lineHeight: 1.8,
            color: "var(--color-text)",
            whiteSpace: "pre-wrap",       // Preserves line breaks from the AI output
            wordBreak: "break-word",
            maxHeight: "600px",
            overflowY: "auto",
            padding: "20px 24px",
            background: "var(--color-surface-raised)",
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
          }}
        >
          {content[activeTab]}
        </div>
      </div>
    </div>
  );
}
