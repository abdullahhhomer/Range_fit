"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getProfileImageUrl } from '@/lib/cloudinary-client'
import { X, User, Phone, MapPin, Shield, Calendar, Fingerprint } from 'lucide-react'


interface User {
  uid: string
  memberId?: string
  email: string
  name: string
  phone?: string
  gender?: string
  fatherName?: string
  address?: string
  role: "receptionist" | "customer"
  status: "active" | "inactive"
  createdAt: Date
  lastLoginAt?: Date
  profileComplete: boolean
  profileImageUrl?: string
  fingerprintStatus?: "enrolled" | "not_enrolled" | "pending"
  deletedAt?: Date
  deletedBy?: string
  isDeleted?: boolean
}

interface UserViewPopupProps {
  user: User
  onClose: () => void
  getStatusBadge: (status: string) => React.ReactNode
  getRoleBadge: (role: string) => React.ReactNode
  formatPhoneNumber: (phone: string) => string
}

export default function UserViewPopup({ 
  user, 
  onClose, 
  getStatusBadge, 
  getRoleBadge, 
  formatPhoneNumber 
}: UserViewPopupProps) {
  // Ref for the popup container to handle click outside
  const popupRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div ref={popupRef} className="bg-gray-900 border border-gray-700 rounded-xl sm:rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-3 sm:p-4 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold text-white">User Profile</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-1 sm:p-2 transition-all duration-200"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left Side - Profile Image & Basic Info */}
            <div className="flex-shrink-0 w-full lg:w-48">
              <div className="text-center">
                {/* Profile Image */}
                <div className="relative mb-3 sm:mb-4">
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-gray-600 shadow-2xl mx-auto">
                    <AvatarImage 
                      src={user.profileImageUrl ? getProfileImageUrl(user.profileImageUrl, 128) : undefined} 
                      alt={`${user.name}'s profile picture`}
                    />
                    <AvatarFallback className="bg-gray-700 text-white text-2xl sm:text-4xl font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Name & Email */}
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{user.name}</h3>
                <p className="text-gray-300 text-xs sm:text-sm break-words">{user.email}</p>
              </div>
            </div>

            {/* Right Side - User Details */}
            <div className="flex-1 space-y-4 sm:space-y-6">
              {/* Personal Info */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4">
                <h4 className="text-gray-200 font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Gender</label>
                    <p className="text-white font-semibold text-sm sm:text-base">{user.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Father's Name</label>
                    <p className="text-white font-semibold text-sm sm:text-base">{user.fatherName || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4">
                <h4 className="text-gray-200 font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  Contact Details
                </h4>
                <div>
                  <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Phone Number</label>
                  <p className="text-white font-semibold text-base sm:text-lg">
                    {user.phone ? formatPhoneNumber(user.phone) : 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4">
                <h4 className="text-gray-200 font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-gray-400" />
                  Account Details
                </h4>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-3 sm:mb-4">
                   <div>
                     <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Role</label>
                     <div className="mt-1">
                       {getRoleBadge(user.role)}
                     </div>
                   </div>
                   <div>
                     <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Status</label>
                     <div className="mt-1">
                       {getStatusBadge(user.status)}
                     </div>
                   </div>
                 </div>
                                   <div>
                    <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Fingerprint Status</label>
                    <div className="mt-1">
                      {user.fingerprintStatus === 'enrolled' ? (
                        <Badge className="bg-green-600 text-xs">Enrolled</Badge>
                      ) : user.fingerprintStatus === 'pending' ? (
                        <Badge className="bg-yellow-600 text-xs">Pending</Badge>
                      ) : (
                        <Badge className="bg-red-600 text-xs">Not Enrolled</Badge>
                      )}
                    </div>
                  </div>
                  
                  
              </div>

              {/* Address */}
              {user.address && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4">
                  <h4 className="text-gray-200 font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    Address
                  </h4>
                  <div>
                    <p className="text-white leading-relaxed text-sm sm:text-base">{user.address}</p>
                  </div>
                </div>
              )}

              {/* Member Since */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4">
                <h4 className="text-gray-200 font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  Member Since
                </h4>
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base">
                    {user.createdAt.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  )
}
