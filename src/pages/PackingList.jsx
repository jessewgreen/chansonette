import { useState } from 'react'

const SECTIONS = [
  {
    title: 'Tack',
    items: [
      'Saddle', 'Flat bridle', 'Show bridle', 'Draw reins', 'Extra bits',
      'Jumping girth', 'Show girth', 'Show halters', 'Grooming halter',
      'Chain', 'Lunge chain', 'Lunging equipment (pessoa, ropes)',
    ],
  },
  {
    title: 'Blankets (as needed)',
    items: [
      'Sheet', 'Medium', 'Heavy', 'Back on rack sheet', 'Back on rack neck',
      'Cooler', 'Fly sheet', 'Hood show screen', 'Fly mask',
      'Dry rug/cooler', 'Travel sheet',
    ],
  },
  {
    title: 'Supplies',
    items: [
      'Grooming box', 'Treats', 'Vitamins', 'Hoof polish', 'Shampoo/scrub',
      'Poultice', 'Standing poultice', 'Cotton roll', 'Shampoo', 'Awesome',
      'Vet wrap', 'Duct tape', 'Sponge', 'Brown paper',
      'Stall cleaning supplies', 'Reducine', 'Show oil',
    ],
  },
  {
    title: 'Buckets',
    items: [
      'Water buckets', 'Feed buckets', 'Stack evening buckets x2', 'Shampoo buckets x2',
    ],
  },
  {
    title: 'Feed Room',
    items: [
      'Safeguard', 'Hay', 'Med box + syringes', 'Supplements',
      'Garlic', 'Cruncher', 'Joint stuff', 'Electrolytes',
    ],
  },
  {
    title: 'Show Textiles',
    items: [
      'Flat saddle pads', 'Show saddle pads', 'Raid pads',
      'Polo wraps (wound proof)', 'White girths', 'Squadron rear',
      'Show shirts', 'Their t-shirts', 'Tail boots', 'Knee guards',
      'Show boots', 'Towels', 'Dry mask', 'Back & tack/quick wrap',
      'Stack & traceable wrap',
    ],
  },
  {
    title: 'Machines',
    items: [
      'Clippers', 'Magnetic rug', 'Magnetic boots', 'Nebulizer', 'Laser', 'Hoof pad',
    ],
  },
  {
    title: 'Rider',
    items: [
      "Rider's red bag", "Rider's whites", "Rider's helmets", "Rider's whip",
    ],
  },
  {
    title: 'Papers',
    items: [
      'Coggins / AI / HC', 'Vet passport', 'FEI dress/arena EU', 'Form B', 'Current passport',
    ],
  },
  {
    title: 'Set Up',
    items: [
      'Brooms / work shovel', 'Wheelbarrow', 'Extension ties',
      'Set up box (zip ties, ropes)', 'Sign', 'Hooks', 'Boot bench/banana',
      'Curtain track', 'Rack', 'Guard', 'Crookies', 'Fans', 'Fan holder',
      'Head protection doors', 'Club',
    ],
  },
  {
    title: 'Other (depends on show)',
    items: [
      'Riding boots/freezer', 'Studs', 'Electric cables', 'Food items',
      'Equilift compression boot', 'Night shavings', 'Dolly', 'Cart',
      'Shelves', 'Camera', 'Photos', 'Hay net', 'Watering can',
    ],
  },
]

const STORAGE_KEY = 'chansonette_packing_lists'

function loadLists() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}

function saveLists(lists) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
}

function newList(name) {
  return { id: Date.now().toString(), name, checked: {}, extraItems: {}, notes: {} }
}

