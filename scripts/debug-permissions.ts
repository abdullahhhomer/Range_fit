import { auth, db } from '../lib/firebase'
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

async function debugPermissions() {
  console.log('🔍 Starting permissions debug...')
  
  // Check authentication status
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ User is authenticated:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      })
      
      try {
        // Check user document
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          console.log('✅ User document found:', {
            role: userData.role,
            status: userData.status,
            name: userData.name,
            email: userData.email
          })
          
          // Test different operations based on role
          if (userData.role === 'admin') {
            console.log('🔍 Testing admin permissions...')
            
            // Test reading users collection
            try {
              const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
              const usersSnapshot = await getDocs(usersQuery)
              console.log('✅ Admin can read users collection:', usersSnapshot.size, 'users')
            } catch (error) {
              console.error('❌ Admin cannot read users collection:', error)
            }
            
            // Test reading memberships collection
            try {
              const membershipsQuery = query(collection(db, 'memberships'), orderBy('createdAt', 'desc'))
              const membershipsSnapshot = await getDocs(membershipsQuery)
              console.log('✅ Admin can read memberships collection:', membershipsSnapshot.size, 'memberships')
            } catch (error) {
              console.error('❌ Admin cannot read memberships collection:', error)
            }
            
            // Test reading payments collection
            try {
              const paymentsQuery = query(collection(db, 'payments'), orderBy('createdAt', 'desc'))
              const paymentsSnapshot = await getDocs(paymentsQuery)
              console.log('✅ Admin can read payments collection:', paymentsSnapshot.size, 'payments')
            } catch (error) {
              console.error('❌ Admin cannot read payments collection:', error)
            }
            
            // Test reading expenses collection
            try {
              const expensesQuery = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'))
              const expensesSnapshot = await getDocs(expensesQuery)
              console.log('✅ Admin can read expenses collection:', expensesSnapshot.size, 'expenses')
            } catch (error) {
              console.error('❌ Admin cannot read expenses collection:', error)
            }
            
          } else if (userData.role === 'receptionist') {
            console.log('🔍 Testing receptionist permissions...')
            
            // Test reading users collection (customers only)
            try {
              const usersQuery = query(
                collection(db, 'users'), 
                where('role', 'in', ['customer', 'receptionist']),
                orderBy('createdAt', 'desc')
              )
              const usersSnapshot = await getDocs(usersQuery)
              console.log('✅ Receptionist can read users collection:', usersSnapshot.size, 'users')
            } catch (error) {
              console.error('❌ Receptionist cannot read users collection:', error)
            }
            
            // Test reading memberships collection
            try {
              const membershipsQuery = query(collection(db, 'memberships'), orderBy('createdAt', 'desc'))
              const membershipsSnapshot = await getDocs(membershipsQuery)
              console.log('✅ Receptionist can read memberships collection:', membershipsSnapshot.size, 'memberships')
            } catch (error) {
              console.error('❌ Receptionist cannot read memberships collection:', error)
            }
            
            // Test reading payments collection
            try {
              const paymentsQuery = query(collection(db, 'payments'), orderBy('createdAt', 'desc'))
              const paymentsSnapshot = await getDocs(paymentsQuery)
              console.log('✅ Receptionist can read payments collection:', paymentsSnapshot.size, 'payments')
            } catch (error) {
              console.error('❌ Receptionist cannot read payments collection:', error)
            }
            
          } else if (userData.role === 'customer') {
            console.log('🔍 Testing customer permissions...')
            
            // Test reading own user document
            try {
              const ownUserDoc = await getDoc(doc(db, 'users', user.uid))
              console.log('✅ Customer can read own user document:', ownUserDoc.exists())
            } catch (error) {
              console.error('❌ Customer cannot read own user document:', error)
            }
            
            // Test reading own memberships
            try {
              const membershipsQuery = query(
                collection(db, 'memberships'), 
                where('uid', '==', user.uid),
                orderBy('createdAt', 'desc')
              )
              const membershipsSnapshot = await getDocs(membershipsQuery)
              console.log('✅ Customer can read own memberships:', membershipsSnapshot.size, 'memberships')
            } catch (error) {
              console.error('❌ Customer cannot read own memberships:', error)
            }
            
            // Test reading own payments
            try {
              const paymentsQuery = query(
                collection(db, 'payments'), 
                where('uid', '==', user.uid),
                orderBy('createdAt', 'desc')
              )
              const paymentsSnapshot = await getDocs(paymentsQuery)
              console.log('✅ Customer can read own payments:', paymentsSnapshot.size, 'payments')
            } catch (error) {
              console.error('❌ Customer cannot read own payments:', error)
            }
          }
          
        } else {
          console.error('❌ User document not found in Firestore')
        }
        
      } catch (error) {
        console.error('❌ Error checking user permissions:', error)
      }
      
    } else {
      console.log('❌ User is not authenticated')
    }
  })
}

// Run the debug function
debugPermissions().catch(console.error)





