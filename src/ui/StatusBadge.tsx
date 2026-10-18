import type { ItemStatus } from '../content/schema'

export const BADGE_COPY: Record<Exclude<ItemStatus, 'real'>, string> = {
  partial: 'IN DOCUMENTATION',
  'pending-content': 'AWAITING DATA',
  placeholder: 'PLACEHOLDER',
}

export function StatusBadge({ status, className = '' }: { status: ItemStatus; className?: string }) {
  if (status === 'real') return null
  return (
    <span className={`badge badge-${status} ${className}`} data-status={status}>
      {BADGE_COPY[status]}
    </span>
  )
}
