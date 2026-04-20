import { useState, useEffect, useMemo } from 'react'
import { getShows, saveShow, deleteShow, getResults, addResult, deleteResult, getUsers, getHorses, getNotes, saveNote, deleteNote } from '../services/db'
import ScheduleImport from './ScheduleImport'

const TYPE_COLORS = {
  FEI:      { border: '#c0392b', bg: 'rgba(192,57,43,0.12)', text: '#e87070' },
  National: { border: '#3478b4', bg: 'rgba(52,120,180,0.12)', text: '#7ab8e8' },
}

const DAY_TYPES = ['Speed Class', 'Qualifier', '4* Show', '5* Show']

const NOTE_CATEGORIES = {
  Travel: { border: '#e8d44d', bg: 'rgba(232,212,77,0.1)', text: '#e8d44d' },
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_BG_COLORS = [
  '#0e1852', // Jan  – dark royal blue
  '#c07896', // Feb  – pink
  '#253327', // Mar  – hunter green
  '#3a8e8c', // Apr  – teal
  '#2456ae', // May  – royal blue
  '#b8d4ea', // Jun  – light blue
  '#b84a1a', // Jul  – orange
  '#7a2020', // Aug  – rust
  '#505878', // Sep  – cobalt blue
  '#2e2218', // Oct  – coffee
  '#7a1a8a', // Nov  – bright purple
  '#3d1a2e', // Dec  – dark purple
]
const MONTH_TEXT_COLORS = [
  '#ffffff', // Jan
  '#2a1020', // Feb  – dark (light bg)
  '#ffffff', // Mar
  '#ffffff', // Apr
  '#ffffff', // May
  '#1a2a3a', // Jun  – dark (light bg)
  '#ffffff', // Jul
  '#ffffff', // Aug
  '#ffffff', // Sep
  '#ffffff', // Oct
  '#ffffff', // Nov
  '#ffffff', // Dec
]
const DOW_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function parseDate(str) {
  const [y,m,d] = str.split('-').map(Number)
  return new Date(y, m-1, d)
}
function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
function startOfWeek(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d
}
function buildMonthGrid(year, month) {
  const firstDow  = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++)
    cells.push({ date: new Date(year, month, 1 - firstDow + i), inMonth: false })
  for (let d = 1; d <= totalDays; d++)
    cells.push({ date: new Date(year, month, d), inMonth: true })
  let extra = 1
  while (cells.length % 7 !== 0)
    cells.push({ date: new Date(year, month + 1, extra++), inMonth: false })
  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}
function dateRange(start, end) {
  if (!start) return []
  const dates = []
  let cur = parseDate(start)
  const last = end ? parseDate(end) : parseDate(start)
  while (cur <= last) { dates.push(dateKey(cur)); cur = addDays(cur, 1) }
  return dates
}

const TODAY = dateKey(new Date())

