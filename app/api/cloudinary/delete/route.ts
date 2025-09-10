import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary for server-side operations
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function DELETE(request: NextRequest) {
  try {
    const { publicId } = await request.json()

    console.log('=== CLOUDINARY DELETE API ===')
    console.log('Received public ID:', publicId)
    console.log('Cloud name:', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
    console.log('API key:', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ? 'Set' : 'Not set')
    console.log('API secret:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set')

    if (!publicId) {
      console.error('No public ID provided')
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      )
    }

    // Delete the image from Cloudinary
    console.log('Attempting to delete image with public ID:', publicId)
    const result = await cloudinary.uploader.destroy(publicId)
    
    console.log('Cloudinary response:', result)

    if (result.result === 'ok') {
      console.log('Successfully deleted image from Cloudinary')
      return NextResponse.json({ success: true, message: 'Image deleted successfully' })
    } else {
      console.error('Failed to delete image from Cloudinary:', result)
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
