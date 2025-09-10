"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { collection, query, getDocs, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { getActivePaymentRecords, getArchivedPaymentRecords } from '@/lib/firebase'
import { toast } from 'sonner'

interface RevenueStats {
  currentMonthRevenue: number
  previousMonthRevenue: number
  totalRevenue: number
  currentMonthExpenses: number
  currentMonthNetRevenue: number
  trendPercentage: number
  trendDirection: 'up' | 'down' | 'neutral'
  isLoading: boolean
  lastUpdated: Date | null
}

interface RealTimeRevenueStatsProps {
  children: (stats: RevenueStats) => React.ReactNode
  updateInterval?: number // in milliseconds, default 2 minutes
}

export function RealTimeRevenueStats({ 
  children, 
  updateInterval = 120000 // 2 minutes default
}: RealTimeRevenueStatsProps) {
  const [stats, setStats] = useState<RevenueStats>({
    currentMonthRevenue: 0,
    previousMonthRevenue: 0,
    totalRevenue: 0,
    currentMonthExpenses: 0,
    currentMonthNetRevenue: 0,
    trendPercentage: 0,
    trendDirection: 'neutral',
    isLoading: true,
    lastUpdated: null
  })

  const loadRevenueStats = async () => {
    try {
      console.log('🔄 Loading real-time revenue stats...')
      
      // Load all data in parallel with optimized queries
      const [activePayments, archivedPayments, allUsers, expensesSnapshot] = await Promise.all([
        getActivePaymentRecords(),
        getArchivedPaymentRecords(),
        getDocs(query(collection(db, "users"), where("role", "==", "customer"))),
        getDocs(query(collection(db, "expenses")))
      ])
      
      // Create a map of customer UIDs for fast lookup
      const customerUids = new Set(allUsers.docs.map(doc => doc.id))
      
      // Filter payments efficiently using the UID set
      const customerPayments = activePayments.filter(payment => customerUids.has(payment.uid))
      const customerArchivedPayments = archivedPayments.filter(payment => customerUids.has(payment.uid))
      
      // Get current month date range
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      
      // Get previous month date range
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      
      // Helper function to check if date is in current month
      const isInCurrentMonth = (date: Date) => {
        return date >= currentMonthStart && date <= currentMonthEnd
      }
      
      // Helper function to check if date is in previous month
      const isInPreviousMonth = (date: Date) => {
        return date >= previousMonthStart && date <= previousMonthEnd
      }
      
      // Calculate all-time stats
      const totalRevenue = customerPayments.reduce((sum, payment) => sum + payment.amount, 0)
      
      // Calculate current month stats
      const currentMonthPayments = customerPayments.filter(p => {
        const createdAt = p.createdAt ? new Date(p.createdAt) : new Date()
        return isInCurrentMonth(createdAt)
      })
      
      const currentMonthRevenue = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0)
      
      // Calculate previous month stats for trend comparison
      const previousMonthPayments = customerPayments.filter(p => {
        const createdAt = p.createdAt ? new Date(p.createdAt) : new Date()
        return isInPreviousMonth(createdAt)
      })
      
      const previousMonthRevenue = previousMonthPayments.reduce((sum, payment) => sum + payment.amount, 0)
      
      // Calculate current month expenses
      const currentMonthExpenses = expensesSnapshot.docs
        .filter(doc => {
          const expenseData = doc.data()
          const createdAt = expenseData.createdAt?.toDate?.() || new Date(expenseData.createdAt)
          return isInCurrentMonth(createdAt)
        })
        .reduce((sum, doc) => sum + (doc.data().amount || 0), 0)
      
      // Calculate net revenue (revenue - expenses)
      const currentMonthNetRevenue = currentMonthRevenue - currentMonthExpenses
      
      // Calculate trend
      let trendPercentage = 0
      let trendDirection: 'up' | 'down' | 'neutral' = 'neutral'
      
      if (previousMonthRevenue > 0) {
        trendPercentage = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        trendDirection = trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'neutral'
      } else if (currentMonthRevenue > 0) {
        trendPercentage = 100
        trendDirection = 'up'
      }
      
      console.log('📊 Revenue Stats Calculated:', {
        currentMonthRevenue,
        previousMonthRevenue,
        totalRevenue,
        currentMonthExpenses,
        currentMonthNetRevenue,
        trendPercentage: trendPercentage.toFixed(1),
        trendDirection
      })
      
      setStats({
        currentMonthRevenue,
        previousMonthRevenue,
        totalRevenue,
        currentMonthExpenses,
        currentMonthNetRevenue,
        trendPercentage,
        trendDirection,
        isLoading: false,
        lastUpdated: new Date()
      })
      
    } catch (error: any) {
      console.error('❌ Error loading revenue stats:', error)
      
      // Handle specific Firebase errors gracefully
      if (error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('Could not reach Cloud Firestore')) {
        toast.error('Unable to connect to Firebase. Please check your internet connection.')
      } else {
        toast.error('Failed to load revenue statistics. Please try again.')
      }
      
      setStats(prev => ({
        ...prev,
        isLoading: false
      }))
    }
  }

  useEffect(() => {
    // Load initial data
    loadRevenueStats()
    
    // Set up real-time updates
    const interval = setInterval(() => {
      loadRevenueStats()
    }, updateInterval)
    
    return () => clearInterval(interval)
  }, [updateInterval])

  // Memoize the stats to prevent unnecessary re-renders
  const memoizedStats = useMemo(() => stats, [
    stats.currentMonthRevenue,
    stats.previousMonthRevenue,
    stats.totalRevenue,
    stats.currentMonthExpenses,
    stats.currentMonthNetRevenue,
    stats.trendPercentage,
    stats.trendDirection,
    stats.isLoading,
    stats.lastUpdated
  ])

  return <>{children(memoizedStats)}</>
}

