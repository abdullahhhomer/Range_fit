import { auth, db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export const testUserData = async () => {
  console.log('🔍 Testing user data and memberships...')
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ User is authenticated:', user.uid)
      console.log('📧 Email:', user.email)
      
      try {
        // Get user document
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          console.log('📄 User data:', userData)
          console.log('👑 Role:', userData.role)
          console.log('🆔 Member ID:', userData.memberId)
          
          // Check if user has memberships
          const membershipsRef = collection(db, 'memberships')
          const membershipsQuery = query(membershipsRef, where('uid', '==', user.uid))
          const membershipsSnapshot = await getDocs(membershipsQuery)
          
          console.log(`📋 User has ${membershipsSnapshot.size} memberships`)
          
          if (!membershipsSnapshot.empty) {
            membershipsSnapshot.forEach((doc) => {
              const membership = doc.data()
              console.log('📋 Membership:', {
                id: doc.id,
                planType: membership.planType,
                amount: membership.amount,
                status: membership.status,
                startDate: membership.startDate,
                endDate: membership.endDate
              })
            })
          } else {
            console.log('❌ No memberships found for user')
          }
          
          // Check if user has receipts
          const receiptsRef = collection(db, 'receipts')
          const receiptsQuery = query(receiptsRef, where('userId', '==', user.uid))
          const receiptsSnapshot = await getDocs(receiptsQuery)
          
          console.log(`🧾 User has ${receiptsSnapshot.size} receipts`)
          
          if (!receiptsSnapshot.empty) {
            receiptsSnapshot.forEach((doc) => {
              const receipt = doc.data()
              console.log('🧾 Receipt:', {
                id: doc.id,
                receiptNumber: receipt.receiptNumber,
                amount: receipt.amount,
                membershipType: receipt.membershipType,
                status: receipt.status,
                createdAt: receipt.createdAt
              })
            })
          } else {
            console.log('❌ No receipts found for user')
          }
          
        } else {
          console.log('❌ User document does not exist in Firestore')
        }
      } catch (error) {
        console.error('❌ Error fetching user data:', error)
      }
    } else {
      console.log('❌ No user is authenticated')
    }
  })
}

// Run test
if (typeof window !== 'undefined') {
  testUserData()
}
