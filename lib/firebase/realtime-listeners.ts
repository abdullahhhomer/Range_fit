import { doc, onSnapshot, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "./config"

// Real-time user data listener
export const onUserDataChange = (uid: string, callback: (data: any) => void) => {
  const userRef = doc(db, "users", uid)
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() })
    } else {
      callback(null)
    }
  }, (error) => {
    console.warn("User data listener error (likely authentication issue):", error)
    // Don't call callback on error to avoid breaking the UI
  })
}

// Real-time listeners for membership requests
export const onAllMembershipsChange = (callback: (requests: any[]) => void) => {
  const requestsRef = collection(db, "membershipRequests")
  const q = query(requestsRef)
  
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Sort by createdAt on the client side to avoid index requirement
    requests.sort((a, b) => {
      const aDate = (a as any).createdAt?.toDate?.() || (a as any).createdAt
      const bDate = (b as any).createdAt?.toDate?.() || (b as any).createdAt
      return bDate.getTime() - aDate.getTime()
    })
    
    callback(requests)
  }, (error) => {
    console.warn("All memberships listener error (likely authentication issue):", error)
    // Return empty array on error to avoid breaking the UI
    callback([])
  })
}

export const onPendingMembershipsChange = (callback: (pending: any[]) => void) => {
  const requestsRef = collection(db, "membershipRequests")
  const q = query(
    requestsRef, 
    where("status", "==", "pending")
  )
  
  return onSnapshot(q, (snapshot) => {
    const pending = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Sort by createdAt on the client side to avoid index requirement
    pending.sort((a, b) => {
      const aDate = (a as any).createdAt?.toDate?.() || (a as any).createdAt
      const bDate = (b as any).createdAt?.toDate?.() || (b as any).createdAt
      return bDate.getTime() - aDate.getTime()
    })
    
    callback(pending)
  }, (error) => {
    console.warn("Pending memberships listener error (likely authentication issue):", error)
    // Return empty array on error to avoid breaking the UI
    callback([])
  })
}

// Real-time user membership listener
export const onUserMembershipChange = (uid: string, callback: (membershipData: any) => void) => {
  const membershipsRef = collection(db, "memberships")
  const requestsRef = collection(db, "membershipRequests")
  
  // Listen to both memberships and membership requests
  const membershipsQuery = query(membershipsRef, where("uid", "==", uid))
  const requestsQuery = query(requestsRef, where("uid", "==", uid))
  
  let membershipData: any = null
  let requestData: any = null
  
  const unsubscribeMemberships = onSnapshot(membershipsQuery, (snapshot) => {
    if (!snapshot.empty) {
      // Get the most recent membership
      const memberships = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[]
      
      // Sort by createdAt to get the most recent
      memberships.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || a.createdAt
        const bDate = b.createdAt?.toDate?.() || b.createdAt
        return bDate.getTime() - aDate.getTime()
      })
      
      membershipData = memberships[0]
      // If we have both membership and request data, prioritize membership
      if (membershipData && requestData) {
        callback(membershipData)
      } else if (membershipData) {
        callback(membershipData)
      }
    } else {
      membershipData = null
      // If no membership but we have request data, return request data
      if (requestData) {
        callback(requestData)
      } else {
        callback(null)
      }
    }
  }, (error) => {
    console.warn("User memberships listener error (likely authentication issue):", error)
    // Don't call callback on error to avoid breaking the UI
  })
  
  const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
    if (!snapshot.empty) {
      // Get the most recent request
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[]
      
      // Sort by createdAt to get the most recent
      requests.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || a.createdAt
        const bDate = b.createdAt?.toDate?.() || b.createdAt
        return bDate.getTime() - aDate.getTime()
      })
      
      requestData = requests[0]
      // If we have both membership and request data, prioritize membership
      if (membershipData && requestData) {
        callback(membershipData)
      } else if (requestData) {
        callback(requestData)
      }
    } else {
      requestData = null
      // If no request but we have membership data, return membership data
      if (membershipData) {
        callback(membershipData)
      } else {
        callback(null)
      }
    }
  }, (error) => {
    console.warn("User membership requests listener error (likely authentication issue):", error)
    // Don't call callback on error to avoid breaking the UI
  })
  
  // Return unsubscribe function for both listeners
  return () => {
    unsubscribeMemberships()
    unsubscribeRequests()
  }
}

