import type { IntentFilters } from './types'

/** Interpretação local de intenção — fallback quando a Edge Function / IA não está disponível. */
export function parseIntentLocal(prompt: string): IntentFilters {
  const lower = prompt.toLowerCase()

  let category: string | null = null
  if (/restaurante|comida|jantar|almo[cç]o|comer/.test(lower)) category = 'restaurant'
  else if (/caf[eé]|coffee/.test(lower)) category = 'cafe'
  else if (/bar|choppe|cerveja|drinks?/.test(lower)) category = 'bar'
  else if (/parque|ar livre|picnic/.test(lower)) category = 'park'
  else if (/cinema|filme/.test(lower)) category = 'cinema'
  else if (/boliche|bowling/.test(lower)) category = 'bowling'
  else if (/karaok[eê]/.test(lower)) category = 'karaoke'
  else if (/hamb[uú]rguer|burger|pizza|churrasco/.test(lower)) category = 'restaurant'

  const priceMatch = lower.match(/(?:r\$\s*|até\s+|ate\s+|max(?:imo)?\s*)(\d{1,4})/)
  const max_price = priceMatch ? Number(priceMatch[1]) : null

  const sizeMatch = lower.match(/(\d{1,2})\s*(?:pessoas|amigos|gente)/)
  const group_size = sizeMatch ? Number(sizeMatch[1]) : null

  let period: IntentFilters['period'] = null
  if (/manh[aã]/.test(lower)) period = 'morning'
  else if (/tarde/.test(lower)) period = 'afternoon'
  else if (/noite|nocturn|happy hour/.test(lower)) period = 'night'

  let ambiance: string | null = null
  if (/calmo|tranquilo|sossego/.test(lower)) ambiance = 'calmo'
  else if (/animado|festa|barulhent/.test(lower)) ambiance = 'animado'
  else if (/interno|fechado/.test(lower)) ambiance = 'interno'
  else if (/externo|ao ar livre|varanda/.test(lower)) ambiance = 'externo'

  const queryBits: string[] = []
  if (/hamb[uú]rguer|burger/.test(lower)) queryBits.push('hamburguer')
  if (/pizza/.test(lower)) queryBits.push('pizza')
  if (/churrasco|churras/.test(lower)) queryBits.push('churrasco')
  if (queryBits.length === 0 && category) queryBits.push(category)

  return {
    category,
    max_price,
    group_size,
    period,
    ambiance,
    query: queryBits.join(' ') || prompt.slice(0, 80),
    city: null,
  }
}
