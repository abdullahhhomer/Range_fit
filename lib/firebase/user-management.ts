import { doc, getDoc, setDoc, updateDoc, type User } from "firebase/firestore"
import { db } from "./config"

// Utility functions for user management
export const createUserDocument = async (user: User, additionalData: any) => {
  if (!user) return

  const userRef = doc(db, "users", user.uid)
  const snapshot = await getDoc(userRef)

  if (!snapshot.exists()) {
    const { email, uid } = user
    const createdAt = new Date()

    try {
      await setDoc(userRef, {
        uid,
        email,
        createdAt,
        role: "customer", // Default role
        ...additionalData,
      })
    } catch (error) {
      console.error("Error creating user document:", error)
      throw error
    }
  }

  return userRef
}

export const getUserDocument = async (uid: string) => {
  if (!uid) return null

  try {
    const userRef = doc(db, "users", uid)
    const snapshot = await getDoc(userRef)

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() }
    }

    return null
  } catch (error) {
    console.error("Error getting user document:", error)
    throw error
  }
}

export const updateUserDocument = async (uid: string, data: any) => {
  if (!uid) return

  try {
    const userRef = doc(db, "users", uid)
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date(),
    })
  } catch (error) {
    console.error("Error updating user document:", error)
    throw error
  }
}
