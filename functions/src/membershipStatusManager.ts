import { onSchedule } from "firebase-functions/v1/pubsub"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp } from "firebase-admin/app"

// Initialize Firebase Admin
if (!initializeApp.length) {
  initializeApp()
}

export const checkMembershipStatus = onSchedule("every 1 hours", async (event) => {
  const db = getFirestore()
  const now = new Date()
  
  console.log("🔄 Starting membership status check at:", now.toISOString())
  
  try {
    // Get all users with membership expiry dates
    const usersRef = db.collection("users")
    const snapshot = await usersRef
      .where("membershipExpiryDate", "!=", null)
      .where("role", "==", "customer") // Only check customers, not receptionists
      .get()
    
    let updatedCount = 0
    let inactiveCount = 0
    
    for (const doc of snapshot.docs) {
      const userData = doc.data()
      const membershipExpiryDate = userData.membershipExpiryDate?.toDate()
      
      if (!membershipExpiryDate) continue
      
      const daysSinceExpiry = Math.floor((now.getTime() - membershipExpiryDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Check if membership expired more than 7 days ago
      if (daysSinceExpiry > 7 && userData.status === "active") {
        // Set user to inactive
        await doc.ref.update({
          status: "inactive",
          membershipStatus: "expired",
          lastRenewalReminder: now,
          statusUpdatedAt: now,
          statusUpdatedBy: "system"
        })

        console.log(`❌ User ${userData.email} set to inactive (expired ${daysSinceExpiry} days ago)`)
        inactiveCount++
      }
      // Check if membership is active but expiry date is in the past
      else if (membershipExpiryDate < now && userData.membershipStatus === "active") {
        // Set membership status to expired
        await doc.ref.update({
          membershipStatus: "expired",
          lastRenewalReminder: now
        })

        console.log(`📅 User ${userData.email} membership expired today`)
      }
      
      updatedCount++
    }
    
    console.log(`✅ Membership status check completed: ${updatedCount} users checked, ${inactiveCount} set to inactive`)
    
  } catch (error) {
    console.error("❌ Error in membership status check:", error)
    throw error
  }
})

// Function to manually trigger membership status check (for testing)
export const manualMembershipCheck = onSchedule("0 0 * * *", async (event) => {
  console.log("🔄 Manual membership status check triggered")
  // Call the same logic as checkMembershipStatus
  const db = getFirestore()
  const now = new Date()
  
  console.log("🔄 Starting manual membership status check at:", now.toISOString())
  
  try {
    // Get all users with membership expiry dates
    const usersRef = db.collection("users")
    const snapshot = await usersRef
      .where("membershipExpiryDate", "!=", null)
      .where("role", "==", "customer") // Only check customers, not receptionists
      .get()
    
    let updatedCount = 0
    let inactiveCount = 0
    
    for (const doc of snapshot.docs) {
      const userData = doc.data()
      const membershipExpiryDate = userData.membershipExpiryDate?.toDate()
      
      if (!membershipExpiryDate) continue
      
      const daysSinceExpiry = Math.floor((now.getTime() - membershipExpiryDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Check if membership expired more than 7 days ago
      if (daysSinceExpiry > 7 && userData.status === "active") {
        // Set user to inactive
        await doc.ref.update({
          status: "inactive",
          membershipStatus: "expired",
          lastRenewalReminder: now,
          statusUpdatedAt: now,
          statusUpdatedBy: "system"
        })

        console.log(`❌ User ${userData.email} set to inactive (expired ${daysSinceExpiry} days ago)`)
        inactiveCount++
      }
      // Check if membership is active but expiry date is in the past
      else if (membershipExpiryDate < now && userData.membershipStatus === "active") {
        // Set membership status to expired
        await doc.ref.update({
          membershipStatus: "expired",
          lastRenewalReminder: now
        })

        console.log(`📅 User ${userData.email} membership expired today`)
      }
      
      updatedCount++
    }
    
    console.log(`✅ Manual membership status check completed: ${updatedCount} users checked, ${inactiveCount} set to inactive`)
    
  } catch (error) {
    console.error("❌ Error in manual membership status check:", error)
    throw error
  }
})
