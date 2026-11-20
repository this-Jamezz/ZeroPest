import React from 'react'
import { services } from '../../content/services.js'

export function ServicesSection() {
  return (
    <section className="section services" id="services" tabIndex={-1}>
      <div className="wrap">
        <div className="section-head">
          <h2>Pest control services</h2>
          <p>Choose a service based on the pest you’re seeing.</p>
        </div>
        <div className="service-grid">
          {services.map(({ title, description, image, alt }) => (
            <article className="service" key={title}>
              <h3>{title}</h3>
              <img
                className="service-art"
                src={`/services/${image}.jpg`}
                alt={alt}
                width="800"
                height="600"
                loading="lazy"
                decoding="async"
              />
              <p>{description}</p>
              <a className="service-details" href={`/services/${image}`} aria-label={`Service details for ${title}`}>
                Service details
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
