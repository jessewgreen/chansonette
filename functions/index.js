const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

exports.resetUserPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.')
  }

  const callerEmail = context.auth.token.email

  const callerDoc = await admin.firestore()
    .collection('users')
    .doc(callerEmail.toLowerCase())
    .get()

  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can reset passwords.')
  }

  const { email, newPassword } = data

  if (!email || !newPassword) {
    throw new functions.https.HttpsError('invalid-argument', 'email and newPassword are required.')
  }
  if (newPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters.')
  }

  const key = email.toLowerCase().trim()
  let userRecord
  try {
    userRecord = await admin.auth().getUserByEmail(key)
    await admin.auth().updateUser(userRecord.uid, { password: newPassword })
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      await admin.auth().createUser({ email: key, password: newPassword })
    } else {
      throw e
    }
  }

  await admin.firestore()
    .collection('users')
    .doc(key)
    .update({ mustChangePassword: true, tempPassword: newPassword })

  return { success: true }
})
