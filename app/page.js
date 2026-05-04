/* app/page.js */
/*
  This is the main (and only) page of your MVP.
  It manages the app state and coordinates between
  the input form and the output display.
  
  The flow:
  1. Pastor fills out the form (SermonInput)
  2. Form data gets sent to /api/generate
  3. Loading state shows while Claude works
  4. Results appear in ContentOutput
*/
 
"use client";
 
import { useState } from "react";
import SermonInput from "../components/SermonInput";
import ContentOutput from "../components/ContentOutput";
 
export default function Home() {
  // App state
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState(null);  // null = no results yet
  const [error, setError] = useState(null);
 
  /*
    This function runs when the pastor clicks "Generate Content".
    It sends the form data to our API route and handles the response.
  */
  const handleGenerate = async (formData) => {
    setIsLoading(true);
    setError(null);
    setContent(null);
 
    try {
      // Send the sermon data to our API endpoint
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
 
      const data = await response.json();
 
      // Check if the API returned an error
      if (!response.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
 
      // Success! Store the generated content
      setContent(data.content);
 
      // Smooth scroll down to the results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    } catch (err) {
      console.error("Generation failed:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
 
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
      }}
    >
      {/* Top navigation bar */}
      <nav
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Logo/brand mark */}
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "16px",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
            }}
          >
            S
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
            }}
          >
            Steeple
          </span>
        </div>
        <span
          style={{
            fontSize: "12px",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-body)",
            background: "var(--color-warm-light)",
            color: "var(--color-warm)",
            padding: "4px 12px",
            borderRadius: "20px",
            fontWeight: 600,
          }}
        >
          MVP Preview
        </span>
      </nav>
 
      {/* Hero section */}
      <header
        style={{
          textAlign: "center",
          padding: "56px 24px 40px",
          maxWidth: "640px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "36px",
            fontWeight: 700,
            color: "var(--color-text)",
            lineHeight: 1.2,
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
          }}
        >
          One sermon.
          <br />
          A week of content.
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "17px",
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Paste your sermon transcript and get a blog post, social media posts,
          and a small group discussion guide — all in your voice and
          theological tradition.
        </p>
      </header>
 
      {/* Main content area */}
      <main
        style={{
          maxWidth: "780px",
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        {/* The input form */}
        <SermonInput onGenerate={handleGenerate} isLoading={isLoading} />
 
        {/* Loading state */}
        {isLoading && (
          <div
            className="loading-pulse"
            style={{
              textAlign: "center",
              padding: "48px 24px",
              marginTop: "32px",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              style={{
                fontSize: "32px",
                marginBottom: "16px",
              }}
            >
              ✍️
            </div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--color-text)",
                margin: "0 0 8px",
              }}
            >
              Generating your content…
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
                margin: 0,
              }}
            >
              This takes 15-30 seconds. We&apos;re crafting each piece to match
              your voice and tradition.
            </p>
          </div>
        )}
 
        {/* Error state */}
        {error && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px 20px",
              background: "var(--color-error-light)",
              borderRadius: "var(--radius)",
              border: "1px solid #FECACA",
              color: "var(--color-error)",
              fontFamily: "var(--font-body)",
              fontSize: "14px",
            }}
          >
            <strong>Something went wrong:</strong> {error}
          </div>
        )}
 
        {/* Results section */}
        {content && (
          <div id="results" style={{ marginTop: "32px" }}>
            <ContentOutput content={content} />
 
            {/* Reset / generate again */}
            <div
              style={{
                textAlign: "center",
                marginTop: "24px",
              }}
            >
              <button
                onClick={() => {
                  setContent(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                style={{
                  padding: "10px 24px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                ← Start Over with New Sermon
              </button>
            </div>
          </div>
        )}
      </main>
 
      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: "20px 32px",
          textAlign: "center",
          fontSize: "12px",
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-body)",
        }}
      >
        Steeple — Built for pastors who have more to say.
      </footer>
    </div>
  );
}
