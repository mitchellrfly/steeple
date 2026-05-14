/* app/api/generate/route.js */
/*
  UPDATED: Now supports three modes:
  1. Transcript Mode — full sermon transcript
  2. Outline Mode — main points + voice profile
  3. Refine Mode — takes original content + critique and regenerates
  
  Also now includes:
  - Doctrinal statement in system prompt (from website scan)
  - Past critiques loaded from Supabase to avoid repeating mistakes
*/

import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../../../lib/supabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/*
  Build the system prompt with all available context:
  - Denomination and tone
  - Voice profile (from transcript analysis)
  - Doctrinal statement (from website scan)
  - Past critiques (from feedback loop)
*/
function buildSystemPrompt(denomination, tone, voiceProfile, doctrinalStatement, pastCritiques) {
  let prompt = `You are a skilled church communications assistant specializing in repurposing sermon content. You deeply understand the theological distinctives and communication culture of different Christian traditions.

THEOLOGICAL CONTEXT:
- This pastor serves in the "${denomination}" tradition.
- Respect the theological framework of this tradition in all generated content.
- Use language, illustrations, and theological emphasis consistent with this tradition.
- NEVER insert theological concepts foreign to this tradition.`;

  if (doctrinalStatement) {
    prompt += `

CHURCH DOCTRINAL STATEMENT:
The following is this church's specific doctrinal positions, extracted from their website. All generated content MUST align with these positions. If a topic touches on any of these doctrinal areas, use the church's stated position — not generic Christian language.

${doctrinalStatement}`;
  }

  if (voiceProfile) {
    prompt += `

PASTOR'S VOICE PROFILE:
The following profile was built by analyzing this pastor's actual sermon transcripts. Match this voice precisely. The content should be indistinguishable from what this pastor would write themselves.

${voiceProfile}`;
  } else {
    prompt += `

COMMUNICATION STYLE:
- The pastor's natural tone is: ${getToneDescription(tone)}.
- Match this voice consistently.`;
  }

  if (pastCritiques && pastCritiques.length > 0) {
    prompt += `

IMPORTANT — PAST CORRECTIONS FROM THIS PASTOR:
The pastor has previously corrected generated content. Study these corrections carefully and NEVER repeat similar mistakes. Each correction represents a theological or stylistic preference you must respect:

`;
    pastCritiques.forEach((c, i) => {
      prompt += `Correction ${i + 1} (${c.content_type}): "${c.critique}"\n`;
    });
  }

  prompt += `

CONTENT STANDARDS:
- Every scripture reference must be EXACT. If uncertain, flag it with [VERIFY].
- Do not invent quotes or attribute statements to the pastor that aren't provided.
- Content should be ready to publish with minimal editing.
- Avoid churchspeak clichés unless the pastor's voice profile uses them.`;

  return prompt;
}

function getToneDescription(tone) {
  const descriptions = {
    conversational: "Warm and approachable. Uses contractions, rhetorical questions, and everyday language.",
    academic: "Thoughtful and precise. Values exegetical depth and careful word choice.",
    passionate: "Bold and direct. Uses urgent language and strong calls to action.",
    pastoral: "Gentle and empathetic. Leads with compassion. Acknowledges struggle before offering truth.",
    storytelling: "Narrative-driven. Weaves illustrations, personal anecdotes, and vivid imagery throughout.",
  };
  return descriptions[tone] || descriptions.conversational;
}

function buildOutlineContext(sermonTitle, scriptureRef, mainPoints, keyIllustration, applicationPoint) {
  let context = `SERMON OUTLINE:\n`;
  if (sermonTitle) context += `Title: "${sermonTitle}"\n`;
  if (scriptureRef) context += `Primary Scripture: ${scriptureRef}\n\n`;
  context += `MAIN POINTS:\n`;
  mainPoints.forEach((point, i) => { context += `${i + 1}. ${point}\n`; });
  if (keyIllustration && keyIllustration.trim()) context += `\nKEY ILLUSTRATION/STORY:\n${keyIllustration}\n`;
  if (applicationPoint && applicationPoint.trim()) context += `\nAPPLICATION/CALL TO ACTION:\n${applicationPoint}\n`;
  return context;
}

function buildBlogPrompt(sermonTitle, scriptureRef, isOutlineMode) {
  const sourceNote = isOutlineMode
    ? "Based on the sermon outline below, write a blog post (600-900 words) as if the pastor had preached this sermon."
    : "Based on the sermon transcript below, write a blog post (600-900 words).";
  return `${sourceNote}

REQUIREMENTS:
- Title: Create an engaging blog title${sermonTitle ? ` (the sermon was titled "${sermonTitle}")` : ""}.
${scriptureRef ? `- Primary scripture: ${scriptureRef}` : ""}
- Opening: Hook the reader with the sermon's central tension or question.
- Body: Distill 2-3 key points. Go deep on what matters most.
- Include illustrations or stories from the ${isOutlineMode ? "outline" : "transcript"}.
- Closing: End with a specific, actionable application.
- Format: Use subheadings. Keep paragraphs to 2-3 sentences.`;
}

