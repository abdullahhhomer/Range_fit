"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import AdminDashboardLayout from '@/components/admin-dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Archive, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  manualArchivePaymentRecords, 
  manualCleanupArchivedRecords, 
  checkArchivalStatus,
  getActivePaymentRecords,
  getArchivedPaymentRecords
} from '@/lib/firebase'

interface ArchivalStatus {
  needsArchival: number
  needsCleanup: number
  lastChecked: Date
}

export default function DataManagement() {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const [archivalStatus, setArchivalStatus] = useState<ArchivalStatus | null>(null)
  const [activePaymentsCount, setActivePaymentsCount] = useState(0)
  const [archivedPaymentsCount, setArchivedPaymentsCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Check archival status - handle potential index errors
      try {
        const status = await checkArchivalStatus()
        setArchivalStatus({
          needsArchival: status.needsArchival,
          needsCleanup: status.needsCleanup,
          lastChecked: new Date()
        })
      } catch (error) {
        console.warn('Could not check archival status:', error)
        setArchivalStatus({
          needsArchival: 0,
          needsCleanup: 0,
          lastChecked: new Date()
        })
      }

      // Get payment counts - handle potential index errors
      try {
        const activePayments = await getActivePaymentRecords()
        setActivePaymentsCount(activePayments.length)
      } catch (error) {
        console.warn('Could not load active payments count:', error)
        setActivePaymentsCount(0)
      }

      try {
        const archivedPayments = await getArchivedPaymentRecords()
        setArchivedPaymentsCount(archivedPayments.length)
      } catch (error) {
        console.warn('Could not load archived payments count:', error)
        setArchivedPaymentsCount(0)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data management information')
    } finally {
      setLoading(false)
    }
  }

  const handleArchiveRecords = async () => {
    setArchiving(true)
    try {
      const result = await manualArchivePaymentRecords()
      toast.success(`Successfully archived ${result.archivedCount} payment records`)
      await loadData() // Refresh data
    } catch (error) {
      console.error('Error archiving records:', error)
      toast.error('Failed to archive payment records')
    } finally {
      setArchiving(false)
    }
  }

  const handleCleanupRecords = async () => {
    setCleaning(true)
    try {
      const result = await manualCleanupArchivedRecords() // Remove the parameter
      toast.success(`Successfully cleaned up ${result.deletedCount} old archived records`)
      await loadData() // Refresh data
    } catch (error) {
      console.error('Error cleaning up records:', error)
      toast.error('Failed to clean up archived records')
    } finally {
      setCleaning(false)
    }
  }

  const getStatusBadge = (count: number, type: 'archival' | 'cleanup') => {
    if (count === 0) {
      return <Badge className="bg-green-600">Up to date</Badge>
    } else if (count <= 10) {
      return <Badge className="bg-yellow-600">Needs attention</Badge>
    } else {
      return <Badge className="bg-red-600">Action required</Badge>
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminDashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </AdminDashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminDashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
          <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <Database className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Data Management
              </h1>
            </div>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Manage payment record retention and archival
            </p>
            <div className="flex justify-center">
              <Button 
                onClick={() => router.push('/admin/dashboard/settings')}
                variant="outline" 
                className="border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 transition-all duration-200 bg-white flex items-center justify-center gap-2 py-3 px-4 text-sm sm:text-base"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Settings
              </Button>
            </div>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Payments</p>
                    <p className="text-2xl font-bold text-white">{activePaymentsCount}</p>
                  </div>
                  <Database className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Archived Payments</p>
                    <p className="text-2xl font-bold text-white">{archivedPaymentsCount}</p>
                  </div>
                  <Archive className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Need Archival</p>
                    <p className="text-2xl font-bold text-white">{archivalStatus?.needsArchival || 0}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-400" />
                </div>
                <div className="mt-2">
                  {getStatusBadge(archivalStatus?.needsArchival || 0, 'archival')}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Need Cleanup</p>
                    <p className="text-2xl font-bold text-white">{archivalStatus?.needsCleanup || 0}</p>
                  </div>
                  <Trash2 className="h-8 w-8 text-red-400" />
                </div>
                <div className="mt-2">
                  {getStatusBadge(archivalStatus?.needsCleanup || 0, 'cleanup')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Archive Records */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Archive Old Payment Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 mb-4">
                  Archive payment records that are older than 3 months. This moves them to archived status 
                  while preserving them for historical reporting.
                </p>
                
                {archivalStatus && archivalStatus.needsArchival > 0 && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className="text-yellow-400">
                        {archivalStatus.needsArchival} payment records need to be archived
                      </span>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleArchiveRecords}
                  disabled={archiving || (archivalStatus?.needsArchival || 0) === 0}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600"
                >
                  {archiving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Archiving...
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Records ({archivalStatus?.needsArchival || 0})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Cleanup Records */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Cleanup Old Archived Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 mb-4">
                  Permanently delete archived payment records that are older than 6 months. 
                  This action cannot be undone and will free up storage space.
                </p>
                
                {archivalStatus && archivalStatus.needsCleanup > 0 && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-red-400">
                        {archivalStatus.needsCleanup} archived records can be permanently deleted
                      </span>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleCleanupRecords}
                  disabled={cleaning || (archivalStatus?.needsCleanup || 0) === 0}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600"
                >
                  {cleaning ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cleanup Records ({archivalStatus?.needsCleanup || 0})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Information Card */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Data Retention Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                    <h4 className="font-semibold text-blue-400 mb-2">Active Records (0-3 months)</h4>
                    <p className="text-gray-400 text-sm">
                      Payment records are kept active for current reporting and analytics
                    </p>
                  </div>
                  
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <h4 className="font-semibold text-yellow-400 mb-2">Archived Records (3-6 months)</h4>
                    <p className="text-gray-400 text-sm">
                      Records are archived but preserved for historical reporting
                    </p>
                  </div>
                  
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                    <h4 className="font-semibold text-red-400 mb-2">Permanent Deletion (6+ months)</h4>
                    <p className="text-gray-400 text-sm">
                      Old archived records are permanently deleted to save storage
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-700/50 rounded-md">
                  <p className="text-gray-300 text-sm">
                    <strong>Note:</strong> Since you're on the free Firebase plan, archival and cleanup 
                    must be performed manually. Consider upgrading to Blaze plan for automatic 
                    scheduled processes.
                  </p>
                </div>

                {/* Index Error Help */}
                {(activePaymentsCount === 0 && archivedPaymentsCount === 0 && !loading) && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <h4 className="font-semibold text-yellow-400 mb-2">⚠️ Index Required</h4>
                    <p className="text-gray-400 text-sm mb-2">
                      If you're seeing index errors, you may need to create a composite index in Firebase Console.
                    </p>
                    <p className="text-gray-400 text-sm">
                      <strong>Quick Fix:</strong> Click the link in the error message to create the required index, 
                      or contact support for assistance.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </AdminDashboardLayout>
    </ProtectedRoute>
  )
}
