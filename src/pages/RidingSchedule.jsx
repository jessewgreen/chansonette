import { useState, useEffect, useRef } from 'react'
import { getHorses, getUsers, getRidingSchedules, upsertRidingSchedule, getRidingScheduleConfig, saveRidingScheduleConfig } from '../services/db'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SPECIAL = ['VET', 'T.O.', 'Walker', 'Trail', 'Show Day', 'OFF']

const ACTIVITIES = ['', 'T.O.', 'Walker', 'Trail', 'Show Day', 'OFF', 'VET', 'Ferrier']

const SPECIAL_COLORS = {
  'VET':      '#e87070',
  'Ferrier':  '#e87070',
  'T.O.':     '#7ab8e8',
  'Walker':   '#7ecfa0',
  'Trail':    '#7ecfa0',
  'Show Day': '#e8d44d',
  'OFF':      'rgba(255,255,255,0.45)',
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getMondayOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function getWeeksOfYear(year) {
  const weeks = []
  const jan1 = new Date(year, 0, 1)
  let mon = getMondayOfWeek(jan1)
  if (mon.getFullYear() < year) mon = new Date(mon.getTime() + 7 * 86400000)
  while (mon.getFullYear() === year) {
    const sun = new Date(mon.getTime() + 6 * 86400000)
    weeks.push({ weekStart: toDateStr(mon), weekEnd: toDateStr(sun) })
    mon = new Date(mon.getTime() + 7 * 86400000)
  }
  return weeks
}

function shortDate(dateStr) {
  const [, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m)-1]} ${parseInt(d)}`
}

function initials(name) {
  if (!name) return ''
  return name.trim().split(' ').map(p => p[0]).join('').toUpperCase()
}

function cellKey(horseName, day) {
  return `${horseName}||${day}`
}

export default function RidingSchedule({ user }) {
  const canEdit = user?.role === 'admin' || user?.role === 'barn_manager' ||
                  user?.activeRole === 'admin' || user?.activeRole === 'barn_manager' ||
                  user?.additionalRoles?.includes('admin')

  const today         = new Date()
  const todayStr      = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const currentYear   = today.getFullYear()
  const currentWeekStart = toDateStr(getMondayOfWeek(today))
  const weeks         = getWeeksOfYear(currentYear)

  const [horses,      setHorses]      = useState([])
  const [staff,       setStaff]       = useState([])
  const [scheduleMap, setScheduleMap] = useState({})
  const [activeWeek,  setActiveWeek]  = useState(currentWeekStart)
  const [editing,     setEditing]     = useState(false)
  const [draft,       setDraft]       = useState({})
  const [saving,      setSaving]      = useState(false)
  const [editingLabel,      setEditingLabel]      = useState(false)
  const [labelDraft,        setLabelDraft]        = useState('')
  const [legendOpen,        setLegendOpen]        = useState(false)
  const [customRiders,      setCustomRiders]      = useState([])
  const [customActivities,  setCustomActivities]  = useState([])
  const [addingRider,       setAddingRider]       = useState(false)
  const [addingActivity,    setAddingActivity]    = useState(false)
  const [newRiderName,      setNewRiderName]      = useState('')
  const [newActivityName,   setNewActivityName]   = useState('')

  const tabsRef     = useRef(null)
  const activeTabRef = useRef(null)

  useEffect(() => {
    getHorses().then(setHorses).catch(() => {})
    getUsers().then(u => setStaff(u.filter(x => x.role !== 'admin'))).catch(() => {})
    getRidingScheduleConfig().then(cfg => {
      setCustomRiders(cfg.customRiders || [])
      setCustomActivities(cfg.customActivities || [])
    }).catch(() => {})
    getRidingSchedules().then(list => {
      const map = {}
      list.forEach(s => {
        const key = s.weekStart || (s.id?.match(/^\d{4}-\d{2}-\d{2}$/) ? s.id : null)
        if (key) map[key] = s
      })
      setScheduleMap(map)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    }
  }, [activeWeek])

  const activeData = scheduleMap[activeWeek] || { entries: {}, label: '' }
  const entries    = editing ? draft : (activeData.entries || {})

  function getCell(horseName, day) {
    return entries[cellKey(horseName, day)] || { rider: '', activity: '', note: '' }
  }

  function setCell(horseName, day, field, value) {
    const key = cellKey(horseName, day)
    setDraft(d => ({ ...d, [key]: { ...getCell(horseName, day), [field]: value } }))
  }

  function startEditing() {
    setDraft(activeData.entries || {})
    setEditing(true)
  }

  async function saveEdits() {
    setSaving(true)
    try {
      await upsertRidingSchedule(activeWeek, {
        weekStart: activeWeek,
        entries: draft,
        label: activeData.label || '',
        updatedAt: Date.now(),
      })
      setScheduleMap(m => ({ ...m, [activeWeek]: { ...activeData, entries: draft } }))
      setEditing(false)
    } finally { setSaving(false) }
  }

  function startEditingLabel() {
    setLabelDraft(activeData.label || '')
    setEditingLabel(true)
  }

  async function saveLabel() {
    const trimmed = labelDraft.trim()
    await upsertRidingSchedule(activeWeek, {
      weekStart: activeWeek,
      label: trimmed,
      entries: activeData.entries || {},
      updatedAt: Date.now(),
    })
    setScheduleMap(m => ({ ...m, [activeWeek]: { ...activeData, label: trimmed } }))
    setEditingLabel(false)
  }

  async function handleAddRider() {
    const name = newRiderName.trim()
    if (!name) return
    const updated = [...customRiders, name]
    setCustomRiders(updated)
    await saveRidingScheduleConfig({ customRiders: updated, customActivities })
    setNewRiderName('')
    setAddingRider(false)
  }

  async function handleAddActivity() {
    const name = newActivityName.trim()
    if (!name) return
    const updated = [...customActivities, name]
    setCustomActivities(updated)
    await saveRidingScheduleConfig({ customRiders, customActivities: updated })
    setNewActivityName('')
    setAddingActivity(false)
  }

  const RIDER_ORDER = ['barn_manager', 'rider', 'groom']
  const sortedStaff = [...staff].sort((a, b) =>
    (RIDER_ORDER.indexOf(a.role) ?? 99) - (RIDER_ORDER.indexOf(b.role) ?? 99)
  )
  const allRiderOptions = [
    ...sortedStaff.map(s => s.name),
    ...customRiders,
  ]
  const allActivityOptions = [...ACTIVITIES.filter(a => a), ...customActivities]

  const weekLabel = activeData.label
    ? `${activeData.label} · ${shortDate(activeWeek)}`
    : shortDate(activeWeek)

  return (
    <div className="page">
      <h2 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Riding Schedule</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <p style={{ fontFamily: 'Arial', fontSize: '1.15rem', color: '#0d1b4b', margin: 0 }}>{todayStr}</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {canEdit && !editing && (
            <button className="btn btn-primary btn-sm" onClick={startEditing} style={{ color: '#c9a84c' }}>Edit</button>
          )}
          {editing && (
            <>
              <button className="btn btn-primary btn-sm" onClick={saveEdits} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {/* Week tab strip */}
      <div ref={tabsRef} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1rem', paddingBottom: '0.25rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', minWidth: 'max-content' }}>
          {weeks.map((w, wi) => {
            const isActive  = w.weekStart === activeWeek
            const isCurrent = w.weekStart === currentWeekStart
            const sched     = scheduleMap[w.weekStart]
            const tabBg     = wi % 2 === 0 ? '#a5b9e4' : '#9db1dc'
            return (
              <button
                key={w.weekStart}
                ref={isActive ? activeTabRef : null}
                onClick={() => { setActiveWeek(w.weekStart); setEditing(false) }}
                style={{
                  background: isActive ? '#4a72c8' : tabBg,
                  border: `1px solid ${isActive ? '#c9a84c' : '#2456ae'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: isActive ? '#ffffff' : '#0d1b4b',
                  fontFamily: 'Arial', fontSize: '0.85rem', letterSpacing: '0.04em',
                  padding: '0.35rem 0.75rem', cursor: 'pointer', lineHeight: 1.3,
                  textAlign: 'center', whiteSpace: 'nowrap',
                }}
              >
                {sched?.label && <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{sched.label}</div>}
                <div style={{ opacity: sched?.label ? 0.7 : 1 }}>{shortDate(w.weekStart)}</div>
                {isCurrent && <div style={{ fontSize: '0.62rem', color: isActive ? '#c9a84c' : '#0d1b4b', letterSpacing: '0.08em', marginTop: '0.1rem', fontWeight: 700 }}>THIS WEEK</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Week title + label editor */}
      <div style={{ background: '#163590', border: '1px solid #c9a84c', borderRadius: 'var(--radius)', padding: '0.85rem 1.1rem', marginBottom: '1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {editingLabel ? (
              <input
                autoFocus
                value={labelDraft}
                onChange={e => setLabelDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveLabel()
                  if (e.key === 'Escape') setEditingLabel(false)
                }}
                onBlur={saveLabel}
                placeholder="e.g. WEF 12"
                style={{
                  background: 'rgba(255,255,255,0.15)', border: '1px solid #c9a84c',
                  borderRadius: 'var(--radius-sm)', color: '#ffffff',
                  fontFamily: 'Georgia', fontSize: '1.2rem', padding: '0.25rem 0.6rem',
                  outline: 'none', width: '180px',
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'Georgia', fontSize: '1.3rem', color: '#c9a84c' }}>{weekLabel}</span>
                {canEdit && (
                  <button
                    onClick={startEditingLabel}
                    title="Name this week"
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.1rem 0.3rem', lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#c9a84c'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                  >✎</button>
                )}
              </div>
            )}
            <span style={{ fontFamily: 'Arial', fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)' }}>
              {shortDate(activeWeek)} – {shortDate(weeks.find(w => w.weekStart === activeWeek)?.weekEnd || activeWeek)}
            </span>
          </div>
          <button
            onClick={() => setLegendOpen(true)}
            style={{ background: 'none', border: '1px solid rgba(201,168,76,0.5)', borderRadius: 'var(--radius-sm)', color: '#c9a84c', fontFamily: 'Arial', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', padding: '0.25rem 0.6rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >View Legend</button>
        </div>
      </div>

      {/* Legend modal */}
      {legendOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setLegendOpen(false)}
        >
          <div style={{ background: '#163590', border: '1px solid #c9a84c', borderRadius: 'var(--radius)', padding: '1.1rem 1.25rem', width: '100%', maxWidth: '360px', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setLegendOpen(false)} style={{ position: 'absolute', top: '0.6rem', right: '0.75rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >✕</button>
            <div style={{ fontFamily: 'Georgia', fontSize: '1.1rem', color: '#c9a84c', marginBottom: '0.75rem' }}>Legend</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
              {allRiderOptions.map(name => (
                <span key={name} style={{ fontFamily: 'Arial', fontSize: '0.95rem', color: '#ffffff', letterSpacing: '0.05em' }}>
                  <strong style={{ color: '#c9a84c' }}>{initials(name)}</strong> — {name}
                </span>
              ))}
            </div>
            {allRiderOptions.length > 0 && <div style={{ borderTop: '1px solid rgba(201,168,76,0.3)', marginBottom: '0.65rem' }} />}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1rem' }}>
              {allActivityOptions.map(a => (
                <span key={a} style={{ fontFamily: 'Arial', fontSize: '0.95rem', color: SPECIAL_COLORS[a] || 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Rider modal */}
      {addingRider && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setAddingRider(false)}
        >
          <div style={{ background: '#163590', border: '1px solid #c9a84c', borderRadius: 'var(--radius)', padding: '1.1rem 1.25rem', width: '100%', maxWidth: '320px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'Georgia', fontSize: '1.1rem', color: '#c9a84c', marginBottom: '0.75rem' }}>Add Rider</div>
            <input
              autoFocus
              value={newRiderName}
              onChange={e => setNewRiderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddRider(); if (e.key === 'Escape') setAddingRider(false) }}
              placeholder="Full name"
              style={{ width: '100%', background: 'rgba(255,255,255,0.90)', border: '1px solid #c9a84c', borderRadius: 'var(--radius-sm)', color: '#0d1b4b', fontFamily: 'Arial', fontSize: '1rem', padding: '0.4rem 0.6rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={handleAddRider}>Add</button>
              <button className="btn btn-outline btn-sm" onClick={() => setAddingRider(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Activity modal */}
      {addingActivity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setAddingActivity(false)}
        >
          <div style={{ background: '#163590', border: '1px solid #c9a84c', borderRadius: 'var(--radius)', padding: '1.1rem 1.25rem', width: '100%', maxWidth: '320px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'Georgia', fontSize: '1.1rem', color: '#c9a84c', marginBottom: '0.75rem' }}>Add Activity</div>
            <input
              autoFocus
              value={newActivityName}
              onChange={e => setNewActivityName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddActivity(); if (e.key === 'Escape') setAddingActivity(false) }}
              placeholder="Activity name"
              style={{ width: '100%', background: 'rgba(255,255,255,0.90)', border: '1px solid #c9a84c', borderRadius: 'var(--radius-sm)', color: '#0d1b4b', fontFamily: 'Arial', fontSize: '1rem', padding: '0.4rem 0.6rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={handleAddActivity}>Add</button>
              <button className="btn btn-outline btn-sm" onClick={() => setAddingActivity(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {horses.length > 0 && (
        <div className="riding-scroll">
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: editing ? '860px' : '600px' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left', minWidth: '120px', position: 'sticky', left: 0, zIndex: 2, background: '#163590' }}>Horse</th>
                {DAYS.map((d, di) => {
                  const [y, m, day] = activeWeek.split('-').map(Number)
                  const colDate = new Date(y, m - 1, day + di)
                  const dateLabel = `${colDate.getMonth() + 1}/${colDate.getDate()}`
                  const isToday = toDateStr(colDate) === toDateStr(today)
                  return (
                    <th key={d} style={{ ...thStyle, minWidth: editing ? '130px' : '80px', background: isToday ? '#2456ae' : '#163590', borderBottom: isToday ? '2px solid #c9a84c' : undefined }}>
                      <div>{d}</div>
                      <div style={{ fontSize: '0.72rem', color: isToday ? '#c9a84c' : 'rgba(201,168,76,0.70)', fontWeight: isToday ? 700 : 400, marginTop: '0.1rem' }}>{dateLabel}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {horses.map((horse, hi) => (
                <tr key={horse.id}>
                  <td style={{ ...tdStyle, fontFamily: 'Georgia', fontSize: '1.15rem', color: '#ffffff', fontWeight: '600', paddingLeft: '0.75rem', whiteSpace: 'nowrap', position: 'sticky', left: 0, zIndex: 1, background: hi % 2 === 0 ? '#4a72c8' : '#3a62b8' }}>
                    {horse.name}
                  </td>
                  {DAYS.map((day, di) => {
                    const cell = getCell(horse.name, day)
                    const [y, m, dd] = activeWeek.split('-').map(Number)
                    const colDate = new Date(y, m - 1, dd + di)
                    const isToday = toDateStr(colDate) === toDateStr(today)

                    if (editing) {
                      return (
                        <td key={day} style={{ ...tdStyle, padding: '0.25rem 0.3rem', verticalAlign: 'top', background: isToday ? 'rgba(36,86,174,0.22)' : hi % 2 === 0 ? 'rgba(74,114,200,0.12)' : 'rgba(58,98,184,0.08)' }}>
                          <select
                            value={cell.rider}
                            onChange={e => {
                              if (e.target.value === '__add_rider__') { setAddingRider(true); return }
                              setCell(horse.name, day, 'rider', e.target.value)
                            }}
                            style={selectStyle}
                          >
                            <option value="">— Rider —</option>
                            {allRiderOptions.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                            {canEdit && <option value="__add_rider__">+ Add rider…</option>}
                          </select>
                          <select
                            value={cell.activity || ''}
                            onChange={e => {
                              if (e.target.value === '__add_activity__') { setAddingActivity(true); return }
                              setCell(horse.name, day, 'activity', e.target.value)
                            }}
                            style={{ ...selectStyle, marginBottom: '0.25rem' }}
                          >
                            <option value="">— Activity —</option>
                            {allActivityOptions.map(a => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                            {canEdit && <option value="__add_activity__">+ Add activity…</option>}
                          </select>
                          <input
                            value={cell.note}
                            onChange={e => setCell(horse.name, day, 'note', e.target.value)}
                            placeholder="note…"
                            style={noteInputStyle}
                          />
                        </td>
                      )
                    }

                    const riderDisplay   = cell.rider ? initials(cell.rider) : ''
                    const activityColor  = SPECIAL_COLORS[cell.activity] || 'rgba(255,255,255,0.45)'
                    const hasContent     = riderDisplay || cell.activity

                    return (
                      <td key={day} style={{ ...tdStyle, textAlign: 'center', background: isToday ? 'rgba(36,86,174,0.22)' : hi % 2 === 0 ? 'rgba(74,114,200,0.10)' : 'rgba(58,98,184,0.06)' }}>
                        {hasContent ? (
                          <div>
                            {riderDisplay && (
                              <span style={{ fontFamily: 'Arial', fontSize: '1.1rem', fontWeight: 700, color: '#0d1b4b' }}>{riderDisplay}</span>
                            )}
                            {cell.activity && (
                              <div style={{ fontFamily: 'Arial', fontSize: '0.82rem', fontWeight: 600, color: activityColor, marginTop: riderDisplay ? '0.1rem' : 0 }}>{cell.activity}</div>
                            )}
                            {cell.note && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'Arial', marginTop: '0.1rem' }}>{cell.note}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'rgba(13,27,75,0.20)', fontSize: '0.85rem' }}>—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  fontFamily: 'Arial', fontSize: '1.1rem', letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#c9a84c', fontWeight: 600,
  padding: '0.75rem 0.6rem',
  border: '1px solid rgba(201,168,76,0.40)',
  textAlign: 'center',
  background: '#163590',
}

const tdStyle = {
  padding: '0.55rem 0.5rem',
  border: '1px solid rgba(201,168,76,0.25)',
  verticalAlign: 'middle',
}

const selectStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.90)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  padding: '0.25rem 0.3rem',
  fontFamily: 'Arial', fontSize: '0.85rem',
  outline: 'none', marginBottom: '0.25rem',
}

const noteInputStyle = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(201,168,76,0.30)',
  color: 'var(--text-muted)',
  padding: '0.1rem 0.2rem',
  fontFamily: 'Arial', fontSize: '0.78rem',
  outline: 'none',
}
