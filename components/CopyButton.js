/* components/CopyButton.js */
/*
  UPDATED: Now copies rich text (HTML) to clipboard so that
  when pastors paste into Gmail, Google Docs, Word, etc.,
  the formatting (bold, italic, headings) is preserved.
  
  Falls back to plain text if rich copy isn't supported.
*/

"use client";

import { useState, useCallback } from "react";

// Simple markdown to HTML converter for clipboard
function markdownToHtml(markdown) {
  let html = markdown
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold and italic combined
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Horizontal rules (social media dividers)
    .replace(/^---$/gm, "<hr>")
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return "<p>" + html + "</p>";
}

// Strip markdown for clean plain text fallback
function stripMarkdown(markdown) {
  return markdown
    .replace(/^###\s/gm, "")
    .replace(/^##\s/gm, "")
    .replace(/^#\s/gm, "")
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1");
}

export default function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      // Try to copy as rich text (HTML) for formatted pasting
      const html = markdownToHtml(text);
      const plain = stripMarkdown(text);

      if (navigator.clipboard && ClipboardItem) {
        const clipboardItem = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        // Fallback: copy plain text without markdown symbols
        await navigator.clipboard.writeText(plain);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Last resort fallback
      try {
        await navigator.clipboard.writeText(stripMarkdown(text));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error("Failed to copy:", e);
      }
    }
  }, [text]);

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