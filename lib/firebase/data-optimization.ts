import { collection, query, where, getDocs, updateDoc, doc, writeBatch, addDoc, orderBy, limit } from "firebase/firestore"
import { db } from "./config"
import { updateUserDocument } from "./user-management"

export interface OptimizedMembershipPlan {
  uid: string
  planType: string
  amount: number
  paymentMethod: string
  transactionId: string
  startDate: Date
  endDate: Date
  status: string
  createdAt: Date
  updatedAt: Date
  registrationFee?: boolean
  customRegistrationFee?: number
  discount?: boolean
  discountAmount?: number
  totalAmount?: number
  renewalCount?: number
  lastRenewalDate?: Date
  nextRenewalReminder?: Date
}

export interface OptimizedPaymentRecord {
  uid: string
  amount: number
  planType: string
  paymentMethod: string
  transactionId: string
  status: string
  userEmail: string
  userName: string
  createdAt: Date
  updatedAt: Date
  isArchived: boolean
  retentionExpiryDate: Date
  deletedAt?: Date
  deletedBy?: string
  originalUserId?: string
  isAnonymized: boolean
  // Monthly categorization fields
  paymentMonth: string
  paymentYear: number
  paymentMonthName: string
  paymentQuarter: string
  // Registration fee and discount fields
  registrationFee?: boolean
  customRegistrationFee?: number
  discount?: boolean
  discountAmount?: number
}

// Helper function to get plan duration in days
const getPlanDurationDays = (planType: string): number => {
  switch (planType) {
    case 'visitor':
      return 1
    case 'strength':
    case 'cardio':
    case 'combo':
      return 30 // 1 month
    default:
      return 30 // Default to 1 month
  }
}

// Helper function to calculate days remaining until membership expiry
const calculateDaysRemaining = (endDate: Date): number => {
  const now = new Date()
  const timeDiff = endDate.getTime() - now.getTime()
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))
  return Math.max(0, daysRemaining) // Return 0 if already expired
}

