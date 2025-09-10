import { collection, addDoc } from "firebase/firestore"
import { db } from "./config"

export interface VisitorData {
  uid: string
  visitorName: string
  visitorPhone: string
  planType: string
  amount: number
  paymentMethod: string
  transactionId: string
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
  isVisitor: boolean
  visitorMonth: string // Format: "YYYY-MM" (e.g., "2024-01")
  visitorYear: number // Year of visit
  visitorMonthName: string // Month name (e.g., "January")
  visitorQuarter: string // Quarter (e.g., "Q1", "Q2", "Q3", "Q4")
  revenueCategory: "visitor" // To distinguish from regular memberships
  status: "active" | "expired"
}

// Add visitor with month tracking for financial reporting
export const addVisitorWithMonthTracking = async (
  visitorData: Omit<VisitorData, 'createdAt' | 'updatedAt' | 'visitorMonth' | 'visitorYear' | 'visitorMonthName' | 'visitorQuarter' | 'revenueCategory' | 'status'>
) => {
  try {
    const visitorRef = collection(db, "memberships")
    const now = new Date()
    const visitorMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const visitorYear = now.getFullYear()
    const visitorMonthName = now.toLocaleDateString('en-US', { month: 'long' })
    const visitorQuarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`
    
    const newVisitor = {
      ...visitorData,
      visitorMonth,
      visitorYear,
      visitorMonthName,
      visitorQuarter,
      revenueCategory: "visitor",
      status: "active",
      createdAt: now,
      updatedAt: now,
    }
    const docRef = await addDoc(visitorRef, newVisitor)
    console.log(`✅ Visitor added with month categorization for financial reporting: ${visitorData.visitorName}`)
    return { id: docRef.id, ...newVisitor }
  } catch (error) {
    console.error("Error adding visitor:", error)
    throw error
  }
}
