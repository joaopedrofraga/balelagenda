import { invokeFunction } from '../../lib/supabase'
import { parseIntentLocal } from './parseIntentLocal'
import type { IntentFilters, SuggestPlacesResult } from './types'

export type SuggestPlacesInput = {
  prompt?: string
  filters?: Partial<IntentFilters>
  limit?: number
}

/**
 * Chama a Edge Function `suggest-places` (IA + Places, chaves no servidor).
 * Se a function não estiver deployada, devolve filtros locais sem inventar lugares.
 */
export async function suggestPlaces(input: SuggestPlacesInput): Promise<SuggestPlacesResult> {
  const prompt = input.prompt?.trim() ?? ''

  try {
    const data = await invokeFunction<SuggestPlacesResult | { error: string }>('suggest-places', {
      prompt: prompt || undefined,
      filters: input.filters,
      limit: input.limit ?? 8,
    })

    if (data && typeof data === 'object' && 'filters' in data && 'places' in data) {
      return data as SuggestPlacesResult
    }

    const reason = data && 'error' in data ? String(data.error) : null
    return fallback(input, prompt, reason)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const reason =
      message.includes('Failed to fetch') || message.includes('404') || message.includes('not found')
        ? 'Edge Function suggest-places ainda não está deployada.'
        : message
    return fallback(input, prompt, reason)
  }
}

function fallback(
  input: SuggestPlacesInput,
  prompt: string,
  reason: string | null,
): SuggestPlacesResult {
  const filters =
    input.filters && Object.keys(input.filters).length > 0 && !prompt
      ? normalizePartial(input.filters)
      : parseIntentLocal(prompt || 'rolê')

  return {
    filters,
    places: [],
    source: { intent: 'heuristic', places: 'none' },
    message: reason
      ? `${reason} Filtros locais aplicados — cadastre ideias ou configure AI_API_KEY / PLACES_API_KEY.`
      : 'Busca de lugares indisponível. Use os filtros abaixo no sorteio ou nas ideias.',
  }
}

function normalizePartial(raw: Partial<IntentFilters>): IntentFilters {
  return {
    category: raw.category ?? null,
    max_price: raw.max_price ?? null,
    group_size: raw.group_size ?? null,
    period: raw.period ?? null,
    ambiance: raw.ambiance ?? null,
    query: raw.query ?? null,
    city: raw.city ?? null,
  }
}
