import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCreateEvent, useDefaultGroupId, useDrawIdea, useIdeas } from '../lib/hooks'
import type { OutingPeriod } from '../features/ai/types'
import { PERIOD_LABELS } from '../features/ai/types'
import type { OutingIdea } from '../types/database'
import { Button, EmptyState, ErrorText, Field, Input, PageTitle, Panel } from '../components/ui/primitives'

export function RandomOutingPage() {
  const { data: groupId } = useDefaultGroupId()
  const { data: ideas } = useIdeas(groupId)
  const draw = useDrawIdea()
  const createEvent = useCreateEvent()
  const navigate = useNavigate()
  const [drawn, setDrawn] = useState<OutingIdea | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [maxCost, setMaxCost] = useState('')
  const [period, setPeriod] = useState<'' | OutingPeriod>('')
  const [ambiance, setAmbiance] = useState('')
  const [avoidRecent, setAvoidRecent] = useState(true)

  const categories = Array.from(
    new Set((ideas ?? []).map((i) => i.category).filter((c): c is string => Boolean(c))),
  ).sort()

  async function onDraw() {
    if (!groupId) return
    setError(null)
    try {
      const idea = await draw.mutateAsync({
        groupId,
        category: category || undefined,
        maxCost: maxCost ? Number(maxCost) : undefined,
        period: period || undefined,
        ambiance: ambiance || undefined,
        avoidRecentDays: avoidRecent ? 30 : 0,
      })
      setDrawn(idea)
    } catch (err) {
      setDrawn(null)
      setError(err instanceof Error ? err.message : 'Não foi possível sortear')
    }
  }

  async function onCreateEvent() {
    if (!groupId || !drawn) return
    setError(null)
    try {
      const start = new Date()
      start.setDate(start.getDate() + 3)
      if (drawn.period === 'morning') start.setHours(10, 0, 0, 0)
      else if (drawn.period === 'afternoon') start.setHours(15, 0, 0, 0)
      else start.setHours(19, 0, 0, 0)

      const event = await createEvent.mutateAsync({
        group_id: groupId,
        title: drawn.title,
        category: drawn.category ?? undefined,
        description: drawn.description ?? undefined,
        start_at: start.toISOString(),
      })
      navigate(`/agenda/${event.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar evento')
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle subtitle="Sem ideia do que fazer?">Rolê aleatório</PageTitle>

      <Panel>
        <p className="text-sm text-mist/70">Filtros inteligentes (opcionais)</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Categoria">
            <Input
              list="draw-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="comida, bar…"
            />
            <datalist id="draw-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Orçamento máx. (R$)">
            <Input
              type="number"
              min={0}
              step={1}
              value={maxCost}
              onChange={(e) => setMaxCost(e.target.value)}
              placeholder="60"
            />
          </Field>
          <Field label="Horário">
            <select
              className="w-full rounded-xl border border-mist/15 bg-panel px-3 py-2.5 text-foam outline-none ring-citrus/40 focus:ring-2"
              value={period}
              onChange={(e) => setPeriod(e.target.value as '' | OutingPeriod)}
            >
              <option value="">Qualquer</option>
              {(Object.keys(PERIOD_LABELS) as OutingPeriod[]).map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ambiente">
            <Input
              value={ambiance}
              onChange={(e) => setAmbiance(e.target.value)}
              placeholder="calmo, externo…"
            />
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-mist/80">
          <input
            type="checkbox"
            checked={avoidRecent}
            onChange={(e) => setAvoidRecent(e.target.checked)}
            className="accent-citrus"
          />
          Evitar repetir rolês dos últimos 30 dias
        </label>
        <p className="mt-2 text-xs text-mist/50">
          Quer filtros a partir de texto livre?{' '}
          <Link className="text-citrus underline" to="/sugestoes">
            Pedir sugestão
          </Link>
        </p>
      </Panel>

      <Panel className="text-center">
        <p className="text-mist/70">Sorteia entre as ideias ativas do grupo.</p>
        <div className="mt-4">
          <Button type="button" onClick={() => void onDraw()} disabled={draw.isPending}>
            {draw.isPending ? 'Girando…' : 'Sortear rolê'}
          </Button>
        </div>
        {error && (
          <div className="mt-4">
            <ErrorText>{error}</ErrorText>
            {error.toLowerCase().includes('nenhuma') && (
              <p className="mt-2 text-sm">
                <Link className="text-citrus underline" to="/ideias">
                  Cadastrar ideias
                </Link>
                {' · '}
                <Link className="text-citrus underline" to="/sugestoes">
                  Pedir sugestão
                </Link>
              </p>
            )}
          </div>
        )}
      </Panel>

      {drawn ? (
        <Panel className="text-center">
          <p className="text-xs uppercase tracking-widest text-sky/80">Deu</p>
          <h2 className="mt-2 font-display text-4xl text-citrus">{drawn.title}</h2>
          {drawn.category && <p className="mt-1 text-mist/60">{drawn.category}</p>}
          <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs text-mist/50">
            {drawn.estimated_cost != null && <span>~ R$ {drawn.estimated_cost}</span>}
            {drawn.period && <span>{PERIOD_LABELS[drawn.period] ?? drawn.period}</span>}
            {drawn.ambiance && <span>{drawn.ambiance}</span>}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => void onCreateEvent()} disabled={createEvent.isPending}>
              Criar evento
            </Button>
            <Button type="button" variant="ghost" onClick={() => void onDraw()}>
              Sortear novamente
            </Button>
          </div>
        </Panel>
      ) : (
        !error && <EmptyState title="Ainda sem sorteio." hint="Aperte o botão e deixa o destino decidir." />
      )}
    </div>
  )
}
