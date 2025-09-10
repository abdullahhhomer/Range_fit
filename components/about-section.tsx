"use client"

import { motion } from "framer-motion"
import { Target, Heart } from "lucide-react"

export default function AboutSection() {
  return (
    <section id="about" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 px-4">
            About{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-orange-700">
              Range Fit
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto px-4">
            Range Fit Gym is dedicated to helping you achieve your fitness goals with the best facilities and expert
            guidance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0 * 0.1 }}
            whileHover={{ y: -10 }}
            className="bg-gray-800/50 p-6 sm:p-8 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300"
          >
            <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-orange-500/20 rounded-full mb-4 sm:mb-6 mx-auto">
              <Target className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-white text-center">Our Mission</h3>
            <p className="text-sm sm:text-base text-gray-400 text-center leading-relaxed">
              At Range Fit, our mission is to provide a supportive and motivating environment for all our members to
              achieve their fitness goals.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 * 0.1 }}
            whileHover={{ y: -10 }}
            className="bg-gray-800/50 p-6 sm:p-8 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300"
          >
            <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-orange-500/20 rounded-full mb-4 sm:mb-6 mx-auto">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-white text-center">Our Values</h3>
            <p className="text-sm sm:text-base text-gray-400 text-center leading-relaxed">
              We believe in the power of fitness and strive to create a community where everyone feels welcome and
              supported.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
