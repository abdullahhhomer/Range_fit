"use client"

import React, { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import AdminDashboardLayout from '@/components/admin-dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Database, Wrench, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { fixAdminCreatedUsers, fixUserUID, debugUserAuth, testUserAccess } from '@/lib/firebase'

export default function FixUIDPage() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isFixing, setIsFixing] = useState(false)
  const [isFixingSpecific, setIsFixingSpecific] = useState(false)
  const [isDebugging, setIsDebugging] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const handleFixAllUsers = async () => {
    setIsFixing(true)
    try {
      const fixed = await fixAdminCreatedUsers()
      toast.success(`Fixed ${fixed} users!`, {
        description: 'All UID mismatches have been corrected.',
        duration: 5000,
      })
    } catch (error) {
      console.error('Error fixing users:', error)
      toast.error('Failed to fix users', {
        description: error.message,
        duration: 5000,
      })
    } finally {
      setIsFixing(false)
    }
  }

  const handleFixSpecificUser = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    setIsFixingSpecific(true)
    try {
      const success = await fixUserUID(email.trim())
      if (success) {
        toast.success('User UID fixed!', {
          description: 'The UID has been corrected for this user.',
          duration: 5000,
        })
      } else {
        toast.error('User not found', {
          description: 'No user found with this email address.',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error fixing specific user:', error)
      toast.error('Failed to fix user', {
        description: error.message,
        duration: 5000,
      })
    } finally {
      setIsFixingSpecific(false)
    }
  }

  const handleDebugUser = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password')
      return
    }

    setIsDebugging(true)
    try {
      const result = await debugUserAuth(email.trim(), password)
      console.log('Debug result:', result)
      if (result.exists) {
        toast.success('User found!', {
          description: `UID: ${result.uid}, Password match: ${result.passwordMatch}`,
          duration: 5000,
        })
      } else {
        toast.error('User not found')
      }
    } catch (error) {
      console.error('Debug failed:', error)
      toast.error('Debug failed', {
        description: error.message,
        duration: 5000,
      })
    } finally {
      setIsDebugging(false)
  }

  const handleTestUserAccess = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    setIsTesting(true)
    try {
      const result = await testUserAccess(email.trim())
      console.log('Test result:', result)
      if (result.success) {
        toast.success('Access test passed!', {
          description: result.message,
          duration: 5000,
        })
      } else {
        toast.error('Access test failed', {
          description: result.error,
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Test failed:', error)
      toast.error('Test failed', {
        description: error.message,
        duration: 5000,
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminDashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Fix UID Issues</h1>
              <p className="text-gray-400 mt-2">Fix UID mismatches for admin-created users</p>
            </div>
          </div>

          {/* Fix All Users */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Wrench className="h-5 w-5 text-orange-400" />
                <span>Fix All Users</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Database className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-white font-medium">Fix All UID Mismatches</p>
                    <p className="text-gray-400 text-sm">Automatically fix UID issues for all admin-created users</p>
                  </div>
                </div>
                <Button
                  onClick={handleFixAllUsers}
                  disabled={isFixing}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isFixing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Fixing...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4 mr-2" />
                      Fix All Users
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fix Specific User */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span>Fix Specific User</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm font-medium mb-2 block">
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter user email"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <Button
                  onClick={handleFixSpecificUser}
                  disabled={isFixingSpecific || !email.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isFixingSpecific ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Fixing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Fix This User
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Debug User */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <span>Debug User Authentication</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm font-medium mb-2 block">
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter user email"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm font-medium mb-2 block">
                    Password
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter user password"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <Button
                  onClick={handleDebugUser}
                  disabled={isDebugging || !email.trim() || !password.trim()}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {isDebugging ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Debugging...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Debug User
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

           {/* Test User Access */}
           <Card className="bg-gray-800/50 border-gray-700">
             <CardHeader>
               <CardTitle className="text-white flex items-center space-x-2">
                 <Database className="h-5 w-5 text-purple-400" />
                 <span>Test User Access</span>
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 <div>
                   <Label className="text-gray-300 text-sm font-medium mb-2 block">
                     Email Address
                   </Label>
                   <Input
                     type="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="Enter user email"
                     className="bg-gray-700 border-gray-600 text-white"
                   />
                 </div>
                 <Button
                   onClick={handleTestUserAccess}
                   disabled={isTesting || !email.trim()}
                   className="bg-purple-600 hover:bg-purple-700 text-white"
                 >
                   {isTesting ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                       Testing...
                     </>
                   ) : (
                     <>
                       <Database className="h-4 w-4 mr-2" />
                       Test Access
                     </>
                   )}
                 </Button>
               </div>
             </CardContent>
           </Card>
         </div>
       </AdminDashboardLayout>
     </ProtectedRoute>
   )
 }
}
