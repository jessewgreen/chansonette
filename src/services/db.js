import { db, storage, auth } from '../firebase'
import {
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where, orderBy,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const key = email.toLowerCase().trim()
  await signInWithEmailAndPassword(auth, key, password)
  const snap = await getDoc(doc(db, 'users', key))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function signOutUser() {
  await signOut(auth)
}

export async function createUser({ email, name, role, password, phone = '', homePhone = '', cell = '', address = '' }) {
  const key = email.toLowerCase().trim()
  await createUserWithEmailAndPassword(auth, key, password)
  await setDoc(doc(db, 'users', key), { name, role, phone, homePhone, cell, address, email: key, mustChangePassword: true, tempPassword: password })
}

export async function getUsers() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteUser(email) {
  await deleteDoc(doc(db, 'users', email.toLowerCase().trim()))
}

export async function updateUserPassword(newPassword) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('No authenticated user')
  await updatePassword(currentUser, newPassword)
  await updateDoc(doc(db, 'users', currentUser.email), { mustChangePassword: false, tempPassword: null })
}

export async function resetUserPassword(email, newPassword) {
  const fn = httpsCallable(getFunctions(), 'resetUserPassword')
  await fn({ email, newPassword })
  return newPassword
}

export async function updateUserProfile(email, data) {
  const key = email.toLowerCase().trim()
  await updateDoc(doc(db, 'users', key), data)
}

export async function updateUserEmail(oldEmail, newEmail, otherData) {
  const oldKey = oldEmail.toLowerCase().trim()
  const newKey = newEmail.toLowerCase().trim()
  
  // Get the old document
  const snap = await getDoc(doc(db, 'users', oldKey))
  if (!snap.exists()) throw new Error('User not found')
  
  const userData = snap.data()
  
  // Create new document with updated email and other data
  const newData = { ...userData, email: newKey, ...otherData }
  await setDoc(doc(db, 'users', newKey), newData)
  
  // Delete old document
  await deleteDoc(doc(db, 'users', oldKey))
}

export async function updateUserRole(email, role) {
  const key = email.toLowerCase().trim()
  await updateDoc(doc(db, 'users', key), { role })
}

export async function updateUserAdditionalRoles(email, additionalRoles) {
  const key = email.toLowerCase().trim()
  await updateDoc(doc(db, 'users', key), { additionalRoles })
}

