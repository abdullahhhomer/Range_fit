"use client"

import { Phone, Mail, MapPin, Instagram } from "lucide-react"
import Image from "next/image"

interface FooterProps {
  scrollToSection: (sectionId: string) => void
}

export default function Footer({ scrollToSection }: FooterProps) {
  return (
    <footer className="bg-black border-t border-gray-800 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Image src="/logo.png" alt="RangeFit Gym" width={40} height={40} className="rounded" />
              <span className="text-2xl font-bold text-orange-400">RangeFit Gym</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Transform your fitness journey with RangeFit Gym. State-of-the-art equipment, expert trainers, and
              flexible memberships.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/rangefitgym?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors duration-300 group"
              >
                <Instagram className="w-5 h-5 text-gray-400 group-hover:text-white" />
                <span className="sr-only">Instagram</span>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-400">
                <Phone className="w-5 h-5 text-orange-400" />
                <a 
                  href="tel:03325727216"
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                  title="Click to call"
                >
                  0332 5727216
                </a>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <MapPin className="w-5 h-5 text-orange-400" />
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=Al+Harmain+Plaza%2C+H2X9%2B8QF%2C+Range+Rd%2C+Shalley+Valley%2C+Afshan+Colony%2C+Rawalpindi%2C+46000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                  title="Click to open in Google Maps"
                >
                  Al Harmain Plaza, Range Rd, Rawalpindi
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
            <div className="space-y-2">
              {["Home", "Memberships", "Trainers", "About Us"].map((link) => (
                <button
                  key={link}
                  onClick={() => scrollToSection(link.toLowerCase().replace(" ", ""))}
                  className="block text-gray-400 hover:text-orange-400 transition-colors"
                >
                  {link}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-gray-400">© 2025 RangeFit Gym. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
