import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { useDefaultGroupId, useEvents } from '../lib/hooks'
import { Button, EmptyState, PageTitle, Panel } from '../components/ui/primitives'

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function HomePage() {
  const { profile, isAdmin } = useAuth()
  const { data: groupId } = useDefaultGroupId()
  const { data: events, isLoading } = useEvents(groupId)
  const next = events?.find((e) => e.status !== 'cancelled' && new Date(e.start_at) >= new Date())

  return (
    <div className="space-y-6">
      <PageTitle subtitle="O próximo encontro do grupo, sem caos no zap.">
        Início
      </PageTitle>

      <Panel>
        {isLoading && <p className="text-mist/60">Carregando…</p>}
        {!isLoading && !next && (
          <EmptyState title="Nenhum evento marcado ainda." hint="Que tal criar o primeiro ou pedir uma sugestão?" />
        )}
        {next && (
          <div>
            <p className="text-xs uppercase tracking-widest text-sky/80">Próximo rolê</p>
            <h2 className="mt-1 font-display text-3xl text-foam">{next.title}</h2>
            <p className="mt-2 text-mist/80">{formatWhen(next.start_at)}</p>
            {next.location_name && <p className="text-mist/60">{next.location_name}</p>}
          </div>
        )}
        {!isLoading && (
          <div className={`flex flex-wrap gap-2 ${next ? 'mt-4' : 'mt-4 justify-center'}`}>
            {next && (
              <Link to={`/agenda/${next.id}`}>
                <Button>Ver evento</Button>
              </Link>
            )}
            <Link to="/sorteio">
              <Button variant={next ? 'ghost' : 'primary'}>Sortear rolê</Button>
            </Link>
            <Link to="/sugestoes">
              <Button variant="ghost">Pedir sugestão</Button>
            </Link>
          </div>
        )}
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/agenda" className="rounded-2xl border border-mist/10 bg-panel/50 p-4 hover:border-citrus/40">
          <p className="font-display text-xl">Agenda</p>
          <p className="text-sm text-mist/60">Criar e ver eventos</p>
        </Link>
        <Link to="/ideias" className="rounded-2xl border border-mist/10 bg-panel/50 p-4 hover:border-citrus/40">
          <p className="font-display text-xl">Ideias</p>
          <p className="text-sm text-mist/60">Banco de rolês futuros</p>
        </Link>
        <Link to="/sugestoes" className="rounded-2xl border border-mist/10 bg-panel/50 p-4 hover:border-citrus/40">
          <p className="font-display text-xl">Sugestões</p>
          <p className="text-sm text-mist/60">IA + busca de lugares</p>
        </Link>
        <Link to="/memorias" className="rounded-2xl border border-mist/10 bg-panel/50 p-4 hover:border-citrus/40">
          <p className="font-display text-xl">Memórias</p>
          <p className="text-sm text-mist/60">Timeline e fotos dos rolês</p>
        </Link>
        <Link to="/estatisticas" className="rounded-2xl border border-mist/10 bg-panel/50 p-4 hover:border-citrus/40">
          <p className="font-display text-xl">Estatísticas</p>
          <p className="text-sm text-mist/60">Números e badges do grupo</p>
        </Link>
        <Link to="/notificacoes" className="rounded-2xl border border-mist/10 bg-panel/50 p-4 hover:border-citrus/40">
          <p className="font-display text-xl">Avisos</p>
          <p className="text-sm text-mist/60">O que rolou enquanto você estava offline</p>
        </Link>
        <Link to="/grupo" className="rounded-2xl border border-mist/10 bg-panel/50 p-4 hover:border-citrus/40">
          <p className="font-display text-xl">Grupo</p>
          <p className="text-sm text-mist/60">Quem está na balela</p>
        </Link>
        {isAdmin && (
          <Link to="/admin" className="rounded-2xl border border-mist/10 bg-panel/50 p-4 hover:border-citrus/40">
            <p className="font-display text-xl">Administração</p>
            <p className="text-sm text-mist/60">Usuários e convites · {profile?.username}</p>
          </Link>
        )}
      </div>
    </div>
  )
}
