"use client"

import React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { LogOut, Menu, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  role: string
}

export function DashboardLayout({ children, title, role }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout(() => router.push("/login"))
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Image src="/logo.png" alt="Range Fit" width={32} height={32} className="rounded" />
            <span className="text-white font-semibold">Range Fit</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col h-full">
          <div className="flex-1 px-6 py-6">
            <div className="mb-6">
              <p className="text-sm text-gray-400">Welcome back,</p>
              <p className="text-white font-medium">{user?.name}</p>
              <p className="text-xs text-orange-400 capitalize">{role}</p>
            </div>
          </div>

          <div className="p-6 border-t border-gray-700">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-6">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white mr-4">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold text-white">{title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400 hidden md:block">Welcome, {user?.name}</span>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