export async function uploadVendorPhoto(vendorId, file) {
  const ext = file.name.split('.').pop()
  const photoRef = storageRef(storage, `vendors/${vendorId}/card.${ext}`)
  const snapshot = await uploadBytes(photoRef, file)
  return await getDownloadURL(snapshot.ref)
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function getClients() {
  const snap = await getDocs(query(collection(db, 'clients'), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function saveClient(id, data) {
  if (id) {
    await updateDoc(doc(db, 'clients', id), data)
  } else {
    const ref = await addDoc(collection(db, 'clients'), data)
    return ref.id
  }
}

export async function deleteClient(id) {
  await deleteDoc(doc(db, 'clients', id))
}

export async function uploadStaffPhoto(userId, file) {
  const ext = file.name.split('.').pop()
  const photoRef = storageRef(storage, `staff/${userId}/photo.${ext}`)
  const snapshot = await uploadBytes(photoRef, file)
  const url = await getDownloadURL(snapshot.ref)
  await updateDoc(doc(db, 'users', userId), { photoUrl: url })
  return url
}

// ── Horses ────────────────────────────────────────────────────────────────────

export async function getHorses() {
  const snap = await getDocs(query(collection(db, 'horses'), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getHorse(id) {
  const snap = await getDoc(doc(db, 'horses', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function saveHorse(id, data) {
  if (id) {
    await updateDoc(doc(db, 'horses', id), data)
  } else {
    const ref = await addDoc(collection(db, 'horses'), data)
    return ref.id
  }
}

export async function deleteHorse(id) {
  await deleteDoc(doc(db, 'horses', id))
}

export async function uploadHorsePhoto(horseId, file) {
  const ext = file.name.split('.').pop()
  const photoRef = storageRef(storage, `horses/${horseId}/photo.${ext}`)
  const snapshot = await uploadBytes(photoRef, file)
  return await getDownloadURL(snapshot.ref)
}

export async function getHorsePhotos(horseId) {
  const snap = await getDocs(query(collection(db, 'horses', horseId, 'photos'), orderBy('uploadedAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addHorsePhoto(horseId, { url, uploadedBy, filename }) {
  return await addDoc(collection(db, 'horses', horseId, 'photos'), { url, uploadedBy, filename, uploadedAt: Date.now() })
}

export async function deleteHorsePhoto(horseId, photoId) {
  await deleteDoc(doc(db, 'horses', horseId, 'photos', photoId))
}

export async function uploadHorseGalleryPhoto(horseId, file) {
  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}.${ext}`
  const photoRef = storageRef(storage, `horses/${horseId}/gallery/${filename}`)
  const snapshot = await uploadBytes(photoRef, file)
  return { url: await getDownloadURL(snapshot.ref), filename }
}

const HORSE_SEED = [
  { name: 'Argan',     owner: 'Lillie Keenan' },
  { name: 'Highway',   owner: 'Lillie Keenan' },
  { name: 'Fred',      owner: 'Lillie Keenan' },
  { name: 'Ken',       owner: 'Lillie Keenan' },
  { name: 'Andy',      owner: 'Lillie Keenan' },
  { name: 'Chagrin',   owner: 'Lillie Keenan' },
  { name: 'Louis',     owner: 'Lillie Keenan' },
  { name: 'Anton',     owner: 'Lillie Keenan' },
  { name: 'Aggie',     owner: 'Lillie Keenan' },
  { name: 'Corexstra', owner: 'Lillie Keenan' },
  { name: 'Scarlett',  owner: 'Diego Perez Bilbao' },
  { name: 'Adelita',   owner: 'Diego Perez Bilbao' },
  { name: 'Nossa',     owner: 'Diego Perez Bilbao' },
  { name: "Q'Cumber",  owner: 'Diego Perez Bilbao' },
  { name: 'Pitcher',   owner: 'Diego Perez Bilbao' },
  { name: 'Tini',      owner: 'Diego Perez Bilbao' },
  { name: 'Dua',       owner: 'Diego Perez Bilbao' },
]

export async function seedHorses() {
  const existing = await getHorses()
  const existingNames = new Set(existing.map(h => h.name))
  const toAdd = HORSE_SEED.filter(h => !existingNames.has(h.name))
  await Promise.all(toAdd.map(h =>
    addDoc(collection(db, 'horses'), { ...h, breed: '', age: '', color: '', notes: '', photoUrl: '' })
  ))
  return toAdd.length
}

// ── Horse Records (vet, farrier, care notes) ──────────────────────────────────

export async function getHorseRecords(horseId) {
  const snap = await getDocs(
    query(collection(db, 'horses', horseId, 'records'), orderBy('date', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addHorseRecord(horseId, record) {
  await addDoc(collection(db, 'horses', horseId, 'records'), record)
}

export async function deleteHorseRecord(horseId, recordId) {
  await deleteDoc(doc(db, 'horses', horseId, 'records', recordId))
}

// ── Shows & Events ────────────────────────────────────────────────────────────

export async function getShows() {
  const snap = await getDocs(query(collection(db, 'shows'), orderBy('startDate')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function saveShow(id, data) {
  if (id) {
    await updateDoc(doc(db, 'shows', id), data)
  } else {
    const ref = await addDoc(collection(db, 'shows'), data)
    return ref.id
  }
}

export async function deleteShow(id) {
  await deleteDoc(doc(db, 'shows', id))
}

// ── Results ───────────────────────────────────────────────────────────────────

export async function getResults(showId) {
  const snap = await getDocs(collection(db, 'shows', showId, 'results'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addResult(showId, result) {
  await addDoc(collection(db, 'shows', showId, 'results'), result)
}

export async function deleteResult(showId, resultId) {
  await deleteDoc(doc(db, 'shows', showId, 'results', resultId))
}

// ── Riding Schedules ──────────────────────────────────────────────────────────

export async function getRidingSchedules() {
  const snap = await getDocs(collection(db, 'ridingSchedules'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function saveRidingSchedule(id, data) {
  if (id) {
    await updateDoc(doc(db, 'ridingSchedules', id), data)
  } else {
    const docRef = await addDoc(collection(db, 'ridingSchedules'), data)
    return docRef.id
  }
}

export async function upsertRidingSchedule(weekStart, data) {
  await setDoc(doc(db, 'ridingSchedules', weekStart), data, { merge: true })
}

export async function deleteRidingSchedule(id) {
  await deleteDoc(doc(db, 'ridingSchedules', id))
}

// ── Riding Schedule Config (custom riders & activities) ───────────────────────

export async function getRidingScheduleConfig() {
  const snap = await getDoc(doc(db, 'config', 'ridingSchedule'))
  return snap.exists() ? snap.data() : { customRiders: [], customActivities: [] }
}

export async function saveRidingScheduleConfig(data) {
  await setDoc(doc(db, 'config', 'ridingSchedule'), data, { merge: true })
}

// ── Calendar Notes ─────────────────────────────────────────────────────────────

export async function getNotes() {
  const snap = await getDocs(query(collection(db, 'calNotes'), orderBy('date')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function saveNote(id, data) {
  if (id) {
    await updateDoc(doc(db, 'calNotes', id), data)
  } else {
    const ref = await addDoc(collection(db, 'calNotes'), data)
    return ref.id
  }
}

export async function deleteNote(id) {
  await deleteDoc(doc(db, 'calNotes', id))
}

// ── Seed April 2026 Calendar ───────────────────────────────────────────────────

const APRIL_SHOWS = [
  { name: 'WC',       type: 'FEI',      startDate: '2026-04-08', endDate: '2026-04-12', status: 'Upcoming', venue: '', city: '', state: '', country: 'USA', address: '', notes: '', horses: [], staff: [], schedule: {} },
  { name: 'Kentucky', type: 'FEI',      startDate: '2026-04-21', endDate: '2026-04-25', status: 'Upcoming', venue: '', city: 'Lexington', state: 'KY', country: 'USA', address: '', notes: '', horses: [], staff: [], schedule: {} },
  { name: 'Monterey', type: 'National', startDate: '2026-04-28', endDate: '2026-05-02', status: 'Upcoming', venue: '', city: '', state: '', country: 'USA', address: '', notes: '', horses: [], staff: [], schedule: {} },
]

const APRIL_NOTES = [
  { date: '2026-04-01', text: 'Partiu Brasil' },
  { date: '2026-04-03', text: 'Levar feed/haygain' },
  { date: '2026-04-04', text: 'Ken leaves for TX' },
  { date: '2026-04-05', text: 'Diego Brasil' },
  { date: '2026-04-06', text: 'Fasther not positive anymore' },
  { date: '2026-04-06', text: 'LK fly to Texas', category: 'Travel' },
  { date: '2026-04-06', text: 'Arena opens 2–3:30' },
  { date: '2026-04-12', text: 'LK fly back?', category: 'Travel' },
  { date: '2026-04-13', text: 'Eric back' },
  { date: '2026-04-13', text: 'Fred & Chagrin leave for Kentucky' },
  { date: '2026-04-26', text: 'Morgan & Andy leave to Mexico' },
  { date: '2026-04-26', text: 'Fred & Chagrin to Florida' },
]

export async function seedAprilCalendar() {
  const [existingShows, existingNotes] = await Promise.all([getShows(), getNotes()])
  const existingShowNames = new Set(existingShows.map(s => s.name))
  const existingNoteKeys  = new Set(existingNotes.map(n => `${n.date}::${n.text}`))

  const showsToAdd = APRIL_SHOWS.filter(s => !existingShowNames.has(s.name))
  const notesToAdd = APRIL_NOTES.filter(n => !existingNoteKeys.has(`${n.date}::${n.text}`))

  await Promise.all([
    ...showsToAdd.map(s => addDoc(collection(db, 'shows'), s)),
    ...notesToAdd.map(n => addDoc(collection(db, 'calNotes'), n)),
  ])
  return { shows: showsToAdd.length, notes: notesToAdd.length }
}
