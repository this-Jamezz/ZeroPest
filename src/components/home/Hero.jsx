import React, { useEffect, useRef, useState } from 'react'
import { Phone, ShieldCheck } from 'lucide-react'

const photos = [
  '/work/exterior-wall.webp',
  '/work/under-sink.webp',
  '/work/cabinet-inspection.webp',
  '/work/garden-perimeter.webp',
]
const slideDuration = 6500

export function Hero() {
  const hero = useRef(null)
  const [index, setIndex] = useState(0)
  const [allowsMotion, setAllowsMotion] = useState(() => matchMedia('(prefers-reduced-motion: no-preference)').matches)
  const [visible, setVisible] = useState(false)
  const rotating = allowsMotion && visible

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.intersectionRatio >= .25), { threshold: .25 })
    observer.observe(hero.current)
    const preference = matchMedia('(prefers-reduced-motion: no-preference)')
    const update = event => setAllowsMotion(event.matches)
    preference.addEventListener('change', update)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (!rotating) return
    const timer = setInterval(() => {
      if (!document.hidden) setIndex(current => (current + 1) % photos.length)
    }, slideDuration)
    return () => clearInterval(timer)
  }, [rotating])

  return <section id="home" className="hero" ref={hero} data-rotating={rotating} tabIndex={-1}
    style={{ '--hero-slide-duration': slideDuration + 'ms' }}>
    <div className="hero-media" aria-hidden="true">
      {photos.map((src, position) => <img key={src} src={src} alt="" data-active={index === position}
        fetchPriority={position === 0 ? 'high' : 'low'} loading={position === 0 ? undefined : 'lazy'} />)}
    </div>
    <div className="wrap hero-inner">
      <div className="hero-copy">
        <span className="eyebrow"><ShieldCheck size={17} aria-hidden="true" /> ZERO PEST. TOTAL PROTECTION.</span>
        <h1>Pests out.<br /><em>Peace of mind.</em></h1>
        <p>Pest inspections and treatment for homes and businesses, from termites in the walls to mosquitoes around the yard.</p>
        <div className="hero-actions">
          <a className="button lime" href="#contact"><Phone size={19} aria-hidden="true" /> Call Us</a>
          <a className="hero-link" href="#services">Explore services</a>
        </div>
      </div>
    </div>
  </section>
}
