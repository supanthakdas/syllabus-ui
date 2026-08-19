import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
      const { query, papers } = await req.json()
      const apiKey = Deno.env.get('GEMINI_API_KEY')

      if (!apiKey) throw new Error("Gemini API key missing")

        const prompt = `You are an academic search engine. Query: "${query}"
        Candidate papers: ${JSON.stringify(papers)}

        Task: Filter the papers that match the query semantically. Rank them.
        Return a JSON array of the matched paper objects. Add a "relevanceReason" string to each.
        If none match, you MUST return an empty array: []`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            // THIS IS THE MAGIC BULLET: It forces Gemini to output strict JSON
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      )

      const geminiJson = await geminiRes.json()
      const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "[]"

      let curatedPapers = [];
      try {
        curatedPapers = JSON.parse(rawText.trim());
      } catch (e) {
        console.error("Failed to parse Gemini output:", rawText);
      }

      return new Response(JSON.stringify(curatedPapers), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
})
