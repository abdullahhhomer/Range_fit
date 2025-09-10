"use client"

import { motion } from "framer-motion"
import { Dumbbell, Users, Clock, Award } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function FeaturesSection() {
  const features = [
    {
      icon: <Dumbbell className="w-8 h-8" />,
      title: "State-of-the-art Equipment",
      description: "Latest fitness technology and premium equipment for optimal results",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Certified Trainers",
      description: "Expert personal trainers to guide your fitness journey",
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Flexible Timings",
      description: "24/7 access with separate timings for different preferences",
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Premium Memberships",
      description: "Affordable plans tailored to your fitness goals and budget",
    },
  ]

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Why Choose{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-orange-700">
              Range Fit?
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Experience the difference with our premium facilities and expert guidance
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <Card className="bg-black/50 border-gray-800 hover:border-orange-500/50 transition-all duration-300 h-full">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500/20 via-orange-400/20 to-orange-300/20 rounded-full mb-4 text-orange-400">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
