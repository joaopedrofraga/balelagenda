import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPlacesProvider } from '../features/places/placesProvider'
import type { IntentFilters, PlaceSuggestion } from '../features/ai/types'
import { PERIOD_LABELS } from '../features/ai/types'
import { useCreateEvent, useCreateIdea, useDefaultGroupId, useIdeas } from '../lib/hooks'
import {
  Button,
  EmptyState,
  ErrorText,
  Field,
  PageTitle,
  Panel,
  TextArea,
} from '../components/ui/primitives'

function filterChip(label: string, value: string | number | null | undefined) {
  if (value == null || value === '') return null
  return (
    <span className="rounded-lg border border-sky/30 bg-sky/10 px-2.5 py-1 text-xs text-sky">
      {label}: {value}
    </span>
  )
}

function matchesIdea(idea: { category: string | null; estimated_cost: number | null; period: string | null; ambiance: string | null; title: string; description: string | null }, filters: IntentFilters) {
  if (filters.category && idea.category && idea.category.toLowerCase() !== filters.category.toLowerCase()) {
    // soft: also match if category word appears in title
    const hay = `${idea.title} ${idea.description ?? ''} ${idea.category}`.toLowerCase()
    if (!hay.includes(filters.category.toLowerCase()) && !(filters.query && hay.includes(filters.query.toLowerCase()))) {
      return false
    }
  }
  if (filters.max_price != null && idea.estimated_cost != null && idea.estimated_cost > filters.max_price) {
    return false
  }
  if (
    filters.period &&
    filters.period !== 'any' &&
    idea.period &&
    idea.period !== 'any' &&
    idea.period !== filters.period
  ) {
    return false
  }
  if (filters.ambiance && idea.ambiance && !idea.ambiance.toLowerCase().includes(filters.ambiance.toLowerCase())) {
    return false
  }
  if (filters.query) {
    const hay = `${idea.title} ${idea.description ?? ''} ${idea.category ?? ''}`.toLowerCase()
    const q = filters.query.toLowerCase()
    if (!hay.includes(q) && !(filters.category && hay.includes(filters.category.toLowerCase()))) {
      // keep idea if no query match but other filters already passed — soft match
      return Boolean(filters.category || filters.max_price || filters.period || filters.ambiance)
    }
  }
  return true
}

