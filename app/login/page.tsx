"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)

  const { login, user, loading, error, clearError } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if user is already authenticated when page loads
    if (user && !loading) {
      const redirectPath =
        user.role === "admin"
          ? "/admin/dashboard"
          : user.role === "receptionist"
            ? "/reception/dashboard"
            : "/customer/dashboard"

      router.replace(redirectPath)
    }
  }, [user, loading, router]) // Proper dependency array

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) clearError()
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear any previous errors
    if (error) clearError()

    // Validate form data
    if (!formData.email.trim()) {
      clearError()
      // Note: We can't set custom error messages with the current auth context
      // The error will be handled by the login function
      return
    }
    if (!formData.password) {
      clearError()
      // Note: We can't set custom error messages with the current auth context
      // The error will be handled by the login function
      return
    }

    try {
      console.log("[DEBUG] Attempting login with:", formData.email)
      const result = await login(formData.email.trim(), formData.password)

      console.log("[DEBUG] Login result:", result)
      
      if (result && result.role) {
        const redirectPath =
          result.role === "admin"
            ? "/admin/dashboard"
            : result.role === "receptionist"
              ? "/reception/dashboard"
              : "/customer/dashboard"

        console.log("[DEBUG] Login successful, redirecting to:", redirectPath)
        router.replace(redirectPath)
      } else {
        console.log("[DEBUG] Login result missing role:", result)
      }
    } catch (err) {
      // Error is already handled by AuthContext with toast notifications
      console.error("[DEBUG] Login failed:", err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Floating gradient orbs for glassmorphism effect */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Link href="/" className="p-3 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-sm border border-orange-500/20 hover:from-orange-500/30 hover:to-orange-600/30 transition-all duration-300 cursor-pointer">
                <Image src="/logo.png" alt="Range Fit Gym" width={60} height={60} className="rounded-lg" />
              </Link>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-400">Sign in to your Range Fit account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            {error && (
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 w-5 h-5" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-orange-500/50 focus:ring-orange-500/20 rounded-xl"
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 w-5 h-5" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-orange-500/50 focus:ring-orange-500/20 rounded-xl"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-orange-500/25"
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>



          {/* Signup Link */}
          <div className="text-center mt-6">
            <p className="text-gray-400">
              New customer?{" "}
              <Link href="/signup" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
