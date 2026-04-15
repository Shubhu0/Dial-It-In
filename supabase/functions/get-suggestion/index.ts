import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const AI_API_URL = 'https://api.anthropic.com/v1/messages'
const AI_MODEL   = 'claude-opus-4-6'

const SYSTEM_PROMPTS: Record<string, string> = {
  espresso: `
You are an expert barista helping dial in espresso. Respond ONLY with valid JSON.
No preamble. No markdown. The JSON shape must be exactly:
{"diagnosis":"...","changes":[{"param":"...","from":"...","to":"...","direction":"..."}],"reasoning":"...","closerThanLast":boolean}

Rules for espresso:
- Target ratio 1:2 (dose:yield), 25–35 seconds
- Sour (taste < 40): grind finer OR extend pull time OR increase yield slightly
- Bitter (taste > 60): grind coarser OR shorten pull OR reduce yield
- Only suggest 1–2 changes per session. Never suggest more than 2.
- If the user has oscillated between sour and bitter across last 3 sessions, suggest narrowing the range
- Light roasts need finer grind than the same dose in medium roasts
- Reference the bean origin when relevant (Ethiopian = naturally fruity/acidic, etc.)
`,
  pour_over: `
You are an expert barista helping dial in pour over. Respond ONLY with valid JSON.
No preamble. No markdown. JSON shape: {"diagnosis":"...","changes":[...],"reasoning":"...","closerThanLast":boolean}

Rules for pour over:
- Target ratio 1:15–1:17 (coffee:water)
- Sour: finer grind, slower pour rate, or slightly higher water temp (max 96°C)
- Bitter: coarser grind, faster pour, or lower temp
- Bloom is critical — always ask if they bloomed for 30–45s if not specified
`,
  aeropress: `
You are an expert barista helping dial in AeroPress. Respond ONLY with valid JSON.
No preamble. No markdown. JSON shape: {"diagnosis":"...","changes":[...],"reasoning":"...","closerThanLast":boolean}

Rules for AeroPress:
- Very flexible — combine immersion time and pressure
- Sour: longer steep (30–60s more) AND finer grind
- Bitter: shorter steep OR coarser grind OR inverted method
- Can use both standard and inverted — ask which if unclear
`,
  french_press: `
You are an expert barista helping dial in French press. Respond ONLY with valid JSON.
No preamble. No markdown. JSON shape: {"diagnosis":"...","changes":[...],"reasoning":"...","closerThanLast":boolean}

Rules for French press:
- Target 4-minute steep
- Sour: increase steep time by 30–60s, or coarsen grind slightly
- Bitter: reduce steep time, or coarser grind
- Remind user to press slowly and pour immediately
`,
}

function buildUserMessage(params: unknown, history: unknown[], bean: Record<string, unknown>): string {
  return `
Bean: ${bean['name']}, ${bean['origin'] ?? 'unknown origin'}, ${bean['roast_level']} roast, roasted ${bean['roast_date'] ?? 'unknown'}.

Current brew parameters:
${JSON.stringify(params, null, 2)}

Last ${history.length} sessions for this bean (oldest first):
${history.map((h: unknown, i: number) => {
  const session = h as Record<string, unknown>
  return `Session ${i + 1}: taste=${session['taste_position']}/100, ${JSON.stringify(h)}`
}).join('\n')}

The user rated this brew: taste position ${(params as Record<string, unknown>)['taste_position']}/100.
0 = very sour, 50 = balanced, 100 = very bitter.

Give your adjustment suggestion as JSON.
`.trim()
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { method, params, history, bean } = await req.json()

    const systemPrompt = SYSTEM_PROMPTS[method] ?? SYSTEM_PROMPTS['espresso']
    const userMessage  = buildUserMessage(params, history ?? [], bean)

    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         Deno.env.get('AI_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      AI_MODEL,
        max_tokens: 600,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userMessage }],
      }),
    })

    const data       = await res.json()
    const text       = data.content[0].text
    const suggestion = JSON.parse(text)

    return new Response(JSON.stringify(suggestion), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status:  500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
