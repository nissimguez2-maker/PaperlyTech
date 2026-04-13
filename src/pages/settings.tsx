import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

export function SettingsPage() {
  const { user } = useAuth()

  return (
    <div>
      <PageHeader title="Settings" subtitle="Studio configuration" />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardTitle>Studio Information</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Input label="Studio Name" defaultValue="Paperly" />
            <Input label="Contact Email" defaultValue={user?.email ?? ''} />
            <Input label="Phone" placeholder="+972 ..." />
            <Input label="Currency" defaultValue="NIS  (ILS)" disabled />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary">Save Changes</Button>
          </div>
        </Card>

        <Card>
          <CardTitle>PDF Export</CardTitle>
          <p className="mt-2 text-sm text-muted">
            Customize the look of your exported quotes and invoices.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Input label="Business Name on PDF" defaultValue="Paperly" />
            <Input label="Contact Name" defaultValue="Sacha Guez" />
            <Input label="Email on PDF" defaultValue="" placeholder="contact@paperly.com" />
            <Input label="Phone on PDF" defaultValue="" placeholder="+972 ..." />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary">Save Changes</Button>
          </div>
        </Card>

        <Card>
          <CardTitle>Data Management</CardTitle>
          <p className="mt-2 text-sm text-muted">
            Export or manage your business data.
          </p>
          <div className="mt-4 flex gap-3">
            <Button variant="secondary">Export All Data (JSON)</Button>
            <Button variant="secondary">Export to Excel</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
