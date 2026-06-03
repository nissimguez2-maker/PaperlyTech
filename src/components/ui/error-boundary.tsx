import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Filet de sécurité global : capture toute exception de rendu et affiche un
 * écran d'erreur premium au lieu d'un écran blanc (cf. audit C4).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Paperly — erreur de rendu :', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-cream p-6">
          <div className="max-w-md text-center">
            <h1 className="mb-2 font-display text-2xl text-bark">Une erreur est survenue</h1>
            <p className="mb-6 text-sm text-muted">
              L'application a rencontré un problème inattendu. Rechargez la page pour continuer —
              vos données sont en sécurité.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-gold-dark px-4 py-2 text-sm font-medium text-white"
            >
              Recharger
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
