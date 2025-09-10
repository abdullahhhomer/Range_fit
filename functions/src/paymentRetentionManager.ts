import { onSchedule } from "firebase-functions/v1/pubsub"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp } from "firebase-admin/app"

// Initialize Firebase Admin
if (!initializeApp.length) {
  initializeApp()
}

// Archive old payment records (runs daily at 2 AM)
export const archivePaymentRecords = onSchedule("0 2 * * *", async (event) => {
  const db = getFirestore()
  const now = new Date()
  
  console.log("🔄 Starting payment records archival process at:", now.toISOString())
  
  try {
    const paymentRef = db.collection("payments")
    
    // Find all payment records that have passed their retention period
    const q = paymentRef
      .where("retentionExpiryDate", "<=", now)
      .where("isArchived", "==", false)
    
    const querySnapshot = await q.get()
    
    if (querySnapshot.empty) {
      console.log("ℹ️ No payment records to archive")
      return
    }
    
    const batch = db.batch()
    let archivedCount = 0
    
    querySnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isArchived: true,
        archiveReason: "Retention period expired",
        archivedAt: now,
        updatedAt: now
      })
      archivedCount++
    })
    
    await batch.commit()
    
    console.log(`✅ Archived ${archivedCount} old payment records`)
    
  } catch (error) {
    console.error("❌ Error in payment archival process:", error)
    throw error
  }
})

// Clean up very old archived records (runs monthly)
export const cleanupOldArchivedRecords = onSchedule("0 3 1 * *", async (event) => {
  const db = getFirestore()
  const now = new Date()
  
  console.log("🔄 Starting cleanup of old archived records at:", now.toISOString())
  
  try {
    const paymentRef = db.collection("payments")
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - 6) // 6 months old
    
    // Find archived payments older than 6 months
    const q = paymentRef
      .where("isArchived", "==", true)
      .where("archivedAt", "<=", cutoffDate)
    
    const querySnapshot = await q.get()
    
    if (querySnapshot.empty) {
      console.log("ℹ️ No old archived records to clean up")
      return
    }
    
    const batch = db.batch()
    let deletedCount = 0
    
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
      deletedCount++
    })
    
    await batch.commit()
    
    console.log(`🗑️ Permanently deleted ${deletedCount} old archived payment records`)
    
  } catch (error) {
    console.error("❌ Error in cleanup process:", error)
    throw error
  }
})
