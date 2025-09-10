"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import CustomerDashboardLayout from "@/components/customer-dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dumbbell, Heart, Users, Star, Check, CreditCard, AlertCircle, X } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  createMembershipRequest,
  addPaymentRecord,
  onUserMembershipChange,
  type MembershipPlan,
} from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function MembershipPlansPage() {
  const { user } = useAuth()
  const [currentMembership, setCurrentMembership] = useState<MembershipPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const plans = [
    {
      id: "strength",
      name: "Strength Training",
      price: 5000,
      description: "Build muscle and strength with our comprehensive weight training program",
      icon: Dumbbell,
      features: [
        { text: "Access to weight training area", included: true },
        { text: "Free weights and machines", included: true },
        { text: "Strength training programs", included: true },
        { text: "Expert guidance", included: true },
        { text: "Locker room access", included: true },
        { text: "Cardio equipment access", included: false },
        { text: "Treadmills, bikes, ellipticals", included: false },
        { text: "Endurance training", included: false }
      ],
      isOneTime: false,
      popular: false,
    },
    {
      id: "combo",
      name: "Strength + Cardio",
      price: 7500,
      description: "Complete fitness package combining strength and cardiovascular training",
      icon: Star,
      features: [
        { text: "Full gym access", included: true },
        { text: "All strength equipment", included: true },
        { text: "All cardio equipment", included: true },
        { text: "Locker room access", included: true }
      ],
      isOneTime: false,
      popular: true,
    },
    {
      id: "cardio",
      name: "Cardio Training",
      price: 5000,
      description: "Improve endurance and cardiovascular health with specialized cardio training",
      icon: Heart,
      features: [
        { text: "Cardio equipment access", included: true },
        { text: "Treadmills, bikes, ellipticals", included: true },
        { text: "Endurance training", included: true },
        { text: "Locker room access", included: true },
        { text: "Access to weight training area", included: false },
        { text: "Free weights and machines", included: false },
        { text: "Strength training programs", included: false },
        { text: "Expert guidance", included: false }
      ],
      isOneTime: false,
      popular: false,
    },
  ]

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      // Set up real-time listener for membership changes
      const unsubscribe = onUserMembershipChange(user.uid, (membershipData) => {
        console.log('Membership data received:', membershipData)
        setCurrentMembership(membershipData)
        setLoading(false)
      })

      // Cleanup listener on unmount
      return () => {
        try {
          if (unsubscribe) {
            unsubscribe()
          }
        } catch (error) {
          console.error('Error unsubscribing from membership listener:', error)
        }
      }
    } catch (error) {
      console.error('Error setting up membership listener:', error)
      toast.error('Failed to load membership data. Please refresh the page.')
      setLoading(false)
    }
  }, [user?.uid, toast])

  const handlePlanSelection = async (planId: string) => {
    if (!user?.uid) {
      toast.error("Please log in to select a plan")
      return
    }

    // Check if user already has a pending or active membership
    if (currentMembership && (currentMembership.status === "pending" || currentMembership.status === "active")) {
      toast.error(`You already have a ${currentMembership.status} membership. Please wait for admin approval or contact support.`)
      return
    }

    setProcessing(true)
    try {
      const selectedPlanData = plans.find((p) => p.id === planId)
      if (!selectedPlanData) {
        throw new Error("Plan not found")
      }

      // Generate transaction ID for tracking
      const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`

      // Create payment record
      await addPaymentRecord({
        uid: user.uid,
        amount: selectedPlanData.price,
        planType: selectedPlanData.name,
        transactionId,
        paymentMethod: "Cash",
        status: "pending",
      })

      // Create pending membership request
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1) // 1 month membership

      // Get complete user data from Firestore for the membership request
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      const userDataFromFirestore = userDoc.data()

      await createMembershipRequest({
        uid: user.uid,
        planType: selectedPlanData.name as any,
        amount: selectedPlanData.price,
        startDate,
        endDate,
        status: "pending",
        paymentMethod: "Cash",
        transactionId,
        userData: {
          name: userDataFromFirestore?.name || user.displayName || user.email?.split('@')[0] || 'Unknown User',
          email: userDataFromFirestore?.email || user.email || '',
          phone: userDataFromFirestore?.phone || user.phoneNumber || '',
          memberId: userDataFromFirestore?.memberId || user.memberId || `RF-${user.uid.slice(-6)}`,
          status: userDataFromFirestore?.status || 'active',
          accountStatus: userDataFromFirestore?.accountStatus || 'active',
          role: userDataFromFirestore?.role || 'customer',
          createdAt: userDataFromFirestore?.createdAt || (user.metadata?.creationTime ? new Date(user.metadata.creationTime) : new Date()),
          lastLoginAt: userDataFromFirestore?.lastLoginAt || (user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime) : new Date()),
          profileImageUrl: userDataFromFirestore?.profileImageUrl || null,
          fatherName: userDataFromFirestore?.fatherName || '',
          address: userDataFromFirestore?.address || '',
          gender: userDataFromFirestore?.gender || ''
        }
      })

      // Show success message
      toast.success("Plan selected successfully! Your membership is now pending admin approval. You will be notified once approved.")
    } catch (error) {
      console.error("Plan selection error:", error)
      toast.error("Failed to select plan. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  const getMembershipStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "pending":
        return "bg-yellow-500"
      case "expired":
        return "bg-red-500"
      case "rejected":
        return "bg-red-600"
      default:
        return "bg-gray-500"
    }
  }

  const getMembershipStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active"
      case "pending":
        return "Pending Approval"
      case "expired":
        return "Expired"
      case "rejected":
        return "Rejected"
      default:
        return "Unknown"
    }
  }

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
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white">Loading membership data...</div>
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
          <h1 className="text-3xl font-bold text-white mb-2">Membership Plans</h1>
          <p className="text-gray-400">Choose the perfect plan for your fitness journey</p>
        </div>

        {/* Registration Fee Notice - Only show if no membership exists */}
        {!currentMembership && (
        <Card className="bg-orange-500/10 backdrop-blur-sm border-orange-500/50 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-orange-400 flex-shrink-0" />
              <div>
                <h3 className="text-orange-300 font-semibold text-lg">Registration Fee Required</h3>
                <p className="text-orange-200/80 text-sm mt-1">
                  A one-time registration fee of <span className="font-semibold">Rs. 5,000</span> is required for all
                  new members. This includes gym membership activation, welcome kit, orientation, and member ID card.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Current Plan Status */}
        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-orange-400" />
              <span>Current Plan Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentMembership ? (
              <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-lg">{currentMembership.planType}</p>
                    <p className="text-gray-400">
                      {currentMembership.status === "active" 
                        ? `Active until ${formatDate(currentMembership.endDate)}`
                        : currentMembership.status === "pending"
                        ? `Pending approval - Selected on ${formatDate(currentMembership.createdAt)}`
                        : currentMembership.status === "rejected"
                        ? `Rejected on ${formatDate(currentMembership.rejectedAt)}`
                        : `Expires on ${formatDate(currentMembership.endDate)}`
                      }
                    </p>
                    <div className="text-sm text-gray-500 space-y-1">
                      {currentMembership.registrationFee ? (
                        <>
                          <p>Plan Price: Rs. {(currentMembership.amount - 5000).toLocaleString()}</p>
                          <p>Registration Fee: Rs. 5,000</p>
                          <p className="font-semibold text-white">Total: Rs. {currentMembership.amount?.toLocaleString()}</p>
                        </>
                      ) : (
                        <p>Amount: Rs. {currentMembership.amount?.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Badge className={`${getMembershipStatusColor(currentMembership.status)}/20 text-white border-${getMembershipStatusColor(currentMembership.status)}/30`}>
                      {getMembershipStatusText(currentMembership.status)}
                    </Badge>
                    {currentMembership.registrationFee && (
                      <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30 text-xs">
                        + Registration Fee
                      </Badge>
                    )}
                  </div>
                </div>
                
                {currentMembership.status === "pending" && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                      <div>
                        <p className="text-yellow-300 font-medium">Awaiting Admin Approval</p>
                        <p className="text-yellow-200/80 text-sm mt-1">
                          Your membership request is pending review. You'll be notified once approved.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {currentMembership.status === "rejected" && currentMembership.rejectionReason && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div>
                        <p className="text-red-300 font-medium">Membership Rejected</p>
                        <p className="text-red-200/80 text-sm mt-1">
                          Reason: {currentMembership.rejectionReason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400">No membership found</p>
                <p className="text-sm text-gray-500 mt-1">Choose a plan below to get started</p>
              </div>
            )}
          </CardContent>
        </Card>



        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {plans.map((plan, index) => {
            const IconComponent = plan.icon
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={
                  currentMembership?.status === "pending" || 
                  (currentMembership?.status === "active" && currentMembership.planType !== plan.name)
                    ? {}
                    : { y: -10, scale: 1.02 }
                }
                className="h-full"
              >
                <Card
                  className={`bg-gray-800/50 backdrop-blur-sm border-gray-700 relative h-full ${
                    currentMembership?.status === "active" && currentMembership.planType === plan.name
                      ? "border-green-500/50 bg-green-500/5 shadow-lg shadow-green-500/20"
                      : currentMembership?.status === "active"
                      ? "border-gray-600 bg-gray-800/30"
                      : plan.popular && !(currentMembership?.status === "active")
                      ? "border-orange-500/50 bg-orange-500/5" 
                      : ""
                  } ${
                    currentMembership?.status === "active" && currentMembership.planType === plan.name
                      ? "hover:border-green-400 hover:bg-green-500/10"
                      : currentMembership?.status === "active" && currentMembership.planType !== plan.name
                      ? "hover:border-gray-500"
                      : "hover:border-orange-500/50"
                  } transition-all duration-300`}
                >
                  {currentMembership?.status === "active" && currentMembership.planType === plan.name && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-green-600 via-green-500 to-green-400 text-white">
                        Current Plan
                      </Badge>
                    </div>
                  )}
                  {plan.popular && !(currentMembership?.status === "active") && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 text-white">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        currentMembership?.status === "active" && currentMembership.planType === plan.name
                          ? "bg-green-500/20"
                          : currentMembership?.status === "active"
                          ? "bg-gray-500/20"
                          : "bg-orange-500/20"
                      }`}>
                        <IconComponent className={`h-8 w-8 ${
                          currentMembership?.status === "active" && currentMembership.planType === plan.name
                            ? "text-green-400"
                            : currentMembership?.status === "active"
                            ? "text-gray-400"
                            : "text-orange-400"
                        }`} />
                      </div>
                    </div>
                    <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
                    <div className={`text-3xl font-bold ${
                      currentMembership?.status === "active" && currentMembership.planType === plan.name
                        ? "text-green-400"
                        : currentMembership?.status === "active"
                        ? "text-gray-400"
                        : "text-orange-400"
                    }`}>
                      Rs. {plan.price.toLocaleString()}
                      <span className="text-sm text-gray-400 font-normal">/month</span>
                    </div>
                    <p className="text-gray-400 text-sm">{plan.description}</p>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, featureIndex) => {
                        // Handle both old string format and new object format
                        if (typeof feature === 'string') {
                          return (
                            <li key={featureIndex} className="flex items-center space-x-3">
                              <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                              <span className="text-gray-300 text-sm">{feature}</span>
                            </li>
                          )
                        } else {
                          return (
                            <li key={featureIndex} className="flex items-center space-x-3">
                              <span className={`h-4 w-4 flex-shrink-0 ${feature.included ? 'text-green-400' : 'text-red-400'}`}>
                                {feature.included ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                              </span>
                              <span className={`text-sm ${feature.included ? 'text-gray-300' : 'text-gray-500'}`}>
                                {feature.text}
                              </span>
                            </li>
                          )
                        }
                      })}
                    </ul>

                    <motion.div 
                      whileHover={
                        currentMembership?.status === "pending" || 
                        (currentMembership?.status === "active" && currentMembership.planType !== plan.name)
                          ? {}
                          : { scale: 1.02 }
                      } 
                      whileTap={
                        currentMembership?.status === "pending" || 
                        (currentMembership?.status === "active" && currentMembership.planType !== plan.name)
                          ? {}
                          : { scale: 0.98 }
                      } 
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        onClick={() => handlePlanSelection(plan.id)}
                        className={`w-full ${
                          currentMembership?.status === "active" && currentMembership.planType === plan.name
                            ? "bg-green-600 hover:bg-green-700 text-white cursor-default"
                            : plan.popular && !(currentMembership?.status === "active")
                            ? "bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 hover:from-orange-700 hover:via-orange-600 hover:to-orange-500"
                            : "bg-gray-700 hover:bg-gray-600"
                        } text-white transition-all duration-300`}
                        disabled={processing || 
                          (currentMembership?.status === "pending") || 
                          (currentMembership?.status === "active" && currentMembership.planType === plan.name)}
                      >
                        {processing && currentMembership?.status === "pending" && currentMembership.planType === plan.name ? "Processing..." : 
                         currentMembership?.status === "pending" && currentMembership.planType === plan.name ? "Pending Approval" :
                         currentMembership?.status === "active" && currentMembership.planType === plan.name ? "Active Membership" :
                         "Select Plan (Cash Payment)"}
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>



        {/* Personal Training Section */}
        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
          <CardContent>
            <div className="space-y-6">
              {/* Our Trainers */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-6 flex items-center">
                  <Star className="h-5 w-5 text-orange-400 mr-2" />
                  Meet Our Expert Trainers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Muhammad Saad */}
                  <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600 text-center">
                    <div className="mb-4">
                      <Image
                        src="/images/trainers/saad.jpg"
                        alt="Muhammad Saad"
                        width={150}
                        height={180}
                        className="rounded-lg mx-auto object-cover w-[150px] h-[180px]"
                      />
                    </div>
                    <a
                      href="https://www.instagram.com/m_saad.222?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <h4 className="text-white font-semibold text-base mb-1 hover:text-orange-400 transition-colors duration-300 cursor-pointer hover:scale-105 transform">
                        Muhammad Saad
                      </h4>
                    </a>
                    <p className="text-orange-400 text-sm mb-3">Fitness & Nutrition Specialist</p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      With 4 years of experience, creates customized Workout Routines & Diet Plans tailored to Individual Goals for Lasting Results.
                    </p>
                  </div>

                  {/* Muhammad Tayyab Zafar */}
                  <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600 text-center">
                    <div className="mb-4">
                      <Image
                        src="/images/trainers/tayyab.jpg"
                        alt="Muhammad Tayyab Zafar"
                        width={150}
                        height={180}
                        className="rounded-lg mx-auto object-cover w-[150px] h-[180px]"
                      />
                    </div>
                    <a
                      href="https://www.instagram.com/tayyab___x1?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <h4 className="text-white font-semibold text-base mb-1 hover:text-orange-400 transition-colors duration-300 cursor-pointer hover:scale-105 transform">
                        Muhammad Tayyab Zafar
                      </h4>
                    </a>
                    <p className="text-orange-400 text-sm mb-3">Posture Correction & Muscle Health Specialist</p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      With over 3 years of experience, helps people fix Posture, Relieve Stiffness, Burn Fat & Build Muscle.
                    </p>
                  </div>

                  {/* Muhammad Zain Ishfaq */}
                  <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600 text-center">
                    <div className="mb-4">
                      <Image
                        src="/images/trainers/zain.jpg"
                        alt="Muhammad Zain Ishfaq"
                        width={150}
                        height={180}
                        className="rounded-lg mx-auto object-cover w-[150px] h-[180px]"
                      />
                    </div>
                    <a
                      href="https://www.instagram.com/zain.hun___?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <h4 className="text-white font-semibold text-base mb-1 hover:text-orange-400 transition-colors duration-300 cursor-pointer hover:scale-105 transform">
                        Muhammad Zain Ishfaq
                      </h4>
                    </a>
                    <p className="text-orange-400 text-sm mb-3">Muscle Building Specialist</p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      With 5 years of experience, creates personalized Training & Nutrition Plans to help people Build Muscle, Strength, & Maximize Performance.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-gray-400 text-sm">
                    Contact our trainers directly at the gym or speak with our reception staff for personal training session bookings and pricing details.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CustomerDashboardLayout>
  )
}
