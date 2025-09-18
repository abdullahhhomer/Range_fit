import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'

async function testMembershipAccess() {
  console.log('🔍 Testing membership data access...')
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ User authenticated:', {
        uid: user.uid,
        email: user.email
      })
      
      try {
        // Test basic Firestore access
        console.log('🔍 Testing basic Firestore access...')
        const testQuery = query(collection(db, 'memberships'), orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(testQuery)
        console.log('✅ Successfully accessed memberships collection:', snapshot.size, 'documents')
        
        if (snapshot.size > 0) {
          const firstDoc = snapshot.docs[0]
          console.log('📋 Sample membership document:', {
            id: firstDoc.id,
            data: firstDoc.data()
          })
        }
        
      } catch (error) {
        console.error('❌ Error accessing memberships:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        })
      }
      
    } else {
      console.log('❌ No user authenticated')
      console.log('💡 This is the root cause - you need to log in first')
    }
  })
}

testMembershipAccess().catch(console.error)













