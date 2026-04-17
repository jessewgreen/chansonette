import { useState, useEffect } from 'react'
import { getUsers, updateUserRole, updateUserAdditionalRoles } from '../services/db'

const ROLE_OPTIONS = [
  { value: 'admin',        label: 'Administrator' },
  { value: 'barn_manager', label: 'Barn Manager' },
  { value: 'rider',        label: 'Rider' },
  { value: 'groom',        label: 'Groom' },
]

const EXTRA_ROLES = ['admin', 'barn_manager', 'rider', 'groom']

function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card" style={{ maxWidth: '640px', marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0.9rem 1.25rem',
          color: 'var(--gold)', fontFamily: 'Georgia', fontWeight: 'normal',
          fontSize: '1.05rem', letterSpacing: '0.04em',
        }}
      >
        {title}
        <span style={{ fontSize: '1.4rem', color: 'var(--gold)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', lineHeight: 1 }}>
          ▾
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 1.25rem 1.1rem' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function Admin({ user, onNavigate }) {
  const [users,        setUsers]        = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [savingRole,   setSavingRole]   = useState(null)
  const [roleMsg,      setRoleMsg]      = useState('')
  const [savingExtra,  setSavingExtra]  = useState(null)

  const PINNED = ['lillie.keenan@gmail.com', 'pam.keenan@gmail.com']
  const ROLE_ORDER = { admin: 0, barn_manager: 1, rider: 2, groom: 3 }

  const LAST = ['jesse.green', 'jesse green']

  function sortUsers(list) {
    return [...list].sort((a, b) => {
      const aLast = LAST.some(p => a.id?.toLowerCase().includes(p) || a.name?.toLowerCase().includes(p))
      const bLast = LAST.some(p => b.id?.toLowerCase().includes(p) || b.name?.toLowerCase().includes(p))
      if (aLast && !bLast) return 1
      if (!aLast && bLast) return -1
      const aPin = PINNED.indexOf(a.id)
      const bPin = PINNED.indexOf(b.id)
      if (aPin !== -1 || bPin !== -1) {
        if (aPin === -1) return 1
        if (bPin === -1) return -1
        return aPin - bPin
      }
      return (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99)
    })
  }

  useEffect(() => {
    getUsers().then(u => setUsers(sortUsers(u))).catch(() => {}).finally(() => setLoadingUsers(false))
  }, [])

  async function handleRoleChange(email, role) {
    setSavingRole(email)
    setRoleMsg('')
    try {
      await updateUserRole(email, role)
      setUsers(prev => prev.map(u => u.id === email ? { ...u, role } : u))
      setRoleMsg(`Updated ${email}`)
    } catch {
      setRoleMsg('Something went wrong.')
    } finally {
      setSavingRole(null)
    }
  }

  async function handleToggleExtraRole(email, extraRole, currentExtras) {
    const next = currentExtras.includes(extraRole)
      ? currentExtras.filter(r => r !== extraRole)
      : [...currentExtras, extraRole]
    setSavingExtra(email)
    try {
      await updateUserAdditionalRoles(email, next)
      setUsers(prev => prev.map(u => u.id === email ? { ...u, additionalRoles: next } : u))
    } catch {
      setRoleMsg('Something went wrong.')
    } finally {
      setSavingExtra(null)
    }
  }

  return (
    <div className="page">
      <h2>Admin</h2>
      <p className="page-subtitle">System Administration</p>

      <Section title="Staff List">
        {loadingUsers ? (
          <p style={{ fontFamily: 'Arial', fontSize: '0.875rem', opacity: 0.6 }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {users.map(u => {
              const allRoles = [u.role, ...(u.additionalRoles || [])]
              const dispRole = allRoles.includes('rider') ? 'rider'
                : u.role !== 'admin' ? u.role
                : allRoles.find(r => r !== 'admin') || 'admin'
              const BADGE_LABELS = { barn_manager: 'Barn Mgr', admin: 'Admin', rider: 'Rider', groom: 'Groom' }
              const badgeClass = dispRole === 'barn_manager' ? 'badge-gold' : dispRole === 'rider' ? 'badge-blue' : 'badge-green'
              const roleLabel = BADGE_LABELS[dispRole] || ROLE_OPTIONS.find(o => o.value === dispRole)?.label || dispRole
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'Arial', fontSize: '0.875rem', width: '160px', flexShrink: 0 }}>{u.name}</span>
                  <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)', width: '200px', flexShrink: 0 }}>{u.id}</span>
                  <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)', width: '130px', flexShrink: 0 }}>{u.phone || '—'}</span>
                  <span className={`badge ${badgeClass}`}>{roleLabel}</span>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="User Roles">
        {loadingUsers ? (
          <p style={{ fontFamily: 'Arial', fontSize: '0.875rem', opacity: 0.6 }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {users.map(u => {
              const extras = u.additionalRoles || []
              return (
                <div key={u.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'Arial', fontSize: '0.875rem', flex: 1, minWidth: '160px' }}>{u.name}</span>
                    <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '180px' }}>{u.id}</span>
                    <select
                      value={u.role}
                      disabled={savingRole === u.id}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      style={{
                        background: 'var(--surface)', color: 'var(--gold)',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        padding: '0.3rem 0.6rem', fontFamily: 'Arial', fontSize: '0.8rem', cursor: 'pointer',
                      }}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingLeft: '0.25rem' }}>
                    <span style={{ fontFamily: 'Arial', fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Also:</span>
                    {EXTRA_ROLES.filter(r => r !== u.role).map(r => {
                      const checked = extras.includes(r)
                      return (
                        <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', opacity: savingExtra === u.id ? 0.5 : 1 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={savingExtra === u.id}
                            onChange={() => handleToggleExtraRole(u.id, r, extras)}
                            style={{ accentColor: 'var(--gold)' }}
                          />
                          <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: checked ? 'var(--gold)' : 'var(--text-muted)' }}>
                            {ROLE_OPTIONS.find(o => o.value === r)?.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {roleMsg && <p style={{ fontFamily: 'Arial', fontSize: '0.8rem', color: 'var(--gold)', marginTop: '0.75rem' }}>{roleMsg}</p>}
      </Section>

    </div>
  )
}
