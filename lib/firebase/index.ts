// Main Firebase exports - modular architecture
export { auth, db } from './config'

// User management
export {
  createUserDocument,
  getUserDocument,
  updateUserDocument
} from './user-management'

// Authentication
export {
  generateUniqueMemberId,
  updateUserEmailAndPassword,
  updateUserPasswordWithReauth,
  checkCustomAuthSession,
  clearCustomAuthSession,
  optimizedLogin,
  adminLogin
} from './authentication'

// Real-time listeners
export {
  onUserDataChange,
  onUserMembershipChange,
  onAllMembershipsChange,
  onPendingMembershipsChange,
  onDashboardStatsChange,
  onReceptionDashboardStatsChange,
  testRealTimeData
} from './realtime-listeners'

// Membership management
export {
  updateMembershipStatus,
  createMembership,
  createMembershipRequest
} from './membership-management'

// Payment management
export {
  addPaymentRecord,
  addPaymentRecordWithRetention
} from './payment-management'

// Receipt management
export {
  createReceipt,
  onUserReceiptsChange,
  getUserReceipts,
  getReceiptById,
  getUserReceiptStats,
  type ReceiptData
} from './receipt-management'

// Visitor management
export {
  addVisitorWithMonthTracking,
  type VisitorData
} from './visitor-management'

// Data optimization
export {
  updateExistingMembership,
  updateExistingPaymentRecord,
  updateExistingReceiptRecord,
  manualArchivePaymentRecords,
  manualCleanupArchivedRecords,
  getActivePaymentRecords,
  getArchivedPaymentRecords,
  checkArchivalStatus,
  addPaymentRecordWithManualRetention,
  type OptimizedMembershipPlan,
  type OptimizedPaymentRecord
} from './data-optimization'

// Reporting
export {
  getPaymentsByMonth,
  getPaymentsByYear,
  getPaymentsByQuarter,
  getMonthlyRevenueSummary,
  getYearlyRevenueSummary,
  getAvailablePaymentMonths,
  getVisitorsByMonth,
  getVisitorsByYear,
  getVisitorsByQuarter,
  getMonthlyVisitorRevenueSummary,
  getYearlyVisitorRevenueSummary,
  getAvailableVisitorMonths,
  getCombinedMonthlyRevenue,
  getCombinedYearlyRevenue
} from './reporting'

// Visitor status management
export {
  updateVisitorStatus,
  updateAllVisitorStatuses
} from './visitor-status'

// Expense management
export {
  addExpenseRecord,
  getExpensesByMonth,
  getExpensesByYear,
  getMonthlyExpenseSummary,
  getYearlyExpenseSummary,
  getAvailableExpenseMonths,
  updateExpenseRecord,
  deleteExpenseRecord,
  getNetRevenueForMonth,
  getNetRevenueForYear,
  type ExpenseRecord,
  type MonthlyExpenseSummary
} from './expense-management'

// Attendance management
export {
  getAllAttendanceRecords,
  getAttendanceByDateRange,
  onAttendanceRecordsChange,
  getTotalUsersCount,
  addManualAttendanceRecord,
  type AttendanceRecord
} from './attendance-management'

// Utilities
export {
  fixAdminCreatedUsers,
  findDuplicateUsers,
  cleanupDuplicateUsers,
  debugUserAuth,
  fixUserUID,
  testUserAccess
} from './utilities'

// Legacy type exports for backward compatibility
export interface MembershipPlan {
  id: string
  name: string
  price: number
  period: string
  description: string
  features?: string[]
  isPopular?: boolean
  isRecommended?: boolean
  renewalCount?: number
  lastRenewalDate?: Date
  nextRenewalReminder?: Date
}
