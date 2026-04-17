import { useState, useEffect, useRef } from 'react'
import { db, storage } from '../firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

async function getVendors() {
  const snap = await getDocs(query(collection(db, 'vendors'), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function uploadVendorCardPhoto(file) {
  // Upload to a temp path — will be moved to vendor/{id}/card.ext after save
  const ext = file.name?.split('.').pop() || 'jpg'
  const path = `vendors/temp/${Date.now()}.${ext}`
  const ref = storageRef(storage, path)
  const snap = await uploadBytes(ref, file)
  return await getDownloadURL(snap.ref)
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function scanBusinessCard(base64Image, mimeType) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image } },
          {
            type: 'text',
            text: `Extract contact information from this business card image.

Return ONLY valid JSON — no explanation, no markdown. Use this exact format:
{"name":"","company":"","phone":"","email":"","website":"","notes":""}

- name: person's full name
- company: business/company name (use for the vendor name if no person name)
- phone: primary phone number
- email: email address
- website: website URL (include https:// if present)
- notes: title, specialty, address, or any other useful info

If a field is not found, use empty string "".`,
          },
        ],
      }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || '{}'
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    return {}
  }
}

const CATEGORIES = ['Vet', 'Farrier', 'Feed', 'Tack', 'Transport', 'Grooming', 'Other']
const blank = { name: '', category: '', phone: '', email: '', website: '', notes: '', cardPhotoUrl: '' }

