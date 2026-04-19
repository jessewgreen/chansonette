import { useState, useEffect } from 'react'
import { createUser, deleteUser, getUsers, updateUserProfile, updateUserRole, updateUserAdditionalRoles } from '../services/db'

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
    <div className="card" style={{ width: '100%', maxWidth: '940px', marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
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

export default function Admin({ user, onNavigate, navigateToResource }) {
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

  const [staffShowForm, setStaffShowForm] = useState(false)
  const [staffEditingId, setStaffEditingId] = useState(null)
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'groom', phone: '', homePhone: '', cell: '', address: '' })
  const [staffEditForm, setStaffEditForm] = useState({ name: '', email: '', phone: '', homePhone: '', cell: '', address: '', role: 'groom' })
  const [staffSaving, setStaffSaving] = useState(false)
  const [staffError, setStaffError] = useState('')

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

  async function handleAddStaff(e) {
    e.preventDefault()
    setStaffSaving(true)
    setStaffError('')
    try {
      await createUser(staffForm)
      const updated = await getUsers()
      setUsers(sortUsers(updated))
      setStaffForm({ name: '', email: '', password: '', role: 'groom', phone: '', homePhone: '', cell: '', address: '' })
      setStaffShowForm(false)
    } catch {
      setStaffError('Failed to add staff member. Email may already be in use.')
    } finally {
      setStaffSaving(false)
    }
  }

  function openStaffEdit(u) {
    setStaffEditingId(u.id)
    setStaffEditForm({ name: u.name || '', email: u.email || u.id || '', phone: u.phone || '', homePhone: u.homePhone || '', cell: u.cell || '', address: u.address || '', role: u.role || 'groom' })
  }

  async function handleSaveStaffEdit(e) {
    e.preventDefault()
    setStaffSaving(true)
    try {
      await updateUserProfile(staffEditingId, { name: staffEditForm.name, phone: staffEditForm.phone, homePhone: staffEditForm.homePhone, cell: staffEditForm.cell, address: staffEditForm.address, role: staffEditForm.role })
      setUsers(prev => prev.map(u => u.id === staffEditingId ? { ...u, ...staffEditForm } : u))
      setStaffEditingId(null)
    } finally {
      setStaffSaving(false)
    }
  }

  async function handleDeleteStaff(email, name) {
    if (!window.confirm(`Remove ${name}?`)) return
    await deleteUser(email)
    setUsers(prev => prev.filter(u => u.id !== email))
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <h2>Admin</h2>
          <p className="page-subtitle">System Administration</p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (navigateToResource) {
              navigateToResource('staff')
            } else {
              onNavigate?.('packinglist')
            }
          }}
          style={{ whiteSpace: 'nowrap' }}
        >
          View Staff Page
        </button>
      </div>

      <Section title="Staff List">
        {loadingUsers ? (
          <p style={{ fontFamily: 'Arial', fontSize: '0.875rem', opacity: 0.6 }}>Loading…</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <p style={{ margin: 0, fontFamily: 'Arial', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Add, edit, or remove staff users from the system.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setStaffShowForm(v => !v)}>{staffShowForm ? 'Close Add Staff' : '+ Add Staff'}</button>
            </div>

            {staffShowForm && (
              <form className="card" style={{ marginBottom: '1rem', background: 'var(--green-deep)', border: '1px solid var(--gold-dark)', position: 'relative' }} onSubmit={handleAddStaff}>
                <div className="form-group"><label>Full Name</label><input value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} required /></div>
                <div className="form-group"><label>Email address (login)</label><input type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" required /></div>
                <div className="form-group"><label>Physical Address</label><input type="text" value={staffForm.address} onChange={e => setStaffForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, city, state" /></div>
                <div className="form-group"><label>Work Phone</label><input type="tel" value={staffForm.phone} onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))} placeholder="Optional" /></div>
                <div className="form-group"><label>Home Phone</label><input type="tel" value={staffForm.homePhone} onChange={e => setStaffForm(f => ({ ...f, homePhone: e.target.value }))} placeholder="Optional" /></div>
                <div className="form-group"><label>Cell Phone</label><input type="tel" value={staffForm.cell} onChange={e => setStaffForm(f => ({ ...f, cell: e.target.value }))} placeholder="Optional" /></div>
                <div className="form-group"><label>Password</label><input type="password" value={staffForm.password} onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))} required /></div>
                <div className="form-group"><label>Role</label><select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}>{ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
                {staffError && <p className="error-msg">{staffError}</p>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={staffSaving}>{staffSaving ? 'Saving…' : 'Add Staff'}</button>
                  <button type="button" className="btn btn-outline" onClick={() => setStaffShowForm(false)}>Cancel</button>
                </div>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '220px 260px 150px 170px auto', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name</span>
                <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email / Login</span>
                <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone</span>
                <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role</span>
                <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)', justifySelf: 'end' }}>Actions</span>
              </div>
              {users.map(u => {
                const allRoles = [u.role, ...(u.additionalRoles || [])]
                const dispRole = allRoles.includes('rider') ? 'rider'
                  : u.role !== 'admin' ? u.role
                  : allRoles.find(r => r !== 'admin') || 'admin'
                const BADGE_LABELS = { barn_manager: 'Barn Manager', admin: 'Administrator', rider: 'Rider', groom: 'Groom' }
                const badgeClass = dispRole === 'barn_manager' ? 'badge-gold' : dispRole === 'rider' ? 'badge-blue' : 'badge-green'
                const roleLabel = BADGE_LABELS[dispRole] || ROLE_OPTIONS.find(o => o.value === dispRole)?.label || dispRole
                return (
                  <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '220px 260px 150px 170px auto', gap: '0.75rem', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'Arial', fontSize: '0.875rem', wordBreak: 'break-word' }}>{u.name}</span>
                    <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{u.id}</span>
                    <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.phone || '—'}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                      <span className={`badge ${badgeClass}`} style={{ width: '100%', justifyContent: 'flex-start' }}>{roleLabel}</span>
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => openStaffEdit(u)}>Edit</button>
                      <button type="button" className="btn btn-outline btn-sm" style={{ color: '#e87070', borderColor: 'rgba(232,112,112,0.35)' }} onClick={() => handleDeleteStaff(u.id, u.name)}>Remove</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Section>

      {staffEditingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, padding: '2rem', boxSizing: 'border-box', overflowY: 'auto' }}>
          <form className="card" style={{ width: '100%', maxWidth: '520px', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto', background: 'var(--green-deep)', border: '1px solid var(--gold-dark)', position: 'relative' }} onSubmit={handleSaveStaffEdit}>
            <button type="button" onClick={() => setStaffEditingId(null)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.2rem', marginBottom: '1.25rem' }}>Edit Staff Member</h3>
            <div className="form-group"><label>Full Name</label><input value={staffEditForm.name} onChange={e => setStaffEditForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="form-group"><label>Email</label><input type="email" value={staffEditForm.email} disabled /></div>
            <div className="form-group"><label>Physical Address</label><input type="text" value={staffEditForm.address} onChange={e => setStaffEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, city, state" /></div>
            <div className="form-group"><label>Work Phone</label><input type="tel" value={staffEditForm.phone} onChange={e => setStaffEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Optional" /></div>
            <div className="form-group"><label>Home Phone</label><input type="tel" value={staffEditForm.homePhone} onChange={e => setStaffEditForm(f => ({ ...f, homePhone: e.target.value }))} placeholder="Optional" /></div>
            <div className="form-group"><label>Cell Phone</label><input type="tel" value={staffEditForm.cell} onChange={e => setStaffEditForm(f => ({ ...f, cell: e.target.value }))} placeholder="Optional" /></div>
            <div className="form-group"><label>Role</label><select value={staffEditForm.role} onChange={e => setStaffEditForm(f => ({ ...f, role: e.target.value }))}>{ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={staffSaving}>{staffSaving ? 'Saving…' : 'Save'}</button>
              <button type="button" className="btn btn-outline" onClick={() => setStaffEditingId(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

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
