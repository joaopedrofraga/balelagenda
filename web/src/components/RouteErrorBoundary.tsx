import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/primitives'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

/**
 * Impede que um crash numa rota derrube o AppLayout inteiro (tela 100% em branco).
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, info.componentStack)
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="space-y-4 rounded-2xl border border-coral/30 bg-panel/70 p-6">
        <h1 className="font-display text-2xl text-foam">Algo quebrou nesta tela</h1>
        <p className="text-sm text-mist/70">
          O restante do app continua ok. Tente de novo; se repetir, recarregue a página.
        </p>
        <p className="break-words font-mono text-xs text-coral/90">{error.message}</p>
        <Button type="button" variant="ghost" onClick={this.handleRetry}>
          Tentar novamente
        </Button>
      </div>
    )
  }
}
