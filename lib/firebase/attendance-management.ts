import { 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  Timestamp,
  orderBy
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

