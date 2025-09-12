import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  updateDoc
} from "firebase/firestore"
import { db } from "./config"

export interface ReceiptData {
  id?: string
  userId: string
  memberId: string
  customerName: string
  membershipType: string
  amount: number
  paymentMethod: string
  transactionId: string
  startDate: Date | Timestamp
  endDate: Date | Timestamp
  createdAt: Date | Timestamp
  receiptNumber: string
  gymName: string
  gymAddress: string
  gymPhone: string
  gymEmail: string
  // New fields for detailed breakdown
  planMembershipFee?: number
  registrationFee?: boolean
  customRegistrationFee?: number
  discount?: boolean
  discountAmount?: number
  totalAmount?: number
}

// Generate unique receipt number
const generateReceiptNumber = (): string => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `RF-${timestamp}-${random}`
}

// Create a new receipt
export const createReceipt = async (receiptData: Omit<ReceiptData, 'id' | 'createdAt' | 'receiptNumber'>): Promise<string> => {
  try {
    const receiptsRef = collection(db, "receipts")
    
    const receipt: Omit<ReceiptData, 'id'> = {
      ...receiptData,
      receiptNumber: generateReceiptNumber(),
      createdAt: new Date(),
    }

    const docRef = await addDoc(receiptsRef, receipt)
    console.log(`✅ Receipt created: ${docRef.id}`)
    
    // Apply FIFO logic for 5-month rolling history
    await enforceReceiptRetention(receiptData.userId)
    
    return docRef.id
  } catch (error) {
    console.error("Error creating receipt:", error)
    throw error
  }
}

// Enforce 5-month rolling history (FIFO logic)
const enforceReceiptRetention = async (userId: string) => {
  try {
    const receiptsRef = collection(db, "receipts")
    const q = query(
      receiptsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    )
    
    const snapshot = await getDocs(q)
    const receipts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ReceiptData[]
    
    // If more than 5 receipts, delete the oldest ones
    if (receipts.length > 5) {
      const receiptsToDelete = receipts.slice(5)
      
      for (const receipt of receiptsToDelete) {
        if (receipt.id) {
          await deleteDoc(doc(db, "receipts", receipt.id))
          console.log(`🗑️ Deleted old receipt: ${receipt.id}`)
        }
      }
    }
  } catch (error) {
    console.error("Error enforcing receipt retention:", error)
  }
}

// Get receipts for a user with real-time updates
export const onUserReceiptsChange = (userId: string, callback: (receipts: ReceiptData[]) => void) => {
  const receiptsRef = collection(db, "receipts")
  
  // Try with composite index first, fallback to simple query if index is building
  const q = query(
    receiptsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )
  
  return onSnapshot(q, (snapshot) => {
    const receipts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ReceiptData[]
    
    callback(receipts)
  }, (error) => {
    console.warn("Receipts query failed, trying fallback query:", error)
    
    // Fallback: try without orderBy to avoid index requirement
    const fallbackQuery = query(
      receiptsRef,
      where("userId", "==", userId)
    )
    
    onSnapshot(fallbackQuery, (fallbackSnapshot) => {
      const receipts = fallbackSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReceiptData[]
      
      // Sort on client side
      receipts.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || a.createdAt
        const bDate = b.createdAt?.toDate?.() || b.createdAt
        return bDate.getTime() - aDate.getTime()
      })
      
      callback(receipts)
    }, (fallbackError) => {
      console.warn("Fallback receipts query also failed:", fallbackError)
      callback([])
    })
  })
}

// Get receipts for a user (one-time fetch)
export const getUserReceipts = async (userId: string): Promise<ReceiptData[]> => {
  try {
    const receiptsRef = collection(db, "receipts")
    const q = query(
      receiptsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    )
    
    const snapshot = await getDocs(q)
    const receipts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ReceiptData[]
    
    return receipts
  } catch (error) {
    console.warn("Receipts query failed, trying fallback:", error)
    
    // Fallback: get all receipts and filter client-side
    try {
      const receiptsRef = collection(db, "receipts")
      const q = query(receiptsRef, where("userId", "==", userId))
      
      const snapshot = await getDocs(q)
      const receipts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReceiptData[]
      
      // Sort client-side
      receipts.sort((a, b) => {
        const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt)
        const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
      
      return receipts
    } catch (fallbackError) {
      console.error("Fallback receipts query also failed:", fallbackError)
      return []
    }
  }
}

// Get a specific receipt by ID
export const getReceiptById = async (receiptId: string): Promise<ReceiptData | null> => {
  try {
    const receiptRef = doc(db, "receipts", receiptId)
    const snapshot = await getDocs(collection(db, "receipts"))
    
    const receiptDoc = snapshot.docs.find(doc => doc.id === receiptId)
    if (receiptDoc) {
      return {
        id: receiptDoc.id,
        ...receiptDoc.data()
      } as ReceiptData
    }
    
    return null
  } catch (error) {
    console.error("Error fetching receipt:", error)
    throw error
  }
}

// Get receipt statistics for a user
export const getUserReceiptStats = async (userId: string) => {
  try {
    const receipts = await getUserReceipts(userId)
    
    const totalPaid = receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
    const lastPayment = receipts.length > 0 ? receipts[0] : null
    
    return {
      totalPaid,
      totalReceipts: receipts.length,
      lastPayment,
      lastPaymentDate: lastPayment?.createdAt || null
    }
  } catch (error) {
    console.error("Error fetching receipt stats:", error)
    throw error
  }
}
