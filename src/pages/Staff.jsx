import { useState, useEffect, useRef } from 'react'
import { getUsers, createUser, deleteUser, updateUserProfile, uploadStaffPhoto } from '../services/db'

const ROLES = [
  { value: 'barn_manager', label: 'Barn Manager' },
  { value: 'groom',        label: 'Groom' },
  { value: 'rider',        label: 'Rider' },
]

function StaffPhotoModal({ userId, onSaved, onClose }) {
  const [stage, setStage]         = useState('choose') // 'choose' | 'camera' | 'crop'
  const [imgSrc, setImgSrc]       = useState(null)
  const [offset, setOffset]       = useState({ x: 0, y: 0 })
  const [zoom, setZoom]           = useState(1)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const videoRef   = useRef()
  const streamRef  = useRef()
  const fileRef    = useRef()
  const dragRef    = useRef(null)
  const imgRef     = useRef()

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function startCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      streamRef.current = stream
      setStage('camera')
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 100)
    } catch {
      setError('Camera not available. Please upload a photo instead.')
    }
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    setImgSrc(canvas.toDataURL('image/jpeg'))
    stopCamera()
    setOffset({ x: 0, y: 0 })
    setZoom(1)
    setStage('crop')
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImgSrc(ev.target.result)
      setOffset({ x: 0, y: 0 })
      setZoom(1)
      setStage('crop')
    }
    reader.readAsDataURL(file)
  }

  function handleMouseDown(e) {
    const start = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    dragRef.current = start
    const onMove = ev => setOffset({ x: ev.clientX - start.x, y: ev.clientY - start.y })
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function handleTouchStart(e) {
    const touch = e.touches[0]
    const start = { x: touch.clientX - offset.x, y: touch.clientY - offset.y }
    const onMove = ev => { const t = ev.touches[0]; setOffset({ x: t.clientX - start.x, y: t.clientY - start.y }) }
    const onEnd  = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onEnd)
  }

  async function confirmCrop() {
    setSaving(true)
    try {
      const size = 280
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.clip()
      const img = imgRef.current
      const naturalW = img.naturalWidth
      const naturalH = img.naturalHeight
      const displaySize = 280
      const scale = (naturalW > naturalH ? displaySize / naturalH : displaySize / naturalW) * zoom
      const drawW = naturalW * scale
      const drawH = naturalH * scale
      const drawX = (size - drawW) / 2 + offset.x * (drawW / displaySize)
      const drawY = (size - drawH) / 2 + offset.y * (drawH / displaySize)
      ctx.drawImage(img, drawX, drawY, drawW, drawH)
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85))
      const file = new File([blob], 'staff-photo.jpg', { type: 'image/jpeg' })
      const url = await uploadStaffPhoto(userId, file)
      onSaved(url)
    } catch (err) {
      setError('Upload failed. Please try again.')
      setSaving(false)
    }
  }

  function handleClose() { stopCamera(); onClose() }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1.5rem' }}
      onClick={handleClose}
    >
      <div style={{ background: 'var(--green-deep)', border: '1px solid var(--gold-dark)', borderRadius: 'var(--radius)', padding: '1.5rem', width: '100%', maxWidth: '360px', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={handleClose} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.15rem', marginBottom: '1.25rem' }}>Add Photo</h3>

        {/* Choose stage */}
        {stage === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {error && <p style={{ fontFamily: 'Arial', fontSize: '0.82rem', color: '#e87070' }}>{error}</p>}
            <button className="btn btn-primary" onClick={startCamera}>📷 Take Photo</button>
            <button className="btn btn-outline" onClick={() => fileRef.current?.click()}>🖼 Upload from Library</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
        )}

        {/* Camera stage */}
        {stage === 'camera' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 'var(--radius-sm)', maxHeight: '260px', objectFit: 'cover', background: '#000' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={capturePhoto}>📸 Capture</button>
              <button className="btn btn-outline" onClick={() => { stopCamera(); setStage('choose') }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Crop stage */}
        {stage === 'crop' && imgSrc && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 280, height: 280, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--gold)', cursor: 'grab', flexShrink: 0, position: 'relative', background: '#000' }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <img
                ref={imgRef}
                src={imgSrc}
                alt="crop"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                  transformOrigin: 'center',
                  maxWidth: 'none',
                  width: 280,
                  height: 280,
                  objectFit: 'cover',
                  userSelect: 'none',
                }}
              />
            </div>
            <div style={{ width: '100%' }}>
              <label style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Zoom</label>
              <input type="range" min="0.5" max="3" step="0.05" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <p style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Drag to reposition</p>
            {error && <p style={{ fontFamily: 'Arial', fontSize: '0.82rem', color: '#e87070', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={confirmCrop} disabled={saving}>{saving ? 'Saving…' : 'Save Photo'}</button>
              <button className="btn btn-outline" onClick={() => { setStage('choose'); setImgSrc(null) }}>← Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Staff({ user }) {
  const [users,     setUsers]     = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm,  setEditForm]  = useState({ name: '', email: '', phone: '', cell: '', address: '', role: 'groom' })
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'groom', phone: '', cell: '', address: '' })
  const [photoModalId, setPhotoModalId] = useState(null)

  useEffect(() => { getUsers().then(setUsers).catch(() => {}) }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createUser(form)
      const updated = await getUsers()
      setUsers(updated)
      setForm({ name: '', email: '', password: '', role: 'groom', phone: '', cell: '', address: '' })
      setShowForm(false)
    } catch {
      setError('Failed to add staff member. Email may already be in use.')
    } finally { setSaving(false) }
  }

  function openEdit(u) {
    setEditingId(u.id)
    setEditForm({ name: u.name || '', email: u.email || u.id || '', phone: u.phone || '', cell: u.cell || '', address: u.address || '', role: u.role || 'groom' })
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateUserProfile(editingId, { name: editForm.name, phone: editForm.phone, cell: editForm.cell, address: editForm.address, role: editForm.role })
      setUsers(u => u.map(x => x.id === editingId ? { ...x, ...editForm } : x))
      setEditingId(null)
    } finally { setSaving(false) }
  }

  async function handleDelete(email, name) {
    if (!window.confirm(`Remove ${name}?`)) return
    await deleteUser(email)
    setUsers(u => u.filter(x => x.id !== email))
  }

  const isAdmin = user?.role === 'admin' || user?.activeRole === 'admin' || user?.additionalRoles?.includes('admin')
  const BADGE_LABELS = { barn_manager: 'Barn Mgr', admin: 'Admin', rider: 'Rider', groom: 'Groom' }
  const roleLabel = r => ROLES.find(x => x.value === r)?.label || r
  const badgeLabel = r => BADGE_LABELS[r] || roleLabel(r)

  function displayRole(u) {
    const all = [u.role, ...(u.additionalRoles || [])]
    if (all.includes('rider')) return 'rider'
    if (u.role !== 'admin') return u.role
    return all.find(r => r !== 'admin') || 'admin'
  }

  const PINNED = ['lillie.keenan@gmail.com', 'pam.keenan@gmail.com', 'diego']
  const LAST   = ['jesse.green', 'jesse green']
  function sortMembers(members) {
    return [...members].sort((a, b) => {
      const aLast = LAST.some(p => a.id?.toLowerCase().includes(p) || a.name?.toLowerCase().includes(p))
      const bLast = LAST.some(p => b.id?.toLowerCase().includes(p) || b.name?.toLowerCase().includes(p))
      if (aLast && !bLast) return 1
      if (!aLast && bLast) return -1
      const ai = PINNED.findIndex(p => a.id?.toLowerCase().includes(p) || a.name?.toLowerCase().includes(p))
      const bi = PINNED.findIndex(p => b.id?.toLowerCase().includes(p) || b.name?.toLowerCase().includes(p))
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }

  const ROLE_ORDER = ['barn_manager', 'rider', 'groom']
  const grouped = ROLE_ORDER.map(role => ({
    role,
    label: roleLabel(role),
    members: sortMembers(users.filter(u => displayRole(u) === role)),
  })).concat(
    (() => {
      const rest = users.filter(u => !ROLE_ORDER.includes(displayRole(u)))
      return rest.length ? [{ role: 'other', label: 'Other', members: rest }] : []
    })()
  )

  // Role styling — Lillie palette
  const ROLE_STYLES = {
    barn_manager: { bg: '#163590', border: '#c9a84c', text: '#c9a84c', label: 'Barn Manager' },
    rider:        { bg: '#2e6b3e', border: '#1a4527', text: '#ffffff', label: 'Rider' },
    groom:        { bg: '#b84a1a', border: '#8f3712', text: '#ffffff', label: 'Groom' },
    admin:        { bg: '#4a3080', border: '#2e1c5a', text: '#ffffff', label: 'Admin' },
  }

  function roleStyle(r) {
    return ROLE_STYLES[r] || { bg: '#4a5568', border: '#2d3748', text: '#ffffff', label: r }
  }

  function initials(name) {
    if (!name) return '?'
    return name.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Staff</h2>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>+ Add Staff</button>}
      </div>

      {showForm && (
        <form className="card" style={{ maxWidth: '460px', marginBottom: '1.5rem', background: 'var(--green-deep)', border: '1px solid var(--gold-dark)', position: 'relative' }} onSubmit={handleAdd}>
          <button type="button" onClick={() => setShowForm(false)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
          <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', marginBottom: '1rem' }}>Add Staff Member</h3>
          <div className="form-group"><label>Full Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div className="form-group"><label>Email address (login)</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" required /></div>
          <div className="form-group"><label>Physical Address</label><input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, city, state" /></div>
          <div className="form-group"><label>Phone Number</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Optional" /></div>
          <div className="form-group"><label>Cell Phone</label><input type="tel" value={form.cell} onChange={e => setForm(f => ({ ...f, cell: e.target.value }))} placeholder="Optional" /></div>
          <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required /></div>
          <div className="form-group">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {users.length === 0 && <p style={{ opacity: 0.5, fontFamily: 'Arial', fontSize: '0.85rem' }}>No staff added yet.</p>}

      {grouped.filter(g => g.members.length > 0).map(group => {
        const rs = roleStyle(group.role)
        return (
          <div key={group.role} style={{ marginBottom: '2rem' }}>
            {/* Group header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1, height: '1px', background: rs.border, opacity: 0.4 }} />
              <span style={{ fontFamily: 'Georgia', fontSize: '1.1rem', color: rs.bg, fontWeight: 'normal', letterSpacing: '0.08em', textTransform: 'uppercase', background: rs.bg, color: rs.text, borderRadius: '999px', padding: '0.2rem 1rem', border: `1px solid ${rs.border}` }}>{group.label}</span>
              <div style={{ flex: 1, height: '1px', background: rs.border, opacity: 0.4 }} />
            </div>

            {/* Member cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {group.members.map(u => {
                const rs2 = roleStyle(displayRole(u))
                return (
                  <div key={u.id} style={{ background: `${rs2.bg}14`, border: `1px solid ${rs2.border}`, borderLeft: `5px solid ${rs2.bg}`, borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                    {/* Avatar circle */}
                    {(() => {
                      const canUpload = isAdmin || user?.id === u.id || user?.email === u.id
                      return (
                        <div
                          className="staff-avatar"
                          onClick={canUpload ? () => setPhotoModalId(u.id) : undefined}
                          title={canUpload ? 'Change photo' : undefined}
                          style={{ width: 48, height: 48, borderRadius: '50%', background: rs2.bg, border: `2px solid ${rs2.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia', fontSize: '1.1rem', color: rs2.text, flexShrink: 0, overflow: 'hidden', cursor: canUpload ? 'pointer' : 'default', position: 'relative' }}>
                          {u.photoUrl
                            ? <img src={u.photoUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span>{initials(u.name)}</span>
                          }
                          {canUpload && <div className="staff-avatar-overlay">📷</div>}
                        </div>
                      )
                    })()}
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Georgia', fontSize: '1.2rem', color: '#0d1b4b', marginBottom: '0.15rem' }}>{u.name}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 1rem', fontFamily: 'Arial', fontSize: '0.78rem', color: '#2d3a4a' }}>
                        {u.email && <span>{u.email}</span>}
                        {u.phone && <span>📞 {u.phone}</span>}
                        {u.cell && <span>📱 {u.cell}</span>}
                      </div>
                      {u.address && <div style={{ marginTop: '0.4rem', fontFamily: 'Arial', fontSize: '0.78rem', color: '#2d3a4a' }}>📍 {u.address}</div>}
                    </div>
                    {/* Role badge */}
                    <span style={{ fontFamily: 'Arial', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: rs2.bg, color: rs2.text, border: `1px solid ${rs2.border}`, borderRadius: '4px', padding: '0.2rem 0.55rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {badgeLabel(displayRole(u))}
                    </span>
                    {isAdmin && (
                      <button onClick={() => openEdit(u)} className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>Edit</button>
                    )}
                    {/* Remove */}
                    {isAdmin && (
                      <button onClick={() => handleDelete(u.id, u.name)} style={{ position: 'absolute', bottom: '0.4rem', right: '0.6rem', background: 'none', border: 'none', color: '#e87070', fontFamily: 'Arial', fontSize: '0.68rem', cursor: 'pointer', opacity: 0.5, padding: 0 }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                      >remove</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Photo upload modal */}
      {photoModalId && (
        <StaffPhotoModal
          userId={photoModalId}
          onSaved={url => {
            setUsers(u => u.map(x => x.id === photoModalId ? { ...x, photoUrl: url } : x))
            setPhotoModalId(null)
          }}
          onClose={() => setPhotoModalId(null)}
        />
      )}

      {/* Edit modal */}
      {editingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1.5rem' }}>
          <form className="card" style={{ width: '100%', maxWidth: '420px', background: 'var(--green-deep)', border: '1px solid var(--gold-dark)', position: 'relative' }} onSubmit={handleSaveEdit}>
            <button type="button" onClick={() => setEditingId(null)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.2rem', marginBottom: '1.25rem' }}>Edit Staff Member</h3>
            <div className="form-group"><label>Full Name</label><input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="form-group"><label>Email</label><input type="text" value={users.find(u => u.id === editingId)?.email || ''} disabled /></div>
            <div className="form-group"><label>Physical Address</label><input type="text" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, city, state" /></div>
            <div className="form-group"><label>Phone Number</label><input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Optional" /></div>
            <div className="form-group"><label>Cell Phone</label><input type="tel" value={editForm.cell} onChange={e => setEditForm(f => ({ ...f, cell: e.target.value }))} placeholder="Optional" /></div>
            <div className="form-group">
              <label>Role</label>
              <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button type="button" className="btn btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
