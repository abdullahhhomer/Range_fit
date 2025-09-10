import { auth, db, createReceipt } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

export const createTestReceipt = async () => {
  console.log('🧪 Creating test receipt...')
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const testReceiptData = {
          userId: user.uid,
          memberId: "RF-TEST123",
          customerName: "Test User",
          membershipType: "Strength Training",
          amount: 5000,
          paymentMethod: "Cash",
          transactionId: `TEST${Date.now()}`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: "active" as const,
          gymName: "RangeFit Gym",
          gymAddress: "123 Fitness Street, Karachi, Pakistan",
          gymPhone: "+92-300-1234567",
          gymEmail: "info@rangefitgym.com"
        }

        const receiptId = await createReceipt(testReceiptData)
        console.log('✅ Test receipt created successfully:', receiptId)
        
        // Refresh the page to see the receipt
        setTimeout(() => {
          window.location.reload()
        }, 1000)
        
      } catch (error) {
        console.error('❌ Error creating test receipt:', error)
      }
    } else {
      console.log('❌ No user is authenticated')
    }
  })
}

// Add to window for easy testing
if (typeof window !== 'undefined') {
  (window as any).createTestReceipt = createTestReceipt
}
