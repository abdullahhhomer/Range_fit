"use client"

import React, { useState, useEffect } from 'react'
import { getMonthlyRevenueSummary, getMonthlyExpenseSummary } from '@/lib/firebase'
import { CreditCard } from 'lucide-react'

interface SimpleNetRevenueCardProps {
  className?: string
  month?: string // Optional month, defaults to current month
}

export function SimpleNetRevenueCard({ 
  className = "",
  month
}: SimpleNetRevenueCardProps) {
  const [data, setData] = useState({
    grossRevenue: 0,
    expenses: 0,
    netRevenue: 0,
    isLoading: true,
    error: null as string | null
  })

  const loadNetRevenueData = async () => {
    try {
      // Get current month if not provided
      const targetMonth = month || (() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      })()
      
      console.log('🔄 Loading net revenue for month:', targetMonth)
      
      // Use the exact same logic as the revenue page
      const [revenueSummary, expenseSummary] = await Promise.all([
        getMonthlyRevenueSummary(targetMonth),
        getMonthlyExpenseSummary(targetMonth).catch(error => {
          console.warn('No expenses found for month, using zero:', error)
          return {
            month: targetMonth,
            year: parseInt(targetMonth.split('-')[0]),
            totalExpenses: 0,
            categoryBreakdown: {},
            expenseCount: 0
          }
        })
      ])
      
      const grossRevenue = revenueSummary.totalRevenue
      const expenses = expenseSummary.totalExpenses
      const netRevenue = grossRevenue - expenses
      
      console.log('📊 Simple Net Revenue Data:', {
        month: targetMonth,
        grossRevenue,
        expenses,
        netRevenue,
        paymentCount: revenueSummary.totalPayments,
        expenseCount: expenseSummary.expenseCount
      })
      
      setData({
        grossRevenue,
        expenses,
        netRevenue,
        isLoading: false,
        error: null
      })
      
    } catch (error: any) {
      console.error('❌ Error loading simple net revenue data:', error)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load revenue data'
      }))
    }
  }

  useEffect(() => {
    loadNetRevenueData()
    
    // Update every 2 minutes
    const interval = setInterval(loadNetRevenueData, 120000)
    return () => clearInterval(interval)
  }, [month])

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`
  }

  if (data.isLoading) {
    return (
      <div className={`bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-300 text-sm font-medium">Monthly Net Revenue</p>
            <p className="text-3xl font-bold text-white">Loading...</p>
            <p className="text-purple-400 text-xs mt-1">This month (after expenses)</p>
          </div>
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <CreditCard className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className={`bg-gradient-to-br from-red-600/20 to-red-800/20 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-300 text-sm font-medium">Error</p>
            <p className="text-lg font-bold text-white">Failed to load</p>
            <p className="text-red-400 text-xs mt-1">{data.error}</p>
          </div>
          <div className="p-3 bg-red-500/20 rounded-xl">
            <CreditCard className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-purple-300 text-sm font-medium">Monthly Net Revenue</p>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(data.netRevenue)}
          </p>
          <p className="text-purple-400 text-xs mt-1">This month (after expenses)</p>
        </div>
        <div className="p-3 bg-purple-500/20 rounded-xl">
          <CreditCard className="h-8 w-8 text-purple-400" />
        </div>
      </div>
    </div>
  )
}

// Hook for easy access to net revenue data using the same logic
export const useSimpleNetRevenue = (month?: string) => {
  const [data, setData] = useState({
    grossRevenue: 0,
    expenses: 0,
    netRevenue: 0,
    isLoading: true,
    error: null as string | null
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const targetMonth = month || (() => {
          const now = new Date()
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        })()
        
        const [revenueSummary, expenseSummary] = await Promise.all([
          getMonthlyRevenueSummary(targetMonth),
          getMonthlyExpenseSummary(targetMonth).catch(error => {
            console.warn('No expenses found for month, using zero:', error)
            return {
              month: targetMonth,
              year: parseInt(targetMonth.split('-')[0]),
              totalExpenses: 0,
              categoryBreakdown: {},
              expenseCount: 0
            }
          })
        ])
        
        const grossRevenue = revenueSummary.totalRevenue
        const expenses = expenseSummary.totalExpenses
        const netRevenue = grossRevenue - expenses
        
        setData({
          grossRevenue,
          expenses,
          netRevenue,
          isLoading: false,
          error: null
        })
        
      } catch (error: any) {
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to load revenue data'
        }))
      }
    }

    loadData()
    const interval = setInterval(loadData, 120000)
    return () => clearInterval(interval)
  }, [month])

  return data
}



