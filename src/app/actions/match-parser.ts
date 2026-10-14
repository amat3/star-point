'use server'

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { createClient } from '@/utils/supabase/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { utcToMadridDateTime } from '@/lib/utils'
import {
  MATCH_PARSER_DAILY_LIMIT,
  MATCH_PARSER_FEATURE,
  MATCH_PARSER_MAX_CHARS,
  MATCH_PARSER_MODEL,
  buildMatchParserPrompt,
  canUseMatchParser,
  isMatchParserMock,
  isMatchParserOn,
  mockParsedMatch,
  normalizeParsedMatch,
  parsedMatchSchema,
  type MatchParseResult,
} from '@/lib/match-parser'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Reads a free-text description of a match and returns the form values it can fill.
 * It never publishes anything: the player reviews the form and publishes as usual.
 */
export async function parseMatchText(text: string): Promise<MatchParseResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  if (!isMatchParserOn()) throw new Error('El relleno automático no está disponible ahora mismo')

  const { data: profile } = await supabase.from('profiles').select('role, ai_enabled').eq('id', user.id).single()
  if (!canUseMatchParser(profile)) throw new Error('No tienes activado el relleno automático')

  const input = text.trim()
  if (!input) throw new Error('Escribe cómo es el partido')
  if (input.length > MATCH_PARSER_MAX_CHARS) throw new Error(`Máximo ${MATCH_PARSER_MAX_CHARS} caracteres`)

  const today = utcToMadridDateTime(new Date().toISOString()).date

  if (isMatchParserMock()) {
    const { data: clubs } = await supabase.from('clubs').select('id, name').order('name')
    await new Promise(resolve => setTimeout(resolve, 800))
    try {
      const { fill, doubts } = normalizeParsedMatch(mockParsedMatch(input, clubs ?? [], today), clubs ?? [], today)
      return { fill, doubts, remaining: MATCH_PARSER_DAILY_LIMIT - 1 }
    } catch {
      throw new Error('No he podido entender el texto: rellena el formulario a mano')
    }
  }

  // Daily cap: register the request first and then count, so parallel requests cannot all slip under it
  const admin = getAdminClient()
  const { data: request, error: insertError } = await admin
    .from('ai_requests')
    .insert({ user_id: user.id, feature: MATCH_PARSER_FEATURE })
    .select('id')
    .single()
  if (insertError || !request) throw new Error('No se ha podido procesar el texto')

  const { count } = await admin
    .from('ai_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('feature', MATCH_PARSER_FEATURE)
    .gte('created_at', new Date(Date.now() - DAY_MS).toISOString())
  const used = count ?? MATCH_PARSER_DAILY_LIMIT + 1
  if (used > MATCH_PARSER_DAILY_LIMIT) {
    await admin.from('ai_requests').delete().eq('id', request.id)
    throw new Error(`Has usado los ${MATCH_PARSER_DAILY_LIMIT} rellenos de hoy: completa el formulario a mano`)
  }

  const { data: clubs } = await admin.from('clubs').select('id, name').order('name')

  try {
    const client = new Anthropic()
    const message = await client.messages.parse({
      model: MATCH_PARSER_MODEL,
      max_tokens: 512,
      system: buildMatchParserPrompt(clubs ?? [], today),
      messages: [{ role: 'user', content: input }],
      output_config: { format: zodOutputFormat(parsedMatchSchema) },
    })
    if (!message.parsed_output) throw new Error('empty output')

    const { fill, doubts } = normalizeParsedMatch(message.parsed_output, clubs ?? [], today)
    return { fill, doubts, remaining: MATCH_PARSER_DAILY_LIMIT - used }
  } catch (error) {
    console.error('parseMatchText', error)
    throw new Error('No he podido entender el texto: rellena el formulario a mano')
  }
}
