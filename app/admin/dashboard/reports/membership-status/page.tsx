"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import AdminDashboardLayout from '@/components/admin-dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  UserCheck, 
  UserX, 
  ArrowLeft,
  Download,
  Filter,
  RefreshCw,
  Calendar,
  TrendingUp,
  PieChart,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  X,
  ChevronDown
} from 'lucide-react'
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, Pie, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { toast } from 'sonner'
import Link from 'next/link'
import { collection, query, getDocs, where, orderBy, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { getProfileImageUrl } from '@/lib/cloudinary-client'

interface MembershipData {
  id: string
  uid: string
  name: string
  email: string
  memberId?: string
  phone?: string
  profileImageUrl?: string
  membershipPlan?: string
  membershipAmount?: number
  totalAmount?: number
  registrationFee?: boolean
  membershipStatus?: "active" | "pending" | "expired" | "no_plan"
  membershipExpiryDate?: Date
  membershipStartDate?: Date
  createdAt: Date
  isVisitor?: boolean
  visitorName?: string
  visitorPhone?: string
  // Historical data fields
  isHistorical?: boolean
  renewalCount?: number
  lastRenewalDate?: Date
}

export default function MembershipStatusReport() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [memberships, setMemberships] = useState<MembershipData[]>([])
  const [filteredMemberships, setFilteredMemberships] = useState<MembershipData[]>([])
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null)
  const [activePreset, setActivePreset] = useState('current')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showHistorical, setShowHistorical] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)

  // Handle status filter changes
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    // Close dropdown after a small delay to ensure smooth animation
    setTimeout(() => setStatusDropdownOpen(false), 100)
  }

  // Handle dropdown open/close
  const handleStatusDropdownToggle = () => {
    setStatusDropdownOpen(!statusDropdownOpen)
  }

  // Handle dropdown close when clicking outside
  const handleStatusDropdownClose = () => {
    setStatusDropdownOpen(false)
  }

  // Close dropdowns when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Element
    if (!target.closest('.dropdown-container')) {
      setStatusDropdownOpen(false)
    }
  }

  useEffect(() => {
    // Set default date range to current month
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    setDateRange({
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    })
    
    loadMemberships()
  }, [])

  useEffect(() => {
    // Add click outside listener
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    applyFilters()
  }, [memberships, dateRange, statusFilter, refreshTrigger, showHistorical])

  // Real-time countdown timer for days/hours remaining - update every 10 seconds for better performance
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update days/hours remaining
      setRefreshTrigger(prev => prev + 1)
    }, 10000) // Update every 10 seconds instead of 3 seconds

    return () => clearInterval(interval)
  }, [])

  const loadMemberships = async () => {
    setLoading(true)
    try {
      // Load all data in parallel with optimized queries
      const [membershipsSnapshot, paymentsSnapshot, usersSnapshot] = await Promise.all([
        // Load current memberships
        getDocs(query(collection(db, "memberships"), orderBy("createdAt", "desc"))),
        // Load historical payment data for past memberships
        getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"))),
        // Load all users at once instead of individual queries
        getDocs(query(collection(db, "users"), where("role", "==", "customer")))
      ])
      
      // Create a map of users for fast lookup
      const usersMap = new Map()
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data()
        usersMap.set(doc.id, userData)
      })
      
      const membershipData: MembershipData[] = []
      const processedUids = new Set<string>()
      
      // Process current memberships first
      for (const docSnapshot of membershipsSnapshot.docs) {
        const data = docSnapshot.data()
        
        // Skip visitors - only include actual customer memberships
        if (data.isVisitor) {
          continue
        }
        
        // Get user data from the map (much faster than individual queries)
        const userData = usersMap.get(data.uid)
        if (!userData) {
          // Skip if no user document found
          continue
        }
        
        membershipData.push({
          id: docSnapshot.id,
          uid: data.uid,
          name: userData.name || 'Unknown User',
          email: userData.email || 'unknown@email.com',
          memberId: userData.memberId || '',
          phone: userData.phone || '',
          profileImageUrl: userData.profileImageUrl,
          membershipPlan: data.planType,
          membershipAmount: data.amount,
          totalAmount: data.amount,
          registrationFee: data.registrationFee || false,
          membershipStatus: data.status,
          membershipExpiryDate: data.endDate?.toDate?.() || new Date(data.endDate),
          membershipStartDate: data.startDate?.toDate?.() || new Date(data.startDate),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          isVisitor: data.isVisitor || false,
          renewalCount: data.renewalCount || 0,
          lastRenewalDate: data.lastRenewalDate?.toDate?.() || data.lastRenewalDate,
          isHistorical: false
        })
        
        processedUids.add(data.uid)
      }
      
      // Process historical payment data for users not in current memberships
      for (const docSnapshot of paymentsSnapshot.docs) {
        const data = docSnapshot.data()
        
        // Skip if we already processed this user's current membership
        if (processedUids.has(data.uid)) continue
        
        // Get user data from the map
        const userData = usersMap.get(data.uid)
        if (!userData) {
          // Skip if no user document found
          continue
        }
        
        // Add historical membership data from payment records
        membershipData.push({
          id: `payment_${docSnapshot.id}`,
          uid: data.uid,
          name: userData.name || 'Unknown User',
          email: userData.email || 'unknown@email.com',
          memberId: userData.memberId || '',
          phone: userData.phone || '',
          profileImageUrl: userData.profileImageUrl,
          membershipPlan: data.planType || 'No Plan',
          membershipAmount: data.amount || 0,
          totalAmount: data.amount || 0,
          registrationFee: data.registrationFee || false,
          membershipStatus: 'expired', // Historical data is expired
          membershipExpiryDate: data.membershipEndDate?.toDate?.() || data.membershipEndDate,
          membershipStartDate: data.membershipStartDate?.toDate?.() || data.membershipStartDate,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          isVisitor: false,
          renewalCount: 0,
          lastRenewalDate: data.createdAt?.toDate?.() || data.createdAt,
          isHistorical: true // Flag to indicate this is historical data
        })
        
        processedUids.add(data.uid)
      }
      
      setMemberships(membershipData)
      console.log(`✅ Loaded ${membershipData.length} memberships (current + historical)`)
    } catch (error) {
      console.error('Error loading memberships:', error)
      toast.error('Failed to load membership data')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = useCallback(() => {
    let filtered = [...memberships]

    // Apply historical data filter
    if (!showHistorical) {
      filtered = filtered.filter(m => !m.isHistorical)
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.membershipStatus === statusFilter)
    }

    // Apply date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start)
      filtered = filtered.filter(m => m.createdAt >= startDate)
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter(m => m.createdAt <= endDate)
    }

    setFilteredMemberships(filtered)
  }, [memberships, showHistorical, statusFilter, dateRange])

  const getStatusStats = () => {
    const active = filteredMemberships.filter(m => m.membershipStatus === 'active').length
    const expired = filteredMemberships.filter(m => m.membershipStatus === 'expired').length
    const pending = filteredMemberships.filter(m => m.membershipStatus === 'pending').length
    const total = filteredMemberships.length

    return { active, expired, pending, total }
  }

  const getPlanStats = () => {
    const planStats: Record<string, { count: number; revenue: number }> = {}
    
    filteredMemberships.forEach(membership => {
      if (!planStats[membership.membershipPlan || 'No Plan']) {
        planStats[membership.membershipPlan || 'No Plan'] = { count: 0, revenue: 0 }
      }
      planStats[membership.membershipPlan || 'No Plan'].count++
      planStats[membership.membershipPlan || 'No Plan'].revenue += membership.totalAmount || 0
    })

    return planStats
  }

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`
  }

  const getRevenueTrendData = () => {
    const now = new Date()
    const months = []
    
    // Generate last 6 months data
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999)
      
      // Calculate revenue for this month
      const monthRevenue = memberships
        .filter(membership => {
          const createdAt = membership.createdAt
          return createdAt >= monthStart && createdAt <= monthEnd
        })
        .reduce((sum, membership) => sum + (membership.totalAmount || 0), 0)
      
      months.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue
      })
    }
    
    return months
  }

  // Real-time status calculation functions
  const getDaysUntilExpiry = (expiryDate: Date, isVisitor: boolean = false) => {
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    
    if (isVisitor) {
      // For visitors, return hours with decimal precision for more accurate countdown
      const diffHours = diffTime / (1000 * 60 * 60)
      return Math.max(0, Math.ceil(diffHours))
    } else {
      // For regular customers, return days
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return Math.max(0, diffDays)
    }
  }

  const getCustomerTimeRemaining = (expiryDate: Date) => {
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    
    if (diffTime <= 0) return { days: 0, hours: 0, expired: true }
    
    const totalDays = diffTime / (1000 * 60 * 60 * 24)
    const days = Math.floor(totalDays)
    const hours = Math.floor((totalDays - days) * 24)
    
    return { days, hours, expired: false }
  }

  const getVisitorTimeRemaining = (expiryDate: Date) => {
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    
    if (diffTime <= 0) return { hours: 0, minutes: 0, expired: true }
    
    const totalHours = diffTime / (1000 * 60 * 60)
    const hours = Math.floor(totalHours)
    const minutes = Math.floor((totalHours - hours) * 60)
    
    return { hours, minutes, expired: false }
  }

  const getDaysSinceExpiry = (expiryDate: Date) => {
    const now = new Date()
    const diffTime = now.getTime() - expiryDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Get real-time status for display
  const getRealTimeStatus = (expiryDate?: Date, isVisitor: boolean = false) => {
    if (!expiryDate) return { status: 'no_expiry', daysRemaining: null, daysSinceExpiry: null }
    
    const daysRemaining = getDaysUntilExpiry(expiryDate, isVisitor)
    
    if (daysRemaining > 0) {
      return { status: 'active', daysRemaining, daysSinceExpiry: null }
    } else if (daysRemaining === 0) {
      return { status: 'expires_today', daysRemaining: 0, daysSinceExpiry: null }
    } else {
      const daysSinceExpiry = getDaysSinceExpiry(expiryDate)
      return { status: 'expired', daysRemaining: null, daysSinceExpiry }
    }
  }

  const getMembershipStatusBadge = (status: string, expiryDate?: Date, isVisitor: boolean = false) => {
    // Calculate real-time status based on expiry date
    let realStatus = status
    
    // If user has a membership plan, check expiry
    if (expiryDate) {
      const daysRemaining = getDaysUntilExpiry(expiryDate, isVisitor)
      if (daysRemaining < 0) {
        realStatus = 'expired'
      } else if (daysRemaining === 0) {
        realStatus = 'expires_today'
      } else if (isVisitor ? daysRemaining <= 1 : daysRemaining <= 7) {
        realStatus = 'expiring_soon'
      } else {
        realStatus = 'active'
      }
    }

    switch (realStatus) {
      case 'active':
        return <Badge className="bg-green-600 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Active
        </Badge>
      case 'expiring_soon':
        return <Badge className="bg-yellow-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Expiring Soon
        </Badge>
      case 'expires_today':
        return <Badge className="bg-orange-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Expires Today
        </Badge>
      case 'expired':
        return <Badge className="bg-red-600 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Expired
        </Badge>
      case 'pending':
        return <Badge className="bg-blue-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </Badge>
      case 'no_plan':
        return <Badge className="bg-gray-600 flex items-center gap-1">
          <X className="w-3 h-3" />
          No Plan
        </Badge>
      default:
        return <Badge className="bg-gray-600">{realStatus}</Badge>
    }
  }

  const setDateRangePreset = (preset: string) => {
    setActivePreset(preset)
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (preset) {
      case 'current':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'previous':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      case 'all':
        setDateRange({ start: '', end: '' })
        return
      default:
        return
    }

    setDateRange({
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    })
  }

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Member ID', 'Plan Type', 'Registration Fee', 'Start Date', 'End Date', 'Status', 'Data Type', 'Created At']
    const csvContent = [
      headers.join(','),
      ...filteredMemberships.map(m => [
        m.name,
        m.email,
        m.memberId || '',
        m.membershipPlan || 'No Plan',
        m.totalAmount || 0,
        m.membershipStartDate?.toLocaleDateString() || '',
        m.membershipExpiryDate?.toLocaleDateString() || '',
        m.membershipStatus || 'pending',
        m.isHistorical ? 'Historical' : 'Current',
        m.createdAt.toLocaleDateString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'membership-status-report-' + new Date().toISOString().split('T')[0] + '.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('CSV exported successfully')
  }

  const stats = getStatusStats()
  const planStats = getPlanStats()

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
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Membership Status Report
                </h1>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Active vs Expired Memberships Analysis
                {dateRange.start && dateRange.end && (
                  <span className="text-orange-400 ml-2">
                    • {new Date(dateRange.start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                )}
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/admin/dashboard/reports">
                  <Button variant="outline" className="border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Reports
                  </Button>
                </Link>
                <Button 
                  onClick={exportToCSV}
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

          {/* Filters */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Date Presets and Data Type */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Selection */}
                <div>
                  <label className="text-gray-300 text-sm mb-3 block">Quick Selection</label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={activePreset === 'current' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateRangePreset('current')}
                      className={`${
                        activePreset === 'current' 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white'
                      }`}
                    >
                      This Month
                    </Button>
                    <Button
                      variant={activePreset === 'previous' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateRangePreset('previous')}
                      className={`${
                        activePreset === 'previous' 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white'
                      }`}
                    >
                      Last Month
                    </Button>
                    <Button
                      variant={activePreset === 'quarter' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateRangePreset('quarter')}
                      className={`${
                        activePreset === 'quarter' 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white'
                      }`}
                    >
                      Last 3 Months
                    </Button>
                    <Button
                      variant={activePreset === 'year' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateRangePreset('year')}
                      className={`${
                        activePreset === 'year' 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white'
                      }`}
                    >
                      This Year
                    </Button>
                    <Button
                      variant={activePreset === 'all' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateRangePreset('all')}
                      className={`${
                        activePreset === 'all' 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white'
                      }`}
                    >
                      All Time
                    </Button>
                  </div>
                </div>

                {/* Data Type */}
                <div>
                  <label className="text-gray-300 text-sm mb-3 block">Data Type</label>
                  <div className="flex justify-start">
                    <Button
                      variant={showHistorical ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowHistorical(!showHistorical)}
                      className={`${
                        showHistorical 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white'
                      }`}
                    >
                      {showHistorical ? 'Show All' : 'Current Only'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Custom Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Status</label>
                  <div className="relative dropdown-container">
                    <select
                      value={statusFilter}
                      onChange={(e) => handleStatusFilterChange(e.target.value)}
                      onClick={handleStatusDropdownToggle}
                      onBlur={handleStatusDropdownClose}
                      className="w-full p-3 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all appearance-none cursor-pointer"
                      style={{ zIndex: 1 }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="pending">Pending</option>
                    </select>
                    <ChevronDown 
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${
                        statusDropdownOpen ? 'rotate-180' : ''
                      }`}
                      style={{ zIndex: 2 }}
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="text-gray-300 text-sm mb-2 block">Start Date</label>
                  <div className="relative group">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full p-3 pr-12 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer hover:border-gray-500 hover:bg-gray-800/70 backdrop-blur-sm"
                      style={{
                        colorScheme: 'dark',
                        WebkitColorScheme: 'dark'
                      } as React.CSSProperties}
                    />
                    <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-orange-400 transition-colors duration-200 pointer-events-none" />
                  </div>
                </div>
                <div className="relative">
                  <label className="text-gray-300 text-sm mb-2 block">End Date</label>
                  <div className="relative group">
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full p-3 pr-12 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 cursor-pointer hover:border-gray-500 hover:bg-gray-800/70 backdrop-blur-sm"
                      style={{
                        colorScheme: 'dark',
                        WebkitColorScheme: 'dark'
                      } as React.CSSProperties}
                    />
                    <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-orange-400 transition-colors duration-200 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Current Filter Summary */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-orange-400" />
                  <span className="text-gray-300 text-sm font-medium">Current Filter Summary</span>
                </div>
                <div className="text-sm text-gray-400">
                  <span className="text-white">
                    {dateRange.start && dateRange.end 
                      ? `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`
                      : 'All Time'
                    }
                  </span>
                  <span className="mx-2">•</span>
                  <span className="text-white">
                    {statusFilter === 'all' ? 'All Statuses' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  </span>
                  <span className="mx-2">•</span>
                  <span className="text-orange-400 font-medium">{filteredMemberships.length} memberships</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Memberships</p>
                    <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active</p>
                    <p className="text-2xl font-bold text-green-400">{stats.active}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Expired</p>
                    <p className="text-2xl font-bold text-red-400">{stats.expired}</p>
                  </div>
                  <UserX className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Pending</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trends Chart */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Revenue Trends (Last 6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getRevenueTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `PKR ${value.toLocaleString()}`}
                      />
                      <Tooltip 
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
                        formatter={(value: any) => [`PKR ${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#f97316" 
                        strokeWidth={3}
                        dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Summary Stats */}
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-gray-400 text-sm">Total Revenue</p>
                      <p className="text-white font-bold text-lg">
                        {formatCurrency(getRevenueTrendData().reduce((sum, month) => sum + month.revenue, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Average Monthly</p>
                      <p className="text-white font-bold text-lg">
                        {formatCurrency(getRevenueTrendData().reduce((sum, month) => sum + month.revenue, 0) / 6)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan Distribution Pie Chart */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Plan Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={Object.entries(planStats)
                          .sort(([,a], [,b]) => b.count - a.count)
                          .map(([plan, data], index) => ({
                            name: plan,
                            value: data.count,
                            revenue: data.revenue,
                            color: index === 0 ? '#f97316' : // orange-500 (primary theme)
                                   index === 1 ? '#e5e7eb' : // gray-200 (light gray)
                                   index === 2 ? '#9ca3af' : // gray-400 (medium gray)
                                   index === 3 ? '#6b7280' : // gray-500 (darker gray)
                                   index === 4 ? '#4b5563' : // gray-600 (dark gray)
                                   index === 5 ? '#374151' : // gray-700 (very dark gray)
                                   '#1f2937' // gray-800 (darkest gray)
                          }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(planStats)
                          .sort(([,a], [,b]) => b.count - a.count)
                          .map((_, index) => (
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
                          `${value} members (${formatCurrency(props.payload.revenue)})`,
                          'Members'
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
                            {value} ({entry.payload.value} members)
                          </span>
                        )}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Summary Stats */}
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-gray-400 text-sm">Total Plans</p>
                      <p className="text-white font-bold text-lg">{Object.keys(planStats).length}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Revenue</p>
                      <p className="text-white font-bold text-lg">
                        {formatCurrency(Object.values(planStats).reduce((sum, data) => sum + data.revenue, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Memberships Table */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Memberships ({filteredMemberships.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-300 font-medium">Member</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Member ID</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Status</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Plan</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Amount</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Expiry</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Time Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMemberships.slice(0, 20).map((membership) => {
                      const realTimeStatus = getRealTimeStatus(membership.membershipExpiryDate, membership.isVisitor)
                      
                      return (
                      <tr key={membership.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${membership.isHistorical ? 'bg-gray-800/30' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage 
                                src={membership.profileImageUrl ? getProfileImageUrl(membership.profileImageUrl, 80) : undefined} 
                                alt={`${membership.name}'s profile picture`}
                              />
                              <AvatarFallback className="bg-orange-600 text-white">
                                {membership.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="text-white font-medium">{membership.name}</p>
                                {membership.isHistorical && (
                                  <Badge className="bg-gray-600 text-xs">Historical</Badge>
                                )}
                              </div>
                              {membership.email && (
                                <p className="text-gray-400 text-xs">{membership.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-300 font-mono">
                            {membership.memberId || 'N/A'}
                          </span>
                        </td>
                        <td className="p-3">
                          {getMembershipStatusBadge(membership.membershipStatus || 'pending', membership.membershipExpiryDate, membership.isVisitor)}
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300">
                            {membership.membershipPlan ? (
                              <span className="text-sm font-medium">
                                {membership.membershipPlan}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-sm">
                                No Plan
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300">
                            {membership.totalAmount ? (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">
                                  PKR {membership.totalAmount.toLocaleString()}
                                </span>
                                {membership.registrationFee && (
                                  <Badge className="bg-blue-600 text-xs">+Reg Fee</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300">
                            {membership.membershipExpiryDate ? (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span className="text-sm">
                                  {membership.membershipExpiryDate.toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">No expiry</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300">
                            {membership.isVisitor ? (
                              membership.membershipExpiryDate ? (
                                realTimeStatus.status === 'active' ? (
                                  (() => {
                                    const visitorTime = getVisitorTimeRemaining(membership.membershipExpiryDate)
                                    if (visitorTime.expired) {
                                      return <span className="text-red-400 text-sm font-medium">Expired</span>
                                    } else if (visitorTime.hours > 0) {
                                      return <span className="text-green-400 text-sm font-medium">{visitorTime.hours}h {visitorTime.minutes}m remaining</span>
                                    } else {
                                      return <span className="text-yellow-400 text-sm font-medium">{visitorTime.minutes}m remaining</span>
                                    }
                                  })()
                                ) : realTimeStatus.status === 'expires_today' ? (
                                  <span className="text-yellow-400 text-sm font-medium">
                                    Expires soon
                                  </span>
                                ) : realTimeStatus.status === 'expired' ? (
                                  <span className="text-red-400 text-sm font-medium">
                                    Expired
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-sm">-</span>
                                )
                              ) : (
                                <span className="text-blue-400 text-sm font-medium">
                                  Trial Visit
                                </span>
                              )
                            ) : membership.membershipExpiryDate ? (
                              realTimeStatus.status === 'active' ? (
                                (() => {
                                  const customerTime = getCustomerTimeRemaining(membership.membershipExpiryDate)
                                  if (customerTime.expired) {
                                    return <span className="text-red-400 text-sm font-medium">Expired</span>
                                  } else if (customerTime.days > 0) {
                                    return <span className="text-green-400 text-sm font-medium">{customerTime.days}d {customerTime.hours}h remaining</span>
                                  } else if (customerTime.hours > 0) {
                                    return <span className="text-yellow-400 text-sm font-medium">{customerTime.hours}h remaining</span>
                                  } else {
                                    return <span className="text-orange-400 text-sm font-medium">Expires today</span>
                                  }
                                })()
                              ) : realTimeStatus.status === 'expires_today' ? (
                                <span className="text-yellow-400 text-sm font-medium">
                                  Expires today
                                </span>
                              ) : realTimeStatus.status === 'expired' ? (
                                <span className="text-red-400 text-sm font-medium">
                                  {realTimeStatus.daysSinceExpiry} days ago
                                </span>
                              ) : (
                                <span className="text-gray-500 text-sm">-</span>
                              )
                            ) : (
                              <span className="text-gray-500 text-sm">No expiry</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredMemberships.length > 20 && (
                  <div className="text-center mt-4">
                    <p className="text-gray-400">Showing first 20 results. Use filters to narrow down results.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </AdminDashboardLayout>
    </ProtectedRoute>
  )
}
