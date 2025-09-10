"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Hash, 
  Calendar, 
  Clock, 
  Trophy, 
  User, 
  Fingerprint,
  TrendingUp,
  CreditCard,
  CheckCircle,
  XCircle,
  Camera
} from "lucide-react"

interface MemberInfoCardProps {
  user: any
  currentMembership?: any
  membershipUpdated?: boolean
}

export function MemberInfoCard({ user, currentMembership, membershipUpdated }: MemberInfoCardProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date())

  // Update current time every minute for real-time days calculation
  useEffect(() => {
    // Only set up interval if we have an active membership with an end date
    if (!currentMembership?.endDate || currentMembership?.status !== "active") {
      return
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [currentMembership?.endDate, currentMembership?.status])

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    
    // Handle Firestore timestamp
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    
    // Handle regular Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    
    // Handle string dates
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    
    return 'N/A'
  }

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    
    // Handle Firestore timestamp
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    // Handle regular Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    return 'N/A'
  }

  const getRemainingMembershipDays = useMemo(() => {
    // Use currentMembership data instead of user.membership
    if (!currentMembership?.endDate) {
      if (currentMembership?.status === "pending") {
        return 'Pending Approval'
      } else if (currentMembership?.status === "rejected") {
        return 'Plan Rejected'
      } else {
        return 'No Active Plan'
      }
    }
    
    // Handle different date formats
    let endDate: Date
    if (currentMembership.endDate.seconds) {
      // Firestore timestamp
      endDate = new Date(currentMembership.endDate.seconds * 1000)
    } else if (currentMembership.endDate instanceof Date) {
      // Already a Date object
      endDate = currentMembership.endDate
    } else {
      // String date
      endDate = new Date(currentMembership.endDate)
    }
    
    // Use real-time current time for accurate calculation
    const now = currentTime
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // Handle different membership statuses
    if (currentMembership.status === "pending") {
      return 'Pending Approval'
    } else if (currentMembership.status === "rejected") {
      return 'Plan Rejected'
    } else if (currentMembership.status === "expired" || diffDays < 0) {
      return 'Expired'
    } else if (diffDays === 0) {
      return 'Last Day'
    } else if (diffDays === 1) {
      return '1 Day Left'
    } else {
      return `${diffDays} Days Left`
    }
  }, [currentMembership, currentTime])

  // TODO: Implement attendance streak calculation when attendance system is ready
  // const getAttendanceStreak = () => {
  //   // This will calculate consecutive days of gym attendance
  //   // For now, showing "Not Registered" as placeholder
  //   return 'Not Registered'
  // }

  return (
    <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
          <User className="h-5 w-5 text-orange-400" />
          <span>Member Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Member ID */}
          <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
            <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-xs sm:text-sm">Member ID</p>
              <p className="text-white font-mono font-semibold text-sm sm:text-base truncate">{user?.memberId || 'N/A'}</p>
            </div>
          </div>

          {/* Member Since */}
          <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-xs sm:text-sm">Member Since</p>
              <p className="text-white font-semibold text-sm sm:text-base">{formatDate(user?.memberSince)}</p>
            </div>
          </div>

          {/* Remaining Membership Days */}
          <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
            {(() => {
              const daysText = getRemainingMembershipDays
              let iconColor = "text-blue-400"
              let textColor = "text-white"
              
              if (daysText === "Pending Approval") {
                iconColor = "text-yellow-400"
                textColor = "text-yellow-300"
              } else if (daysText === "Plan Rejected" || daysText === "Expired") {
                iconColor = "text-red-400"
                textColor = "text-red-300"
              } else if (daysText === "No Active Plan") {
                iconColor = "text-gray-400"
                textColor = "text-gray-300"
              } else if (daysText === "Last Day" || daysText.includes("1 Day Left")) {
                iconColor = "text-orange-400"
                textColor = "text-orange-300"
              } else if (daysText.includes("Days Left")) {
                const days = parseInt(daysText.split(' ')[0])
                if (days <= 7) {
                  iconColor = "text-orange-400"
                  textColor = "text-orange-300"
                } else {
                  iconColor = "text-green-400"
                  textColor = "text-green-300"
                }
              }
              
              return (
                <>
                  <TrendingUp className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor} flex-shrink-0`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-400 text-xs sm:text-sm">Membership Days</p>
                    <p className={`${textColor} font-semibold text-sm sm:text-base transition-all duration-300 ${daysText.includes('Days Left') || daysText === 'Last Day' ? 'animate-pulse' : ''}`}>
                      {daysText}
                      {daysText.includes('Days Left') && (
                        <span className="ml-1 text-xs opacity-70">⏰</span>
                      )}
                    </p>
                  </div>
                </>
              )
            })()}
          </div>

          {/* Last Login */}
          <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-xs sm:text-sm">Last Login</p>
              <p className="text-white font-semibold text-sm sm:text-base">{formatDateTime(user?.lastLoginAt)}</p>
            </div>
          </div>

          {/* Attendance Streak */}
          <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-xs sm:text-sm">Attendance Streak</p>
              <Badge className="bg-orange-600 hover:bg-orange-700 text-white text-xs">
                Not Registered
              </Badge>
            </div>
          </div>

          {/* Membership Status */}
          <div className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-300 ${
            membershipUpdated && currentMembership?.status === "active" 
              ? "bg-green-500/20 border border-green-500/30" 
              : "bg-gray-700/30"
          }`}>
            <CreditCard className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 ${
              membershipUpdated && currentMembership?.status === "active" 
                ? "text-green-400 animate-pulse" 
                : "text-blue-400"
            }`} />
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-xs sm:text-sm">Membership</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge 
                  className={
                    currentMembership?.status === "active" 
                      ? "bg-green-600 hover:bg-green-700 text-white text-xs"
                      : currentMembership?.status === "pending"
                      ? "bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                      : currentMembership?.status === "expired"
                      ? "bg-red-600 hover:bg-red-700 text-white text-xs"
                      : currentMembership?.status === "rejected"
                      ? "bg-red-600 hover:bg-red-700 text-white text-xs"
                      : "bg-gray-600 hover:bg-gray-700 text-white text-xs"
                  }
                >
                  {currentMembership?.status === "active" 
                    ? `${currentMembership.planType} - Active`
                    : currentMembership?.status === "pending"
                    ? `${currentMembership.planType} - Pending`
                    : currentMembership?.status === "expired"
                    ? `${currentMembership.planType} - Expired`
                    : currentMembership?.status === "rejected"
                    ? `${currentMembership.planType} - Rejected`
                    : 'No Plan'
                  }
                </Badge>
                {currentMembership?.registrationFee && (
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                    +Reg Fee
                  </Badge>
                )}
                {membershipUpdated && currentMembership?.status === "active" && (
                  <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs animate-pulse">
                    ✓ Updated
                  </Badge>
                )}
              </div>
              {currentMembership && (
                <p className="text-gray-400 text-xs mt-1">
                  Amount: Rs. {currentMembership.amount?.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Fingerprint Status */}
          <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
            <Fingerprint className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-xs sm:text-sm">Fingerprint</p>
              <Badge 
                className={
                  user?.fingerprintId 
                    ? "bg-green-600 hover:bg-green-700 text-white text-xs"
                    : "bg-gray-600 hover:bg-gray-700 text-white text-xs"
                }
              >
                {user?.fingerprintId ? 'Enrolled' : 'Not Enrolled'}
              </Badge>
            </div>
          </div>

          {/* Profile Image Status */}
          <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
            <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-xs sm:text-sm">Profile Image</p>
              <Badge 
                className={
                  user?.profileImageUrl 
                    ? "bg-green-600 hover:bg-green-700 text-white text-xs"
                    : "bg-orange-600 hover:bg-orange-700 text-white text-xs"
                }
              >
                {user?.profileImageUrl ? 'Uploaded' : 'Not Set'}
              </Badge>
            </div>
          </div>
         </div>



        {/* Membership Details */}
        {user?.membership && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-3 sm:mb-4">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              <h3 className="text-white font-semibold text-sm sm:text-base">Membership Details</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Plan</p>
                <p className="text-white font-semibold text-sm sm:text-base">{user.membership.planName || 'Standard Plan'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Type</p>
                <p className="text-white font-semibold text-sm sm:text-base">{user.membership.planType || 'Monthly'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Start Date</p>
                <p className="text-white font-semibold text-sm sm:text-base">
                  {formatDate(user.membership.startDate)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">End Date</p>
                <p className="text-white font-semibold text-sm sm:text-base">
                  {formatDate(user.membership.endDate)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Price</p>
                <p className="text-white font-semibold text-sm sm:text-base">${user.membership.price || '0'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Status</p>
                <div className="flex items-center space-x-2">
                  {user.membership.status === "active" ? (
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                  ) : user.membership.status === "expired" ? (
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                  ) : user.membership.status === "cancelled" ? (
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  ) : (
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400" />
                  )}
                  <span className="text-white font-semibold text-sm sm:text-base capitalize">{user.membership.status || 'none'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MemberInfoCard
