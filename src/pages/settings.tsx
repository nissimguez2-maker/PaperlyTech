import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

export function SettingsPage() {
  const { user } = useAuth()

  return (
    <div>
      <PageHeader title="Réglages" subtitle="Configuration du studio" />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardTitle>Informations du studio</CardTitle>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nom du studio" defaultValue="Paperly" />
            <Input label="E-mail de contact" defaultValue={user?.email ?? ''} />
            <Input label="Téléphone" placeholder="+972 ..." />
            <Input label="Devise" defaultValue="₪ (ILS)" disabled />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" disabled>Enregistrer (bientôt)</Button>
          </div>
        </Card>

        <Card>
          <CardTitle>Export PDF</CardTitle>
          <p className="mt-2 text-sm text-muted">
            Personnalisez l'apparence de vos devis exportés.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nom affiché sur le PDF" defaultValue="Paperly" />
            <Input label="Nom du contact" defaultValue="Sacha Guez" />
            <Input label="E-mail sur le PDF" defaultValue="" placeholder="contact@paperly.com" />
            <Input label="Téléphone sur le PDF" defaultValue="" placeholder="+972 ..." />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" disabled>Enregistrer (bientôt)</Button>
          </div>
        </Card>

        <Card>
          <CardTitle>Données</CardTitle>
          <p className="mt-2 text-sm text-muted">
            Exportez ou gérez les données de votre activité.
          </p>
          <div className="mt-4 flex gap-3">
            <Button variant="secondary" disabled>Exporter en JSON (bientôt)</Button>
            <Button variant="secondary" disabled>Exporter en Excel (bientôt)</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
