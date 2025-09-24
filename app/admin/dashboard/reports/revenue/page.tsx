"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import AdminDashboardLayout from '@/components/admin-dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  BarChart3,
  LineChart,
  PieChart,
  CreditCard,
  ChevronDown,
  Plus,
  X,
  Banknote,
  Loader2,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { toast } from 'sonner'
import Link from 'next/link'
import { 
  getAvailablePaymentMonths,
  getAvailableExpenseMonths,
  getMonthlyRevenueSummary,
  getPaymentsByMonth,
  getPaymentsByYear,
  getYearlyRevenueSummary,
  addExpenseRecord,
  getExpensesByMonth,
  getExpensesByYear,
  getMonthlyExpenseSummary,
  getYearlyExpenseSummary,
  getNetRevenueForMonth,
  getNetRevenueForYear,
  updateExpenseRecord,
  deleteExpenseRecord,
  type OptimizedPaymentRecord,
  type ExpenseRecord,
  type MonthlyExpenseSummary
} from '@/lib/firebase'
import { collection, query, getDocs, where, orderBy, doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { getProfileImageUrl } from '@/lib/cloudinary-client'
import { RecentExpensesTable } from '@/components/recent-expenses-table'

interface RevenueData {
  period: string
  revenue: number
  transactions: number
  averageTransaction: number
  expenses: number
  netRevenue: number
}

interface EnhancedPaymentRecord extends OptimizedPaymentRecord {
  profileImageUrl?: string
  registrationFee?: boolean
  customRegistrationFee?: number
  registrationFeeAmount?: number
  registrationFeePaid?: boolean
  discount?: boolean
  discountAmount?: number
}

export default function RevenueReport() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [payments, setPayments] = useState<EnhancedPaymentRecord[]>([])
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [timeRange, setTimeRange] = useState<'daily' | 'monthly' | 'yearly'>('monthly')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [displayedPaymentsCount, setDisplayedPaymentsCount] = useState(15)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Dropdown state
  const [timeRangeDropdownOpen, setTimeRangeDropdownOpen] = useState(false)
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false)

  // Expenses popup state
  const [showAddExpensePopup, setShowAddExpensePopup] = useState(false)
  const [isAddingExpense, setIsAddingExpense] = useState(false)
  const [expenseFormData, setExpenseFormData] = useState({
    title: '',
    amount: '',
    category: 'Utility Bills',
    description: ''
  })

  // Handle dropdown open/close
  const handleTimeRangeDropdownToggle = useCallback(() => {
    setTimeRangeDropdownOpen(!timeRangeDropdownOpen)
  }, [timeRangeDropdownOpen])

  const handlePeriodDropdownToggle = useCallback(() => {
    setPeriodDropdownOpen(!periodDropdownOpen)
  }, [periodDropdownOpen])

  // Handle dropdown close when clicking outside
  const handleTimeRangeDropdownClose = useCallback(() => {
    setTimeRangeDropdownOpen(false)
  }, [])

  const handlePeriodDropdownClose = useCallback(() => {
    setPeriodDropdownOpen(false)
  }, [])

  // Handle expenses popup
  const handleAddExpense = async () => {
    if (!expenseFormData.title.trim() || !expenseFormData.amount.trim() || !user?.uid) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsAddingExpense(true)
    try {
      const expenseData = {
        title: expenseFormData.title.trim(),
        amount: parseFloat(expenseFormData.amount),
        category: expenseFormData.category as ExpenseRecord['category'],
        description: expenseFormData.description.trim(),
        createdBy: user.uid
      }

      await addExpenseRecord(expenseData)
      toast.success(`Expense "${expenseFormData.title}" added successfully`)
      
      // Reset form and close popup
      setExpenseFormData({
        title: '',
        amount: '',
        category: 'Utility Bills',
        description: ''
      })
      setShowAddExpensePopup(false)
      
      // Reload revenue data to include new expenses
      loadRevenueData()
    } catch (error) {
      console.error('Error adding expense:', error)
      toast.error('Failed to add expense')
    } finally {
      setIsAddingExpense(false)
    }
  }

  const handleExpenseUpdate = async (expenseId: string, updatedExpense: Partial<ExpenseRecord>) => {
    try {
      await updateExpenseRecord(expenseId, updatedExpense)
      toast.success('Expense updated successfully')
      loadRevenueData()
    } catch (error) {
      console.error('Error updating expense:', error)
      throw error
    }
  }

  const handleExpenseDelete = async (expenseId: string) => {
    try {
      await deleteExpenseRecord(expenseId)
      toast.success('Expense deleted successfully')
      loadRevenueData()
    } catch (error) {
      console.error('Error deleting expense:', error)
      throw error
    }
  }

  const closeExpensePopup = () => {
    setShowAddExpensePopup(false)
    setExpenseFormData({
      title: '',
      amount: '',
      category: 'Utility Bills',
      description: ''
    })
  }

  // Load more payments function with smooth loading
  const loadMorePayments = () => {
    if (isLoadingMore) return // Prevent multiple rapid clicks
    
    setIsLoadingMore(true)
    
    // Prevent scrollbar flicker by maintaining scroll position
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop
    
    // Add a small delay for smooth animation
    setTimeout(() => {
      setDisplayedPaymentsCount(prev => prev + 15)
      
      // Restore scroll position after state update and reset loading state
      setTimeout(() => {
        window.scrollTo(0, currentScrollPosition)
        setIsLoadingMore(false)
      }, 300) // Match animation duration
    }, 50)
  }

  // Hide/show less payments function
  const showLessPayments = () => {
    if (isLoadingMore) return // Prevent multiple rapid clicks
    
    setIsLoadingMore(true)
    
    // Prevent scrollbar flicker by maintaining scroll position
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop
    
    // Add a small delay for smooth animation
    setTimeout(() => {
      setDisplayedPaymentsCount(15) // Reset to show only first 15
      
      // Restore scroll position after state update and reset loading state
      setTimeout(() => {
        window.scrollTo(0, currentScrollPosition)
        setIsLoadingMore(false)
      }, 300) // Match animation duration
    }, 50)
  }

  // Close dropdowns when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Element
    if (!target.closest('.dropdown-container')) {
      setTimeRangeDropdownOpen(false)
      setPeriodDropdownOpen(false)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [])


  useEffect(() => {
    // Add click outside listener
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      setDisplayedPaymentsCount(15) // Reset to show first 15 when period changes
      loadRevenueData()
    }
  }, [selectedPeriod, timeRange])

  // Note: Revenue data is now calculated directly in loadRevenueData() using Firebase summaries
  // This ensures consistency between filtered data and calculations

  const loadRevenueData = useCallback(async () => {
    try {
      console.log('Loading revenue data for:', selectedPeriod, 'timeRange:', timeRange)
      let data: RevenueData[] = []
      let paymentData: OptimizedPaymentRecord[] = []
      let expenseData: ExpenseRecord[] = []

      if (timeRange === 'monthly') {
        console.log('Loading monthly data...')
        const summary = await getMonthlyRevenueSummary(selectedPeriod)
        console.log('Monthly summary:', summary)
        const monthPayments = await getPaymentsByMonth(selectedPeriod)
        console.log('Monthly payments:', monthPayments.length)
        
        try {
          const expenseSummary = await getMonthlyExpenseSummary(selectedPeriod)
          console.log('Monthly expense summary:', expenseSummary)
          
          data = [{
            period: selectedPeriod,
            revenue: summary.totalRevenue,
            transactions: summary.totalPayments,
            averageTransaction: summary.averagePayment,
            expenses: expenseSummary.totalExpenses,
            netRevenue: summary.totalRevenue - expenseSummary.totalExpenses
          }]
          
          expenseData = await getExpensesByMonth(selectedPeriod)
          console.log('Monthly expenses:', expenseData.length)
        } catch (expenseError) {
          console.error('Error loading expenses, using zero values:', expenseError)
          data = [{
            period: selectedPeriod,
            revenue: summary.totalRevenue,
            transactions: summary.totalPayments,
            averageTransaction: summary.averagePayment,
            expenses: 0,
            netRevenue: summary.totalRevenue
          }]
          expenseData = []
        }
        
        paymentData = monthPayments
      } else if (timeRange === 'yearly') {
        console.log('Loading yearly data...')
        const year = parseInt(selectedPeriod.split('-')[0])
        const summary = await getYearlyRevenueSummary(year)
        console.log('Yearly summary:', summary)
        const yearPayments = await getPaymentsByYear(year)
        console.log('Yearly payments:', yearPayments.length)
        
        try {
          const expenseSummary = await getYearlyExpenseSummary(year)
          console.log('Yearly expense summary:', expenseSummary)
          
          data = [{
            period: year.toString(),
            revenue: summary.totalRevenue,
            transactions: summary.totalPayments,
            averageTransaction: summary.averagePayment,
            expenses: expenseSummary.totalExpenses,
            netRevenue: summary.totalRevenue - expenseSummary.totalExpenses
          }]
          
          expenseData = await getExpensesByYear(year)
          console.log('Yearly expenses:', expenseData.length)
        } catch (expenseError) {
          console.error('Error loading expenses, using zero values:', expenseError)
          data = [{
            period: year.toString(),
            revenue: summary.totalRevenue,
            transactions: summary.totalPayments,
            averageTransaction: summary.averagePayment,
            expenses: 0,
            netRevenue: summary.totalRevenue
          }]
          expenseData = []
        }
        
        paymentData = yearPayments
      }

      // Enhance payment data with user profile information
      const enhancedPayments: EnhancedPaymentRecord[] = []
      
      if (paymentData.length > 0) {
        // Get unique user IDs from payments
        const uniqueUserIds = [...new Set(paymentData.map(p => p.uid))]
        
        // Create a map of user data for fast lookup
        const usersMap = new Map()
        
        // Handle Firestore 'in' operator limit of 30 values by chunking
        const chunkSize = 30
        for (let i = 0; i < uniqueUserIds.length; i += chunkSize) {
          const chunk = uniqueUserIds.slice(i, i + chunkSize)
          const usersQuery = query(collection(db, "users"), where("uid", "in", chunk))
          const usersSnapshot = await getDocs(usersQuery)
          
          usersSnapshot.docs.forEach(doc => {
            const userData = doc.data()
            usersMap.set(userData.uid, userData)
          })
        }
        
        // Enhance each payment with user profile data
        for (const payment of paymentData) {
          const userData = usersMap.get(payment.uid)
          enhancedPayments.push({
            ...payment,
            profileImageUrl: userData?.profileImageUrl,
            registrationFee: (payment as any).registrationFee,
            customRegistrationFee: (payment as any).customRegistrationFee,
            registrationFeeAmount: (payment as any).registrationFeeAmount,
            registrationFeePaid: (payment as any).registrationFeePaid,
            discount: (payment as any).discount,
            discountAmount: (payment as any).discountAmount
          })
        }
        
        // Sort payments by creation date (most recent first)
        enhancedPayments.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return dateB - dateA // Most recent first
        })
      }

      console.log('Setting data - Revenue:', data.length, 'Payments:', enhancedPayments.length, 'Expenses:', expenseData.length)
      setRevenueData(data)
      setPayments(enhancedPayments)
      setExpenses(expenseData)
      console.log('Data set successfully')
    } catch (error) {
      console.error('Error loading revenue data:', error)
      toast.error('Failed to load revenue data')
    }
  }, [selectedPeriod, timeRange])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      console.log('Loading initial data...')
      // Get both payment and expense months to show all available data
      const [paymentMonths, expenseMonths] = await Promise.all([
        getAvailablePaymentMonths(),
        getAvailableExpenseMonths()
      ])
      
      // Combine and deduplicate months
      const allMonths = [...new Set([...paymentMonths, ...expenseMonths])].sort((a, b) => b.localeCompare(a))
      console.log('Available months (combined):', allMonths)
      setAvailableMonths(allMonths)
      
      // Extract unique years from months
      const years = [...new Set(allMonths.map(month => parseInt(month.split('-')[0])))].sort((a, b) => b - a)
      console.log('Available years:', years)
      setAvailableYears(years)
      
      if (allMonths.length > 0) {
        console.log('Setting selected period to:', allMonths[0])
        setSelectedPeriod(allMonths[0])
        setTimeRange('monthly')
      } else {
        console.log('No months available, setting current month')
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        setSelectedPeriod(currentMonth)
        setTimeRange('monthly')
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load revenue data')
    } finally {
      setLoading(false)
    }
  }


  const getRevenueStats = useMemo(() => {
    if (revenueData.length === 0) return { total: 0, transactions: 0, average: 0, expenses: 0, netRevenue: 0 }
    
    const total = revenueData.reduce((sum, d) => sum + d.revenue, 0)
    const transactions = revenueData.reduce((sum, d) => sum + d.transactions, 0)
    const average = transactions > 0 ? total / transactions : 0
    const expenses = revenueData.reduce((sum, d) => sum + d.expenses, 0)
    const netRevenue = revenueData.reduce((sum, d) => sum + d.netRevenue, 0)

    return { total, transactions, average, expenses, netRevenue }
  }, [revenueData])

  const getPaymentMethodStats = useMemo(() => {
    const methodStats: Record<string, { count: number; revenue: number }> = {}
    
    payments.forEach(payment => {
      if (!methodStats[payment.paymentMethod]) {
        methodStats[payment.paymentMethod] = { count: 0, revenue: 0 }
      }
      methodStats[payment.paymentMethod].count++
      methodStats[payment.paymentMethod].revenue += payment.amount
    })

    return methodStats
  }, [payments])

  const getPlanStats = useMemo(() => {
    const planStats: Record<string, { count: number; revenue: number }> = {}
    
    payments.forEach(payment => {
      if (!planStats[payment.planType]) {
        planStats[payment.planType] = { count: 0, revenue: 0 }
      }
      planStats[payment.planType].count++
      planStats[payment.planType].revenue += payment.amount
    })

    return planStats
  }, [payments])

  const getPlanRevenueData = useMemo(() => {
    const planStats = getPlanStats
    const planRevenueData = Object.entries(planStats).map(([plan, data], index) => ({
      name: plan,
      value: data.revenue,
      count: data.count,
      color: [
        '#f97316', // orange-500
        '#3b82f6', // blue-500
        '#10b981', // emerald-500
        '#8b5cf6', // violet-500
        '#ef4444', // red-500
        '#f59e0b', // amber-500
        '#06b6d4', // cyan-500
        '#84cc16'  // lime-500
      ][index % 8]
    }))

    return planRevenueData.sort((a, b) => b.value - a.value)
  }, [getPlanStats])

  const getExpenseStats = useMemo(() => {
    const expenseStats: Record<string, { count: number; amount: number }> = {}
    
    expenses.forEach(expense => {
      if (!expenseStats[expense.category]) {
        expenseStats[expense.category] = { count: 0, amount: 0 }
      }
      expenseStats[expense.category].count++
      expenseStats[expense.category].amount += expense.amount
    })

    return expenseStats
  }, [expenses])

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`
  }

  const getBasePlanFee = (planType: string | undefined) => {
    if (!planType) return 0
    
    switch (planType.toLowerCase()) {
      case 'strength training':
        return 5000
      case 'cardio':
        return 5000
      case 'cardio training':
        return 5000
      case 'strength + cardio':
        return 7500
      case 'monthly':
        return 5000
      case 'quarterly':
        return 15000
      case 'yearly':
        return 60000
      case 'daily':
        return 200
      case 'weekly':
        return 1200
      case 'bi-weekly':
        return 2400
      case 'semi-annual':
        return 30000
      case 'lifetime':
        return 100000
      default:
        return 0
    }
  }

  const getPlanColor = (planType: string) => {
    const colors: Record<string, string> = {
      'Monthly': 'bg-blue-600',
      'Quarterly': 'bg-green-600', 
      'Yearly': 'bg-purple-600',
      'Daily': 'bg-orange-600',
      'Weekly': 'bg-pink-600',
      'Bi-weekly': 'bg-indigo-600',
      'Semi-annual': 'bg-teal-600',
      'Lifetime': 'bg-red-600'
    }
    return colors[planType] || 'bg-gray-600'
  }

  const hasRegistrationFee = (payment: EnhancedPaymentRecord) => {
    // Check if payment has explicit registrationFee field
    if (payment.registrationFee !== undefined) {
      return payment.registrationFee
    }
    
    // If no explicit field, determine based on plan type and amount
    // This is a heuristic - adjust based on your business logic
    const planType = payment.planType?.toLowerCase() || ''
    
    // Check if this looks like a first-time payment (likely includes registration fee)
    // You can adjust these conditions based on your business rules
    if (planType.includes('monthly') || planType.includes('yearly') || planType.includes('quarterly')) {
      // For now, we'll assume all regular membership payments include registration fee
      // You might want to check against a specific amount threshold or other criteria
      return true
    }
    
    return false
  }
  const formatAmountWithRegistrationFee = (payment: EnhancedPaymentRecord) => {
    const baseAmount = payment.amount
    const registrationFee = hasRegistrationFee(payment)
    
    if (registrationFee) {
      return (
        <div>
          <p className="text-white font-semibold">{formatCurrency(baseAmount)}</p>
          <p className="text-orange-400 text-xs">+ Registration Fee</p>
        </div>
      )
    }
    
    return <p className="text-white font-semibold">{formatCurrency(baseAmount)}</p>
  }

  const formatPeriod = (period: string) => {
    if (timeRange === 'yearly') {
      return period
    }
    const [year, month] = period.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  const exportToCSV = () => {
    // Create comprehensive report with both payments and expenses
    // Note: This export uses the currently filtered data based on selected time period
    const reportData = []
    
    // Add summary section
    reportData.push(['REVENUE REPORT SUMMARY'])
    reportData.push(['Period', formatPeriod(selectedPeriod)])
    reportData.push(['Time Range', timeRange === 'monthly' ? 'Monthly' : 'Yearly'])
    reportData.push(['Gross Revenue', formatCurrency(stats.total)])
    reportData.push(['Total Expenses', formatCurrency(stats.expenses)])
    reportData.push(['Net Revenue', formatCurrency(stats.netRevenue)])
    reportData.push(['Total Transactions', stats.transactions])
    reportData.push(['Average Transaction', formatCurrency(stats.average)])
    reportData.push([]) // Empty row
    
    // Add payments section
    reportData.push(['PAYMENTS DATA'])
    reportData.push(['Date', 'Member Name', 'Email', 'Plan Type', 'Plan Fee', 'Registration Fee', 'Discount', 'Total Amount', 'Payment Method'])
    
    payments.forEach(payment => {
      // Calculate plan fee
      const planFee = getBasePlanFee(payment.planType)
      
      // Calculate registration fee amount using the same logic as membership status
      const registrationFeeAmount = payment.planType?.toLowerCase().includes('visitor') ? '-' : 
        ((payment as any).registrationFee && (payment as any).customRegistrationFee) ? (payment as any).customRegistrationFee : '-'
      
      // Calculate discount amount using the same logic as membership status
      const discountAmount = payment.planType?.toLowerCase().includes('visitor') ? '-' :
        ((payment as any).discount && (payment as any).discountAmount && (payment as any).discountAmount > 0) ? (payment as any).discountAmount : '-'
      
      // Use the same date logic as the table display
      const formattedDate = payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'Unknown'
      
      reportData.push([
        formattedDate,
        payment.userName || 'Unknown',
        payment.userEmail || '',
        payment.planType,
        planFee > 0 ? planFee : '-',
        registrationFeeAmount,
        discountAmount,
        payment.amount,
        payment.paymentMethod
      ])
    })
    
    reportData.push([]) // Empty row
    
    // Add expenses section
    reportData.push(['EXPENSES DATA'])
    reportData.push(['Date', 'Title', 'Category', 'Amount', 'Description'])
    
    expenses.forEach(expense => {
      reportData.push([
        expense.createdAt ? new Date(expense.createdAt.toDate()).toLocaleDateString() : 'Unknown',
        expense.title,
        expense.category,
        expense.amount,
        expense.description || ''
      ])
    })
    
    reportData.push([]) // Empty row
    
    // Add expense summary by category
    reportData.push(['EXPENSE SUMMARY BY CATEGORY'])
    reportData.push(['Category', 'Count', 'Total Amount', 'Percentage'])
    
    Object.entries(expenseStats).forEach(([category, data]) => {
      const percentage = stats.expenses > 0 ? ((data.amount / stats.expenses) * 100).toFixed(1) : 0
      reportData.push([
        category,
        data.count,
        data.amount,
        percentage + '%'
      ])
    })

    // Convert to CSV format
    const csvContent = reportData.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue-report-${timeRange}-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success(`Revenue report exported successfully for ${formatPeriod(selectedPeriod)} (${timeRange})`)
  }

  const stats = getRevenueStats
  const paymentMethodStats = getPaymentMethodStats
  const planStats = getPlanStats
  const expenseStats = getExpenseStats
  const planRevenueData = getPlanRevenueData

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminDashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </AdminDashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminDashboardLayout>
        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                  <CreditCard className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Revenue Report
                </h1>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Daily, monthly, and yearly revenue analysis with trends
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
                <Link href="/admin/dashboard/reports" className="w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white flex items-center justify-center gap-2 py-3 px-4 text-sm sm:text-base"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Reports
                  </Button>
                </Link>
                <Button 
                  onClick={() => setShowAddExpensePopup(true)}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 py-3 px-4 text-sm sm:text-base"
                >
                  <Plus className="h-4 w-4" />
                  Add Expenses
                </Button>
                <Button 
                  onClick={exportToCSV}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2 py-3 px-4 text-sm sm:text-base"
                >
                  <Download className="h-4 w-4" />
                  Export Complete Report
                </Button>
              </div>
            </div>

          {/* Time Range Selector */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Time Range & Period Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Time Range</label>
                  <div className="relative dropdown-container">
                  <select 
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as 'daily' | 'monthly' | 'yearly')}
                      onClick={handleTimeRangeDropdownToggle}
                      onBlur={handleTimeRangeDropdownClose}
                      className="w-full p-3 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none cursor-pointer"
                      style={{ zIndex: 1 }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                    <ChevronDown 
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${
                        timeRangeDropdownOpen ? 'rotate-180' : ''
                      }`}
                      style={{ zIndex: 2 }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">
                    {timeRange === 'monthly' ? 'Select Month' : 'Select Year'}
                  </label>
                  <div className="relative dropdown-container">
                  <select 
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                      onClick={handlePeriodDropdownToggle}
                      onBlur={handlePeriodDropdownClose}
                      className="w-full p-3 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none cursor-pointer"
                      style={{ zIndex: 1 }}
                  >
                    {timeRange === 'monthly' ? (
                      availableMonths.map(month => (
                        <option key={month} value={month}>
                          {formatPeriod(month)}
                        </option>
                      ))
                    ) : (
                      availableYears.map(year => (
                        <option key={year} value={year.toString()}>
                          {year}
                        </option>
                      ))
                    )}
                  </select>
                    <ChevronDown 
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${
                        periodDropdownOpen ? 'rotate-180' : ''
                      }`}
                      style={{ zIndex: 2 }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Gross Revenue</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.total)}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.expenses)}</p>
                  </div>
                  <Banknote className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Net Revenue</p>
                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.netRevenue)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Transactions</p>
                    <p className="text-2xl font-bold text-purple-400">{stats.transactions}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plans Revenue Distribution */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Plans Revenue Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {planRevenueData.length > 0 ? (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={planRevenueData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {planRevenueData.map((_, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index === 0 ? '#f97316' : // orange-500 (primary theme)
                                    index === 1 ? '#e5e7eb' : // gray-200 (light gray)
                                    index === 2 ? '#9ca3af' : // gray-400 (medium gray)
                                    index === 3 ? '#6b7280' : // gray-500 (darker gray)
                                    index === 4 ? '#4b5563' : // gray-600 (dark gray)
                                    index === 5 ? '#374151' : // gray-700 (very dark gray)
                                    '#1f2937'} // gray-800 (darkest gray)
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, name: any, props: any) => [
                            `${formatCurrency(value)} (${props.payload.count} memberships)`,
                            'Revenue'
                          ]}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #f97316',
                            borderRadius: '12px',
                            color: '#f97316',
                            fontSize: '14px',
                            fontWeight: '500',
                            padding: '12px 16px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            transition: 'all 0.2s ease-in-out'
                          }}
                          labelStyle={{
                            color: '#374151',
                            fontSize: '13px',
                            fontWeight: '600',
                            marginBottom: '4px'
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ color: '#ffffff', fontSize: '12px' }}
                          formatter={(value: any, entry: any) => (
                            <span style={{ color: entry.color }}>
                              {value} ({formatCurrency(entry.payload.value)})
                            </span>
                          )}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                          </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-3 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full">
                        <PieChart className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No Plan Revenue Data
                    </h3>
                    <p className="text-gray-400">
                      No payment data available for this period
                          </p>
                        </div>
                )}
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(expenseStats)
                    .sort(([,a], [,b]) => b.amount - a.amount)
                    .map(([category, data], index) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${
                            index === 0 ? 'bg-red-500' :
                            index === 1 ? 'bg-orange-500' :
                            index === 2 ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`}></div>
                          <div>
                            <span className="text-white font-medium">{category}</span>
                            <p className="text-gray-400 text-sm">{data.count} expenses</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-white font-bold">{formatCurrency(data.amount)}</span>
                          <p className="text-gray-400 text-sm">
                            {stats.expenses > 0 ? ((data.amount / stats.expenses) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    ))}
                  {Object.keys(expenseStats).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No expenses recorded for this period</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Transactions ({payments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto transition-all duration-300 ease-in-out" style={{ minHeight: '200px' }}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-300 font-medium">Member</th>
                      <th className="text-center p-3 text-gray-300 font-medium">Plan</th>
                      <th className="text-center p-3 text-gray-300 font-medium">Plan Fee</th>
                      <th className="text-center p-3 text-gray-300 font-medium">Registration Fee</th>
                      <th className="text-center p-3 text-gray-300 font-medium">Discount</th>
                      <th className="text-center p-3 text-gray-300 font-medium">Total Amount</th>
                      <th className="text-center p-3 text-gray-300 font-medium">Payment Method</th>
                      <th className="text-center p-3 text-gray-300 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, displayedPaymentsCount).map((payment, index) => (
                      <tr 
                        key={payment.transactionId} 
                        className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-all duration-300 ease-in-out"
                        style={{
                          animation: `fadeInUp 0.3s ease-in-out ${index * 0.05}s both`
                        }}
                      >
                        <td className="p-3">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage 
                                src={payment.profileImageUrl ? getProfileImageUrl(payment.profileImageUrl, 80) : undefined} 
                                alt={`${payment.userName || 'User'}'s profile picture`}
                              />
                              <AvatarFallback className="bg-orange-600 text-white">
                                {payment.userName ? payment.userName.charAt(0).toUpperCase() : 'U'}
                              </AvatarFallback>
                            </Avatar>
                          <div>
                            <p className="text-white font-medium">{payment.userName || 'Unknown'}</p>
                              {payment.userEmail && (
                            <p className="text-gray-400 text-xs">{payment.userEmail}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300 text-center">
                            <span className="text-sm font-medium">
                              {payment.planType}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300 text-center">
                            {(() => {
                              const basePlanFee = getBasePlanFee(payment.planType)
                              return basePlanFee > 0 ? (
                                <span className="text-sm font-medium text-orange-400">
                                  PKR {basePlanFee.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-gray-500 text-sm">-</span>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300 text-center">
                            {payment.planType?.toLowerCase().includes('visitor') ? (
                              <span className="text-gray-500 text-sm">-</span>
                            ) : (payment as any).registrationFee && (payment as any).customRegistrationFee ? (
                              <span className="text-sm font-medium text-blue-400">
                                PKR {(payment as any).customRegistrationFee.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-sm">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300 text-center">
                            {payment.planType?.toLowerCase().includes('visitor') ? (
                              <span className="text-gray-500 text-sm">-</span>
                            ) : (payment as any).discount && (payment as any).discountAmount && (payment as any).discountAmount > 0 ? (
                              <span className="text-sm font-medium text-green-400">
                                PKR {(payment as any).discountAmount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-sm">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300 text-center">
                            <span className="text-sm font-medium text-white">
                              PKR {payment.amount.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300 text-center">
                            <span className="text-sm font-medium">
                            {payment.paymentMethod}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span className="text-sm">
                                {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.length > 15 && (
                  <div className="text-center mt-6">
                    <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                      {payments.length > displayedPaymentsCount && (
                        <Button
                          onClick={loadMorePayments}
                          disabled={isLoadingMore}
                          className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                            isLoadingMore 
                              ? 'bg-orange-400 cursor-not-allowed' 
                              : 'bg-orange-600 hover:bg-orange-700'
                          } text-white flex items-center justify-center gap-2`}
                        >
                          {isLoadingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'Load More Transactions'
                          )}
                        </Button>
                      )}
                      
                      {displayedPaymentsCount > 15 && (
                        <Button
                          onClick={showLessPayments}
                          disabled={isLoadingMore}
                          className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                            isLoadingMore 
                              ? 'bg-gray-500 cursor-not-allowed opacity-50' 
                              : 'bg-orange-600 hover:bg-orange-700'
                          } text-white flex items-center justify-center gap-2`}
                        >
                          Show Less
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {payments.length <= displayedPaymentsCount && payments.length > 0 && displayedPaymentsCount === 15 && (
                  <div className="text-center mt-4">
                    <p className="text-gray-400">Showing all {payments.length} transactions</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <RecentExpensesTable
            expenses={expenses}
            onExpenseUpdate={handleExpenseUpdate}
            onExpenseDelete={handleExpenseDelete}
          />

          {/* Add Expense Popup */}
          {showAddExpensePopup && (
            <div 
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={closeExpensePopup}
            >
              <div 
                className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between sticky top-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Add Expense</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeExpensePopup}
                    className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-2 min-w-[40px] min-h-[40px]"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Expense Information */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <label className="text-gray-300 text-sm font-medium mb-3 block">Expense Information</label>
                    <div className="space-y-4">
                      <div>
                        <label className="text-gray-400 text-sm block mb-2">Expense Title *</label>
                        <Input
                          placeholder="e.g., Electricity Bill, Staff Salary"
                          value={expenseFormData.title}
                          onChange={(e) => setExpenseFormData({...expenseFormData, title: e.target.value})}
                          disabled={isAddingExpense}
                          className={`w-full h-12 px-4 bg-gray-700 border-gray-600 text-white text-base ${
                            isAddingExpense ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm block mb-2">Amount (PKR) *</label>
                        <Input
                          placeholder="Enter amount"
                          value={expenseFormData.amount}
                          onChange={(e) => setExpenseFormData({...expenseFormData, amount: e.target.value})}
                          type="number"
                          disabled={isAddingExpense}
                          className={`w-full h-12 px-4 bg-gray-700 border-gray-600 text-white text-base ${
                            isAddingExpense ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm block mb-2">Category</label>
                        <div className="relative dropdown-container">
                          <select 
                            value={expenseFormData.category}
                            onChange={(e) => setExpenseFormData({...expenseFormData, category: e.target.value})}
                            disabled={isAddingExpense}
                            className={`w-full h-12 px-4 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white text-base appearance-none ${
                              isAddingExpense ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            <option value="Utility Bills">Utility Bills</option>
                            <option value="Staff Fee">Staff Fee</option>
                            <option value="Equipment">Equipment</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Other">Other</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm block mb-2">Description (Optional)</label>
                        <Input
                          placeholder="Additional details about the expense"
                          value={expenseFormData.description}
                          onChange={(e) => setExpenseFormData({...expenseFormData, description: e.target.value})}
                          disabled={isAddingExpense}
                          className={`w-full h-12 px-4 bg-gray-700 border-gray-600 text-white text-base ${
                            isAddingExpense ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expense Summary */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <label className="text-gray-300 text-sm font-medium mb-3 block">Expense Summary</label>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Category</span>
                        <span className="text-white font-semibold">{expenseFormData.category}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Amount</span>
                        <span className="text-red-400 font-bold text-lg">
                          {expenseFormData.amount ? `PKR ${parseInt(expenseFormData.amount).toLocaleString()}` : 'PKR 0'}
                        </span>
                      </div>
                      <div className="border-t border-gray-600 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Date</span>
                          <span className="text-white font-semibold">{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
                    <Button
                      onClick={handleAddExpense}
                      disabled={!expenseFormData.title.trim() || !expenseFormData.amount.trim() || isAddingExpense}
                      className={`flex-1 h-12 text-base font-semibold rounded-lg transition-all duration-200 ${
                        isAddingExpense 
                          ? 'bg-blue-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white flex items-center justify-center gap-2`}
                    >
                      {isAddingExpense ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-5 w-5" />
                          Add Expense
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={closeExpensePopup}
                      disabled={isAddingExpense}
                      className={`flex-1 h-12 text-base rounded-lg transition-all duration-200 ${
                        isAddingExpense 
                          ? 'border-gray-400 text-gray-400 cursor-not-allowed bg-gray-100' 
                          : 'border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 bg-white'
                      }`}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </AdminDashboardLayout>
    </ProtectedRoute>
  )
}