// Update existing membership instead of creating new one
export const updateExistingMembership = async (uid: string, newData: Partial<OptimizedMembershipPlan>) => {
  try {
    const membershipRef = collection(db, "memberships")
    
    // Find existing membership for this user
    const q = query(membershipRef, where("uid", "==", uid))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
             // Get all memberships and sort by creation date to find the most recent
       const memberships = querySnapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data()
       })) as any[]
       
       // Sort by createdAt to get the most recent membership
       memberships.sort((a, b) => {
         const aDate = a.createdAt?.toDate?.() || a.createdAt
         const bDate = b.createdAt?.toDate?.() || b.createdAt
         return bDate.getTime() - aDate.getTime()
       })
       
       const mostRecentMembership = memberships[0]
       const membershipDocRef = doc(db, "memberships", mostRecentMembership.id)
       
       const now = new Date()
       const currentEndDate = mostRecentMembership.endDate?.toDate?.() || mostRecentMembership.endDate
      const daysRemaining = calculateDaysRemaining(currentEndDate)
      
      console.log(`📅 Membership expires in ${daysRemaining} days`)
      
      let updateData: any = {
        ...newData,
        updatedAt: now
      }
      
      let userUpdateData: any = {
        membershipStatus: "active",
        membershipPlan: newData.planType,
        membershipAmount: newData.amount,
        lastRenewalReminder: now
      }
      
      // RENEWAL LOGIC: Only renew if less than 7 days remaining
      if (daysRemaining < 7) {
        console.log(`✅ Renewal allowed: ${daysRemaining} days remaining (< 7 days)`)
        
        // Calculate new dates based on plan duration
        const planDurationDays = getPlanDurationDays(newData.planType)
       const newStartDate = now
        const newEndDate = new Date(now.getTime() + planDurationDays * 24 * 60 * 60 * 1000)
       
        updateData = {
          ...updateData,
         startDate: newStartDate,
         endDate: newEndDate,
         renewalCount: (mostRecentMembership.renewalCount || 0) + 1,
         lastRenewalDate: now,
          nextRenewalReminder: new Date(newEndDate.getTime() - 5 * 24 * 60 * 60 * 1000) // Reminder 5 days before expiry
        }
        
        userUpdateData = {
          ...userUpdateData,
          membershipStartDate: newStartDate,
          membershipExpiryDate: newEndDate
        }
        
        console.log(`🔄 Membership renewed: ${newStartDate.toDateString()} to ${newEndDate.toDateString()}`)
      } else {
        console.log(`⚠️ Renewal blocked: ${daysRemaining} days remaining (>= 7 days)`)
        console.log(`📝 Only updating payment details without extending membership`)
        
        // Keep existing dates - only update payment-related fields
        updateData = {
          ...updateData,
          // Don't update startDate, endDate, renewalCount, lastRenewalDate
          // Only update payment details
        }
        
        userUpdateData = {
          ...userUpdateData,
          // Don't update membershipStartDate, membershipExpiryDate
          // Only update payment-related fields
        }
       }
      
      await updateDoc(membershipDocRef, updateData)

      // Only add defined values to avoid Firebase errors
      if (newData.registrationFee !== undefined) userUpdateData.registrationFee = newData.registrationFee
      if (newData.customRegistrationFee !== undefined) userUpdateData.customRegistrationFee = newData.customRegistrationFee
      if (newData.discount !== undefined) userUpdateData.discount = newData.discount
      if (newData.discountAmount !== undefined) userUpdateData.discountAmount = newData.discountAmount
      if (newData.totalAmount !== undefined) userUpdateData.totalAmount = newData.totalAmount

      await updateUserDocument(uid, userUpdateData)
      
      console.log(`✅ Membership update completed for user ${uid}`)
      return { membershipDocRef, wasRenewal: daysRemaining < 7, daysRemaining }
    } else {
      throw new Error(`No existing membership found for user ${uid}`)
    }
  } catch (error) {
    console.error("Error updating existing membership:", error)
    throw error
  }
}

// Update existing payment record instead of creating new one
export const updateExistingPaymentRecord = async (uid: string, newData: any) => {
  try {
    const paymentRef = collection(db, 'payments')
    
    // First try to find records with orderBy (requires index)
    let querySnapshot
    try {
      const q = query(paymentRef, where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(1))
      querySnapshot = await getDocs(q)
    } catch (indexError) {
      console.log('⚠️ Index not available, trying without orderBy')
      // Fallback: get all records for user and sort client-side
      const q = query(paymentRef, where('uid', '==', uid))
      const allDocs = await getDocs(q)
      
      if (!allDocs.empty) {
        // Sort by createdAt client-side
        const sortedDocs = allDocs.docs.sort((a, b) => {
          const aDate = a.data().createdAt?.toDate?.() || a.data().createdAt
          const bDate = b.data().createdAt?.toDate?.() || b.data().createdAt
          return bDate.getTime() - aDate.getTime()
        })
        
        // Create a mock querySnapshot with the most recent document
        querySnapshot = {
          empty: false,
          docs: [sortedDocs[0]]
        }
      } else {
        querySnapshot = { empty: true, docs: [] }
      }
    }
    
    if (!querySnapshot.empty) {
      const paymentDoc = querySnapshot.docs[0]
      const paymentDocRef = doc(db, 'payments', paymentDoc.id)
      
      const updateData = {
        ...newData,
        updatedAt: new Date(),
        isUpdated: true // Flag to indicate this was an update, not a new payment
      }
      
      await updateDoc(paymentDocRef, updateData)
      console.log(`✅ Updated existing payment record for user ${uid}`)
      return paymentDocRef
    } else {
      // No existing payment record found - create a new one instead
      console.log(`⚠️ No existing payment record found for user ${uid}, creating new one`)
      
      const newPaymentData = {
        ...newData,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        retentionExpiryDate: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000),
        paymentMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        paymentYear: new Date().getFullYear(),
        paymentMonthName: new Date().toLocaleDateString('en-US', { month: 'long' }),
        paymentQuarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
        isUpdated: false, // Flag to indicate this was a new payment
        createdAsFallback: true // Flag to indicate this was created because no existing record was found
      }
      
      const docRef = await addDoc(paymentRef, newPaymentData)
      console.log(`✅ Created new payment record as fallback for user ${uid}`)
      return docRef
    }
  } catch (error) {
    console.error('Error updating existing payment record:', error)
    throw error
  }
}

