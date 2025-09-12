"use client"

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  ArrowLeft,
  UserPlus,
  Calendar,
  CreditCard,
  Shield,
  Activity,
  TrendingUp,
  FileText,
  Bell,
  Home
} from 'lucide-react'
import { toast } from 'sonner'

interface AdminDashboardLayoutProps {
  children: React.ReactNode
}

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    {
      name: 'Overview',
      href: '/admin/dashboard',
      icon: Home
    },
    {
      name: 'User Management',
      href: '/admin/dashboard/users',
      icon: Users
    },
    {
      name: 'Memberships',
      href: '/admin/dashboard/memberships',
      icon: CreditCard
    },
    {
      name: 'Attendance',
      href: '/admin/dashboard/attendance',
      icon: Calendar
    },
    {
      name: 'Reports & Analytics',
      href: '/admin/dashboard/reports',
      icon: FileText
    },
    {
      name: 'Settings',
      href: '/admin/dashboard/settings',
      icon: Settings
    }
  ]

  const handleLogout = async () => {
    try {
      await logout(() => router.push('/login'))
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-900/95 backdrop-blur-sm border-r border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {/* User Info */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="RangeFit Gym" className="w-10 h-10" />
              <div>
                <p className="text-white font-medium">RangeFit Admin</p>
                <p className="text-gray-400 text-sm">Administrator</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href === '/admin/dashboard/reports' && pathname.startsWith('/admin/dashboard/reports')) ||
                  (item.href === '/admin/dashboard/settings' && pathname.startsWith('/admin/dashboard/data-management'))
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => {
                        router.push(item.href)
                        setSidebarOpen(false)
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm whitespace-nowrap">{item.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-6 border-t border-gray-700">
            <Button
              onClick={handleLogout}
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
      <div className="lg:pl-72">
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
