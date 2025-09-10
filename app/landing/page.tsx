"use client"

import type React from "react"

import { useRef } from "react"
import Navbar from "@/components/navbar"
import HeroSection from "@/components/hero-section"
import FeaturesSection from "@/components/features-section"
import MembershipsSection from "@/components/memberships-section"
import TrainersSection from "@/components/trainers-section"
import AboutSection from "@/components/about-section"
import Footer from "@/components/footer"

export default function LandingPage() {
  // Create refs for each section
  const homeRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const membershipsRef = useRef<HTMLDivElement>(null)
  const trainersRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  // Scroll to section function
  const scrollToSection = (sectionId: string) => {
    let targetRef: React.RefObject<HTMLDivElement>

    switch (sectionId) {
      case "home":
        targetRef = homeRef
        break
      case "features":
        targetRef = featuresRef
        break
      case "memberships":
        targetRef = membershipsRef
        break
      case "trainers":
        targetRef = trainersRef
        break
      case "about":
        targetRef = aboutRef
        break
      case "footer":
        targetRef = footerRef
        break
      default:
        return
    }

    if (targetRef.current) {
      targetRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  return (
    <div className="min-h-screen bg-black text-white w-full overflow-x-hidden">
      {/* 1. Navbar */}
      <Navbar scrollToSection={scrollToSection} />

      {/* 2. Hero Section */}
      <div ref={homeRef} className="w-full">
        <HeroSection scrollToSection={scrollToSection} />
      </div>

      {/* 3. Our Mission (Features Section) */}
      <div ref={featuresRef} className="w-full">
        <FeaturesSection />
      </div>

      {/* 4. Our Membership (Memberships Section) */}
      <div ref={membershipsRef} className="w-full">
        <MembershipsSection />
      </div>

      {/* 5. Our Trainers (Trainers Section) */}
      <div ref={trainersRef} className="w-full">
        <TrainersSection />
      </div>

      {/* 6. About Us (About Section) */}
      <div ref={aboutRef} className="w-full">
        <AboutSection />
      </div>

      {/* 7. Footer */}
      <div ref={footerRef} className="w-full">
        <Footer scrollToSection={scrollToSection} />
      </div>
    </div>
  )
}
