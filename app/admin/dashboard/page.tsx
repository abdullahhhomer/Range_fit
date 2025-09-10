"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import AdminDashboardLayout from '@/components/admin-dashboard-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Activity, 
  TrendingUp, 
  CreditCard,
  AlertCircle,
  Wifi,
  WifiOff,
  CheckCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { onDashboardStatsChange } from '@/lib/firebase'
import { SimpleNetRevenueCard } from '@/components/simple-net-revenue-card'

interface DashboardStats {
  totalUsers: number
  activeMemberships: number
  totalRevenue: number
  attendanceRate: number
  newUsersThisMonth: number
  pendingApprovals: number
}



export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeMemberships: 0,
    totalRevenue: 0,
    attendanceRate: 0,
    newUsersThisMonth: 0,
    pendingApprovals: 0
  })
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [unsubscribeFunctions, setUnsubscribeFunctions] = useState<(() => void)[]>([])



  const setupRealTimeListeners = React.useCallback(() => {
    console.log('🔄 Setting up real-time listeners...')
    setLoading(true)
    
    try {
      // Real-time stats listener
      const unsubscribeStats = onDashboardStatsChange((realTimeStats) => {
        console.log('🔄 Real-time stats updated:', realTimeStats)
        setStats(realTimeStats)
        setLastUpdate(new Date())
        setLoading(false)
      })

      // Store unsubscribe functions
      const functions = [unsubscribeStats]
      setUnsubscribeFunctions(functions)
      
      return functions
    } catch (error) {
      console.error('Error setting up real-time listeners:', error)
      toast.error('Failed to connect to real-time data')
      setLoading(false)
      return []
    }
  }, [])

  useEffect(() => {
    try {
      const listeners = setupRealTimeListeners()
      
      // Network status listener
      const handleOnline = () => {
        setIsOnline(true)
        toast.success('Connection restored! 🟢')
        // Re-setup listeners when connection is restored
        listeners.forEach(unsubscribe => unsubscribe())
        setupRealTimeListeners()
      }
      
      const handleOffline = () => {
        setIsOnline(false)
        toast.error('Connection lost! 🔴')
      }

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      // Cleanup function
      return () => {
        listeners.forEach(unsubscribe => unsubscribe())
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    } catch (error) {
      console.error('Error setting up real-time listeners:', error)
      toast.error('Failed to connect to real-time data')
      setLoading(false)
    }
  }, [setupRealTimeListeners]) // Include setupRealTimeListeners in dependencies



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }





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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Dashboard Overview
                </h1>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Welcome back, {user?.name}. Here's what's happening at RangeFit today.
              </p>
              <div className="flex items-center justify-center space-x-2">
                <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
                  isOnline 
                    ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                    : 'bg-red-600/20 text-red-400 border border-red-600/30'
                }`}>
                  {isOnline ? (
                    <Wifi className="h-3 w-3" />
                  ) : (
                    <WifiOff className="h-3 w-3" />
                  )}
                  <span>{isOnline ? 'Live' : 'Offline'}</span>
                </div>
                {loading && (
                  <div className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm bg-blue-600/20 text-blue-400 border border-blue-600/30">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Users Card */}
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Total Users</p>
                    <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                    <p className="text-blue-400 text-xs mt-1">
                      <span className="text-green-500">+{stats.newUsersThisMonth}</span> this month
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Users className="h-8 w-8 text-blue-400" />
                    {isOnline && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Memberships Card */}
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm font-medium">Active Memberships</p>
                    <p className="text-3xl font-bold text-white">{stats.activeMemberships}</p>
                    <p className="text-green-400 text-xs mt-1">
                      <span className="text-green-500">91%</span> of total users
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <CreditCard className="h-8 w-8 text-green-400" />
                  </div>
                </div>
              </div>

              {/* Net Revenue Card */}
              <SimpleNetRevenueCard />

              {/* Attendance Rate Card */}
              <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-300 text-sm font-medium">Attendance Rate</p>
                    <p className="text-3xl font-bold text-white">{stats.attendanceRate}%</p>
                    <p className="text-orange-400 text-xs mt-1">
                      <span className="text-green-500">+5%</span> from last week
                    </p>
                  </div>
                  <div className="p-3 bg-orange-500/20 rounded-xl">
                    <Activity className="h-8 w-8 text-orange-400" />
                  </div>
                </div>
              </div>

              {/* New Users Card */}
              <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-800/20 backdrop-blur-sm border border-indigo-500/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-300 text-sm font-medium">New Users</p>
                    <p className="text-3xl font-bold text-white">{stats.newUsersThisMonth}</p>
                    <p className="text-indigo-400 text-xs mt-1">
                      <span className="text-green-500">+{Math.round(stats.newUsersThisMonth * 0.3)}</span> this week
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-500/20 rounded-xl">
                    <TrendingUp className="h-8 w-8 text-indigo-400" />
                  </div>
                </div>
              </div>

              {/* Pending Approvals Card */}
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-300 text-sm font-medium">Pending Approvals</p>
                    <p className="text-3xl font-bold text-white">{stats.pendingApprovals}</p>
                    <p className="text-yellow-400 text-xs mt-1">
                      <span className="text-yellow-500">Requires attention</span>
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-500/20 rounded-xl">
                    <AlertCircle className="h-8 w-8 text-yellow-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminDashboardLayout>
    </ProtectedRoute>
  )
}
