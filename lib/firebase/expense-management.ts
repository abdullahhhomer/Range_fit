import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from './config'

export interface ExpenseRecord {
  id?: string
  title: string
  amount: number
  category: 'Utility Bills' | 'Staff Fee' | 'Equipment' | 'Maintenance' | 'Marketing' | 'Other'
  description?: string
  month: string // Format: YYYY-MM
  year: number
  createdAt: Timestamp
  createdBy: string // Admin UID who created the expense
}

export interface MonthlyExpenseSummary {
  month: string
  year: number
  totalExpenses: number
  categoryBreakdown: Record<string, number>
  expenseCount: number
}

/**
 * Add a new expense record to the database
 */
export async function addExpenseRecord(expenseData: Omit<ExpenseRecord, 'id' | 'createdAt' | 'month' | 'year'>): Promise<string> {
  try {
    console.log('Attempting to add expense record:', expenseData)
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const year = now.getFullYear()

    const expenseRecord: Omit<ExpenseRecord, 'id'> = {
      ...expenseData,
      month,
      year,
      createdAt: serverTimestamp() as Timestamp
    }

    console.log('Expense record to be saved:', expenseRecord)
    const docRef = await addDoc(collection(db, 'expenses'), expenseRecord)
    console.log('Expense record added successfully with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Error adding expense record:', error)
    console.error('Error details:', error)
    throw new Error('Failed to add expense record')
  }
}

/**
 * Get expenses for a specific month
 */
export async function getExpensesByMonth(month: string): Promise<ExpenseRecord[]> {
  try {
    console.log('Attempting to get expenses for month:', month)
    // Try without orderBy first to avoid index issues
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('month', '==', month)
    )
    
    const snapshot = await getDocs(expensesQuery)
    console.log('Expenses query successful, found:', snapshot.docs.length, 'documents')
    
    // Sort manually after fetching
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ExpenseRecord))
    
    return expenses.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toMillis() - a.createdAt.toMillis()
      }
      return 0
    })
  } catch (error) {
    console.error('Error getting expenses by month:', error)
    console.error('Error details:', error)
    throw new Error('Failed to get expenses by month')
  }
}

/**
 * Get expenses for a specific year
 */
export async function getExpensesByYear(year: number): Promise<ExpenseRecord[]> {
  try {
    console.log('Attempting to get expenses for year:', year)
    // Try without orderBy first to avoid index issues
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('year', '==', year)
    )
    
    const snapshot = await getDocs(expensesQuery)
    console.log('Expenses query successful, found:', snapshot.docs.length, 'documents')
    
    // Sort manually after fetching
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ExpenseRecord))
    
    return expenses.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toMillis() - a.createdAt.toMillis()
      }
      return 0
    })
  } catch (error) {
    console.error('Error getting expenses by year:', error)
    console.error('Error details:', error)
    throw new Error('Failed to get expenses by year')
  }
}

/**
 * Get monthly expense summary
 */
export async function getMonthlyExpenseSummary(month: string): Promise<MonthlyExpenseSummary> {
  try {
    const expenses = await getExpensesByMonth(month)
    
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const categoryBreakdown: Record<string, number> = {}
    const expenseCount = expenses.length

    expenses.forEach(expense => {
      if (!categoryBreakdown[expense.category]) {
        categoryBreakdown[expense.category] = 0
      }
      categoryBreakdown[expense.category] += expense.amount
    })

    const [year, monthNum] = month.split('-')
    return {
      month,
      year: parseInt(year),
      totalExpenses,
      categoryBreakdown,
      expenseCount
    }
  } catch (error) {
    console.error('Error getting monthly expense summary:', error)
    throw new Error('Failed to get monthly expense summary')
  }
}

/**
 * Get yearly expense summary
 */
export async function getYearlyExpenseSummary(year: number): Promise<MonthlyExpenseSummary> {
  try {
    const expenses = await getExpensesByYear(year)
    
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const categoryBreakdown: Record<string, number> = {}
    const expenseCount = expenses.length

    expenses.forEach(expense => {
      if (!categoryBreakdown[expense.category]) {
        categoryBreakdown[expense.category] = 0
      }
      categoryBreakdown[expense.category] += expense.amount
    })

    return {
      month: `${year}-01`, // Use first month as identifier
      year,
      totalExpenses,
      categoryBreakdown,
      expenseCount
    }
  } catch (error) {
    console.error('Error getting yearly expense summary:', error)
    throw new Error('Failed to get yearly expense summary')
  }
}

/**
 * Get available expense months (months that have expenses)
 */
export async function getAvailableExpenseMonths(): Promise<string[]> {
  try {
    console.log('Attempting to get available expense months')
    // Get all expenses without orderBy to avoid index issues
    const expensesQuery = query(collection(db, 'expenses'))
    
    const snapshot = await getDocs(expensesQuery)
    const months = new Set<string>()
    
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.month) {
        months.add(data.month)
      }
    })
    
    const monthArray = Array.from(months).sort((a, b) => b.localeCompare(a))
    console.log('Available expense months:', monthArray)
    return monthArray
  } catch (error) {
    console.error('Error getting available expense months:', error)
    console.error('Error details:', error)
    return []
  }
}

/**
 * Update an expense record
 */
export async function updateExpenseRecord(expenseId: string, updates: Partial<ExpenseRecord>): Promise<void> {
  try {
    const expenseRef = doc(db, 'expenses', expenseId)
    await updateDoc(expenseRef, updates)
  } catch (error) {
    console.error('Error updating expense record:', error)
    throw new Error('Failed to update expense record')
  }
}

/**
 * Delete an expense record
 */
export async function deleteExpenseRecord(expenseId: string): Promise<void> {
  try {
    const expenseRef = doc(db, 'expenses', expenseId)
    await deleteDoc(expenseRef)
  } catch (error) {
    console.error('Error deleting expense record:', error)
    throw new Error('Failed to delete expense record')
  }
}

/**
 * Get net revenue (revenue - expenses) for a month
 */
export async function getNetRevenueForMonth(month: string, grossRevenue: number): Promise<number> {
  try {
    const expenseSummary = await getMonthlyExpenseSummary(month)
    return grossRevenue - expenseSummary.totalExpenses
  } catch (error) {
    console.error('Error calculating net revenue:', error)
    return grossRevenue // Return gross revenue if expense calculation fails
  }
}

/**
 * Get net revenue (revenue - expenses) for a year
 */
export async function getNetRevenueForYear(year: number, grossRevenue: number): Promise<number> {
  try {
    const expenseSummary = await getYearlyExpenseSummary(year)
    return grossRevenue - expenseSummary.totalExpenses
  } catch (error) {
    console.error('Error calculating net revenue:', error)
    return grossRevenue // Return gross revenue if expense calculation fails
  }
}
