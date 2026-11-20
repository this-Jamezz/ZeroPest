import React, { useLayoutEffect } from 'react'
import { SiteHeader } from '../components/SiteHeader.jsx'
import { SiteFooter } from '../components/SiteFooter.jsx'
import { Hero } from '../components/home/Hero.jsx'
import { ServicesSection } from '../components/home/ServicesSection.jsx'
import { AboutSection } from '../components/home/AboutSection.jsx'
import { FaqSection } from '../components/home/FaqSection.jsx'
import { BookingSection } from '../components/home/BookingSection.jsx'
import { ContactSection } from '../components/home/ContactSection.jsx'

export function HomePage() {
  useLayoutEffect(() => {
    // Fragment targets become available after React renders the page.
    const target = document.getElementById(location.hash.slice(1))
    target?.scrollIntoView({ behavior: 'instant' })
  }, [])

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ServicesSection />
        <AboutSection />
        <FaqSection />
        <BookingSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  )
}
