"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getProfileImageUrl } from '@/lib/cloudinary-client'
import { X, Edit, User, Phone, MapPin, Shield, Mail, ChevronDown, Fingerprint } from 'lucide-react'
import FingerprintRegistration from './fingerprint-registration'


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

interface UserEditPopupProps {
  user: User
  onClose: () => void
  onUpdate: (updateData: any) => Promise<void>
  formatPhoneNumber: (phone: string) => string
}

export default function UserEditPopup({ 
  user, 
  onClose, 
  onUpdate, 
  formatPhoneNumber 
}: UserEditPopupProps) {
  const [editFormData, setEditFormData] = useState({
    name: '',
    gender: '',
    fatherName: '',
    email: '',
    address: '',
    phone: '',
    newPassword: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [genderDropdownOpen, setGenderDropdownOpen] = useState(false)
  const [showFingerprintRegistration, setShowFingerprintRegistration] = useState(false)
  
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

  useEffect(() => {
    setEditFormData({
      name: user.name || '',
      gender: user.gender || '',
      fatherName: user.fatherName || '',
      email: user.email || '',
      address: user.address || '',
      phone: user.phone ? formatPhoneNumber(user.phone) : '',
      newPassword: ''
    })
  }, [user, formatPhoneNumber])

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      const updateData: any = {
        name: editFormData.name,
        gender: editFormData.gender,
        fatherName: editFormData.fatherName,
        address: editFormData.address,
        phone: editFormData.phone
      }

      // Only update email if it changed
      if (editFormData.email !== user.email) {
        updateData.email = editFormData.email
      }

      // Handle password change separately if provided
      if (editFormData.newPassword && editFormData.newPassword.trim() !== '') {
        updateData.newPassword = editFormData.newPassword
      }

      await onUpdate(updateData)
    } catch (error) {
      console.error('Error updating user:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleGenderDropdownToggle = () => {
    setGenderDropdownOpen(!genderDropdownOpen)
  }

  const handleGenderDropdownClose = () => {
    setGenderDropdownOpen(false)
  }

  const handleGenderSelect = (gender: string) => {
    setEditFormData({...editFormData, gender})
    setGenderDropdownOpen(false)
  }

  const handleFingerprintStatusUpdate = (newStatus: "enrolled" | "not_enrolled" | "pending") => {
    // This will be handled by the parent component when needed
    console.log('Fingerprint status updated:', newStatus)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div ref={popupRef} className="bg-gray-900 border border-gray-700 rounded-xl sm:rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-3 sm:p-4 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold text-white">Edit User Profile</h3>
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

            {/* Right Side - Form Fields */}
            <div className="flex-1 space-y-4 sm:space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4">
                <h4 className="text-gray-200 font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  Personal Information
                </h4>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Full Name</label>
                    <Input
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500/20 rounded-lg h-10 sm:h-11 text-sm sm:text-base"
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div>
                    <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Gender</label>
                    <div className="relative">
                      <div
                        onClick={handleGenderDropdownToggle}
                        onBlur={handleGenderDropdownClose}
                        className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 cursor-pointer flex items-center justify-between h-10 sm:h-11 hover:bg-gray-600 transition-colors text-sm sm:text-base"
                      >
                        <span className={editFormData.gender ? 'text-white' : 'text-gray-400'}>
                          {editFormData.gender ? editFormData.gender.charAt(0).toUpperCase() + editFormData.gender.slice(1) : 'Select Gender'}
                        </span>
                        <ChevronDown 
                          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                            genderDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                      
                      {genderDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10">
                          <div 
                            className="px-3 py-2 hover:bg-gray-600 cursor-pointer text-white text-sm sm:text-base"
                            onClick={() => handleGenderSelect('male')}
                          >
                            Male
                          </div>
                          <div 
                            className="px-3 py-2 hover:bg-gray-600 cursor-pointer text-white text-sm sm:text-base"
                            onClick={() => handleGenderSelect('female')}
                          >
                            Female
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Father's Name</label>
                    <Input
                      value={editFormData.fatherName}
                      onChange={(e) => setEditFormData({...editFormData, fatherName: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500/20 rounded-lg h-10 sm:h-11 text-sm sm:text-base"
                      placeholder="Enter father's name"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4">
                <h4 className="text-gray-200 font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  Contact Information
                </h4>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Email Address</label>
                    <Input
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500/20 rounded-lg h-10 sm:h-11 text-sm sm:text-base"
                      type="email"
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div>
                    <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Phone Number</label>
                    <Input
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500/20 rounded-lg h-10 sm:h-11 text-sm sm:text-base"
                      placeholder="03XX XXXXXXX"
                    />
                  </div>
                  

                  
                  <div>
                    <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Fingerprint Registration</label>
                    <Button
                      type="button"
                      onClick={() => setShowFingerprintRegistration(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors h-10 sm:h-11 flex items-center space-x-2 w-full text-sm sm:text-base"
                    >
                      <Fingerprint className="w-4 h-4" />
                      <span>Register Fingerprint</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Password Reset Section */}
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                    Set New Password
                  </label>
                  <Input
                    type="password"
                    name="newPassword"
                    placeholder="Enter new password for user"
                    value={editFormData.newPassword}
                    onChange={handleChange}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-orange-500 focus:border-orange-500 h-10 sm:h-11 text-sm sm:text-base"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    User can login immediately with this new password.
                  </p>
                </div>
              </div>

              {/* Address Section */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4">
                <h4 className="text-gray-200 font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  Address
                </h4>
                <textarea
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                  className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 rounded-lg px-3 py-2 resize-none focus:border-gray-500 focus:ring-gray-500/20 text-sm sm:text-base"
                  rows={3}
                  placeholder="Enter complete address"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6 border-t border-gray-700">
                <Button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold transition-colors h-11 sm:h-12 text-sm sm:text-base"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Profile'
                  )}
                </Button>
                                 <Button
                   variant="outline"
                   onClick={onClose}
                   className="flex-1 border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 py-3 rounded-lg font-semibold transition-colors h-11 sm:h-12 bg-white text-sm sm:text-base"
                 >
                   Cancel
                 </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showFingerprintRegistration && (
        <FingerprintRegistration
          userId={user.uid}
          userEmail={user.email}
          userName={user.name}
          currentStatus={user.fingerprintStatus as "enrolled" | "not_enrolled" | "pending"}
          onStatusUpdate={handleFingerprintStatusUpdate}
          onClose={() => setShowFingerprintRegistration(false)}
        />
      )}
    </div>
  )
}
