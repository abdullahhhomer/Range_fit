"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import CustomerDashboardLayout from "@/components/customer-dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Edit,
  Save,
  X,
  Camera,
  Upload,
  AlertTriangle,
  Users,
  Crop,
  Fingerprint,
  Calendar,
  Hash,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { onUserDataChange } from "@/lib/firebase"
import ProfileImageUpload from "@/components/profile-image-upload"
import { toast } from "sonner"
import { extractPublicIdFromUrl, getOriginalCloudinaryUrl } from "@/lib/cloudinary-client"



export default function ProfilePage() {
  const { user, updateUserCredentials, updateUserProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullUserData, setFullUserData] = useState<any>(null)

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    cnic: "",
    address: "",
    gender: "" as "Male" | "Female" | "Other" | "",
    fingerprintId: "",
    profileImageUrl: "" as string | null | undefined,
  })
  
  const [isGenderLocked, setIsGenderLocked] = useState(false)

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handlePasswordChange = async () => {
    setLoading(true)
    try {
      if (!user?.uid) throw new Error("User not authenticated")

      // Validate current password is provided
      if (!passwordData.currentPassword.trim()) {
        toast.error("Current password is required")
        return
      }

      // Validate new password
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error("New passwords do not match")
        return
      }

      if (passwordData.newPassword.length < 6) {
        toast.error("New password must be at least 6 characters long")
        return
      }

      // Validate current password before allowing change
      if (passwordData.currentPassword === passwordData.newPassword) {
        toast.error("New password must be different from current password")
        return
      }

      await updateUserCredentials(undefined, passwordData.newPassword, passwordData.currentPassword)

      toast.success("Password updated successfully!")
      setIsChangingPassword(false)
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error: any) {
      console.error("Error updating password:", error)
      
      // Handle specific error cases
      if (error.message?.includes("wrong-password") || error.message?.includes("invalid-credential")) {
        toast.error("Current password is incorrect")
      } else if (error.message?.includes("requires-recent-login")) {
        toast.error("For security reasons, please log out and log back in before changing your password")
      } else {
        toast.error(error.message || "Failed to update password. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.uid) {
      // Set up real-time listener for user data
      const unsubscribe = onUserDataChange(user.uid, (userData) => {
        if (userData) {
          setFullUserData(userData)
          setProfileData({
            name: userData.name || "",
            email: userData.email || "",
            phone: userData.phone || "",
            cnic: userData.cnic || "",
            address: userData.address || "",
            gender: userData.gender || "",
            fingerprintId: userData.fingerprintId || "",
            profileImageUrl: userData.profileImageUrl || null,
          })
          
          // Set initial gender locked state
          setIsGenderLocked(!!userData.gender)
        }
      })

      return () => unsubscribe()
    }
  }, [user?.uid])

  const handleProfileSave = async () => {
    setLoading(true)
    try {
      if (!user?.uid) throw new Error("User not authenticated")

      // Validate required fields
      if (!profileData.name.trim()) {
        toast.error("Full Name is required")
        return
      }
      if (!profileData.cnic.trim()) {
        toast.error("CNIC is required")
        return
      }
      if (!profileData.phone.trim()) {
        toast.error("Phone Number is required")
        return
      }
      
      const cleanedPhone = cleanPhoneNumber(profileData.phone.trim())
      if (cleanedPhone.length !== 11) {
        toast.error("Phone Number must be exactly 11 digits")
        return
      }
      
      if (!/^\d+$/.test(cleanedPhone)) {
        toast.error("Phone Number must contain only digits")
        return
      }
      if (!profileData.gender) {
        toast.error("Gender is required")
        return
      }
      if (!profileData.address.trim()) {
        toast.error("Address is required")
        return
      }

      await updateUserProfile({
        name: profileData.name.trim(),
        phone: cleanPhoneNumber(profileData.phone.trim()),
        cnic: profileData.cnic.trim(),
        address: profileData.address.trim(),
        gender: profileData.gender as "Male" | "Female" | "Other",
        profileImageUrl: profileData.profileImageUrl,
      })

      // Lock gender after successful save
      if (profileData.gender) {
        setIsGenderLocked(true)
      }

      toast.success("Profile updated successfully!")
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }





  const handleCancel = () => {
    if (fullUserData) {
      setProfileData({
        name: fullUserData.name || "",
        email: fullUserData.email || "",
        phone: fullUserData.phone || "",
        cnic: fullUserData.cnic || "",
        address: fullUserData.address || "",
        gender: fullUserData.gender || "",
        fingerprintId: fullUserData.fingerprintId || "",
        profileImageUrl: fullUserData.profileImageUrl || "",
      })
      // Reset gender locked state when canceling
      setIsGenderLocked(!!fullUserData.gender)
    }
    setIsEditing(false)
  }

  // Function to format phone number with space after first 4 digits only
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '') // Remove all spaces
    if (cleaned.length >= 4) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
    }
    return cleaned
  }

  // Function to clean phone number (remove spaces for validation)
  const cleanPhoneNumber = (phone: string) => {
    return phone.replace(/\s/g, '')
  }

  // Function to format CNIC
  const formatCNIC = (cnic: string) => {
    if (!cnic) return ''
    const cleaned = cnic.replace(/\D/g, '')
    
    if (cleaned.length <= 5) {
      return cleaned
    } else if (cleaned.length <= 12) {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
    } else {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12, 13)}`
    }
  }

  // Function to handle CNIC input changes
  const handleCNICChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '')
    
    // Limit to 13 digits
    if (digitsOnly.length <= 13) {
      setProfileData({ ...profileData, cnic: digitsOnly })
    }
  }

  const isProfileIncomplete = fullUserData && !fullUserData.profileComplete

  return (
    <CustomerDashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-400">Manage your personal information and account settings</p>
        </div>

        {/* Profile Image Upload */}
        <div className="mb-6">
          <ProfileImageUpload
            currentImageUrl={profileData.profileImageUrl}
            onImageUpdate={async (imageUrl) => {
              try {
                // Get the current image URL before updating
                const currentImageUrl = profileData.profileImageUrl
                
                // Update local state immediately
                setProfileData({ ...profileData, profileImageUrl: imageUrl })
                
                // Save to database
                await updateUserProfile({
                  profileImageUrl: imageUrl,
                })
                
                // Delete old image from Cloudinary if it exists
                if (currentImageUrl && currentImageUrl !== imageUrl) {
                  try {
                    // Get the original Cloudinary URL without transformations for deletion
                    const originalUrl = getOriginalCloudinaryUrl(currentImageUrl)
                    const publicId = extractPublicIdFromUrl(originalUrl)
                    
                    if (publicId) {
                      console.log('Deleting old image with public ID:', publicId)
                      console.log('Original URL:', originalUrl)
                      console.log('Current URL (with transformations):', currentImageUrl)
                      
                      const deleteResponse = await fetch('/api/cloudinary/delete', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ publicId }),
                      })
                      
                      if (!deleteResponse.ok) {
                        console.error('Failed to delete from Cloudinary:', deleteResponse.statusText)
                        const errorText = await deleteResponse.text()
                        console.error('Error response:', errorText)
                      } else {
                        console.log('Successfully deleted old image from Cloudinary')
                      }
                    } else {
                      console.error('Could not extract public ID from original URL:', originalUrl)
                    }
                  } catch (deleteError) {
                    console.error('Failed to delete old image from Cloudinary:', deleteError)
                    // Don't fail the whole operation if Cloudinary deletion fails
                  }
                }
                
                toast.success('Profile image updated successfully! 💪', {
                  description: 'Your new profile picture has been saved',
                  duration: 4000,
                })
              } catch (error) {
                console.error('Error saving profile image:', error)
                toast.error('Failed to save profile image', {
                  description: 'Please try again',
                  duration: 4000,
                })
              }
            }}
            onImageRemove={async () => {
              try {
                // Get the current image URL before removing
                const currentImageUrl = profileData.profileImageUrl
                
                // Update local state immediately
                setProfileData({ ...profileData, profileImageUrl: null })
                
                // Save to database
                await updateUserProfile({
                  profileImageUrl: null,
                })
                
                // Delete from Cloudinary if image exists
                if (currentImageUrl) {
                  try {
                    // Get the original Cloudinary URL without transformations for deletion
                    const originalUrl = getOriginalCloudinaryUrl(currentImageUrl)
                    const publicId = extractPublicIdFromUrl(originalUrl)
                    
                    if (publicId) {
                      console.log('Removing image with public ID:', publicId)
                      console.log('Original URL:', originalUrl)
                      console.log('Current URL (with transformations):', currentImageUrl)
                      
                      const deleteResponse = await fetch('/api/cloudinary/delete', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ publicId }),
                      })
                      
                      if (!deleteResponse.ok) {
                        console.error('Failed to delete from Cloudinary:', deleteResponse.statusText)
                        const errorText = await deleteResponse.text()
                        console.error('Error response:', errorText)
                      } else {
                        console.log('Successfully deleted image from Cloudinary')
                      }
                    } else {
                      console.error('Could not extract public ID from original URL:', originalUrl)
                    }
                  } catch (deleteError) {
                    console.error('Failed to delete from Cloudinary:', deleteError)
                    // Don't fail the whole operation if Cloudinary deletion fails
                  }
                }
                
                toast.success('Profile image removed successfully', {
                  description: 'Your profile image has been removed',
                  duration: 4000,
                })
              } catch (error) {
                console.error('Error removing profile image:', error)
                toast.error('Failed to remove profile image', {
                  description: 'Please try again',
                  duration: 4000,
                })
              }
            }}
            userId={user?.uid || ""}
            userName={profileData.name || user?.name || ""}
          />
        </div>



        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Fingerprint className="h-5 w-5 text-orange-400" />
              <span>Fingerprint Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium mb-2">Biometric Access</p>
                <p className="text-gray-400 text-sm mb-4">
                  {profileData.fingerprintId 
                    ? "Your fingerprint is enrolled for secure gym access" 
                    : "Visit the gym reception to register your fingerprint. This service is managed by gym staff for security purposes."
                  }
                </p>
                {profileData.fingerprintId && (
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <Label className="text-gray-300 text-sm">Fingerprint ID</Label>
                    <div className="text-white font-mono text-sm mt-1">{profileData.fingerprintId}</div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {profileData.fingerprintId ? (
                  <div className="flex items-center space-x-2 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm">Enrolled</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <XCircle className="h-5 w-5" />
                      <span className="text-sm">Not Enrolled</span>
                    </div>
                    <div className="text-xs text-orange-400 text-center">
                      Visit gym reception
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center space-x-2">
                <User className="h-5 w-5 text-orange-400" />
                <span>Personal Information</span>
              </CardTitle>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 hover:text-orange-300 bg-transparent transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 group"
                >
                  <Edit className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name" className="text-gray-300">
                  Full Name {isEditing && <span className="text-red-400">*</span>}
                </Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    required
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="flex items-center space-x-2 mt-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{profileData.name || "Not provided"}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="cnic" className="text-gray-300">
                  CNIC {isEditing && <span className="text-red-400">*</span>}
                </Label>
                {isEditing ? (
                  <Input
                    id="cnic"
                    value={formatCNIC(profileData.cnic)}
                    onChange={(e) => handleCNICChange(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    required
                    placeholder="XXXXX-XXXXXXX-X"
                    maxLength={15}
                  />
                ) : (
                  <div className="flex items-center space-x-2 mt-1">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{profileData.cnic || "Not provided"}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-300">
                  Email Address
                </Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-white">{profileData.email}</span>
                  <span className="text-xs text-gray-500">(Cannot be changed here)</span>
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-300">
                  Phone Number {isEditing && <span className="text-red-400">*</span>}
                </Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => {
                      const input = e.target.value
                      // Remove all spaces and allow only digits
                      const cleaned = input.replace(/[^\d]/g, '')
                      // Limit to 11 digits
                      if (cleaned.length <= 11) {
                        setProfileData({ ...profileData, phone: cleaned })
                      }
                    }}
                    onBlur={(e) => {
                      // Format phone number when leaving the field (add space after first 4 digits)
                      const formatted = formatPhoneNumber(e.target.value)
                      setProfileData({ ...profileData, phone: formatted })
                    }}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    required
                    placeholder="03XX XXXXXXX"
                    maxLength={11}
                  />
                ) : (
                  <div className="flex items-center space-x-2 mt-1">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-white">
                      {profileData.phone ? formatPhoneNumber(profileData.phone) : "Not provided"}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="gender" className="text-gray-300">
                  Gender {isEditing && !profileData.gender && <span className="text-red-400">*</span>}
                </Label>
                {isEditing && !isGenderLocked ? (
                  <Select
                    value={profileData.gender}
                    onValueChange={(value) =>
                      setProfileData({ ...profileData, gender: value as "Male" | "Female" | "Other" })
                    }
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="Male" className="text-white">
                        Male
                      </SelectItem>
                      <SelectItem value="Female" className="text-white">
                        Female
                      </SelectItem>
                      <SelectItem value="Other" className="text-white">
                        Other
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center space-x-2 mt-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{profileData.gender || "Not provided"}</span>
                  </div>
                )}
              </div>



              <div className="md:col-span-2">
                <Label htmlFor="address" className="text-gray-300">
                  Address {isEditing && <span className="text-red-400">*</span>}
                </Label>
                {isEditing ? (
                  <Textarea
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    rows={3}
                    required
                    placeholder="Enter your address"
                  />
                ) : (
                  <div className="flex items-start space-x-2 mt-1">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <span className="text-white">{profileData.address || "Not provided"}</span>
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex space-x-3 mt-6">
                <Button
                  onClick={handleProfileSave}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-1 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30 disabled:hover:scale-100 disabled:hover:shadow-none group"
                >
                  <Save className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 hover:text-orange-300 bg-transparent transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 group"
                >
                  <X className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Lock className="h-5 w-5 text-orange-400" />
              <span>Security Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Password Change Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-medium">Password</h3>
                    <p className="text-gray-400 text-sm">Change your account password</p>
                  </div>
                  {!isChangingPassword && (
                    <Button
                      onClick={() => setIsChangingPassword(true)}
                      variant="outline"
                      className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 hover:text-orange-300 bg-transparent transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 group"
                    >
                      <Lock className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
                      Change Password
                    </Button>
                  )}
                </div>

                {isChangingPassword && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-700/30 rounded-lg">
                    <div>
                      <Label htmlFor="currentPassword" className="text-gray-300">
                        Current Password <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white mt-1"
                        placeholder="Enter your current password"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPassword" className="text-gray-300">
                        New Password <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white mt-1"
                        placeholder="Enter new password (min. 6 characters)"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword" className="text-gray-300">
                        Confirm Password <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white mt-1"
                        placeholder="Confirm your new password"
                        required
                      />
                    </div>
                    <div className="md:col-span-3 flex space-x-3">
                      <Button
                        onClick={handlePasswordChange}
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30 disabled:hover:scale-100 disabled:hover:shadow-none group"
                      >
                        <Lock className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
                        {loading ? "Updating..." : "Update Password"}
                      </Button>
                      <Button
                        onClick={() => {
                          setIsChangingPassword(false)
                          setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
                        }}
                        variant="outline"
                        className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 hover:text-orange-300 bg-transparent transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 group"
                      >
                        <X className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Information */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-white font-medium mb-2">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Member Since:</span>
                    <span className="text-white ml-2">
                      {fullUserData?.memberSince 
                        ? new Date(fullUserData.memberSince.seconds * 1000).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                          })
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Account Status:</span>
                    <span className="text-green-400 ml-2">Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Member ID:</span>
                    <span className="text-white font-mono ml-2">{fullUserData?.memberId || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Last Login:</span>
                    <span className="text-white ml-2">
                      {fullUserData?.lastLoginAt 
                        ? new Date(fullUserData.lastLoginAt.seconds * 1000).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>
    </CustomerDashboardLayout>
  )
}
