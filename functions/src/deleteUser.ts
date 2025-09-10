import {onCall, HttpsError} from "firebase-functions/v1/https";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";

// Initialize Firebase Admin
if (!initializeApp.length) {
  initializeApp();
}

export const deleteUserAccount = onCall(async (data, context) => {
  // Verify the caller is an admin
  const {uid, email} = data;
  const callerUid = context.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if caller is admin
  const db = getFirestore();
  const callerDoc = await db.collection("users").doc(callerUid).get();

  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete users");
  }

  try {
    const auth = getAuth();

    console.log(
      `🔧 Starting complete user deletion process for: ${email} (UID: ${uid})`
    );

    // Delete all membership records for this user
    console.log("🗑️ Deleting user membership records...");
    const membershipsQuery = db.collection("memberships")
      .where("uid", "==", uid);
    const membershipsSnapshot = await membershipsQuery.get();

    if (!membershipsSnapshot.empty) {
      const batch = db.batch();
      membershipsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`✅ Deleted ${membershipsSnapshot.size} membership records`);
    } else {
      console.log("ℹ️ No membership records found for user");
    }

    // Preserve payment records but anonymize them for privacy
    console.log("🔒 Anonymizing user payment records...");
    const paymentsQuery = db.collection("payments")
      .where("uid", "==", uid);
    const paymentsSnapshot = await paymentsQuery.get();

    if (!paymentsSnapshot.empty) {
      const batch = db.batch();
      paymentsSnapshot.docs.forEach((doc) => {
        // Update payment record to anonymize user data while preserving financial data
        batch.update(doc.ref, {
          uid: null, // Remove user reference
          userEmail: null, // Remove email for privacy
          userName: null, // Remove name for privacy
          deletedAt: new Date(), // Mark as deleted
          deletedBy: callerUid, // Track who deleted
          originalUserId: uid, // Keep reference to original user for audit purposes
          isAnonymized: true // Flag to indicate this record has been anonymized
        });
      });
      await batch.commit();
      console.log(`✅ Anonymized ${paymentsSnapshot.size} payment records`);
    } else {
      console.log("ℹ️ No payment records found for user");
    }

    // Delete from Firebase Auth
    await auth.deleteUser(uid);
    console.log("✅ Deleted Firebase Auth account:", uid);

    // Delete from Firestore
    await db.collection("users").doc(uid).delete();
    console.log("✅ Deleted Firestore document:", uid);

    const message = `User ${email} completely deleted from Auth, Firestore, and membership data. Payment records preserved and anonymized for financial reporting.`;
    return {
      success: true,
      message,
    };
  } catch (error: unknown) {
    console.error("❌ Error deleting user:", error);
    const errorMessage = error instanceof Error ?
      error.message : "Unknown error";
    throw new HttpsError("internal", `Failed to delete user: ${errorMessage}`);
  }
});
