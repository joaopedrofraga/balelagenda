/** Tipos compartilhados de IA / filtros / lugares (MVP 3). */

export type OutingPeriod = 'morning' | 'afternoon' | 'night' | 'any'

export type IntentFilters = {
  category: string | null
  max_price: number | null
  group_size: number | null
  period: OutingPeriod | null
  ambiance: string | null
  query: string | null
  city: string | null
}

export type PlaceSuggestion = {
  id: string
  name: string
  category: string | null
  address: string | null
  lat: number | null
  lon: number | null
  rating: number | null
  price_level: number | null
  url: string | null
  provider: string
}

export type SuggestPlacesResult = {
  filters: IntentFilters
  places: PlaceSuggestion[]
  source: {
    intent: 'ai' | 'heuristic'
    places: string
  }
  message?: string
}

export type DrawFilters = {
  category?: string
  maxCost?: number
  period?: OutingPeriod
  ambiance?: string
  avoidRecentDays?: number
}

export const PERIOD_LABELS: Record<OutingPeriod, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
  any: 'Qualquer',
}
