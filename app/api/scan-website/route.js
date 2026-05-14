/* app/api/scan-website/route.js */
/*
  This endpoint receives a church website URL, fetches the page,
  and uses Claude to find and extract the doctrinal statement /
  "What We Believe" content.
  
  Flow:
  1. Fetch the homepage HTML
  2. Send it to Claude to find the beliefs/doctrine page link
  3. Fetch that page
  4. Send it to Claude to extract a structured doctrinal summary
  5. Return the summary to be stored in Supabase
*/

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { websiteUrl } = body;

    if (!websiteUrl || !websiteUrl.trim()) {
      return Response.json(
        { error: "Website URL is required." },
        { status: 400 }
      );
    }

    // Clean up the URL
    let url = websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Step 1: Fetch the homepage
    let homepageHtml;
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Steeple/1.0; +https://usesteeple.com)",
        },
        signal: AbortSignal.timeout(15000),
      });
      homepageHtml = await response.text();
    } catch (fetchError) {
      return Response.json(
        { error: "Could not reach that website. Please check the URL and try again." },
        { status: 400 }
      );
    }

    // Truncate HTML to avoid token limits (keep first ~50k chars)
    const truncatedHtml = homepageHtml.substring(0, 50000);

    // Step 2: Ask Claude to find the beliefs page link and extract any
    // doctrinal content visible on the homepage or linked pages
    const analysisMessage = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are analyzing a church website to extract their doctrinal statement and theological positions.

Here is the HTML from the church's homepage. Look for:
1. Any "What We Believe", "Our Beliefs", "Statement of Faith", "Doctrine", "Core Values", or similar content directly on this page
2. Links to such pages (look in navigation menus, footers, and body content)

If you find doctrinal content directly on the page, extract it.
If you find a link to a beliefs page, provide the FULL URL.

Respond in this exact JSON format (no other text):
{
  "found_on_page": true/false,
  "doctrinal_content": "extracted content if found on page, or empty string",
  "beliefs_page_url": "full URL to beliefs page if found, or empty string"
}

--- HOMEPAGE HTML ---
${truncatedHtml}
--- END HTML ---`,
        },
      ],
    });

    let analysisText = analysisMessage.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Clean up any markdown fencing
    analysisText = analysisText.replace(/```json\s?/g, "").replace(/```/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      // If Claude didn't return clean JSON, try to extract what we can
      analysis = { found_on_page: false, doctrinal_content: "", beliefs_page_url: "" };
    }

    let doctrinalContent = analysis.doctrinal_content || "";

    // Step 3: If there's a beliefs page link, fetch and extract from it
    if (!doctrinalContent && analysis.beliefs_page_url) {
      try {
        let beliefsUrl = analysis.beliefs_page_url;
        // Handle relative URLs
        if (beliefsUrl.startsWith("/")) {
          const baseUrl = new URL(url);
          beliefsUrl = baseUrl.origin + beliefsUrl;
        }

        const beliefsResponse = await fetch(beliefsUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Steeple/1.0; +https://usesteeple.com)",
          },
          signal: AbortSignal.timeout(15000),
        });
        const beliefsHtml = await beliefsResponse.text();
        const truncatedBeliefsHtml = beliefsHtml.substring(0, 50000);

        const beliefsMessage = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `Extract the doctrinal statement or "What We Believe" content from this church webpage. Focus on their specific theological positions, core beliefs, and doctrinal distinctives. Present it as a clean, organized summary — not raw HTML.

If this page does not contain doctrinal/beliefs content, respond with exactly: NO_CONTENT_FOUND

--- PAGE HTML ---
${truncatedBeliefsHtml}
--- END HTML ---`,
            },
          ],
        });

        const beliefsContent = beliefsMessage.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("");

        if (!beliefsContent.includes("NO_CONTENT_FOUND")) {
          doctrinalContent = beliefsContent;
        }
      } catch {
        // If beliefs page fetch fails, continue without it
      }
    }

    // Step 4: If we got content, create a structured summary
    if (doctrinalContent) {
      const summaryMessage = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `Summarize this church's doctrinal statement into a concise reference document that can be used to ensure generated content aligns with their theology. Organize by topic (e.g., Scripture, God, Salvation, Church, End Times). Note any distinctive or non-mainstream positions. Be specific — vague summaries are useless.

${doctrinalContent}`,
          },
        ],
      });

      const summary = summaryMessage.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      return Response.json({
        success: true,
        doctrinalStatement: summary,
        source: analysis.beliefs_page_url || url,
      });
    }

    return Response.json({
      success: true,
      doctrinalStatement: "",
      message: "No doctrinal statement found on the website. You can still proceed — your voice training will shape the output.",
    });

  } catch (error) {
    console.error("Website scan error:", error);
    return Response.json(
      { error: error.message || "Something went wrong scanning the website." },
      { status: 500 }
    );
  }
}