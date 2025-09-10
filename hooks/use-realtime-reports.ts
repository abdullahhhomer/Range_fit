"use client"

import { useState, useEffect, useCallback } from 'react'
import { collection, query, onSnapshot, orderBy, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { toast } from 'sonner'

interface UseRealtimeDataOptions {
  collection: string
  orderBy?: { field: string; direction: 'asc' | 'desc' }
  where?: { field: string; operator: any; value: any }[]
  limit?: number
}

export function useRealtimeData<T>(options: UseRealtimeDataOptions) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const processDocument = useCallback((doc: any): T => {
    const docData = doc.data()
    
    // Convert Firestore timestamps to JavaScript dates
    Object.keys(docData).forEach(key => {
      if (docData[key] instanceof Timestamp) {
        docData[key] = docData[key].toDate()
      }
    })

    return {
      id: doc.id,
      ...docData
    } as T
  }, [])

  useEffect(() => {
    if (!options.collection) return

    setLoading(true)
    setError(null)

    try {
      let q = query(collection(db, options.collection))

      // Apply where conditions
      if (options.where) {
        options.where.forEach(condition => {
          q = query(q, where(condition.field, condition.operator, condition.value))
        })
      }

      // Apply orderBy
      if (options.orderBy) {
        q = query(q, orderBy(options.orderBy.field, options.orderBy.direction))
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const newData = snapshot.docs.map(processDocument)
          setData(newData)
          setLastUpdate(new Date())
          setLoading(false)
        },
        (error) => {
          console.error('Error in real-time listener:', error)
          setError(error.message)
          setLoading(false)
          toast.error('Failed to connect to real-time data')
        }
      )

      return () => unsubscribe()
    } catch (error) {
      console.error('Error setting up real-time listener:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      setLoading(false)
    }
  }, [options.collection, options.orderBy, options.where, processDocument])

  const refresh = useCallback(() => {
    setLoading(true)
    setLastUpdate(new Date())
  }, [])

  return {
    data,
    loading,
    error,
    lastUpdate,
    refresh
  }
}

// Specific hooks for different data types
export function useRealtimeMemberships() {
  return useRealtimeData({
    collection: 'memberships',
    orderBy: { field: 'createdAt', direction: 'desc' }
  })
}

export function useRealtimePayments() {
  return useRealtimeData({
    collection: 'payments',
    orderBy: { field: 'createdAt', direction: 'desc' }
  })
}

export function useRealtimeUsers() {
  return useRealtimeData({
    collection: 'users',
    orderBy: { field: 'createdAt', direction: 'desc' }
  })
}

export function useRealtimePendingPayments() {
  return useRealtimeData({
    collection: 'payments',
    where: [
      { field: 'status', operator: 'in', value: ['pending', 'failed', 'cancelled'] }
    ],
    orderBy: { field: 'createdAt', direction: 'desc' }
  })
}

export function useRealtimeActiveMemberships() {
  return useRealtimeData({
    collection: 'memberships',
    where: [
      { field: 'status', operator: '==', value: 'active' }
    ],
    orderBy: { field: 'endDate', direction: 'asc' }
  })
}

export function useRealtimeExpiringMemberships(days: number = 7) {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)

  return useRealtimeData({
    collection: 'memberships',
    where: [
      { field: 'status', operator: '==', value: 'active' },
      { field: 'endDate', operator: '<=', value: futureDate }
    ],
    orderBy: { field: 'endDate', direction: 'asc' }
  })
}

// Utility hook for calculating stats
export function useRealtimeStats() {
  const { data: memberships, loading: membershipsLoading } = useRealtimeMemberships()
  const { data: payments, loading: paymentsLoading } = useRealtimePayments()
  const { data: users, loading: usersLoading } = useRealtimeUsers()

  const stats = {
    totalUsers: users.length,
    activeMemberships: memberships.filter((m: any) => m.status === 'active').length,
    expiredMemberships: memberships.filter((m: any) => m.status === 'expired').length,
    totalRevenue: payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
    pendingPayments: payments.filter((p: any) => p.status === 'pending').length,
    newSignups: users.filter((u: any) => {
      const createdAt = u.createdAt ? new Date(u.createdAt) : new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return createdAt > thirtyDaysAgo
    }).length
  }

  return {
    stats,
    loading: membershipsLoading || paymentsLoading || usersLoading
  }
}

// Hook for date range filtering
export function useDateRangeFilter<T>(
  data: T[],
  dateField: string = 'createdAt'
) {
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })

  const filteredData = data.filter((item: any) => {
    if (!dateRange.start && !dateRange.end) return true

    const itemDate = new Date(item[dateField])
    
    if (dateRange.start) {
      const startDate = new Date(dateRange.start)
      if (itemDate < startDate) return false
    }

    if (dateRange.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999) // End of day
      if (itemDate > endDate) return false
    }

    return true
  })

  return {
    filteredData,
    dateRange,
    setDateRange
  }
}

// Hook for export functionality
export function useExportData() {
  const exportToCSV = useCallback((data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header.toLowerCase().replace(/\s+/g, '')] || row[header] || ''
          return typeof value === 'string' ? `"${value}"` : value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('CSV exported successfully')
  }, [])

  const exportToPDF = useCallback((data: any[], filename: string, title: string) => {
    // This would integrate with a PDF generation library like jsPDF
    toast.info('PDF export functionality would be implemented here')
  }, [])

  return {
    exportToCSV,
    exportToPDF
  }
}

