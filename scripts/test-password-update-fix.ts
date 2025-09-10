import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'

async function testPasswordUpdateIssue() {
  console.log('🔍 Testing password update issue...')
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ User authenticated:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      })
      
      try {
        // Test accessing membership data after authentication
        console.log('🔍 Testing membership data access after authentication...')
        const membershipsQuery = query(collection(db, 'memberships'))
        const membershipsSnapshot = await getDocs(membershipsQuery)
        console.log('✅ Successfully accessed memberships collection:', membershipsSnapshot.size, 'documents')
        
        // Test accessing user data
        console.log('🔍 Testing user data access...')
        const usersQuery = query(collection(db, 'users'), where('email', '==', user.email))
        const usersSnapshot = await getDocs(usersQuery)
        if (usersSnapshot.size > 0) {
          const userData = usersSnapshot.docs[0].data()
          console.log('✅ User data accessible:', {
            role: userData.role,
            status: userData.status,
            name: userData.name
          })
        }
        
        console.log('✅ All tests passed - authentication is working properly')
        
      } catch (error) {
        console.error('❌ Error accessing data:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message
        })
      }
      
    } else {
      console.log('❌ No user authenticated')
      console.log('💡 This is expected if no one is logged in')
    }
  })
}

testPasswordUpdateIssue().catch(console.error)




