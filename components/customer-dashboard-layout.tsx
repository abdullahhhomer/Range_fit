"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutDashboard, CreditCard, Receipt, User, LogOut, Menu, ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { getProfileImageUrl } from "@/lib/cloudinary-client"

interface CustomerDashboardLayoutProps {
  children: React.ReactNode
}

export function CustomerDashboardLayout({ children }: CustomerDashboardLayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: "Dashboard", href: "/customer/dashboard", icon: LayoutDashboard },
    { name: "My Plan", href: "/customer/dashboard/plan", icon: CreditCard },
    { name: "Receipts", href: "/customer/dashboard/receipts", icon: Receipt },
    { name: "Profile", href: "/customer/dashboard/profile", icon: User },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-sm border-r border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="RangeFit Gym" className="w-8 h-8" />
              <span className="text-lg font-bold text-orange-400">RangeFit Gym</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10 border-2 border-orange-500">
                <AvatarImage 
                  src={user?.profileImageUrl ? getProfileImageUrl(user.profileImageUrl, 80) : undefined} 
                  alt={`${user?.name}'s profile picture`}
                />
                <AvatarFallback className="bg-orange-500 text-white font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium">{user?.name}</p>
                <p className="text-gray-400 text-sm">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-6 border-t border-gray-700">
            <Button
              onClick={() => logout(() => router.push("/login"))}
              variant="ghost"
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/95 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-lg font-bold text-orange-400">RangeFit Gym</span>
          <div className="w-8" /> {/* Spacer */}
        </div>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}

export default CustomerDashboardLayout
