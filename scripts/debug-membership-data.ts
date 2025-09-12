import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore'

async function debugMembershipData() {
  console.log('🔍 Starting membership data debug...')
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ User authenticated:', {
        uid: user.uid,
        email: user.email
      })
      
      try {
        // Test 1: Check if user document exists
        console.log('🔍 Testing user document access...')
        const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)))
        if (userDoc.empty) {
          console.error('❌ User document not found in Firestore')
          return
        }
        
        const userData = userDoc.docs[0].data()
        console.log('✅ User document found:', {
          role: userData.role,
          status: userData.status,
          name: userData.name
        })
        
        // Test 2: Check memberships collection access
        console.log('🔍 Testing memberships collection access...')
        try {
          const membershipsQuery = query(
            collection(db, 'memberships'),
            orderBy('createdAt', 'desc')
          )
          const membershipsSnapshot = await getDocs(membershipsQuery)
          console.log('✅ Memberships collection accessible:', membershipsSnapshot.size, 'documents')
          
          // Show sample membership data
          if (membershipsSnapshot.size > 0) {
            const sampleMembership = membershipsSnapshot.docs[0].data()
            console.log('📋 Sample membership data:', {
              uid: sampleMembership.uid,
              planType: sampleMembership.planType,
              status: sampleMembership.status,
              amount: sampleMembership.amount
            })
          }
        } catch (error) {
          console.error('❌ Error accessing memberships collection:', error)
        }
        
        // Test 3: Check payments collection access
        console.log('🔍 Testing payments collection access...')
        try {
          const paymentsQuery = query(
            collection(db, 'payments'),
            orderBy('createdAt', 'desc')
          )
          const paymentsSnapshot = await getDocs(paymentsQuery)
          console.log('✅ Payments collection accessible:', paymentsSnapshot.size, 'documents')
        } catch (error) {
          console.error('❌ Error accessing payments collection:', error)
        }
        
        // Test 4: Test real-time listener
        console.log('🔍 Testing real-time membership listener...')
        try {
          const membershipsRef = collection(db, 'memberships')
          const membershipsQuery = query(membershipsRef, orderBy('createdAt', 'desc'))
          
          const unsubscribe = onSnapshot(membershipsQuery, (snapshot) => {
            console.log('✅ Real-time listener working:', snapshot.size, 'memberships')
            unsubscribe() // Stop after first update
          }, (error) => {
            console.error('❌ Real-time listener error:', error)
          })
          
          // Stop listener after 5 seconds
          setTimeout(() => {
            try {
              unsubscribe()
            } catch (e) {
              // Ignore unsubscribe errors
            }
          }, 5000)
          
        } catch (error) {
          console.error('❌ Error setting up real-time listener:', error)
        }
        
        // Test 5: Check user's own memberships (if customer)
        if (userData.role === 'customer') {
          console.log('🔍 Testing customer membership access...')
          try {
            const userMembershipsQuery = query(
              collection(db, 'memberships'),
              where('uid', '==', user.uid),
              orderBy('createdAt', 'desc')
            )
            const userMembershipsSnapshot = await getDocs(userMembershipsQuery)
            console.log('✅ Customer can access own memberships:', userMembershipsSnapshot.size, 'memberships')
          } catch (error) {
            console.error('❌ Error accessing customer memberships:', error)
          }
        }
        
        // Test 6: Check membership requests
        console.log('🔍 Testing membership requests access...')
        try {
          const requestsQuery = query(
            collection(db, 'membershipRequests'),
            orderBy('createdAt', 'desc')
          )
          const requestsSnapshot = await getDocs(requestsQuery)
          console.log('✅ Membership requests accessible:', requestsSnapshot.size, 'requests')
        } catch (error) {
          console.error('❌ Error accessing membership requests:', error)
        }
        
      } catch (error) {
        console.error('❌ General error during membership debug:', error)
      }
      
    } else {
      console.log('❌ No user authenticated - this is likely the cause of the error')
      console.log('💡 Solution: Please log in to the application first')
    }
  })
}

// Run the debug
debugMembershipData().catch(console.error)