function NoteBox({ notes, onAdd, onDelete, user }) {
  const [draft, setDraft] = useState('')

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const trimmed = draft.trim()
      if (trimmed) { onAdd(trimmed); setDraft('') }
    }
    if (e.key === 'Escape') setDraft('')
  }

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(36,86,174,0.15)', paddingTop: '0.75rem' }}>
      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.6rem' }}>
          {notes.map((n, i) => {
            const canDelete = user?.role === 'admin' || user?.role === 'barn_manager' || n.author === (user?.name || 'Staff')
            return (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: 'Arial', fontSize: '0.7rem', color: 'var(--gold)', opacity: 0.8, marginRight: '0.4rem' }}>
                    {n.author}:
                  </span>
                  <span style={{ fontFamily: 'Arial', fontSize: '0.8rem', color: 'var(--text)' }}>{n.text}</span>
                </div>
                {canDelete && (
                  <button
                    onClick={() => onDelete(i)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.2rem',
                      color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1, flexShrink: 0,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="Delete note"
                  >×</button>
                )}
              </div>
            )
          })}
        </div>
      )}
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Notes…"
        rows={3}
        style={{
          width: '100%',
          background: 'rgba(36,86,174,0.06)',
          border: '1.5px solid rgba(36,86,174,0.35)',
          borderRadius: '5px',
          color: 'var(--gold)',
          fontFamily: 'Arial', fontSize: '0.85rem',
          outline: 'none', resize: 'none',
          padding: '0.5rem 0.65rem',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'rgba(36,86,174,0.1)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(36,86,174,0.35)'; e.currentTarget.style.background = 'rgba(36,86,174,0.06)'; if (draft.trim()) { onAdd(draft.trim()); setDraft('') } }}
      />
    </div>
  )
}

