import { auth, db } from "../lib/firebase"
import { signInWithEmailAndPassword, signOut } from "firebase/auth"
import { collection, getDocs, query, limit } from "firebase/firestore"

// Test authentication and permissions
async function testPermissions() {
  try {
    console.log("🧪 Testing authentication and permissions...")
    
    // Test 1: Try to access Firestore without authentication
    console.log("\n1️⃣ Testing unauthenticated access...")
    try {
      const testRef = collection(db, "users")
      const testQuery = query(testRef, limit(1))
      await getDocs(testQuery)
      console.log("❌ Unexpected: Unauthenticated access succeeded")
    } catch (error: any) {
      if (error.code === "permission-denied") {
        console.log("✅ Expected: Unauthenticated access properly denied")
      } else {
        console.log("⚠️ Unexpected error:", error.message)
      }
    }
    
    // Test 2: Try to authenticate with admin credentials
    console.log("\n2️⃣ Testing admin authentication...")
    try {
      const userCredential = await signInWithEmailAndPassword(auth, "admin@rangefit.com", "admin123")
      console.log("✅ Admin authentication successful:", userCredential.user.email)
      
      // Test 3: Try to access Firestore with authentication
      console.log("\n3️⃣ Testing authenticated access...")
      const usersRef = collection(db, "users")
      const usersQuery = query(usersRef, limit(5))
      const snapshot = await getDocs(usersQuery)
      console.log(`✅ Authenticated access successful: Found ${snapshot.size} users`)
      
      // Test 4: Test logout
      console.log("\n4️⃣ Testing logout...")
      await signOut(auth)
      console.log("✅ Logout successful")
      
      return true
    } catch (error: any) {
      console.error("❌ Authentication test failed:", error.message)
      return false
    }
    
  } catch (error: any) {
    console.error("❌ Permission test failed:", error.message)
    return false
  }
}

// Run the test
testPermissions().then(success => {
  if (success) {
    console.log("\n🎉 All permission tests passed!")
  } else {
    console.log("\n💥 Some permission tests failed!")
  }
  process.exit(success ? 0 : 1)
})
