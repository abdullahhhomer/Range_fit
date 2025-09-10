import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'

async function testVisitorsCount() {
  console.log('🔍 Testing visitors count for this month...')
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ User authenticated:', {
        uid: user.uid,
        email: user.email
      })
      
      try {
        // Get current month
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        console.log('📅 Current month start:', thisMonth.toISOString())
        
        // Query memberships collection for visitors this month
        const membershipsRef = collection(db, 'memberships')
        const membershipsSnapshot = await getDocs(membershipsRef)
        
        const memberships = membershipsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        
        // Count visitors this month
        const visitorsThisMonth = memberships.filter(membership => {
          if (!membership.isVisitor) return false
          const createdAt = membership.createdAt?.toDate?.() || membership.createdAt
          return createdAt >= thisMonth
        })
        
        console.log('📊 Total memberships:', memberships.length)
        console.log('👥 Total visitors:', memberships.filter(m => m.isVisitor).length)
        console.log('📅 Visitors this month:', visitorsThisMonth.length)
        
        // Show sample visitor data
        if (visitorsThisMonth.length > 0) {
          console.log('📋 Sample visitor this month:', {
            name: visitorsThisMonth[0].visitorName,
            phone: visitorsThisMonth[0].visitorPhone,
            createdAt: visitorsThisMonth[0].createdAt?.toDate?.() || visitorsThisMonth[0].createdAt
          })
        }
        
        console.log('✅ Visitors count test completed successfully')
        
      } catch (error) {
        console.error('❌ Error testing visitors count:', error)
      }
      
    } else {
      console.log('❌ No user authenticated - please log in first')
    }
  })
}

testVisitorsCount().catch(console.error)




