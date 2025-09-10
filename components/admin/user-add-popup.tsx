"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, UserPlus, Mail, Phone, User, MapPin, Shield, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, setDoc, doc, getDoc, deleteDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut, getAuth } from 'firebase/auth'
import { initializeApp } from 'firebase/app'
import { db, auth, generateUniqueMemberId } from '@/lib/firebase'

// Create a separate Firebase app instance for admin user creation to avoid disrupting admin session
const adminFirebaseConfig = {
  apiKey: "AIzaSyC7E9eW76lEokK0QD06bjP92fad9QjW2MI",
  authDomain: "rangefitgym-8bae0.firebaseapp.com",
  projectId: "rangefitgym-8bae0",
  storageBucket: "rangefitgym-8bae0.firebasestorage.app",
  messagingSenderId: "416962107238",
  appId: "1:416962107238:web:7332b17126848e05059aa7",
  measurementId: "G-2KC9MHN9DH",
}

const adminApp = initializeApp(adminFirebaseConfig, 'admin-user-creation')
const adminAuth = getAuth(adminApp)

interface UserAddPopupProps {
  onClose: () => void
  onUserAdded: () => void
}

export default function UserAddPopup({ onClose, onUserAdded }: UserAddPopupProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    fatherName: '',
    address: '',
    role: 'customer',
    password: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [genderDropdownOpen, setGenderDropdownOpen] = useState(false)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\s/g, '')
    // Only add space if there are more than 4 digits
    if (cleaned.length > 4) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
    }
    return cleaned
  }

  const handlePhoneChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '')
    
    // Limit to 11 digits
    if (digitsOnly.length <= 11) {
      handleInputChange('phone', digitsOnly)
    }
  }

  // Handle dropdown changes
  const handleGenderChange = (value: string) => {
    handleInputChange('gender', value)
    // Close dropdown after a small delay to ensure smooth animation
    setTimeout(() => setGenderDropdownOpen(false), 100)
  }

  const handleRoleChange = (value: string) => {
    handleInputChange('role', value)
    // Close dropdown after a small delay to ensure smooth animation
    setTimeout(() => setRoleDropdownOpen(false), 100)
  }

  // Handle dropdown open/close
  const handleGenderDropdownToggle = () => {
    setGenderDropdownOpen(!genderDropdownOpen)
  }

  const handleRoleDropdownToggle = () => {
    setRoleDropdownOpen(!roleDropdownOpen)
  }

  // Handle dropdown close when clicking outside
  const handleGenderDropdownClose = () => {
    setGenderDropdownOpen(false)
  }

  const handleRoleDropdownClose = () => {
    setRoleDropdownOpen(false)
  }

  const validateForm = () => {
    // Validate required fields (same as signup)
    if (!formData.name?.trim()) {
      toast.error('Please enter the full name')
      return false
    }
    if (!formData.email?.trim()) {
      toast.error('Please enter the email address')
      return false
    }
    if (!formData.password?.trim()) {
      toast.error('Please enter a password')
      return false
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return false
    }
    
    // Phone validation (mandatory)
    if (!formData.phone?.trim()) {
      toast.error('Please enter the phone number')
      return false
    }
    if (formData.phone.length !== 11) {
      toast.error('Phone number must be 11 digits')
      return false
    }
    
    // Additional validations for admin-created users
    if (!formData.gender?.trim()) {
      toast.error('Please select a gender')
      return false
    }
    if (!formData.fatherName?.trim()) {
      toast.error('Please enter the father\'s name')
      return false
    }
    if (!formData.address?.trim()) {
      toast.error('Please enter the address')
      return false
    }
    
    return true
  }

  // Check if email already exists
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('email', '==', email.toLowerCase()))
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        return false // Email doesn't exist
      }
      
      // Check if the existing user is marked as deleted
      const existingUser = querySnapshot.docs[0].data()
      if (existingUser.isDeleted || existingUser.status === 'deleted') {
        console.log('ℹ️ Found deleted user with same email, allowing reuse:', email)
        return false // Allow email reuse for deleted users
      }
      
      return true // Email exists and user is not deleted
    } catch (error) {
      console.error('Error checking email:', error)
      return false
    }
  }

  // Check if member ID already exists
  const checkMemberIdExists = async (memberId: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('memberId', '==', memberId))
      const querySnapshot = await getDocs(q)
      return !querySnapshot.empty
    } catch (error) {
      console.error('Error checking member ID:', error)
      return false
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      // Check if email already exists in Firestore
      const emailExists = await checkEmailExists(formData.email.trim())
      if (emailExists) {
        toast.error('User already exists!', {
          description: 'An account with this email address already exists.',
          duration: 4000,
        })
        return
      }

      // Check if there's a deleted user with the same email that we can clean up
      const usersRef = collection(db, 'users')
      const emailQuery = query(usersRef, where('email', '==', formData.email.trim().toLowerCase()))
      const emailSnapshot = await getDocs(emailQuery)
      
      let oldUserDocId: string | null = null
      if (!emailSnapshot.empty) {
        const existingUser = emailSnapshot.docs[0].data()
        if (existingUser.isDeleted || existingUser.status === 'deleted') {
          oldUserDocId = emailSnapshot.docs[0].id
          console.log('🔧 Found deleted user with same email, will clean up old data:', oldUserDocId)
        }
      }



      // Generate unique member ID (same as signup)
      const memberId = await generateUniqueMemberId()
      
      // Double-check that the generated member ID doesn't exist (extra safety)
      const memberIdExists = await checkMemberIdExists(memberId)
      if (memberIdExists) {
        toast.error('System Error!', {
          description: 'Generated member ID already exists. Please try again.',
          duration: 4000,
        })
        return
      }

      const now = new Date()

      console.log('🔧 Admin creating user with data:', {
        email: formData.email.trim(),
        name: formData.name.trim(),
        role: formData.role,
        memberId
      })

      // Create Firebase Auth account first
      console.log('🔧 Creating Firebase Auth account for new user...')
      let userCredential
      try {
        userCredential = await createUserWithEmailAndPassword(
          adminAuth, 
          formData.email.trim(), 
          formData.password
        )
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          console.log('⚠️ Firebase Auth account exists but Firestore doc was deleted')
          console.log('🔧 This means the user was deleted from Firestore but Auth account remains')
          
          // Show a helpful message to the admin
          toast.error('Email in use by existing account!', {
            description: 'This email is associated with an existing Firebase Auth account. The user was likely deleted from the database but the Auth account still exists. Please contact support to clean up the orphaned account.',
            duration: 5000,
          })
          return
        } else {
          // Re-throw other auth errors
          throw authError
        }
      }
      
      const firebaseUID = userCredential.user.uid
      console.log('✅ Firebase Auth account created with UID:', firebaseUID)

      // Prepare user data with the actual Firebase Auth UID
      const userData = {
        uid: firebaseUID, // Use the actual Firebase Auth UID
        memberId,
        email: formData.email.trim().toLowerCase(),
        name: formData.name.trim(),
        role: formData.role,
        createdAt: now,
        memberSince: now,
        lastLoginAt: null, // Set to null since user has never logged in
        profileComplete: false, // Set to false like manually registered users
        status: 'active',
        fingerprintStatus: 'not_enrolled',
        // Only add phone if it's provided and not empty
        ...(formData.phone?.trim() && { phone: formData.phone.trim() }),
        // Additional fields for admin-created users
        gender: formData.gender.trim(),
        fatherName: formData.fatherName.trim(),
        address: formData.address.trim(),
        // Mark as admin-created for tracking
        createdBy: 'admin',
        // Store password hash for future reference (optional)
        passwordSetAt: now,
        passwordSetBy: 'admin',
        // Store password hash for admin authentication
        passwordHash: formData.password
      }

      // Create the Firestore document with the Firebase Auth UID
      console.log('🔧 Creating Firestore document with Firebase Auth UID...')
      await setDoc(doc(db, 'users', firebaseUID), userData)
      
      // If there was an old deleted user with the same email, clean it up
      if (oldUserDocId) {
        console.log('🔧 Cleaning up old deleted user data:', oldUserDocId)
        try {
          await deleteDoc(doc(db, 'users', oldUserDocId))
          console.log('✅ Successfully cleaned up old deleted user data')
        } catch (cleanupError) {
          console.warn('⚠️ Failed to clean up old user data (non-critical):', cleanupError)
        }
      }
      
      console.log('✅ Successfully created user with matching UIDs:', {
        firebaseUID,
        memberId,
        email: formData.email.trim()
      })

      // Sign out the newly created user to prevent admin from being logged in as the new user
      console.log('🔧 Signing out newly created user to maintain admin session...')
      await signOut(adminAuth)
      
      toast.success('User added successfully! 🎉', {
        description: 'The user can now login with their email and password.',
        duration: 4000,
      })
      
      onUserAdded()
      onClose()
    } catch (error: any) {
      console.error('❌ Error adding user:', error)
      
      // Handle specific errors with user-friendly messages
      let errorMessage = 'Failed to add user. Please try again.'
      let errorTitle = 'Failed to add user!'
      
      if (error.code === 'auth/email-already-in-use') {
        errorTitle = 'Email already in use!'
        errorMessage = 'A user with this email address already exists.'
      } else if (error.code === 'auth/weak-password') {
        errorTitle = 'Password too weak!'
        errorMessage = 'Please choose a stronger password (at least 6 characters).'
             } else if (error.code === 'auth/invalid-email') {
         errorTitle = 'Invalid email!'
         errorMessage = 'Please enter a valid email address.'
       } else if (error.code === 'permission-denied') {
         errorTitle = 'Permission denied!'
         errorMessage = 'Please check your admin privileges and Firebase rules. This might be a Firebase security rules issue.'
       } else if (error.message?.includes('Admin session was compromised')) {
        errorTitle = 'Admin session error!'
        errorMessage = 'Please refresh the page and try again.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorTitle, {
        description: errorMessage,
        duration: 5000,
      })
      
      // Keep the popup open so admin can correct the error and try again
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div ref={popupRef} className="bg-gray-800/90 backdrop-blur-xl border border-gray-700 rounded-xl sm:rounded-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-orange-600/20 rounded-lg">
              <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white">Add New User</h2>
              <p className="text-gray-400 text-xs sm:text-sm">Create a new customer or receptionist account</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Left Column - Basic Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter full name"
                    className="pl-10 bg-gray-700 border-gray-600 text-white text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
                    className="pl-10 bg-gray-700 border-gray-600 text-white text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
              </div>

                             <div>
                 <Label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">
                   Phone Number *
                 </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="tel"
                    value={formatPhoneNumber(formData.phone)}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="03XX XXXXXXX"
                    className="pl-10 bg-gray-700 border-gray-600 text-white text-sm sm:text-base h-10 sm:h-11"
                    maxLength={12}
                  />
                </div>
              </div>

                             <div>
                 <Label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">
                   Gender *
                 </Label>
                 <div className="relative">
                   <select
                     value={formData.gender}
                     onChange={(e) => handleGenderChange(e.target.value)}
                     onClick={handleGenderDropdownToggle}
                     onBlur={handleGenderDropdownClose}
                     className="w-full bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 appearance-none cursor-pointer text-sm sm:text-base h-10 sm:h-11"
                   >
                     <option value="">Select gender</option>
                     <option value="male">Male</option>
                     <option value="female">Female</option>
                   </select>
                   <ChevronDown 
                     className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${
                       genderDropdownOpen ? 'rotate-180' : ''
                     }`}
                   />
                 </div>
               </div>
            </div>

            {/* Right Column - Additional Info */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">
                  Father's Name *
                </Label>
                <Input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => handleInputChange('fatherName', e.target.value)}
                  placeholder="Enter father's name"
                  className="bg-gray-700 border-gray-600 text-white text-sm sm:text-base h-10 sm:h-11"
                />
              </div>

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">
                  Address *
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter complete address"
                    className="pl-10 bg-gray-700 border-gray-600 text-white text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
              </div>

                             <div>
                 <Label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">
                   Role *
                 </Label>
                 <div className="relative">
                   <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                   <select
                     value={formData.role}
                     onChange={(e) => handleRoleChange(e.target.value)}
                     onClick={handleRoleDropdownToggle}
                     onBlur={handleRoleDropdownClose}
                     className="w-full pl-10 bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 appearance-none cursor-pointer text-sm sm:text-base h-10 sm:h-11"
                   >
                     <option value="customer">Customer</option>
                     <option value="receptionist">Receptionist</option>
                   </select>
                   <ChevronDown 
                     className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${
                       roleDropdownOpen ? 'rotate-180' : ''
                     }`}
                   />
                 </div>
               </div>

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">
                  Password *
                </Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password (min 6 characters)"
                  className="bg-gray-700 border-gray-600 text-white text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-700">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full sm:w-auto border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white text-sm sm:text-base h-10 sm:h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white text-sm sm:text-base h-10 sm:h-11"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding User...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
