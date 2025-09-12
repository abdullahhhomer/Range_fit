"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import CustomerDashboardLayout from "@/components/customer-dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, Shield, Search, Download, Filter } from "lucide-react"
import { getUserAttendance, type AttendanceRecord } from "@/lib/firebase"

export default function AttendancePage() {
  const { user } = useAuth()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "verified" | "manual">("all")

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!user?.uid) return

      try {
        setLoading(true)
        const records = await getUserAttendance(user.uid)
        setAttendanceRecords(records)
        setFilteredRecords(records)
      } catch (error) {
        console.error("Error fetching attendance data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAttendanceData()
  }, [user?.uid])

  useEffect(() => {
    let filtered = attendanceRecords

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((record) => {
        const dateStr = new Date(record.date).toLocaleDateString()
        const timeStr = record.time
        return dateStr.includes(searchTerm) || timeStr.includes(searchTerm)
      })
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((record) => {
        if (filterType === "verified") return record.fingerprintVerified
        if (filterType === "manual") return !record.fingerprintVerified
        return true
      })
    }

    setFilteredRecords(filtered)
  }, [attendanceRecords, searchTerm, filterType])

  const getAttendanceStats = () => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const thisWeek = attendanceRecords.filter((record) => new Date(record.date) >= oneWeekAgo).length
    const thisMonth = attendanceRecords.filter((record) => new Date(record.date) >= oneMonthAgo).length
    const verified = attendanceRecords.filter((record) => record.fingerprintVerified).length

    return {
      total: attendanceRecords.length,
      thisWeek,
      thisMonth,
      verified,
    }
  }

  const stats = getAttendanceStats()

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (time: string) => {
    return time
  }

  const exportAttendance = () => {
    // Create CSV content
    const headers = ["Date", "Time", "Verification Type"]
    const csvContent = [
      headers.join(","),
      ...filteredRecords.map((record) =>
        [
          new Date(record.date).toLocaleDateString(),
          record.time,
          record.fingerprintVerified ? "Fingerprint Verified" : "Manual Entry",
        ].join(","),
      ),
    ].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendance-records-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <CustomerDashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white">Loading attendance records...</div>
          </div>
        </div>
      </CustomerDashboardLayout>
    )
  }

  return (
    <CustomerDashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Attendance Records</h1>
          <p className="text-gray-400">Track your gym visits and attendance history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Visits</CardTitle>
              <Calendar className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <p className="text-xs text-gray-400">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">This Week</CardTitle>
              <Clock className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.thisWeek}</div>
              <p className="text-xs text-gray-400">Last 7 days</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.thisMonth}</div>
              <p className="text-xs text-gray-400">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Verified</CardTitle>
              <Shield className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.verified}</div>
              <p className="text-xs text-gray-400">Fingerprint verified</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-white flex items-center space-x-2">
                <Filter className="h-5 w-5 text-orange-400" />
                <span>Filter & Search</span>
              </CardTitle>
              <Button
                onClick={exportAttendance}
                variant="outline"
                className="w-full sm:w-auto border-orange-500/50 text-orange-400 hover:bg-orange-500/10 bg-transparent"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by date or time..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white pl-10"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  onClick={() => setFilterType("all")}
                  className={
                    filterType === "all"
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400"
                  }
                >
                  All
                </Button>
                <Button
                  variant={filterType === "verified" ? "default" : "outline"}
                  onClick={() => setFilterType("verified")}
                  className={
                    filterType === "verified"
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400"
                  }
                >
                  Verified
                </Button>
                <Button
                  variant={filterType === "manual" ? "default" : "outline"}
                  onClick={() => setFilterType("manual")}
                  className={
                    filterType === "manual"
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400"
                  }
                >
                  Manual
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Records Table */}
        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Attendance History ({filteredRecords.length} records)</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-300 py-3 px-4">Date</th>
                      <th className="text-left text-gray-300 py-3 px-4">Time</th>
                      <th className="text-left text-gray-300 py-3 px-4">Verification</th>
                      <th className="text-left text-gray-300 py-3 px-4">Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, index) => (
                      <tr key={record.id || index} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                        <td className="text-white py-4 px-4">
                          {new Date(record.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="text-white py-4 px-4 font-mono">{formatTime(record.time)}</td>
                        <td className="py-4 px-4">
                          <Badge
                            className={`${
                              record.fingerprintVerified
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            }`}
                          >
                            {record.fingerprintVerified ? "Fingerprint" : "Manual"}
                          </Badge>
                        </td>
                        <td className="text-gray-400 py-4 px-4">
                          {new Date(record.date).toLocaleDateString("en-US", { weekday: "long" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No attendance records found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm || filterType !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Your gym visits will appear here once you check in"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerDashboardLayout>
  )
}
