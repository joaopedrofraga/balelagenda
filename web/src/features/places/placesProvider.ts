import type { IntentFilters, PlaceSuggestion } from '../ai/types'
import { suggestPlaces } from '../ai/aiService'

/**
 * Camada abstrata PlacesProvider (spec §39).
 * Trocar o provedor = alterar a Edge Function; o app continua igual.
 */
export type PlacesProvider = {
  search(filters: Partial<IntentFilters>, limit?: number): Promise<PlaceSuggestion[]>
  suggestFromPrompt(prompt: string, limit?: number): Promise<{
    filters: IntentFilters
    places: PlaceSuggestion[]
    message?: string
    source: { intent: 'ai' | 'heuristic'; places: string }
  }>
}

export const supabasePlacesProvider: PlacesProvider = {
  async search(filters, limit = 8) {
    const result = await suggestPlaces({ filters, limit })
    return result.places
  },
  async suggestFromPrompt(prompt, limit = 8) {
    const result = await suggestPlaces({ prompt, limit })
    return {
      filters: result.filters,
      places: result.places,
      message: result.message,
      source: result.source,
    }
  },
}

export function getPlacesProvider(): PlacesProvider {
  return supabasePlacesProvider
}
