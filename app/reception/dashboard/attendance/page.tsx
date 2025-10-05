"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import ReceptionDashboardLayout from '@/components/reception-dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import AttendanceAddPopup from '@/components/admin/attendance-add-popup'
import { 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  Download,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity
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

export default function ReceptionAttendanceManagement() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [showAddPopup, setShowAddPopup] = useState(false)
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
        currentUsersData.set(doc.id, { ...userData, firebaseUid: doc.id })
        
        if (userData.memberId) {
          currentUsersData.set(userData.memberId, { ...userData, firebaseUid: doc.id })
        }
      })
      setUsersData(currentUsersData)
      
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
        currentMembershipsData.set(membershipData.uid, {
          id: doc.id,
          ...membershipData
        })
      })
      
      mergeAttendanceWithUsersAndMemberships(currentAttendanceData, currentUsersData, currentMembershipsData)
    }, (error) => {
      console.error('Error fetching memberships:', error)
    })
    
    // Listen to attendance collection
    const unsubscribeAttendance = onAttendanceRecordsChange((records) => {
      currentAttendanceData = records
      
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
      const userData = users.get(record.user_id)
      const firebaseUid = userData?.firebaseUid
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

    if (statusFilter === 'present') {
      filtered = filtered.filter(record => record.present === true)
    } else if (statusFilter === 'absent') {
      filtered = filtered.filter(record => record.present === false)
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter(record => 
        record.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.userName && record.userName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    filtered.sort((a, b) => {
      const timeA = a.check_in instanceof Timestamp ? a.check_in.toMillis() : new Date(a.check_in).getTime()
      const timeB = b.check_in instanceof Timestamp ? b.check_in.toMillis() : new Date(b.check_in).getTime()
      return timeB - timeA
    })

    setFilteredRecords(filtered)
  }, [attendanceRecords, dateFilter, statusFilter, searchTerm])

  const presentToday = attendanceRecords.filter(record => {
    const recordDate = record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date)
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
    return recordDay.getTime() === todayStart.getTime() && record.present === true
  }).length

  const attendanceRate = totalUsers > 0 ? Math.round((presentToday / totalUsers) * 100) : 0

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
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Attendance Management</h1>
              <p className="text-gray-400 mt-2 text-sm sm:text-base">Monitor and manage gym attendance, check-ins, and member activity</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                onClick={() => setShowAddPopup(true)}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-sm sm:text-base"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Record
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

            <Card className="bg-gray-800/50 border-gray-700 sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">Total Records</CardTitle>
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-lg sm:text-2xl font-bold text-white">{filteredRecords.length}</div>
                <p className="text-xs text-gray-400 mt-1">Attendance records</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by ID or Name..."
                    className="pl-10 bg-gray-700 border-gray-600 text-white h-10 sm:h-11"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <select 
                  className="bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 h-10 sm:h-11 text-sm"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="all">All Time</option>
                </select>

                <select 
                  className="bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 h-10 sm:h-11 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>

                <div className="text-right">
                  <p className="text-gray-400 text-sm py-2">
                    Total: {filteredRecords.length} {dateFilter === 'today' ? `of ${totalUsers}` : 'records'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Records Table */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-white text-sm sm:text-base">
                Attendance Records ({filteredRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {filteredRecords.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-400">
                <Activity className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                  {dateFilter === 'today' && attendanceRecords.length === 0 ? (
                    <p className="text-sm sm:text-base">No attendance records available for today.</p>
                  ) : (
                    <>
                      <p className="text-sm sm:text-base">No attendance records found for selected filters</p>
                      <p className="text-xs sm:text-sm mt-2">Try adjusting your filters or search term</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-3 text-gray-300 font-medium text-xs sm:text-sm">Member ID</th>
                        <th className="text-left p-3 text-gray-300 font-medium text-xs sm:text-sm">Name</th>
                        <th className="text-left p-3 text-gray-300 font-medium text-xs sm:text-sm">Date</th>
                        <th className="text-left p-3 text-gray-300 font-medium text-xs sm:text-sm">Check-in</th>
                        <th className="text-left p-3 text-gray-300 font-medium text-xs sm:text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((record) => {
                        const date = record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date)
                        const checkIn = record.check_in instanceof Timestamp ? record.check_in.toDate() : new Date(record.check_in)
                        
                        return (
                          <tr key={record.attendance_id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                            <td className="p-3">
                              <span className="text-gray-300 font-mono text-xs sm:text-sm">{record.user_id}</span>
                            </td>
                            <td className="p-3">
                              <div className="text-gray-300">
                                <p className="text-white font-medium text-xs sm:text-sm">{record.userName || 'Unknown'}</p>
                                {record.userEmail && (
                                  <p className="text-gray-400 text-xs hidden sm:block">{record.userEmail}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-gray-300 text-xs sm:text-sm">
                                {date.toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-gray-300 text-xs sm:text-sm">
                                {checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="p-3">
                              {record.present ? (
                                <Badge className="bg-green-600 flex items-center gap-1 text-xs">
                                  <CheckCircle className="w-3 h-3" />
                                  Present
                                </Badge>
                              ) : (
                                <Badge className="bg-red-600 flex items-center gap-1 text-xs">
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

        {/* Add Attendance Popup */}
        {showAddPopup && (
          <AttendanceAddPopup
            onClose={() => setShowAddPopup(false)}
            onAttendanceAdded={() => {
              toast.success('Attendance record added successfully')
            }}
          />
        )}
      </ReceptionDashboardLayout>
    </ProtectedRoute>
  )
}
