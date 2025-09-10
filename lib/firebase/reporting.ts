import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "./config"
import { VisitorData } from "./visitor-management"

// Get payments by month for monthly financial reporting
export const getPaymentsByMonth = async (month: string) => {
  try {
    const paymentRef = collection(db, "payments")
    const q = query(
      paymentRef,
      where("paymentMonth", "==", month)
    )
    
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
    console.error("Error getting payments by month:", error)
    throw error
  }
}

// Get payments by year for annual financial reporting
export const getPaymentsByYear = async (year: number) => {
  try {
    const paymentRef = collection(db, "payments")
    const q = query(
      paymentRef,
      where("paymentYear", "==", year)
    )
    
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
    console.error("Error getting payments by year:", error)
    throw error
  }
}

// Get payments by quarter for quarterly financial reporting
export const getPaymentsByQuarter = async (quarter: string, year: number) => {
  try {
    const paymentRef = collection(db, "payments")
    const q = query(
      paymentRef,
      where("paymentQuarter", "==", quarter),
      where("paymentYear", "==", year)
    )
    
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
    console.error("Error getting payments by quarter:", error)
    throw error
  }
}

// Get monthly revenue summary
export const getMonthlyRevenueSummary = async (month: string) => {
  try {
    const payments = await getPaymentsByMonth(month)
    
    const summary = {
      month,
      totalRevenue: 0,
      totalPayments: payments.length,
      revenueByPlan: {} as Record<string, number>,
      revenueByPaymentMethod: {} as Record<string, number>,
      averagePayment: 0,
      topPlans: [] as Array<{ plan: string; revenue: number; count: number }>
    }
    
    payments.forEach(payment => {
      if (payment.status === "completed") {
        summary.totalRevenue += payment.amount
        
        // Revenue by plan
        if (!summary.revenueByPlan[payment.planType]) {
          summary.revenueByPlan[payment.planType] = 0
        }
        summary.revenueByPlan[payment.planType] += payment.amount
        
        // Revenue by payment method
        if (!summary.revenueByPaymentMethod[payment.paymentMethod]) {
          summary.revenueByPaymentMethod[payment.paymentMethod] = 0
        }
        summary.revenueByPaymentMethod[payment.paymentMethod] += payment.amount
      }
    })
    
    // Calculate average payment
    summary.averagePayment = summary.totalPayments > 0 ? summary.totalRevenue / summary.totalPayments : 0
    
    // Get top plans
    summary.topPlans = Object.entries(summary.revenueByPlan)
      .map(([plan, revenue]) => ({
        plan,
        revenue,
        count: payments.filter(p => p.planType === plan && p.status === "completed").length
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
    
    return summary
  } catch (error) {
    console.error("Error getting monthly revenue summary:", error)
    throw error
  }
}

// Get yearly revenue summary for memberships
export const getYearlyRevenueSummary = async (year: number) => {
  try {
    const payments = await getPaymentsByYear(year)
    
    const summary = {
      year,
      totalRevenue: 0,
      totalPayments: payments.length,
      revenueByPlan: {} as Record<string, number>,
      revenueByPaymentMethod: {} as Record<string, number>,
      averagePayment: 0,
      topPlans: [] as Array<{ plan: string; revenue: number; count: number }>
    }
    
    payments.forEach(payment => {
      if (payment.status === "completed") {
        summary.totalRevenue += payment.amount
        
        // Revenue by plan
        if (!summary.revenueByPlan[payment.planType]) {
          summary.revenueByPlan[payment.planType] = 0
        }
        summary.revenueByPlan[payment.planType] += payment.amount
        
        // Revenue by payment method
        if (!summary.revenueByPaymentMethod[payment.paymentMethod]) {
          summary.revenueByPaymentMethod[payment.paymentMethod] = 0
        }
        summary.revenueByPaymentMethod[payment.paymentMethod] += payment.amount
      }
    })
    
    // Calculate average payment
    summary.averagePayment = summary.totalPayments > 0 ? summary.totalRevenue / summary.totalPayments : 0
    
    // Get top plans
    summary.topPlans = Object.entries(summary.revenueByPlan)
      .map(([plan, revenue]) => ({
        plan,
        revenue,
        count: payments.filter(p => p.planType === plan && p.status === "completed").length
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
    
    return summary
  } catch (error) {
    console.error("Error getting yearly revenue summary:", error)
    throw error
  }
}

// Get available months for reporting
export const getAvailablePaymentMonths = async () => {
  try {
    const paymentRef = collection(db, "payments")
    const q = query(paymentRef)
    const querySnapshot = await getDocs(q)
    
    const months = new Set<string>()
    
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.paymentMonth) {
        months.add(data.paymentMonth)
      }
    })
    
    return Array.from(months).sort().reverse() // Most recent first
  } catch (error) {
    console.error("Error getting available payment months:", error)
    throw error
  }
}

// Visitor reporting functions
export const getVisitorsByMonth = async (month: string, year: number) => {
  try {
    const visitorRef = collection(db, "memberships")
    const visitorMonth = `${year}-${String(month).padStart(2, '0')}`
    
    const q = query(
      visitorRef,
      where("isVisitor", "==", true),
      where("visitorMonth", "==", visitorMonth)
    )
    
    const querySnapshot = await getDocs(q)
    const visitors: VisitorData[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      visitors.push({
        uid: data.uid,
        visitorName: data.visitorName,
        visitorPhone: data.visitorPhone,
        planType: data.planType,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        startDate: data.startDate?.toDate?.() || data.startDate,
        endDate: data.endDate?.toDate?.() || data.endDate,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        isVisitor: data.isVisitor,
        visitorMonth: data.visitorMonth,
        visitorYear: data.visitorYear,
        visitorMonthName: data.visitorMonthName,
        visitorQuarter: data.visitorQuarter,
        revenueCategory: data.revenueCategory,
        status: data.status,
      } as VisitorData)
    })
    
    return visitors
  } catch (error) {
    console.error("Error getting visitors by month:", error)
    throw error
  }
}

export const getVisitorsByYear = async (year: number) => {
  try {
    const visitorRef = collection(db, "memberships")
    
    const q = query(
      visitorRef,
      where("isVisitor", "==", true),
      where("visitorYear", "==", year)
    )
    
    const querySnapshot = await getDocs(q)
    const visitors: VisitorData[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      visitors.push({
        uid: data.uid,
        visitorName: data.visitorName,
        visitorPhone: data.visitorPhone,
        planType: data.planType,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        startDate: data.startDate?.toDate?.() || data.startDate,
        endDate: data.endDate?.toDate?.() || data.endDate,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        isVisitor: data.isVisitor,
        visitorMonth: data.visitorMonth,
        visitorYear: data.visitorYear,
        visitorMonthName: data.visitorMonthName,
        visitorQuarter: data.visitorQuarter,
        revenueCategory: data.revenueCategory,
        status: data.status,
      } as VisitorData)
    })
    
    return visitors
  } catch (error) {
    console.error("Error getting visitors by year:", error)
    throw error
  }
}

export const getVisitorsByQuarter = async (quarter: string, year: number) => {
  try {
    const visitorRef = collection(db, "memberships")
    
    const q = query(
      visitorRef,
      where("isVisitor", "==", true),
      where("visitorQuarter", "==", quarter),
      where("visitorYear", "==", year)
    )
    
    const querySnapshot = await getDocs(q)
    const visitors: VisitorData[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      visitors.push({
        uid: data.uid,
        visitorName: data.visitorName,
        visitorPhone: data.visitorPhone,
        planType: data.planType,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        startDate: data.startDate?.toDate?.() || data.startDate,
        endDate: data.endDate?.toDate?.() || data.endDate,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        isVisitor: data.isVisitor,
        visitorMonth: data.visitorMonth,
        visitorYear: data.visitorYear,
        visitorMonthName: data.visitorMonthName,
        visitorQuarter: data.visitorQuarter,
        revenueCategory: data.revenueCategory,
        status: data.status,
      } as VisitorData)
    })
    
    return visitors
  } catch (error) {
    console.error("Error getting visitors by quarter:", error)
    throw error
  }
}

