import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  hint,
  action
}: {
  icon: string
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-bold text-neutral-300 mb-1">{title}</div>
      {hint && <div className="text-sm text-neutral-500 max-w-xs mx-auto">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
