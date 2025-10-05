"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getProfileImageUrl } from '@/lib/cloudinary-client'
import { X, Edit, User, Phone, MapPin, Shield, Mail, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'


interface User {
  uid: string
  memberId?: string
  email: string
  name: string
  phone?: string
  gender?: string
  cnic?: string
  address?: string
  role: "receptionist" | "customer"
  status: "active" | "inactive"
  createdAt: Date
  lastLoginAt?: Date
  profileComplete: boolean
  profileImageUrl?: string
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
    cnic: '',
    email: '',
    address: '',
    phone: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [genderDropdownOpen, setGenderDropdownOpen] = useState(false)
  
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
      cnic: user.cnic || '',
      email: user.email || '',
      address: user.address || '',
      phone: user.phone ? formatPhoneNumber(user.phone) : ''
    })
  }, [user, formatPhoneNumber])

  const handleUpdate = async () => {
    // Validate form data
    if (!editFormData.name?.trim()) {
      toast.error('Please enter the full name')
      return
    }
    if (!editFormData.email?.trim()) {
      toast.error('Please enter the email address')
      return
    }
    if (!editFormData.gender?.trim()) {
      toast.error('Please select a gender')
      return
    }
    
    // Phone validation (optional)
    if (editFormData.phone?.trim() && editFormData.phone.length !== 11) {
      toast.error('Phone number must be 11 digits')
      return
    }
    
    // CNIC validation (optional)
    if (editFormData.cnic?.trim() && editFormData.cnic.length !== 13) {
      toast.error('CNIC must be 13 digits')
      return
    }

    setIsUpdating(true)
    try {
      const updateData: any = {
        name: editFormData.name,
        gender: editFormData.gender,
        cnic: editFormData.cnic,
        address: editFormData.address,
        phone: editFormData.phone
      }

      // Only update email if it changed
      if (editFormData.email !== user.email) {
        updateData.email = editFormData.email
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

  const handlePhoneChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '')
    
    // Limit to 11 digits
    if (digitsOnly.length <= 11) {
      setEditFormData({...editFormData, phone: digitsOnly})
    }
  }

  const formatCNIC = (cnic: string) => {
    if (!cnic) return ''
    const cleaned = cnic.replace(/\D/g, '')
    
    if (cleaned.length <= 5) {
      return cleaned
    } else if (cleaned.length <= 12) {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
    } else {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12, 13)}`
    }
  }

  const handleCNICChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '')
    
    // Limit to 13 digits
    if (digitsOnly.length <= 13) {
      setEditFormData({...editFormData, cnic: digitsOnly})
    }
  }

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
                    <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">CNIC (Optional)</label>
                    <Input
                      value={formatCNIC(editFormData.cnic)}
                      onChange={(e) => handleCNICChange(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500/20 rounded-lg h-10 sm:h-11 text-sm sm:text-base"
                      placeholder="XXXXX-XXXXXXX-X"
                      maxLength={15}
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
                    <label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Phone Number (Optional)</label>
                    <Input
                      value={formatPhoneNumber(editFormData.phone)}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500/20 rounded-lg h-10 sm:h-11 text-sm sm:text-base"
                      placeholder="03XX XXXXXXX"
                      maxLength={12}
                    />
                  </div>
                </div>
              </div>


              {/* Address Section */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4">
                <h4 className="text-gray-200 font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  Address (Optional)
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
    </div>
  )
}
