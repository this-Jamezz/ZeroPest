import React from 'react'

export function Brand({ onClick }) {
  return (
    <a className="brand" href="#home" onClick={onClick} aria-label="Zero Pest Control home">
      <img src="/logo.png" alt="" />
      <span>ZERO<span className="brand-green"> PEST</span><small>CONTROL</small></span>
    </a>
  )
}
