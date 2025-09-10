import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export const testAuthStatus = () => {
  console.log('🔍 Testing authentication status...')
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ User is authenticated:', user.uid)
      console.log('📧 Email:', user.email)
      
      try {
        // Try to get user document from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          console.log('📄 User data:', userData)
          console.log('👑 Role:', userData.role)
          
          if (userData.role === 'admin') {
            console.log('✅ User has admin role')
          } else {
            console.log('❌ User does not have admin role')
          }
        } else {
          console.log('❌ User document does not exist in Firestore')
        }
      } catch (error) {
        console.error('❌ Error fetching user document:', error)
      }
    } else {
      console.log('❌ No user is authenticated')
    }
  })
}

export const testFirestoreAccess = async () => {
  console.log('🔍 Testing Firestore access...')
  
  try {
    // Test reading from users collection
    const usersRef = doc(db, 'users', 'test')
    await getDoc(usersRef)
    console.log('✅ Users collection access: OK')
  } catch (error) {
    console.error('❌ Users collection access failed:', error)
  }
  
  try {
    // Test reading from memberships collection
    const membershipsRef = doc(db, 'memberships', 'test')
    await getDoc(membershipsRef)
    console.log('✅ Memberships collection access: OK')
  } catch (error) {
    console.error('❌ Memberships collection access failed:', error)
  }
  
  try {
    // Test reading from receipts collection
    const receiptsRef = doc(db, 'receipts', 'test')
    await getDoc(receiptsRef)
    console.log('✅ Receipts collection access: OK')
  } catch (error) {
    console.error('❌ Receipts collection access failed:', error)
  }
}

// Run tests
if (typeof window !== 'undefined') {
  testAuthStatus()
  testFirestoreAccess()
}
