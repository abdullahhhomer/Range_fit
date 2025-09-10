"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Fingerprint, Scan, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface FingerprintRegistrationProps {
  userId: string
  userEmail: string
  userName: string
  currentStatus: "enrolled" | "not_enrolled" | "pending"
  onStatusUpdate: (status: "enrolled" | "not_enrolled" | "pending") => void
  onClose: () => void
}

export default function FingerprintRegistration({ 
  userId, 
  userEmail, 
  userName, 
  currentStatus, 
  onStatusUpdate, 
  onClose 
}: FingerprintRegistrationProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanResult, setScanResult] = useState<'success' | 'failed' | null>(null)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enrolled':
        return <Badge className="bg-green-600">Enrolled</Badge>
      case 'not_enrolled':
        return <Badge className="bg-red-600">Not Enrolled</Badge>
      case 'pending':
        return <Badge className="bg-yellow-600">Pending</Badge>
      default:
        return <Badge className="bg-gray-600">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enrolled':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'not_enrolled':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const startFingerprintScan = async () => {
    setIsScanning(true)
    setScanProgress(0)
    setScanResult(null)

    // Simulate fingerprint scanning process
    // This will be replaced with actual hardware integration
    const scanInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(scanInterval)
          // Simulate scan result (success/failed)
          const success = Math.random() > 0.3 // 70% success rate for demo
          setScanResult(success ? 'success' : 'failed')
          setIsScanning(false)
          
          if (success) {
            toast.success('Fingerprint enrolled successfully! 🎯')
            onStatusUpdate('enrolled')
          } else {
            toast.error('Fingerprint enrollment failed. Please try again.')
          }
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const resetFingerprint = () => {
    onStatusUpdate('not_enrolled')
    setScanResult(null)
    setScanProgress(0)
    toast.success('Fingerprint status reset to Not Enrolled')
  }

  const setPending = () => {
    onStatusUpdate('pending')
    setScanResult(null)
    setScanProgress(0)
    toast.success('Fingerprint status set to Pending')
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Fingerprint className="w-6 h-6 text-orange-500" />
            <h3 className="text-xl font-bold text-white">Fingerprint Registration</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-2 transition-all duration-200"
          >
            ✕
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Name:</span>
                <span className="text-white font-medium">{userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Email:</span>
                <span className="text-white font-medium">{userEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Current Status:</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(currentStatus)}
                  {getStatusBadge(currentStatus)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fingerprint Scanner */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center">
                <Scan className="w-5 h-5 mr-2 text-orange-500" />
                Fingerprint Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scanner Status */}
              <div className="text-center">
                {isScanning ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="w-24 h-24 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center border-2 border-orange-500">
                        <Fingerprint className="w-12 h-12 text-orange-500 animate-pulse" />
                      </div>
                      <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
                    </div>
                    <div className="text-orange-400 font-medium">Scanning Fingerprint...</div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${scanProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-gray-400 text-sm">{scanProgress}% Complete</div>
                  </div>
                ) : scanResult === 'success' ? (
                  <div className="space-y-4">
                    <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500">
                      <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                    <div className="text-green-400 font-medium">Enrollment Successful!</div>
                    <div className="text-gray-400 text-sm">Fingerprint has been registered</div>
                  </div>
                ) : scanResult === 'failed' ? (
                  <div className="space-y-4">
                    <div className="w-24 h-24 mx-auto bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500">
                      <XCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <div className="text-red-400 font-medium">Enrollment Failed</div>
                    <div className="text-gray-400 text-sm">Please try again</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-24 h-24 mx-auto bg-gray-500/20 rounded-full flex items-center justify-center border-2 border-gray-500">
                      <Fingerprint className="w-12 h-12 text-gray-400" />
                    </div>
                    <div className="text-gray-400 font-medium">Ready to Scan</div>
                    <div className="text-gray-500 text-sm">Place finger on scanner</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-3">
                {!isScanning && scanResult !== 'success' && (
                  <Button
                    onClick={startFingerprintScan}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold transition-colors h-12"
                  >
                    <Scan className="w-5 h-5 mr-2" />
                    Start Fingerprint Scan
                  </Button>
                )}

                {scanResult === 'success' && (
                  <Button
                    onClick={resetFingerprint}
                    variant="outline"
                    className="w-full border-red-500 text-red-400 hover:bg-red-500/10 py-3 rounded-lg font-semibold transition-colors h-12"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Reset to Not Enrolled
                  </Button>
                )}

                {currentStatus === 'not_enrolled' && (
                  <Button
                    onClick={setPending}
                    variant="outline"
                    className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 py-3 rounded-lg font-semibold transition-colors h-12 bg-white"
                  >
                    <Clock className="w-5 h-5 mr-2" />
                    Set to Pending
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Information */}
          <Card className="bg-blue-900/20 border-blue-700/50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-blue-300 text-sm">
                  <p className="font-medium mb-2">Fingerprint Registration for Gym Attendance</p>
                  <ul className="space-y-1 text-blue-200/80">
                    <li>• Users can check-in/out using fingerprint scanner</li>
                    <li>• Attendance is automatically recorded</li>
                    <li>• No need to remember membership cards</li>
                    <li>• Real-time attendance tracking</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
