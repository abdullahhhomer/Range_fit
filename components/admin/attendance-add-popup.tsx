"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Search, CheckCircle, User, Calendar, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, addManualAttendanceRecord } from '@/lib/firebase'

interface AttendanceAddPopupProps {
  onClose: () => void
  onAttendanceAdded: () => void
}

interface Member {
  firebaseUid: string
  memberId: string
  name: string
  email: string
  membershipStatus?: string
}

export default function AttendanceAddPopup({ onClose, onAttendanceAdded }: AttendanceAddPopupProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  const popupRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus search input when popup opens
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Search members
  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    
    if (term.trim().length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    
    try {
      const usersRef = collection(db, 'users')
      const usersQuery = query(
        usersRef,
        where('role', '==', 'customer')
      )
      
      const snapshot = await getDocs(usersQuery)
      const members: Member[] = []
      
      snapshot.forEach((doc) => {
        const userData = doc.data()
        const memberId = userData.memberId || ''
        const name = userData.name || userData.displayName || ''
        
        // Search by member ID or name (case-insensitive)
        if (
          memberId.toLowerCase().includes(term.toLowerCase()) ||
          name.toLowerCase().includes(term.toLowerCase())
        ) {
          members.push({
            firebaseUid: doc.id,
            memberId: memberId,
            name: name,
            email: userData.email || '',
            membershipStatus: userData.membershipStatus || 'no_plan'
          })
        }
      })
      
      setSearchResults(members.slice(0, 10)) // Limit to 10 results
    } catch (error) {
      console.error('Error searching members:', error)
      toast.error('Failed to search members')
    } finally {
      setIsSearching(false)
    }
  }

  // Handle member selection
  const handleSelectMember = (member: Member) => {
    setSelectedMember(member)
    setSearchTerm(member.name)
    setSearchResults([])
    setShowConfirmation(true)
  }

  // Handle attendance submission
  const handleSubmit = async () => {
    if (!selectedMember) return

    setIsSubmitting(true)

    try {
      await addManualAttendanceRecord(selectedMember.firebaseUid, selectedMember.memberId)
      
      toast.success('Attendance marked successfully', {
        description: `Attendance marked for ${selectedMember.name}`
      })
      
      onAttendanceAdded()
      onClose()
    } catch (error: any) {
      console.error('Error marking attendance:', error)
      
      if (error.message === 'Attendance already marked for today') {
        toast.error('Attendance already marked', {
          description: 'This member has already marked attendance today'
        })
      } else {
        toast.error('Failed to mark attendance', {
          description: 'Please try again later'
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset confirmation
  const handleBackToSearch = () => {
    setShowConfirmation(false)
    setSelectedMember(null)
    setSearchTerm('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        ref={popupRef}
        className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-orange-600/10 to-orange-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 rounded-lg">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {showConfirmation ? 'Confirm Attendance' : 'Add Attendance Record'}
              </h2>
              <p className="text-sm text-gray-400">
                {showConfirmation ? 'Verify member details' : 'Search and select a member'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showConfirmation ? (
            <>
              {/* Search Input */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search by name or member ID..."
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>

                {/* Search Results */}
                {isSearching && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {searchResults.map((member) => (
                      <button
                        key={member.firebaseUid}
                        onClick={() => handleSelectMember(member)}
                        className="w-full p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-white font-medium">{member.name}</span>
                            </div>
                            <p className="text-sm text-gray-400 ml-6">{member.memberId}</p>
                            {member.email && (
                              <p className="text-xs text-gray-500 ml-6 mt-1">{member.email}</p>
                            )}
                          </div>
                          {member.membershipStatus === 'active' && (
                            <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                              Active
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!isSearching && searchTerm.trim().length >= 2 && searchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No members found</p>
                    <p className="text-sm mt-2">Try searching with a different name or ID</p>
                  </div>
                )}

                {searchTerm.trim().length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Start typing to search for members</p>
                    <p className="text-sm mt-2">You can search by name or member ID</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Confirmation View */}
              {selectedMember && (
                <div className="space-y-6">
                  {/* Member Details Card */}
                  <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white mb-1">{selectedMember.name}</h3>
                      <p className="text-sm text-gray-400 font-mono">{selectedMember.memberId}</p>
                      {selectedMember.email && (
                        <p className="text-xs text-gray-500 mt-1">{selectedMember.email}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-600">
                      <div className="text-center">
                        <Calendar className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Date</p>
                        <p className="text-sm text-white font-medium">
                          {new Date().toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <Clock className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Time</p>
                        <p className="text-sm text-white font-medium">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Confirmation Message */}
                  <div className="bg-orange-600/10 border border-orange-600/30 rounded-lg p-4">
                    <p className="text-center text-orange-200 text-sm">
                      Are you sure you want to mark attendance for this member?
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleBackToSearch}
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                      disabled={isSubmitting}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Marking...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

