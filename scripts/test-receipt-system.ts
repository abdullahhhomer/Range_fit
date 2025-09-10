// Test script for receipt system functionality
// This can be run in the browser console or as a development utility

import { createReceipt } from "@/lib/firebase"
import { downloadReceiptPDF, printReceipt } from "@/lib/receipt-pdf-generator"

// Test receipt data
const testReceiptData = {
  userId: "test-user-id",
  memberId: "RF001",
  customerName: "John Doe",
  membershipType: "Strength + Cardio",
  amount: 7500,
  paymentMethod: "Cash",
  transactionId: "TXN_TEST_001",
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  status: "active" as const,
  gymName: "RangeFit Gym",
  gymAddress: "123 Fitness Street, Karachi, Pakistan",
  gymPhone: "+92-300-1234567",
  gymEmail: "info@rangefitgym.com"
}

// Test receipt creation
export const testReceiptCreation = async () => {
  try {
    console.log("🧪 Testing receipt creation...")
    const receiptId = await createReceipt(testReceiptData)
    console.log("✅ Receipt created successfully:", receiptId)
    return receiptId
  } catch (error) {
    console.error("❌ Receipt creation failed:", error)
    throw error
  }
}

// Test PDF generation
export const testPDFGeneration = async () => {
  try {
    console.log("🧪 Testing PDF generation...")
    
    // Create a test receipt first
    const receiptId = await testReceiptCreation()
    
    // Mock receipt data for PDF test
    const mockReceipt = {
      ...testReceiptData,
      id: receiptId,
      receiptNumber: "RF-TEST-001",
      createdAt: new Date()
    }
    
    // Test download
    await downloadReceiptPDF(mockReceipt)
    console.log("✅ PDF download test completed")
    
    // Test print
    await printReceipt(mockReceipt)
    console.log("✅ PDF print test completed")
    
  } catch (error) {
    console.error("❌ PDF generation test failed:", error)
    throw error
  }
}

// Test real-time functionality
export const testRealTimeReceipts = (userId: string) => {
  console.log("🧪 Testing real-time receipts...")
  
  const { onUserReceiptsChange } = require("@/lib/firebase")
  
  const unsubscribe = onUserReceiptsChange(userId, (receipts) => {
    console.log("📡 Real-time receipts update:", receipts)
  })
  
  // Return unsubscribe function for cleanup
  return unsubscribe
}

// Run all tests
export const runReceiptSystemTests = async () => {
  console.log("🚀 Starting Receipt System Tests...")
  
  try {
    // Test 1: Receipt Creation
    await testReceiptCreation()
    
    // Test 2: PDF Generation
    await testPDFGeneration()
    
    // Test 3: Real-time functionality (requires valid userId)
    // const unsubscribe = testRealTimeReceipts("valid-user-id")
    // setTimeout(() => unsubscribe(), 10000) // Cleanup after 10 seconds
    
    console.log("🎉 All tests completed successfully!")
  } catch (error) {
    console.error("💥 Test suite failed:", error)
  }
}

// Export for use in development
if (typeof window !== 'undefined') {
  (window as any).receiptSystemTests = {
    testReceiptCreation,
    testPDFGeneration,
    testRealTimeReceipts,
    runReceiptSystemTests
  }
}
