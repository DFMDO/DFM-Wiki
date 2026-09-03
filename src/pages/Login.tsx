import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Login() {
  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      navigate('/')
    }
  }

  async function handleReset() {
    if (!email) {
      setError('Bitte zuerst E-Mail-Adresse eintragen.')
      return
    }
    const { error } = await resetPassword(email)
    setError(error)
    if (!error) setInfo('Falls diese Adresse registriert ist, wurde eine E-Mail zum Zurücksetzen versendet.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-neutral-100 p-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-neutral-900/80 backdrop-blur border border-neutral-800 rounded-2xl p-7 shadow-2xl relative fade-in"
      >
        <div className="flex flex-col items-center mb-6">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="w-14 h-14 object-contain mb-3" />
          <h1 className="text-lg font-bold text-center">Museum Wiki</h1>
          <p className="text-xs text-neutral-500 text-center">Internes Wissenssystem</p>
        </div>

        <label className="block text-xs text-neutral-400 mb-1">E-Mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60 transition"
        />

        <label className="block text-xs text-neutral-400 mb-1">Passwort</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60 transition"
        />

        {error && <p className="text-sm text-accent mb-3">{error}</p>}
        {info && <p className="text-sm text-green-400 mb-3">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-dark active:scale-[0.98] transition font-bold text-sm mb-3 shadow-lg shadow-accent/20"
        >
          {loading ? 'Wird angemeldet …' : 'Anmelden'}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="w-full text-xs text-neutral-500 hover:text-neutral-300 transition"
        >
          Passwort vergessen?
        </button>
      </form>
    </div>
  )
}
