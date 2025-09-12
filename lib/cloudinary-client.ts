// Client-side Cloudinary utilities (no server-side imports)

// Upload image to Cloudinary
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset')
    formData.append('cloud_name', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '')

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error('Failed to upload image')
    }

    const data = await response.json()
    return data.secure_url
  } catch (error) {
    console.error('Error uploading image:', error)
    throw new Error('Failed to upload image to Cloudinary')
  }
}

// Upload video to Cloudinary
export const uploadVideoToCloudinary = async (file: File): Promise<string> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset')
    formData.append('cloud_name', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '')

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error('Failed to upload video')
    }

    const data = await response.json()
    return data.secure_url
  } catch (error) {
    console.error('Error uploading video:', error)
    throw new Error('Failed to upload video to Cloudinary')
  }
}

// Delete image from Cloudinary (via API route)
export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    const response = await fetch('/api/cloudinary/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    })

    if (!response.ok) {
      throw new Error('Failed to delete image')
    }
  } catch (error) {
    console.error('Error deleting image:', error)
    throw new Error('Failed to delete image from Cloudinary')
  }
}

// Get Cloudinary URL with transformations
export const getCloudinaryUrl = (url: string, transformations?: string): string => {
  if (!url.includes('cloudinary.com')) return url
  
  if (transformations) {
    return url.replace('/upload/', `/upload/${transformations}/`)
  }
  
  return url
}

// Get Cloudinary video URL with transformations
export const getCloudinaryVideoUrl = (url: string, transformations?: string): string => {
  if (!url.includes('cloudinary.com')) return url
  
  if (transformations) {
    return url.replace('/upload/', `/upload/${transformations}/`)
  }
  
  return url
}

// Generate optimized video URL for different devices
export const getOptimizedVideoUrl = (publicId: string, width?: number, height?: number): string => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) return ''
  
  let transformations = 'q_auto,f_auto'
  
  if (width && height) {
    transformations += `,w_${width},h_${height}`
  }
  
  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformations}/${publicId}.mp4`
}

// Generate thumbnail URL
export const getThumbnailUrl = (url: string, width: number = 150, height: number = 150): string => {
  return getCloudinaryUrl(url, `c_fill,w_${width},h_${height}`)
}

// Generate profile image URL
export const getProfileImageUrl = (url: string, size: number = 200): string => {
  return getCloudinaryUrl(url, `c_fill,w_${size},h_${size},g_face`)
}

// Get original Cloudinary URL without transformations
export const getOriginalCloudinaryUrl = (url: string): string => {
  if (!url.includes('cloudinary.com')) return url
  
  try {
    // Parse the URL to extract the base path
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const uploadIndex = pathParts.findIndex(part => part === 'upload')
    
    if (uploadIndex === -1) return url
    
    // Get the version number (usually after 'upload')
    const version = pathParts[uploadIndex + 1]
    
    // Reconstruct the original URL: https://res.cloudinary.com/cloud_name/image/upload/version/filename
    const cloudName = urlObj.hostname.split('.')[0]
    const filename = pathParts[pathParts.length - 1]
    
    return `https://res.cloudinary.com/${cloudName}/image/upload/${version}/${filename}`
  } catch (error) {
    console.error('Error getting original URL:', error)
    return url
  }
}

// Extract public ID from Cloudinary URL
export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    if (!url.includes('cloudinary.com')) return null
    
    // Parse the URL to extract the public ID
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const uploadIndex = pathParts.findIndex(part => part === 'upload')
    
    if (uploadIndex === -1) return null
    
    // Get everything after 'upload' and before the file extension
    const afterUpload = pathParts.slice(uploadIndex + 2) // Skip 'upload' and version
    if (afterUpload.length === 0) return null
    
    // Join the path parts to get the full public ID
    let publicId = afterUpload.join('/')
    
    // Remove file extension
    const lastDotIndex = publicId.lastIndexOf('.')
    if (lastDotIndex !== -1) {
      publicId = publicId.substring(0, lastDotIndex)
    }
    
    return publicId
  } catch (error) {
    console.error('Error extracting public ID:', error)
    return null
  }
}


