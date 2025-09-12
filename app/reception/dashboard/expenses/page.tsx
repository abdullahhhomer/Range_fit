"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import ReceptionDashboardLayout from '@/components/reception-dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft,
  Filter,
  Calendar,
  CreditCard,
  ChevronDown,
  Plus,
  X,
  Banknote,
  Loader2
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { toast } from 'sonner'
import Link from 'next/link'
import { 
  getAvailableExpenseMonths,
  addExpenseRecord,
  getExpensesByMonth,
  getExpensesByYear,
  getMonthlyExpenseSummary,
  getYearlyExpenseSummary,
  updateExpenseRecord,
  deleteExpenseRecord,
  type ExpenseRecord
} from '@/lib/firebase'
import { RecentExpensesTable } from '@/components/recent-expenses-table'


export default function ReceptionExpensesReport() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [timeRange, setTimeRange] = useState<'daily' | 'monthly' | 'yearly'>('monthly')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])

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
      
      // Reload expense data to include new expenses
      loadExpenseData()
    } catch (error) {
      console.error('Error adding expense:', error)
      toast.error('Failed to add expense')
    } finally {
      setIsAddingExpense(false)
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

  const handleExpenseUpdate = async (expenseId: string, updatedExpense: Partial<ExpenseRecord>) => {
    try {
      await updateExpenseRecord(expenseId, updatedExpense)
      // Reload expense data to reflect changes
      loadExpenseData()
    } catch (error) {
      console.error('Error updating expense:', error)
      throw error
    }
  }

  const handleExpenseDelete = async (expenseId: string) => {
    try {
      await deleteExpenseRecord(expenseId)
      // Reload expense data to reflect changes
      loadExpenseData()
    } catch (error) {
      console.error('Error deleting expense:', error)
      throw error
    }
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
      loadExpenseData()
    }
  }, [selectedPeriod, timeRange])

  const loadExpenseData = useCallback(async () => {
    try {
      console.log('Loading expense data for:', selectedPeriod, 'timeRange:', timeRange)
      let expenseData: ExpenseRecord[] = []

      if (timeRange === 'monthly') {
        console.log('Loading monthly expenses...')
        expenseData = await getExpensesByMonth(selectedPeriod)
        console.log('Monthly expenses:', expenseData.length)
      } else if (timeRange === 'yearly') {
        console.log('Loading yearly expenses...')
        const year = parseInt(selectedPeriod.split('-')[0])
        expenseData = await getExpensesByYear(year)
        console.log('Yearly expenses:', expenseData.length)
      }

      console.log('Setting expense data:', expenseData.length)
      setExpenses(expenseData)
      console.log('Expense data set successfully')
    } catch (error) {
      console.error('Error loading expense data:', error)
      toast.error('Failed to load expense data')
    }
  }, [selectedPeriod, timeRange])


  const loadInitialData = async () => {
    setLoading(true)
    try {
      console.log('Loading initial data...')
      const months = await getAvailableExpenseMonths()
      console.log('Available months:', months)
      setAvailableMonths(months)
      
      // Extract unique years from months
      const years = [...new Set(months.map((month: string) => parseInt(month.split('-')[0])))].sort((a: number, b: number) => b - a)
      console.log('Available years:', years)
      setAvailableYears(years)
      
      if (months.length > 0) {
        console.log('Setting selected period to:', months[0])
        setSelectedPeriod(months[0])
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

  const getExpenseChartData = useMemo(() => {
    const expenseStats = getExpenseStats
    const colors = [
      '#f97316', // orange-500 (primary theme)
      '#ef4444', // red-500 (expense theme)
      '#10b981', // emerald-500 (success theme)
      '#3b82f6', // blue-500 (info theme)
      '#8b5cf6', // violet-500 (premium theme)
      '#f59e0b', // amber-500 (warning theme)
      '#06b6d4', // cyan-500 (highlight theme)
      '#84cc16'  // lime-500 (accent theme)
    ]
    
    return Object.entries(expenseStats)
      .sort(([,a], [,b]) => b.amount - a.amount)
      .map(([category, data], index) => ({
        name: category,
        value: data.amount,
        count: data.count,
        color: colors[index % colors.length]
      }))
  }, [getExpenseStats])

  const getTotalExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }, [expenses])

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`
  }

  const formatPeriod = (period: string) => {
    if (timeRange === 'yearly') {
      return period
    }
    const [year, month] = period.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  const expenseStats = getExpenseStats

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["receptionist"]}>
        <ReceptionDashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </ReceptionDashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["receptionist"]}>
      <ReceptionDashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                  <CreditCard className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Expenses Management
                </h1>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Manage and track gym expenses with detailed categorization and reporting
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
                <Link href="/reception/dashboard" className="w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white flex items-center justify-center gap-2 py-3 px-4 text-sm sm:text-base"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
                <Button 
                  onClick={() => setShowAddExpensePopup(true)}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 py-3 px-4 text-sm sm:text-base"
                >
                  <Plus className="h-4 w-4" />
                  Add Expenses
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


          {/* Expenses Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Expenses Chart */}
            <div className="lg:col-span-2">
              <Card className="bg-gray-800/50 border-gray-700 h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Expenses by Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {getExpenseChartData.length > 0 ? (
                    <div className="flex-1 min-h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getExpenseChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => {
                              if (percent < 0.05) return '' // Hide labels for slices < 5%
                              return `${name}\n${(percent * 100).toFixed(0)}%`
                            }}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                            stroke="#1f2937"
                            strokeWidth={2}
                          >
                            {getExpenseChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                stroke="#1f2937"
                                strokeWidth={2}
                                style={{
                                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                                  transition: 'all 0.3s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  const target = e.target as SVGPathElement
                                  // Make the slice darker by reducing brightness
                                  target.style.filter = 'brightness(0.7)'
                                }}
                                onMouseLeave={(e) => {
                                  const target = e.target as SVGPathElement
                                  // Restore original brightness
                                  target.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                                }}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: any, props: any) => [
                              `PKR ${value.toLocaleString()} (${props.payload.count} expenses)`,
                              'Amount'
                            ]}
                            contentStyle={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #f97316',
                              borderRadius: '12px',
                              color: '#1f2937',
                              fontSize: '14px',
                              fontWeight: '500',
                              padding: '12px 16px',
                              boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              backdropFilter: 'blur(10px)'
                            }}
                            labelStyle={{
                              color: '#f97316',
                              fontSize: '13px',
                              fontWeight: '600',
                              marginBottom: '4px'
                            }}
                            cursor={{ fill: 'rgba(249, 115, 22, 0.1)' }}
                          />
                          <Legend 
                            wrapperStyle={{ 
                              color: '#ffffff', 
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                            formatter={(value: any, entry: any) => (
                              <span style={{ 
                                color: '#e5e7eb',
                                fontWeight: '500'
                              }}>
                                {value} <span style={{ color: '#9ca3af' }}>({formatCurrency(entry.payload.value)})</span>
                              </span>
                            )}
                            iconType="circle"
                            iconSize={8}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center py-8">
                        <div className="flex items-center justify-center mb-4">
                          <div className="p-3 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full">
                            <Banknote className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          No Expense Data
                        </h3>
                        <p className="text-gray-400">
                          No expenses recorded for this period
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Total Expenses Summary */}
            <div className="lg:col-span-1">
              <Card className="bg-gray-800/50 border-gray-700 h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Expense Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-6 flex-1 flex flex-col">
                    {/* Total Expenses */}
                    <div className="text-center">
                      <div className="p-4 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-xl border border-red-500/30">
                        <div className="flex items-center justify-center mb-2">
                          <Banknote className="h-8 w-8 text-red-400" />
                        </div>
                        <p className="text-gray-400 text-sm mb-1">Total Expenses</p>
                        <p className="text-3xl font-bold text-red-400">
                          {formatCurrency(getTotalExpenses)}
                        </p>
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="space-y-3 flex-1">
                      <h4 className="text-white font-medium text-sm">Category Breakdown</h4>
                      <div className="space-y-3">
                        {getExpenseChartData.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              ></div>
                              <span className="text-gray-300 text-sm">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-white font-semibold text-sm">
                                {formatCurrency(item.value)}
                              </span>
                              <p className="text-gray-400 text-xs">
                                {getTotalExpenses > 0 ? ((item.value / getTotalExpenses) * 100).toFixed(1) : 0}%
                              </p>
                            </div>
                          </div>
                        ))}
                        {getExpenseChartData.length === 0 && (
                          <p className="text-gray-400 text-sm text-center py-4">
                            No expenses recorded
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>


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
      </ReceptionDashboardLayout>
    </ProtectedRoute>
  )
}
