"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

export default function MembershipsSection() {
  const { user } = useAuth()
  
  const plans = [
    {
      id: "oneDay",
      name: "One Day Pass",
      price: "Rs. 500",
      period: "/day",
      icon: "🎫",
      features: [
        "Complete gym access",
        "All strength equipment",
        "All cardio equipment",
        "Locker room access"
      ],
      popular: false,
      noButton: true,
    },
    {
      id: "strength",
      name: "Strength Training",
      price: "Rs. 5,000",
      period: "/month",
      icon: "💪",
      features: [
        { text: "Access to weight training area", included: true },
        { text: "Free weights and machines", included: true },
        { text: "Strength training programs", included: true },
        { text: "Expert guidance", included: true },
        { text: "Locker room access", included: true },
        { text: "Cardio equipment access", included: false },
        { text: "Treadmills, bikes, ellipticals", included: false },
        { text: "Endurance training", included: false }
      ],
      popular: false,
    },
    {
      id: "combo",
      name: "Strength + Cardio",
      price: "Rs. 7,500",
      period: "/month",
      icon: "⭐",
      features: [
        { text: "Full gym access", included: true },
        { text: "All strength equipment", included: true },
        { text: "All cardio equipment", included: true },
        { text: "Locker room access", included: true }
      ],
      popular: true,
    },
    {
      id: "cardio",
      name: "Cardio Training",
      price: "Rs. 5,000",
      period: "/month",
      icon: "💛",
      features: [
        { text: "Cardio equipment access", included: true },
        { text: "Treadmills, bikes, ellipticals", included: true },
        { text: "Endurance training", included: true },
        { text: "Locker room access", included: true },
        { text: "Access to weight training area", included: false },
        { text: "Free weights and machines", included: false },
        { text: "Strength training programs", included: false },
        { text: "Expert guidance", included: false }
      ],
      popular: false,
    },
  ]

  return (
    <section id="memberships" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Choose Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-orange-700">
              Membership
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose from our specialized training programs designed to transform your fitness journey. 
            {!user && " Sign up to access detailed plans and pricing."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <Card
                className={`relative ${plan.noButton ? '' : 'h-full flex flex-col'} ${plan.popular ? "border-orange-500 bg-orange-500/5" : plan.noButton ? "border-blue-500 bg-blue-500/5" : "border-gray-800 bg-black/50"} hover:border-orange-500/50 transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                {plan.noButton && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Walk-in
                    </span>
                  </div>
                )}
                <CardContent className={`p-8 text-center ${plan.noButton ? '' : 'flex-1 flex flex-col'}`}>
                  <div className="text-4xl mb-4">{plan.icon}</div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">{plan.name}</h3>
                  <p className="text-gray-400 mb-4 text-sm">
                    {plan.id === "oneDay" && "Perfect for visitors and trial sessions with full gym access"}
                    {plan.id === "strength" && "Build muscle and strength with our comprehensive weight training program"}
                    {plan.id === "combo" && "Complete fitness package combining strength and cardiovascular training"}
                    {plan.id === "cardio" && "Improve endurance and cardiovascular health with specialized cardio training"}
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-orange-400">{plan.price}</span>
                    <span className="text-gray-400">{plan.period}</span>
                    {plan.id !== "oneDay" && (
                      <div className="text-sm text-gray-500 mt-1">Monthly subscription</div>
                    )}
                    {plan.popular && (
                      <div className="text-sm text-orange-300 mt-2">Best Value</div>
                    )}
                    {!user && !plan.noButton && (
                      <div className="text-xs text-gray-500 mt-1">Sign up to access plans</div>
                    )}
                    {plan.noButton && (
                      <div className="text-xs text-orange-400 mt-1 font-medium">Walk-in available</div>
                    )}
                  </div>
                  <ul className={`space-y-3 mb-8 text-left ${plan.noButton ? '' : 'flex-1'}`}>
                    {plan.features.map((feature, featureIndex) => {
                      // Handle both old string format and new object format
                      if (typeof feature === 'string') {
                        return (
                          <li key={featureIndex} className="text-gray-300 flex items-center">
                            <span className="text-green-400 mr-3">✓</span>
                            {feature}
                          </li>
                        )
                      } else {
                        return (
                          <li key={featureIndex} className="text-gray-300 flex items-center">
                            <span className={`mr-3 ${feature.included ? 'text-green-400' : 'text-red-400'}`}>
                              {feature.included ? '✓' : '✕'}
                            </span>
                            <span className={feature.included ? 'text-gray-300' : 'text-gray-500'}>
                              {feature.text}
                            </span>
                          </li>
                        )
                      }
                    })}
                  </ul>
                  {!plan.noButton && (
                    <Link href={user ? "/customer/dashboard/plan" : "/signup"}>
                      <Button
                        className={`w-full ${plan.popular ? "bg-gradient-to-r from-orange-600 via-orange-600 to-orange-400 hover:from-orange-700 hover:via-orange-600 hover:to-orange-500" : "bg-gray-800 hover:bg-gray-700"} transition-all duration-300`}
                      >
                        Join Now
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
