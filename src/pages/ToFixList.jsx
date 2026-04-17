import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore'

const PRIORITIES = ['High', 'Medium', 'Low']
const PRIORITY_COLORS = { High: '#e87070', Medium: '#e8d44d', Low: '#7ecfa0' }

async function getItems() {
  const snap = await getDocs(query(collection(db, 'toFixList'), orderBy('createdAt')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function addItem(data) {
  return await addDoc(collection(db, 'toFixList'), { ...data, done: false, createdAt: Date.now() })
}

async function toggleItem(id, done) {
  await updateDoc(doc(db, 'toFixList', id), { done })
}

async function deleteItem(id) {
  await deleteDoc(doc(db, 'toFixList', id))
}

export default function ToFixList({ user }) {
  const canDelete = user?.role === 'admin' || user?.role === 'barn_manager' ||
                    user?.activeRole === 'admin' || user?.activeRole === 'barn_manager' ||
                    user?.additionalRoles?.includes('admin')

  const [items,    setItems]    = useState([])
  const [input,    setInput]    = useState('')
  const [priority, setPriority] = useState('Medium')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { getItems().then(setItems).catch(() => {}) }, [])

  async function handleAdd(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setSaving(true)
    try {
      const data = { text, priority, reportedBy: user?.name || 'Staff' }
      const ref = await addItem(data)
      setItems(prev => [...prev, { id: ref.id, ...data, done: false, createdAt: Date.now() }])
      setInput('')
    } finally { setSaving(false) }
  }

  async function handleToggle(item) {
    await toggleItem(item.id, !item.done)
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, done: !x.done } : x))
  }

  async function handleDelete(id) {
    await deleteItem(id)
    setItems(prev => prev.filter(x => x.id !== id))
  }

  async function handleClearDone() {
    if (!window.confirm('Remove all completed items?')) return
    const done = items.filter(x => x.done)
    await Promise.all(done.map(x => deleteItem(x.id)))
    setItems(prev => prev.filter(x => !x.done))
  }

  const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 }
  const open = [...items.filter(x => !x.done)].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))
  const done = items.filter(x => x.done)

  return (
    <div className="page">
      <h2>Barn "To Fix" List</h2>
      <p className="page-subtitle">Repairs &amp; Maintenance</p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', maxWidth: '560px', flexWrap: 'wrap' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Describe what needs fixing…"
          style={{ flex: 1, minWidth: '200px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0.5rem 0.75rem', fontFamily: 'Arial', fontSize: '0.9rem', outline: 'none' }}
        />
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: PRIORITY_COLORS[priority], padding: '0.5rem 0.6rem', fontFamily: 'Arial', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
        >
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button type="submit" className="btn btn-primary" disabled={saving || !input.trim()}>Add</button>
      </form>

      {open.length === 0 && done.length === 0 && (
        <p style={{ opacity: 0.5, fontFamily: 'Arial', fontSize: '0.875rem' }}>Nothing to fix — great!</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: '560px' }}>
        {open.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.9rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <input type="checkbox" checked={false} onChange={() => handleToggle(item)} style={{ accentColor: 'var(--gold)', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }} />
            <span style={{ flex: 1, fontFamily: 'Arial', fontSize: '0.9rem' }}>{item.text}</span>
            <span style={{ fontSize: '0.72rem', fontFamily: 'Arial', color: PRIORITY_COLORS[item.priority] || 'var(--text-muted)', fontWeight: 600 }}>{item.priority}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'Arial' }}>{item.reportedBy}</span>
            {(canDelete || item.reportedBy === user?.name) && (
              <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 }}
                onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >✕</button>
            )}
          </div>
        ))}

        {done.length > 0 && (
          <>
            <div style={{ marginTop: '0.75rem', marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Arial', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Fixed</span>
              {canDelete && <button onClick={handleClearDone} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontFamily: 'Arial', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>Clear all</button>}
            </div>
            {done.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(13,27,75,0.04)', border: '1px solid rgba(36,86,174,0.1)', borderRadius: 'var(--radius-sm)', opacity: 0.5 }}>
                <input type="checkbox" checked={true} onChange={() => handleToggle(item)} style={{ accentColor: 'var(--gold)', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ flex: 1, fontFamily: 'Arial', fontSize: '0.9rem', textDecoration: 'line-through' }}>{item.text}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'Arial' }}>{item.reportedBy}</span>
                {(canDelete || item.reportedBy === user?.name) && (
                  <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >✕</button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
