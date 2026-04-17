import { useState, useEffect, useRef } from 'react'
import { getHorses, saveHorse, deleteHorse, getHorseRecords, addHorseRecord, deleteHorseRecord, uploadHorsePhoto, getHorsePhotos, addHorsePhoto, deleteHorsePhoto, uploadHorseGalleryPhoto, getClients, saveClient, deleteClient } from '../services/db'

const RECORD_TYPES = ['Vet Visit', 'Farrier', 'Feeding / Care Note', 'Training Note', 'Other']

const FEEDS = ['Endurix', 'Superforce', 'Pianissimo', 'Stay Cool', 'Pink Mash', 'Purina', 'Shaff']

const VACCINE_DEFAULTS = ['Equine Influenza', 'Tetanus', 'West Nile', 'EHV (Rhino)', 'Rabies']

function RecordBadge({ type }) {
  const map = {
    'Vet Visit':           'badge-red',
    'Farrier':             'badge-green',
    'Feeding / Care Note': 'badge-gold',
    'Training Note':       'badge-muted',
    'Other':               'badge-muted',
  }
  return <span className={`badge ${map[type] || 'badge-muted'}`}>{type}</span>
}

const CROP_SIZE = 280

function PhotoUploadModal({ onConfirm, onClose }) {
  const [stage, setStage]           = useState('choose') // 'choose' | 'camera' | 'crop'
  const [imageSrc, setImageSrc]     = useState(null)
  const [cropParams, setCropParams] = useState({ scale: 1, panX: 0, panY: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const [cameraReady, setCameraReady]   = useState(false)
  const [cameraError, setCameraError]   = useState(null)
  const dragRef  = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 })
  const videoRef = useRef()
  const capRef   = useRef()
  const fileRef  = useRef()

  useEffect(() => {
    if (imageSrc) setCropParams({ scale: 1, panX: 0, panY: 0 })
  }, [imageSrc])

  useEffect(() => {
    return () => { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()) }
  }, [cameraStream])

  async function startCamera() {
    setStage('camera')
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      setCameraStream(stream)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setCameraReady(true)
          videoRef.current.play().catch(() => {})
        }
      }, 50)
    } catch (err) {
      const msg = err.name === 'NotAllowedError' ? 'Camera access denied.' : err.name === 'NotFoundError' ? 'No camera found.' : err.message
      setCameraError(msg)
    }
  }

  function stopCamera() {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop())
    setCameraStream(null)
    setCameraReady(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = capRef.current
    if (!video || !canvas || !cameraReady) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    setImageSrc(canvas.toDataURL('image/jpeg', 0.9))
    stopCamera()
    setStage('crop')
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setImageSrc(ev.target.result); setStage('crop') }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function startDrag(clientX, clientY) {
    setIsDragging(true)
    dragRef.current = { mouseX: clientX, mouseY: clientY, panX: cropParams.panX, panY: cropParams.panY }
  }
  function moveDrag(clientX, clientY) {
    if (!isDragging) return
    const dx = clientX - dragRef.current.mouseX
    const dy = clientY - dragRef.current.mouseY
    setCropParams(p => ({ ...p, panX: dragRef.current.panX + dx, panY: dragRef.current.panY + dy }))
  }

  function confirmCrop() {
    const canvas = document.createElement('canvas')
    canvas.width = CROP_SIZE
    canvas.height = CROP_SIZE
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    const img = new Image()
    img.onload = () => {
      const { scale, panX, panY } = cropParams
      const drawW = img.naturalWidth  * scale
      const drawH = img.naturalHeight * scale
      const x = (CROP_SIZE - drawW) / 2 + panX
      const y = (CROP_SIZE - drawH) / 2 + panY
      ctx.drawImage(img, x, y, drawW, drawH)
      ctx.restore()
      canvas.toBlob(blob => {
        const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' })
        onConfirm(file)
      }, 'image/jpeg', 0.9)
    }
    img.src = imageSrc
  }

  const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }
  const boxStyle     = { background: '#163590', border: '1px solid #c9a84c', borderRadius: 'var(--radius)', padding: '1.25rem', width: '100%', maxWidth: '360px', position: 'relative' }
  const titleStyle   = { fontFamily: 'Georgia', fontSize: '1.1rem', color: '#c9a84c', marginBottom: '1rem' }
  const btnClose     = { position: 'absolute', top: '0.6rem', right: '0.75rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        <button style={btnClose} onClick={onClose}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >✕</button>

        {stage === 'choose' && (
          <>
            <div style={titleStyle}>Add Photo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={startCamera} style={{ width: '100%' }}>📷 Take Photo</button>
              <button className="btn btn-outline" onClick={() => fileRef.current.click()} style={{ width: '100%', color: '#c9a84c', borderColor: '#c9a84c' }}>⬆ Upload Photo</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            </div>
          </>
        )}

        {stage === 'camera' && (
          <>
            <div style={titleStyle}>Take Photo</div>
            {cameraError
              ? <p style={{ color: '#e87070', fontFamily: 'Arial', fontSize: '0.9rem' }}>{cameraError}</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid #c9a84c', background: '#000' }} />
                  <canvas ref={capRef} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <button className="btn btn-primary" onClick={capturePhoto} disabled={!cameraReady} style={{ flex: 1 }}>Capture</button>
                    <button className="btn btn-outline" onClick={() => { stopCamera(); setStage('choose') }} style={{ color: '#c9a84c', borderColor: '#c9a84c' }}>Back</button>
                  </div>
                </div>
              )
            }
          </>
        )}

        {stage === 'crop' && imageSrc && (
          <>
            <div style={titleStyle}>Crop & Resize</div>
            <div
              style={{ width: CROP_SIZE, height: CROP_SIZE, borderRadius: '50%', overflow: 'hidden', border: '2px solid #c9a84c', margin: '0 auto 0.75rem', cursor: 'grab', position: 'relative', userSelect: 'none', touchAction: 'none' }}
              onMouseDown={e => startDrag(e.clientX, e.clientY)}
              onMouseMove={e => moveDrag(e.clientX, e.clientY)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchMove={e => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY) }}
              onTouchEnd={() => setIsDragging(false)}
            >
              <img
                src={imageSrc}
                alt="crop preview"
                draggable={false}
                style={{
                  position: 'absolute',
                  width: `${100 * cropParams.scale}%`,
                  height: `${100 * cropParams.scale}%`,
                  left: `${(CROP_SIZE - CROP_SIZE * cropParams.scale) / 2 + cropParams.panX}px`,
                  top:  `${(CROP_SIZE - CROP_SIZE * cropParams.scale) / 2 + cropParams.panY}px`,
                  objectFit: 'cover',
                  pointerEvents: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>Zoom</span>
              <input type="range" min={0.5} max={3} step={0.01} value={cropParams.scale}
                onChange={e => setCropParams(p => ({ ...p, scale: parseFloat(e.target.value) }))}
                style={{ flex: 1, accentColor: '#c9a84c' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={confirmCrop} style={{ flex: 1 }}>Use Photo</button>
              <button className="btn btn-outline" onClick={() => setStage('choose')} style={{ color: '#c9a84c', borderColor: '#c9a84c' }}>Retake</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function HorseAvatar({ horse, size = 40, canEdit = false, onUploadProfile }) {
  const [hovered,    setHovered]    = useState(false)
  const [showModal,  setShowModal]  = useState(false)

  function handleClick(e) {
    if (canEdit && onUploadProfile) {
      e.stopPropagation()
      setShowModal(true)
    }
  }

  function handleConfirm(file) {
    setShowModal(false)
    onUploadProfile(file)
  }

  const showOverlay = canEdit && onUploadProfile && hovered

  return (
    <>
      <div
        style={{ position: 'relative', width: size, height: size, flexShrink: 0, cursor: canEdit && onUploadProfile ? 'pointer' : 'default' }}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {horse.photoUrl ? (
          <img src={horse.photoUrl} alt={horse.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #c9a84c', display: 'block' }} />
        ) : (
          <div style={{ width: size, height: size, borderRadius: '50%', background: '#163590', border: '1.5px solid #c9a84c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#c9a84c', overflow: 'hidden', padding: '4px' }}>
            <span style={{ fontSize: size * 0.32, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: size * 0.14, lineHeight: 1.25, fontFamily: 'Arial', textAlign: 'center' }}>Add{'\n'}photo</span>
          </div>
        )}
        {showOverlay && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, color: 'white', pointerEvents: 'none' }}>+</div>
        )}
      </div>
      {showModal && <PhotoUploadModal onConfirm={handleConfirm} onClose={() => setShowModal(false)} />}
    </>
  )
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1rem', gap: 0 }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0.55rem 1rem',
            fontFamily: 'Arial', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase',
            color: active === t.id ? 'var(--gold)' : 'var(--text-muted)',
            borderBottom: `2px solid ${active === t.id ? 'var(--gold)' : 'transparent'}`,
            marginBottom: '-1px',
          }}
        >{t.label}</button>
      ))}
    </div>
  )
}

