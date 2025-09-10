import { doc, updateDoc, collection, addDoc, serverTimestamp, getDoc, deleteDoc } from "firebase/firestore"
import { db } from "./config"
import { updateUserDocument } from "./user-management"
import { createReceipt } from "./receipt-management"
import { addPaymentRecordWithRetention } from "./payment-management"

// Create membership request for approval
export const createMembershipRequest = async (requestData: any) => {
  try {
    const requestsRef = collection(db, "membershipRequests")
    
    const membershipRequestData = {
      uid: requestData.uid,
      planType: requestData.planType,
      amount: requestData.amount,
      paymentMethod: requestData.paymentMethod || "Cash",
      transactionId: requestData.transactionId,
      startDate: requestData.startDate || new Date(),
      endDate: requestData.endDate,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userData: requestData.userData, // Include user data for admin reference
      ...requestData.additionalData
    }

    const docRef = await addDoc(requestsRef, membershipRequestData)
    console.log(`✅ Membership request created for user ${requestData.uid} with ID: ${docRef.id}`)
    return docRef.id
  } catch (error) {
    console.error("Error creating membership request:", error)
    throw error
  }
}

// Update membership status with improved flow
export const updateMembershipStatus = async (
  requestId: string, 
  status: string, 
  adminUid: string, 
  rejectionReason?: string,
  additionalData?: any
) => {
  try {
    const requestRef = doc(db, "membershipRequests", requestId)
    
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    }

    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason
    }

    if (additionalData) {
      Object.assign(updateData, additionalData)
    }

    await updateDoc(requestRef, updateData)

    // If approved, create membership record and payment
    if (status === "active") {
      const requestDoc = await getDoc(requestRef)
      const requestData = requestDoc.data()
      
      if (requestData) {
        // Create membership record
        await createMembership(requestData, additionalData)
        
        // Create payment record
        await createPaymentRecord(requestData, additionalData)
        
        // Optionally delete the request (recommended for clean UI)
        // Uncomment the next line if you want to delete requests after approval
        // await deleteDoc(requestRef)
        
        console.log(`✅ Membership approved and all records created for user ${requestData.uid}`)
      }
    }

    console.log(`✅ Membership request ${requestId} ${status} by admin ${adminUid}`)
  } catch (error) {
    console.error("Error updating membership status:", error)
    throw error
  }
}

// Create membership from approved request
export const createMembership = async (requestData: any, additionalData?: any) => {
  try {
    const membershipRef = collection(db, "memberships")
    
    // Use startDate and endDate from additionalData if available, otherwise use requestData
    const startDate = additionalData?.startDate || requestData.startDate || new Date()
    const endDate = additionalData?.endDate || requestData.endDate || new Date()
    const totalAmount = additionalData?.totalAmount || requestData.amount
    
    const membershipData = {
      uid: requestData.uid,
      planType: requestData.planType,
      amount: totalAmount, // Use total amount including registration fee
      paymentMethod: requestData.paymentMethod || "Cash",
      transactionId: requestData.transactionId,
      startDate: startDate,
      endDate: endDate,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      registrationFee: additionalData?.registrationFee || false,
      renewalCount: 0,
      lastRenewalDate: new Date(),
      nextRenewalReminder: new Date(startDate.getTime() + 25 * 24 * 60 * 60 * 1000), // 5 days before expiry
      ...additionalData
    }

    await addDoc(membershipRef, membershipData)

    // Update user document with membership info
    await updateUserDocument(requestData.uid, {
      membershipStatus: "active",
      membershipPlan: requestData.planType,
      membershipAmount: totalAmount,
      membershipStartDate: startDate,
      membershipExpiryDate: endDate,
      lastRenewalReminder: new Date()
    })

    // Generate receipt for the membership
    await generateMembershipReceipt({
      ...requestData,
      amount: totalAmount,
      startDate: startDate,
      endDate: endDate
    })

    console.log(`✅ Membership created for user ${requestData.uid}`)
  } catch (error) {
    console.error("Error creating membership:", error)
    throw error
  }
}

// Create payment record for approved membership
const createPaymentRecord = async (requestData: any, additionalData?: any) => {
  try {
    const totalAmount = additionalData?.totalAmount || requestData.amount
    
    const paymentData = {
      uid: requestData.uid,
      amount: totalAmount,
      planType: requestData.planType,
      transactionId: requestData.transactionId,
      paymentMethod: requestData.paymentMethod || "Cash",
      status: "completed", // Admin approvals are automatically completed
      userEmail: requestData.userData?.email || "",
      userName: requestData.userData?.name || "Unknown User",
      approvedBy: additionalData?.approvedBy || "admin",
      approvalDate: new Date(),
      registrationFee: additionalData?.registrationFee || false,
      membershipStartDate: additionalData?.startDate || requestData.startDate,
      membershipEndDate: additionalData?.endDate || requestData.endDate
    }

    await addPaymentRecordWithRetention(paymentData)
    console.log(`✅ Payment record created for membership: ${requestData.transactionId}`)
  } catch (error) {
    console.error("Error creating payment record:", error)
    // Don't throw error to avoid breaking membership creation
  }
}

// Generate receipt for membership
const generateMembershipReceipt = async (membershipData: any) => {
  try {
    // Get user data for receipt
    const userDoc = await getDoc(doc(db, "users", membershipData.uid))
    const userData = userDoc.data()
    
    if (!userData) {
      console.error("User data not found for receipt generation")
      return
    }

    const receiptData = {
      userId: membershipData.uid,
      memberId: userData.memberId || "N/A",
      customerName: userData.name,
      membershipType: membershipData.planType,
      amount: membershipData.amount,
      paymentMethod: membershipData.paymentMethod || "Cash",
      transactionId: membershipData.transactionId,
      startDate: membershipData.startDate || new Date(),
      endDate: membershipData.endDate,
      status: "active" as const,
      gymName: "RangeFit Gym",
      gymAddress: "123 Fitness Street, Karachi, Pakistan",
      gymPhone: "+92-300-1234567",
      gymEmail: "info@rangefitgym.com"
    }

    await createReceipt(receiptData)
    console.log(`✅ Receipt generated for membership: ${membershipData.transactionId}`)
  } catch (error) {
    console.error("Error generating membership receipt:", error)
    // Don't throw error to avoid breaking membership creation
  }
}
