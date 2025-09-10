"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import ReceptionDashboardLayout from '@/components/reception-dashboard-layout'
import MembershipApprovalPopup from '@/components/admin/membership-approval-popup'
import MembershipEditPopup from '@/components/admin/membership-edit-popup'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Search, 
  Edit,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  ChevronDown,
  CreditCard
} from 'lucide-react'
import { toast } from 'sonner'
import { collection, onSnapshot, query, orderBy, updateDoc, doc, where, getDocs, deleteDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db, onAllMembershipsChange, onPendingMembershipsChange, updateMembershipStatus, createMembership, addPaymentRecord, updateExistingMembership, addPaymentRecordWithRetention, addVisitorWithMonthTracking, updateUserDocument, createReceipt, type MembershipPlan } from '@/lib/firebase'
import { getProfileImageUrl } from '@/lib/cloudinary-client'
import { Timestamp } from 'firebase/firestore'

interface MembershipData {
  uid: string
  memberId?: string
  email: string
  name: string
  phone?: string
  role: "customer"
  status: "active" | "inactive"
  createdAt: Date
  lastLoginAt?: Date
  profileImageUrl?: string
  membershipExpiryDate?: Date
  membershipRenewalDate?: Date
  membershipStatus?: "active" | "pending" | "expired" | "no_plan"
  lastRenewalReminder?: Date
  membershipPlan?: string
  membershipAmount?: number
  membershipStartDate?: Date
  registrationFee?: boolean
  totalAmount?: number
  isVisitor?: boolean
  visitorName?: string
  visitorPhone?: string
}

interface MembershipRequest extends MembershipPlan {
  id: string
  uid: string
  planType: string
  amount: number
  paymentMethod?: string
  transactionId?: string
  startDate?: Date
  endDate?: Date
  createdAt: Date | Timestamp
  registrationFee?: boolean
  userData?: any
}

// Membership plans with prices
const MEMBERSHIP_PLANS = [
  {
    id: "visitor",
    name: "Visitor Trial",
    price: 500,
    period: "1 day",
    description: "One-time trial visit"
  },
  {
    id: "strength",
    name: "Strength Training",
    price: 5000,
    period: "1 month",
    description: "Build muscle and strength"
  },
  {
    id: "cardio",
    name: "Cardio Training",
    price: 5000,
    period: "1 month",
    description: "Improve endurance and cardiovascular health"
  },
  {
    id: "combo",
    name: "Strength + Cardio",
    price: 7500,
    period: "1 month",
    description: "Complete fitness package"
  }
]

const REGISTRATION_FEE = 5000

