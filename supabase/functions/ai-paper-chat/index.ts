import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
      const { paper, messages } = await req.json()
      const apiKey = Deno.env.get('GEMINI_API_KEY')

      if (!apiKey) throw new Error("Gemini API key missing in Vault")

        // 1. Use the official system_instruction parameter (Much safer!)
        const systemInstruction = `You are an AI Study Companion for a university student.
        They are reading this research paper:
        - Title: ${paper.title}
        - Authors: ${paper.authors}
        - Abstract: ${paper.abstract || "No abstract provided."}

        Answer their questions intelligently and concisely. Format with bullet points where helpful.`;

      // 2. Map the chat history cleanly
      const contents = messages.map((m: any) => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // 3. Call Gemini
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: contents
          })
        }
      )

      const geminiJson = await geminiRes.json()

      // 4. If Gemini throws a fit, SEND THE EXACT ERROR to the chat UI!
      if (!geminiRes.ok) {
        console.error("Gemini API Error:", geminiJson);
        const errorMsg = geminiJson.error?.message || "Unknown API Error";
        return new Response(JSON.stringify({ reply: `Gemini API Error: ${errorMsg}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const replyText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, no response generated."

      return new Response(JSON.stringify({ reply: replyText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
})
