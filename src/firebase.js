import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyBFYZuFU1WqaSFDLJOSCu-SbEb36InA3B0",
  authDomain: "chansonette-73639.firebaseapp.com",
  projectId: "chansonette-73639",
  storageBucket: "chansonette-73639.firebasestorage.app",
  messagingSenderId: "1011052410407",
  appId: "1:1011052410407:web:a0fc9bbfdc3f8fb6104002",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const auth = getAuth(app)
