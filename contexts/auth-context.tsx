"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db, updateUserEmailAndPassword, generateUniqueMemberId, onUserDataChange, optimizedLogin } from "@/lib/firebase"
import { toast } from "sonner"

interface UserData {
  uid: string
  memberId: string
  email: string
  name: string
  phone?: string
  fatherName?: string
  address?: string
  gender?: "Male" | "Female" | "Other"
  fingerprintId?: string
  profileImageUrl?: string | null
  role: "admin" | "receptionist" | "customer"
  createdAt: Date
  memberSince: Date
  lastLoginAt?: Date
  profileComplete: boolean
  passwordHash?: string // For admin authentication
  membership?: {
    planType: string
    startDate: Date
    endDate: Date
    status: "active" | "expired" | "cancelled" | "none"
    planName: string
    price: number
  }
}

interface AuthContextType {
  user: UserData | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<UserData>
  signup: (email: string, password: string, name: string, phone?: string) => Promise<UserData>
  logout: (onSuccess?: () => void) => Promise<void>
  updateUserCredentials: (newEmail?: string, newPassword?: string, currentPassword?: string) => Promise<void>
  updateUserProfile: (profileData: Partial<UserData>) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData
            setUser(userData)
          }
        } else {
          setUser(null)
        }
      } catch (err: any) {
        console.error("Error fetching user data:", err)
        const errorMessage = "Failed to load user data. Please refresh the page."
        setError(errorMessage)
        toast.error("Workout interrupted! 😅", {
          description: errorMessage,
          duration: 4000,
        })
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const signup = async (email: string, password: string, name: string, phone?: string) => {
    try {
      setError(null)
      setLoading(true)

      // Validate required fields before proceeding
      if (!email?.trim() || !password?.trim() || !name?.trim()) {
        throw new Error("Please fill in all required fields")
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long")
      }

      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email.trim(), password)

      console.log("✅ Firebase Auth user created:", firebaseUser.uid)

      // Generate unique member ID
      const memberId = await generateUniqueMemberId()
      const now = new Date()

      console.log("✅ Member ID generated:", memberId)

      // Prepare user data - only include phone if it has a value
      const userData: UserData = {
        uid: firebaseUser.uid,
        memberId,
        email: firebaseUser.email!,
        name: name.trim(),
        role: "customer", // Default role for new signups
        createdAt: now,
        memberSince: now,
        lastLoginAt: now,
        profileComplete: false
        // Note: Don't store passwordHash for regular users - they use Firebase Auth
        // passwordHash is only for admin-set passwords
      }

      // Only add phone if it's provided and not empty
      if (phone && phone.trim()) {
        userData.phone = phone.trim()
      }

      console.log("✅ User data prepared:", userData)

      // Save to Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), userData)
      console.log("✅ User data saved to Firestore")
      
      setUser(userData)
      
      toast.success("Welcome to RangeFit Gym! 🏋️‍♂️", {
        description: "Your account has been created successfully. Time to start your fitness journey!",
        duration: 4000,
      })
      
      // Return user data for immediate redirect
      return userData
    } catch (err: any) {
      console.error("Signup error:", err)
      
      // Handle specific Firebase errors with user-friendly messages
      let errorMessage = "Failed to create account"
      
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists. Please try logging in instead."
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address."
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please choose a stronger password."
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again."
      } else if (err.code === "permission-denied") {
        errorMessage = "Permission denied. Please try again or contact support."
      } else if (err.message) {
        errorMessage = err.message
      }
      
      console.error("Final error message:", errorMessage)
      setError(errorMessage)
      toast.error("Workout interrupted! 😅", {
        description: errorMessage,
        duration: 4000,
      })
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<UserData> => {
    try {
      setError(null)
      setLoading(true)

      console.log('🔍 Starting optimized login for:', email)

      // Validate required fields
      if (!email?.trim() || !password?.trim()) {
        throw new Error("Please enter both email and password")
      }

      // Use optimized login that determines auth method based on user type
      const userData = await optimizedLogin(email.trim(), password)

      if (!userData) {
        throw new Error("User data not found. Please contact support.")
      }

      // Update last login time
      try {
        await setDoc(doc(db, "users", userData.uid), {
          lastLoginAt: new Date()
        }, { merge: true })
      } catch (updateError) {
        console.warn("Could not update lastLoginAt:", updateError)
        // Don't fail the login for this - it's not critical
      }

      setUser(userData as UserData)
      
      toast.success("Welcome back! 🏋️‍♂️", {
        description: `Hello ${userData.name}! Ready for another great workout?`,
        duration: 4000,
      })

      return userData as UserData
    } catch (err: any) {
      console.error("Login error:", err)
      
      // Handle specific errors with user-friendly messages
      let errorMessage = "Login failed"
      
      if (err.message === "User not found") {
        errorMessage = "User not found. Please check your email address."
      } else if (err.message === "Invalid password") {
        errorMessage = "Incorrect password. Please try again."
      } else if (err.message === "User authentication mismatch") {
        errorMessage = "Authentication error. Please contact support."
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again."
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      toast.error("Workout interrupted! 😅", {
        description: errorMessage,
        duration: 4000,
      })
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const logout = async (onSuccess?: () => void) => {
    try {
      await signOut(auth)
      setUser(null)
      toast.success("Logged out successfully! 👋", {
        description: "Come back soon for more gains!",
        duration: 4000,
      })
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Logout failed! 😅", {
        description: "Please try again.",
        duration: 4000,
      })
    }
  }

  const updateUserCredentials = async (newEmail?: string, newPassword?: string, currentPassword?: string) => {
    try {
      setError(null)

      if (!auth.currentUser) {
        const errorMessage = "No authenticated user found. Please log in again."
        setError(errorMessage)
        toast.error("Workout interrupted! 😅", {
          description: errorMessage,
          duration: 4000,
        })
        throw new Error(errorMessage)
      }

      // If changing password, validate current password first
      if (newPassword && currentPassword) {
        try {
          // Re-authenticate user with current password
          const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword)
          await reauthenticateWithCredential(auth.currentUser, credential)
        } catch (error: any) {
          if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
            throw new Error("Current password is incorrect")
          }
          throw error
        }
      }

      await updateUserEmailAndPassword(auth.currentUser.uid, newEmail, newPassword)

      // Update local user state if email changed
      if (newEmail && user) {
        setUser({ ...user, email: newEmail })
      }
      
      // If password was changed, show a special message
      if (newPassword) {
        toast.success("Password updated successfully! 🔐", {
          description: "Your password has been changed. You may need to log in again for security.",
          duration: 5000,
        })
      } else {
        toast.success("Profile updated! 💪", {
          description: "Your credentials have been updated successfully. Keep pushing forward!",
          duration: 4000,
        })
      }
    } catch (err: any) {
      console.error("Update credentials error:", err)
      
      let errorMessage = "Failed to update credentials"
      
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already in use by another account."
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please choose a stronger password."
      } else if (err.code === "auth/requires-recent-login") {
        errorMessage = "For security reasons, please log out and log back in before changing your password."
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      toast.error("Workout interrupted! 😅", {
        description: errorMessage,
        duration: 4000,
      })
      throw new Error(errorMessage)
    }
  }

  const updateUserProfile = async (profileData: Partial<UserData>) => {
    try {
      setError(null)

      if (!user) {
        const errorMessage = "No authenticated user found. Please log in again."
        setError(errorMessage)
        toast.error("Workout interrupted! 😅", {
          description: errorMessage,
          duration: 4000,
        })
        throw new Error(errorMessage)
      }

      // Check if profile is complete based on required fields
      const updatedUserData = { ...user, ...profileData }
      const isProfileComplete = checkProfileCompletion(updatedUserData)

      // Add profileComplete status to the update
      const updateData = {
        ...profileData,
        profileComplete: isProfileComplete
      }

      // Update user document in Firestore
      await setDoc(doc(db, "users", user.uid), updateData, { merge: true })

      // Update local user state
      setUser({ ...user, ...updateData })
      
      toast.success("Profile updated! 💪", {
        description: "Your profile has been updated successfully. Keep pushing forward!",
        duration: 4000,
      })
    } catch (err: any) {
      console.error("Update profile error:", err)
      
      const errorMessage = err.message || "Failed to update profile"
      setError(errorMessage)
      toast.error("Workout interrupted! 😅", {
        description: errorMessage,
        duration: 4000,
      })
      throw new Error(errorMessage)
    }
  }

  // Helper function to check if profile is complete
  const checkProfileCompletion = (userData: UserData): boolean => {
    return !!(
      userData.name?.trim() &&
      userData.fatherName?.trim() &&
      userData.phone?.trim() &&
      userData.phone?.length === 11 &&
      userData.gender &&
      userData.address?.trim() &&
      userData.profileImageUrl
    )
  }

  const clearError = () => {
    setError(null)
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    updateUserCredentials,
    updateUserProfile,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
