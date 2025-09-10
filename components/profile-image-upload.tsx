"use client"

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Camera, 
  Upload, 
  Edit3, 
  Trash2, 
  User,
  Image as ImageIcon
} from 'lucide-react'
import { uploadImageToCloudinary, getProfileImageUrl } from '@/lib/cloudinary-client'
import ImageCropPopup from './image-crop-popup'
import { toast } from 'sonner'

interface ProfileImageUploadProps {
  currentImageUrl?: string | null
  onImageUpdate: (imageUrl: string) => void
  onImageRemove: () => void
  userId: string
  userName: string
}

export function ProfileImageUpload({ 
  currentImageUrl, 
  onImageUpdate, 
  onImageRemove,
  userId,
  userName
}: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showCropPopup, setShowCropPopup] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string>('')
  const [isRemoving, setIsRemoving] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file', {
        description: 'Only image files (JPG, PNG, GIF) are allowed',
        duration: 4000,
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large', {
        description: 'Please select an image smaller than 5MB',
        duration: 4000,
      })
      return
    }

    // Create temporary URL for crop popup
    const tempUrl = URL.createObjectURL(file)
    setTempImageUrl(tempUrl)
    setShowCropPopup(true)
  }

  // Handle crop completion
  const handleCropComplete = async (croppedImageBlob: Blob) => {
    try {
      setIsUploading(true)
      setShowCropPopup(false)

      // Convert blob to file
      const croppedFile = new File([croppedImageBlob], 'profile-image.jpg', {
        type: 'image/jpeg',
      })

      // Upload to Cloudinary
      const imageUrl = await uploadImageToCloudinary(croppedFile)
      
      // Update profile
      onImageUpdate(imageUrl)
      
      // Clean up
      URL.revokeObjectURL(tempImageUrl)
      setTempImageUrl('')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image', {
        description: 'Please try again or contact support',
        duration: 4000,
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Handle crop cancellation
  const handleCropCancel = () => {
    setShowCropPopup(false)
    URL.revokeObjectURL(tempImageUrl)
    setTempImageUrl('')
  }

  // Handle image removal
  const handleImageRemove = async () => {
    if (!currentImageUrl || currentImageUrl === null) return

    try {
      setIsRemoving(true)
      onImageRemove()
    } catch (error) {
      console.error('Error removing image:', error)
      toast.error('Failed to remove image', {
        description: 'Please try again',
        duration: 4000,
      })
    } finally {
      setIsRemoving(false)
    }
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Camera className="h-5 w-5 text-orange-400" />
            <span>Profile Picture</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            {/* Current Profile Image */}
            <div className="relative">
                             <Avatar className="w-32 h-32 border-4 border-gray-700">
                 <AvatarImage 
                   src={currentImageUrl && currentImageUrl !== null ? getProfileImageUrl(currentImageUrl, 200) : undefined} 
                   alt={`${userName}'s profile picture`}
                 />
                 <AvatarFallback className="bg-gray-700 text-white text-3xl font-semibold">
                   {getInitials(userName)}
                 </AvatarFallback>
               </Avatar>
              
              {/* Upload Status Badge */}
              {isUploading && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-orange-600 hover:bg-orange-700 text-white animate-pulse">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Uploading
                  </Badge>
                </div>
              )}
            </div>

                         {/* Image Status */}
             <div className="text-center">
               {currentImageUrl && currentImageUrl !== null ? (
                 <Badge className="bg-green-600 hover:bg-green-700 text-white">
                   <ImageIcon className="h-3 w-3 mr-1" />
                   Image Set
                 </Badge>
               ) : (
                 <Badge className="bg-gray-600 hover:bg-gray-700 text-white">
                   <User className="h-3 w-3 mr-1" />
                   No Image
                 </Badge>
               )}
             </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                                           <Button
                onClick={triggerFileInput}
                disabled={isUploading}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-1"
              >
                {currentImageUrl && currentImageUrl !== null ? (
                  <>
                    <Edit3 className="h-4 w-4" />
                    Change
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
               
               {currentImageUrl && currentImageUrl !== null && (
                 <Button
                   onClick={handleImageRemove}
                   disabled={isRemoving || isUploading}
                   variant="outline"
                   className="flex-1 bg-white hover:bg-gray-100 border-red-500/50 text-red-600 flex items-center justify-center gap-1"
                 >
                   <Trash2 className="h-4 w-4" />
                   Remove
                 </Button>
               )}
            </div>

            {/* File Input (Hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Upload Guidelines */}
            <div className="text-center text-sm text-gray-400 max-w-md">
              <p className="mb-2">📸 Upload a clear, well-lit photo of yourself</p>
              <p className="text-xs">
                Supported formats: JPG, PNG, GIF • Max size: 5MB • 
                We'll help you crop it to the perfect size
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crop Popup */}
      {showCropPopup && (
        <ImageCropPopup
          imageUrl={tempImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
          minWidth={200}
          minHeight={200}
        />
      )}
    </>
  )
}

export default ProfileImageUpload
