import { Modal } from './modal'
import { Button } from './button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} width="sm">
      <div className="flex flex-col items-center text-center">
        <div className={`mb-4 rounded-full p-3 ${danger ? 'bg-coral-bg' : 'bg-navy-bg'}`}>
          <AlertTriangle size={24} className={danger ? 'text-coral' : 'text-navy'} />
        </div>
        <h3 className="mb-2 font-display text-xl font-bold text-bark">{title}</h3>
        <p className="mb-6 text-sm text-muted">{message}</p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => { onConfirm(); onClose() }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