function fieldLabel(text) {
  return <span style={{ color: 'var(--gold)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Arial' }}>{text}</span>
}

export default function Horses({ user }) {
  const canEdit = user?.role === 'admin' || user?.role === 'barn_manager' ||
                  user?.activeRole === 'admin' || user?.activeRole === 'barn_manager' ||
                  user?.additionalRoles?.includes('admin')

  const [horses,       setHorses]       = useState([])
  const [selected,     setSelected]     = useState(null)
  const [records,      setRecords]      = useState([])
  const [detailTab,    setDetailTab]    = useState('info')
  const [showForm,     setShowForm]     = useState(false)
  const [showRecForm,  setShowRecForm]  = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [photoFile,    setPhotoFile]    = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  // Health state
  const [editingHealth, setEditingHealth] = useState(false)
  const [vaccines,      setVaccines]      = useState([])
  const [farrier,       setFarrier]       = useState({ lastDate: '', notes: '' })
  const [newVaccineName, setNewVaccineName] = useState('')

  // Feeding state
  const [editingFeeding,  setEditingFeeding]  = useState(false)
  const [feedRows,        setFeedRows]        = useState([{ feed: '', amount: '', notes: '' }])
  const [supplements,     setSupplements]     = useState([])  // [{ name, notes }]
  const [customFeed,      setCustomFeed]       = useState('')
  const [customFeeds,     setCustomFeeds]      = useState([])
  const [newSuppName,     setNewSuppName]      = useState('')

  // Gallery state
  const [photos,          setPhotos]          = useState([])
  const [photosLoading,   setPhotosLoading]   = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const galleryInputRef = useRef()

  const [horseForm, setHorseForm] = useState({ name: '', owner: '', breed: '', age: '', color: '', notes: '', photoUrl: '' })
  const [recForm,   setRecForm]   = useState({ type: 'Vet Visit', date: '', description: '' })

  const [clients,         setClients]         = useState([])
  const [showClientForm,  setShowClientForm]  = useState(false)
  const [clientForm,      setClientForm]      = useState({ name: '', phone: '', email: '', notes: '' })
  const [editingClient,   setEditingClient]   = useState(null)
  const [savingClient,    setSavingClient]    = useState(false)

  useEffect(() => {
    getHorses().then(setHorses).catch(() => {})
    getClients().then(setClients).catch(() => {})
  }, [])

  async function handleSaveClient(e) {
    e.preventDefault()
    setSavingClient(true)
    try {
      if (editingClient) {
        await saveClient(editingClient.id, clientForm)
        setClients(c => c.map(x => x.id === editingClient.id ? { ...x, ...clientForm } : x))
      } else {
        const id = await saveClient(null, clientForm)
        setClients(c => [...c, { id, ...clientForm }].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setShowClientForm(false)
      setClientForm({ name: '', phone: '', email: '', notes: '' })
      setEditingClient(null)
    } finally { setSavingClient(false) }
  }

  async function handleDeleteClient(client) {
    if (!window.confirm(`Remove client ${client.name}?`)) return
    await deleteClient(client.id)
    setClients(c => c.filter(x => x.id !== client.id))
  }

  useEffect(() => {
    if (!selected) return
    getHorseRecords(selected.id).then(setRecords).catch(() => {})
    // Load health data from horse document
    setVaccines(selected.vaccines || [{ name: 'Equine Influenza', lastDate: '', nextDue: '', notes: '' }])
    setFarrier(selected.farrier || { lastDate: '', notes: '' })
    // Load feeding data
    setFeedRows(selected.feedRows?.length ? selected.feedRows : [{ feed: '', amount: '', notes: '' }])
    setSupplements(selected.supplements || [])
    setCustomFeeds(selected.customFeeds || [])
    // Load gallery photos
    setPhotos([])
  }, [selected])

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleUploadProfileDirect(file) {
    if (!selected?.id) return
    setSaving(true)
    try {
      const url = await uploadHorsePhoto(selected.id, file)
      await saveHorse(selected.id, { photoUrl: url })
      setHorses(h => h.map(x => x.id === selected.id ? { ...x, photoUrl: url } : x))
      setSelected(s => ({ ...s, photoUrl: url }))
    } finally { setSaving(false) }
  }

  async function handleGalleryUpload(files) {
    if (!selected?.id || !files.length) return
    setGalleryUploading(true)
    try {
      for (const file of files) {
        const { url, filename } = await uploadHorseGalleryPhoto(selected.id, file)
        await addHorsePhoto(selected.id, { url, filename, uploadedBy: user?.name || '' })
      }
      const updated = await getHorsePhotos(selected.id)
      setPhotos(updated)
    } finally { setGalleryUploading(false) }
  }

  async function handleGalleryUploadFromCard(horse, files) {
    if (!horse?.id || !files.length) return
    for (const file of files) {
      const { url, filename } = await uploadHorseGalleryPhoto(horse.id, file)
      await addHorsePhoto(horse.id, { url, filename, uploadedBy: user?.name || '' })
    }
  }

  async function handleDeletePhoto(photo) {
    if (!window.confirm('Are you sure you want to delete this photo?')) return
    await deleteHorsePhoto(selected.id, photo.id)
    setPhotos(p => p.filter(x => x.id !== photo.id))
  }

  async function loadPhotos() {
    if (!selected?.id) return
    setPhotosLoading(true)
    try {
      const p = await getHorsePhotos(selected.id)
      setPhotos(p)
    } finally { setPhotosLoading(false) }
  }

  async function handleSaveHorse(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (selected?.id) {
        let updatedForm = { ...horseForm }
        if (photoFile) {
          const url = await uploadHorsePhoto(selected.id, photoFile)
          updatedForm = { ...updatedForm, photoUrl: url }
        }
        await saveHorse(selected.id, updatedForm)
        setHorses(h => h.map(x => x.id === selected.id ? { ...x, ...updatedForm } : x))
        setSelected(s => ({ ...s, ...updatedForm }))
      } else {
        const id = await saveHorse(null, { ...horseForm, photoUrl: '' })
        let photoUrl = ''
        if (photoFile) {
          photoUrl = await uploadHorsePhoto(id, photoFile)
          await saveHorse(id, { photoUrl })
        }
        const newHorse = { id, ...horseForm, photoUrl }
        setHorses(h => [...h, newHorse])
        setSelected(newHorse)
      }
      setShowForm(false)
      setPhotoFile(null)
      setPhotoPreview(null)
    } finally { setSaving(false) }
  }

  async function handleDeleteHorse(horse) {
    if (!window.confirm(`Remove ${horse.name}?`)) return
    await deleteHorse(horse.id)
    setHorses(h => h.filter(x => x.id !== horse.id))
    setSelected(null)
  }

  async function handleAddRecord(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await addHorseRecord(selected.id, recForm)
      const updated = await getHorseRecords(selected.id)
      setRecords(updated)
      setRecForm({ type: 'Vet Visit', date: '', description: '' })
      setShowRecForm(false)
    } finally { setSaving(false) }
  }

  async function handleDeleteRecord(recordId) {
    await deleteHorseRecord(selected.id, recordId)
    setRecords(r => r.filter(x => x.id !== recordId))
  }

  async function saveHealth() {
    setSaving(true)
    try {
      await saveHorse(selected.id, { vaccines, farrier })
      setSelected(s => ({ ...s, vaccines, farrier }))
      setHorses(h => h.map(x => x.id === selected.id ? { ...x, vaccines, farrier } : x))
      setEditingHealth(false)
    } finally { setSaving(false) }
  }

  async function saveFeeding() {
    setSaving(true)
    try {
      await saveHorse(selected.id, { feedRows, supplements, customFeeds })
      setSelected(s => ({ ...s, feedRows, supplements, customFeeds }))
      setHorses(h => h.map(x => x.id === selected.id ? { ...x, feedRows, supplements, customFeeds } : x))
      setEditingFeeding(false)
    } finally { setSaving(false) }
  }

  function addVaccine(name) {
    const n = name.trim()
    if (!n) return
    setVaccines(v => [...v, { name: n, lastDate: '', nextDue: '', notes: '' }])
    setNewVaccineName('')
  }

  function updateVaccine(i, field, val) {
    setVaccines(v => v.map((x, idx) => idx === i ? { ...x, [field]: val } : x))
  }

  function removeVaccine(i) {
    setVaccines(v => v.filter((_, idx) => idx !== i))
  }

  function updateFeedRow(i, field, val) {
    setFeedRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function addFeedRow() {
    setFeedRows(rows => [...rows, { feed: '', amount: '', notes: '' }])
  }

  function removeFeedRow(i) {
    setFeedRows(rows => rows.length === 1 ? [{ feed: '', amount: '', notes: '' }] : rows.filter((_, idx) => idx !== i))
  }

  function addSupplement() {
    const n = newSuppName.trim()
    if (!n) return
    setSupplements(s => [...s, { name: n, notes: '' }])
    setNewSuppName('')
  }

  function updateSupplement(i, field, val) {
    setSupplements(s => s.map((x, idx) => idx === i ? { ...x, [field]: val } : x))
  }

  function removeSuplement(i) {
    setSupplements(s => s.filter((_, idx) => idx !== i))
  }

  function addCustomFeed() {
    const n = customFeed.trim()
    if (!n || customFeeds.includes(n)) return
    setCustomFeeds(f => [...f, n])
    setCustomFeed('')
  }

  function openNewHorse() {
    setHorseForm({ name: '', owner: '', breed: '', age: '', color: '', notes: '', photoUrl: '' })
    setPhotoFile(null); setPhotoPreview(null); setShowForm(true)
  }
  function openEditHorse() {
    setHorseForm({ name: selected.name || '', owner: selected.owner || '', breed: selected.breed || '', age: selected.age || '', color: selected.color || '', notes: selected.notes || '', photoUrl: selected.photoUrl || '' })
    setPhotoFile(null); setPhotoPreview(null); setShowForm(true)
  }

  const [viewMode, setViewMode] = useState('list')

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
        <h2>Horses</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {['list', 'tiles'].map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ background: viewMode === mode ? 'rgba(36,86,174,0.15)' : 'transparent', border: 'none', borderLeft: mode === 'tiles' ? '1px solid var(--border)' : 'none', color: viewMode === mode ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'Arial', fontSize: '0.72rem', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0.3rem 0.65rem', cursor: 'pointer' }}>
                {mode === 'list' ? '☰ List' : '⊞ Tiles'}
              </button>
            ))}
          </div>
          {canEdit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <button className="btn btn-primary btn-sm" onClick={openNewHorse}>+ Add Horse</button>
              <button className="btn btn-primary btn-sm">+ Add Rider</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setClientForm({ name: '', phone: '', email: '', notes: '' }); setEditingClient(null); setShowClientForm(true) }}>+ Add Client</button>
            </div>
          )}
        </div>
      </div>
      <p className="page-subtitle">Roster &amp; Records</p>

      <div className="horses-grid">
        {/* Horse list / tiles */}
        <div>
          {(() => {
            const OWNER_ORDER = ['Lillie Keenan', 'Diego Perez Bilbao', 'Pam Keenan', ...clients.map(c => c.name), 'Client']
            const groups = {}
            horses.forEach(h => { const o = h.owner || 'Other'; if (!groups[o]) groups[o] = []; groups[o].push(h) })
            const sorted = Object.entries(groups).sort(([a], [b]) => {
              const ai = OWNER_ORDER.indexOf(a), bi = OWNER_ORDER.indexOf(b)
              return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
            })
            return sorted.map(([owner, group]) => (
              <div key={owner}>
                {(() => {
                  const clientRecord = clients.find(c => c.name === owner)
                  return (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.75rem', fontFamily: 'Georgia', letterSpacing: '0.04em', color: 'var(--gold)' }}>{owner}</span>
                      {clientRecord && (
                        <>
                          {clientRecord.phone && <span style={{ fontFamily: 'Arial', fontSize: '0.78rem', color: 'var(--text-muted)' }}>📞 {clientRecord.phone}</span>}
                          {clientRecord.email && <span style={{ fontFamily: 'Arial', fontSize: '0.78rem', color: 'var(--text-muted)' }}>✉ {clientRecord.email}</span>}
                          {canEdit && (
                            <button onClick={() => { setClientForm({ name: clientRecord.name, phone: clientRecord.phone || '', email: clientRecord.email || '', notes: clientRecord.notes || '' }); setEditingClient(clientRecord); setShowClientForm(true) }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Arial', fontSize: '0.72rem', padding: 0 }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >edit</button>
                          )}
                          {canEdit && (
                            <button onClick={() => handleDeleteClient(clientRecord)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Arial', fontSize: '0.72rem', padding: 0 }}
                              onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >remove</button>
                          )}
                        </>
                      )}
                    </div>
                  )
                })()}
                {viewMode === 'list' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {group.map(h => (
                      <button key={h.id} onClick={() => { setSelected(h); setDetailTab('info') }}
                        style={{ width: '100%', background: '#4a72c8', border: '1px solid #2456ae', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', textAlign: 'left', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <HorseAvatar horse={h} size={60} />
                        <div>
                          <div style={{ fontFamily: 'Georgia', fontSize: '1.55rem', color: '#ffffff' }}>{h.name}</div>
                          {h.breed && <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.70)', fontFamily: 'Arial', marginTop: '0.1rem' }}>{h.breed}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {group.map(h => (
                      <button key={h.id} onClick={() => { setSelected(h); setDetailTab('info') }}
                        style={{ background: '#4a72c8', border: '1px solid #2456ae', borderRadius: 'var(--radius)', padding: 0, cursor: 'pointer', color: 'inherit', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '100%', aspectRatio: '1/1', background: 'rgba(36,86,174,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {h.photoUrl
                            ? <img src={h.photoUrl} alt={h.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontFamily: 'Georgia', fontSize: '3rem', color: '#ffffff', opacity: 0.7 }}>{h.name[0].toUpperCase()}</span>
                          }
                        </div>
                        <div style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                          <div style={{ fontFamily: 'Georgia', fontSize: '1.3rem', color: '#ffffff' }}>{h.name}</div>
                          {h.breed && <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.70)', fontFamily: 'Arial' }}>{h.breed}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          })()}
          {horses.length === 0 && <p style={{ opacity: 0.5, fontSize: '0.85rem', fontFamily: 'Arial' }}>No horses yet.</p>}
        </div>

        {/* Detail panel modal */}
        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }} onClick={() => setSelected(null)}>
          <div className="modal-purple" style={{ width: '100%', maxWidth: '600px', background: '#163590', border: '1px solid #c9a84c', borderRadius: 'var(--radius)', padding: '1.25rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >✕</button>
            {/* Horse header */}
            <div className="card" style={{ marginBottom: '0.75rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,168,76,0.40)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <HorseAvatar horse={selected} size={72} canEdit={canEdit} onUploadProfile={canEdit ? handleUploadProfileDirect : undefined} />
                <div style={{ flex: 1 }}>
                  <div>
                    <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.9rem', marginBottom: '0.15rem' }}>{selected.name}</h3>
                    {selected.owner && <div style={{ fontFamily: 'Arial', fontSize: '0.8rem', color: 'var(--gold)' }}>{selected.owner}</div>}
                  </div>
                  {(selected.breed || selected.age || selected.color) && (
                    <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {selected.breed && <div style={{ fontFamily: 'Arial', fontSize: '0.8rem' }}><span style={{ color: 'var(--text-muted)' }}>Breed </span>{selected.breed}</div>}
                      {selected.age   && <div style={{ fontFamily: 'Arial', fontSize: '0.8rem' }}><span style={{ color: 'var(--text-muted)' }}>Age </span>{selected.age}</div>}
                      {selected.color && <div style={{ fontFamily: 'Arial', fontSize: '0.8rem' }}><span style={{ color: 'var(--text-muted)' }}>Color </span>{selected.color}</div>}
                    </div>
                  )}
                </div>
              </div>
              {selected.notes && <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', opacity: 0.8, fontFamily: 'Arial', borderTop: '1px solid var(--border)', paddingTop: '0.65rem' }}>{selected.notes}</p>}
            </div>

            {/* Tabs */}
            <TabBar
              tabs={[{ id: 'info', label: 'Records' }, { id: 'health', label: 'Health' }, { id: 'feeding', label: 'Feeding' }, { id: 'photos', label: 'Photos' }]}
              active={detailTab}
              onChange={id => { setDetailTab(id); if (id === 'photos' && photos.length === 0) loadPhotos() }}
            />

            {/* ── RECORDS TAB ── */}
            {detailTab === 'info' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.35rem', color: 'var(--gold)' }}>Vet, Farrier &amp; Care Records</h3>
                  {canEdit && <button className="btn btn-outline btn-sm" onClick={() => setShowRecForm(v => !v)}>+ Add Record</button>}
                </div>
                {canEdit && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                    <label style={{ cursor: galleryUploading ? 'not-allowed' : 'pointer' }}>
                      <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={galleryUploading}
                        onChange={e => { if (e.target.files?.length) { handleGalleryUpload(Array.from(e.target.files)); setDetailTab('photos') }; e.target.value = '' }}
                      />
                      <span className="btn btn-outline btn-sm" style={{ pointerEvents: 'none' }}>
                        {galleryUploading ? 'Uploading…' : '+ Add Photo'}
                      </span>
                    </label>
                  </div>
                )}
                {showRecForm && canEdit && (
                  <form className="card" style={{ marginBottom: '1rem' }} onSubmit={handleAddRecord}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Type</label>
                        <select value={recForm.type} onChange={e => setRecForm(f => ({ ...f, type: e.target.value }))}>
                          {RECORD_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Date</label>
                        <input type="date" value={recForm.date} onChange={e => setRecForm(f => ({ ...f, date: e.target.value }))} required />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                      <label>Notes</label>
                      <textarea value={recForm.description} onChange={e => setRecForm(f => ({ ...f, description: e.target.value }))} required />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowRecForm(false)}>Cancel</button>
                    </div>
                  </form>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {records.map(r => (
                    <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                          <RecordBadge type={r.type} />
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'Arial' }}>{r.date}</span>
                        </div>
                        <p style={{ fontSize: '0.875rem', fontFamily: 'Arial', opacity: 0.85 }}>{r.description}</p>
                      </div>
                      {canEdit && <button onClick={() => handleDeleteRecord(r.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', marginLeft: '0.75rem', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >✕</button>}
                    </div>
                  ))}
                  {records.length === 0 && <p style={{ opacity: 0.5, fontSize: '0.85rem', fontFamily: 'Arial' }}>No records yet.</p>}
                </div>
              </div>
            )}

            {/* ── HEALTH TAB ── */}
            {detailTab === 'health' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
                  {canEdit && !editingHealth && <button className="btn btn-primary btn-sm" onClick={() => setEditingHealth(true)}>Edit</button>}
                  {editingHealth && <>
                    <button className="btn btn-primary btn-sm" onClick={saveHealth} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setEditingHealth(false); setVaccines(selected.vaccines || []); setFarrier(selected.farrier || { lastDate: '', notes: '' }) }}>Cancel</button>
                  </>}
                </div>

                {/* Farrier */}
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <div style={{ fontFamily: 'Georgia', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '0.75rem' }}>Farrier</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      {fieldLabel('Last Visit')}
                      {editingHealth
                        ? <input type="date" value={farrier.lastDate} onChange={e => setFarrier(f => ({ ...f, lastDate: e.target.value }))} style={inputStyle} />
                        : <div style={{ fontFamily: 'Arial', fontSize: '0.9rem', marginTop: '0.2rem' }}>{farrier.lastDate || <span style={{ opacity: 0.4 }}>Not set</span>}</div>
                      }
                    </div>
                    <div>
                      {fieldLabel('Notes')}
                      {editingHealth
                        ? <input value={farrier.notes} onChange={e => setFarrier(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. front shoes reset" style={inputStyle} />
                        : <div style={{ fontFamily: 'Arial', fontSize: '0.9rem', marginTop: '0.2rem' }}>{farrier.notes || <span style={{ opacity: 0.4 }}>—</span>}</div>
                      }
                    </div>
                  </div>
                </div>

                {/* Vaccines */}
                <div className="card">
                  <div style={{ fontFamily: 'Georgia', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '0.75rem' }}>Vaccines</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {vaccines.map((v, i) => (
                      <div key={i} style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span style={{ fontFamily: 'Arial', fontSize: '0.9rem', fontWeight: 600 }}>{v.name}</span>
                          {editingHealth && <button onClick={() => removeVaccine(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                          >✕</button>}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                          <div>
                            {fieldLabel('Last Given')}
                            {editingHealth
                              ? <input type="date" value={v.lastDate} onChange={e => updateVaccine(i, 'lastDate', e.target.value)} style={inputStyle} />
                              : <div style={{ fontFamily: 'Arial', fontSize: '0.85rem', marginTop: '0.15rem' }}>{v.lastDate || <span style={{ opacity: 0.4 }}>Not set</span>}</div>
                            }
                          </div>
                          <div>
                            {fieldLabel('Next Due')}
                            {editingHealth
                              ? <input type="date" value={v.nextDue} onChange={e => updateVaccine(i, 'nextDue', e.target.value)} style={inputStyle} />
                              : <div style={{ fontFamily: 'Arial', fontSize: '0.85rem', marginTop: '0.15rem', color: v.nextDue && new Date(v.nextDue) < new Date() ? '#e87070' : 'inherit' }}>{v.nextDue || <span style={{ opacity: 0.4 }}>Not set</span>}</div>
                            }
                          </div>
                        </div>
                        {editingHealth && (
                          <div style={{ marginTop: '0.4rem' }}>
                            {fieldLabel('Notes')}
                            <input value={v.notes || ''} onChange={e => updateVaccine(i, 'notes', e.target.value)} placeholder="Optional notes" style={inputStyle} />
                          </div>
                        )}
                        {!editingHealth && v.notes && <div style={{ fontFamily: 'Arial', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{v.notes}</div>}
                      </div>
                    ))}
                    {vaccines.length === 0 && <p style={{ opacity: 0.4, fontFamily: 'Arial', fontSize: '0.85rem' }}>No vaccines added.</p>}
                  </div>

                  {editingHealth && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ marginBottom: '0.4rem' }}>{fieldLabel('Add Vaccine')}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {VACCINE_DEFAULTS.filter(v => !vaccines.find(x => x.name === v)).map(v => (
                          <button key={v} onClick={() => addVaccine(v)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontFamily: 'Arial', fontSize: '0.75rem', padding: '0.25rem 0.6rem', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                          >+ {v}</button>
                        ))}
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <input value={newVaccineName} onChange={e => setNewVaccineName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addVaccine(newVaccineName)} placeholder="Custom…" style={{ ...inputStyle, width: '130px' }} />
                          <button onClick={() => addVaccine(newVaccineName)} className="btn btn-outline btn-sm">Add</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── FEEDING TAB ── */}
            {detailTab === 'feeding' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
                  {canEdit && !editingFeeding && <button className="btn btn-primary btn-sm" onClick={() => setEditingFeeding(true)}>Edit</button>}
                  {editingFeeding && <>
                    <button className="btn btn-primary btn-sm" onClick={saveFeeding} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setEditingFeeding(false); setFeedRows(selected.feedRows?.length ? selected.feedRows : [{ feed: '', amount: '', notes: '' }]); setSupplements(selected.supplements || []); setCustomFeeds(selected.customFeeds || []) }}>Cancel</button>
                  </>}
                </div>

                {/* Feed */}
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <div style={{ fontFamily: 'Georgia', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '0.75rem' }}>Feed</div>

                  {editingFeeding ? (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {feedRows.map((row, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div>
                              {i === 0 && fieldLabel('Feed')}
                              <select
                                value={row.feed}
                                onChange={e => updateFeedRow(i, 'feed', e.target.value)}
                                style={{ ...inputStyle, marginTop: i === 0 ? '0.2rem' : 0 }}
                              >
                                <option value="">— Select feed —</option>
                                {[...FEEDS, ...customFeeds].map(f => <option key={f} value={f}>{f}</option>)}
                              </select>
                            </div>
                            <div>
                              {i === 0 && fieldLabel('Amount')}
                              <input value={row.amount} onChange={e => updateFeedRow(i, 'amount', e.target.value)} placeholder="e.g. 2 scoops" style={{ ...inputStyle, marginTop: i === 0 ? '0.2rem' : 0 }} />
                            </div>
                            <div>
                              {i === 0 && fieldLabel('Notes')}
                              <input value={row.notes} onChange={e => updateFeedRow(i, 'notes', e.target.value)} placeholder="e.g. AM only" style={{ ...inputStyle, marginTop: i === 0 ? '0.2rem' : 0 }} />
                            </div>
                            <button onClick={() => removeFeedRow(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', paddingBottom: '0.15rem' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >✕</button>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button onClick={addFeedRow} className="btn btn-outline btn-sm">+ Add Feed</button>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <input value={customFeed} onChange={e => setCustomFeed(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomFeed()} placeholder="New feed type…" style={{ ...inputStyle, width: '140px', marginTop: 0 }} />
                          <button onClick={addCustomFeed} className="btn btn-outline btn-sm">Add to list</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {feedRows.filter(r => r.feed).length === 0 && <p style={{ opacity: 0.4, fontFamily: 'Arial', fontSize: '0.85rem' }}>No feed set.</p>}
                      {feedRows.filter(r => r.feed).map((row, i) => (
                        <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontFamily: 'Arial', fontSize: '0.9rem', minWidth: '110px' }}>{row.feed}</span>
                          {row.amount && <span style={{ fontSize: '0.8rem', color: 'var(--gold)', fontFamily: 'Arial' }}>{row.amount}</span>}
                          {row.notes  && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'Arial' }}>{row.notes}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Supplements */}
                <div className="card">
                  <div style={{ fontFamily: 'Georgia', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '0.75rem' }}>Supplements</div>

                  {editingFeeding ? (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {supplements.map((s, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                            <input value={s.name} onChange={e => updateSupplement(i, 'name', e.target.value)} placeholder="Supplement name" style={inputStyle} />
                            <input value={s.notes} onChange={e => updateSupplement(i, 'notes', e.target.value)} placeholder="Amount / notes" style={inputStyle} />
                            <button onClick={() => removeSuplement(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#e87070'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >✕</button>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <input value={newSuppName} onChange={e => setNewSuppName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSupplement()} placeholder="Add supplement…" style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={addSupplement} className="btn btn-outline btn-sm">Add</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {supplements.length === 0 && <p style={{ opacity: 0.4, fontFamily: 'Arial', fontSize: '0.85rem' }}>No supplements set.</p>}
                      {supplements.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontFamily: 'Arial', fontSize: '0.9rem', minWidth: '140px' }}>{s.name}</span>
                          {s.notes && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'Arial' }}>{s.notes}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── PHOTOS TAB ── */}
            {detailTab === 'photos' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.35rem', color: 'var(--gold)' }}>Photo Gallery</h3>
                  <label style={{ cursor: galleryUploading ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="file" accept="image/*" multiple style={{ display: 'none' }}
                      disabled={galleryUploading}
                      onChange={e => { if (e.target.files?.length) handleGalleryUpload(Array.from(e.target.files)); e.target.value = '' }}
                    />
                    <span className="btn btn-outline btn-sm" style={{ pointerEvents: 'none' }}>
                      {galleryUploading ? 'Uploading…' : '+ Add Photos'}
                    </span>
                  </label>
                </div>
                {photosLoading && <p style={{ opacity: 0.5, fontFamily: 'Arial', fontSize: '0.85rem' }}>Loading…</p>}
                {!photosLoading && photos.length === 0 && <p style={{ opacity: 0.5, fontFamily: 'Arial', fontSize: '0.85rem' }}>No photos yet.</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {photos.map(photo => {
                    const canDeleteThis = canEdit || photo.uploadedBy === user?.name
                    return (
                      <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer' }}
                        onClick={() => window.open(photo.url, '_blank')}
                      >
                        <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {canDeleteThis && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDeletePhoto(photo) }}
                            style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: 'rgba(0,0,0,0.55)', border: 'none', color: 'white', borderRadius: '50%', width: '1.4rem', height: '1.4rem', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,60,60,0.85)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
                          >✕</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Edit / Remove at bottom */}
            {canEdit && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', opacity: 0.5 }}>
                <button className="btn btn-outline btn-sm" onClick={openEditHorse}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteHorse(selected)}>Remove</button>
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Add/Edit Client Modal */}
      {showClientForm && canEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1.5rem' }}
          onClick={() => setShowClientForm(false)}
        >
          <form className="card" style={{ width: '100%', maxWidth: '420px', background: '#163590', border: '1px solid #c9a84c', position: 'relative' }}
            onClick={e => e.stopPropagation()}
            onSubmit={handleSaveClient}
          >
            <button type="button" onClick={() => setShowClientForm(false)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.2rem', marginBottom: '1.25rem' }}>
              {editingClient ? 'Edit Client' : 'Add Client'}
            </h3>
            <div className="form-group"><label>Full Name</label><input value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Jane Smith" /></div>
            <div className="form-group"><label>Phone</label><input type="tel" value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} placeholder="Optional" /></div>
            <div className="form-group"><label>Email</label><input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} placeholder="Optional" /></div>
            <div className="form-group"><label>Notes</label><textarea value={clientForm.notes} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional" /></div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={savingClient}>{savingClient ? 'Saving…' : 'Save'}</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowClientForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Add/Edit Horse Modal */}
      {showForm && canEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, overflowY: 'auto', padding: '1.5rem' }}>
          <form className="card modal-purple" style={{ width: '100%', maxWidth: '460px', background: '#163590', border: '1px solid #c9a84c' }} onSubmit={handleSaveHorse}>
            <h3 style={{ fontFamily: 'Georgia', fontWeight: 'normal', fontSize: '1.2rem', marginBottom: '1.25rem' }}>{selected?.id ? 'Edit Horse' : 'Add Horse'}</h3>
            <div className="form-group">
              <label>Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {(photoPreview || horseForm.photoUrl) ? (
                  <img src={photoPreview || horseForm.photoUrl} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #c9a84c' }} />
                ) : (
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(36,86,174,0.1)', border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1.4rem' }}>+</div>
                )}
                <label style={{ cursor: 'pointer', color: 'var(--gold)', fontFamily: 'Arial', fontSize: '0.8rem' }}>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  {photoPreview || horseForm.photoUrl ? 'Change photo' : 'Upload photo'}
                </label>
              </div>
            </div>
            <div className="form-group"><label>Name</label><input value={horseForm.name} onChange={e => setHorseForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="form-group">
              <label>Owner / Rider</label>
              <select value={horseForm.owner} onChange={e => setHorseForm(f => ({ ...f, owner: e.target.value }))}>
                <option value="">Select owner</option>
                <option>Lillie Keenan</option>
                <option>Diego Perez Bilbao</option>
                <option>Pam Keenan</option>
                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option>Client</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label>Breed</label><input value={horseForm.breed} onChange={e => setHorseForm(f => ({ ...f, breed: e.target.value }))} /></div>
              <div className="form-group"><label>Age</label><input value={horseForm.age} onChange={e => setHorseForm(f => ({ ...f, age: e.target.value }))} /></div>
              <div className="form-group"><label>Color</label><input value={horseForm.color} onChange={e => setHorseForm(f => ({ ...f, color: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label>Notes</label><textarea value={horseForm.notes} onChange={e => setHorseForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.90)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  padding: '0.3rem 0.5rem',
  fontFamily: 'Arial',
  fontSize: '0.85rem',
  outline: 'none',
  marginTop: '0.2rem',
  display: 'block',
}
