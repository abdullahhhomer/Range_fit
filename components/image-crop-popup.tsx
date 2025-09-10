"use client"

import React, { useState, useRef, useCallback } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  X, 
  Check, 
  Image as ImageIcon
} from 'lucide-react'

interface ImageCropPopupProps {
  imageUrl: string
  onCropComplete: (croppedImageBlob: Blob) => void
  onCancel: () => void
  aspectRatio?: number
  minWidth?: number
  minHeight?: number
}

export function ImageCropPopup({ 
  imageUrl, 
  onCropComplete, 
  onCancel, 
  aspectRatio = 1, 
  minWidth = 100, 
  minHeight = 100 
}: ImageCropPopupProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isProcessing, setIsProcessing] = useState(false)
  
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Center the crop on image load
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        aspectRatio,
        width,
        height
      ),
      width,
      height
    )
    setCrop(crop)
  }, [aspectRatio])

  // Generate cropped image
  const generateCroppedImage = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) return

    setIsProcessing(true)

    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('No 2d context')
      }

      const scaleX = imgRef.current.naturalWidth / imgRef.current.width
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height

      canvas.width = completedCrop.width
      canvas.height = completedCrop.height

      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      )

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob)
          }
        },
        'image/jpeg',
        0.95
      )
    } catch (error) {
      console.error('Error generating cropped image:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [completedCrop, onCropComplete])

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b border-gray-700 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center space-x-2 text-sm sm:text-base">
              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
              <span>Crop Profile Image</span>
            </CardTitle>
            <Button
              onClick={onCancel}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 sm:p-6 overflow-y-auto sm:overflow-visible max-h-[calc(95vh-120px)] sm:max-h-none">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Image Crop Area */}
            <div className="flex-1 min-h-0">
              <div className="bg-gray-900 rounded-lg p-2 sm:p-4 border border-gray-700">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspectRatio}
                  minWidth={minWidth}
                  minHeight={minHeight}
                  className="max-h-[300px] sm:max-h-[400px] overflow-hidden rounded-lg"
                >
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={imageUrl}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                    }}
                    onLoad={onImageLoad}
                    className="rounded-lg"
                  />
                </ReactCrop>
              </div>
              
              {/* Hidden canvas for processing */}
              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
              />
            </div>

            {/* Simple Controls Panel */}
            <div className="w-full lg:w-80 space-y-4 sm:space-y-6">
              <div className="bg-gray-900 rounded-lg p-3 sm:p-4 border border-gray-700">
                <h4 className="text-white text-sm font-medium mb-2 sm:mb-3">Instructions</h4>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Drag to move the crop area, drag corners to resize. Position the crop area over the part of the image you want to keep.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2 sm:pt-4">
                <Button
                  onClick={generateCroppedImage}
                  disabled={!completedCrop || isProcessing}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm sm:text-base py-2 sm:py-3 flex items-center justify-center gap-1"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                  </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Apply Crop
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={onCancel}
                  variant="outline"
                  className="w-full bg-white hover:bg-gray-100 border-orange-500/50 text-orange-600 hover:border-orange-400 text-sm sm:text-base py-2 sm:py-3"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ImageCropPopup
