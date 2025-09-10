import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "./config"
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"

// Generate unique member ID with RF prefix and 6 digits
export const generateUniqueMemberId = async (): Promise<string> => {
  try {
    // Generate a 6-digit random number
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString()
    const memberId = `RF-${randomDigits}`
    
    // Check if this member ID already exists
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("memberId", "==", memberId))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      // If ID exists, generate a new one recursively
      return generateUniqueMemberId()
    }
    
    return memberId
  } catch (error) {
    console.error("Error generating unique member ID:", error)
    // Fallback to simple random ID
    const fallbackDigits = Math.floor(100000 + Math.random() * 900000).toString()
    return `RF-${fallbackDigits}`
  }
}

// Update user password with re-authentication - optimized
export const updateUserPasswordWithReauth = async (
  currentPassword: string,
  newPassword: string,
  userEmail: string
) => {
  try {
    // Single database query to get user data
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("email", "==", userEmail))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      throw new Error("User not found")
    }
    
    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    
    // Verify current password
    const expectedPassword = userData.passwordHash || "admin12345"
    if (expectedPassword !== currentPassword) {
      throw new Error("Current password is incorrect")
    }
    
    // Update password in Firestore
    const userRef = doc(db, "users", userDoc.id)
    await setDoc(userRef, { 
      passwordHash: newPassword,
      lastPasswordUpdate: new Date()
    }, { merge: true })
    
    // Update Firebase Auth password if user is currently authenticated
    if (auth.currentUser && auth.currentUser.email === userEmail) {
      try {
        await updatePassword(auth.currentUser, newPassword)
      } catch (firebaseError: any) {
        // Don't fail the operation - Firestore update is more important
        console.warn('Could not update Firebase Auth password:', firebaseError)
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error updating password:", error)
    throw error
  }
}

// Custom authentication session management
export const checkCustomAuthSession = (): any => {
  try {
    const session = localStorage.getItem('customAuthSession')
    if (session) {
      const parsedSession = JSON.parse(session)
      // Check if session is still valid (not expired)
      if (parsedSession.expiresAt && new Date(parsedSession.expiresAt) > new Date()) {
        return parsedSession.user
      } else {
        // Session expired, clear it
        clearCustomAuthSession()
        return null
      }
    }
    return null
  } catch (error) {
    console.error("Error checking custom auth session:", error)
    return null
  }
}

export const clearCustomAuthSession = () => {
  try {
    localStorage.removeItem('customAuthSession')
    console.log("✅ Custom auth session cleared")
  } catch (error) {
    console.error("Error clearing custom auth session:", error)
  }
}

// Utility function to create admin user with custom password
export const createAdminUser = async (email: string, password: string, name: string) => {
  try {
    const usersRef = collection(db, "users")
    
    // Check if user already exists
    const q = query(usersRef, where("email", "==", email))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      throw new Error("User with this email already exists")
    }
    
    // Generate unique member ID
    const memberId = await generateUniqueMemberId()
    const now = new Date()
    
    // Create admin user data
    const userData = {
      uid: `admin_${Date.now()}`, // Temporary UID for admin users
      memberId,
      email,
      name,
      role: "admin",
      createdAt: now,
      memberSince: now,
      lastLoginAt: now,
      profileComplete: true,
      passwordHash: password // Store custom password for admin
    }
    
    // Save to Firestore (using email as document ID for easy lookup)
    await setDoc(doc(db, "users", `admin_${email.replace(/[^a-zA-Z0-9]/g, '_')}`), userData)
    
    console.log(`✅ Admin user created: ${email}`)
    return userData
  } catch (error) {
    console.error("Error creating admin user:", error)
    throw error
  }
}

// Optimized admin authentication - simplified and faster
export const adminLogin = async (email: string, password: string) => {
  try {
    // Single database query to get user data
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("email", "==", email))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      throw new Error("User not found")
    }
    
    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    
    if (userData.role !== 'admin') {
      throw new Error("User is not an admin")
    }
    
    // Verify password against Firestore
    const expectedPassword = userData.passwordHash || "admin12345"
    if (expectedPassword !== password) {
      throw new Error("Invalid password")
    }
    
    // Try Firebase Auth with the provided password
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password)
      
      // Update user document with Firebase UID if needed
      if (firebaseUser.uid !== userDoc.id) {
        await setDoc(doc(db, "users", firebaseUser.uid), {
          ...userData,
          uid: firebaseUser.uid
        }, { merge: true })
      }
      
      return userData
    } catch (firebaseError: any) {
      if (firebaseError.code === 'auth/user-not-found') {
        // Create new Firebase Auth user
        const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)
        
        await setDoc(doc(db, "users", firebaseUser.uid), {
          ...userData,
          uid: firebaseUser.uid
        }, { merge: true })
        
        return userData
      } else {
        // For other errors, throw the original error
        throw firebaseError
      }
    }
    
  } catch (error) {
    console.error("Admin login error:", error)
    throw error
  }
}

// Simplified authentication - use Firebase Auth for all users
export const optimizedLogin = async (email: string, password: string) => {
  try {
    // Single database query to get user data
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("email", "==", email))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      throw new Error("User not found")
    }
    
    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    
    // For admin users, use special admin authentication
    if (userData.role === 'admin' && userData.passwordHash) {
      return await adminLogin(email, password)
    }
    
    // For regular users, use standard Firebase Auth
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password)
      
      // Update the user document with Firebase UID if needed
      if (firebaseUser.uid !== userDoc.id && firebaseUser.uid !== userData.uid) {
        await setDoc(doc(db, "users", firebaseUser.uid), {
          ...userData,
          uid: firebaseUser.uid
        }, { merge: true })
      }
      
      return userData
    } catch (firebaseError: any) {
      if (firebaseError.code === 'auth/user-not-found') {
        // User doesn't exist in Firebase Auth, create them
        const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)
        
        // Update the user document with Firebase UID
        await setDoc(doc(db, "users", firebaseUser.uid), {
          ...userData,
          uid: firebaseUser.uid
        }, { merge: true })
        
        return userData
      } else if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
        throw new Error("Invalid password")
      } else {
        throw firebaseError
      }
    }
    
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}