export default function Shows({ user }) {
  const canEdit = user?.role === 'admin' || user?.role === 'barn_manager'

  const [shows,       setShows]       = useState([])
  const [horses,      setHorses]      = useState([])
  const [staffList,   setStaffList]   = useState([])
  const [selected,    setSelected]    = useState(null)
  const [results,     setResults]     = useState([])
  const [showForm,    setShowForm]    = useState(false)
  const [showResForm, setShowResForm] = useState(false)
  const [saving,      setSaving]      = useState(false)

  const [notes,          setNotes]          = useState([])
  const [noteForm,       setNoteForm]       = useState(false)
  const [noteData,       setNoteData]       = useState({ date: '', text: '', category: '' })
  const [dayModal,       setDayModal]       = useState(null)
  const [editingNoteId,  setEditingNoteId]  = useState(null)
  const [editingNoteText,setEditingNoteText]= useState('')
  const [showImport,     setShowImport]     = useState(false)

  const now = new Date()
  const [view,      setView]      = useState('month')
  const [year,      setYear]      = useState(now.getFullYear())
  const [monthIdx,  setMonthIdx]  = useState(now.getMonth())
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now))

  const blankShow = {
    name: '', type: 'National', venue: '',
    city: '', state: '', country: 'USA', address: '',
    startDate: '', endDate: '', notes: '', status: 'Upcoming',
    horses: [], staff: [], schedule: {},
  }
  const blankRes = { horse: '', division: '', class: '', placing: '', prize: '', notes: '' }
  const [showFormData, setShowFormData] = useState(blankShow)
  const [resFormData,  setResFormData]  = useState(blankRes)

  const [dataLoaded, setDataLoaded] = useState({ shows: false, notes: false })

  useEffect(() => {
    getShows().then(s => { setShows(s); setDataLoaded(d => ({ ...d, shows: true })) }).catch(() => {})
    getHorses().then(setHorses).catch(() => {})
    getUsers().then(u => setStaffList(u.filter(x => x.role !== 'admin'))).catch(() => {})
    getNotes().then(n => { setNotes(n); setDataLoaded(d => ({ ...d, notes: true })) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!dataLoaded.shows || !dataLoaded.notes) return
    const todayDate = new Date()
    setDayModal({
      date: todayDate,
      key: TODAY,
      dateStr: todayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      shows: showsByDate[TODAY] || [],
      notes: notesByDate[TODAY] || [],
    })
  }, [dataLoaded.shows, dataLoaded.notes])
  useEffect(() => {
    if (!selected) return
    getResults(selected.id).then(setResults).catch(() => {})
  }, [selected])

  const showsByDate = useMemo(() => {
    const map = {}
    shows.forEach(s => {
      if (!s.startDate) return
      const start = parseDate(s.startDate)
      const end   = s.endDate ? parseDate(s.endDate) : start
      let cur = new Date(start)
      while (cur <= end) {
        const key = dateKey(cur)
        ;(map[key] ??= []).push(s)
        cur = addDays(cur, 1)
      }
    })
    return map
  }, [shows])

  const notesByDate = useMemo(() => {
    const map = {}
    notes.forEach(n => { (map[n.date] ??= []).push(n) })
    return map
  }, [notes])

  // Combined list view items: shows (by startDate) + notes, merged and grouped by month
  const listItems = useMemo(() => {
    const items = []
    shows.forEach(s => s.startDate && items.push({ kind: 'show', date: s.startDate, data: s }))
    notes.forEach(n => items.push({ kind: 'note', date: n.date, data: n }))
    items.sort((a, b) => a.date.localeCompare(b.date))
    const groups = {}
    items.forEach(item => {
      const d = parseDate(item.date)
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
      if (!groups[key]) groups[key] = { label, items: [] }
      groups[key].items.push(item)
    })
    return groups
  }, [shows, notes])

  const scheduleDays = useMemo(
    () => dateRange(showFormData.startDate, showFormData.endDate),
    [showFormData.startDate, showFormData.endDate]
  )

  async function handleSaveShow(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (selected?.id) {
        await saveShow(selected.id, showFormData)
        setShows(s => s.map(x => x.id === selected.id ? { ...x, ...showFormData } : x))
        setSelected(s => ({ ...s, ...showFormData }))
      } else {
        const id = await saveShow(null, showFormData)
        const ns = { id, ...showFormData }
        setShows(s => [...s, ns])
        setSelected(ns)
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  async function handleDeleteShow(show) {
    if (!window.confirm(`Remove ${show.name}?`)) return
    await deleteShow(show.id)
    setShows(s => s.filter(x => x.id !== show.id))
    setSelected(null)
  }

  async function handleAddResult(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await addResult(selected.id, resFormData)
      const updated = await getResults(selected.id)
      setResults(updated)
      setResFormData(blankRes)
      setShowResForm(false)
    } finally { setSaving(false) }
  }

  async function handleSaveNote(e) {
    e.preventDefault()
    if (!noteData.text.trim() || !noteData.date) return
    setSaving(true)
    try {
      const data = { date: noteData.date, text: noteData.text.trim(), category: noteData.category || '' }
      const id = await saveNote(null, data)
      setNotes(n => [...n, { id, ...data }].sort((a, b) => a.date.localeCompare(b.date)))
      setNoteForm(false)
      setNoteData({ date: '', text: '', category: '' })
    } finally { setSaving(false) }
  }

  async function handleDeleteNote(id) {
    await deleteNote(id)
    setNotes(n => n.filter(x => x.id !== id))
  }

  function toggleArr(arr, val) {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  function openNewShow() { setShowFormData(blankShow); setShowForm(true) }
  function openEditShow() {
    setShowFormData({
      name:      selected.name      || '',
      type:      selected.type      || 'National',
      venue:     selected.venue     || '',
      city:      selected.city      || '',
      state:     selected.state     || '',
      country:   selected.country   || 'USA',
      address:   selected.address   || '',
      startDate: selected.startDate || '',
      endDate:   selected.endDate   || '',
      notes:     selected.notes     || '',
      status:    selected.status    || 'Upcoming',
      horses:    selected.horses    || [],
      staff:     selected.staff     || [],
      schedule:  selected.schedule  || {},
    })
    setShowForm(true)
  }

  function prevMonth() {
    if (monthIdx === 0) { setMonthIdx(11); setYear(y => y - 1) }
    else setMonthIdx(m => m - 1)
  }
  function nextMonth() {
    if (monthIdx === 11) { setMonthIdx(0); setYear(y => y + 1) }
    else setMonthIdx(m => m + 1)
  }
  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d, 7)) }
  function toggleShow(s) { setSelected(prev => prev?.id === s.id ? null : s) }

  async function handleSaveNoteEdit(note) {
    const text = editingNoteText.trim()
    if (!text) return
    await saveNote(note.id, { ...note, text })
    setNotes(n => n.map(x => x.id === note.id ? { ...x, text } : x))
    setDayModal(d => d ? { ...d, notes: d.notes.map(x => x.id === note.id ? { ...x, text } : x) } : d)
    setEditingNoteId(null)
  }

  function openEditShowFromModal(s) {
    setSelected(s)
    setShowFormData({
      name:      s.name      || '',
      type:      s.type      || 'National',
      venue:     s.venue     || '',
      city:      s.city      || '',
      state:     s.state     || '',
      country:   s.country   || 'USA',
      address:   s.address   || '',
      startDate: s.startDate || '',
      endDate:   s.endDate   || '',
      notes:     s.notes     || '',
      status:    s.status    || 'Upcoming',
      horses:    s.horses    || [],
      staff:     s.staff     || [],
      schedule:  s.schedule  || {},
    })
    setShowForm(true)
    setDayModal(null)
  }

  function openDayModal(date, key) {
    setDayModal({
      date,
      key,
      dateStr: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      shows: showsByDate[key] || [],
      notes: notesByDate[key] || [],
    })
  }

  const monthGrid = useMemo(() => buildMonthGrid(year, monthIdx), [year, monthIdx])
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const tc = selected ? (TYPE_COLORS[selected.type] || TYPE_COLORS.National) : null

  return (
    <div className="page">
      <h2 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Show &amp; Event Calendar</h2>
      {canEdit && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={openNewShow}>+ Add Show</button>
          <button className="btn btn-outline btn-sm" onClick={() => { setNoteData({ date: TODAY, text: '' }); setNoteForm(true) }}>+ Note</button>
          <button className="btn btn-sm" style={{ background: '#163590', border: '1px solid #c9a84c', color: '#c9a84c', fontWeight: 700 }} onClick={() => setShowImport(true)}>📷 Import Schedule</button>
        </div>
      )}

      {/* Legend */}
      <div className="cal-legend">
        {Object.entries(TYPE_COLORS).map(([k, v]) => (
          <span key={k} className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: v.border }} />
            {k}
          </span>
        ))}
        <span className="cal-legend-item">
          <span className="cal-legend-dot" style={{ background: 'rgba(255,255,255,0.25)' }} />
          Note
        </span>
        <span className="cal-legend-item">
          <span className="cal-legend-dot" style={{ background: '#e8d44d' }} />
          Travel
        </span>
      </div>

      {/* Cal header */}
      <div className="cal-header">
        {view === 'month' ? (
          <div className="cal-nav">
            <button className="cal-arrow" onClick={prevMonth}>&#8249;</button>
            <span className="cal-nav-title" style={{ background: MONTH_BG_COLORS[monthIdx], color: MONTH_TEXT_COLORS[monthIdx] }}>{MONTH_NAMES[monthIdx]} {year}</span>
            <button className="cal-arrow" onClick={nextMonth}>&#8250;</button>
          </div>
        ) : view === 'week' ? (
          <div className="cal-nav">
            <button className="cal-arrow" onClick={prevWeek}>&#8249;</button>
            <span className="cal-nav-title" style={{ minWidth: '300px' }}>
              {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              {' – '}
              {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <button className="cal-arrow" onClick={nextWeek}>&#8250;</button>
          </div>
        ) : <div />}
        <div className="cal-view-toggle">
          <button className={view === 'list'  ? 'active' : ''} onClick={() => setView('list')}>List</button>
          <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Month</button>
          <button className={view === 'week'  ? 'active' : ''} onClick={() => setView('week')}>Week</button>
        </div>
      </div>

      {/* ── List View ── */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {Object.keys(listItems).length === 0
            ? <p style={{ opacity: 0.5, fontSize: '0.85rem', fontFamily: 'Arial' }}>No shows or notes yet.</p>
            : Object.entries(listItems).map(([key, { label, items }]) => (
              <div key={key}>
                <div style={{ fontFamily: 'Georgia', fontSize: '1.05rem', color: 'var(--gold)', marginBottom: '0.6rem', paddingBottom: '0.35rem', borderBottom: '1px solid var(--border)' }}>
                  {label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {items.map(item => {
                    if (item.kind === 'note') {
                      const n = item.data
                      const nc = NOTE_CATEGORIES[n.category]
                      return (
                        <div key={n.id} style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', borderLeft: nc ? `3px solid ${nc.border}` : '3px solid transparent' }}>
                          <span style={{ fontFamily: 'Arial', fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: '52px' }}>
                            {parseDate(n.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span style={{ fontFamily: 'Arial', fontSize: '0.875rem', color: nc ? nc.text : 'var(--text)', flex: 1 }}>{n.text}</span>
                          {canEdit && (
                            <button onClick={() => handleDeleteNote(n.id)} style={{ background: 'none', border: 'none', color: 'transparent', cursor: 'pointer', fontSize: '0.72rem', flexShrink: 0, padding: '0 0.2rem' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                              onMouseLeave={e => e.currentTarget.style.color = 'transparent'}
                              title="Delete note"
                            >✕</button>
                          )}
                        </div>
                      )
                    }
                    const s = item.data
                    const stc = TYPE_COLORS[s.type] || TYPE_COLORS.National
                    const isPast = (s.endDate || s.startDate) && parseDate(s.endDate || s.startDate) < new Date()
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleShow(s)}
                        style={{
                          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.4rem 0.9rem', alignItems: 'center',
                          background: selected?.id === s.id ? stc.bg : 'var(--surface)',
                          border: `1px solid ${selected?.id === s.id ? stc.border : 'var(--border)'}`,
                          borderLeft: `4px solid ${stc.border}`,
                          borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem',
                          textAlign: 'left', cursor: 'pointer', width: '100%', color: 'inherit',
                          opacity: isPast ? 0.7 : 1,
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'Arial' }}>
                          {parseDate(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {s.endDate && s.endDate !== s.startDate && (
                            <><br />{parseDate(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                          )}
                        </span>
                        <span>
                          <span style={{ fontFamily: 'Georgia', fontSize: '0.95rem', color: selected?.id === s.id ? stc.text : 'var(--cream)' }}>{s.name}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                            <span style={{ fontSize: '0.6rem', fontFamily: 'Arial', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: stc.text, background: stc.bg, border: `1px solid ${stc.border}`, borderRadius: '3px', padding: '0.08rem 0.3rem' }}>{s.type || 'National'}</span>
                            {(s.city || s.state) && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'Arial' }}>{[s.city, s.state].filter(Boolean).join(', ')}</span>}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Month View ── */}
      {view === 'month' && (
        <div className="month-cal" style={{ marginBottom: '1.5rem', background: MONTH_BG_COLORS[monthIdx], border: `1px solid ${MONTH_BG_COLORS[monthIdx]}` }}>
          <div className="month-dow-row">
            {DOW_LABELS.map(d => <div key={d} className="month-dow">{d}</div>)}
          </div>
          {monthGrid.map((row, ri) => (
            <div key={ri} className="month-row">
              {row.map(({ date, inMonth }) => {
                const key      = dateKey(date)
                const dayShows = showsByDate[key] || []
                const dayNotes = notesByDate[key] || []
                return (
                  <div key={key} className={`month-cell${inMonth ? '' : ' other-month'}${key === TODAY ? ' today' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openDayModal(date, key)}
                  >
                    <span className="month-day-num">{date.getDate()}</span>
                    <div className="month-pills">
                      {dayShows.map(s => {
                        const stc = TYPE_COLORS[s.type] || TYPE_COLORS.National
                        return (
                          <div key={s.id} className="cal-pill" style={{ borderColor: stc.border, color: stc.text }}>
                            {s.name}
                          </div>
                        )
                      })}
                      {dayNotes.map(n => {
                        const nc = NOTE_CATEGORIES[n.category]
                        return (
                          <div key={n.id} className="cal-pill" style={{ borderColor: nc ? nc.border : '#6b7a8d', color: nc ? nc.text : '#3a4a5c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.text}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Week View ── */}
      {view === 'week' && (
        <div className="week-cal" style={{ marginBottom: '1.5rem' }}>
          <div className="week-columns">
            {weekDates.map((date, i) => {
              const key      = dateKey(date)
              const dayShows = showsByDate[key] || []
              const dayNotes = notesByDate[key] || []
              return (
                <div key={key} className={`week-col${(dayShows.length || dayNotes.length) ? ' has-games' : ''}`}>
                  <div className={`week-col-header${key === TODAY ? ' today' : ''}`}>
                    <span className="week-col-day">{DOW_LABELS[i]}</span>
                    <span className="week-col-date">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="week-col-games">
                    {dayShows.length === 0 && dayNotes.length === 0
                      ? <div className="week-no-game">–</div>
                      : <>
                          {dayShows.map(s => {
                            const stc = TYPE_COLORS[s.type] || TYPE_COLORS.National
                            return (
                              <button
                                key={s.id}
                                className={`week-game-card${selected?.id === s.id ? ' selected' : ''}`}
                                style={{ borderColor: stc.border, background: stc.bg }}
                                onClick={() => toggleShow(s)}
                              >
                                <span className="week-phase" style={{ color: stc.text }}>{s.type || 'National'}</span>
                                <span className="week-team">{s.name}</span>
                                {(s.city || s.state) && <span className="week-time">{[s.city, s.state].filter(Boolean).join(', ')}</span>}
                              </button>
                            )
                          })}
                          {dayNotes.map(n => {
                            const nc = NOTE_CATEGORIES[n.category]
                            return (
                            <div key={n.id} style={{ position: 'relative', padding: '0.4rem 1.4rem 0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${nc ? nc.border : 'rgba(255,255,255,0.08)'}`, background: nc ? nc.bg : 'rgba(255,255,255,0.03)' }}>
                              <p style={{ fontFamily: 'Arial', fontSize: '0.78rem', color: nc ? nc.text : 'var(--text)', margin: 0, lineHeight: 1.45 }}>{n.text}</p>
                              {canEdit && (
                                <button onClick={() => handleDeleteNote(n.id)} style={{ position: 'absolute', top: '0.25rem', right: '0.3rem', background: 'none', border: 'none', color: 'transparent', cursor: 'pointer', fontSize: '0.65rem', lineHeight: 1, padding: 0 }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                                  onMouseLeave={e => e.currentTarget.style.color = 'transparent'}
                                  title="Delete"
                                >✕</button>
                              )}
                            </div>
                          )})}
                        </>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Show Detail Panel ── */}
      {selected && tc && (
        <div className="game-detail" style={{ borderLeftColor: tc.border, marginBottom: '1.5rem', position: 'relative' }}>
          <div className="game-detail-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontFamily: 'Arial', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tc.text, background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: '4px', padding: '0.15rem 0.45rem' }}>
                {selected.type || 'National'}
              </span>
              {canEdit && (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn btn-outline btn-sm" onClick={openEditShow}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteShow(selected)}>Remove</button>
                </div>
              )}
            </div>
            <button className="game-detail-close" onClick={() => setSelected(null)}>✕</button>
          </div>

          <div style={{ fontFamily: 'Georgia', fontSize: '1.5rem', fontWeight: 'normal', color: 'var(--cream)', marginBottom: '0.75rem' }}>
            {selected.name}
          </div>

          <div className="game-detail-info" style={{ marginBottom: '0.75rem' }}>
            {selected.startDate && (
              <div>
                <strong>Dates:</strong>{' '}
                {parseDate(selected.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {selected.endDate && selected.endDate !== selected.startDate && ` – ${parseDate(selected.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              </div>
            )}
            {selected.venue && <div><strong>Venue:</strong> {selected.venue}</div>}
            {(selected.city || selected.state || selected.country) && (
              <div><strong>Location:</strong> {[selected.city, selected.state, selected.country].filter(Boolean).join(', ')}</div>
            )}
            {selected.address && <div><strong>Address:</strong> {selected.address}</div>}
            <div><strong>Status:</strong> <span className={`badge ${selected.status === 'Completed' ? 'badge-muted' : 'badge-green'}`}>{selected.status}</span></div>
          </div>

          {/* Daily Schedule */}
          {selected.schedule && dateRange(selected.startDate, selected.endDate).some(d => selected.schedule[d]) && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ color: 'var(--gold)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Arial', marginBottom: '0.4rem' }}>Daily Schedule</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {dateRange(selected.startDate, selected.endDate).map(d => {
                  const type = selected.schedule?.[d]
                  return (
                    <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'Arial', fontSize: '0.855rem' }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: '72px' }}>
                        {parseDate(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      {type
                        ? <span className="badge badge-gold">{type}</span>
                        : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>—</span>
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {selected.horses?.length > 0 && (
            <div style={{ marginBottom: '0.6rem' }}>
              <div style={{ color: 'var(--gold)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Arial', marginBottom: '0.35rem' }}>Horses Attending</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {selected.horses.map(h => <span key={h} className="badge badge-gold">{h}</span>)}
              </div>
            </div>
          )}

          {selected.staff?.length > 0 && (
            <div style={{ marginBottom: '0.6rem' }}>
              <div style={{ color: 'var(--gold)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Arial', marginBottom: '0.35rem' }}>Staff Attending</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {selected.staff.map(s => <span key={s} className="badge badge-green">{s}</span>)}
              </div>
            </div>
          )}

          {selected.notes && <p style={{ fontSize: '0.875rem', opacity: 0.8, fontFamily: 'Arial', marginBottom: '0.75rem' }}>{selected.notes}</p>}

          {/* Results */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'Georgia', fontSize: '1rem', color: 'var(--gold)' }}>Results</span>
              {canEdit && <button className="btn btn-outline btn-sm" onClick={() => setShowResForm(v => !v)}>+ Add Result</button>}
            </div>

            {showResForm && canEdit && (
              <form className="card" style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.2)' }} onSubmit={handleAddResult}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Horse</label>
                    <select value={resFormData.horse} onChange={e => setResFormData(f => ({ ...f, horse: e.target.value }))} required>
                      <option value="">Select horse</option>
                      {(selected.horses?.length > 0 ? horses.filter(h => selected.horses.includes(h.name)) : horses).map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Division</label>
                    <input value={resFormData.division} onChange={e => setResFormData(f => ({ ...f, division: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Class</label>
                    <input value={resFormData.class} onChange={e => setResFormData(f => ({ ...f, class: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Placing</label>
                    <input value={resFormData.placing} onChange={e => setResFormData(f => ({ ...f, placing: e.target.value }))} placeholder="e.g. 1st" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Prize Money</label>
                    <input value={resFormData.prize} onChange={e => setResFormData(f => ({ ...f, prize: e.target.value }))} placeholder="e.g. $500" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                  <label>Notes</label>
                  <textarea value={resFormData.notes} onChange={e => setResFormData(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowResForm(false)}>Cancel</button>
                </div>
              </form>
            )}

            {results.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr><th>Horse</th><th>Division</th><th>Class</th><th>Placing</th><th>Prize</th>{canEdit && <th></th>}</tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id}>
                      <td>{r.horse}</td>
                      <td>{r.division}</td>
                      <td>{r.class}</td>
                      <td><span className="badge badge-gold">{r.placing}</span></td>
                      <td style={{ color: 'var(--gold-light)' }}>{r.prize}</td>
                      {canEdit && <td><button onClick={() => deleteResult(selected.id, r.id).then(() => setResults(rs => rs.filter(x => x.id !== r.id)))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ opacity: 0.5, fontSize: '0.85rem', fontFamily: 'Arial' }}>No results recorded yet.</p>
            )}
          </div>
          <span style={{ position: 'absolute', bottom: '1rem', right: '1.25rem', fontFamily: 'Arial', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: tc.text, opacity: 0.4 }}>{selected.type || 'National'}</span>
        </div>
      )}

      {/* ── Add / Edit Show Modal ── */}
      {showForm && canEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, overflowY: 'auto', padding: '2rem 1.5rem' }}>
          <form className="card" style={{ width: '100%', maxWidth: '520px', background: 'var(--green-deep)', border: '1px solid var(--gold-dark)', position: 'relative' }} onSubmit={handleSaveShow}>
            <button type="button" onClick={() => setShowForm(false)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: '0.1rem 0.3rem' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >✕</button>
            <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.2rem', marginBottom: '1.25rem' }}>{selected?.id ? 'Edit Show' : 'Add Show'}</h3>

            <div className="form-group">
              <label>Show Name</label>
              <input
                value={showFormData.name}
                onChange={e => setShowFormData(f => ({ ...f, name: e.target.value }))}
                required
                style={{
                  background: (TYPE_COLORS[showFormData.type] || TYPE_COLORS.National).bg,
                  borderColor: (TYPE_COLORS[showFormData.type] || TYPE_COLORS.National).border,
                  color: 'var(--text)',
                  fontFamily: 'Georgia',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                }}
              />
            </div>
            <div className="form-group"><label>Venue</label><input value={showFormData.venue} onChange={e => setShowFormData(f => ({ ...f, venue: e.target.value }))} placeholder="e.g. HITS Ocala, Tryon International Equestrian Center" /></div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label>City</label><input value={showFormData.city} onChange={e => setShowFormData(f => ({ ...f, city: e.target.value }))} /></div>
              <div className="form-group"><label>State / Province</label><input value={showFormData.state} onChange={e => setShowFormData(f => ({ ...f, state: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label>Country</label><input value={showFormData.country} onChange={e => setShowFormData(f => ({ ...f, country: e.target.value }))} /></div>
              <div className="form-group"><label>Address</label><input value={showFormData.address} onChange={e => setShowFormData(f => ({ ...f, address: e.target.value }))} /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label>Start Date</label><input type="date" value={showFormData.startDate} onChange={e => setShowFormData(f => ({ ...f, startDate: e.target.value }))} required /></div>
              <div className="form-group"><label>End Date</label><input type="date" value={showFormData.endDate} onChange={e => setShowFormData(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>

            {/* Day-by-day schedule — appears once dates are set */}
            {scheduleDays.length > 0 && (
              <div className="form-group">
                <label>Daily Schedule</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.6rem', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)' }}>
                  {scheduleDays.map(d => (
                    <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontFamily: 'Arial', fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '80px' }}>
                        {parseDate(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <select
                        value={showFormData.schedule[d] || ''}
                        onChange={e => setShowFormData(f => ({ ...f, schedule: { ...f.schedule, [d]: e.target.value } }))}
                        style={{ flex: 1, background: 'rgba(255,255,255,0.90)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0.3rem 0.5rem', fontFamily: 'Arial', fontSize: '0.8rem', outline: 'none' }}
                      >
                        <option value="">— no event —</option>
                        {DAY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Show Type</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {['FEI', 'National'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setShowFormData(f => ({ ...f, type: t }))}
                    style={{
                      flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${showFormData.type === t ? TYPE_COLORS[t].border : 'var(--border)'}`,
                      background: showFormData.type === t ? TYPE_COLORS[t].bg : 'transparent',
                      color: showFormData.type === t ? TYPE_COLORS[t].text : 'var(--text-muted)',
                      fontWeight: showFormData.type === t ? 700 : 400,
                      cursor: 'pointer', fontFamily: 'Arial', fontSize: '0.9rem',
                    }}
                  >{t}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select value={showFormData.status} onChange={e => setShowFormData(f => ({ ...f, status: e.target.value }))}>
                <option>Upcoming</option><option>In Progress</option><option>Completed</option><option>Cancelled</option>
              </select>
            </div>

            {horses.length > 0 && (
              <div className="form-group">
                <label>Horses Attending</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value=""
                    onChange={e => { if (e.target.value) setShowFormData(f => ({ ...f, horses: toggleArr(f.horses, e.target.value) })) }}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.90)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0.5rem 0.75rem', fontFamily: 'Georgia', fontSize: '1rem', outline: 'none' }}
                  >
                    <option value="">— Add a horse —</option>
                    {horses.filter(h => !showFormData.horses.includes(h.name)).map(h => (
                      <option key={h.id} value={h.name}>{h.name}</option>
                    ))}
                  </select>
                </div>
                {showFormData.horses.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {showFormData.horses.map(name => (
                      <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#4a72c8', border: '1px solid #2456ae', borderRadius: '999px', padding: '0.45rem 1.1rem', fontFamily: 'Georgia', fontSize: '1.1rem', color: '#ffffff' }}>
                        {name}
                        <button type="button" onClick={() => setShowFormData(f => ({ ...f, horses: f.horses.filter(x => x !== name) }))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1, padding: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                        >✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {staffList.length > 0 && (
              <div className="form-group">
                <label>Staff Attending</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value=""
                    onChange={e => { if (e.target.value) setShowFormData(f => ({ ...f, staff: toggleArr(f.staff, e.target.value) })) }}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.90)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0.5rem 0.75rem', fontFamily: 'Georgia', fontSize: '1rem', outline: 'none' }}
                  >
                    <option value="">— Add a staff member —</option>
                    {staffList.filter(s => !showFormData.staff.includes(s.name)).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                {showFormData.staff.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {showFormData.staff.map(name => (
                      <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#b84a1a', border: '1px solid #8f3712', borderRadius: '999px', padding: '0.45rem 1.1rem', fontFamily: 'Georgia', fontSize: '1.1rem', color: '#ffffff' }}>
                        {name}
                        <button type="button" onClick={() => setShowFormData(f => ({ ...f, staff: f.staff.filter(x => x !== name) }))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1, padding: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                        >✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="form-group"><label>Notes</label><textarea value={showFormData.notes} onChange={e => setShowFormData(f => ({ ...f, notes: e.target.value }))} /></div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
            <span style={{ position: 'absolute', bottom: '1rem', right: '1.25rem', fontFamily: 'Arial', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: (TYPE_COLORS[showFormData.type] || TYPE_COLORS.National).border, opacity: 0.8 }}>
              {showFormData.type || 'National'}
            </span>
          </form>
        </div>
      )}

      {/* ── Add Note Modal ── */}
      {noteForm && canEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }}>
          <form className="card" style={{ width: '100%', maxWidth: '400px', background: 'var(--green-deep)', border: '1px solid var(--gold-dark)' }} onSubmit={handleSaveNote}>
            <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.1rem', marginBottom: '1rem' }}>Add Note</h3>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={noteData.date} onChange={e => setNoteData(d => ({ ...d, date: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={noteData.category} onChange={e => setNoteData(d => ({ ...d, category: e.target.value }))}>
                <option value="">General</option>
                <option value="Travel">Travel</option>
              </select>
            </div>
            <div className="form-group">
              <label>Note</label>
              <textarea
                value={noteData.text}
                onChange={e => setNoteData(d => ({ ...d, text: e.target.value }))}
                required rows={3}
                placeholder="e.g. Ken leaves for TX, Arena opens 2–3:30pm…"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button type="button" className="btn btn-outline" onClick={() => { setNoteForm(false); setNoteData({ date: '', text: '' }) }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Day Modal ── */}
      {dayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setDayModal(null)}
        >
          <div style={{ width: '100%', maxWidth: '500px', background: '#dce8f5', border: '1px solid #9ab0c8', borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Title bar */}
            <div style={{ background: '#163590', border: '1px solid #c9a84c', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: 'Georgia', fontSize: '1.3rem', color: '#ffffff', lineHeight: 1.2 }}>
                  {dayModal.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ fontFamily: 'Arial', fontSize: '0.8rem', color: 'rgba(255,255,255,0.60)', marginTop: '0.15rem' }}>{dayModal.date.getFullYear()}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {canEdit && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => { setDayModal(null); setSelected(null); setShowFormData({ ...blankShow, startDate: dayModal.key }); setShowForm(true) }}>+ Show</button>
                    <button className="btn btn-outline btn-sm" style={{ borderColor: '#c9a84c', color: '#c9a84c' }} onClick={() => { setNoteData({ date: dayModal.key, text: '', category: '' }); setNoteForm(true); setDayModal(null) }}>+ Note</button>
                  </>
                )}
                <button onClick={() => setDayModal(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >✕</button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '1.1rem', overflowY: 'auto' }}>
              {dayModal.shows.length === 0 && dayModal.notes.length === 0 && (
                <p style={{ fontFamily: 'Arial', fontSize: '0.9rem', color: 'var(--text-muted)' }}>No events or notes for this day.</p>
              )}

              {/* Shows */}
              {dayModal.shows.length > 0 && (
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontFamily: 'Arial', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Shows</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {dayModal.shows.map(s => {
                      const stc = TYPE_COLORS[s.type] || TYPE_COLORS.National
                      return (
                        <div key={s.id} style={{ position: 'relative', background: '#ffffff', border: `1px solid ${stc.border}`, borderLeft: `4px solid ${stc.border}`, borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem' }}>
                          <div style={{ fontFamily: 'Georgia', fontSize: '1.1rem', color: '#0d1b4b', marginBottom: '0.25rem' }}>{s.name}</div>
                          {(s.venue || s.city || s.state) && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'Arial', marginBottom: '0.2rem' }}>
                              {[s.venue, s.city, s.state].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          {s.horses?.length > 0 && (
                            <div style={{ fontSize: '0.82rem', color: '#2456ae', fontFamily: 'Arial', marginBottom: '0.2rem' }}>🐴 {s.horses.join(', ')}</div>
                          )}
                          {s.staff?.length > 0 && (
                            <div style={{ fontSize: '0.82rem', color: '#b84a1a', fontFamily: 'Arial', marginBottom: '0.2rem' }}>👤 {s.staff.join(', ')}</div>
                          )}
                          {s.notes && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'Arial', marginTop: '0.3rem', fontStyle: 'italic' }}>{s.notes}</div>}
                          {canEdit && (
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.55rem' }}>
                              <button className="btn btn-primary btn-sm" onClick={() => openEditShowFromModal(s)}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={async () => { if (window.confirm(`Remove ${s.name}?`)) { await handleDeleteShow(s); setDayModal(d => d ? { ...d, shows: d.shows.filter(x => x.id !== s.id) } : d) } }}>Remove</button>
                            </div>
                          )}
                          <span style={{ position: 'absolute', bottom: '0.5rem', right: '0.75rem', fontFamily: 'Arial', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: stc.text, opacity: 0.45 }}>{s.type}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              {dayModal.notes.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'Arial', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Notes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {dayModal.notes.map(n => {
                      const nc = NOTE_CATEGORIES[n.category]
                      const isEditingThis = editingNoteId === n.id
                      return (
                        <div key={n.id} style={{ padding: '0.5rem 0.75rem', background: '#ffffff', border: `1px solid ${nc ? nc.border : '#9ab0c8'}`, borderRadius: 'var(--radius-sm)' }}>
                          {isEditingThis ? (
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <input
                                autoFocus
                                value={editingNoteText}
                                onChange={e => setEditingNoteText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveNoteEdit(n); if (e.key === 'Escape') setEditingNoteId(null) }}
                                style={{ flex: 1, background: '#ffffff', border: '1px solid #c9a84c', borderRadius: 'var(--radius-sm)', color: '#0d1b4b', fontFamily: 'Arial', fontSize: '0.9rem', padding: '0.25rem 0.5rem', outline: 'none' }}
                              />
                              <button className="btn btn-primary btn-sm" onClick={() => handleSaveNoteEdit(n)}>Save</button>
                              <button className="btn btn-outline btn-sm" onClick={() => setEditingNoteId(null)}>✕</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                              {nc && <span style={{ width: 8, height: 8, borderRadius: '50%', background: nc.border, flexShrink: 0, marginTop: '0.35rem' }} />}
                              <span style={{ fontFamily: 'Arial', fontSize: '0.9rem', color: nc ? nc.text : '#0d1b4b', flex: 1 }}>{n.text}</span>
                              {canEdit && (
                                <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }}>
                                  <button onClick={() => { setEditingNoteId(n.id); setEditingNoteText(n.text) }} style={{ background: 'none', border: 'none', color: '#2456ae', cursor: 'pointer', fontSize: '0.85rem', opacity: 0.7, padding: '0 0.2rem' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                                  >✎</button>
                                  <button onClick={async () => { await handleDeleteNote(n.id); setDayModal(d => d ? { ...d, notes: d.notes.filter(x => x.id !== n.id) } : d) }} style={{ background: 'none', border: 'none', color: 'transparent', cursor: 'pointer', fontSize: '0.8rem', padding: '0 0.2rem' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'transparent'}
                                  >✕</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Import Modal ── */}
      {showImport && canEdit && (
        <ScheduleImport
          onImported={() => getShows().then(setShows).catch(() => {})}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
