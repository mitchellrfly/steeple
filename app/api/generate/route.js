/* app/api/generate/route.js */
/*
  This is the API endpoint that your frontend calls.
  It receives the sermon data and church profile,
  then calls the Claude API to generate content.

  How it works:
  1. Frontend sends a POST request with sermon text + preferences
  2. We build a carefully engineered prompt for each content type
  3. We call Claude's API for each content type
  4. We return all generated content as JSON

  The prompt engineering here is WHERE YOUR PRODUCT LIVES.
  Generic prompts = generic output = no moat.
  Church-specific, theologically-aware prompts = your differentiator.
*/

import Anthropic from "@anthropic-ai/sdk";

// Initialize the Anthropic client with your API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/*
  This is the core system prompt that shapes Claude's behavior
  for ALL content generation. It establishes theological awareness
  and content standards. This is your secret sauce.
*/
function buildSystemPrompt(denomination, tone) {
  return `You are a skilled church communications assistant specializing in repurposing sermon content. You deeply understand the theological distinctives and communication culture of different Christian traditions.

THEOLOGICAL CONTEXT:
- This pastor serves in the "${denomination}" tradition.
- Respect the theological framework of this tradition in all generated content.
- Use language, illustrations, and theological emphasis consistent with this tradition.
- NEVER insert theological concepts foreign to this tradition (e.g., don't use Calvinist language for Arminian traditions, don't assume liturgical practices for non-liturgical churches).
- If scripture is referenced, maintain the interpretive approach typical of this tradition.

COMMUNICATION STYLE:
- The pastor's natural tone is: ${getToneDescription(tone)}.
- Match this voice consistently. The content should sound like THIS pastor wrote it, not a generic Christian writer.
- Avoid churchspeak clichés ("do life together", "unpack this", "lean into") unless the pastor's transcript actually uses them.
- Write for a general church audience — not seminary students, not seekers, but regular members who attend weekly.

CONTENT STANDARDS:
- Every scripture reference must be EXACT. If you're uncertain about a verse reference, flag it with [VERIFY] rather than guessing.
- Do not invent quotes or attribute statements to the pastor that aren't in the transcript.
- Preserve the pastor's key illustrations, stories, and phrases — these are what make it authentic.
- Content should be ready to publish with minimal editing.`;
}

/*
  Map tone values to rich descriptions Claude can work with.
  The more specific you are here, the better Claude matches the voice.
*/
function getToneDescription(tone) {
  const descriptions = {
    conversational:
      "Warm and approachable. Uses contractions, rhetorical questions, and everyday language. Feels like a trusted friend explaining something over coffee. Occasional humor. Short paragraphs.",
    academic:
      "Thoughtful and precise. Values exegetical depth and careful word choice. References original languages sparingly but naturally. Structured arguments. Respects the listener's intelligence without being inaccessible.",
    passionate:
      "Bold and direct. Uses urgent language and strong calls to action. Not afraid to challenge. Short punchy sentences mixed with longer flowing ones. High energy. Conviction-driven.",
    pastoral:
      "Gentle and empathetic. Leads with compassion. Acknowledges struggle before offering truth. Uses 'we' more than 'you.' Encouraging without being shallow. Creates emotional safety.",
    storytelling:
      "Narrative-driven. Weaves illustrations, personal anecdotes, and vivid imagery throughout. Draws the reader into a scene before making a point. Cinematic. Emotionally engaging.",
  };
  return descriptions[tone] || descriptions.conversational;
}

/*
  Individual prompt builders for each content type.
  Each one tells Claude exactly what to produce.
*/
function buildBlogPrompt(sermonTitle, scriptureRef) {
  return `Based on the sermon transcript below, write a blog post (600-900 words).

REQUIREMENTS:
- Title: Create an engaging blog title${sermonTitle ? ` (the sermon was titled "${sermonTitle}")` : ""}.
${scriptureRef ? `- Primary scripture: ${scriptureRef}` : ""}
- Opening: Hook the reader with the sermon's central tension or question. Don't start with "This Sunday..." or "In this week's sermon..."
- Body: Distill 2-3 key points from the sermon. Don't try to cover everything — go deep on what matters most.
- Include the pastor's best illustration or story from the transcript.
- Closing: End with a specific, actionable application — not a vague "think about this."
- Format: Use subheadings to break up sections. Keep paragraphs to 2-3 sentences.
- DO NOT use the phrase "in conclusion" or "to sum up."`;
}

