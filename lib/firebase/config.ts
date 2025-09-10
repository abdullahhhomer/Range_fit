// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7E9eW76lEokK0QD06bjP92fad9QjW2MI",
  authDomain: "rangefitgym-8bae0.firebaseapp.com",
  projectId: "rangefitgym-8bae0",
  storageBucket: "rangefitgym-8bae0.firebasestorage.app",
  messagingSenderId: "416962107238",
  appId: "1:416962107238:web:7332b17126848e05059aa7",
  measurementId: "G-2KC9MHN9DH",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)

export default app
