import React from 'react'
import { Brand } from './Brand.jsx'

export function SiteFooter({ interior = false }) {
  const home = interior ? '/' : ''
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer">
          <div>
            <Brand href={home + '#home'} />
            <p>Zero Pest. Total Protection.</p>
          </div>
          <div className="footer-links">
            <a href={home + '#services'}>Services</a>
            <a href={home + '#about'}>About</a>
            <a href={home + '#faq'}>FAQ</a>
            <a href="/contact">Contact page</a>
          </div>
        </div>
        <div className="footer-bottom"><small>Developed by James Ian Antonio</small></div>
      </div>
    </footer>
  )
}