// Get monthly visitor revenue summary
export const getMonthlyVisitorRevenueSummary = async (month: string, year: number) => {
  try {
    const visitors = await getVisitorsByMonth(month, year)
    
    const summary = {
      totalVisitors: visitors.length,
      totalRevenue: visitors.reduce((sum, visitor) => sum + visitor.amount, 0),
      averageRevenue: visitors.length > 0 ? visitors.reduce((sum, visitor) => sum + visitor.amount, 0) / visitors.length : 0,
      month: `${year}-${String(month).padStart(2, '0')}`,
      monthName: new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' }),
      year: year,
      visitors: visitors.map(visitor => ({
        name: visitor.visitorName,
        phone: visitor.visitorPhone,
        amount: visitor.amount,
        date: visitor.createdAt
      }))
    }
    
    return summary
  } catch (error) {
    console.error("Error getting monthly visitor revenue summary:", error)
    throw error
  }
}

// Get yearly visitor revenue summary
export const getYearlyVisitorRevenueSummary = async (year: number) => {
  try {
    const visitors = await getVisitorsByYear(year)
    
    const summary = {
      totalVisitors: visitors.length,
      totalRevenue: visitors.reduce((sum, visitor) => sum + visitor.amount, 0),
      averageRevenue: visitors.length > 0 ? visitors.reduce((sum, visitor) => sum + visitor.amount, 0) / visitors.length : 0,
      year: year,
      visitors: visitors.map(visitor => ({
        name: visitor.visitorName,
        phone: visitor.visitorPhone,
        amount: visitor.amount,
        date: visitor.createdAt,
        month: visitor.visitorMonthName
      }))
    }
    
    return summary
  } catch (error) {
    console.error("Error getting yearly visitor revenue summary:", error)
    throw error
  }
}

