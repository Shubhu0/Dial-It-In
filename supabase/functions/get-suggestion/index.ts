import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const AI_API_URL = 'https://api.anthropic.com/v1/messages'
const AI_MODEL   = 'claude-haiku-4-5-20251001'   // fast + cheap for suggestions

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  'https://dial-it-in-kappa.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RATE_LIMIT_SECONDS = 30

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

const VALID_METHODS = new Set(['espresso', 'pour_over', 'aeropress', 'french_press'])

function validateInput(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return 'Invalid request body'
  const { method, params, history, bean } = body as Record<string, unknown>

  if (typeof method !== 'string' || !VALID_METHODS.has(method))
    return 'Invalid method'
  if (typeof params !== 'object' || params === null)
    return 'Invalid params'
  if (!Array.isArray(history) || history.length > 20)
    return 'Invalid history'
  if (typeof bean !== 'object' || bean === null)
    return 'Invalid bean'

  const p = params as Record<string, unknown>
  const taste = Number(p['taste_position'])
  if (isNaN(taste) || taste < 0 || taste > 100)
    return 'taste_position must be 0–100'

  return null  // valid
}

function buildUserMessage(params: unknown, history: unknown[], bean: Record<string, unknown>): string {
  // Sanitise bean fields — only forward known safe string fields
  const safeName   = String(bean['name']        ?? '').slice(0, 100)
  const safeOrigin = String(bean['origin']       ?? 'unknown origin').slice(0, 100)
  const safeRoast  = String(bean['roast_level']  ?? '').slice(0, 20)
  const safeDate   = String(bean['roast_date']   ?? 'unknown').slice(0, 20)

  // Sanitise history — only forward known numeric/string fields
  const safeHistory = (history as Record<string, unknown>[])
    .slice(0, 10)
    .map((h, i) => {
      const taste  = Number(h['taste_position'])
      const method = String(h['method'] ?? '').slice(0, 20)
      return `Session ${i + 1}: taste=${isNaN(taste) ? '?' : taste}/100, method=${method}`
    })

  // Sanitise params — only forward known numeric/string fields
  const safeParams = {
    dose_g:         Number((params as Record<string, unknown>)['dose_g'])         || null,
    yield_g:        Number((params as Record<string, unknown>)['yield_g'])        || null,
    time_s:         Number((params as Record<string, unknown>)['time_s'])         || null,
    water_g:        Number((params as Record<string, unknown>)['water_g'])        || null,
    brew_time_s:    Number((params as Record<string, unknown>)['brew_time_s'])    || null,
    grind_setting:  String((params as Record<string, unknown>)['grind_setting']   ?? '').slice(0, 20),
    water_temp_c:   Number((params as Record<string, unknown>)['water_temp_c'])   || null,
    taste_position: Number((params as Record<string, unknown>)['taste_position']) || 50,
  }

  return `
Bean: ${safeName}, ${safeOrigin}, ${safeRoast} roast, roasted ${safeDate}.

Current brew parameters:
${JSON.stringify(safeParams, null, 2)}

Last ${safeHistory.length} sessions for this bean (oldest first):
${safeHistory.join('\n')}

The user rated this brew: taste position ${safeParams.taste_position}/100.
0 = very sour, 50 = balanced, 100 = very bitter.

Give your adjustment suggestion as JSON.
`.trim()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // ── 1. Verify the caller is an authenticated Supabase user ─────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status:  401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status:  401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // ── 2. Rate limit: one suggestion per RATE_LIMIT_SECONDS per user ──────────
  const cutoff = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString()
  const { data: rateRow } = await supabase
    .from('suggestion_rate_limits')
    .select('last_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (rateRow && rateRow.last_at > cutoff) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait before requesting another suggestion.' }), {
      status:  429,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Retry-After': String(RATE_LIMIT_SECONDS) },
    })
  }

  // ── 3. Parse and validate the request body ─────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status:  400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const validationError = validateInput(body)
  if (validationError) {
    return new Response(JSON.stringify({ error: validationError }), {
      status:  400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // ── 4. Stamp the rate limit row (upsert) before calling AI ────────────────
  await supabase
    .from('suggestion_rate_limits')
    .upsert({ user_id: user.id, last_at: new Date().toISOString() })

  // ── 5. Call the AI ─────────────────────────────────────────────────────────
  try {
    const { method, params, history, bean } = body as Record<string, unknown>

    const systemPrompt = SYSTEM_PROMPTS[method as string] ?? SYSTEM_PROMPTS['espresso']
    const userMessage  = buildUserMessage(params, history as unknown[], bean as Record<string, unknown>)

    const res = await fetch(AI_API_URL, {
      method:  'POST',
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

    if (!res.ok) {
      console.error('AI API error', res.status, await res.text())
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status:  502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    const text = data?.content?.[0]?.text
    if (!text) throw new Error('Empty AI response')

    const suggestion = JSON.parse(text)

    return new Response(JSON.stringify(suggestion), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('get-suggestion error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status:  500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
