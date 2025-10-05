import { 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  Timestamp,
  orderBy,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

export interface AttendanceRecord {
  attendance_id: string
  check_in: Timestamp
  date: Timestamp
  present: boolean
  user_id: string
}

/**
 * Get all attendance records (one-time fetch)
 */
export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const attendanceRef = collection(db, 'attendance')
    const snapshot = await getDocs(attendanceRef)
    
    const records = snapshot.docs.map(doc => ({
      attendance_id: doc.id,
      ...doc.data()
    } as AttendanceRecord))
    
    return records
  } catch (error) {
    console.error('Error getting attendance records:', error)
    return []
  }
}

/**
 * Get attendance records for a specific date range
 */
export async function getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<AttendanceRecord[]> {
  try {
    const attendanceRef = collection(db, 'attendance')
    const startTimestamp = Timestamp.fromDate(startDate)
    const endTimestamp = Timestamp.fromDate(endDate)
    
    const q = query(
      attendanceRef,
      where('date', '>=', startTimestamp),
      where('date', '<=', endTimestamp)
    )
    
    const snapshot = await getDocs(q)
    const records = snapshot.docs.map(doc => ({
      attendance_id: doc.id,
      ...doc.data()
    } as AttendanceRecord))
    
    return records
  } catch (error) {
    console.error('Error getting attendance by date range:', error)
    return []
  }
}

/**
 * Real-time listener for all attendance records
 */
export function onAttendanceRecordsChange(
  callback: (records: AttendanceRecord[]) => void
): () => void {
  try {
    const attendanceRef = collection(db, 'attendance')
    
    const unsubscribe = onSnapshot(
      attendanceRef,
      (snapshot) => {
        const records = snapshot.docs.map(doc => ({
          attendance_id: doc.id,
          ...doc.data()
        } as AttendanceRecord))
        
        callback(records)
      },
      (error) => {
        console.error('Error in attendance listener:', error)
        callback([])
      }
    )
    
    return unsubscribe
  } catch (error) {
    console.error('Error setting up attendance listener:', error)
    return () => {}
  }
}

/**
 * Get total count of registered users
 */
export async function getTotalUsersCount(): Promise<number> {
  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    return snapshot.docs.length
  } catch (error) {
    console.error('Error getting total users count:', error)
    return 0
  }
}

/**
 * Add a manual attendance record
 */
export async function addManualAttendanceRecord(userId: string, memberId: string): Promise<string> {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Check if attendance already exists for today
    const attendanceRef = collection(db, 'attendance')
    const todayStart = Timestamp.fromDate(today)
    const todayEnd = Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000))
    
    const existingQuery = query(
      attendanceRef,
      where('user_id', '==', memberId),
      where('date', '>=', todayStart),
      where('date', '<', todayEnd)
    )
    
    const existingSnapshot = await getDocs(existingQuery)
    
    if (!existingSnapshot.empty) {
      throw new Error('Attendance already marked for today')
    }
    
    // Create new attendance record
    const attendanceData = {
      user_id: memberId,
      date: Timestamp.fromDate(today),
      check_in: Timestamp.now(),
      present: true,
      createdAt: serverTimestamp()
    }
    
    const docRef = await addDoc(attendanceRef, attendanceData)
    return docRef.id
  } catch (error) {
    console.error('Error adding manual attendance record:', error)
    throw error
  }
}