function buildSocialPrompt(sermonTitle, scriptureRef) {
  return `Based on the sermon transcript below, create 5 social media posts.

REQUIREMENTS:
- Post 1: A punchy standalone quote or insight from the sermon (1-2 sentences). This should work without ANY context — someone scrolling should stop and think.
- Post 2: A question that provokes reflection, drawn from the sermon's theme. Format: question + 1 sentence of context.
- Post 3: A "thread-style" post — the sermon's main point broken into 3-4 short sequential thoughts, each on its own line.
- Post 4: A personal/vulnerable insight from the sermon that invites engagement. Start with "What if..." or a similar hook.
- Post 5: A scripture-focused post.${scriptureRef ? ` Use ${scriptureRef}.` : ""} Pair the verse with a one-line reflection from the sermon.

FORMAT RULES:
- Each post should be separated by "---"
- No hashtags (they reduce reach on most platforms now)
- No emojis in the first line of any post
- Keep each post under 200 words
- Each post must stand COMPLETELY alone — someone seeing just one post should get value`;
}

function buildDiscussionPrompt(sermonTitle, scriptureRef) {
  return `Based on the sermon transcript below, create a small group discussion guide.

REQUIREMENTS:
- Title: "${sermonTitle || "Discussion Guide"}"
${scriptureRef ? `- Scripture passage: ${scriptureRef}` : ""}
- Opening icebreaker: One low-stakes question to get people talking (NOT "how was your week"). Make it thematically connected to the sermon.
- Scripture reading: Identify the key passage (3-8 verses) for the group to read together.
- Discussion questions: Write 5-6 questions that progress in depth:
  * Questions 1-2: Observation (what does the text say?)
  * Questions 3-4: Interpretation (what does it mean?)
  * Questions 5-6: Application (what do we do about it?)
- Leader notes: For each question, add a brief italicized note with guidance for the leader (e.g., "If the group gets stuck, try asking..." or "The key insight here is...").
- Closing: A specific prayer prompt that ties to the sermon's application.

FORMAT: Use clear numbering and formatting. This should be printable.`;
}

function buildEmailPrompt(sermonTitle, scriptureRef) {
  return `Based on the sermon transcript below, write a midweek email devotional (250-400 words).

REQUIREMENTS:
- Subject line: Compelling, not clickbait. Should feel personal, not promotional.
${sermonTitle ? `- Reference this Sunday's sermon "${sermonTitle}" briefly but don't summarize it — assume the reader may not have been there.` : ""}
${scriptureRef ? `- Ground the devotional in ${scriptureRef}.` : ""}
- Take ONE idea from the sermon and go deeper on it with a fresh angle.
- Include a brief personal reflection or illustration (write as if the pastor is sharing).
- End with a single reflective question and a brief prayer (2-3 sentences).
- Tone: Intimate and warm. This lands in someone's inbox — it should feel like a personal letter, not a newsletter.`;
}

/*
  Main API handler. This runs when the frontend sends a POST request.
*/
export async function POST(request) {
  try {
    // Parse the incoming data from the frontend
    const body = await request.json();
    const { sermonText, sermonTitle, scriptureRef, denomination, tone, contentTypes } = body;

    // Validate that we have sermon text
    if (!sermonText || sermonText.trim().length === 0) {
      return Response.json(
        { error: "Sermon transcript is required." },
        { status: 400 }
      );
    }

    // Build the system prompt (shared across all content types)
    const systemPrompt = buildSystemPrompt(denomination, tone);

    // Map content types to their prompt builders
    const promptBuilders = {
      blog: buildBlogPrompt,
      social: buildSocialPrompt,
      discussion: buildDiscussionPrompt,
      email: buildEmailPrompt,
    };

    // Generate content for each selected type
    // We run them all in parallel (Promise.all) to save time
    const results = {};
    const promises = contentTypes.map(async (type) => {
      const buildPrompt = promptBuilders[type];
      if (!buildPrompt) return;

      const userPrompt = `${buildPrompt(sermonTitle, scriptureRef)}

--- SERMON TRANSCRIPT ---
${sermonText}
--- END TRANSCRIPT ---`;

      // Call the Claude API
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

      // Extract the text from Claude's response
      const generatedText = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      results[type] = generatedText;
    });

    // Wait for all content types to finish generating
    await Promise.all(promises);

    // Return the generated content
    return Response.json({ content: results });

  } catch (error) {
    console.error("Generation error:", error);

    // Return a helpful error message
    return Response.json(
      {
        error:
          error.message || "Something went wrong generating your content. Please try again.",
      },
      { status: 500 }
    );
  }
}
