import React from 'react'
import { ChevronDown } from 'lucide-react'
import { faq } from '../../content/faq.js'

export function FaqSection() {
  return (
    <section className="section" id="faq" tabIndex={-1}>
      <div className="wrap faq-grid">
        <div>
          <h2>Frequently asked questions</h2>
          <p>What to know before you request a visit.</p>
        </div>
        <div>
          {faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<ChevronDown size={18} /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
