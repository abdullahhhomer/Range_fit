"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import CustomerDashboardLayout from "@/components/customer-dashboard-layout"
import Link from "next/link"
import { onUserDataChange, onUserMembershipChange, type MembershipPlan } from "@/lib/firebase"
import MemberInfoCard from "@/components/member-info-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getProfileImageUrl } from "@/lib/cloudinary-client"
import { toast } from "sonner"

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [currentMembership, setCurrentMembership] = useState<MembershipPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [membershipUpdated, setMembershipUpdated] = useState(false)

  useEffect(() => {
    if (user?.uid) {
      // Set up real-time listener for user data
      const unsubscribeUserData = onUserDataChange(user.uid, (userData) => {
        if (userData) {
          setUserProfile(userData)
          setLoading(false)
        }
      })

      // Set up real-time listener for membership data
      const unsubscribeMembership = onUserMembershipChange(user.uid, (membershipData) => {
        console.log('🔄 Membership data updated:', membershipData)
        setCurrentMembership(membershipData)
        
        // Show notification when membership status changes
        if (membershipData?.status === 'active') {
          console.log('✅ Membership activated:', membershipData.planType)
          setMembershipUpdated(true)
          toast.success(`🎉 Your ${membershipData.planType} membership has been activated!`)
          // Hide the notification after 5 seconds
          setTimeout(() => setMembershipUpdated(false), 5000)
        }
      })

      return () => {
        unsubscribeUserData()
        unsubscribeMembership()
      }
    }
  }, [user?.uid, toast])

  // Helper function to check if profile is complete (same logic as auth context)
  const checkProfileCompletion = (userData: any): boolean => {
    return !!(
      userData?.name?.trim() &&
      userData?.cnic?.trim() &&
      userData?.phone?.trim() &&
      userData?.phone?.length === 11 &&
      userData?.gender &&
      userData?.address?.trim() &&
      userData?.profileImageUrl
    )
  }

  // Check profile completion status
  const isProfileIncomplete = userProfile && !checkProfileCompletion(userProfile)

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Not set"
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }





  if (loading) {
    return (
      <CustomerDashboardLayout>
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <div className="text-sm sm:text-base">Loading dashboard...</div>
            </div>
          </div>
        </div>
      </CustomerDashboardLayout>
    )
  }

  return (
    <CustomerDashboardLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Welcome Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-orange-500 flex-shrink-0">
              <AvatarImage 
                src={userProfile?.profileImageUrl ? getProfileImageUrl(userProfile.profileImageUrl, 200) : undefined} 
                alt={`${userProfile?.name || user?.name}'s profile picture`}
              />
              <AvatarFallback className="bg-orange-500 text-white text-xl sm:text-2xl font-semibold">
                {(userProfile?.name || user?.name)?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
              <p className="text-gray-400 text-sm sm:text-base">Welcome back, {userProfile?.name || user?.name}! Here's your fitness summary.</p>
            </div>
          </div>
        </div>

        {isProfileIncomplete && (
          <Alert className="mb-6 bg-orange-500/10 border-orange-500/50 text-orange-300">
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
              <div className="flex items-start sm:items-center space-x-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-sm sm:text-base">Profile not complete. Please add your profile picture and complete all required information.</span>
              </div>
              <Link href="/customer/dashboard/profile" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto border-orange-500/50 text-orange-400 hover:bg-orange-500/10 bg-transparent sm:ml-4"
                >
                  Complete Profile
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Member Information Card */}
        <MemberInfoCard user={userProfile} currentMembership={currentMembership} membershipUpdated={membershipUpdated} />
      </div>
    </CustomerDashboardLayout>
  )
}
