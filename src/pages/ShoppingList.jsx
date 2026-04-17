import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore'

async function getItems() {
  const snap = await getDocs(query(collection(db, 'shoppingList'), orderBy('createdAt')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function addItem(text, addedBy) {
  return await addDoc(collection(db, 'shoppingList'), { text, checked: false, addedBy, createdAt: Date.now() })
}

async function toggleItem(id, checked) {
  await updateDoc(doc(db, 'shoppingList', id), { checked })
}

async function deleteItem(id) {
  await deleteDoc(doc(db, 'shoppingList', id))
}

export default function ShoppingList({ user }) {
  const canEdit = true // all staff can add
  const canDelete = user?.role === 'admin' || user?.role === 'barn_manager' ||
                    user?.activeRole === 'admin' || user?.activeRole === 'barn_manager' ||
                    user?.additionalRoles?.includes('admin')

  const [items,   setItems]   = useState([])
  const [input,   setInput]   = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => { getItems().then(setItems).catch(() => {}) }, [])

  async function handleAdd(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setSaving(true)
    try {
      const ref = await addItem(text, user?.name || 'Staff')
      setItems(prev => [...prev, { id: ref.id, text, checked: false, addedBy: user?.name || 'Staff', createdAt: Date.now() }])
      setInput('')
    } finally { setSaving(false) }
  }

  async function handleToggle(item) {
    await toggleItem(item.id, !item.checked)
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, checked: !x.checked } : x))
  }

  async function handleDelete(id) {
    await deleteItem(id)
    setItems(prev => prev.filter(x => x.id !== id))
  }

  async function handleClearChecked() {
    if (!window.confirm('Remove all checked items?')) return
    const checked = items.filter(x => x.checked)
    await Promise.all(checked.map(x => deleteItem(x.id)))
    setItems(prev => prev.filter(x => !x.checked))
  }

  const unchecked = items.filter(x => !x.checked)
  const checked   = items.filter(x => x.checked)

  return (
    <div className="page">
      <h2>Shopping List</h2>
      <p className="page-subtitle">Barn Supplies &amp; Needs</p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', maxWidth: '480px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add an item…"
          style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0.5rem 0.75rem', fontFamily: 'Arial', fontSize: '0.9rem', outline: 'none' }}
        />
        <button type="submit" className="btn btn-primary" disabled={saving || !input.trim()}>Add</button>
      </form>

      {unchecked.length === 0 && checked.length === 0 && (
        <p style={{ opacity: 0.5, fontFamily: 'Arial', fontSize: '0.875rem' }}>No items yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: '480px' }}>
        {unchecked.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.9rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <input type="checkbox" checked={false} onChange={() => handleToggle(item)} style={{ accentColor: 'var(--gold)', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }} />
            <span style={{ flex: 1, fontFamily: 'Arial', fontSize: '0.9rem' }}>{item.text}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'Arial' }}>{item.addedBy}</span>
            {(canDelete || item.addedBy === user?.name) && (
              <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 }}
                onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >✕</button>
            )}
          </div>
        ))}

        {checked.length > 0 && (
          <>
            <div style={{ marginTop: '0.75rem', marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Arial', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Checked off</span>
              {canDelete && <button onClick={handleClearChecked} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontFamily: 'Arial', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>Clear all</button>}
            </div>
            {checked.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(13,27,75,0.04)', border: '1px solid rgba(36,86,174,0.1)', borderRadius: 'var(--radius-sm)', opacity: 0.55 }}>
                <input type="checkbox" checked={true} onChange={() => handleToggle(item)} style={{ accentColor: 'var(--gold)', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ flex: 1, fontFamily: 'Arial', fontSize: '0.9rem', textDecoration: 'line-through' }}>{item.text}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'Arial' }}>{item.addedBy}</span>
                {(canDelete || item.addedBy === user?.name) && (
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
