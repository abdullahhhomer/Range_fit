"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import ReceptionDashboardLayout from '@/components/reception-dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Shield,
  User,
  Calendar,
  Mail,
  Phone,
  ChevronDown
} from 'lucide-react'
import UserViewPopup from '@/components/admin/user-view-popup'
import UserEditPopup from '@/components/admin/user-edit-popup'
import UserDeletePopup from '@/components/admin/user-delete-popup'
import ReceptionUserAddPopup from '@/components/admin/reception-user-add-popup'
import { toast } from 'sonner'
import { collection, getDocs, doc, deleteDoc, onSnapshot, query, orderBy, updateDoc, writeBatch, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getProfileImageUrl, deleteImageFromCloudinary, extractPublicIdFromUrl } from '@/lib/cloudinary-client'
import { updatePassword, deleteUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface UserData {
  uid: string
  memberId?: string
  email: string
  name: string
  phone?: string
  gender?: string
  cnic?: string
  address?: string
  role: "receptionist" | "customer"
  status: "active" | "inactive"
  createdAt: Date
  lastLoginAt?: Date
  profileComplete: boolean
  profileImageUrl?: string
  deletedAt?: Date
  deletedBy?: string
  isDeleted?: boolean
}

export default function ReceptionUserManagement() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showAddUser, setShowAddUser] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [showGenderFilter, setShowGenderFilter] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [showViewPopup, setShowViewPopup] = useState(false)
  const [showEditPopup, setShowEditPopup] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)


  // Handle filter changes
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    // Close dropdown after a small delay to ensure smooth animation
    setTimeout(() => setStatusDropdownOpen(false), 100)
  }

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value)
    // Close dropdown after a small delay to ensure smooth animation
    setTimeout(() => setStatusDropdownOpen(false), 100)
  }

  // Handle dropdown open/close
  const handleStatusDropdownToggle = () => {
    setStatusDropdownOpen(!statusDropdownOpen)
  }

  const handleRoleDropdownToggle = () => {
    setRoleDropdownOpen(!roleDropdownOpen)
  }

  // Handle dropdown close when clicking outside
  const handleStatusDropdownClose = () => {
    setStatusDropdownOpen(false)
  }

  const handleRoleDropdownClose = () => {
    setRoleDropdownOpen(false)
  }

  useEffect(() => {
    // Set up real-time listener for users with proper error handling
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData: UserData[] = []
      snapshot.forEach((doc) => {
        const userData = doc.data()
        // Only include customer and receptionist roles
        if (userData.role === 'customer' || userData.role === 'receptionist') {
          const user = {
            uid: doc.id,
            memberId: userData.memberId || `RF-${doc.id.slice(-6)}`,
            email: userData.email || '',
            name: userData.name || userData.displayName || 'Unknown User',
            phone: userData.phone || '',
            gender: userData.gender || userData.sex || userData.genderType || '',
            cnic: userData.cnic || userData.cnicNumber || userData.cnic_number || '',
            address: userData.address || userData.userAddress || userData.user_address || '',
            profileImageUrl: userData.profileImageUrl || userData.photoURL || '',
            role: userData.role,
            status: userData.status || 'active',
            createdAt: userData.createdAt?.toDate() || new Date(),
            lastLoginAt: userData.lastLoginAt?.toDate(),
            profileComplete: userData.profileComplete || false,
            deletedAt: userData.deletedAt?.toDate(),
            deletedBy: userData.deletedBy,
            isDeleted: userData.isDeleted || false
          }
          
          usersData.push(user)
        }
      })
      setUsers(usersData)
      setLoading(false)
    }, (error) => {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
      setLoading(false)
    })

    // Cleanup subscription
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, statusFilter, roleFilter, genderFilter])

  const filterUsers = () => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.memberId && user.memberId.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter)
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(user => {
        const userGender = user.gender ? user.gender.toLowerCase().trim() : ''
        const filterGender = genderFilter.toLowerCase().trim()
        return userGender === filterGender
      })
    }

    setFilteredUsers(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600">Active</Badge>
      case 'inactive':
        return <Badge className="bg-gray-600">Inactive</Badge>
      default:
        return <Badge className="bg-gray-600">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'receptionist':
        return <Badge className="bg-blue-600">Receptionist</Badge>
      case 'customer':
        return <Badge className="bg-green-600">Customer</Badge>
      default:
        return <Badge className="bg-gray-600">{role}</Badge>
    }
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\s/g, '')
    if (cleaned.length >= 4) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
    }
    return cleaned
  }

  const handleDeleteUser = async (userId: string) => {
    setIsDeleting(true)
    try {
      // First, get the user's email before deleting the document
      const userToDelete = users.find(user => user.uid === userId)
      if (!userToDelete) {
        throw new Error('User not found')
      }

      console.log('🔧 Starting complete user deletion process for:', userToDelete.email)

      // Delete Cloudinary profile image if exists
      if (userToDelete.profileImageUrl) {
        const publicId = extractPublicIdFromUrl(userToDelete.profileImageUrl)
        if (publicId) {
          console.log('🗑️ Deleting Cloudinary image:', publicId)
          await deleteImageFromCloudinary(publicId)
          console.log('✅ Cloudinary image deleted')
        }
      }

      // Delete all membership records for this user
      console.log('🗑️ Deleting user membership records...')
      const membershipsQuery = query(collection(db, 'memberships'), where('uid', '==', userId))
      const membershipsSnapshot = await getDocs(membershipsQuery)
      
      if (!membershipsSnapshot.empty) {
        const batch = writeBatch(db)
        membershipsSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        console.log(`✅ Deleted ${membershipsSnapshot.size} membership records`)
      } else {
        console.log('ℹ️ No membership records found for user')
      }

      // Delete all payment records for this user (changed from anonymization)
      console.log('🗑️ Deleting user payment records...')
      const paymentsQuery = query(collection(db, 'payments'), where('uid', '==', userId))
      const paymentsSnapshot = await getDocs(paymentsQuery)
      if (!paymentsSnapshot.empty) {
        const batch = writeBatch(db)
        paymentsSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        console.log(`✅ Deleted ${paymentsSnapshot.size} payment records`)
      } else {
        console.log('ℹ️ No payment records found for user')
      }

      // Delete all receipt records for this user (NEW)
      console.log('🗑️ Deleting user receipt records...')
      const receiptsQuery = query(collection(db, 'receipts'), where('userId', '==', userId))
      const receiptsSnapshot = await getDocs(receiptsQuery)
      if (!receiptsSnapshot.empty) {
        const batch = writeBatch(db)
        receiptsSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        console.log(`✅ Deleted ${receiptsSnapshot.size} receipt records`)
      } else {
        console.log('ℹ️ No receipt records found for user')
      }

      // Delete from Firestore
      const userRef = doc(db, 'users', userId)
      await deleteDoc(userRef)
      console.log('✅ User document deleted from Firestore')
      
      // Remove from local state immediately
      setUsers(prevUsers => prevUsers.filter(user => user.uid !== userId))
      
      toast.success('User completely deleted! All data removed from database.', {
        description: 'User profile, memberships, payments, receipts, and images have been permanently deleted.',
        duration: 5000,
      })
      
    } catch (error: any) {
      console.error('Error deleting user:', error)
      
      let errorMessage = 'Failed to delete user. Please try again.'
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Check your reception privileges.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error('Delete failed! ❌', {
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      // In a real app, you would update the user status in Firebase
      toast.success(`User status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const handleViewUser = (user: UserData) => {
    setSelectedUser(user)
    setShowViewPopup(true)
  }

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user)
    setShowEditPopup(true)
  }

  const handleUpdateUser = async (updateData: any) => {
    if (!selectedUser) return

    try {
      const userRef = doc(db, 'users', selectedUser.uid)
      
      // Separate password from other data
      const { newPassword, ...userData } = updateData
      
      // Update user document data
      if (Object.keys(userData).length > 0) {
        await updateDoc(userRef, userData)
      }
      
      // Handle password change if provided
      if (newPassword && newPassword.trim() !== '') {
        // Store the new password in Firestore
        await updateDoc(userRef, {
          newPassword: newPassword, // Store the new password
          passwordUpdatedAt: new Date(),
          passwordUpdatedBy: 'receptionist'
        })
        
        toast.success('Password has been changed! User can now login with the new password.')
      }
      
      toast.success('User updated successfully')
      setShowEditPopup(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
      throw error // Re-throw so the component can handle it
    }
  }

  const closePopups = () => {
    setShowViewPopup(false)
    setShowEditPopup(false)
    setShowDeletePopup(false)
    setShowAddUser(false)
    setSelectedUser(null)
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["receptionist"]}>
        <ReceptionDashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </ReceptionDashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["receptionist"]}>
      <ReceptionDashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  User Management
                </h1>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Manage customers and receptionists
              </p>
              <div className="flex justify-center">
                <Button 
                  onClick={() => setShowAddUser(true)}
                  className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2 py-3 px-6 text-base"
                >
                  <UserPlus className="h-5 w-5" />
                  Add User
                </Button>
              </div>
            </div>

          {/* Filters and Search */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                                 <div className="relative">
                   <select
                     value={statusFilter}
                     onChange={(e) => handleStatusFilterChange(e.target.value)}
                     onClick={handleStatusDropdownToggle}
                     onBlur={handleStatusDropdownClose}
                     className="bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 appearance-none cursor-pointer w-full"
                   >
                     <option value="all">All Status</option>
                     <option value="active">Active</option>
                     <option value="inactive">Inactive</option>
                   </select>
                   <ChevronDown 
                     className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${
                       statusDropdownOpen ? 'rotate-180' : ''
                     }`}
                   />
                 </div>

                                 <div className="relative">
                   <select
                     value={roleFilter}
                     onChange={(e) => handleRoleFilterChange(e.target.value)}
                     onClick={handleRoleDropdownToggle}
                     onBlur={handleRoleDropdownClose}
                     className="bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 appearance-none cursor-pointer w-full"
                   >
                     <option value="all">All Roles</option>
                     <option value="receptionist">Receptionist</option>
                     <option value="customer">Customer</option>
                   </select>
                   <ChevronDown 
                     className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${
                       roleDropdownOpen ? 'rotate-180' : ''
                     }`}
                   />
                 </div>

                                 <Button 
                   variant="outline" 
                   onClick={() => {
                     if (showGenderFilter) {
                       // If closing, reset gender filter
                       setGenderFilter('all')
                     }
                     setShowGenderFilter(!showGenderFilter)
                   }}
                   className={`border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 hover:text-orange-600 hover:scale-105 h-[42px] transition-all duration-200 ${
                     showGenderFilter 
                       ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700' 
                       : 'bg-white hover:bg-orange-100'
                   }`}
                 >
                   <Filter className="h-4 w-4" />
                   More Filters
                 </Button>
                             </div>
               
                               {/* Gender Filter Dropdown */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showGenderFilter ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="mt-4 pt-4 border-t border-gray-700">
                                        <div className="flex items-center space-x-4">
                       <label className="text-gray-300 text-sm font-medium">Gender Filter:</label>
                                               <div className="flex items-center space-x-2">
                          <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setGenderFilter('male')}
                           className={`border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 ${
                             genderFilter === 'male' 
                               ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700' 
                               : 'bg-white hover:bg-orange-100'
                           }`}
                         >
                           Male
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setGenderFilter('female')}
                           className={`border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 ${
                             genderFilter === 'female' 
                               ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700' 
                               : 'bg-white hover:bg-orange-100'
                           }`}
                         >
                           Female
                         </Button>

                       </div>
                     </div>
                  </div>
                </div>
              </CardContent>
           </Card>

          {/* Users Table */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                Users ({filteredUsers.length} of {users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-300 font-medium">User</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Member ID</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Role</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Status</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Last Login</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.uid} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="p-3">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage 
                                src={user.profileImageUrl ? getProfileImageUrl(user.profileImageUrl, 80) : undefined} 
                                alt={`${user.name}'s profile picture`}
                              />
                              <AvatarFallback className="bg-orange-600 text-white">
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                                                         <div>
                               <p className="text-white font-medium">{user.name}</p>
                               {user.phone && (
                                 <p className="text-gray-400 text-xs flex items-center">
                                   <Phone className="h-3 w-3 mr-1" />
                                   {formatPhoneNumber(user.phone)}
                                 </p>
                               )}
                             </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-300 font-mono">{user.memberId}</span>
                        </td>
                        <td className="p-3">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="p-3">
                          {getStatusBadge(user.status)}
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300">
                            {user.lastLoginAt ? (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span className="text-sm">
                                  {user.lastLoginAt.toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">Never</span>
                            )}
                          </div>
                        </td>
                                                 <td className="p-3">
                           <div className="flex items-center space-x-2">
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => handleViewUser(user)}
                               className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                                                                                         {/* Only allow editing if user is customer */}
                              {user.role === 'customer' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {/* Only allow deleting if user is customer and not the current user */}
                              {user.role === 'customer' && user.uid !== currentUser?.uid && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setShowDeletePopup(true)
                                  }}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                           </div>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
                     </Card>
         </div>

                   {/* View User Popup */}
          {showViewPopup && selectedUser && (
            <UserViewPopup
              user={selectedUser}
              onClose={closePopups}
              getStatusBadge={getStatusBadge}
              getRoleBadge={getRoleBadge}
              formatPhoneNumber={formatPhoneNumber}
            />
          )}

                   {/* Edit User Popup */}
          {showEditPopup && selectedUser && (
            <UserEditPopup
              user={selectedUser}
              onClose={closePopups}
              onUpdate={handleUpdateUser}
              formatPhoneNumber={formatPhoneNumber}
            />
          )}

                              {/* Delete User Popup */}
           {showDeletePopup && selectedUser && (
             <UserDeletePopup
               user={selectedUser}
               onClose={closePopups}
               onDelete={handleDeleteUser}
               isDeleting={isDeleting}
             />
           )}

                       {/* Add User Popup */}
            {showAddUser && (
              <ReceptionUserAddPopup
                onClose={closePopups}
                onUserAdded={() => {
                  // The real-time listener will automatically update the users list
                }}
              />
            )}
        </div>
      </ReceptionDashboardLayout>
    </ProtectedRoute>
  )





  if (loading) {

    return (

      <ProtectedRoute allowedRoles={["receptionist"]}>

        <ReceptionDashboardLayout>

          <div className="flex items-center justify-center h-64">

            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>

          </div>

        </ReceptionDashboardLayout>

      </ProtectedRoute>

    )

  }



  return (

    <ProtectedRoute allowedRoles={["receptionist"]}>

      <ReceptionDashboardLayout>

        <div className="space-y-6">

          {/* Header */}

          <div className="flex justify-between items-center">

            <div>

              <h1 className="text-3xl font-bold text-white">User Management</h1>

              <p className="text-gray-400 mt-2">Manage customers and receptionists</p>

            </div>

            <Button 

              onClick={() => setShowAddUser(true)}

              className="bg-orange-600 hover:bg-orange-700 flex items-center gap-1"

            >

              <UserPlus className="h-4 w-4" />

              Add User

            </Button>

          </div>



          {/* Filters and Search */}

          <Card className="bg-gray-800/50 border-gray-700">

            <CardContent className="p-6">

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <div className="relative">

                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

                  <Input

                    placeholder="Search users..."

                    value={searchTerm}

                    onChange={(e) => setSearchTerm(e.target.value)}

                    className="pl-10 bg-gray-700 border-gray-600 text-white"

                  />

                </div>

                

                                 <div className="relative">

                   <select

                     value={statusFilter}

                     onChange={(e) => handleStatusFilterChange(e.target.value)}

                     onClick={handleStatusDropdownToggle}

                     onBlur={handleStatusDropdownClose}

                     className="bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 appearance-none cursor-pointer w-full"

                   >

                     <option value="all">All Status</option>

                     <option value="active">Active</option>

                     <option value="inactive">Inactive</option>

                   </select>

                   <ChevronDown 

                     className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${

                       statusDropdownOpen ? 'rotate-180' : ''

                     }`}

                   />

                 </div>



                                 <div className="relative">

                   <select

                     value={roleFilter}

                     onChange={(e) => handleRoleFilterChange(e.target.value)}

                     onClick={handleRoleDropdownToggle}

                     onBlur={handleRoleDropdownClose}

                     className="bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 appearance-none cursor-pointer w-full"

                   >

                     <option value="all">All Roles</option>

                     <option value="receptionist">Receptionist</option>

                     <option value="customer">Customer</option>

                   </select>

                   <ChevronDown 

                     className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${

                       roleDropdownOpen ? 'rotate-180' : ''

                     }`}

                   />

                 </div>



                                 <Button 

                   variant="outline" 

                   onClick={() => {

                     if (showGenderFilter) {

                       // If closing, reset gender filter

                       setGenderFilter('all')

                     }

                     setShowGenderFilter(!showGenderFilter)

                   }}

                   className={`border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 hover:text-orange-600 hover:scale-105 h-[42px] transition-all duration-200 ${

                     showGenderFilter 

                       ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700' 

                       : 'bg-white hover:bg-orange-100'

                   }`}

                 >

                   <Filter className="h-4 w-4" />

                   More Filters

                 </Button>

                             </div>

               

                               {/* Gender Filter Dropdown */}

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${

                  showGenderFilter ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'

                }`}>

                  <div className="mt-4 pt-4 border-t border-gray-700">

                                        <div className="flex items-center space-x-4">

                       <label className="text-gray-300 text-sm font-medium">Gender Filter:</label>

                                               <div className="flex items-center space-x-2">

                          <Button

                           variant="outline"

                           size="sm"

                           onClick={() => setGenderFilter('male')}

                           className={`border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 ${

                             genderFilter === 'male' 

                               ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700' 

                               : 'bg-white hover:bg-orange-100'

                           }`}

                         >

                           Male

                         </Button>

                         <Button

                           variant="outline"

                           size="sm"

                           onClick={() => setGenderFilter('female')}

                           className={`border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 ${

                             genderFilter === 'female' 

                               ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700' 

                               : 'bg-white hover:bg-orange-100'

                           }`}

                         >

                           Female

                         </Button>



                       </div>

                     </div>

                  </div>

                </div>

              </CardContent>

           </Card>



          {/* Users Table */}

          <Card className="bg-gray-800/50 border-gray-700">

            <CardHeader>

              <CardTitle className="text-white">

                Users ({filteredUsers.length} of {users.length})

              </CardTitle>

            </CardHeader>

            <CardContent>

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead>

                    <tr className="border-b border-gray-700">

                      <th className="text-left p-3 text-gray-300 font-medium">User</th>

                      <th className="text-left p-3 text-gray-300 font-medium">Member ID</th>

                      <th className="text-left p-3 text-gray-300 font-medium">Role</th>

                      <th className="text-left p-3 text-gray-300 font-medium">Status</th>

                      <th className="text-left p-3 text-gray-300 font-medium">Last Login</th>

                      <th className="text-left p-3 text-gray-300 font-medium">Actions</th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredUsers.map((user) => (

                      <tr key={user.uid} className="border-b border-gray-700/50 hover:bg-gray-700/30">

                        <td className="p-3">

                          <div className="flex items-center space-x-3">

                            <Avatar className="h-10 w-10">

                              <AvatarImage 

                                src={user.profileImageUrl ? getProfileImageUrl(user.profileImageUrl, 80) : undefined} 

                                alt={`${user.name}'s profile picture`}

                              />

                              <AvatarFallback className="bg-orange-600 text-white">

                                {user.name.charAt(0).toUpperCase()}

                              </AvatarFallback>

                            </Avatar>

                                                         <div>

                               <p className="text-white font-medium">{user.name}</p>

                               {user.phone && (

                                 <p className="text-gray-400 text-xs flex items-center">

                                   <Phone className="h-3 w-3 mr-1" />

                                   {formatPhoneNumber(user.phone)}

                                 </p>

                               )}

                             </div>

                          </div>

                        </td>

                        <td className="p-3">

                          <span className="text-gray-300 font-mono">{user.memberId}</span>

                        </td>

                        <td className="p-3">

                          {getRoleBadge(user.role)}

                        </td>

                        <td className="p-3">

                          {getStatusBadge(user.status)}

                        </td>

                        <td className="p-3">

                          <div className="text-gray-300">

                            {user.lastLoginAt ? (

                              <div className="flex items-center space-x-1">

                                <Calendar className="h-3 w-3" />

                                <span className="text-sm">

                                  {user.lastLoginAt.toLocaleDateString()}

                                </span>

                              </div>

                            ) : (

                              <span className="text-gray-500 text-sm">Never</span>

                            )}

                          </div>

                        </td>

                                                 <td className="p-3">

                           <div className="flex items-center space-x-2">

                             <Button

                               variant="ghost"

                               size="sm"

                               onClick={() => handleViewUser(user)}

                               className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"

                             >

                               <Eye className="h-4 w-4" />

                             </Button>

                                                                                         {/* Only allow editing if user is customer */}

                              {user.role === 'customer' && (

                                <Button

                                  variant="ghost"

                                  size="sm"

                                  onClick={() => handleEditUser(user)}

                                  className="text-green-400 hover:text-green-300 hover:bg-green-500/10"

                                >

                                  <Edit className="h-4 w-4" />

                                </Button>

                              )}

                              {/* Only allow deleting if user is customer and not the current user */}

                              {user.role === 'customer' && user.uid !== currentUser?.uid && (

                                <Button

                                  variant="ghost"

                                  size="sm"

                                  onClick={() => {

                                    setSelectedUser(user)

                                    setShowDeletePopup(true)

                                  }}

                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"

                                >

                                  <Trash2 className="h-4 w-4" />

                                </Button>

                              )}

                           </div>

                         </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </CardContent>

                     </Card>

         </div>



                   {/* View User Popup */}

          {showViewPopup && selectedUser && (

            <UserViewPopup

              user={selectedUser}

              onClose={closePopups}

              getStatusBadge={getStatusBadge}

              getRoleBadge={getRoleBadge}

              formatPhoneNumber={formatPhoneNumber}

            />

          )}



                   {/* Edit User Popup */}

          {showEditPopup && selectedUser && (

            <UserEditPopup

              user={selectedUser}

              onClose={closePopups}

              onUpdate={handleUpdateUser}

              formatPhoneNumber={formatPhoneNumber}

            />

          )}



                              {/* Delete User Popup */}

           {showDeletePopup && selectedUser && (

             <UserDeletePopup

               user={selectedUser}

               onClose={closePopups}

               onDelete={handleDeleteUser}

               isDeleting={isDeleting}

             />

           )}



                       {/* Add User Popup */}

            {showAddUser && (

              <ReceptionUserAddPopup

                onClose={closePopups}

                onUserAdded={() => {

                  // The real-time listener will automatically update the users list

                }}

              />

            )}

       </ReceptionDashboardLayout>

     </ProtectedRoute>

   )

 }