export function SuggestionsPage() {
  const { data: groupId } = useDefaultGroupId()
  const { data: ideas } = useIdeas(groupId)
  const createIdea = useCreateIdea()
  const createEvent = useCreateEvent()
  const navigate = useNavigate()

  const [prompt, setPrompt] = useState(
    'Somos 5 pessoas, queremos sair sábado à noite, comer alguma coisa e gastar até R$60 por pessoa.',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [filters, setFilters] = useState<IntentFilters | null>(null)
  const [places, setPlaces] = useState<PlaceSuggestion[]>([])
  const [source, setSource] = useState<{ intent: string; places: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const matchingIdeas = useMemo(() => {
    if (!filters || !ideas) return []
    return ideas.filter((idea) => matchesIdea(idea, filters)).slice(0, 6)
  }, [filters, ideas])

  async function onSuggest(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      const result = await getPlacesProvider().suggestFromPrompt(prompt.trim())
      setFilters(result.filters)
      setPlaces(result.places)
      setSource(result.source)
      if (result.message) setInfo(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao pedir sugestão')
      setPlaces([])
      setFilters(null)
    } finally {
      setLoading(false)
    }
  }

  async function saveAsIdea(place: PlaceSuggestion) {
    if (!groupId) return
    setBusyId(place.id)
    setError(null)
    try {
      await createIdea.mutateAsync({
        group_id: groupId,
        title: place.name,
        description: [place.address, place.url].filter(Boolean).join(' · ') || undefined,
        category: filters?.category || place.category?.split(',')[0] || undefined,
        estimated_cost: filters?.max_price ?? undefined,
        period: filters?.period ?? undefined,
        ambiance: filters?.ambiance ?? undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar ideia')
    } finally {
      setBusyId(null)
    }
  }

  async function createEventFromPlace(place: PlaceSuggestion) {
    if (!groupId) return
    setBusyId(place.id)
    setError(null)
    try {
      const start = new Date()
      start.setDate(start.getDate() + 3)
      if (filters?.period === 'morning') start.setHours(10, 0, 0, 0)
      else if (filters?.period === 'afternoon') start.setHours(15, 0, 0, 0)
      else start.setHours(19, 0, 0, 0)

      const event = await createEvent.mutateAsync({
        group_id: groupId,
        title: place.name,
        description: place.address ?? undefined,
        location_name: place.address ?? place.name,
        category: filters?.category || place.category?.split(',')[0] || undefined,
        start_at: start.toISOString(),
        notes: place.url ?? undefined,
      })
      navigate(`/agenda/${event.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar evento')
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle subtitle="IA interpreta o pedido; lugares vêm de API real (nunca inventados).">
        Pedir sugestão
      </PageTitle>

      <Panel>
        <form className="space-y-3" onSubmit={(e) => void onSuggest(e)}>
          <Field label="O que vocês querem fazer?">
            <TextArea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex.: Somos 5, sábado à noite, até R$60…"
              required
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" disabled={loading || !prompt.trim()}>
            {loading ? 'Pensando…' : 'Pedir sugestão'}
          </Button>
        </form>
      </Panel>

      {filters && (
        <Panel>
          <p className="text-xs uppercase tracking-widest text-sky/80">Filtros interpretados</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {filterChip('Categoria', filters.category)}
            {filterChip('Orçamento', filters.max_price != null ? `até R$ ${filters.max_price}` : null)}
            {filterChip('Pessoas', filters.group_size)}
            {filterChip(
              'Horário',
              filters.period ? PERIOD_LABELS[filters.period] : null,
            )}
            {filterChip('Ambiente', filters.ambiance)}
            {filterChip('Busca', filters.query)}
            {filterChip('Cidade', filters.city)}
            {!filters.category &&
              filters.max_price == null &&
              !filters.period &&
              !filters.ambiance &&
              !filters.query && (
                <span className="text-sm text-mist/60">Nenhum filtro claro — tente ser mais específico.</span>
              )}
          </div>
          {source && (
            <p className="mt-3 text-xs text-mist/50">
              Intent: {source.intent} · Lugares: {source.places}
            </p>
          )}
          {info && <p className="mt-2 text-sm text-mist/70">{info}</p>}
          <p className="mt-3 text-sm">
            <Link className="text-citrus underline" to="/sorteio">
              Usar filtros no sorteio →
            </Link>
          </p>
        </Panel>
      )}

      {places.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl text-foam">Lugares sugeridos</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {places.map((place) => (
              <li key={place.id}>
                <Panel>
                  <h3 className="font-display text-xl text-citrus">{place.name}</h3>
                  {place.category && (
                    <p className="mt-1 text-xs uppercase tracking-wide text-sky/70">
                      {place.category}
                    </p>
                  )}
                  {place.address && <p className="mt-2 text-sm text-mist/70">{place.address}</p>}
                  {place.url && (
                    <a
                      href={place.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-sm text-sky underline"
                    >
                      Site
                    </a>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={busyId === place.id}
                      onClick={() => void saveAsIdea(place)}
                    >
                      Salvar ideia
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busyId === place.id}
                      onClick={() => void createEventFromPlace(place)}
                    >
                      Criar evento
                    </Button>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
        </div>
      )}

      {filters && places.length === 0 && matchingIdeas.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl text-foam">Ideias do grupo que combinam</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {matchingIdeas.map((idea) => (
              <li key={idea.id}>
                <Panel>
                  <h3 className="font-display text-xl">{idea.title}</h3>
                  {idea.category && (
                    <p className="text-xs uppercase tracking-wide text-sky/70">{idea.category}</p>
                  )}
                  {idea.description && (
                    <p className="mt-2 text-sm text-mist/70">{idea.description}</p>
                  )}
                </Panel>
              </li>
            ))}
          </ul>
        </div>
      )}

      {filters && places.length === 0 && matchingIdeas.length === 0 && (
        <EmptyState
          title="Sem lugares externos nesta rodada."
          hint="Configure a Edge Function + PLACES_API_KEY, ou cadastre ideias alinhadas aos filtros."
        />
      )}
    </div>
  )
}