// Update existing receipt record instead of creating new one
export const updateExistingReceiptRecord = async (userId: string, newData: any) => {
  try {
    const receiptRef = collection(db, 'receipts')
    
    // First try to find records with orderBy (requires index)
    let querySnapshot
    try {
      const q = query(receiptRef, where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(1))
      querySnapshot = await getDocs(q)
    } catch (indexError) {
      console.log('⚠️ Index not available, trying without orderBy')
      // Fallback: get all records for user and sort client-side
      const q = query(receiptRef, where('userId', '==', userId))
      const allDocs = await getDocs(q)
      
      if (!allDocs.empty) {
        // Sort by createdAt client-side
        const sortedDocs = allDocs.docs.sort((a, b) => {
          const aDate = a.data().createdAt?.toDate?.() || a.data().createdAt
          const bDate = b.data().createdAt?.toDate?.() || b.data().createdAt
          return bDate.getTime() - aDate.getTime()
        })
        
        // Create a mock querySnapshot with the most recent document
        querySnapshot = {
          empty: false,
          docs: [sortedDocs[0]]
        }
      } else {
        querySnapshot = { empty: true, docs: [] }
      }
    }
    
    if (!querySnapshot.empty) {
      const receiptDoc = querySnapshot.docs[0]
      const receiptDocRef = doc(db, 'receipts', receiptDoc.id)
      
      const updateData = {
        ...newData,
        updatedAt: new Date(),
        isUpdated: true // Flag to indicate this was an update, not a new receipt
      }
      
      await updateDoc(receiptDocRef, updateData)
      console.log(`✅ Updated existing receipt record for user ${userId}`)
      return receiptDocRef
    } else {
      // No existing receipt record found - create a new one instead
      console.log(`⚠️ No existing receipt record found for user ${userId}, creating new one`)
      
      const newReceiptData = {
        ...newData,
        createdAt: new Date(),
        isUpdated: false, // Flag to indicate this was a new receipt
        createdAsFallback: true // Flag to indicate this was created because no existing record was found
      }
      
      const docRef = await addDoc(receiptRef, newReceiptData)
      console.log(`✅ Created new receipt record as fallback for user ${userId}`)
      return docRef
    }
  } catch (error) {
    console.error('Error updating existing receipt record:', error)
    throw error
  }
}
export const manualArchivePaymentRecords = async () => {
  try {
    const paymentRef = collection(db, "payments")
    const now = new Date()
    
    // Find all payment records that are not archived
    const q = query(
      paymentRef,
      where("isArchived", "==", false)
    )
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      console.log("ℹ️ No payment records to archive")
      return { archivedCount: 0 }
    }
    
    const batch = writeBatch(db)
    let archivedCount = 0
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const retentionExpiryDate = data.retentionExpiryDate?.toDate?.() || data.retentionExpiryDate
      
      // Archive records that are older than 3 months
      if (retentionExpiryDate && retentionExpiryDate < now) {
        batch.update(doc.ref, {
          isArchived: true,
          archivedAt: now
        })
        archivedCount++
      }
    })
    
    if (archivedCount > 0) {
      await batch.commit()
      console.log(`✅ Archived ${archivedCount} payment records`)
    }
    
    return { archivedCount }
  } catch (error) {
    console.error("Error manually archiving payment records:", error)
    throw error
  }
}

