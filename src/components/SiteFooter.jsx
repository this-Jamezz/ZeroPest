import React from 'react'
import { Brand } from './Brand.jsx'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer">
          <div>
            <Brand />
            <p>Zero Pest. Total Protection.</p>
          </div>
          <div className="footer-links">
            <a href="#services">Services</a>
            <a href="#about">About</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Call Us</a>
          </div>
        </div>
        <div className="footer-bottom"><small>Developed by James Ian Antonio</small></div>
      </div>
    </footer>
  )
}
