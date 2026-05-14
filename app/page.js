/* app/page.js */
/*
  UPDATED: Now includes a "church code" flow.
  
  When a pastor arrives:
  1. If they have a saved church code (localStorage), auto-load their profile
  2. If not, show a "Connect Your Church" screen where they enter their code
  3. Once connected, show the main content generation form
  4. The form now passes voice profile data to the API
  
  Also includes a link to /setup for new churches.
*/

"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import SermonInput from "../components/SermonInput";
import ContentOutput from "../components/ContentOutput";

export default function Home() {
  // Church profile state
  const [churchCode, setChurchCode] = useState("");
  const [churchProfile, setChurchProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(null);

  // Content generation state
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  // On page load, check if there's a saved church code
  useEffect(() => {
    const savedCode = localStorage.getItem("steeple_church_code");
    if (savedCode) {
      loadChurchProfile(savedCode);
    } else {
      setIsLoadingProfile(false);
    }
  }, []);

  // Load a church profile from Supabase by code
  const loadChurchProfile = async (code) => {
    setIsLoadingProfile(true);
    setCodeError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("churches")
        .select("*")
        .eq("church_code", code.toLowerCase().trim())
        .single();

      if (dbError || !data) {
        setCodeError("Church code not found. Check the code and try again.");
        setIsLoadingProfile(false);
        localStorage.removeItem("steeple_church_code");
        return;
      }

      setChurchProfile(data);
      setChurchCode(data.church_code);
      localStorage.setItem("steeple_church_code", data.church_code);
    } catch (err) {
      console.error("Error loading profile:", err);
      setCodeError("Something went wrong loading your profile.");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Handle code submission
  const handleCodeSubmit = () => {
    if (!codeInput.trim()) {
      setCodeError("Please enter your church code.");
      return;
    }
    loadChurchProfile(codeInput);
  };

  // Disconnect and go back to code entry
  const handleDisconnect = () => {
    localStorage.removeItem("steeple_church_code");
    setChurchProfile(null);
    setChurchCode("");
    setContent(null);
    setCodeInput("");
  };

  // Handle content generation
  const handleGenerate = async (formData) => {
    setIsLoading(true);
    setError(null);
    setContent(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          voiceProfile: churchProfile?.voice_profile || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setContent(data.content);

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

  // --- LOADING STATE ---
  if (isLoadingProfile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          className="loading-pulse"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-text-secondary)",
            fontSize: "15px",
          }}
        >
          Loading your profile...
        </p>
      </div>
    );
  }

  // --- CHURCH CODE ENTRY (not yet connected) ---
  if (!churchProfile) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
        {/* Nav */}
        <nav
          style={{
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            padding: "14px 32px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
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
            }}
          >
            Steeple
          </span>
        </nav>

        {/* Code entry form */}
        <div
          style={{
            maxWidth: "440px",
            margin: "0 auto",
            padding: "100px 24px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "28px",
              fontWeight: 700,
              marginBottom: "12px",
            }}
          >
            Connect Your Church
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
              marginBottom: "32px",
            }}
          >
            Enter your church code to load your voice profile and start
            generating content.
          </p>

          <div style={{ marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="your-church-code"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toLowerCase().replace(/\s/g, "-"));
                setCodeError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCodeSubmit();
              }}
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: "var(--radius)",
                border: `1px solid ${codeError ? "var(--color-error)" : "var(--color-border)"}`,
                fontFamily: "var(--font-body)",
                fontSize: "16px",
                textAlign: "center",
                boxSizing: "border-box",
                letterSpacing: "0.02em",
              }}
            />
          </div>

          {codeError && (
            <p
              style={{
                color: "var(--color-error)",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              {codeError}
            </p>
          )}

          <button
            onClick={handleCodeSubmit}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "var(--radius)",
              border: "none",
              background: "var(--color-accent)",
              color: "white",
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "24px",
            }}
          >
            Connect →
          </button>

          <div
            style={{
              borderTop: "1px solid var(--color-border)",
              paddingTop: "24px",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                marginBottom: "12px",
              }}
            >
              New to Steeple?
            </p>
            <a
              href="/setup"
              style={{
                color: "var(--color-accent)",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Set up your church →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP (connected with profile) ---
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* Nav bar */}
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
            }}
          >
            Steeple
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              fontSize: "13px",
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-body)",
            }}
          >
            {churchProfile.church_name}
          </span>
          {churchProfile.voice_profile && (
            <span
              style={{
                fontSize: "11px",
                background: "var(--color-accent-light)",
                color: "var(--color-accent)",
                padding: "3px 10px",
                borderRadius: "20px",
                fontWeight: 600,
                fontFamily: "var(--font-body)",
              }}
            >
              Voice Trained
            </span>
          )}
          <button
            onClick={handleDisconnect}
            style={{
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              textDecoration: "underline",
            }}
          >
            Disconnect
          </button>
        </div>
      </nav>

      {/* Hero */}
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
          {churchProfile.voice_profile
            ? "Your voice profile is loaded. Generate content from a transcript or just an outline."
            : "Paste your sermon transcript and get a blog post, social media posts, and a small group discussion guide."}
        </p>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: "780px", margin: "0 auto", padding: "0 24px 80px" }}>
        <SermonInput
          onGenerate={handleGenerate}
          isLoading={isLoading}
          hasVoiceProfile={!!churchProfile.voice_profile}
          churchProfile={churchProfile}
        />

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
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>✍️</div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: 600,
                margin: "0 0 8px",
              }}
            >
              Generating your content...
            </p>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
              This takes 15-30 seconds. Crafting each piece to match your voice.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px 20px",
              background: "var(--color-error-light)",
              borderRadius: "var(--radius)",
              border: "1px solid #FECACA",
              color: "var(--color-error)",
              fontSize: "14px",
            }}
          >
            <strong>Something went wrong:</strong> {error}
          </div>
        )}

        {/* Results */}
        {content && (
          <div id="results" style={{ marginTop: "32px" }}>
            <ContentOutput content={content} />
            <div style={{ textAlign: "center", marginTop: "24px" }}>
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
                ← Start Over
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