// Manual cleanup function (can be called from admin dashboard)
export const manualCleanupArchivedRecords = async () => {
  try {
    const paymentRef = collection(db, "payments")
    const now = new Date()
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
    
    // Find all archived payment records
    const q = query(
      paymentRef,
      where("isArchived", "==", true)
    )
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      console.log("ℹ️ No archived payment records to cleanup")
      return { deletedCount: 0 }
    }
    
    const batch = writeBatch(db)
    let deletedCount = 0
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const archivedAt = data.archivedAt?.toDate?.() || data.archivedAt
      
      // Delete records that have been archived for more than 6 months
      if (archivedAt && archivedAt < sixMonthsAgo) {
        batch.delete(doc.ref)
        deletedCount++
      }
    })
    
    if (deletedCount > 0) {
      await batch.commit()
      console.log(`✅ Deleted ${deletedCount} old archived payment records`)
    }
    
    return { deletedCount }
  } catch (error) {
    console.error("Error manually cleaning up archived records:", error)
    throw error
  }
}

// Get active payment records (not archived)
export const getActivePaymentRecords = async (uid?: string) => {
  try {
    const paymentRef = collection(db, "payments")
    let q
    
    if (uid) {
      q = query(
        paymentRef,
        where("uid", "==", uid),
        where("isArchived", "==", false)
      )
    } else {
      q = query(
        paymentRef,
        where("isArchived", "==", false)
      )
    }
    
    const querySnapshot = await getDocs(q)
    const payments: any[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      payments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        retentionExpiryDate: data.retentionExpiryDate?.toDate?.() || data.retentionExpiryDate,
      })
    })
    
    return payments
  } catch (error) {
    console.error("Error getting active payment records:", error)
    throw error
  }
}

// Get archived payment records
export const getArchivedPaymentRecords = async (uid?: string) => {
  try {
    const paymentRef = collection(db, "payments")
    let q
    
    if (uid) {
      q = query(
        paymentRef,
        where("uid", "==", uid),
        where("isArchived", "==", true)
      )
    } else {
      q = query(
        paymentRef,
        where("isArchived", "==", true)
      )
    }
    
    const querySnapshot = await getDocs(q)
    const payments: any[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      payments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        retentionExpiryDate: data.retentionExpiryDate?.toDate?.() || data.retentionExpiryDate,
        archivedAt: data.archivedAt?.toDate?.() || data.archivedAt,
      })
    })
    
    return payments
  } catch (error) {
    console.error("Error getting archived payment records:", error)
    throw error
  }
}

// Check archival status for data management
export const checkArchivalStatus = async () => {
  try {
    const activePayments = await getActivePaymentRecords()
    const archivedPayments = await getArchivedPaymentRecords()
    
    const now = new Date()
    let needsArchival = 0
    let needsCleanup = 0
    
    // Check active payments that need archival
    activePayments.forEach(payment => {
      const retentionExpiryDate = payment.retentionExpiryDate
      if (retentionExpiryDate && retentionExpiryDate < now) {
        needsArchival++
      }
    })
    
    // Check archived payments that need cleanup
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
    archivedPayments.forEach(payment => {
      const archivedAt = payment.archivedAt
      if (archivedAt && archivedAt < sixMonthsAgo) {
        needsCleanup++
      }
    })
    
    return {
      activeCount: activePayments.length,
      archivedCount: archivedPayments.length,
      needsArchival,
      needsCleanup
    }
  } catch (error) {
    console.error("Error checking archival status:", error)
    throw error
  }
}

// Add payment record with manual retention (for free plan)
export const addPaymentRecordWithManualRetention = async (paymentData: any) => {
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
    console.log(`✅ Payment record with manual retention created: ${docRef.id}`)
    return docRef
  } catch (error) {
    console.error("Error adding payment record with manual retention:", error)
    throw error
  }
}
