"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { getProfileImageUrl } from '@/lib/cloudinary-client'
import { updateMembershipStatus } from '@/lib/firebase'
import { Timestamp } from 'firebase/firestore'

interface MembershipRequest {
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

interface MembershipApprovalPopupProps {
  request: MembershipRequest | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentUserId: string
}

const REGISTRATION_FEE = 5000

export default function MembershipApprovalPopup({
  request,
  isOpen,
  onClose,
  onSuccess,
  currentUserId
}: MembershipApprovalPopupProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [approvalRegistrationFee, setApprovalRegistrationFee] = useState(false)

  // Function to format phone number with space after 4 digits
  const formatPhoneNumber = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '')
    const limitedDigits = digitsOnly.slice(0, 11)
    
    if (limitedDigits.length > 4) {
      return `${limitedDigits.slice(0, 4)} ${limitedDigits.slice(4)}`
    }
    
    return limitedDigits
  }

  // Handle membership approval
  const handleApproveMembership = async () => {
    if (!request || !currentUserId) return

    setIsApproving(true)
    try {
      // Calculate total amount including registration fee if checked
      const baseAmount = request.amount || 0
      const totalAmount = approvalRegistrationFee ? baseAmount + REGISTRATION_FEE : baseAmount
      
      // Set start date as current date when approved
      const startDate = new Date()
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 30) // Add 30 days
      
      await updateMembershipStatus(request.id, "active", currentUserId, undefined, {
        registrationFee: approvalRegistrationFee,
        totalAmount: totalAmount,
        status: "active", // Ensure status is set to active
        startDate: startDate,
        endDate: endDate,
        approvedBy: currentUserId
      })
      
      toast.success(`Membership approved for ${request.userData?.name || 'user'}`)
      onSuccess()
    } catch (error) {
      console.error('Error approving membership:', error)
      toast.error('Failed to approve membership')
    } finally {
      setIsApproving(false)
    }
  }

  // Handle membership rejection
  const handleRejectMembership = async () => {
    if (!request || !currentUserId || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    setIsRejecting(true)
    try {
      await updateMembershipStatus(request.id, "rejected", currentUserId, rejectionReason)
      toast.success(`Membership rejected for ${request.userData?.name || 'user'}`)
      onSuccess()
    } catch (error) {
      console.error('Error rejecting membership:', error)
      toast.error('Failed to reject membership')
    } finally {
      setIsRejecting(false)
    }
  }

  const closePopup = () => {
    setRejectionReason('')
    setApprovalRegistrationFee(false)
    onClose()
  }

  if (!isOpen || !request) return null

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
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full animate-pulse"></div>
            <h3 className="text-lg sm:text-2xl font-bold text-white">Review Membership Request</h3>
          </div>
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
          {/* Member Information - Enhanced */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 sm:p-6">
            <h4 className="text-gray-300 text-sm font-medium mb-3 sm:mb-4 flex items-center">
              <Avatar className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Member Information
            </h4>
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
                <AvatarImage src={request.userData?.profileImageUrl ? getProfileImageUrl(request.userData.profileImageUrl, 80) : undefined} />
                <AvatarFallback className="bg-gray-600 text-white text-xl sm:text-2xl">
                  {request.userData?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3 sm:space-y-4 text-center sm:text-left">
                <div>
                  <p className="text-white font-semibold text-lg sm:text-xl">{request.userData?.name || 'Unknown User'}</p>
                  <p className="text-gray-400 text-sm sm:text-base">{request.userData?.email}</p>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    {request.userData?.phone ? 
                      formatPhoneNumber(request.userData.phone) : 
                      'No phone provided'
                    }
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-400">Member ID:</span>
                    <p className="text-white font-medium">{request.userData?.memberId || 'Not assigned'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Member Since:</span>
                    <p className="text-white font-medium">
                      {request.userData?.createdAt ? 
                        (() => {
                          const date = request.userData.createdAt?.toDate?.() || request.userData.createdAt;
                          return date ? new Date(date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Unknown';
                        })() : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Last Login:</span>
                    <p className="text-white font-medium">
                      {request.userData?.lastLoginAt ? 
                        (() => {
                          const date = request.userData.lastLoginAt?.toDate?.() || request.userData.lastLoginAt;
                          return date ? new Date(date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Never';
                        })() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <Badge className={`ml-2 text-xs ${
                      request.userData?.status === 'active' ? 'bg-green-600' : 
                      request.userData?.status === 'inactive' ? 'bg-red-600' :
                      request.userData?.accountStatus === 'active' ? 'bg-green-600' :
                      request.userData?.accountStatus === 'inactive' ? 'bg-red-600' :
                      request.userData?.role === 'customer' ? 'bg-blue-600' : 'bg-gray-600'
                    }`}>
                      {request.userData?.status || 
                       request.userData?.accountStatus ||
                       (request.userData?.role === 'customer' ? 'Customer' : 'Unknown')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Membership Request Details - Enhanced */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 sm:p-6">
            <h4 className="text-gray-300 text-sm font-medium mb-3 sm:mb-4 flex items-center">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Membership Request Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-gray-400 text-sm">Plan Type</span>
                  <p className="text-white font-semibold text-lg">{request.planType}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Payment Method</span>
                  <p className="text-white font-medium">{request.paymentMethod || 'Cash'}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Transaction ID</span>
                  <p className="text-white font-mono text-sm">{request.transactionId || 'Not generated'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-gray-400 text-sm">Request Date</span>
                  <p className="text-white font-medium">
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
                        return date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Unknown';
                      })() : 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Start Date</span>
                  <p className="text-white font-medium">
                    {(() => {
                      // If approved, use approval date, otherwise use current date when popup opens
                      const startDate = new Date(); // Current date when popup opens
                      return startDate ? new Date(startDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Will be set on approval';
                    })()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">End Date</span>
                  <p className="text-white font-medium">
                    {(() => {
                      // Calculate end date based on start date + 30 days
                      const startDate = new Date();
                      const endDate = new Date(startDate);
                      endDate.setDate(endDate.getDate() + 30); // Add 30 days
                      return endDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary - Enhanced */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 sm:p-6">
            <h4 className="text-gray-300 text-sm font-medium mb-3 sm:mb-4 flex items-center">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Payment Summary
            </h4>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400 text-base sm:text-lg">Plan Amount</span>
                <span className="text-white font-semibold text-base sm:text-lg">Rs. {request.amount?.toLocaleString()}</span>
              </div>
              
              {/* Registration Fee Checkbox */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 py-3 border-t border-gray-600">
                <input
                  type="checkbox"
                  id="approvalRegistrationFee"
                  checked={approvalRegistrationFee}
                  onChange={(e) => setApprovalRegistrationFee(e.target.checked)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="approvalRegistrationFee" className="text-white font-medium cursor-pointer text-sm sm:text-base">
                    Include Registration Fee
                  </label>
                  <p className="text-gray-400 text-xs sm:text-sm">One-time registration fee of Rs. {REGISTRATION_FEE.toLocaleString()}</p>
                </div>
                <span className="text-white font-semibold text-base sm:text-lg">Rs. {REGISTRATION_FEE.toLocaleString()}</span>
              </div>
              
              {request.registrationFee && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400 text-lg">Registration Fee</span>
                  <span className="text-white font-semibold text-lg">Rs. 5,000</span>
                </div>
              )}
              <div className="border-t border-gray-600 pt-3 sm:pt-4 mt-3 sm:mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-orange-400 font-bold text-lg sm:text-xl">Total Amount</span>
                  <span className="text-orange-400 font-bold text-xl sm:text-2xl">
                    Rs. {approvalRegistrationFee ? 
                      ((request.amount || 0) + REGISTRATION_FEE).toLocaleString() : 
                      request.amount?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rejection Reason - Enhanced */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 sm:p-6">
            <h4 className="text-red-300 text-sm font-medium mb-3 sm:mb-4 flex items-center">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Rejection Reason (Optional)
            </h4>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection (optional but recommended for transparency)..."
              className="w-full bg-gray-700 border-gray-600 text-white rounded-lg p-3 sm:p-4 resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
              rows={3}
            />
            <p className="text-red-300 text-xs mt-2">
              Providing a reason helps the member understand the decision and improves transparency.
            </p>
          </div>

          {/* Action Buttons - Enhanced */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6 border-t border-gray-700">
            <Button
              onClick={handleApproveMembership}
              disabled={isApproving || isRejecting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl"
            >
              {isApproving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Approve Membership
                </>
              )}
            </Button>
            <Button
              onClick={handleRejectMembership}
              disabled={isApproving || isRejecting}
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400 py-3 sm:py-4 text-base sm:text-lg rounded-xl"
            >
              {isRejecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-red-400 mr-2 sm:mr-3"></div>
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Reject Membership
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
