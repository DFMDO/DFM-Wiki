import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ToastContextValue {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setMessage(msg)
    window.clearTimeout((showToast as any)._t)
    ;(showToast as any)._t = window.setTimeout(() => setMessage(null), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-neutral-900 border border-neutral-700 text-white text-sm px-4 py-2.5 rounded-lg shadow-2xl fade-in max-w-[90%] text-center">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast muss innerhalb von <ToastProvider> verwendet werden')
  return ctx
}