// Utility function to format currency
export const formatCurrency = (amount: number) => {
  return `PKR ${amount.toLocaleString()}`
}

// Utility function to format trend
export const formatTrend = (percentage: number, direction: 'up' | 'down' | 'neutral') => {
  if (direction === 'neutral') return '0%'
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`
}

// Hook for easy access to revenue stats
export const useRevenueStats = () => {
  const [stats, setStats] = useState<RevenueStats>({
    currentMonthRevenue: 0,
    previousMonthRevenue: 0,
    totalRevenue: 0,
    currentMonthExpenses: 0,
    currentMonthNetRevenue: 0,
    trendPercentage: 0,
    trendDirection: 'neutral',
    isLoading: true,
    lastUpdated: null
  })

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [activePayments, archivedPayments, allUsers, expensesSnapshot] = await Promise.all([
          getActivePaymentRecords(),
          getArchivedPaymentRecords(),
          getDocs(query(collection(db, "users"), where("role", "==", "customer"))),
          getDocs(query(collection(db, "expenses")))
        ])
        
        const customerUids = new Set(allUsers.docs.map(doc => doc.id))
        const customerPayments = activePayments.filter(payment => customerUids.has(payment.uid))
        
        const now = new Date()
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        
        const isInCurrentMonth = (date: Date) => date >= currentMonthStart && date <= currentMonthEnd
        const isInPreviousMonth = (date: Date) => date >= previousMonthStart && date <= previousMonthEnd
        
        const totalRevenue = customerPayments.reduce((sum, payment) => sum + payment.amount, 0)
        
        const currentMonthPayments = customerPayments.filter(p => {
          const createdAt = p.createdAt ? new Date(p.createdAt) : new Date()
          return isInCurrentMonth(createdAt)
        })
        
        const currentMonthRevenue = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0)
        
        const previousMonthPayments = customerPayments.filter(p => {
          const createdAt = p.createdAt ? new Date(p.createdAt) : new Date()
          return isInPreviousMonth(createdAt)
        })
        
        const previousMonthRevenue = previousMonthPayments.reduce((sum, payment) => sum + payment.amount, 0)
        
        // Calculate current month expenses
        const currentMonthExpenses = expensesSnapshot.docs
          .filter(doc => {
            const expenseData = doc.data()
            const createdAt = expenseData.createdAt?.toDate?.() || new Date(expenseData.createdAt)
            return isInCurrentMonth(createdAt)
          })
          .reduce((sum, doc) => sum + (doc.data().amount || 0), 0)
        
        // Calculate net revenue (revenue - expenses)
        const currentMonthNetRevenue = currentMonthRevenue - currentMonthExpenses
        
        let trendPercentage = 0
        let trendDirection: 'up' | 'down' | 'neutral' = 'neutral'
        
        if (previousMonthRevenue > 0) {
          trendPercentage = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
          trendDirection = trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'neutral'
        } else if (currentMonthRevenue > 0) {
          trendPercentage = 100
          trendDirection = 'up'
        }
        
        setStats({
          currentMonthRevenue,
          previousMonthRevenue,
          totalRevenue,
          currentMonthExpenses,
          currentMonthNetRevenue,
          trendPercentage,
          trendDirection,
          isLoading: false,
          lastUpdated: new Date()
        })
        
      } catch (error) {
        console.error('Error loading revenue stats:', error)
        setStats(prev => ({ ...prev, isLoading: false }))
      }
    }

    loadStats()
    const interval = setInterval(loadStats, 120000) // 2 minutes
    return () => clearInterval(interval)
  }, [])

  return stats
}
