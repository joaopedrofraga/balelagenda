import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../features/auth/AuthProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { AppLayout } from '../components/layout/AppLayout'
import { RequireAuth } from './RequireAuth'
import { HomePage } from '../pages/HomePage'
import { AgendaPage } from '../pages/AgendaPage'
import { EventDetailPage } from '../pages/EventDetailPage'
import { IdeasPage } from '../pages/IdeasPage'
import { RandomOutingPage } from '../pages/RandomOutingPage'
import { MemoriesPage } from '../pages/MemoriesPage'
import { SuggestionsPage } from '../pages/SuggestionsPage'
import { StatsPage } from '../pages/StatsPage'
import { NotificationsPage } from '../pages/NotificationsPage'
import { GroupPage } from '../pages/GroupPage'
import { ProfilePage } from '../pages/ProfilePage'
import { AdminPage } from '../pages/AdminPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1 },
  },
})

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="agenda/:id" element={<EventDetailPage />} />
                <Route path="ideias" element={<IdeasPage />} />
                <Route path="sorteio" element={<RandomOutingPage />} />
                <Route path="sugestoes" element={<SuggestionsPage />} />
                <Route path="memorias" element={<MemoriesPage />} />
                <Route path="estatisticas" element={<StatsPage />} />
                <Route path="notificacoes" element={<NotificationsPage />} />
                <Route path="grupo" element={<GroupPage />} />
                <Route path="perfil" element={<ProfilePage />} />
                <Route path="admin" element={<AdminPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
