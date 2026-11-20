import React from 'react'

export function AboutSection() {
  return (
    <section className="section" id="about" aria-labelledby="about-heading" tabIndex={-1}>
      <div className="wrap">
        <h2 id="about-heading">About Zero Pest Control Services PH</h2>
        <div className="about-grid">
          <div>
            <h3>Mission</h3>
            <p>To help households and businesses protect their spaces through reliable pest control and practical guidance on preventing recurring infestations.</p>
          </div>
          <div>
            <h3>Vision</h3>
            <p>To become a trusted pest control provider for homes and businesses in Guiguinto and across Bulacan.</p>
          </div>
          <div>
            <h3>Our Promise</h3>
            <p>We’ll explain what we find, walk you through the recommended treatment, and share practical steps you can take to help prevent pests from returning.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
