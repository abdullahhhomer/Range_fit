import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore"
import { db } from "./config"

// Update visitor status (active/expired) based on current time
export const updateVisitorStatus = async (visitorId: string) => {
  try {
    const visitorRef = doc(db, "memberships", visitorId)
    const visitorDoc = await getDoc(visitorRef)
    
    if (!visitorDoc.exists()) {
      throw new Error("Visitor not found")
    }
    
    const visitorData = visitorDoc.data()
    if (!visitorData.isVisitor) {
      throw new Error("Document is not a visitor")
    }
    
    const now = new Date()
    const endDate = visitorData.endDate?.toDate?.() || visitorData.endDate
    
    const newStatus = endDate < now ? "expired" : "active"
    
    if (visitorData.status !== newStatus) {
      await updateDoc(visitorRef, {
        status: newStatus,
        updatedAt: now
      })
      
      console.log(`✅ Updated visitor ${visitorData.visitorName} status to ${newStatus}`)
    }
    
    return newStatus
  } catch (error) {
    console.error("Error updating visitor status:", error)
    throw error
  }
}

// Update all visitor statuses (for batch processing)
export const updateAllVisitorStatuses = async () => {
  try {
    const visitorRef = collection(db, "memberships")
    const q = query(
      visitorRef,
      where("isVisitor", "==", true)
    )
    
    const querySnapshot = await getDocs(q)
    const batch = writeBatch(db)
    let updatedCount = 0
    
    querySnapshot.forEach((doc) => {
      const visitorData = doc.data()
      const now = new Date()
      const endDate = visitorData.endDate?.toDate?.() || visitorData.endDate
      const newStatus = endDate < now ? "expired" : "active"
      
      if (visitorData.status !== newStatus) {
        batch.update(doc.ref, {
          status: newStatus,
          updatedAt: now
        })
        updatedCount++
      }
    })
    
    if (updatedCount > 0) {
      await batch.commit()
      console.log(`✅ Updated ${updatedCount} visitor statuses`)
    }
    
    return { updatedCount }
  } catch (error) {
    console.error("Error updating all visitor statuses:", error)
    throw error
  }
}
