import { useState } from 'react'
import { signIn, updateUserPassword } from '../services/db'

const SESSION_KEY = 'chansonette_user'

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}
export function clearSession() { localStorage.removeItem(SESSION_KEY) }

function ChangePassword({ user, onDone }) {
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (newPass.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (newPass !== confirm)  { setError('Passwords do not match.'); return }
    setSaving(true)
    try {
      await updateUserPassword(newPass)
      onDone({ ...user, mustChangePassword: false })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally { setSaving(false) }
  }

  return (
    <div className="page">
      <h2>Chansonette Farm</h2>
      <p className="page-subtitle">Set Your Password</p>
      <div className="login-form-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <p style={{ opacity: 0.75, marginBottom: '1.5rem', fontSize: '0.9rem', fontFamily: 'Arial, sans-serif' }}>
            Welcome, {user.name}. Please choose a new password to continue.
          </p>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={newPass} onChange={e => { setNewPass(e.target.value); setError('') }} required placeholder="At least 6 characters" />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} required placeholder="Repeat password" />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Login({ onLogin }) {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [pendingUser, setPendingUser] = useState(null)
  const [step,        setStep]        = useState('credentials') // 'credentials' | 'change-password'

  function completeLogin(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    onLogin(user)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await signIn(email, password)
      if (!user) { setError('Account not found. Please contact an admin.'); return }
      if (user.mustChangePassword) {
        setPendingUser(user)
        setStep('change-password')
      } else {
        completeLogin(user)
      }
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (step === 'change-password' && pendingUser) {
    return <ChangePassword user={pendingUser} onDone={completeLogin} />
  }

  return (
    <div className="page" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <h2 style={{ fontSize: 'clamp(1.2rem, 6vw, 1.7rem)', whiteSpace: 'nowrap' }}>Chansonette Farm</h2>
      <p className="page-subtitle">Barn Management Portal</p>
      <div className="login-form-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <p style={{ opacity: 0.75, marginBottom: '1.5rem', fontSize: '0.9rem', fontFamily: 'Arial, sans-serif' }}>
            Sign in to access the portal.
          </p>
          <div className="form-group">
            <label>Email or Username</label>
            <input type="text" value={email} onChange={e => { setEmail(e.target.value); setError('') }} required placeholder="email or username" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} required placeholder="Password" />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
