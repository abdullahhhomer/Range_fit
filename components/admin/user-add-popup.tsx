"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, UserPlus, Mail, Phone, User, MapPin, Shield, ChevronDown, CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, setDoc, doc, getDoc, deleteDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut, getAuth } from 'firebase/auth'
import { initializeApp } from 'firebase/app'
import { db, auth, generateUniqueMemberId } from '@/lib/firebase'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'

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
    cnic: '',
    address: '',
    role: 'customer',
    password: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [genderDropdownOpen, setGenderDropdownOpen] = useState(false)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  
  // Custom expiry date states
  const [useCustomExpiryDate, setUseCustomExpiryDate] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [calculatedDays, setCalculatedDays] = useState(30)
  
  // Ref for the popup container to handle click outside
  const popupRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Check if click is on a popover/calendar element
      const isPopoverClick = target.closest('[role="dialog"]') || target.closest('.rdp')
      
      if (popupRef.current && !popupRef.current.contains(target) && !isPopoverClick) {
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

  const handlePhoneChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '')
    
    // Limit to 11 digits
    if (digitsOnly.length <= 11) {
      handleInputChange('phone', digitsOnly)
    }
  }

  const handleCNICChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '')
    
    // Limit to 13 digits
    if (digitsOnly.length <= 13) {
      handleInputChange('cnic', digitsOnly)
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

  // Handle date selection for custom expiry
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    
    if (date) {
      const today = new Date()
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()
      const selectedMonth = date.getMonth()
      const selectedYear = date.getFullYear()
      const currentDay = today.getDate()
      const selectedDay = date.getDate()
      
      // Check if date is from a previous month or year
      if (selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth)) {
        // Previous month/year - set remaining days to 0 (expired)
        setCalculatedDays(0)
      } else if (selectedYear === currentYear && selectedMonth === currentMonth) {
        // Same month - check if it's today or another day
        if (currentDay === selectedDay) {
          // If today is selected, calculate hours until midnight
          const now = new Date()
          const midnight = new Date(now)
          midnight.setHours(23, 59, 59, 999)
          const hoursLeft = Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60 * 60))
          setCalculatedDays(hoursLeft)
        } else if (selectedDay < currentDay) {
          // Past date in current month - set to 0 (expired)
          setCalculatedDays(0)
        } else {
          // Future date in current month
          let remainingDays = 30 - (currentDay + (30 - selectedDay))
          remainingDays = Math.max(1, Math.min(30, remainingDays))
          setCalculatedDays(remainingDays)
        }
      } else {
        // Future month - calculate normally
        let remainingDays = 30 - (currentDay - selectedDay)
        if (selectedDay > currentDay) {
          remainingDays = 30 - (currentDay + (30 - selectedDay))
        }
        remainingDays = Math.max(1, Math.min(30, remainingDays))
        setCalculatedDays(remainingDays)
      }
    }
  }

  // Handle custom expiry toggle
  const handleCustomExpiryToggle = (checked: boolean) => {
    setUseCustomExpiryDate(checked)
    if (!checked) {
      setSelectedDate(undefined)
      setCalculatedDays(30)
    }
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
    
    // Phone validation (optional)
    if (formData.phone?.trim() && formData.phone.length !== 11) {
      toast.error('Phone number must be 11 digits')
      return false
    }
    
    // CNIC validation (optional)
    if (formData.cnic?.trim() && formData.cnic.length !== 13) {
      toast.error('CNIC must be 13 digits')
      return false
    }
    
    // Additional validations for admin-created users
    if (!formData.gender?.trim()) {
      toast.error('Please select a gender')
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
        // Only add phone if it's provided and not empty
        ...(formData.phone?.trim() && { phone: formData.phone.trim() }),
        // Only add CNIC if it's provided and not empty
        ...(formData.cnic?.trim() && { cnic: formData.cnic.trim() }),
        // Only add address if it's provided and not empty
        ...(formData.address?.trim() && { address: formData.address.trim() }),
        // Additional fields for admin-created users
        gender: formData.gender.trim(),
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
                   Phone Number (Optional)
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
                  CNIC (Optional)
                </Label>
                <Input
                  type="text"
                  value={formatCNIC(formData.cnic)}
                  onChange={(e) => handleCNICChange(e.target.value)}
                  placeholder="XXXXX-XXXXXXX-X"
                  className="bg-gray-700 border-gray-600 text-white text-sm sm:text-base h-10 sm:h-11"
                  maxLength={15}
                />
              </div>

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">
                  Address (Optional)
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

          {/* Custom Expiry Date Section */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 sm:p-5">
            <label className="text-gray-300 text-sm font-medium mb-3 sm:mb-4 block">Membership Duration</label>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <input
                  type="checkbox"
                  id="customExpiryDate"
                  checked={useCustomExpiryDate}
                  onChange={(e) => handleCustomExpiryToggle(e.target.checked)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="customExpiryDate" className="font-medium cursor-pointer text-sm sm:text-base text-white">
                    Include Custom Expiry Date
                  </label>
                  <p className="text-gray-400 text-xs sm:text-sm">Backdate or adjust membership expiry for existing users</p>
                </div>
              </div>
              
              {/* Date Picker and Calculation */}
              {useCustomExpiryDate && (
                <div className="mt-4 pl-0 sm:pl-8 space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm font-medium mb-2 block">Select Expiry Day</label>
                    <p className="text-gray-400 text-xs mb-3">Choose the day when the membership should expire</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full sm:w-64 justify-start text-left font-normal bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:text-white ${
                            !selectedDate && "text-gray-400"
                          }`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          initialFocus
                          className="bg-gray-800 text-white"
                          disabled={(date) => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const maxDate = new Date(today)
                            maxDate.setDate(today.getDate() + 30)
                            
                            // Only disable dates more than 30 days from today
                            return date > maxDate
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Real-time Days/Hours Calculation Display */}
                  <div className={`border rounded-lg p-4 ${calculatedDays === 0 ? 'bg-red-900/20 border-red-700/50' : 'bg-blue-900/20 border-blue-700/50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold text-sm mb-1 ${calculatedDays === 0 ? 'text-red-200' : 'text-blue-200'}`}>Calculated Membership Duration</p>
                        <p className="text-gray-400 text-xs">Based on selected date: {selectedDate ? format(selectedDate, "dd/MM") : "Not selected"}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-3xl ${calculatedDays === 0 ? 'text-red-400' : 'text-blue-400'}`}>{calculatedDays}</p>
                        <p className="text-gray-400 text-xs">
                          {calculatedDays === 0 
                            ? 'Expired' 
                            : selectedDate && selectedDate.getDate() === new Date().getDate() 
                              ? 'hours' 
                              : 'days'
                          }
                        </p>
                      </div>
                    </div>
                    <div className={`mt-3 pt-3 border-t ${calculatedDays === 0 ? 'border-red-700/30' : 'border-blue-700/30'}`}>
                      <p className="text-gray-400 text-xs">
                        {calculatedDays === 0 
                          ? 'Previous month or past date selected - Membership expired'
                          : selectedDate && selectedDate.getDate() === new Date().getDate() 
                            ? `Hours until midnight: ${calculatedDays} hours left` 
                            : `Formula: 30 - (Today: ${new Date().getDate()} - Selected: ${selectedDate ? selectedDate.getDate() : 0}) = ${calculatedDays} days`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Default Duration Display */}
              {!useCustomExpiryDate && (
                <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-300 font-semibold text-sm">Default Membership Duration</p>
                      <p className="text-gray-400 text-xs mt-1">Standard 30-day period</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-300 font-bold text-3xl">30</p>
                      <p className="text-gray-400 text-xs">days</p>
                    </div>
                  </div>
                </div>
              )}
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
