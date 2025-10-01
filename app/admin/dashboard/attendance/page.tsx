"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import AdminDashboardLayout from '@/components/admin-dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Download,
  CheckCircle,
  XCircle,
  Users,
  Activity,
  Calendar,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  onAttendanceRecordsChange, 
  getTotalUsersCount,
  type AttendanceRecord 
} from '@/lib/firebase'
import { Timestamp, collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

type DateFilter = 'today' | 'yesterday' | 'this_week' | 'all'
type StatusFilter = 'all' | 'present' | 'absent'

interface AttendanceRecordWithUser extends AttendanceRecord {
  userName?: string
  userEmail?: string
  membershipStatus?: 'active' | 'pending' | 'expired' | 'no_plan'
  membershipExpiryDate?: Date
}

export default function AttendanceManagement() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordWithUser[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecordWithUser[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [usersData, setUsersData] = useState<Map<string, any>>(new Map())

  // Fetch total users count
  useEffect(() => {
    const fetchTotalUsers = async () => {
      const count = await getTotalUsersCount()
      setTotalUsers(count)
    }
    fetchTotalUsers()
  }, [])

  // Real-time listeners for users, memberships, and attendance
  useEffect(() => {
    setLoading(true)
    
    // Listen to users collection
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'customer')
    )
    
    let currentUsersData = new Map()
    let currentMembershipsData = new Map()
    let currentAttendanceData: AttendanceRecord[] = []
    
    const unsubscribeUsers = onSnapshot(usersQuery, (usersSnapshot) => {
      currentUsersData.clear()
      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        // Store by both UID and Member ID for easy lookup
        currentUsersData.set(doc.id, { ...userData, firebaseUid: doc.id })
        
        // Also store by Member ID if it exists
        if (userData.memberId) {
          currentUsersData.set(userData.memberId, { ...userData, firebaseUid: doc.id })
        }
      })
      setUsersData(currentUsersData)
      
      // Merge with attendance data
      mergeAttendanceWithUsersAndMemberships(currentAttendanceData, currentUsersData, currentMembershipsData)
    }, (error) => {
      console.error('Error fetching users:', error)
    })
    
    // Listen to memberships collection
    const membershipsQuery = query(collection(db, 'memberships'))
    
    const unsubscribeMemberships = onSnapshot(membershipsQuery, (membershipsSnapshot) => {
      currentMembershipsData.clear()
      membershipsSnapshot.forEach((doc) => {
        const membershipData = doc.data()
        // Store membership by uid (user_id)
        currentMembershipsData.set(membershipData.uid, {
          id: doc.id,
          ...membershipData
        })
      })
      
      // Merge with attendance data
      mergeAttendanceWithUsersAndMemberships(currentAttendanceData, currentUsersData, currentMembershipsData)
    }, (error) => {
      console.error('Error fetching memberships:', error)
    })
    
    // Listen to attendance collection
    const unsubscribeAttendance = onAttendanceRecordsChange((records) => {
      currentAttendanceData = records
      
      // Merge with users and memberships data
      mergeAttendanceWithUsersAndMemberships(currentAttendanceData, currentUsersData, currentMembershipsData)
      setLoading(false)
    })
    
    return () => {
      unsubscribeUsers()
      unsubscribeMemberships()
      unsubscribeAttendance()
    }
  }, [])
  
  // Function to merge attendance records with user and membership data
  const mergeAttendanceWithUsersAndMemberships = (
    attendance: AttendanceRecord[], 
    users: Map<string, any>,
    memberships: Map<string, any>
  ) => {
    const enrichedRecords: AttendanceRecordWithUser[] = attendance.map(record => {
      // First, get user data by Member ID (attendance.user_id is the Member ID like "RF-702556")
      const userData = users.get(record.user_id)
      
      // Get the Firebase UID from the user data
      const firebaseUid = userData?.firebaseUid
      
      // Now use the Firebase UID to get the membership
      const membershipData = firebaseUid ? memberships.get(firebaseUid) : null
      
      return {
        ...record,
        userName: userData?.name || userData?.displayName || 'Unknown',
        userEmail: userData?.email || '',
        membershipStatus: membershipData?.status || 'no_plan',
        membershipExpiryDate: membershipData?.endDate?.toDate?.() || undefined
      }
    })
    
    setAttendanceRecords(enrichedRecords)
  }

  // Filter attendance records based on filters
  useEffect(() => {
    let filtered = [...attendanceRecords]

    // Apply date filter
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())

    if (dateFilter === 'today') {
      filtered = filtered.filter(record => {
        const recordDate = record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date)
        const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
        return recordDay.getTime() === today.getTime()
      })
    } else if (dateFilter === 'yesterday') {
      filtered = filtered.filter(record => {
        const recordDate = record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date)
        const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
        return recordDay.getTime() === yesterday.getTime()
      })
    } else if (dateFilter === 'this_week') {
      filtered = filtered.filter(record => {
        const recordDate = record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date)
        return recordDate >= weekStart && recordDate <= now
      })
    }

    // Apply status filter
    if (statusFilter === 'present') {
      filtered = filtered.filter(record => record.present === true)
    } else if (statusFilter === 'absent') {
      filtered = filtered.filter(record => record.present === false)
    }

    // Apply search filter (by user_id or name)
    if (searchTerm.trim()) {
      filtered = filtered.filter(record => 
        record.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.userName && record.userName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Sort by check_in time (most recent first)
    filtered.sort((a, b) => {
      const timeA = a.check_in instanceof Timestamp ? a.check_in.toMillis() : new Date(a.check_in).getTime()
      const timeB = b.check_in instanceof Timestamp ? b.check_in.toMillis() : new Date(b.check_in).getTime()
      return timeB - timeA
    })

    setFilteredRecords(filtered)
  }, [attendanceRecords, dateFilter, statusFilter, searchTerm])

  // Calculate stats
  const presentToday = attendanceRecords.filter(record => {
    const recordDate = record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date)
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
    return recordDay.getTime() === todayStart.getTime() && record.present === true
  }).length

  const attendanceRate = totalUsers > 0 ? Math.round((presentToday / totalUsers) * 100) : 0

  // Get membership status badge (same as membership page)
  const getMembershipStatusBadge = (status?: string, expiryDate?: Date) => {
    // Calculate real-time status based on expiry date
    let realStatus = status || 'no_plan'
    
    if (expiryDate) {
      const now = new Date()
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysRemaining < 0) {
        realStatus = 'expired'
      } else if (daysRemaining === 0) {
        realStatus = 'expires_today'
      } else if (daysRemaining <= 7) {
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
      case 'expired':
        return <Badge className="bg-red-600 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Expired
        </Badge>
      case 'expires_today':
        return <Badge className="bg-yellow-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Expires Today
        </Badge>
      case 'expiring_soon':
        return <Badge className="bg-orange-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Expiring Soon
        </Badge>
      case 'pending':
        return <Badge className="bg-yellow-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </Badge>
      case 'no_plan':
        return <Badge className="bg-gray-600 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          No Plan
        </Badge>
      default:
        return <Badge className="bg-gray-600">{realStatus}</Badge>
    }
  }

  // Export to CSV
  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.error('No attendance records available to export')
      return
    }

    try {
      // CSV headers
      const headers = ['Member ID', 'Name', 'Email', 'Membership Status', 'Date', 'Check In Time', 'Attendance Status']
      
      // CSV rows
      const rows = filteredRecords.map(record => {
        const date = record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date)
        const checkIn = record.check_in instanceof Timestamp ? record.check_in.toDate() : new Date(record.check_in)
        
        return [
          record.user_id,
          record.userName || 'Unknown',
          record.userEmail || '',
          record.membershipStatus || 'No Plan',
          date.toLocaleDateString(),
          checkIn.toLocaleTimeString(),
          record.present ? 'Present' : 'Absent'
        ]
      })

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `attendance_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Attendance records exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export attendance records')
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
                <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl">
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Attendance Management
                </h1>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Monitor and manage gym attendance, check-ins, and member activity
              </p>
              <div className="flex justify-center">
                <Button 
                  onClick={handleExport}
                  className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Attendance
                </Button>
              </div>
            </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">Total Members</CardTitle>
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-lg sm:text-2xl font-bold text-white">{totalUsers}</div>
                <p className="text-xs text-gray-400 mt-1">Registered members</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">Present Today</CardTitle>
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-lg sm:text-2xl font-bold text-white">{presentToday}</div>
                <p className="text-xs text-gray-400 mt-1">
                  <span className="text-green-500">{attendanceRate}%</span> attendance rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by ID or Name..."
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <select 
                  className="bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="all">All Time</option>
                </select>

                <select 
                  className="bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>

                <div className="text-right">
                  <p className="text-gray-400 text-sm">
                    Total: {filteredRecords.length} {dateFilter === 'today' ? `of ${totalUsers}` : 'records'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Records Table */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                Attendance Records ({filteredRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  {dateFilter === 'today' && attendanceRecords.length === 0 ? (
                    <p className="text-base">No attendance records available for today.</p>
                  ) : (
                    <>
                      <p className="text-base">No attendance records found for selected filters</p>
                      <p className="text-sm mt-2">Try adjusting your filters or search term</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-3 text-gray-300 font-medium">Member ID</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Name</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Membership Status</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Attendance</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Check-in</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((record) => {
                        const date = record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date)
                        const checkIn = record.check_in instanceof Timestamp ? record.check_in.toDate() : new Date(record.check_in)
                        
                        return (
                          <tr key={record.attendance_id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                            <td className="p-3">
                              <span className="text-gray-300 font-mono">{record.user_id}</span>
                            </td>
                            <td className="p-3">
                              <div className="text-gray-300">
                                <p className="text-white font-medium">{record.userName || 'Unknown'}</p>
                                {record.userEmail && (
                                  <p className="text-gray-400 text-xs">{record.userEmail}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              {getMembershipStatusBadge(record.membershipStatus, record.membershipExpiryDate)}
                            </td>
                            <td className="p-3">
                              <div className="text-gray-300">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className="text-sm">
                                    {date.toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-gray-300 text-sm">
                                {checkIn.toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="p-3">
                              {record.present ? (
                                <Badge className="bg-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Present
                                </Badge>
                              ) : (
                                <Badge className="bg-red-600 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  Absent
                                </Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </AdminDashboardLayout>
    </ProtectedRoute>
  )
}
