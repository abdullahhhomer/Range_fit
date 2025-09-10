"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ("admin" | "receptionist" | "customer")[]
  redirectTo?: string
}

export function ProtectedRoute({ children, allowedRoles, redirectTo = "/login" }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    if (!loading && !hasRedirected) {
      // If no user is authenticated, redirect to login
      if (!user) {
        console.log("[ProtectedRoute] No user, redirecting to:", redirectTo)
        setHasRedirected(true)
        router.replace(redirectTo)
        return
      }

      // If specific roles are required, check if user has the right role
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.log("[ProtectedRoute] User role not allowed:", user.role, "allowed:", allowedRoles)
        setHasRedirected(true)
        // Redirect to appropriate dashboard based on user role
        const userDashboard = 
          user.role === "admin" 
            ? "/admin/dashboard" 
            : user.role === "receptionist" 
              ? "/reception/dashboard" 
              : "/customer/dashboard"
        router.replace(userDashboard)
        return
      }

      console.log("[ProtectedRoute] User authorized:", user.role)
      setIsAuthorized(true)
    }
  }, [user, loading, router, allowedRoles, redirectTo, hasRedirected])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
