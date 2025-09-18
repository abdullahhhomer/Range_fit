"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getProfileImageUrl } from '@/lib/cloudinary-client'
import { X, Trash2, AlertTriangle, User, Mail, Shield } from 'lucide-react'

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
  fingerprintStatus?: "enrolled" | "not_enrolled" | "pending"
  deletedAt?: Date
  deletedBy?: string
  isDeleted?: boolean
}

interface UserDeletePopupProps {
  user: User
  onClose: () => void
  onDelete: (userId: string) => Promise<void>
  isDeleting: boolean
}

export default function UserDeletePopup({ 
  user, 
  onClose, 
  onDelete, 
  isDeleting 
}: UserDeletePopupProps) {
  const handleDelete = async () => {
    try {
      await onDelete(user.uid)
      onClose()
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl sm:rounded-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-red-800/20 border-b border-red-700/50 p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            <h3 className="text-lg sm:text-xl font-bold text-white">Delete User Account</h3>
          </div>
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
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Warning Message */}
          <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-3 sm:p-4">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-red-200">
                <p className="font-semibold text-base sm:text-lg mb-2">⚠️ Warning: This action cannot be undone!</p>
                <p className="text-red-300 text-xs sm:text-sm leading-relaxed">
                  Deleting this user account will permanently remove ALL user data including:
                </p>
                <ul className="text-red-300/80 text-xs sm:text-sm mt-2 space-y-1">
                  <li>• User profile and personal information</li>
                  <li>• Membership and attendance records</li>
                  <li>• Payment records and transaction history</li>
                  <li>• Receipt documents and PDFs</li>
                  <li>• Profile images from Cloudinary storage</li>
                  <li>• Fingerprint enrollment data</li>
                  <li>• All associated gym activities and history</li>
                </ul>
                <div className="mt-3 p-2 bg-red-800/30 rounded-lg border border-red-600/50">
                  <p className="text-red-200 text-xs font-semibold">
                    ⚠️ This is a COMPLETE deletion - no data will be preserved!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* User Information */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4">
            <h4 className="text-gray-200 font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center">
              <User className="w-4 h-4 mr-2 text-gray-400" />
              User to be Deleted
            </h4>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Profile Image */}
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-gray-600">
                  <AvatarImage 
                    src={user.profileImageUrl ? getProfileImageUrl(user.profileImageUrl, 80) : undefined} 
                    alt={`${user.name}'s profile picture`}
                  />
                  <AvatarFallback className="bg-gray-700 text-white text-lg sm:text-xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* User Details */}
              <div className="flex-1 space-y-2 sm:space-y-3 text-center sm:text-left">
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Name:</span>
                  <p className="text-white font-semibold text-base sm:text-lg">{user.name}</p>
                </div>
                
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Email:</span>
                  <p className="text-white font-medium text-sm sm:text-base">{user.email}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <span className="text-gray-400 text-xs sm:text-sm">Role:</span>
                    <p className="text-white font-medium capitalize text-sm sm:text-base">{user.role}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs sm:text-sm">Status:</span>
                    <p className="text-white font-medium capitalize text-sm sm:text-base">{user.status}</p>
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Member Since:</span>
                  <p className="text-white font-medium text-sm sm:text-base">
                    {user.createdAt.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-3 sm:pt-4 border-t border-gray-700">
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors h-11 sm:h-12 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 mr-0" />
                  Delete User Account
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 border-orange-500 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 py-3 rounded-lg font-semibold transition-colors h-11 sm:h-12 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