export default function PackingList({ user }) {
  const [lists,    setLists]    = useState(() => loadLists())
  const [activeId, setActiveId] = useState(() => loadLists()[0]?.id || null)
  const [viewMode, setViewMode] = useState('all')   // 'all' | 'single'
  const [adding,   setAdding]   = useState(null)    // { listId, title } | null
  const [newItem,  setNewItem]  = useState('')
  const [hovering, setHovering] = useState(null)
  const [showNew,  setShowNew]  = useState(false)
  const [newName,  setNewName]  = useState('')
  const [expandedSection, setExpandedSection] = useState(null) // { listId, title }

  const active = lists.find(l => l.id === activeId) || null

  function updateList(id, fn) {
    setLists(prev => {
      const next = prev.map(l => l.id === id ? fn(l) : l)
      saveLists(next)
      return next
    })
  }

  function createList() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const list = newList(trimmed)
    const next = [...lists, list]
    saveLists(next)
    setLists(next)
    setActiveId(list.id)
    setViewMode('single')
    setShowNew(false)
    setNewName('')
  }

  function deleteList(id) {
    if (!window.confirm('Delete this packing list?')) return
    const next = lists.filter(l => l.id !== id)
    saveLists(next)
    setLists(next)
    if (activeId === id) setActiveId(next[0]?.id || null)
  }

  function toggle(listId, key) {
    updateList(listId, l => ({ ...l, checked: { ...l.checked, [key]: !l.checked[key] } }))
  }

  function resetList(listId) {
    if (window.confirm('Reset all checkboxes for this show?')) updateList(listId, l => ({ ...l, checked: {} }))
  }

  function startAdding(listId, title) { setAdding({ listId, title }); setNewItem('') }

  function commitAdd(listId, title) {
    const trimmed = newItem.trim()
    if (trimmed) {
      updateList(listId, l => ({
        ...l,
        extraItems: { ...l.extraItems, [title]: [...(l.extraItems[title] || []), trimmed] },
      }))
    }
    setAdding(null)
    setNewItem('')
  }

  function deleteExtraItem(listId, title, item) {
    updateList(listId, l => {
      const checked = { ...l.checked }
      delete checked[`${title}::${item}`]
      return { ...l, checked, extraItems: { ...l.extraItems, [title]: l.extraItems[title].filter(i => i !== item) } }
    })
  }

  function handleAddKeyDown(e, listId, title) {
    if (e.key === 'Enter') commitAdd(listId, title)
    if (e.key === 'Escape') { setAdding(null); setNewItem('') }
  }

  function handleNewKeyDown(e) {
    if (e.key === 'Enter') createList()
    if (e.key === 'Escape') { setShowNew(false); setNewName('') }
  }

  function addNote(listId, title, text) {
    const trimmed = text.trim()
    if (!trimmed) return
    const author = user?.name || 'Staff'
    const note = { author, text: trimmed, timestamp: new Date().toISOString() }
    updateList(listId, l => ({
      ...l,
      notes: { ...l.notes, [title]: [...(l.notes?.[title] || []), note] },
    }))
  }

  function deleteNote(listId, title, idx) {
    updateList(listId, l => ({
      ...l,
      notes: { ...l.notes, [title]: l.notes[title].filter((_, i) => i !== idx) },
    }))
  }

  function renderListContent(list) {
    const keys = [
      ...SECTIONS.flatMap(s => s.items.map(item => `${s.title}::${item}`)),
      ...Object.entries(list.extraItems).flatMap(([title, items]) => items.map(item => `${title}::${item}`)),
    ]
    const total = keys.length
    const done  = keys.filter(k => list.checked[k]).length
    const pct   = Math.round((done / total) * 100)

    return (
      <>
        {/* Progress bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontFamily: 'Arial', fontSize: '0.78rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {done} of {total} packed
            </span>
            <span style={{ fontFamily: 'Georgia', fontSize: '0.9rem', color: done === total ? '#7ecfa0' : 'var(--gold)' }}>
              {pct}%
            </span>
          </div>
          <div style={{ background: 'rgba(13,27,75,0.12)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: done === total ? '#3d7a52' : 'var(--gold)',
              borderRadius: '999px', transition: 'width 0.25s ease',
            }} />
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {SECTIONS.map(section => {
            const extra    = list.extraItems[section.title] || []
            const allItems = [...section.items, ...extra]
            const sectionDone = allItems.filter(item => list.checked[`${section.title}::${item}`]).length
            const isAdding = adding?.listId === list.id && adding?.title === section.title

            return (
              <div key={section.title} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.85rem' }}>
                  <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.04em' }}>
                    {section.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontFamily: 'Arial', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {sectionDone}/{allItems.length}
                    </span>
                    <button
                      onClick={() => setExpandedSection({ listId: list.id, title: section.title })}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(36,86,174,0.75)', fontFamily: 'Arial',
                        fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                        padding: '0', lineHeight: 1, transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(36,86,174,0.75)'}
                    >Expand</button>
                  </div>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {allItems.map(item => {
                    const key       = `${section.title}::${item}`
                    const hoverKey  = `${list.id}::${key}`
                    const isChecked = !!list.checked[key]
                    const isExtra   = extra.includes(item)
                    const isHovered = hovering === hoverKey
                    return (
                      <li key={item}
                        onMouseEnter={() => isExtra && setHovering(hoverKey)}
                        onMouseLeave={() => setHovering(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none', flex: 1 }}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggle(list.id, key)} style={{ display: 'none' }} />
                          <span style={{
                            width: '16px', height: '16px', flexShrink: 0,
                            border: `1.5px solid ${isChecked ? 'var(--gold)' : 'rgba(36,86,174,0.35)'}`,
                            borderRadius: '3px',
                            background: isChecked ? 'rgba(36,86,174,0.2)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}>
                            {isChecked && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l3 3 5-6" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </span>
                          <span style={{
                            fontFamily: 'Arial', fontSize: '0.855rem',
                            color: isChecked ? 'var(--text-muted)' : 'var(--text)',
                            textDecoration: isChecked ? 'line-through' : 'none',
                            transition: 'color 0.15s',
                          }}>
                            {item}
                          </span>
                        </label>
                        {isExtra && (
                          <button
                            onClick={() => deleteExtraItem(list.id, section.title, item)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.1rem',
                              color: isHovered ? '#e87070' : 'transparent',
                              fontSize: '0.75rem', lineHeight: 1, transition: 'color 0.15s', flexShrink: 0,
                            }}
                            title="Remove item"
                          >×</button>
                        )}
                      </li>
                    )
                  })}

                  {isAdding ? (
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <span style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                      <input
                        autoFocus
                        value={newItem}
                        onChange={e => setNewItem(e.target.value)}
                        onKeyDown={e => handleAddKeyDown(e, list.id, section.title)}
                        onBlur={() => commitAdd(list.id, section.title)}
                        placeholder="New item…"
                        style={{
                          flex: 1, background: 'transparent', border: 'none',
                          borderBottom: '1px solid rgba(36,86,174,0.4)',
                          color: 'var(--text)', fontFamily: 'Arial', fontSize: '0.855rem',
                          outline: 'none', padding: '0.1rem 0',
                        }}
                      />
                    </li>
                  ) : (
                    <li style={{ marginTop: '0.35rem' }}>
                      <button
                        onClick={() => startAdding(list.id, section.title)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'rgba(36,86,174,0.35)', fontFamily: 'Arial',
                          fontSize: '0.78rem', letterSpacing: '0.06em',
                          padding: '0', display: 'flex', alignItems: 'center', gap: '0.35rem',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(36,86,174,0.35)'}
                      >
                        + add item
                      </button>
                    </li>
                  )}
                </ul>

                {/* Notes */}
                <NoteBox
                  notes={list.notes?.[section.title] || []}
                  onAdd={text => addNote(list.id, section.title, text)}
                  onDelete={idx => deleteNote(list.id, section.title, idx)}
                  user={user}
                />
              </div>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
        <h2>Show Packing List</h2>
        {viewMode === 'single' && active && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={() => resetList(activeId)}>Reset</button>
            {lists.length > 1 && (
              <button
                onClick={() => setViewMode('all')}
                title="View all lists"
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  fontFamily: 'Arial', fontSize: '0.85rem',
                  padding: '0.28rem 0.6rem',
                  cursor: 'pointer', lineHeight: 1, transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >✕</button>
            )}
          </div>
        )}
      </div>
      <p className="page-subtitle">Chansonette Farm</p>

      {/* Show tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        {lists.map(l => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            <button
              onClick={() => { setActiveId(l.id); setViewMode('single') }}
              style={{
                background: viewMode === 'single' && activeId === l.id ? 'rgba(36,86,174,0.12)' : 'var(--surface)',
                border: `1px solid ${viewMode === 'single' && activeId === l.id ? 'var(--gold)' : 'var(--border)'}`,
                borderRight: 'none',
                borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                color: viewMode === 'single' && activeId === l.id ? 'var(--gold)' : 'var(--text-muted)',
                fontFamily: 'Arial', fontSize: '0.8rem', letterSpacing: '0.06em',
                padding: '0.35rem 0.85rem',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {l.name}
            </button>
            <button
              onClick={() => deleteList(l.id)}
              title="Delete list"
              style={{
                background: viewMode === 'single' && activeId === l.id ? 'rgba(36,86,174,0.12)' : 'var(--surface)',
                border: `1px solid ${viewMode === 'single' && activeId === l.id ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                color: 'var(--text-muted)', fontFamily: 'Arial', fontSize: '0.75rem',
                padding: '0.35rem 0.5rem',
                cursor: 'pointer', lineHeight: 1, transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >×</button>
          </div>
        ))}

        {showNew ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleNewKeyDown}
            onBlur={() => { if (newName.trim()) createList(); else { setShowNew(false); setNewName('') } }}
            placeholder="Show name…"
            style={{
              background: 'var(--surface)', border: '1px solid var(--gold)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text)',
              fontFamily: 'Arial', fontSize: '0.8rem', padding: '0.35rem 0.75rem',
              outline: 'none', width: '160px',
            }}
          />
        ) : (
          <button onClick={() => setShowNew(true)} className="btn btn-primary btn-sm">
            + New Show
          </button>
        )}
      </div>

      {/* No lists yet */}
      {lists.length === 0 && (
        <div className="card" style={{ opacity: 0.6, fontFamily: 'Arial', fontSize: '0.875rem' }}>
          No packing lists yet. Click <strong>+ New Show</strong> to create one.
        </div>
      )}

      {/* Single view */}
      {viewMode === 'single' && active && renderListContent(active)}

      {/* All view */}
      {viewMode === 'all' && lists.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {lists.map(list => (
            <div key={list.id}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '1.25rem', paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--border)',
              }}>
                <h3 style={{
                  fontFamily: 'Georgia', fontWeight: 'normal',
                  fontSize: '1.15rem', color: 'var(--gold)', letterSpacing: '0.04em',
                  margin: 0,
                }}>
                  {list.name}
                </h3>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => resetList(list.id)}
                >Reset</button>
              </div>
              {renderListContent(list)}
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => { setActiveId(list.id); setViewMode('single') }}
                >
                  Expand
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Expanded section overlay */}
      {expandedSection && (() => {
        const list    = lists.find(l => l.id === expandedSection.listId)
        const section = SECTIONS.find(s => s.title === expandedSection.title)
        if (!list || !section) return null
        const extra    = list.extraItems[section.title] || []
        const allItems = [...section.items, ...extra]
        const sectionDone = allItems.filter(item => list.checked[`${section.title}::${item}`]).length
        const isAdding = adding?.listId === list.id && adding?.title === section.title
        return (
          <div
            onClick={() => setExpandedSection(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="card"
              style={{
                width: '100%', maxWidth: '560px', maxHeight: '85vh',
                overflowY: 'auto', position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.3rem', color: 'var(--gold)', letterSpacing: '0.04em', margin: 0 }}>
                    {section.title}
                  </h3>
                  <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {list.name} · {sectionDone}/{allItems.length}
                  </span>
                </div>
                <button
                  onClick={() => setExpandedSection(null)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1,
                    padding: '0.2rem 0.4rem', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >✕</button>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {allItems.map(item => {
                  const key       = `${section.title}::${item}`
                  const hoverKey  = `overlay::${list.id}::${key}`
                  const isChecked = !!list.checked[key]
                  const isExtra   = extra.includes(item)
                  const isHovered = hovering === hoverKey
                  return (
                    <li key={item}
                      onMouseEnter={() => isExtra && setHovering(hoverKey)}
                      onMouseLeave={() => setHovering(null)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none', flex: 1 }}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggle(list.id, key)} style={{ display: 'none' }} />
                        <span style={{
                          width: '40px', height: '40px', flexShrink: 0,
                          border: `2px solid ${isChecked ? 'var(--gold)' : 'rgba(36,86,174,0.35)'}`,
                          borderRadius: '5px',
                          background: isChecked ? 'rgba(36,86,174,0.2)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {isChecked && (
                            <svg width="24" height="20" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l3 3 5-6" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <span style={{
                          fontFamily: 'Arial', fontSize: '2rem',
                          color: isChecked ? 'var(--text-muted)' : 'var(--text)',
                          textDecoration: isChecked ? 'line-through' : 'none',
                          transition: 'color 0.15s',
                        }}>
                          {item}
                        </span>
                      </label>
                      {isExtra && (
                        <button
                          onClick={() => deleteExtraItem(list.id, section.title, item)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.1rem',
                            color: isHovered ? '#e87070' : 'transparent',
                            fontSize: '0.85rem', lineHeight: 1, transition: 'color 0.15s', flexShrink: 0,
                          }}
                          title="Remove item"
                        >×</button>
                      )}
                    </li>
                  )
                })}
                {isAdding ? (
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                    <input
                      autoFocus
                      value={newItem}
                      onChange={e => setNewItem(e.target.value)}
                      onKeyDown={e => handleAddKeyDown(e, list.id, section.title)}
                      onBlur={() => commitAdd(list.id, section.title)}
                      placeholder="New item…"
                      style={{
                        flex: 1, background: 'transparent', border: 'none',
                        borderBottom: '1px solid rgba(36,86,174,0.4)',
                        color: 'var(--text)', fontFamily: 'Arial', fontSize: '1rem',
                        outline: 'none', padding: '0.1rem 0',
                      }}
                    />
                  </li>
                ) : (
                  <li style={{ marginTop: '0.5rem' }}>
                    <button
                      onClick={() => startAdding(list.id, section.title)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(36,86,174,0.35)', fontFamily: 'Arial',
                        fontSize: '0.85rem', letterSpacing: '0.06em',
                        padding: '0', display: 'flex', alignItems: 'center', gap: '0.35rem',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(36,86,174,0.35)'}
                    >
                      + add item
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
