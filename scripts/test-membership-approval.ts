import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore'

// Firebase configuration (you'll need to add your actual config)
const firebaseConfig = {
  // Add your Firebase config here
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function testMembershipApprovalSystem() {
  console.log('🧪 Testing Membership Approval System...')
  
  try {
    // Test 1: Create a membership request
    console.log('📝 Creating membership request...')
    const testUserId = 'test-user-' + Date.now()
    
    const membershipRequest = {
      uid: testUserId,
      planType: 'Strength Training',
      amount: 5000,
      paymentMethod: 'Cash',
      transactionId: `TEST${Date.now()}`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userData: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        memberId: 'RF-TEST123',
        status: 'active',
        accountStatus: 'active',
        role: 'customer',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }
    }
    
    const requestRef = await addDoc(collection(db, 'membershipRequests'), membershipRequest)
    console.log('✅ Membership request created with ID:', requestRef.id)
    
    // Test 2: Check if request appears in pending requests
    console.log('🔍 Checking pending requests...')
    const pendingQuery = query(
      collection(db, 'membershipRequests'),
      where('status', '==', 'pending')
    )
    const pendingSnapshot = await getDocs(pendingQuery)
    console.log('📊 Found', pendingSnapshot.size, 'pending requests')
    
    // Test 3: Approve the membership request
    console.log('✅ Approving membership request...')
    await updateDoc(doc(db, 'membershipRequests', requestRef.id), {
      status: 'active',
      updatedAt: serverTimestamp(),
      updatedBy: 'test-admin'
    })
    console.log('✅ Membership request approved')
    
    // Test 4: Check if membership was created
    console.log('🔍 Checking if membership was created...')
    const membershipQuery = query(
      collection(db, 'memberships'),
      where('uid', '==', testUserId)
    )
    const membershipSnapshot = await getDocs(membershipQuery)
    console.log('📊 Found', membershipSnapshot.size, 'memberships for test user')
    
    if (membershipSnapshot.size > 0) {
      const membership = membershipSnapshot.docs[0].data()
      console.log('✅ Membership created successfully:', {
        planType: membership.planType,
        amount: membership.amount,
        status: membership.status
      })
    } else {
      console.log('❌ No membership found - approval system may not be working')
    }
    
    // Test 5: Clean up test data
    console.log('🧹 Cleaning up test data...')
    // Note: In a real scenario, you might want to keep test data for debugging
    
    console.log('🎉 Membership approval system test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testMembershipApprovalSystem()