function buildSocialPrompt(sermonTitle, scriptureRef, isOutlineMode) {
  const sourceNote = isOutlineMode
    ? "Based on the sermon outline below, create 5 social media posts."
    : "Based on the sermon transcript below, create 5 social media posts.";
  return `${sourceNote}

REQUIREMENTS:
- Post 1: A punchy standalone insight (1-2 sentences).
- Post 2: A reflective question drawn from the theme.
- Post 3: A "thread-style" post — main point in 3-4 short sequential thoughts.
- Post 4: A personal/vulnerable insight. Start with "What if..." or similar.
- Post 5: Scripture-focused.${scriptureRef ? ` Use ${scriptureRef}.` : ""}

FORMAT: Separate each post with "---". No hashtags. No emojis in first line. Under 200 words each.`;
}

function buildDiscussionPrompt(sermonTitle, scriptureRef, isOutlineMode) {
  const sourceNote = isOutlineMode
    ? "Based on the sermon outline below, create a small group discussion guide."
    : "Based on the sermon transcript below, create a small group discussion guide.";
  return `${sourceNote}

REQUIREMENTS:
- Title: "${sermonTitle || "Discussion Guide"}"
${scriptureRef ? `- Scripture: ${scriptureRef}` : ""}
- Opening icebreaker connected to the theme.
- Scripture reading: key passage (3-8 verses).
- 5-6 discussion questions progressing: Observation → Interpretation → Application.
- Leader notes for each question.
- Closing prayer prompt.`;
}

function buildEmailPrompt(sermonTitle, scriptureRef, isOutlineMode) {
  const sourceNote = isOutlineMode
    ? "Based on the sermon outline below, write a midweek email devotional (250-400 words)."
    : "Based on the sermon transcript below, write a midweek email devotional (250-400 words).";
  return `${sourceNote}

REQUIREMENTS:
- Subject line: Compelling, personal, not promotional.
${sermonTitle ? `- Reference this Sunday's sermon "${sermonTitle}" briefly.` : ""}
${scriptureRef ? `- Ground in ${scriptureRef}.` : ""}
- Take ONE idea and go deeper with a fresh angle.
- End with a reflective question and brief prayer.
- Tone: Intimate, like a personal letter.`;
}

/*
  Load past critiques for this church from Supabase.
  We pull the most recent 20 to keep the context window manageable.
*/
async function loadPastCritiques(churchCode) {
  if (!churchCode) return [];

  try {
    const { data, error } = await supabase
      .from("feedback")
      .select("content_type, critique")
      .eq("church_code", churchCode)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading critiques:", error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

/*
  Main API handler
*/
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      mode,
      sermonText,
      sermonTitle,
      scriptureRef,
      mainPoints,
      keyIllustration,
      applicationPoint,
      denomination,
      tone,
      contentTypes,
      voiceProfile,
      doctrinalStatement,
      // Refine-specific fields
      contentType,
      originalContent,
      critique,
      // Church code for loading past critiques
      churchCode,
    } = body;

    // Load past critiques if we have a church code
    const pastCritiques = await loadPastCritiques(churchCode);

    // === REFINE MODE ===
    if (mode === "refine") {
      if (!originalContent || !critique) {
        return Response.json({ error: "Original content and critique are required." }, { status: 400 });
      }

      const systemPrompt = buildSystemPrompt(denomination, tone, voiceProfile, doctrinalStatement, pastCritiques);

      const refinePrompt = `You previously generated the following ${contentType} content for this pastor:

--- ORIGINAL CONTENT ---
${originalContent}
--- END ORIGINAL CONTENT ---

The pastor has provided this feedback:
"${critique}"

Please regenerate the ${contentType} content, incorporating their feedback. Fix the specific issues they raised while maintaining the overall structure and quality. The corrected version should feel natural, not like a patch job.

Respond with ONLY the regenerated content — no preamble, no explanation of changes.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: refinePrompt }],
      });

      const refinedContent = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      return Response.json({ content: refinedContent });
    }

    // === TRANSCRIPT / OUTLINE MODE ===
    if (mode === "transcript" && (!sermonText || sermonText.trim().length === 0)) {
      return Response.json({ error: "Sermon transcript is required." }, { status: 400 });
    }
    if (mode === "outline" && (!mainPoints || mainPoints.length === 0)) {
      return Response.json({ error: "At least one main point is required." }, { status: 400 });
    }

    const isOutlineMode = mode === "outline";
    const systemPrompt = buildSystemPrompt(denomination, tone, voiceProfile, doctrinalStatement, pastCritiques);

    const promptBuilders = {
      blog: buildBlogPrompt,
      social: buildSocialPrompt,
      discussion: buildDiscussionPrompt,
      email: buildEmailPrompt,
    };

    let sourceContent;
    if (isOutlineMode) {
      sourceContent = buildOutlineContext(sermonTitle, scriptureRef, mainPoints, keyIllustration, applicationPoint);
    } else {
      sourceContent = `--- SERMON TRANSCRIPT ---\n${sermonText}\n--- END TRANSCRIPT ---`;
    }

    const results = {};
    const promises = contentTypes.map(async (type) => {
      const buildPrompt = promptBuilders[type];
      if (!buildPrompt) return;

      const contentPrompt = buildPrompt(sermonTitle, scriptureRef, isOutlineMode);
      const userPrompt = `${contentPrompt}\n\n${sourceContent}`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      results[type] = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
    });

    await Promise.all(promises);
    return Response.json({ content: results });

  } catch (error) {
    console.error("Generation error:", error);
    return Response.json(
      { error: error.message || "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}