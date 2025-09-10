import { auth, db } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export const checkReceiptIndexStatus = async () => {
  console.log('🔍 Checking receipt index status...')
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const receiptsRef = collection(db, "receipts")
        const q = query(
          receiptsRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        )
        
        const snapshot = await getDocs(q)
        console.log('✅ Receipt index is ready! Found', snapshot.size, 'receipts')
        return true
      } catch (error) {
        console.log('⏳ Receipt index is still building:', error)
        return false
      }
    }
  })
}

// Add to window for easy testing
if (typeof window !== 'undefined') {
  (window as any).checkReceiptIndexStatus = checkReceiptIndexStatus
}
