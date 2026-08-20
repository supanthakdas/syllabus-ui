import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
      const { topics } = await req.json()
      const apiKey = Deno.env.get('GEMINI_API_KEY')

      if (!apiKey) throw new Error("Gemini API key missing")

        const prompt = `You are a university professor creating a quiz.
        Generate 5 multiple-choice questions based on these topics: ${topics.join(", ")}.

        Provide a JSON response with EXACTLY this structure:
        {
          "questions": [
            {
              "question_text": "What is the capital of France?",
      "options": ["London", "Berlin", "Paris", "Madrid"],
      "correct_answer": "Paris"
            }
          ]
        }
        Do not use markdown formatting or backticks. Return raw JSON only.`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          }
        )

        const geminiJson = await geminiRes.json()
        const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '{"questions": []}'

return new Response(rawText.trim(), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
})
