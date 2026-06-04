import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/toast'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'login') {
        await signIn(email, password)
        toast('Bon retour !')
      } else {
        await signUp(email, password, name)
        toast('Compte créé ! Vérifiez vos e-mails.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      toast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-dark text-white font-display font-bold text-2xl shadow-lg">
            P
          </div>
          <h1 className="font-display text-3xl font-bold text-bark">Paperly</h1>
          <p className="mt-1 text-sm text-muted">Studio de direction créative</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-sand/60 bg-white p-7 shadow-sm">
          <h2 className="mb-5 font-display text-xl font-bold text-bark">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Nom complet"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Sacha Guez"
                required
              />
            )}
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@paperly.com"
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="********"
              required
              minLength={6}
            />
            <Button variant="primary" className="w-full" type="submit" disabled={loading}>
              {loading ? 'Chargement...' : mode === 'login' ? 'Connexion' : 'Créer un compte'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-xs text-muted hover:text-gold-dark transition-colors"
            >
              {mode === 'login' ? "Pas encore de compte ? Inscrivez-vous" : 'Déjà un compte ? Connectez-vous'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