export default function Vendors({ user, openAddForm = false }) {
  const canEdit = user?.role === 'admin' || user?.role === 'barn_manager' ||
                  user?.activeRole === 'admin' || user?.activeRole === 'barn_manager' ||
                  user?.additionalRoles?.includes('admin')
  const canAdd = true

  const [vendors,    setVendors]    = useState([])
  const [showForm,   setShowForm]   = useState(openAddForm)
  const [formData,   setFormData]   = useState(blank)
  const [editingId,  setEditingId]  = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [filter,     setFilter]     = useState('All')

  // Card scan state
  const [scanning,      setScanning]      = useState(false)
  const [scanError,     setScanError]     = useState('')
  const [cardPreview,   setCardPreview]   = useState(null)
  const [cardFile,      setCardFile]      = useState(null)
  const fileRef = useRef()
  const dropRef = useRef()

  useEffect(() => { getVendors().then(setVendors).catch(() => {}) }, [])

  function handleCardFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setScanError('')
    setCardFile(file)
    setCardPreview(URL.createObjectURL(file))
  }

  function handlePaste(e) {
    const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'))
    if (item) handleCardFile(item.getAsFile())
  }

  async function handleScanCard() {
    if (!cardFile) return
    setScanning(true)
    setScanError('')
    try {
      const base64 = await fileToBase64(cardFile)
      const extracted = await scanBusinessCard(base64, cardFile.type)
      // Pre-fill form — use company as name if no person name, or combine
      const vendorName = extracted.company
        ? extracted.name
          ? `${extracted.name} — ${extracted.company}`
          : extracted.company
        : extracted.name || ''
      setFormData(f => ({
        ...f,
        name:     f.name     || vendorName,
        phone:    f.phone    || extracted.phone    || '',
        email:    f.email    || extracted.email    || '',
        website:  f.website  || extracted.website  || '',
        notes:    f.notes    || extracted.notes    || '',
      }))
    } catch (err) {
      setScanError(err.message || 'Could not read card. Try a clearer photo.')
    } finally { setScanning(false) }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      let dataToSave = { ...formData }

      // Upload card photo if new one was picked
      if (cardFile && !formData.cardPhotoUrl.startsWith('http')) {
        const url = await uploadVendorCardPhoto(cardFile)
        dataToSave.cardPhotoUrl = url
      }

      if (editingId) {
        await updateDoc(doc(db, 'vendors', editingId), dataToSave)
        setVendors(v => v.map(x => x.id === editingId ? { ...x, ...dataToSave } : x))
      } else {
        const ref = await addDoc(collection(db, 'vendors'), { ...dataToSave, createdAt: Date.now() })
        setVendors(v => [...v, { id: ref.id, ...dataToSave }].sort((a, b) => a.name.localeCompare(b.name)))
      }
      closeForm()
    } finally { setSaving(false) }
  }

  function closeForm() {
    setShowForm(false)
    setFormData(blank)
    setEditingId(null)
    setCardFile(null)
    setCardPreview(null)
    setScanError('')
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this vendor?')) return
    await deleteDoc(doc(db, 'vendors', id))
    setVendors(v => v.filter(x => x.id !== id))
  }

  function openEdit(v) {
    setFormData({
      name: v.name || '', category: v.category || '', phone: v.phone || '',
      email: v.email || '', website: v.website || '', notes: v.notes || '',
      cardPhotoUrl: v.cardPhotoUrl || '',
    })
    setEditingId(v.id)
    setCardPreview(v.cardPhotoUrl || null)
    setCardFile(null)
    setShowForm(true)
  }

  const categories = ['All', ...CATEGORIES]
  const filtered = filter === 'All' ? vendors : vendors.filter(v => v.category === filter)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2>Vendors</h2>
        {canAdd && <button className="btn btn-primary btn-sm" onClick={() => { setFormData(blank); setEditingId(null); setCardPreview(null); setCardFile(null); setShowForm(true) }}>+ Add Vendor</button>}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.1rem' }}>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{ background: filter === c ? '#b84a1a' : 'rgba(36,86,174,0.10)', border: `1px solid ${filter === c ? '#8f3712' : 'var(--border)'}`, borderRadius: '999px', color: filter === c ? '#ffffff' : 'var(--text)', fontFamily: 'Arial', fontSize: '0.8rem', padding: '0.3rem 0.85rem', cursor: 'pointer' }}
          >{c}</button>
        ))}
      </div>

      {filtered.length === 0 && <p style={{ opacity: 0.5, fontFamily: 'Arial', fontSize: '0.85rem' }}>No vendors yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {filtered.map(v => (
          <div key={v.id} className="card" style={{ background: 'rgba(255,255,255,0.85)', padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: 'Georgia', fontSize: '1.15rem', color: '#0d1b4b' }}>{v.name}</span>
                  {v.category && <span style={{ fontFamily: 'Arial', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: '#b84a1a', color: '#ffffff', borderRadius: '3px', padding: '0.1rem 0.4rem' }}>{v.category}</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 1rem', fontFamily: 'Arial', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {v.phone && <span>📞 {v.phone}</span>}
                  {v.email && <span>✉ {v.email}</span>}
                  {v.website && <a href={v.website} target="_blank" rel="noopener noreferrer" style={{ color: '#2456ae' }}>🌐 {v.website}</a>}
                </div>
                {v.notes && <div style={{ marginTop: '0.35rem', fontFamily: 'Arial', fontSize: '0.82rem', color: '#3a4a5c', fontStyle: 'italic' }}>{v.notes}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                {/* Business card thumbnail */}
                {v.cardPhotoUrl && (
                  <img src={v.cardPhotoUrl} alt="Business card" style={{ width: 90, height: 56, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(36,86,174,0.25)', cursor: 'pointer' }}
                    onClick={() => window.open(v.cardPhotoUrl, '_blank')}
                    title="View business card"
                  />
                )}
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v.id)}>✕</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit modal */}
      {showForm && canAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, overflowY: 'auto', padding: '2rem 1.5rem' }}
          onPaste={handlePaste}
        >
          <form className="card" style={{ width: '100%', maxWidth: '500px', background: 'var(--green-deep)', border: '1px solid var(--gold-dark)', position: 'relative' }} onSubmit={handleSave}>
            <button type="button" onClick={closeForm} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.2rem', marginBottom: '1rem' }}>{editingId ? 'Edit Vendor' : 'Add Vendor'}</h3>

            {/* ── Business Card Scanner ── */}
            <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'rgba(22,53,144,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontFamily: 'Arial', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gold-dark)', marginBottom: '0.6rem', fontWeight: 700 }}>
                📇 Scan Business Card
              </div>

              {/* Drop / preview area */}
              <div
                ref={dropRef}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleCardFile(e.dataTransfer.files[0]) }}
                style={{ border: `2px dashed ${cardPreview ? '#c9a84c' : 'rgba(36,86,174,0.3)'}`, borderRadius: 'var(--radius-sm)', padding: cardPreview ? '0.4rem' : '0.85rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', marginBottom: '0.6rem' }}
              >
                {cardPreview ? (
                  <img src={cardPreview} alt="Card preview" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: 3, display: 'block', margin: '0 auto' }} />
                ) : (
                  <span style={{ fontFamily: 'Arial', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Click, drag & drop, or <strong>paste</strong> (⌘V) a photo of a business card
                  </span>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleCardFile(e.target.files[0])} />

              {scanError && <p style={{ fontFamily: 'Arial', fontSize: '0.78rem', color: '#e87070', marginBottom: '0.5rem' }}>{scanError}</p>}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#163590', border: '1px solid #c9a84c', color: '#c9a84c', fontWeight: 700 }}
                  onClick={handleScanCard}
                  disabled={!cardFile || scanning || !API_KEY}
                >
                  {scanning ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(201,168,76,0.3)', borderTopColor: '#c9a84c', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Reading…
                    </span>
                  ) : '✦ Extract Info'}
                </button>
                {cardPreview && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setCardFile(null); setCardPreview(null); setScanError('') }}>Clear</button>
                )}
              </div>
              {!API_KEY && <p style={{ fontFamily: 'Arial', fontSize: '0.72rem', color: '#e87070', marginTop: '0.4rem' }}>API key not set — scanning unavailable.</p>}
            </div>

            {/* ── Manual fields ── */}
            <div className="form-group"><label>Name</label><input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="form-group">
              <label>Category</label>
              <select value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}>
                <option value="">— Select —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Phone</label><input value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. (555) 123-4567" /></div>
            <div className="form-group"><label>Email</label><input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="form-group"><label>Website</label><input value={formData.website} onChange={e => setFormData(f => ({ ...f, website: e.target.value }))} placeholder="https://..." /></div>
            <div className="form-group"><label>Notes</label><textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button type="button" className="btn btn-outline" onClick={closeForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
