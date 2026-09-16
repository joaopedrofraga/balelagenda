import { useMemo, useState } from 'react'
import { useAuth } from '../features/auth/AuthProvider'
import type { OutingPeriod } from '../features/ai/types'
import { PERIOD_LABELS } from '../features/ai/types'
import {
  useCreateIdea,
  useDefaultGroupId,
  useIdeaVotes,
  useIdeas,
  useToggleIdeaVote,
} from '../lib/hooks'
import {
  Button,
  EmptyState,
  ErrorText,
  Field,
  Input,
  PageTitle,
  Panel,
  TextArea,
} from '../components/ui/primitives'

export function IdeasPage() {
  const { profile } = useAuth()
  const { data: groupId } = useDefaultGroupId()
  const { data: ideas, isLoading } = useIdeas(groupId)
  const { data: votes } = useIdeaVotes(groupId)
  const createIdea = useCreateIdea()
  const toggleVote = useToggleIdeaVote()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [period, setPeriod] = useState<'' | OutingPeriod>('')
  const [ambiance, setAmbiance] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterMaxCost, setFilterMaxCost] = useState('')
  const [error, setError] = useState<string | null>(null)

  const voteStats = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>()
    votes?.forEach((v) => {
      const cur = map.get(v.outing_idea_id) ?? { count: 0, mine: false }
      cur.count += 1
      if (v.user_id === profile?.id) cur.mine = true
      map.set(v.outing_idea_id, cur)
    })
    return map
  }, [votes, profile?.id])

  const sortedIdeas = useMemo(() => {
    if (!ideas) return []
    const maxCost = filterMaxCost ? Number(filterMaxCost) : null
    return [...ideas]
      .filter((idea) => {
        if (filterCategory && (idea.category ?? '').toLowerCase() !== filterCategory.toLowerCase()) {
          return false
        }
        if (maxCost != null && idea.estimated_cost != null && idea.estimated_cost > maxCost) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        const va = voteStats.get(a.id)?.count ?? 0
        const vb = voteStats.get(b.id)?.count ?? 0
        if (vb !== va) return vb - va
        return a.title.localeCompare(b.title)
      })
  }, [ideas, voteStats, filterCategory, filterMaxCost])

  const categories = useMemo(
    () =>
      Array.from(
        new Set((ideas ?? []).map((i) => i.category).filter((c): c is string => Boolean(c))),
      ).sort(),
    [ideas],
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!groupId) return
    setError(null)
    try {
      await createIdea.mutateAsync({
        group_id: groupId,
        title,
        description: description || undefined,
        category: category || undefined,
        estimated_cost: estimatedCost ? Number(estimatedCost) : undefined,
        period: period || undefined,
        ambiance: ambiance || undefined,
      })
      setTitle('')
      setDescription('')
      setCategory('')
      setEstimatedCost('')
      setPeriod('')
      setAmbiance('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar ideia')
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle subtitle="Ideias sem data — vote e até alguém marcar.">Ideias de rolê</PageTitle>

      <Panel>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          <div className="sm:col-span-2">
            <Field label="Título">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Boliche, Kart…" />
            </Field>
          </div>
          <Field label="Categoria">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="Orçamento estimado (R$)">
            <Input
              type="number"
              min={0}
              step={1}
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
          </Field>
          <Field label="Horário">
            <select
              className="w-full rounded-xl border border-mist/15 bg-panel px-3 py-2.5 text-foam outline-none ring-citrus/40 focus:ring-2"
              value={period}
              onChange={(e) => setPeriod(e.target.value as '' | OutingPeriod)}
            >
              <option value="">—</option>
              {(Object.keys(PERIOD_LABELS) as OutingPeriod[]).map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ambiente">
            <Input value={ambiance} onChange={(e) => setAmbiance(e.target.value)} placeholder="calmo, externo…" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descrição">
              <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
          {error && <div className="sm:col-span-2"><ErrorText>{error}</ErrorText></div>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createIdea.isPending}>
              Adicionar ideia
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <p className="mb-3 text-sm text-mist/70">Filtrar lista</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Categoria">
            <Input
              list="idea-filter-categories"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              placeholder="Todas"
            />
            <datalist id="idea-filter-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Orçamento máx. (R$)">
            <Input
              type="number"
              min={0}
              value={filterMaxCost}
              onChange={(e) => setFilterMaxCost(e.target.value)}
            />
          </Field>
        </div>
      </Panel>

      {isLoading && <p className="text-mist/60">Carregando…</p>}
      {!isLoading && sortedIdeas.length === 0 && (
        <EmptyState title="Nenhuma ideia ainda." hint="Joga uma sugestão aí." />
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {sortedIdeas.map((idea) => {
          const stats = voteStats.get(idea.id) ?? { count: 0, mine: false }
          return (
            <li key={idea.id}>
              <Panel>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl">{idea.title}</h2>
                    {idea.category && (
                      <p className="text-xs uppercase tracking-wide text-sky/70">{idea.category}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant={stats.mine ? 'primary' : 'ghost'}
                    className="shrink-0 px-3 py-2"
                    disabled={toggleVote.isPending}
                    onClick={() =>
                      void toggleVote.mutateAsync({ ideaId: idea.id, hasVoted: stats.mine })
                    }
                  >
                    ▲ {stats.count}
                  </Button>
                </div>
                {idea.description && <p className="mt-2 text-sm text-mist/70">{idea.description}</p>}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-mist/50">
                  {idea.estimated_cost != null && <span>~ R$ {idea.estimated_cost}</span>}
                  {idea.period && <span>{PERIOD_LABELS[idea.period] ?? idea.period}</span>}
                  {idea.ambiance && <span>{idea.ambiance}</span>}
                </div>
              </Panel>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
