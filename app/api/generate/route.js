/* app/api/generate/route.js */
/*
  UPDATED: Now supports two modes:
  1. Transcript Mode — works like before, but now includes voice profile if available
  2. Outline Mode — takes main points + voice profile and generates content
     as if the pastor had preached a full sermon
  
  The voice profile (from Supabase) is injected into the system prompt
  so Claude generates content that matches the pastor's actual voice.
*/

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/*
  Build the system prompt. If a voice profile exists, it gets included
  to shape the writing style. This is the key differentiator — 
  without this, the output is generic. With it, it sounds like the pastor.
*/
function buildSystemPrompt(denomination, tone, voiceProfile) {
  let prompt = `You are a skilled church communications assistant specializing in repurposing sermon content. You deeply understand the theological distinctives and communication culture of different Christian traditions.

THEOLOGICAL CONTEXT:
- This pastor serves in the "${denomination}" tradition.
- Respect the theological framework of this tradition in all generated content.
- Use language, illustrations, and theological emphasis consistent with this tradition.
- NEVER insert theological concepts foreign to this tradition.
- If scripture is referenced, maintain the interpretive approach typical of this tradition.`;

  // If we have a voice profile, inject it — this is the magic
  if (voiceProfile) {
    prompt += `

PASTOR'S VOICE PROFILE:
The following profile was built by analyzing this pastor's actual sermon transcripts. You MUST match this voice precisely. This is not a suggestion — the content should be indistinguishable from what this pastor would write themselves.

${voiceProfile}

CRITICAL: Use the specific phrases, patterns, and stylistic choices described in the voice profile above. Match their sentence structure, vocabulary level, emotional register, and theological framing exactly.`;
  } else {
    prompt += `

COMMUNICATION STYLE:
- The pastor's natural tone is: ${getToneDescription(tone)}.
- Match this voice consistently.`;
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
    conversational: "Warm and approachable. Uses contractions, rhetorical questions, and everyday language. Feels like a trusted friend explaining something over coffee.",
    academic: "Thoughtful and precise. Values exegetical depth and careful word choice. References original languages sparingly but naturally.",
    passionate: "Bold and direct. Uses urgent language and strong calls to action. Short punchy sentences mixed with longer flowing ones.",
    pastoral: "Gentle and empathetic. Leads with compassion. Acknowledges struggle before offering truth. Uses 'we' more than 'you.'",
    storytelling: "Narrative-driven. Weaves illustrations, personal anecdotes, and vivid imagery throughout. Draws the reader into a scene before making a point.",
  };
  return descriptions[tone] || descriptions.conversational;
}

/*
  For outline mode, we need to build a different kind of user prompt.
  Instead of "here's a transcript, repurpose it," it's
  "here's what the sermon covers, write as if you preached it."
*/
function buildOutlineContext(sermonTitle, scriptureRef, mainPoints, keyIllustration, applicationPoint) {
  let context = `SERMON OUTLINE:\n`;
  if (sermonTitle) context += `Title: "${sermonTitle}"\n`;
  if (scriptureRef) context += `Primary Scripture: ${scriptureRef}\n\n`;

  context += `MAIN POINTS:\n`;
  mainPoints.forEach((point, i) => {
    context += `${i + 1}. ${point}\n`;
  });

  if (keyIllustration && keyIllustration.trim()) {
    context += `\nKEY ILLUSTRATION/STORY:\n${keyIllustration}\n`;
  }

  if (applicationPoint && applicationPoint.trim()) {
    context += `\nAPPLICATION/CALL TO ACTION:\n${applicationPoint}\n`;
  }

  return context;
}

/*
  Content-specific prompt builders.
  These are largely the same as before, but adapted to work with
  both transcript and outline inputs.
*/
function buildBlogPrompt(sermonTitle, scriptureRef, isOutlineMode) {
  const sourceNote = isOutlineMode
    ? "Based on the sermon outline below, write a blog post (600-900 words) as if the pastor had preached this sermon and you are now repurposing it."
    : "Based on the sermon transcript below, write a blog post (600-900 words).";

  return `${sourceNote}

REQUIREMENTS:
- Title: Create an engaging blog title${sermonTitle ? ` (the sermon was titled "${sermonTitle}")` : ""}.
${scriptureRef ? `- Primary scripture: ${scriptureRef}` : ""}
- Opening: Hook the reader with the sermon's central tension or question. Don't start with "This Sunday..." or "In this week's sermon..."
- Body: Distill 2-3 key points. Don't try to cover everything — go deep on what matters most.
- Include illustrations or stories${isOutlineMode ? " based on what's provided in the outline" : " from the transcript"}.
- Closing: End with a specific, actionable application.
- Format: Use subheadings to break up sections. Keep paragraphs to 2-3 sentences.
- DO NOT use the phrase "in conclusion" or "to sum up."`;
}

