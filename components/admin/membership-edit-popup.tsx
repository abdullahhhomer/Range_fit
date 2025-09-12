"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { getProfileImageUrl } from '@/lib/cloudinary-client'
import { updateExistingMembership, addPaymentRecordWithRetention, createReceipt, updateUserDocument } from '@/lib/firebase'
import { db } from '@/lib/firebase'
import { query, where, getDocs, addDoc, collection, serverTimestamp } from 'firebase/firestore'

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
  customRegistrationFee?: number
  discount?: boolean
  discountAmount?: number
  totalAmount?: number
  isVisitor?: boolean
  visitorName?: string
  visitorPhone?: string
}

interface MembershipEditPopupProps {
  membership: MembershipData | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentUserId: string
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

// Function to format phone number with space after first 4 digits
const formatPhoneNumber = (phone: string) => {
  if (!phone) return 'Not provided'
  const cleaned = phone.replace(/\s/g, '')
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
  }
  return cleaned
}

export default function MembershipEditPopup({
  membership,
  isOpen,
  onClose,
  onSuccess,
  currentUserId
}: MembershipEditPopupProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [editFormData, setEditFormData] = useState({
    membershipPlan: '',
    membershipAmount: 0,
    registrationFee: false,
    customRegistrationFee: 5000,
    discount: false,
    discountAmount: 0,
    totalAmount: 0
  })

  // Initialize form data when membership changes
  React.useEffect(() => {
    if (membership) {
      // If user has a plan, use it; otherwise default to 0 (no plan selected)
      const defaultPlan = membership.membershipPlan || ''
      const selectedPlan = MEMBERSHIP_PLANS.find(plan => plan.id === defaultPlan)
      const defaultAmount = selectedPlan ? selectedPlan.price : 0
      const defaultTotal = defaultAmount // Start with unchecked registration fee
      
      setEditFormData({
        membershipPlan: defaultPlan,
        membershipAmount: membership.membershipAmount || defaultAmount,
        registrationFee: false, // Always start unchecked
        customRegistrationFee: 5000,
        discount: false, // Always start unchecked
        discountAmount: 0,
        totalAmount: membership.totalAmount || defaultTotal
      })
    }
  }, [membership])

  const handlePlanChange = (planId: string) => {
    const selectedPlan = MEMBERSHIP_PLANS.find(plan => plan.id === planId)
    if (selectedPlan) {
      const newAmount = selectedPlan.price
      const registrationFeeAmount = editFormData.registrationFee ? editFormData.customRegistrationFee : 0
      const subtotal = newAmount + registrationFeeAmount
      const discountAmount = editFormData.discount ? editFormData.discountAmount : 0
      const newTotal = Math.max(0, subtotal - discountAmount) // Ensure total doesn't go below 0
      setEditFormData({
        ...editFormData,
        membershipPlan: planId,
        membershipAmount: newAmount,
        totalAmount: newTotal
      })
    }
  }

  const handleRegistrationFeeChange = (includeFee: boolean) => {
    const registrationFeeAmount = includeFee ? editFormData.customRegistrationFee : 0
    const subtotal = editFormData.membershipAmount + registrationFeeAmount
    const discountAmount = editFormData.discount ? editFormData.discountAmount : 0
    const newTotal = Math.max(0, subtotal - discountAmount)
    setEditFormData({
      ...editFormData,
      registrationFee: includeFee,
      totalAmount: newTotal
    })
  }

  const handleCustomRegistrationFeeChange = (amount: number) => {
    const registrationFeeAmount = editFormData.registrationFee ? amount : 0
    const subtotal = editFormData.membershipAmount + registrationFeeAmount
    const discountAmount = editFormData.discount ? editFormData.discountAmount : 0
    const newTotal = Math.max(0, subtotal - discountAmount)
    setEditFormData({
      ...editFormData,
      customRegistrationFee: amount,
      totalAmount: newTotal
    })
  }

  const handleDiscountChange = (includeDiscount: boolean) => {
    const registrationFeeAmount = editFormData.registrationFee ? editFormData.customRegistrationFee : 0
    const subtotal = editFormData.membershipAmount + registrationFeeAmount
    const discountAmount = includeDiscount ? editFormData.discountAmount : 0
    const newTotal = Math.max(0, subtotal - discountAmount)
    setEditFormData({
      ...editFormData,
      discount: includeDiscount,
      totalAmount: newTotal
    })
  }

  const handleDiscountAmountChange = (amount: number) => {
    const registrationFeeAmount = editFormData.registrationFee ? editFormData.customRegistrationFee : 0
    const subtotal = editFormData.membershipAmount + registrationFeeAmount
    const discountAmount = editFormData.discount ? amount : 0
    const newTotal = Math.max(0, subtotal - discountAmount)
    setEditFormData({
      ...editFormData,
      discountAmount: amount,
      totalAmount: newTotal
    })
  }

  const handleUpdateMembership = async () => {
    if (!membership || !currentUserId) {
      toast.error('Please select a membership plan')
      return
    }

    if (!editFormData.membershipPlan) {
      toast.error('Please select a membership plan')
      return
    }

    if (editFormData.registrationFee && !editFormData.membershipPlan) {
      toast.error('Please select a membership plan before adding registration fee')
      return
    }

    // Validate discount amount
    if (editFormData.discount) {
      const registrationFeeAmount = editFormData.registrationFee ? editFormData.customRegistrationFee : 0
      const subtotal = editFormData.membershipAmount + registrationFeeAmount
      if (editFormData.discountAmount > subtotal) {
        toast.error('Discount amount cannot exceed the total fees (membership + registration fee)')
        return
      }
      if (editFormData.discountAmount < 0) {
        toast.error('Discount amount cannot be negative')
        return
      }
    }

    setIsUpdating(true)
    try {
      const selectedPlan = MEMBERSHIP_PLANS.find(plan => plan.id === editFormData.membershipPlan)
      if (!selectedPlan) {
        toast.error('Invalid membership plan')
        return
      }

      // Generate transaction ID for tracking
      const transactionId = `ADMIN${Date.now()}${Math.random().toString(36).substr(2, 9)}`

      // Check if user already has a membership
      const membershipRef = collection(db, "memberships")
      const q = query(membershipRef, where("uid", "==", membership.uid))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        // User has existing membership - update it
        await updateExistingMembership(membership.uid, {
          planType: selectedPlan.name as any,
          amount: editFormData.totalAmount || 0, // Use total amount (includes registration fee if selected)
          paymentMethod: "Cash", // Default for admin assignments
          transactionId,
          registrationFee: editFormData.registrationFee, // Include registration fee flag
          customRegistrationFee: editFormData.customRegistrationFee, // Include custom registration fee amount
          discount: editFormData.discount, // Include discount flag
          discountAmount: editFormData.discountAmount, // Include discount amount
          totalAmount: editFormData.totalAmount || 0, // Include total amount
          status: "active", // Set status to active when plan is assigned
        })
      } else {
        // User has no membership - create new one
        const membershipData = {
          uid: membership.uid,
          planType: selectedPlan.name,
          amount: editFormData.totalAmount || 0,
          paymentMethod: "Cash",
          transactionId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          registrationFee: editFormData.registrationFee,
          customRegistrationFee: editFormData.customRegistrationFee,
          discount: editFormData.discount,
          discountAmount: editFormData.discountAmount,
          totalAmount: editFormData.totalAmount || 0,
          renewalCount: 0,
          lastRenewalDate: new Date(),
          nextRenewalReminder: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000) // Reminder 5 days before expiry
        }

        await addDoc(membershipRef, membershipData)

        // Update user document with membership info
        const userUpdateData: any = {
          membershipStatus: "active",
          membershipPlan: selectedPlan.name,
          membershipAmount: editFormData.totalAmount || 0,
          membershipStartDate: new Date(),
          membershipExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastRenewalReminder: new Date()
        }

        // Only add defined values to avoid Firebase errors
        if (editFormData.registrationFee !== undefined) userUpdateData.registrationFee = editFormData.registrationFee
        if (editFormData.customRegistrationFee !== undefined) userUpdateData.customRegistrationFee = editFormData.customRegistrationFee
        if (editFormData.discount !== undefined) userUpdateData.discount = editFormData.discount
        if (editFormData.discountAmount !== undefined) userUpdateData.discountAmount = editFormData.discountAmount
        if (editFormData.totalAmount !== undefined) userUpdateData.totalAmount = editFormData.totalAmount

        await updateUserDocument(membership.uid, userUpdateData)
      }

      // Create payment record for financial tracking (multiple payment records are kept for reporting)
      await addPaymentRecordWithRetention({
        uid: membership.uid,
        amount: editFormData.totalAmount || 0,
        planType: selectedPlan.name,
        transactionId,
        paymentMethod: "Cash",
        status: "completed", // Admin payments are automatically completed
        userEmail: membership.email,
        userName: membership.name,
        registrationFee: editFormData.registrationFee,
        customRegistrationFee: editFormData.customRegistrationFee,
        discount: editFormData.discount,
        discountAmount: editFormData.discountAmount
      })

      // Generate receipt for the membership
      // The plan membership fee is the base membership amount (before registration fee and discount)
      const planMembershipFee = editFormData.membershipAmount
      
      const receiptData = {
        userId: membership.uid,
        memberId: membership.memberId || "N/A",
        customerName: membership.name,
        membershipType: selectedPlan.name,
        amount: editFormData.totalAmount,
        paymentMethod: "Cash",
        transactionId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "active" as const,
        gymName: "RangeFit Gym",
        gymAddress: "Al Harmain Plaza, Range Rd, Rawalpindi, Pakistan",
        gymPhone: "0332 5727216",
        gymEmail: "info@rangefitgym.com",
        // New fields for detailed breakdown
        planMembershipFee: planMembershipFee,
        registrationFee: editFormData.registrationFee,
        customRegistrationFee: editFormData.customRegistrationFee,
        discount: editFormData.discount,
        discountAmount: editFormData.discountAmount,
        totalAmount: editFormData.totalAmount
      }

      await createReceipt(receiptData)
      
      toast.success(`Membership ${!querySnapshot.empty ? 'updated' : 'created'} successfully for ${membership.name}`)
      onSuccess()
    } catch (error) {
      console.error('Error updating membership:', error)
      toast.error('Failed to update membership')
    } finally {
      setIsUpdating(false)
    }
  }

  const closePopup = () => {
    onClose()
  }

  if (!isOpen || !membership) return null

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={closePopup}
    >
      <div 
        className="bg-gray-900 border border-gray-700 rounded-xl sm:rounded-2xl max-w-4xl w-full shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-800 border-b border-gray-700 p-4 sm:p-6 flex items-center justify-between sticky top-0 z-10">
          <h3 className="text-lg sm:text-2xl font-bold text-white">Edit Membership</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={closePopup}
            className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-1 sm:p-2"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Profile Image and Member Info */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="text-center">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-gray-600 shadow-xl mx-auto mb-3">
                  <AvatarImage 
                    src={membership.profileImageUrl ? getProfileImageUrl(membership.profileImageUrl, 96) : undefined} 
                    alt={`${membership.name}'s profile picture`}
                  />
                  <AvatarFallback className="bg-gray-700 text-white text-xl sm:text-2xl font-bold">
                    {membership.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-gray-400 text-xs sm:text-sm">Profile Image</p>
              </div>
            </div>
            
            {/* Member Information */}
            <div className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg p-4 sm:p-5 w-full">
              <label className="text-gray-300 text-sm font-medium mb-3 sm:mb-4 block">Member Information</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <span className="text-gray-400 text-xs sm:text-sm">Name</span>
                    <p className="text-white font-semibold text-base sm:text-lg">{membership.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs sm:text-sm">Email</span>
                    <p className="text-white text-sm sm:text-base">{membership.email}</p>
                  </div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <span className="text-gray-400 text-xs sm:text-sm">Member ID</span>
                    <p className="text-white font-mono text-base sm:text-lg">{membership.memberId}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs sm:text-sm">Phone</span>
                    <p className="text-white text-sm sm:text-base">{formatPhoneNumber(membership.phone || '')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

                     {/* Membership Plans */}
           <div>
             <label className="text-gray-300 text-sm font-medium mb-3 sm:mb-4 block">Select Membership Plan</label>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
               {MEMBERSHIP_PLANS.filter(plan => plan.id !== 'visitor').map((plan) => {
                 // Reorder plans: Strength Training, Strength + Cardio, Cardio Training
                 const planOrder = { 'strength': 1, 'combo': 2, 'cardio': 3 }
                 return { ...plan, order: planOrder[plan.id as keyof typeof planOrder] || 0 }
               }).sort((a, b) => a.order - b.order).map((plan) => (
                 <div
                   key={plan.id}
                   onClick={() => handlePlanChange(plan.id)}
                   className={`p-4 sm:p-5 border rounded-xl cursor-pointer transition-all flex flex-col h-full ${
                     editFormData.membershipPlan === plan.id
                       ? 'border-orange-500 bg-orange-500/10 shadow-lg'
                       : 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-750'
                   }`}
                 >
                   <div className="text-center flex flex-col h-full">
                     <h4 className="text-white font-semibold text-base sm:text-lg mb-2 sm:mb-3">{plan.name}</h4>
                     <p className="text-gray-400 text-xs sm:text-sm leading-relaxed flex-grow">{plan.description}</p>
                     <div className="mt-auto pt-3 sm:pt-4">
                       <div className="text-orange-400 font-bold text-lg sm:text-xl">Rs. {plan.price.toLocaleString()}</div>
                       <div className="text-gray-400 text-xs sm:text-sm">{plan.period}</div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </div>

                     {/* Registration Fee */}
           <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 sm:p-5">
             <label className="text-gray-300 text-sm font-medium mb-3 sm:mb-4 block">Additional Fees</label>
             <div className="space-y-4">
               <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                 <input
                   type="checkbox"
                   id="registrationFee"
                   checked={editFormData.registrationFee}
                   onChange={(e) => handleRegistrationFeeChange(e.target.checked)}
                   disabled={!editFormData.membershipPlan}
                   className={`w-4 h-4 sm:w-5 sm:h-5 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2 ${
                     !editFormData.membershipPlan ? 'opacity-50 cursor-not-allowed' : ''
                   }`}
                 />
                 <div className="flex-1">
                   <label htmlFor="registrationFee" className={`font-medium cursor-pointer text-sm sm:text-base ${
                     !editFormData.membershipPlan ? 'text-gray-500 cursor-not-allowed' : 'text-white'
                   }`}>
                     Include Registration Fee
                   </label>
                   <p className="text-gray-400 text-xs sm:text-sm">One-time registration fee</p>
                   {!editFormData.membershipPlan && (
                     <p className="text-orange-400 text-xs mt-1">Please select a membership plan first</p>
                   )}
                 </div>
               </div>
               
               {/* Custom Registration Fee Input */}
               {editFormData.registrationFee && (
                 <div className="mt-4 pl-8">
                   <label className="text-gray-300 text-sm font-medium mb-2 block">Registration Fee Amount</label>
                   <div className="flex items-center space-x-2">
                     <span className="text-gray-400 text-sm">Rs.</span>
                     <input
                       type="number"
                       value={editFormData.customRegistrationFee}
                       onChange={(e) => handleCustomRegistrationFeeChange(Number(e.target.value))}
                       min="0"
                       step="100"
                       className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-orange-500 focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                       placeholder="5000"
                     />
                     <span className="text-gray-400 text-xs">(Default: Rs. 5,000)</span>
                   </div>
                 </div>
               )}
             </div>
           </div>

           {/* Discount Section */}
           <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 sm:p-5">
             <label className="text-gray-300 text-sm font-medium mb-3 sm:mb-4 block">Discount</label>
             <div className="space-y-4">
               <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                 <input
                   type="checkbox"
                   id="discount"
                   checked={editFormData.discount}
                   onChange={(e) => handleDiscountChange(e.target.checked)}
                   disabled={!editFormData.membershipPlan}
                   className={`w-4 h-4 sm:w-5 sm:h-5 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2 ${
                     !editFormData.membershipPlan ? 'opacity-50 cursor-not-allowed' : ''
                   }`}
                 />
                 <div className="flex-1">
                   <label htmlFor="discount" className={`font-medium cursor-pointer text-sm sm:text-base ${
                     !editFormData.membershipPlan ? 'text-gray-500 cursor-not-allowed' : 'text-white'
                   }`}>
                     Apply Discount
                   </label>
                   <p className="text-gray-400 text-xs sm:text-sm">Apply discount to membership fees</p>
                   {!editFormData.membershipPlan && (
                     <p className="text-orange-400 text-xs mt-1">Please select a membership plan first</p>
                   )}
                 </div>
               </div>
               
               {/* Custom Discount Input */}
               {editFormData.discount && (
                 <div className="mt-4 pl-8">
                   <label className="text-gray-300 text-sm font-medium mb-2 block">Discount Amount</label>
                   <div className="flex items-center space-x-2">
                     <span className="text-gray-400 text-sm">Rs.</span>
                     <input
                       type="number"
                       value={editFormData.discountAmount}
                       onChange={(e) => handleDiscountAmountChange(Number(e.target.value))}
                       min="0"
                       step="100"
                       max={editFormData.membershipAmount + (editFormData.registrationFee ? editFormData.customRegistrationFee : 0)}
                       className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-green-500 focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                       placeholder="0"
                     />
                     <span className="text-gray-400 text-xs">
                       (Max: Rs. {(editFormData.membershipAmount + (editFormData.registrationFee ? editFormData.customRegistrationFee : 0)).toLocaleString()})
                     </span>
                   </div>
                   {editFormData.discountAmount > (editFormData.membershipAmount + (editFormData.registrationFee ? editFormData.customRegistrationFee : 0)) && (
                     <p className="text-red-400 text-xs mt-1">Discount cannot exceed total fees</p>
                   )}
                 </div>
               )}
             </div>
           </div>

          {/* Total Amount */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 sm:p-6">
            <label className="text-gray-300 text-sm font-medium mb-3 sm:mb-5 block">Payment Summary</label>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400 text-base sm:text-lg">Membership Amount</span>
                <span className="text-white font-semibold text-base sm:text-lg">Rs. {editFormData.membershipAmount.toLocaleString()}</span>
              </div>
              {editFormData.registrationFee && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400 text-base sm:text-lg">Registration Fee</span>
                  <span className="text-white font-semibold text-base sm:text-lg">Rs. {editFormData.customRegistrationFee.toLocaleString()}</span>
                </div>
              )}
              {editFormData.discount && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400 text-base sm:text-lg">Discount</span>
                  <span className="text-green-400 font-semibold text-base sm:text-lg">- Rs. {editFormData.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-600 pt-3 sm:pt-4 mt-3 sm:mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-orange-400 font-bold text-lg sm:text-xl">Total Amount</span>
                  <span className="text-orange-400 font-bold text-2xl sm:text-3xl">Rs. {editFormData.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6 border-t border-gray-700">
                         <Button
               onClick={handleUpdateMembership}
               disabled={isUpdating || !editFormData.membershipPlan}
               className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
             >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                  Updating Membership...
                </>
              ) : (
                'Update Membership'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={closePopup}
              className="flex-1 border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white py-3 sm:py-4 text-base sm:text-lg rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
