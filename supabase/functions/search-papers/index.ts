import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers are strictly required so your browser is allowed to talk to this function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request from the browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Grab the variables your React frontend sent over
    const { authorId, facultyName } = await req.json()

    // 2. Secretly pull the API key from the Supabase Vault (NEVER exposed to the browser)
    const apiKey = Deno.env.get('SERPAPI_KEY')

    if (!apiKey) {
      throw new Error("API key not found in Supabase Vault")
    }

    // 3. Make the secure server-to-server request
    const response = await fetch(`https://serpapi.com/search.json?engine=google_scholar_author&author_id=${authorId}&api_key=${apiKey}`)
    const json = await response.json()

    // 4. Format the papers to match your app's structure
    const formattedPapers = (json.articles || []).map((article: any, i: number) => ({
      id: parseInt(`888${i}${Math.floor(Math.random()*100)}`),
      title: article.title,
      author: article.authors || facultyName,
      source: "Google Scholar",
      year: article.year ? parseInt(article.year) : null,
      url: article.link,
      faculty_name: facultyName,
      faculty_department: null,
    }));

    // 5. Send clean, formatted data back to the frontend
    return new Response(JSON.stringify(formattedPapers), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
