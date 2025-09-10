"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface HeroSectionProps {
  scrollToSection: (sectionId: string) => void
}

export default function HeroSection({ scrollToSection }: HeroSectionProps) {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden w-full">
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="/placeholder.jpg"
        >
          <source src="/gym-video.mp4" type="video/mp4" />
        </video>
        
        {/* Video overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/15 via-black/25 to-orange-800/10" />
        <div className="absolute inset-0 bg-black/20" />
      </div>



      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 w-full">
        <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-4 sm:mb-6 lg:mb-8"
          >
            Push Beyond{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-orange-700">
              Limits
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-gray-300 mb-6 sm:mb-8 lg:mb-10 max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto leading-relaxed"
          >
            Join Range Fit Gym and transform your fitness journey with state-of-the-art equipment and expert guidance.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex justify-center"
        >
          <Button
            onClick={() => scrollToSection("memberships")}
            size="lg"
            className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 hover:from-orange-700 hover:via-orange-600 hover:to-orange-500 text-white px-6 sm:px-8 lg:px-10 xl:px-12 py-3 sm:py-4 lg:py-5 text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/25"
          >
            Join Now
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