// Get available visitor months
export const getAvailableVisitorMonths = async () => {
  try {
    const visitorRef = collection(db, "memberships")
    const q = query(visitorRef, where("isVisitor", "==", true))
    const querySnapshot = await getDocs(q)
    
    const months = new Set<string>()
    
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.visitorMonth) {
        months.add(data.visitorMonth)
      }
    })
    
    return Array.from(months).sort().reverse() // Most recent first
  } catch (error) {
    console.error("Error getting available visitor months:", error)
    throw error
  }
}

// Combined reporting functions
export const getCombinedMonthlyRevenue = async (month: string, year: number) => {
  try {
    // Get membership revenue - extract month from combined month-year string
    const monthOnly = month.split('-')[1] || month
    const membershipRevenue = await getMonthlyRevenueSummary(monthOnly)
    
    // Get visitor revenue
    const visitorRevenue = await getMonthlyVisitorRevenueSummary(month, year)
    
    const combined = {
      month: `${year}-${String(month).padStart(2, '0')}`,
      monthName: new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' }),
      year: year,
      totalRevenue: membershipRevenue.totalRevenue + visitorRevenue.totalRevenue,
      membershipRevenue: membershipRevenue.totalRevenue,
      visitorRevenue: visitorRevenue.totalRevenue,
      totalTransactions: membershipRevenue.totalPayments + visitorRevenue.totalVisitors,
      membershipTransactions: membershipRevenue.totalPayments,
      visitorTransactions: visitorRevenue.totalVisitors,
      breakdown: {
        memberships: membershipRevenue,
        visitors: visitorRevenue
      }
    }
    
    return combined
  } catch (error) {
    console.error("Error getting combined monthly revenue:", error)
    throw error
  }
}

export const getCombinedYearlyRevenue = async (year: number) => {
  try {
    // Get membership revenue
    const membershipRevenue = await getYearlyRevenueSummary(year)
    
    // Get visitor revenue
    const visitorRevenue = await getYearlyVisitorRevenueSummary(year)
    
    const combined = {
      year: year,
      totalRevenue: membershipRevenue.totalRevenue + visitorRevenue.totalRevenue,
      membershipRevenue: membershipRevenue.totalRevenue,
      visitorRevenue: visitorRevenue.totalRevenue,
      totalTransactions: membershipRevenue.totalPayments + visitorRevenue.totalVisitors,
      membershipTransactions: membershipRevenue.totalPayments,
      visitorTransactions: visitorRevenue.totalVisitors,
      breakdown: {
        memberships: membershipRevenue,
        visitors: visitorRevenue
      }
    }
    
    return combined
  } catch (error) {
    console.error("Error getting combined yearly revenue:", error)
    throw error
  }
}
