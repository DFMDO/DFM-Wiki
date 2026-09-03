import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types/database'

export function ProtectedRoute({
  children,
  allowedRoles
}: {
  children: ReactNode
  allowedRoles?: Role[]
}) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <div className="p-8 text-center text-neutral-400">Lädt …</div>
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="p-8 text-center text-neutral-400">
        Du hast keine Berechtigung, diesen Bereich zu sehen.
      </div>
    )
  }
  return <>{children}</>
}
