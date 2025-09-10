import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "../lib/firebase"

// Default admin credentials
const DEFAULT_ADMIN = {
  email: "admin@rangefit.com",
  password: "admin123",
  name: "Range Fit Admin",
}

export async function setupDefaultAdmin() {
  try {
    console.log("Creating default admin account...")

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, DEFAULT_ADMIN.email, DEFAULT_ADMIN.password)

    const user = userCredential.user

    // Create Firestore document with password hash for admin authentication
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: DEFAULT_ADMIN.email,
      name: DEFAULT_ADMIN.name,
      role: "admin",
      passwordHash: DEFAULT_ADMIN.password, // Store password hash for admin authentication
      createdAt: new Date().toISOString(),
    })

    console.log("✅ Default admin created successfully!")
    console.log("Email:", DEFAULT_ADMIN.email)
    console.log("Password:", DEFAULT_ADMIN.password)

    return true
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      console.log("ℹ️ Admin account already exists")
      // Update existing admin with password hash
      try {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("email", "==", DEFAULT_ADMIN.email))
        const querySnapshot = await getDocs(q)
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0]
          await setDoc(doc(db, "users", userDoc.id), {
            passwordHash: DEFAULT_ADMIN.password, // Add password hash to existing admin
          }, { merge: true })
          console.log("✅ Updated existing admin with password hash")
        }
      } catch (updateError) {
        console.error("❌ Error updating existing admin:", updateError)
      }
      return true
    }
    console.error("❌ Error creating admin:", error.message)
    return false
  }
}
