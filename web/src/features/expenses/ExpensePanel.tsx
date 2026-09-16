import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  useAttendees,
  useCreateExpense,
  useDeleteExpense,
  useEventExpenses,
  useGroupMembers,
} from '../../lib/hooks'
import { Button, ErrorText, Field, Input, Panel } from '../../components/ui/primitives'
import { UserAvatar } from '../../components/UserAvatar'

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function ExpensePanel({
  eventId,
  groupId,
}: {
  eventId: string
  groupId: string
}) {
  const { profile } = useAuth()
  const { data: expenses } = useEventExpenses(eventId)
  const { data: attendees } = useAttendees(eventId)
  const { data: members } = useGroupMembers(groupId)
  const createExpense = useCreateExpense(eventId)
  const deleteExpense = useDeleteExpense(eventId)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [openForm, setOpenForm] = useState(false)

  const people = useMemo(() => {
    const fromGoing =
      attendees
        ?.filter((a) => a.status === 'going')
        .map((a) => ({
          id: a.user_id,
          name: a.profiles?.name ?? a.user_id,
        })) ?? []
    if (fromGoing.length > 0) return fromGoing
    return (
      members?.map((m) => ({
        id: m.user_id,
        name: m.profiles?.name ?? m.user_id,
      })) ?? []
    )
  }, [attendees, members])

  const totals = useMemo(() => {
    const list = expenses ?? []
    const total = list.reduce((sum, e) => sum + Number(e.amount), 0)
    const byUser = new Map<string, { name: string; owes: number; paid: number }>()

    for (const expense of list) {
      const paidName = expense.profiles?.name ?? 'Alguém'
      const paid = byUser.get(expense.paid_by) ?? { name: paidName, owes: 0, paid: 0 }
      paid.paid += Number(expense.amount)
      paid.name = paidName
      byUser.set(expense.paid_by, paid)

      const parts = expense.expense_participants ?? []
      for (const part of parts) {
        const row = byUser.get(part.user_id) ?? {
          name: part.profiles?.name ?? 'Alguém',
          owes: 0,
          paid: 0,
        }
        row.owes += Number(part.share_amount ?? 0)
        if (part.profiles?.name) row.name = part.profiles.name
        byUser.set(part.user_id, row)
      }
    }

    return {
      total,
      balances: [...byUser.entries()].map(([id, v]) => ({
        id,
        name: v.name,
        net: Math.round((v.paid - v.owes) * 100) / 100,
      })),
    }
  }, [expenses])

  function togglePerson(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const value = Number(amount.replace(',', '.'))
      await createExpense.mutateAsync({
        description,
        amount: value,
        participantIds: selected.length > 0 ? selected : people.map((p) => p.id),
      })
      setDescription('')
      setAmount('')
      setSelected([])
      setOpenForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar despesa')
    }
  }

  return (
    <Panel className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl">Despesas</h2>
          <p className="text-sm text-mist/70">
            Total: {formatMoney(totals.total)} · {(expenses ?? []).length} lançamento(s)
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={() => setOpenForm((v) => !v)}>
          {openForm ? 'Fechar' : 'Adicionar'}
        </Button>
      </div>

      {openForm && (
        <form className="space-y-3 rounded-xl border border-mist/10 bg-ink/30 p-3" onSubmit={onSubmit}>
          <Field label="Descrição">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Carne, bebida, Uber…"
              required
            />
          </Field>
          <Field label="Valor (R$)">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="120,00"
              required
            />
          </Field>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mist/70">
              Quem divide (vazio = todos da lista)
            </p>
            <div className="flex flex-wrap gap-2">
              {people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePerson(p.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    selected.includes(p.id)
                      ? 'bg-citrus text-ink'
                      : 'border border-mist/20 text-mist hover:border-citrus/50'
                  }`}
                >
                  {p.name}
                </button>
              ))}
              {people.length === 0 && (
                <p className="text-sm text-mist/60">Confirme presença ou cadastre membros no grupo.</p>
              )}
            </div>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" disabled={createExpense.isPending}>
            {createExpense.isPending ? 'Salvando…' : 'Salvar despesa'}
          </Button>
        </form>
      )}

      {totals.balances.length > 0 && (
        <ul className="space-y-1 text-sm text-mist/80">
          {totals.balances.map((b) => (
            <li key={b.id}>
              {b.name}:{' '}
              <span className={b.net >= 0 ? 'text-sky' : 'text-coral'}>
                {b.net >= 0 ? `a receber ${formatMoney(b.net)}` : `deve ${formatMoney(Math.abs(b.net))}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <ul className="space-y-3">
        {(expenses ?? []).map((expense) => (
          <li key={expense.id} className="rounded-xl border border-mist/10 bg-ink/30 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foam">{expense.description}</p>
                <p className="text-sm text-mist/80">{formatMoney(Number(expense.amount))}</p>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-mist/50">
                  <span>Pago por</span>
                  <UserAvatar
                    name={expense.profiles?.name}
                    avatarPath={expense.profiles?.avatar_path}
                    size="xs"
                  />
                  <span>
                    {expense.profiles?.name ?? 'alguém'} · divide com{' '}
                    {(expense.expense_participants ?? [])
                      .map((p) => p.profiles?.name ?? 'alguém')
                      .join(', ') || '—'}
                  </span>
                </p>
              </div>
              {(expense.paid_by === profile?.id) && (
                <Button
                  type="button"
                  variant="ghost"
                  className="px-2 py-1 text-xs"
                  onClick={() => void deleteExpense.mutateAsync(expense.id)}
                >
                  Apagar
                </Button>
              )}
            </div>
          </li>
        ))}
        {expenses && expenses.length === 0 && (
          <p className="text-sm text-mist/60">Nenhuma despesa ainda. Registre o rateio do rolê.</p>
        )}
      </ul>
    </Panel>
  )
}
