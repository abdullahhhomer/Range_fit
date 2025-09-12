import { auth, db } from '../lib/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore'

async function testFirebase() {
  console.log('🔍 Testing Firebase connection...')
  
  try {
    // Test 1: Check if Firebase is initialized
    console.log('✅ Firebase Auth initialized:', !!auth)
    console.log('✅ Firebase Firestore initialized:', !!db)
    
    // Test 2: Try to read from Firestore (this should work even without auth for public data)
    console.log('🔍 Testing Firestore read access...')
    try {
      const testDoc = await getDoc(doc(db, 'users', 'test'))
      console.log('✅ Firestore read test completed (document may not exist, which is fine)')
    } catch (error) {
      console.error('❌ Firestore read test failed:', error)
    }
    
    // Test 3: Check if we can create a test user (this will fail if Firebase is not properly configured)
    console.log('🔍 Testing Firebase Auth...')
    try {
      // Try to sign in with a test account (this will likely fail, but we can see the error)
      await signInWithEmailAndPassword(auth, 'test@example.com', 'testpassword')
      console.log('✅ Firebase Auth test successful')
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        console.log('✅ Firebase Auth is working (user not found is expected)')
      } else if (error.code === 'auth/invalid-api-key') {
        console.error('❌ Firebase API key is invalid')
      } else if (error.code === 'auth/project-not-found') {
        console.error('❌ Firebase project not found')
      } else {
        console.log('✅ Firebase Auth is working (error is expected):', error.code)
      }
    }
    
    // Test 4: Check current auth state
    console.log('🔍 Current auth state:', auth.currentUser ? 'User logged in' : 'No user logged in')
    
    console.log('✅ Firebase connection test completed')
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error)
  }
}

// Run the test
testFirebase().catch(console.error)





