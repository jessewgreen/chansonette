import { useState, useRef } from 'react'
import { saveShow } from '../services/db'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

async function extractScheduleFromImage(base64Image, mimeType) {
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
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64Image },
          },
          {
            type: 'text',
            text: `You are extracting equestrian show schedule data from this image.

Return ONLY a valid JSON array of show objects. No explanation, no markdown, just raw JSON.

Each object should have these fields (use empty string "" if unknown):
- name: show name or series name (string)
- type: "FEI" if it's FEI/international, "National" otherwise (string)
- startDate: YYYY-MM-DD format (string)
- endDate: YYYY-MM-DD format, same as startDate if single day (string)
- venue: venue or showground name (string)
- city: city (string)
- state: state or province abbreviation (string)
- country: country, default "USA" (string)
- notes: any relevant notes like divisions, judges, etc. (string)

Example output:
[{"name":"HITS Ocala","type":"National","startDate":"2026-03-05","endDate":"2026-03-08","venue":"HITS Post Time Farm","city":"Ocala","state":"FL","country":"USA","notes":""}]

If you cannot find any show/event data in the image, return an empty array: []`,
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
  const text = data.content?.[0]?.text || '[]'
  try {
    return JSON.parse(text)
  } catch {
    // Try to extract JSON array from response if there's surrounding text
    const match = text.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
    return []
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      // Strip the data:image/...;base64, prefix
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ScheduleImport({ onImported, onClose }) {
  const [stage, setStage] = useState('upload') // 'upload' | 'loading' | 'preview' | 'saving' | 'done'
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [extracted, setExtracted] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [error, setError] = useState('')
  const fileInputRef = useRef()
  const dropRef = useRef()

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)')
      return
    }
    setError('')
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  function handlePaste(e) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) {
      handleFile(item.getAsFile())
    }
  }

  async function handleExtract() {
    if (!imageFile) return
    setStage('loading')
    setError('')
    try {
      const base64 = await fileToBase64(imageFile)
      const results = await extractScheduleFromImage(base64, imageFile.type)
      if (results.length === 0) {
        setError('No show data found in this image. Try a clearer screenshot of a schedule.')
        setStage('upload')
        return
      }
      setExtracted(results)
      setSelected(new Set(results.map((_, i) => i)))
      setStage('preview')
    } catch (err) {
      setError(err.message || 'Failed to read image. Check your API key.')
      setStage('upload')
    }
  }

  async function handleSave() {
    setStage('saving')
    try {
      const toSave = extracted.filter((_, i) => selected.has(i))
      for (const show of toSave) {
        await saveShow(null, {
          name:      show.name      || '',
          type:      show.type      || 'National',
          venue:     show.venue     || '',
          city:      show.city      || '',
          state:     show.state     || '',
          country:   show.country   || 'USA',
          address:   '',
          startDate: show.startDate || '',
          endDate:   show.endDate   || show.startDate || '',
          notes:     show.notes     || '',
          status:    'Upcoming',
          horses:    [],
          staff:     [],
          schedule:  {},
        })
      }
      setStage('done')
      onImported()
    } catch (err) {
      setError(err.message || 'Failed to save shows.')
      setStage('preview')
    }
  }

  function toggleSelect(i) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function formatDate(str) {
    if (!str) return '—'
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const hasApiKey = !!API_KEY

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, overflowY: 'auto', padding: '2rem 1.5rem' }}
      onClick={onClose}
    >
      <div style={{ width: '100%', maxWidth: '540px', background: 'var(--green-deep)', border: '1px solid var(--gold-dark)', borderRadius: 'var(--radius)', position: 'relative', padding: '1.5rem' }}
        onClick={e => e.stopPropagation()}
        onPaste={handlePaste}
      >
        {/* Header */}
        <button onClick={onClose} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >✕</button>
        <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.25rem', marginBottom: '0.35rem' }}>Import Schedule from Screenshot</h3>
        <p style={{ fontFamily: 'Arial', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Upload or paste a screenshot of a show schedule — Claude will read it and extract the events.
        </p>

        {!hasApiKey && (
          <div style={{ background: 'rgba(232,112,112,0.12)', border: '1px solid #e87070', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', fontFamily: 'Arial', fontSize: '0.82rem', color: '#e87070' }}>
            No API key found. Add <code>VITE_ANTHROPIC_API_KEY=your-key</code> to a <code>.env.local</code> file in the project root, then restart the dev server.
          </div>
        )}

        {/* ── Upload Stage ── */}
        {(stage === 'upload' || stage === 'loading') && (
          <>
            <div
              ref={dropRef}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${imageFile ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)',
                marginBottom: '0.85rem',
                transition: 'border-color 0.2s',
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Schedule preview" style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
              ) : (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                  <div style={{ fontFamily: 'Arial', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Click to upload, drag & drop, or <strong>paste</strong> (Cmd+V) a screenshot
                  </div>
                  <div style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', opacity: 0.6 }}>
                    PNG, JPG, WEBP supported
                  </div>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

            {error && <p style={{ fontFamily: 'Arial', fontSize: '0.82rem', color: '#e87070', marginBottom: '0.75rem' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleExtract}
                disabled={!imageFile || stage === 'loading' || !hasApiKey}
              >
                {stage === 'loading' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Reading schedule…
                  </span>
                ) : 'Extract Events'}
              </button>
              {imageFile && stage !== 'loading' && (
                <button className="btn btn-outline" onClick={() => { setImageFile(null); setImagePreview(null); setError('') }}>
                  Clear
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Preview Stage ── */}
        {(stage === 'preview' || stage === 'saving') && (
          <>
            <div style={{ fontFamily: 'Arial', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Found <strong style={{ color: 'var(--text)' }}>{extracted.length}</strong> event{extracted.length !== 1 ? 's' : ''}. Check the ones you want to add:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', maxHeight: '340px', overflowY: 'auto' }}>
              {extracted.map((show, i) => (
                <div
                  key={i}
                  onClick={() => toggleSelect(i)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${selected.has(i) ? 'var(--gold)' : 'var(--border)'}`,
                    background: selected.has(i) ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: 3, border: `2px solid ${selected.has(i) ? 'var(--gold)' : 'var(--border)'}`, background: selected.has(i) ? 'var(--gold)' : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selected.has(i) && <span style={{ color: '#1a2a0a', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Georgia', fontSize: '1.05rem', color: 'var(--cream)', marginBottom: '0.2rem' }}>{show.name || '(unnamed)'}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 0.85rem', fontFamily: 'Arial', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {show.startDate && (
                        <span>
                          {formatDate(show.startDate)}
                          {show.endDate && show.endDate !== show.startDate && ` – ${formatDate(show.endDate)}`}
                        </span>
                      )}
                      {(show.city || show.state) && <span>{[show.city, show.state].filter(Boolean).join(', ')}</span>}
                      {show.venue && <span>{show.venue}</span>}
                      <span style={{ color: show.type === 'FEI' ? '#e87070' : '#7ab8e8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.08em' }}>{show.type}</span>
                    </div>
                    {show.notes && <div style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontStyle: 'italic', opacity: 0.75 }}>{show.notes}</div>}
                  </div>
                </div>
              ))}
            </div>

            {error && <p style={{ fontFamily: 'Arial', fontSize: '0.82rem', color: '#e87070', marginBottom: '0.75rem' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={selected.size === 0 || stage === 'saving'}
              >
                {stage === 'saving' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Saving…
                  </span>
                ) : `Add ${selected.size} Event${selected.size !== 1 ? 's' : ''} to Calendar`}
              </button>
              <button className="btn btn-outline" onClick={() => { setStage('upload'); setExtracted([]); setSelected(new Set()) }}>
                ← Back
              </button>
            </div>
          </>
        )}

        {/* ── Done Stage ── */}
        {stage === 'done' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            <div style={{ fontFamily: 'Georgia', fontSize: '1.2rem', color: 'var(--cream)', marginBottom: '0.5rem' }}>
              Events added to calendar
            </div>
            <p style={{ fontFamily: 'Arial', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              You can edit any of them by clicking on the calendar day.
            </p>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
