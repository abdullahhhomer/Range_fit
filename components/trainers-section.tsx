"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

export default function TrainersSection() {
  const trainers = [
    {
      name: "Muhammad Saad",
      role: "Fitness & Nutrition Specialist",
      image: "/images/trainers/Saad.jpg",
      description: "With 4 years of experience, I create customized Workout Routines & Diet Plans tailored to Individual Goals for Lasting Results.",
      instagram: "https://www.instagram.com/m_saad.222?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    },
    {
      name: "Muhammad Tayyab Zafar",
      role: "Posture Porrection & Muscle Health Specialist",
      image: "/images/trainers/Tayyab.jpg",
      description: "With over 3 years of experience, I help people fix Posture, Relieve Stiffness, Burn Fat & Build Muscle.",
      instagram: "https://www.instagram.com/tayyab___x1?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    },
    {
      name: "Muhammad Zain Ishfaq",
      role: "Muscle Building Specialist",
      image: "/images/trainers/Zain.jpg",
      description: "With 5 years of experience, I create personalized Training & Nutrition Plans to help people Build Muscle, Strength, & Maximize Performance.",
      instagram: "https://www.instagram.com/zain.hun___?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    },
  ]

  return (
    <section id="trainers" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Our{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-orange-700">
              Trainers
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Meet the expert trainers who will help you reach your fitness goals
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {trainers.map((trainer, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <Card className="bg-black/50 border-gray-800 hover:border-orange-500/50 transition-all duration-300 h-[550px]">
                <CardContent className="p-6 text-center h-full flex flex-col">
                  {/* Image Section - Fixed height */}
                  <div className="mb-6">
                    <Image
                      src={trainer.image || "/placeholder-user.jpg"}
                      alt={trainer.name}
                      width={200}
                      height={250}
                      className="rounded-lg mx-auto object-cover w-full max-w-[200px] h-[250px]"
                    />
                  </div>
                  
                  {/* Name and Role Section - Fixed height */}
                  <div className="mb-6 min-h-[80px] flex flex-col justify-center">
                    <a
                      href={trainer.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <h3 className="text-xl font-semibold mb-3 text-white hover:text-orange-400 transition-colors duration-300 cursor-pointer hover:scale-105 transform">
                        {trainer.name}
                      </h3>
                    </a>
                    <p className="text-sm text-orange-400">{trainer.role}</p>
                  </div>
                  
                  {/* Description Section - Takes remaining space */}
                  <div className="flex-1 flex items-start">
                    <p className="text-gray-400 text-sm leading-relaxed">{trainer.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
