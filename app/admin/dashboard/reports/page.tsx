"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import AdminDashboardLayout from '@/components/admin-dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  UserCheck, 
  UserX, 
  ArrowRight,
  Download,
  Filter,
  RefreshCw,
  Calendar,
  TrendingUp,
  PieChart,
  BarChart3,
  Clock,
  CreditCard
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { collection, query, getDocs, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { SimpleNetRevenueCard, useSimpleNetRevenue } from '@/components/simple-net-revenue-card'
import { getActivePaymentRecords, getArchivedPaymentRecords } from '@/lib/firebase/data-optimization'

interface ReportCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  href: string
  stats?: {
    value: string | number
    label: string
    trend: string
  }
}

interface Stats {
  totalUsers: number
  activeMemberships: number
  expiredMemberships: number
  expiringSoon: number
  pendingPayments: number
  newSignups: number
  currentMonthSignups: number
  currentMonthActiveMemberships: number
  currentMonthExpiredMemberships: number
}

export default function ReportsDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const netRevenueData = useSimpleNetRevenue()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeMemberships: 0,
    expiredMemberships: 0,
    expiringSoon: 0,
    pendingPayments: 0,
    newSignups: 0,
    currentMonthSignups: 0,
    currentMonthActiveMemberships: 0,
    currentMonthExpiredMemberships: 0
  })

  useEffect(() => {
    loadStats()
    
    // Set up real-time updates every 2 minutes (reduced frequency for better performance)
    const interval = setInterval(() => {
      loadStats()
    }, 120000) // Update every 2 minutes instead of 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    setLoading(true)
    
    try {
      // Load all data in parallel with optimized queries
      const [activePayments, archivedPayments, allUsers] = await Promise.all([
        getActivePaymentRecords(),
        getArchivedPaymentRecords(),
        // Get all users at once instead of individual queries
        getDocs(query(collection(db, "users"), where("role", "==", "customer")))
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
      
      // Helper function to check if date is in current month
      const isInCurrentMonth = (date: Date) => {
        return date >= currentMonthStart && date <= currentMonthEnd
      }
      
      const pendingPayments = customerPayments.filter(p => p.status === 'pending').length
      
      // FIXED: New signups should only count NEW user accounts created this month
      const currentMonthSignups = allUsers.docs.filter(userDoc => {
        const userData = userDoc.data()
        const createdAt = userData.createdAt?.toDate?.() || new Date(userData.createdAt)
        return isInCurrentMonth(createdAt)
      }).length
      
      // FIXED: Active memberships should count actual active memberships, not just payments
      // Get current active memberships from memberships collection
      const membershipsQuery = query(collection(db, "memberships"), where("status", "==", "active"))
      const membershipsSnapshot = await getDocs(membershipsQuery)
      
      // Filter out visitors and count only customer memberships
      const activeMemberships = membershipsSnapshot.docs.filter(doc => {
        const data = doc.data()
        return !data.isVisitor && customerUids.has(data.uid)
      }).length
      
      // Calculate current month expired memberships (from archived payments)
      const currentMonthArchivedPayments = customerArchivedPayments.filter(p => {
        const createdAt = p.createdAt ? new Date(p.createdAt) : new Date()
        return isInCurrentMonth(createdAt)
      })
      const currentMonthExpiredMemberships = currentMonthArchivedPayments.length
      
      setStats({
        totalUsers: customerPayments.length + customerArchivedPayments.length,
        activeMemberships: activeMemberships, // Use corrected active memberships count
        expiredMemberships: customerArchivedPayments.length,
        expiringSoon: 0, // This would need to be calculated from memberships
        pendingPayments,
        newSignups: customerPayments.filter(p => {
          const createdAt = p.createdAt ? new Date(p.createdAt) : new Date()
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          return createdAt > thirtyDaysAgo
        }).length,
        // Current month data - CORRECTED VALUES
        currentMonthSignups, // Now correctly counts new user accounts
        currentMonthActiveMemberships: activeMemberships, // Now correctly counts active memberships
        currentMonthExpiredMemberships
      })
      
    } catch (error: any) {
      console.error('Error loading stats:', error)
      
      // Handle specific Firebase errors gracefully
      if (error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('Could not reach Cloud Firestore')) {
        toast.error('Unable to connect to Firebase. Please check your internet connection.')
      } else {
        toast.error('Failed to load statistics. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const membershipReports: ReportCard[] = useMemo(() => [
    {
      id: 'active-expired',
      title: 'Active vs Expired Memberships',
      description: 'View detailed breakdown of active and expired memberships with charts and analytics',
      icon: <Users className="h-8 w-8" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      href: '/admin/dashboard/reports/membership-status',
      stats: {
        value: `${stats.activeMemberships}/${stats.expiredMemberships}`,
        label: 'Active/Expired',
        trend: '+5%'
      }
    }
  ], [stats.activeMemberships, stats.expiredMemberships])

  const financialReports: ReportCard[] = useMemo(() => [
    {
      id: 'revenue-report',
      title: 'Revenue Report',
      description: 'Daily, monthly, and yearly revenue analysis with trends and forecasting',
      icon: <CreditCard className="h-8 w-8" />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      href: '/admin/dashboard/reports/revenue',
      stats: {
        value: 'Real-time',
        label: 'Current Month Net Revenue',
        trend: 'Live'
      }
    }
  ], [])

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminDashboardLayout>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header Skeleton */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Reports & Analytics
                  </h1>
                </div>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  Loading comprehensive insights and analytics...
                </p>
              </div>

              {/* Stats Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gradient-to-br from-gray-600/20 to-gray-700/20 backdrop-blur-sm border border-gray-500/30 rounded-2xl p-6 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-600 rounded w-20"></div>
                        <div className="h-8 bg-gray-600 rounded w-16"></div>
                        <div className="h-3 bg-gray-600 rounded w-24"></div>
                      </div>
                      <div className="p-3 bg-gray-600/20 rounded-xl">
                        <div className="h-8 w-8 bg-gray-600 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                      <BarChart3 className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Reports & Analytics
                    </h1>
                  </div>
                  <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Real-time current month insights and analytics for your gym management
                  </p>
                </div>

                {/* Stats Overview - Current Month */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-300 text-sm font-medium">New Signups</p>
                        <p className="text-3xl font-bold text-white">{stats.currentMonthSignups}</p>
                        <p className="text-blue-400 text-xs mt-1">This month</p>
                      </div>
                      <div className="p-3 bg-blue-500/20 rounded-xl">
                        <Users className="h-8 w-8 text-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-300 text-sm font-medium">Active Memberships</p>
                        <p className="text-3xl font-bold text-white">{stats.currentMonthActiveMemberships}</p>
                        <p className="text-green-400 text-xs mt-1">This month</p>
                      </div>
                      <div className="p-3 bg-green-500/20 rounded-xl">
                        <UserCheck className="h-8 w-8 text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-300 text-sm font-medium">Expired Memberships</p>
                        <p className="text-3xl font-bold text-white">{stats.currentMonthExpiredMemberships}</p>
                        <p className="text-red-400 text-xs mt-1">This month</p>
                      </div>
                      <div className="p-3 bg-red-500/20 rounded-xl">
                        <UserX className="h-8 w-8 text-red-400" />
                      </div>
                    </div>
                  </div>

                  <SimpleNetRevenueCard />
                </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Membership Reports */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Membership Analytics</h2>
                </div>
                
                <div className="space-y-4">
                  {membershipReports.map((report) => (
                    <Link key={report.id} href={report.href}>
                      <div className="group bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6 hover:from-gray-700/50 hover:to-gray-600/50 hover:border-blue-500/50 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${report.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                              <div className={report.color}>
                                {report.icon}
                              </div>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                                {report.title}
                              </h3>
                              <p className="text-gray-400 text-sm mt-1">{report.description}</p>
                            </div>
                          </div>
                          <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                        
                        {report.stats && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-600/50">
                            <div>
                              <p className="text-2xl font-bold text-white">{report.stats.value}</p>
                              <p className="text-gray-400 text-sm">{report.stats.label}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              report.stats.trend === 'Urgent' ? 'bg-red-500/20 text-red-400' :
                              report.stats.trend?.startsWith('+') ? 'bg-green-500/20 text-green-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {report.stats.trend}
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Financial Reports */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CreditCard className="h-6 w-6 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Financial Analytics</h2>
                </div>
                
                <div className="space-y-4">
                  {financialReports.map((report) => (
                    <Link key={report.id} href={report.href}>
                      <div className="group bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6 hover:from-gray-700/50 hover:to-gray-600/50 hover:border-green-500/50 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${report.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                              <div className={report.color}>
                                {report.icon}
                              </div>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white group-hover:text-green-300 transition-colors">
                                {report.title}
                              </h3>
                              <p className="text-gray-400 text-sm mt-1">{report.description}</p>
                            </div>
                          </div>
                          <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-green-400 group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                        
                        {report.stats && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-600/50">
                            <div>
                              <p className="text-2xl font-bold text-white">
                                {report.id === 'revenue-report' 
                                  ? (netRevenueData.isLoading ? 'Loading...' : `PKR ${netRevenueData.netRevenue.toLocaleString()}`)
                                  : report.stats.value
                                }
                              </p>
                              <p className="text-gray-400 text-sm">{report.stats.label}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              report.id === 'revenue-report' 
                                ? 'bg-blue-500/20 text-blue-400'
                                : (report.stats.trend === 'Requires Action' ? 'bg-red-500/20 text-red-400' :
                                   report.stats.trend?.startsWith('+') ? 'bg-green-500/20 text-green-400' :
                                   'bg-blue-500/20 text-blue-400')
                            }`}>
                              {report.id === 'revenue-report' 
                                ? 'Live'
                                : report.stats.trend
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </AdminDashboardLayout>
    </ProtectedRoute>
  )
}

