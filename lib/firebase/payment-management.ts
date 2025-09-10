import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "./config"

// Basic payment record creation
export const addPaymentRecord = async (paymentData: any) => {
  try {
    const paymentRef = collection(db, "payments")
    
    const record = {
      ...paymentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(paymentRef, record)
    console.log(`✅ Payment record created: ${docRef.id}`)
    return docRef
  } catch (error) {
    console.error("Error adding payment record:", error)
    throw error
  }
}

// Payment record with retention policy
export const addPaymentRecordWithRetention = async (paymentData: any) => {
  try {
    const paymentRef = collection(db, "payments")
    const now = new Date()
    
    // Calculate retention expiry date (3 months from now)
    const retentionExpiryDate = new Date(now.getTime() + 3 * 30 * 24 * 60 * 60 * 1000)
    
    // Add categorization fields for monthly reporting
    const paymentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const paymentYear = now.getFullYear()
    const paymentMonthName = now.toLocaleDateString('en-US', { month: 'long' })
    const paymentQuarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`
    
    const record = {
      ...paymentData,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
      retentionExpiryDate,
      // Monthly categorization fields
      paymentMonth,
      paymentYear,
      paymentMonthName,
      paymentQuarter,
    }

    const docRef = await addDoc(paymentRef, record)
    console.log(`✅ Payment record with retention created: ${docRef.id}`)
    return docRef
  } catch (error) {
    console.error("Error adding payment record with retention:", error)
    throw error
  }
}