export default function ReceptionMembershipsManagement() {
  const { user: currentUser } = useAuth()
  const [memberships, setMemberships] = useState<MembershipData[]>([])
  const [filteredMemberships, setFilteredMemberships] = useState<MembershipData[]>([])
  const [membershipRequests, setMembershipRequests] = useState<MembershipRequest[]>([])
  const [pendingRequests, setPendingRequests] = useState<MembershipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [membershipTypeFilter, setMembershipTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [membershipTypeDropdownOpen, setMembershipTypeDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [showVisitorsOnly, setShowVisitorsOnly] = useState(false)
  const [selectedMembership, setSelectedMembership] = useState<MembershipData | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<MembershipRequest | null>(null)
  const [showEditPopup, setShowEditPopup] = useState(false)
  const [showApprovalPopup, setShowApprovalPopup] = useState(false)
  const [showAddVisitorPopup, setShowAddVisitorPopup] = useState(false)
  const [visitorFormData, setVisitorFormData] = useState({
    name: '',
    phone: ''
  })

  // Function to format phone number with space after 4 digits
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '')
    
    // Limit to 11 digits
    const limitedDigits = digitsOnly.slice(0, 11)
    
    // Add space after 4 digits
    if (limitedDigits.length > 4) {
      return `${limitedDigits.slice(0, 4)} ${limitedDigits.slice(4)}`
    }
    
    return limitedDigits
  }

  // Function to handle phone number input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value)
    setVisitorFormData({ ...visitorFormData, phone: formattedValue })
  }
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [usersData, setUsersData] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    setLoading(true)

    // Set up real-time listener for all membership requests
    const unsubscribeRequests = onAllMembershipsChange((requests) => {
      setMembershipRequests(requests)
      console.log('📊 All membership requests:', requests.length)
    })

    // Set up real-time listener for pending membership requests
    const unsubscribePending = onPendingMembershipsChange((pending) => {
      setPendingRequests(pending)
      console.log('📊 Pending membership requests:', pending.length)
      console.log('📊 Pending requests with user data:', pending.map(req => ({
        id: req.id,
        uid: req.uid,
        planType: req.planType,
        userData: req.userData ? {
          name: req.userData.name,
          email: req.userData.email,
          phone: req.userData.phone,
          memberId: req.userData.memberId,
          status: req.userData.status,
          accountStatus: req.userData.accountStatus,
          role: req.userData.role,
          createdAt: req.userData.createdAt,
          lastLoginAt: req.userData.lastLoginAt
        } : 'No user data'
      })))
    })

    // Fetch ALL users from users collection for real-time updates
    const usersQuery = query(
      collection(db, 'users'), 
      where('role', '==', 'customer')
    )
    
    const membershipsQuery = query(
      collection(db, 'memberships'),
      orderBy('createdAt', 'desc')
    )
    
    let currentUsersData = new Map()
    let currentMembershipsData = new Map()
    
    // Listen to users collection
    const unsubscribeUsers = onSnapshot(usersQuery, (usersSnapshot) => {
      currentUsersData.clear()
      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        if (userData.role === 'customer') {
          currentUsersData.set(doc.id, userData)
        }
      })
      
      // Store users data for later use
      setUsersData(currentUsersData)
    }, (error) => {
      console.error('❌ Error fetching users:', error)
    })
    
    // Listen to memberships collection
    const unsubscribeMemberships = onSnapshot(membershipsQuery, (membershipsSnapshot) => {
      try {
        currentMembershipsData.clear()
        membershipsSnapshot.forEach((doc) => {
          const membershipData = doc.data()
          currentMembershipsData.set(membershipData.uid, {
            id: doc.id,
            ...membershipData
          })
        })
        
        // Combine users and memberships data
        const membershipsData: MembershipData[] = []
        
        // First, add all users with their membership data if they have any
        currentUsersData.forEach((userData, userId) => {
          const membershipData = currentMembershipsData.get(userId)
          
          if (membershipData) {
            // User has membership data
            const membership: MembershipData = {
              uid: userId,
              memberId: userData.memberId || `RF-${userId.slice(-6)}`,
              email: userData.email || '',
              name: userData.name || userData.displayName || 'Unknown User',
              phone: userData.phone || '',
              role: userData.role || "customer",
              status: userData.status || 'active',
              createdAt: userData.createdAt?.toDate() || new Date(),
              lastLoginAt: userData.lastLoginAt?.toDate(),
              profileImageUrl: userData.profileImageUrl || userData.photoURL || '',
              // Use membership collection data for these fields (real-time)
              membershipExpiryDate: membershipData.endDate?.toDate(),
              membershipRenewalDate: membershipData.updatedAt?.toDate(),
              membershipStatus: membershipData.status || 'pending',
              lastRenewalReminder: membershipData.updatedAt?.toDate(),
              membershipPlan: membershipData.planType || '',
              membershipAmount: membershipData.amount || 0,
              membershipStartDate: membershipData.startDate?.toDate(),
              registrationFee: membershipData.registrationFee || false,
              totalAmount: membershipData.amount || 0,
              // Visitor-specific fields
              isVisitor: membershipData.isVisitor || false,
              visitorName: membershipData.visitorName || '',
              visitorPhone: membershipData.visitorPhone || ''
            }
            membershipsData.push(membership)
          } else {
            // User exists but has no membership - show as "Pending" (waiting for plan assignment)
            const membership: MembershipData = {
              uid: userId,
              memberId: userData.memberId || `RF-${userId.slice(-6)}`,
              email: userData.email || '',
              name: userData.name || userData.displayName || 'Unknown User',
              phone: userData.phone || '',
              role: userData.role || "customer",
              status: userData.status || 'active',
              createdAt: userData.createdAt?.toDate() || new Date(),
              lastLoginAt: userData.lastLoginAt?.toDate(),
              profileImageUrl: userData.profileImageUrl || userData.photoURL || '',
              // No membership data - show as pending
              membershipExpiryDate: undefined,
              membershipRenewalDate: undefined,
              membershipStatus: 'pending',
              lastRenewalReminder: undefined,
              membershipPlan: '',
              membershipAmount: 0,
              membershipStartDate: undefined,
              registrationFee: false,
              totalAmount: 0,
              // Not a visitor
              isVisitor: false,
              visitorName: '',
              visitorPhone: ''
            }
            membershipsData.push(membership)
          }
        })
        
        // Then add any visitors from memberships collection that don't have user records
        currentMembershipsData.forEach((membershipData, membershipId) => {
          if (membershipData.isVisitor && !currentUsersData.has(membershipId)) {
            const membership: MembershipData = {
              uid: membershipId,
              memberId: `VISITOR-${membershipId.slice(-6)}`,
              email: '',
              name: membershipData.visitorName || 'Unknown Visitor',
              phone: membershipData.visitorPhone || '',
              role: "customer",
              status: 'active',
              createdAt: membershipData.createdAt?.toDate() || new Date(),
              lastLoginAt: undefined,
              profileImageUrl: '',
              // Use membership collection data
              membershipExpiryDate: membershipData.endDate?.toDate(),
              membershipRenewalDate: membershipData.updatedAt?.toDate(),
              membershipStatus: membershipData.status || 'pending',
              lastRenewalReminder: membershipData.updatedAt?.toDate(),
              membershipPlan: membershipData.planType || '',
              membershipAmount: membershipData.amount || 0,
              membershipStartDate: membershipData.startDate?.toDate(),
              registrationFee: membershipData.registrationFee || false,
              totalAmount: membershipData.amount || 0,
              // Visitor-specific fields
              isVisitor: true,
              visitorName: membershipData.visitorName || '',
              visitorPhone: membershipData.visitorPhone || ''
            }
            membershipsData.push(membership)
          }
        })
        
        setMemberships(membershipsData)
        setLoading(false)
      } catch (error) {
        console.error('❌ Error processing memberships data:', error)
        toast.error('Failed to process memberships data')
        setLoading(false)
      }
    }, (error) => {
      console.error('❌ Error fetching memberships:', error)
      toast.error('Failed to load memberships')
      setLoading(false)
    })

    return () => {
      unsubscribeRequests()
      unsubscribePending()
      unsubscribeUsers()
      unsubscribeMemberships()
    }
  }, [])

  useEffect(() => {
    filterMemberships()
  }, [memberships, searchTerm, membershipTypeFilter, statusFilter, refreshTrigger, showVisitorsOnly])

  // Real-time countdown timer for days/hours remaining - update every 3 seconds for precise countdown
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update days/hours remaining
      setRefreshTrigger(prev => prev + 1)
      
      // Check for expired memberships and update their status
      checkAndUpdateExpiredMemberships()
    }, 3000) // Update every 3 seconds for very frequent updates

    return () => clearInterval(interval)
  }, [])

  // Function to check and update expired memberships
  const checkAndUpdateExpiredMemberships = async () => {
    try {
      const now = new Date()
      const expiredMemberships = memberships.filter(membership => {
        if (!membership.membershipExpiryDate) return false
        return membership.membershipExpiryDate < now && membership.status === 'active'
      })

      if (expiredMemberships.length > 0) {
        console.log(`🔄 Found ${expiredMemberships.length} expired memberships, updating status...`)
        
        // Update expired memberships in batches
        for (const membership of expiredMemberships) {
          try {
            const membershipRef = collection(db, "memberships")
            const q = query(membershipRef, where("uid", "==", membership.uid))
            const querySnapshot = await getDocs(q)
            
            if (!querySnapshot.empty) {
              const membershipDoc = querySnapshot.docs[0]
              await updateDoc(doc(db, "memberships", membershipDoc.id), {
                status: "expired",
                updatedAt: serverTimestamp()
              })
            }
          } catch (error) {
            console.error(`Error updating expired membership for ${membership.uid}:`, error)
          }
        }
      }
    } catch (error) {
      console.error("Error checking expired memberships:", error)
    }
  }


  const filterMemberships = () => {
    let filtered = memberships

    if (searchTerm) {
      filtered = filtered.filter(membership => 
        membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        membership.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (membership.memberId && membership.memberId.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (membershipTypeFilter !== 'all') {
      filtered = filtered.filter(membership => membership.membershipPlan === membershipTypeFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(membership => membership.status === statusFilter)
    }

    // Filter by visitor status
    if (showVisitorsOnly) {
      filtered = filtered.filter(membership => membership.isVisitor)
    } else {
      filtered = filtered.filter(membership => !membership.isVisitor)
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    setFilteredMemberships(filtered)
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
          <X className="w-3 h-3" />
          No Plan
        </Badge>
      default:
        return <Badge className="bg-gray-600">{realStatus}</Badge>
    }
  }

  const getDaysUntilExpiry = (expiryDate: Date, isVisitor: boolean = false) => {
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    
    if (isVisitor) {
      // For visitors, return hours with decimal precision for more accurate countdown
      const diffHours = diffTime / (1000 * 60 * 60)
      return Math.ceil(diffHours) // Don't use Math.max(0, ...) to allow negative values for expired
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

  const handleEditMembership = (membership: MembershipData) => {
    setSelectedMembership(membership)
    setShowEditPopup(true)
  }

  // Handle filter changes
  const handleMembershipTypeFilterChange = (value: string) => {
    setMembershipTypeFilter(value)
    // Close dropdown after a small delay to ensure smooth animation
    setTimeout(() => setMembershipTypeDropdownOpen(false), 100)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    // Close dropdown after a small delay to ensure smooth animation
    setTimeout(() => setStatusDropdownOpen(false), 100)
  }

  // Handle dropdown open/close
  const handleMembershipTypeDropdownToggle = () => {
    setMembershipTypeDropdownOpen(!membershipTypeDropdownOpen)
    // Close other dropdown when opening this one
    if (!membershipTypeDropdownOpen) {
      setStatusDropdownOpen(false)
    }
  }

  const handleStatusDropdownToggle = () => {
    setStatusDropdownOpen(!statusDropdownOpen)
    // Close other dropdown when opening this one
    if (!statusDropdownOpen) {
      setMembershipTypeDropdownOpen(false)
    }
  }

  // Handle dropdown close when clicking outside
  const handleMembershipTypeDropdownClose = () => {
    setMembershipTypeDropdownOpen(false)
  }

  const handleStatusDropdownClose = () => {
    setStatusDropdownOpen(false)
  }

  // Close dropdowns when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Element
    if (!target.closest('.dropdown-container')) {
      setMembershipTypeDropdownOpen(false)
      setStatusDropdownOpen(false)
    }
  }

  // Add click outside listener
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle membership approval - moved to MembershipApprovalPopup component
  // Handle membership rejection - moved to MembershipApprovalPopup component

  const openApprovalPopup = async (request: MembershipRequest) => {
    console.log('🔍 Opening approval popup for request:', {
      id: request.id,
      uid: request.uid,
      planType: request.planType,
      userData: request.userData ? {
        name: request.userData.name,
        email: request.userData.email,
        phone: request.userData.phone,
        memberId: request.userData.memberId,
        status: request.userData.status,
        accountStatus: request.userData.accountStatus,
        role: request.userData.role,
        createdAt: request.userData.createdAt,
        lastLoginAt: request.userData.lastLoginAt
      } : 'No user data'
    })
    
    // Fetch fresh user data from users collection
    try {
      const userDoc = await getDoc(doc(db, 'users', request.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        // Update the request with fresh user data
        const updatedRequest = {
          ...request,
          userData: {
            ...userData,
            createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
            lastLoginAt: userData.lastLoginAt?.toDate?.() || userData.lastLoginAt
          }
        }
        setSelectedRequest(updatedRequest)
        console.log('✅ Fetched fresh user data:', {
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          profileImageUrl: userData.profileImageUrl,
          memberId: userData.memberId
        })
      } else {
        console.warn('⚠️ User document not found for UID:', request.uid)
        setSelectedRequest(request)
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error)
      setSelectedRequest(request)
    }
    
    setShowApprovalPopup(true)
  }

  const closePopups = () => {
    setShowEditPopup(false)
    setShowApprovalPopup(false)
    setShowAddVisitorPopup(false)
    setSelectedMembership(null)
    setSelectedRequest(null)
    setVisitorFormData({ name: '', phone: '' })
  }

  const handleAddVisitor = async () => {
    if (!visitorFormData.name.trim() || !visitorFormData.phone.trim() || !currentUser?.uid) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      // Generate unique visitor ID
      const visitorId = `VISITOR${Date.now()}${Math.random().toString(36).substr(2, 6)}`
      
      // Generate transaction ID for tracking
      const transactionId = `VISITOR${Date.now()}${Math.random().toString(36).substr(2, 9)}`

                    // Create visitor membership with month tracking for financial reporting
       await addVisitorWithMonthTracking({
         uid: visitorId,
         visitorName: visitorFormData.name,
         visitorPhone: visitorFormData.phone,
         planType: "Visitor Trial",
         amount: 500,
         paymentMethod: "Cash",
         transactionId,
         startDate: new Date(),
         endDate: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
         isVisitor: true
       })

      // Create payment record for financial tracking
      await addPaymentRecordWithRetention({
        uid: visitorId,
        amount: 500,
        planType: "Visitor Trial",
        transactionId,
        paymentMethod: "Cash",
        status: "completed",
        userEmail: '',
        userName: visitorFormData.name,
      })
      
      toast.success(`Visitor ${visitorFormData.name} added successfully`)
      setShowAddVisitorPopup(false)
      setVisitorFormData({ name: '', phone: '' })
    } catch (error) {
      console.error('Error adding visitor:', error)
      toast.error('Failed to add visitor')
    }
  }

  const handleDeleteVisitor = async (membership: MembershipData) => {
    if (!currentUser?.uid) return

    if (!confirm(`Are you sure you want to delete visitor ${membership.name}? This will remove them from memberships but keep their payment record.`)) {
      return
    }

    try {
      // Delete the membership document (payment record remains)
      const membershipRef = doc(db, 'memberships', membership.uid)
      await deleteDoc(membershipRef)
      
      toast.success(`Visitor ${membership.name} deleted successfully`)
    } catch (error) {
      console.error('Error deleting visitor:', error)
      toast.error('Failed to delete visitor')
    }
  }

  const getPlanName = (planId: string) => {
    const plan = MEMBERSHIP_PLANS.find(p => p.id === planId)
    if (plan) return plan.name
    
    // Handle plan types from membership collection
    switch (planId) {
      case 'Strength Training':
        return 'Strength Training'
      case 'Cardio Training':
        return 'Cardio Training'
      case 'Strength + Cardio':
        return 'Strength + Cardio'
      default:
        return planId || 'No Plan'
    }
  }

  const getPlanPrice = (planId: string) => {
    const plan = MEMBERSHIP_PLANS.find(p => p.id === planId)
    return plan ? plan.price : 0
  }

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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                  <CreditCard className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Memberships Management
                </h1>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Manage active customer memberships and payments
              </p>
              <div className="flex justify-center">
                <Button 
                  onClick={() => setShowAddVisitorPopup(true)}
                  className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2 py-3 px-6 text-base"
                >
                  <Edit className="h-5 w-5" />
                  Add Visitors
                </Button>
              </div>
            </div>

                     {/* Pending Membership Requests */}
           {pendingRequests.length > 0 && (
             <Card className="bg-yellow-500/10 border-yellow-500/30">
               <CardHeader>
                 <CardTitle className="text-yellow-300 flex items-center space-x-2">
                   <Clock className="h-5 w-5" />
                   <span>Pending Membership Requests ({pendingRequests.length})</span>
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {pendingRequests.map((request) => {
                     // Get user data from the usersData map for this request
                     const userData = usersData.get(request.uid)
                     
                     return (
                       <div key={request.id} className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                         <div className="flex items-center space-x-3 mb-3">
                           <Avatar className="h-10 w-10">
                             <AvatarImage 
                               src={userData?.profileImageUrl ? getProfileImageUrl(userData.profileImageUrl, 80) : undefined} 
                               alt={`${userData?.name || 'User'}'s profile picture`}
                             />
                             <AvatarFallback className="bg-gray-600 text-white">
                               {userData?.name?.charAt(0) || 'U'}
                             </AvatarFallback>
                           </Avatar>
                           <div className="flex-1">
                             <p className="text-white font-medium">{userData?.name || 'Unknown User'}</p>
                             <p className="text-gray-400 text-sm">{userData?.email}</p>
                             <p className="text-gray-400 text-xs">
                               {userData?.phone ? 
                                 formatPhoneNumber(userData.phone) : 
                                 'No phone provided'
                               }
                             </p>
                           </div>
                         </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Plan:</span>
                          <span className="text-white">{request.planType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount:</span>
                          <span className="text-white">Rs. {request.amount?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Payment:</span>
                          <span className="text-white">{request.paymentMethod || 'Cash'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Requested:</span>
                          <span className="text-white text-sm">
                            {request.createdAt ? 
                              (() => {
                                // Handle Firestore Timestamp conversion
                                let date: Date;
                                if (request.createdAt instanceof Timestamp) {
                                  date = request.createdAt.toDate();
                                } else if (request.createdAt instanceof Date) {
                                  date = request.createdAt;
                                } else {
                                  date = new Date(request.createdAt);
                                }
                                return date && !isNaN(date.getTime()) ? 
                                  date.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'Unknown';
                              })() : 'Unknown'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => openApprovalPopup(request)}
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                   <Input
                     placeholder="Search members..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-10 bg-gray-700 border-gray-600 text-white"
                   />
                 </div>

                 <div className="relative dropdown-container">
                   <select
                     value={membershipTypeFilter}
                     onChange={(e) => handleMembershipTypeFilterChange(e.target.value)}
                     onClick={handleMembershipTypeDropdownToggle}
                     onBlur={handleMembershipTypeDropdownClose}
                     className="bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 appearance-none cursor-pointer w-full"
                   >
                     <option value="all">All Membership Types</option>
                     <option value="strength">Strength Training</option>
                     <option value="cardio">Cardio Training</option>
                     <option value="combo">Strength + Cardio</option>
                   </select>
                   <ChevronDown 
                     className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${
                       membershipTypeDropdownOpen ? 'rotate-180' : ''
                     }`}
                   />
                 </div>

                 <div className="relative dropdown-container">
                   <select
                     value={statusFilter}
                     onChange={(e) => handleStatusFilterChange(e.target.value)}
                     onClick={handleStatusDropdownToggle}
                     onBlur={handleStatusDropdownClose}
                     className="bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 appearance-none cursor-pointer w-full"
                   >
                     <option value="all">All Status</option>
                     <option value="active">Active</option>
                     <option value="inactive">Inactive</option>
                   </select>
                   <ChevronDown 
                     className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${
                       statusDropdownOpen ? 'rotate-180' : ''
                     }`}
                   />
                 </div>

                 <div className="flex items-center justify-center">
                   <Button
                     onClick={() => setShowVisitorsOnly(!showVisitorsOnly)}
                     variant={showVisitorsOnly ? "default" : "outline"}
                     className={`flex items-center gap-2 ${
                       showVisitorsOnly 
                         ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                         : 'border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white'
                     }`}
                   >
                     <Edit className="h-4 w-4" />
                     {showVisitorsOnly ? 'Visitors' : 'Customers'}
                   </Button>
                 </div>

                 <div className="text-right">
                   <p className="text-gray-400 text-sm">
                     Total: {filteredMemberships.length} of {showVisitorsOnly ? memberships.filter(m => m.isVisitor).length : memberships.filter(m => !m.isVisitor).length}
                   </p>
                 </div>
               </div>
            </CardContent>
          </Card>

          {/* Memberships Table */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                {showVisitorsOnly ? 'Visitor Memberships' : 'Customer Memberships'} ({filteredMemberships.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-300 font-medium">Member</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Member ID</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Membership Status</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Plan</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Amount</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Expiry Date</th>
                      <th className="text-left p-3 text-gray-300 font-medium">
                        {showVisitorsOnly ? 'Time Remaining' : 'Days Remaining'}
                      </th>
                      <th className="text-left p-3 text-gray-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                                         {filteredMemberships.map((membership) => {
                       const realTimeStatus = getRealTimeStatus(membership.membershipExpiryDate, membership.isVisitor)

                       return (
                        <tr key={membership.uid} className="border-b border-gray-700/50 hover:bg-gray-700/30">
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
                                 <p className="text-white font-medium">{membership.name}</p>
                                 {!membership.isVisitor && membership.email && (
                                   <p className="text-gray-400 text-xs">{membership.email}</p>
                                 )}
                                 {membership.isVisitor && membership.visitorPhone && (
                                   <p className="text-gray-400 text-xs">{membership.visitorPhone}</p>
                                 )}
                               </div>
                            </div>
                          </td>
                                                     <td className="p-3">
                             <span className="text-gray-300 font-mono">
                               {membership.isVisitor ? 'VISITOR' : membership.memberId}
                             </span>
                           </td>
                                                     <td className="p-3">
                             {getMembershipStatusBadge(membership.membershipStatus || 'pending', membership.membershipExpiryDate, membership.isVisitor)}
                           </td>
                                                     <td className="p-3">
                             <div className="text-gray-300">
                               {membership.membershipPlan ? (
                                 <span className="text-sm font-medium">
                                   {getPlanName(membership.membershipPlan)}
                                 </span>
                               ) : (
                                 <span className="text-gray-500 text-sm">
                                   No Plan (Debug: {membership.membershipPlan || 'undefined'})
                                 </span>
                               )}
                             </div>
                           </td>
                                                     <td className="p-3">
                             <div className="text-gray-300">
                               {membership.totalAmount ? (
                                 <div className="flex items-center space-x-2">
                                   <span className="text-sm font-medium">
                                     Rs. {membership.totalAmount.toLocaleString()}
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
                              {!membership.isVisitor && membership.membershipExpiryDate ? (
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className="text-sm">
                                    {membership.membershipExpiryDate.toLocaleDateString()}
                                  </span>
                                </div>
                              ) : membership.isVisitor ? (
                                <span className="text-gray-500 text-sm">Trial Visit</span>
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
                                                     <td className="p-3">
                             <div className="flex gap-2">
                               {membership.isVisitor ? (
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => handleDeleteVisitor(membership)}
                                   className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                 >
                                   <XCircle className="h-4 w-4" />
                                 </Button>
                               ) : (
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => handleEditMembership(membership)}
                                   className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                 >
                                   <Edit className="h-4 w-4" />
                                 </Button>
                               )}
                             </div>
                           </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

         {/* Membership Edit Popup */}
         <MembershipEditPopup
           membership={selectedMembership}
           isOpen={showEditPopup}
           onClose={() => {
             setShowEditPopup(false)
             setSelectedMembership(null)
           }}
           onSuccess={() => {
             setShowEditPopup(false)
             setSelectedMembership(null)
           }}
           currentUserId={currentUser?.uid || ''}
         />

         {/* Membership Approval/Rejection Popup */}
         <MembershipApprovalPopup
           request={selectedRequest}
           isOpen={showApprovalPopup}
           onClose={() => {
             setShowApprovalPopup(false)
             setSelectedRequest(null)
           }}
           onSuccess={() => {
             setShowApprovalPopup(false)
             setSelectedRequest(null)
           }}
           currentUserId={currentUser?.uid || ''}
         />

         {/* Add Visitor Popup */}
         {showAddVisitorPopup && (
           <div 
             className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             onClick={closePopups}
           >
             <div 
               className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
               onClick={(e) => e.stopPropagation()}
             >
               <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between sticky top-0">
                 <h3 className="text-lg sm:text-xl font-bold text-white">Add Visitor</h3>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={closePopups}
                   className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-2 min-w-[40px] min-h-[40px]"
                 >
                   <X className="w-4 h-4" />
                 </Button>
               </div>
               
               <div className="p-4 space-y-4">
                 {/* Visitor Information */}
                 <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                   <label className="text-gray-300 text-sm font-medium mb-3 block">Visitor Information</label>
                   <div className="space-y-4">
                     <div>
                       <label className="text-gray-400 text-sm block mb-2">Name *</label>
                       <Input
                         placeholder="Enter visitor name"
                         value={visitorFormData.name}
                         onChange={(e) => setVisitorFormData({...visitorFormData, name: e.target.value})}
                         className="w-full h-12 px-4 bg-gray-700 border-gray-600 text-white text-base"
                       />
                     </div>
                     <div>
                       <label className="text-gray-400 text-sm block mb-2">Phone Number *</label>
                       <Input
                         placeholder="Enter phone number (e.g., 9876 543210)"
                         value={visitorFormData.phone}
                         onChange={handlePhoneChange}
                         maxLength={12} // 11 digits + 1 space
                         inputMode="numeric"
                         pattern="[0-9\s]*"
                         className="w-full h-12 px-4 bg-gray-700 border-gray-600 text-white text-base"
                       />
                     </div>
                   </div>
                 </div>

                 {/* Visitor Plan Details */}
                 <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                   <label className="text-gray-300 text-sm font-medium mb-3 block">Visitor Plan Details</label>
                   <div className="space-y-3">
                     <div className="flex justify-between items-center">
                       <span className="text-gray-400">Plan Type</span>
                       <span className="text-white font-semibold">Visitor Trial</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-gray-400">Duration</span>
                       <span className="text-white font-semibold">3 Hours</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-gray-400">Amount</span>
                       <span className="text-orange-400 font-bold text-lg">Rs. 500</span>
                     </div>
                     <div className="border-t border-gray-600 pt-3 mt-3">
                       <div className="flex justify-between items-center">
                         <span className="text-gray-400">Payment Method</span>
                         <span className="text-white font-semibold">Cash</span>
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Action Buttons */}
                 <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
                   <Button
                     onClick={handleAddVisitor}
                     disabled={!visitorFormData.name.trim() || !visitorFormData.phone.trim()}
                     className="flex-1 h-12 bg-orange-600 hover:bg-orange-700 text-white text-base font-semibold rounded-lg flex items-center justify-center gap-2"
                   >
                     <Edit className="h-5 w-5" />
                     Add Visitor
                   </Button>
                   <Button
                     variant="outline"
                     onClick={closePopups}
                     className="flex-1 h-12 border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white text-base rounded-lg"
                   >
                     Cancel
                   </Button>
                 </div>
               </div>
             </div>
           </div>
         )}
        </div>
      </ReceptionDashboardLayout>
    </ProtectedRoute>
  )
}
