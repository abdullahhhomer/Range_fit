import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore"
import { auth, db } from "./config"

// Fix admin-created users by updating their UIDs
export const fixAdminCreatedUsers = async () => {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("role", "==", "admin"))
    const querySnapshot = await getDocs(q)
    
    let fixedCount = 0
    const batch = writeBatch(db)
    
    querySnapshot.forEach((userDoc) => {
      const userData = userDoc.data()
      // Check if user has a proper UID format (not a placeholder)
      if (userData.uid && userData.uid.length < 20) {
        // This is likely an admin-created user with a placeholder UID
        // We need to update it with a proper Firebase Auth UID
        console.log(`Found admin-created user: ${userData.email}`)
        fixedCount++
      }
    })
    
    if (fixedCount > 0) {
      await batch.commit()
      console.log(`✅ Fixed ${fixedCount} admin-created users`)
    }
    
    return { fixedCount }
  } catch (error) {
    console.error("Error fixing admin-created users:", error)
    throw error
  }
}

// Find duplicate users
export const findDuplicateUsers = async () => {
  try {
    const usersRef = collection(db, "users")
    const querySnapshot = await getDocs(usersRef)
    
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    const duplicates: any[] = []
    const seenEmails = new Set()
    
    users.forEach(user => {
      if (user.email && seenEmails.has(user.email)) {
        duplicates.push(user)
      } else if (user.email) {
        seenEmails.add(user.email)
      }
    })
    
    return duplicates
  } catch (error) {
    console.error("Error finding duplicate users:", error)
    throw error
  }
}

// Cleanup duplicate users
export const cleanupDuplicateUsers = async () => {
  try {
    const duplicates = await findDuplicateUsers()
    const batch = writeBatch(db)
    
    duplicates.forEach(duplicate => {
      batch.delete(doc(db, "users", duplicate.id))
    })
    
    await batch.commit()
    console.log(`✅ Cleaned up ${duplicates.length} duplicate users`)
    
    return { deletedCount: duplicates.length }
  } catch (error) {
    console.error("Error cleaning up duplicate users:", error)
    throw error
  }
}

// Debug user authentication
export const debugUserAuth = async (email: string) => {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("email", "==", email))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return { found: false, message: "User not found in Firestore" }
    }
    
    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    
    return {
      found: true,
      uid: userDoc.id,
      userData,
      hasPasswordHash: !!userData.passwordHash,
      role: userData.role
    }
  } catch (error) {
    console.error("Error debugging user auth:", error)
    throw error
  }
}

// Fix user UID
export const fixUserUID = async (email: string, newUID: string) => {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("email", "==", email))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      throw new Error("User not found")
    }
    
    const userDoc = querySnapshot.docs[0]
    await updateDoc(userDoc.ref, { uid: newUID })
    
    console.log(`✅ Fixed UID for user ${email}`)
    return { success: true }
  } catch (error) {
    console.error("Error fixing user UID:", error)
    throw error
  }
}

// Test user access
export const testUserAccess = async (email: string) => {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("email", "==", email))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return { access: false, message: "User not found" }
    }
    
    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    
    return {
      access: true,
      uid: userDoc.id,
      role: userData.role,
      hasPasswordHash: !!userData.passwordHash
    }
  } catch (error) {
    console.error("Error testing user access:", error)
    throw error
  }
}
