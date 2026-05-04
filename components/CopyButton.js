/* components/CopyButton.js */
/*
  A small reusable button that copies text to the clipboard.
  Shows "Copy" by default, then briefly switches to "Copied!" 
  so the user knows it worked.
*/

"use client"; // This tells Next.js this component runs in the browser

import { useState } from "react";

export default function CopyButton({ text }) {
  // Track whether we just copied (to show the "Copied!" feedback)
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // This is the browser API for copying to clipboard
      await navigator.clipboard.writeText(text);
      setCopied(true);
      // Reset back to "Copy" after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "13px",
        fontWeight: 600,
        padding: "6px 14px",
        borderRadius: "6px",
        border: "1px solid var(--color-border)",
        background: copied ? "var(--color-accent)" : "var(--color-surface)",
        color: copied ? "white" : "var(--color-text-secondary)",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {copied ? "✓ Copied!" : "Copy"}
    </button>
  );
}
