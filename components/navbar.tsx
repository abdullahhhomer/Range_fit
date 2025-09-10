"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, LogIn, UserPlus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface NavbarProps {
  scrollToSection: (sectionId: string) => void
}

export default function Navbar({ scrollToSection }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleScrollToSection = (sectionId: string) => {
    scrollToSection(sectionId)
    setIsMenuOpen(false)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-md border-b border-gray-800 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-18">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Image src="/logo.png" alt="RangeFit Gym" width={32} height={32} className="rounded sm:w-8 sm:h-8 md:w-10 md:h-10" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-orange-400 whitespace-nowrap">RangeFit Gym</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center justify-between w-full ml-6 xl:ml-8">
            <div className="flex items-center space-x-4 xl:space-x-6 2xl:space-x-8 flex-1 justify-center">
              <button onClick={() => handleScrollToSection("home")} className="hover:text-orange-400 transition-colors text-sm xl:text-base px-2 py-1 rounded">
                Home
              </button>
              <button
                onClick={() => handleScrollToSection("memberships")}
                className="hover:text-orange-400 transition-colors text-sm xl:text-base px-2 py-1 rounded"
              >
                Memberships
              </button>
              <button
                onClick={() => handleScrollToSection("trainers")}
                className="hover:text-orange-400 transition-colors text-sm xl:text-base px-2 py-1 rounded"
              >
                Trainers
              </button>
              <button
                onClick={() => handleScrollToSection("about")}
                className="hover:text-orange-400 transition-colors text-sm xl:text-base px-2 py-1 rounded"
              >
                About Us
              </button>
            </div>

            <div className="flex items-center space-x-2 xl:space-x-3">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-orange-400 border border-orange-400 flex items-center justify-center gap-1 text-sm px-3 py-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Login</span>
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 hover:from-orange-700 hover:via-orange-600 hover:to-orange-500 text-white flex items-center justify-center gap-1 text-sm px-3 py-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Up</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="lg:hidden text-white hover:text-orange-400 p-2 rounded-lg transition-colors duration-200 hover:bg-gray-800/50"
            aria-label="Toggle mobile menu"
          >
            {isMenuOpen ? <X size={24} className="w-6 h-6" /> : <Menu size={24} className="w-6 h-6" />}
          </button>
        </div>

                {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:hidden bg-black/95 backdrop-blur-md border-t border-gray-800 shadow-lg"
            >
              <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8 space-y-2 sm:space-y-3">
                <button
                  onClick={() => handleScrollToSection("home")}
                  className="block w-full text-left px-4 py-3 text-white hover:text-orange-400 hover:bg-gray-800/50 rounded-lg transition-all duration-200 text-base font-medium"
                >
                  Home
                </button>
                <button
                  onClick={() => handleScrollToSection("memberships")}
                  className="block w-full text-left px-4 py-3 text-white hover:text-orange-400 hover:bg-gray-800/50 rounded-lg transition-all duration-200 text-base font-medium"
                >
                  Memberships
                </button>
                <button
                  onClick={() => handleScrollToSection("trainers")}
                  className="block w-full text-left px-4 py-3 text-white hover:text-orange-400 hover:bg-gray-800/50 rounded-lg transition-all duration-200 text-base font-medium"
                >
                  Trainers
                </button>
                <button
                  onClick={() => handleScrollToSection("about")}
                  className="block w-full text-left px-4 py-3 text-white hover:text-orange-400 hover:bg-gray-800/50 rounded-lg transition-all duration-200 text-base font-medium"
                >
                  About Us
                </button>

                <div className="border-t border-gray-700 pt-4 mt-4 space-y-3">
                  <Link href="/login" className="block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center text-white hover:text-orange-400 hover:bg-gray-800/50 border border-orange-400 py-3 text-base font-medium"
                    >
                      <LogIn className="w-5 h-5 mr-3" />
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup" className="block">
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 hover:from-orange-700 hover:via-orange-600 hover:to-orange-500 text-white py-3 text-base font-medium"
                    >
                      <UserPlus className="w-5 h-5 mr-3" />
                      Sign Up
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}
