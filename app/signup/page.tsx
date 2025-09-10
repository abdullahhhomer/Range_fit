"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Eye, EyeOff, User, Mail, Lock, Phone } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [hasRedirected, setHasRedirected] = useState(false)

  const { signup, user, loading, error, clearError } = useAuth()
  const router = useRouter()

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\s/g, '')
    // Only add space if there are more than 4 digits
    if (cleaned.length > 4) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
    }
    return cleaned
  }



  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) clearError()
    
    // Special handling for phone number
    if (e.target.name === 'phone') {
      const inputValue = e.target.value
      // Remove all non-digit characters from input
      const digitsOnly = inputValue.replace(/\D/g, '')
      
      // Limit to 11 digits
      if (digitsOnly.length <= 11) {
        setFormData(prev => ({
          ...prev,
          phone: digitsOnly
        }))
      }
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear any previous errors
    if (error) clearError()

    // Validate form data
    if (!formData.name.trim()) {
      clearError()
      return
    }
    if (!formData.email.trim()) {
      clearError()
      return
    }
    if (!formData.password) {
      clearError()
      return
    }
    if (formData.password.length < 6) {
      clearError()
      return
    }

    try {
      // Pass phone only if it has a value, otherwise pass undefined
      const phoneValue = formData.phone.trim() || undefined
      const userData = await signup(formData.email.trim(), formData.password, formData.name.trim(), phoneValue)
      setHasRedirected(true)
      // Redirect immediately after successful signup
      router.push("/customer/dashboard")
    } catch (err) {
      // Error is already handled by AuthContext with toast notifications
      console.error("Signup failed:", err)
      setHasRedirected(false) // Reset redirect state on error
    }
  }

  React.useEffect(() => {
    if (user && !loading && !hasRedirected) {
      setHasRedirected(true)
      router.push("/customer/dashboard")
    }
  }, [user, loading, router, hasRedirected])

  // Also redirect if user is already logged in
  React.useEffect(() => {
    if (user && !loading) {
      router.push("/customer/dashboard")
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Floating gradient orbs for glassmorphism effect */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl animate-pulse delay-500"></div>

      <div className="max-w-md w-full space-y-4 relative z-10">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 shadow-2xl">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Link href="/" className="p-3 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-sm border border-orange-500/20 hover:from-orange-500/30 hover:to-orange-600/30 transition-all duration-300 cursor-pointer">
                <Image src="/logo.png" alt="Range Fit Gym" width={60} height={60} className="rounded-lg" />
              </Link>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              Join Range Fit
            </h2>
            <p className="text-gray-400">Create your customer account</p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            {error && (
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 w-5 h-5" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-10 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-orange-500/50 focus:ring-orange-500/20 rounded-xl"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

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
                />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number <span className="text-gray-500"></span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 w-5 h-5" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formatPhoneNumber(formData.phone)}
                  onChange={handleChange}
                  className="pl-10 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-orange-500/50 focus:ring-orange-500/20 rounded-xl"
                  placeholder="03XX XXXXXXX"
                  maxLength={12}
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
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-orange-500/50 focus:ring-orange-500/20 rounded-xl"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.name.trim() ||
                !formData.email ||
                !formData.password ||
                formData.password.length < 6 ||
                hasRedirected
              }
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-orange-500/25"
            >
              {loading ? "Creating Account..." : hasRedirected ? "Redirecting..." : "Create Account"}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