// Real-time dashboard stats listener
export const onDashboardStatsChange = (callback: (stats: any) => void) => {
  // Listen to multiple collections for comprehensive stats
  const usersRef = collection(db, "users")
  const membershipsRef = collection(db, "memberships")
  const paymentsRef = collection(db, "payments")
  const membershipRequestsRef = collection(db, "membershipRequests")
  
  let stats = {
    totalUsers: 0,
    activeMemberships: 0,
    totalRevenue: 0,
    attendanceRate: 0,
    newUsersThisMonth: 0,
    pendingApprovals: 0
  }
  
  let listeners: (() => void)[] = []
  
  // Users listener
  const usersListener = onSnapshot(usersRef, (snapshot) => {
    try {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      stats.totalUsers = users.length
      stats.newUsersThisMonth = users.filter(user => {
        const createdAt = user.createdAt?.toDate?.() || user.createdAt
        return createdAt >= thisMonth
      }).length
      
      callback({ ...stats })
    } catch (error) {
      console.error('Error in users listener:', error)
      callback({ ...stats })
    }
  }, (error) => {
    console.error('Users listener error:', error)
    callback({ ...stats })
  })
  
  // Memberships listener
  const membershipsListener = onSnapshot(membershipsRef, (snapshot) => {
    try {
      const memberships = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      const now = new Date()
      
      stats.activeMemberships = memberships.filter(membership => {
        if (membership.isVisitor) return false // Exclude visitors from active count
        const endDate = membership.endDate?.toDate?.() || membership.endDate
        return endDate && endDate > now
      }).length
      
      callback({ ...stats })
    } catch (error) {
      console.error('Error in memberships listener:', error)
      callback({ ...stats })
    }
  }, (error) => {
    console.error('Memberships listener error:', error)
    callback({ ...stats })
  })
  
  // Payments listener
  const paymentsListener = onSnapshot(paymentsRef, (snapshot) => {
    try {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      
      stats.totalRevenue = payments
        .filter(payment => payment.status === "completed")
        .reduce((sum, payment) => sum + (payment.amount || 0), 0)
      
      callback({ ...stats })
    } catch (error) {
      console.error('Error in payments listener:', error)
      callback({ ...stats })
    }
  }, (error) => {
    console.error('Payments listener error:', error)
    callback({ ...stats })
  })
  
  // Membership requests listener
  const requestsListener = onSnapshot(membershipRequestsRef, (snapshot) => {
    try {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      
      stats.pendingApprovals = requests.filter(request => request.status === "pending").length
      
      callback({ ...stats })
    } catch (error) {
      console.error('Error in membership requests listener:', error)
      callback({ ...stats })
    }
  }, (error) => {
    console.error('Membership requests listener error:', error)
    callback({ ...stats })
  })
  
  listeners = [usersListener, membershipsListener, paymentsListener, requestsListener]
  
  // Return unsubscribe function
  return () => {
    listeners.forEach(unsubscribe => unsubscribe())
  }
}

// Real-time reception dashboard stats listener (excludes admin users)
export const onReceptionDashboardStatsChange = (callback: (stats: any) => void) => {
  // Listen to multiple collections for comprehensive stats
  const usersRef = collection(db, "users")
  const membershipsRef = collection(db, "memberships")
  const paymentsRef = collection(db, "payments")
  const membershipRequestsRef = collection(db, "membershipRequests")
  
  let stats = {
    totalUsers: 0,
    activeMemberships: 0,
    totalRevenue: 0,
    attendanceRate: 0,
    newUsersThisMonth: 0,
    pendingApprovals: 0,
    visitorsThisMonth: 0
  }
  
  let listeners: (() => void)[] = []
  
  // Users listener (excludes admin users)
  const usersListener = onSnapshot(usersRef, (snapshot) => {
    try {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      // Filter out admin users
      const nonAdminUsers = users.filter(user => user.role !== 'admin')
      
      stats.totalUsers = nonAdminUsers.length
      stats.newUsersThisMonth = nonAdminUsers.filter(user => {
        const createdAt = user.createdAt?.toDate?.() || user.createdAt
        return createdAt >= thisMonth
      }).length
      
      callback({ ...stats })
    } catch (error) {
      console.error('Error in users listener:', error)
      callback({ ...stats })
    }
  }, (error) => {
    console.error('Users listener error:', error)
    callback({ ...stats })
  })
  
  // Memberships listener
  const membershipsListener = onSnapshot(membershipsRef, (snapshot) => {
    try {
      const memberships = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      stats.activeMemberships = memberships.filter(membership => {
        if (membership.isVisitor) return false // Exclude visitors from active count
        const endDate = membership.endDate?.toDate?.() || membership.endDate
        return endDate && endDate > now
      }).length
      
      // Count visitors this month
      stats.visitorsThisMonth = memberships.filter(membership => {
        if (!membership.isVisitor) return false
        const createdAt = membership.createdAt?.toDate?.() || membership.createdAt
        return createdAt >= thisMonth
      }).length
      
      callback({ ...stats })
    } catch (error) {
      console.error('Error in memberships listener:', error)
      callback({ ...stats })
    }
  }, (error) => {
    console.error('Memberships listener error:', error)
    callback({ ...stats })
  })
  
  // Payments listener
  const paymentsListener = onSnapshot(paymentsRef, (snapshot) => {
    try {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      
      stats.totalRevenue = payments
        .filter(payment => payment.status === "completed")
        .reduce((sum, payment) => sum + (payment.amount || 0), 0)
      
      callback({ ...stats })
    } catch (error) {
      console.error('Error in payments listener:', error)
      callback({ ...stats })
    }
  }, (error) => {
    console.error('Payments listener error:', error)
    callback({ ...stats })
  })
  
  // Membership requests listener
  const requestsListener = onSnapshot(membershipRequestsRef, (snapshot) => {
    try {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      
      stats.pendingApprovals = requests.filter(request => request.status === "pending").length
      
      callback({ ...stats })
    } catch (error) {
      console.error('Error in membership requests listener:', error)
      callback({ ...stats })
    }
  }, (error) => {
    console.error('Membership requests listener error:', error)
    callback({ ...stats })
  })
  
  listeners = [usersListener, membershipsListener, paymentsListener, requestsListener]
  
  // Return unsubscribe function
  return () => {
    listeners.forEach(unsubscribe => unsubscribe())
  }
}

// Test function for real-time data (for development/testing purposes)
export const testRealTimeData = async () => {
  try {
    console.log('🧪 Testing real-time data connection...')
    
    // Test basic Firestore connection
    const testRef = collection(db, "users")
    const testQuery = query(testRef, limit(1))
    const testSnapshot = await getDocs(testQuery)
    
    if (testSnapshot.empty) {
      console.log('✅ Firestore connection successful (no users found)')
    } else {
      console.log('✅ Firestore connection successful (users found)')
    }
    
    return true
  } catch (error) {
    console.error('❌ Real-time data test failed:', error)
    throw error
  }
}
