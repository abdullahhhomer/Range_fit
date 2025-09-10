import { authenticateWithAdminPassword } from "../lib/firebase/authentication"

// Test the admin password authentication
async function testLogin() {
  try {
    console.log("🧪 Testing admin password authentication...")
    
    // Test with default admin credentials
    const result = await authenticateWithAdminPassword("admin@rangefit.com", "admin123")
    
    console.log("✅ Login successful!")
    console.log("User data:", {
      uid: result.uid,
      email: result.email,
      name: result.name,
      role: result.role
    })
    
    return true
  } catch (error: any) {
    console.error("❌ Login failed:", error.message)
    return false
  }
}

// Run the test
testLogin().then(success => {
  if (success) {
    console.log("🎉 Authentication test passed!")
  } else {
    console.log("💥 Authentication test failed!")
  }
  process.exit(success ? 0 : 1)
})
