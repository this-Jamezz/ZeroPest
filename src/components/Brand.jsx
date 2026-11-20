import React from 'react'

export function Brand({ onClick, href = '#home' }) {
  return (
    <a className="brand" href={href} onClick={onClick} aria-label="Zero Pest Control home">
      <img src="/logo.png" alt="" />
      <span>ZERO<span className="brand-green"> PEST</span><small>CONTROL</small></span>
    </a>
  )
}
