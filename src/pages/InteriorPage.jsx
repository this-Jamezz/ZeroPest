import React, { useEffect } from 'react'
import { Phone } from 'lucide-react'
import { SiteHeader } from '../components/SiteHeader.jsx'
import { SiteFooter } from '../components/SiteFooter.jsx'
import { ContactSection } from '../components/home/ContactSection.jsx'

export function InteriorPage({ service, contact = false }) {
  useEffect(() => {
    document.title = (contact ? 'Contact' : service?.title || 'Service not found') + ' | Zero Pest Control'
  }, [contact, service])

  return <>
    <SiteHeader interior />
    <main>
      {contact ? <ContactSection standalone /> : service ? <ServiceDetails service={service} /> :
        <section className="section wrap">
          <h1>Service not found</h1>
          <a className="button" href="/#services">Browse services</a>
        </section>}
    </main>
    <SiteFooter interior />
  </>
}

function ServiceDetails({ service }) {
  return <article className="section service-page">
    <div className="wrap">
      <a className="service-back" href="/#services">All pest control services</a>
      <div className="service-intro">
        <div>
          <h1>{service.title}</h1>
          <p>{service.description}</p>
          <a className="button" href="/contact"><Phone size={18} aria-hidden="true" /> Call Us</a>
        </div>
        <figure>
          <img src={`/services/${service.image}.jpg`} alt={service.alt} fetchPriority="high" />
          <figcaption>AI-generated service illustration</figcaption>
        </figure>
      </div>
      <section className="service-process" aria-labelledby="process-heading">
        <h2 id="process-heading">What to expect</h2>
        <p>The team will recommend a plan based on what they find during the inspection.</p>
        <div className="service-process-grid">
          <ol>
            {service.details.map((detail, index) => <li key={detail}>
              <h3>{['Inspect the property', 'Recommend a plan', 'Discuss prevention'][index]}</h3>
              <p>{detail}</p>
            </li>)}
          </ol>
          <figure>
            <img src={`/services/${service.image}-inspection.webp`} alt={service.inspectionAlt} loading="lazy" decoding="async" />
            <figcaption>AI-generated inspection illustration</figcaption>
          </figure>
        </div>
      </section>
    </div>
  </article>
}
