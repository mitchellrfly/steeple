/* app/api/analyze-voice/route.js */
/*
  This endpoint receives 3-4 sermon transcripts from the pastor
  and sends them to Claude for voice analysis. Claude extracts:
  - Writing style patterns (sentence length, vocabulary level, etc.)
  - Theological distinctives and emphasis areas
  - Favorite phrases, transitions, and rhetorical devices
  - Illustration style (personal stories, historical, cultural, etc.)
  - How they handle scripture (exegetical depth, translation preferences, etc.)
  
  The output is a "voice profile" — a text document that gets stored
  in Supabase and included in every future generation call.
  This is what makes the AI sound like THEM, not generic.
*/

import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../../../lib/supabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { transcripts, churchName, denomination, tone, churchCode, doctrinalStatement } = body;

    // Validate inputs
    if (!transcripts || transcripts.length === 0) {
      return Response.json(
        { error: "Please provide at least one sermon transcript." },
        { status: 400 }
      );
    }

    if (!churchCode || !churchName) {
      return Response.json(
        { error: "Church name and code are required." },
        { status: 400 }
      );
    }

    // Combine transcripts with labels for Claude to analyze
    const transcriptBlock = transcripts
      .map((t, i) => `--- SERMON SAMPLE ${i + 1} ---\n${t}\n--- END SAMPLE ${i + 1} ---`)
      .join("\n\n");

    // This prompt is critical — it tells Claude exactly how to
    // analyze the pastor's voice. The output becomes the voice profile
    // that shapes all future content generation.
    const analysisPrompt = `You are an expert at analyzing communication styles, particularly in preaching and pastoral communication. You have been given ${transcripts.length} sermon transcript(s) from a pastor at "${churchName}" (${denomination} tradition).

Analyze these transcripts carefully and produce a detailed VOICE PROFILE that captures this specific pastor's unique voice. This profile will be used to generate content that sounds authentically like them.

Your analysis must cover ALL of the following categories:

1. SENTENCE STRUCTURE & RHYTHM
   - Average sentence length (short and punchy? Long and flowing? Mixed?)
   - How they build paragraphs
   - Use of fragments, rhetorical questions, repetition
   - Pacing patterns (do they build slowly or hit hard immediately?)

2. VOCABULARY & LANGUAGE LEVEL
   - Reading level they write/speak at
   - Do they use theological jargon or everyday language?
   - Specific words or phrases they favor (list actual examples from the transcripts)
   - Words or phrases they repeat across multiple sermons
   - Do they use contractions? Colloquialisms? Academic language?

3. THEOLOGICAL FRAMEWORK
   - Key doctrinal emphases (what themes keep surfacing?)
   - How they talk about God (formal? intimate? authoritative?)
   - How they handle sin, grace, redemption — what framing do they use?
   - Any distinctive theological positions evident in the text
   - How they use the Old Testament vs New Testament

4. SCRIPTURE HANDLING
   - How do they introduce scripture? (formal reading? woven into narrative?)
   - Do they do verse-by-verse exposition or topical preaching?
   - Which Bible translation(s) do they seem to use?
   - How much original language (Greek/Hebrew) do they reference?
   - How they connect scripture to modern life

5. ILLUSTRATION STYLE
   - What kinds of stories do they tell? (personal, historical, cultural, hypothetical?)
   - How they use humor (frequently? sparingly? self-deprecating? witty?)
   - Do they reference pop culture, current events, literature?
   - How vulnerable/personal do they get?

6. EMOTIONAL REGISTER
   - Overall emotional tone (encouraging, challenging, contemplative, urgent?)
   - How they handle tension and resolution
   - How they talk to the congregation (we/us vs. you? peer vs. authority?)
   - Their approach to application (direct commands? gentle suggestions? questions?)

7. DISTINCTIVE PHRASES & PATTERNS
   - List 5-10 actual phrases or expressions this pastor uses
   - Any signature transitions or structural patterns
   - How they open and close points
   - Catchphrases or recurring frameworks

Format this as a clear, detailed profile document. Be SPECIFIC — use actual quotes and examples from the transcripts. Generic observations are useless. The goal is that someone reading this profile could write content that this pastor's congregation would recognize as authentically from their pastor.

${transcriptBlock}`;

    // Call Claude to analyze the transcripts
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
    });

    // Extract the voice profile text
    const voiceProfile = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Save to Supabase — upsert so we can update if code already exists
    const { data, error: dbError } = await supabase
      .from("churches")
      .upsert(
        {
          church_code: churchCode.toLowerCase().trim(),
          church_name: churchName,
          denomination: denomination,
          tone: tone,
          voice_profile: voiceProfile,
          doctrinal_statement: doctrinalStatement || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "church_code",
        }
      )
      .select();

    if (dbError) {
      console.error("Supabase error:", dbError);
      return Response.json(
        { error: "Failed to save your voice profile. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      voiceProfile: voiceProfile,
      churchCode: churchCode.toLowerCase().trim(),
    });

  } catch (error) {
    console.error("Voice analysis error:", error);
    return Response.json(
      { error: error.message || "Something went wrong analyzing your sermons." },
      { status: 500 }
    );
  }
}