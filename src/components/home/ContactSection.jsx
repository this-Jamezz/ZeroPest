import React from 'react'
import { Phone, Mail, Facebook, MapPin } from 'lucide-react'

const contactMethods = [
  [Phone, 'Call', '0994-328-1258', 'tel:+639943281258'],
  [Phone, 'Call', '0998-414-4260', 'tel:+639984144260'],
  [Mail, 'Email', 'zeropestcontrolservicesph@gmail.com', 'mailto:zeropestcontrolservicesph@gmail.com'],
  [Facebook, 'Visit Facebook', 'Zero Pest Control Services PH', 'https://www.facebook.com/profile.php?id=61589783228518'],
  [MapPin, 'Get Directions', 'New York Lane, North Bel-Air, Malis, Guiguinto, Bulacan 3015', 'https://www.bing.com/maps/default.aspx?where1=New%20York%20Lane%2C%20North%20Bel-Air%2C%20Malis%2C%20Guiguinto%2C%20Bulacan%203015'],
]

export function ContactSection({ standalone = false }) {
  const Heading = standalone ? 'h1' : 'h2'
  return (
    <section id="contact" className="section contact" aria-labelledby="contact-heading" tabIndex={-1}>
      <div className="wrap">
        <Heading id="contact-heading">Contact Zero Pest Control</Heading>
        <ul className="contact-grid">
          {contactMethods.map(([Icon, label, value, href]) => (
            <li key={href}>
              <a className="contact-link" href={href}>
                <Icon size={21} aria-hidden="true" />
                <span>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