function buildSocialPrompt(sermonTitle, scriptureRef, isOutlineMode) {
  const sourceNote = isOutlineMode
    ? "Based on the sermon outline below, create 5 social media posts as if repurposing a sermon the pastor preached on these points."
    : "Based on the sermon transcript below, create 5 social media posts.";

  return `${sourceNote}

REQUIREMENTS:
- Post 1: A punchy standalone insight (1-2 sentences). Should work without ANY context.
- Post 2: A reflective question drawn from the sermon's theme. Format: question + 1 sentence of context.
- Post 3: A "thread-style" post — the main point broken into 3-4 short sequential thoughts, each on its own line.
- Post 4: A personal/vulnerable insight that invites engagement. Start with "What if..." or a similar hook.
- Post 5: A scripture-focused post.${scriptureRef ? ` Use ${scriptureRef}.` : ""} Pair the verse with a one-line reflection.

FORMAT RULES:
- Separate each post with "---"
- No hashtags
- No emojis in the first line
- Keep each post under 200 words
- Each post must stand completely alone`;
}

function buildDiscussionPrompt(sermonTitle, scriptureRef, isOutlineMode) {
  const sourceNote = isOutlineMode
    ? "Based on the sermon outline below, create a small group discussion guide."
    : "Based on the sermon transcript below, create a small group discussion guide.";

  return `${sourceNote}

REQUIREMENTS:
- Title: "${sermonTitle || "Discussion Guide"}"
${scriptureRef ? `- Scripture passage: ${scriptureRef}` : ""}
- Opening icebreaker: One low-stakes question connected to the theme.
- Scripture reading: Identify the key passage (3-8 verses) for the group.
- Discussion questions: 5-6 questions progressing in depth:
  * Questions 1-2: Observation (what does the text say?)
  * Questions 3-4: Interpretation (what does it mean?)
  * Questions 5-6: Application (what do we do about it?)
- Leader notes: For each question, add brief italicized guidance.
- Closing: A specific prayer prompt tied to the application.

FORMAT: Use clear numbering. This should be printable.`;
}

function buildEmailPrompt(sermonTitle, scriptureRef, isOutlineMode) {
  const sourceNote = isOutlineMode
    ? "Based on the sermon outline below, write a midweek email devotional (250-400 words)."
    : "Based on the sermon transcript below, write a midweek email devotional (250-400 words).";

  return `${sourceNote}

REQUIREMENTS:
- Subject line: Compelling, not clickbait. Personal, not promotional.
${sermonTitle ? `- Reference this Sunday's sermon "${sermonTitle}" briefly.` : ""}
${scriptureRef ? `- Ground the devotional in ${scriptureRef}.` : ""}
- Take ONE idea and go deeper with a fresh angle.
- Include a brief personal reflection or illustration.
- End with a single reflective question and a brief prayer (2-3 sentences).
- Tone: Intimate and warm. Should feel like a personal letter.`;
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
    } = body;

    // Validate based on mode
    if (mode === "transcript" && (!sermonText || sermonText.trim().length === 0)) {
      return Response.json({ error: "Sermon transcript is required." }, { status: 400 });
    }

    if (mode === "outline" && (!mainPoints || mainPoints.length === 0)) {
      return Response.json({ error: "At least one main point is required." }, { status: 400 });
    }

    const isOutlineMode = mode === "outline";
    const systemPrompt = buildSystemPrompt(denomination, tone, voiceProfile);

    const promptBuilders = {
      blog: buildBlogPrompt,
      social: buildSocialPrompt,
      discussion: buildDiscussionPrompt,
      email: buildEmailPrompt,
    };

    // Build the source content (transcript or outline)
    let sourceContent;
    if (isOutlineMode) {
      sourceContent = buildOutlineContext(
        sermonTitle,
        scriptureRef,
        mainPoints,
        keyIllustration,
        applicationPoint
      );
    } else {
      sourceContent = `--- SERMON TRANSCRIPT ---\n${sermonText}\n--- END TRANSCRIPT ---`;
    }

    // Generate content for each selected type in parallel
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