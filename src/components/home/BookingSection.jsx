import React, { useState } from 'react'
import { ShieldCheck, CalendarDays, Clock3 } from 'lucide-react'
import { services } from '../../content/services.js'
import { api } from '../../lib/api.js'

const bookingDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  dateStyle: 'short',
})

export function BookingSection() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [key, setKey] = useState(() => sessionStorage.getItem('zero-pest-booking') || crypto.randomUUID())

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    sessionStorage.setItem('zero-pest-booking', key)
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget))
      const referral = sessionStorage.getItem('zero-pest-ref')
      const booking = await api('bookings', {
        method: 'POST',
        body: JSON.stringify({ ...fields, key, referral }),
      })
      setResult(booking)
      sessionStorage.removeItem('zero-pest-booking')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function resetBooking() {
    setResult(null)
    setKey(crypto.randomUUID())
  }

  const minDate = bookingDateFormat.format(new Date())

  return (
    <section id="book" className="section book" tabIndex={-1}>
      <div className="wrap book-grid">
        <div className="book-intro">
          <span className="eyebrow"><CalendarDays size={16} aria-hidden="true" /> REQUEST A VISIT</span>
          <h2 id="booking-heading">Let’s get your pest problem handled.</h2>
          <p>Tell us what you’re dealing with and choose a preferred schedule.</p>
          <p className="booking-note">
            <Clock3 size={20} aria-hidden="true" /> The team will confirm availability with you.
          </p>
        </div>
        {result ? (
          <div className="form-panel" role="status">
            <ShieldCheck />
            <h3>Request received</h3>
            <p>Reference <strong>{result.reference}</strong></p>
            <p>Your appointment is pending staff confirmation.</p>
            <button className="button" onClick={resetBooking}>Make another request</button>
          </div>
        ) : (
          <form className="form-panel" aria-labelledby="booking-heading" onSubmit={submit}>
            <h3>Request pest control</h3>
            <p className="form-hint">All fields are required unless marked optional.</p>
            <div className="form-grid">
              <div className="full form-field">
                <label htmlFor="booking-service">Service</label>
                <select id="booking-service" name="service" required defaultValue="">
                  <option value="">Select a service</option>
                  {services.map(({ title }) => <option key={title}>{title}</option>)}
                </select>
              </div>
              <label>
                Full name
                <input name="name" required maxLength={120} autoComplete="name" />
              </label>
              <label>
                Phone or email
                <input name="contact" required maxLength={120} autoCapitalize="none" spellCheck={false} />
              </label>
              <label className="full">
                Service address
                <input name="address" required maxLength={300} autoComplete="street-address" />
              </label>
              <label>
                Preferred date
                <input name="date" type="date" min={minDate} required />
              </label>
              <label>
                Preferred time (Philippine time)
                <input name="time" type="time" required />
              </label>
              <label className="full">
                Notes (optional)
                <textarea name="notes" rows="3" maxLength={1000} />
              </label>
            </div>
            {error && <p role="alert" className="error">{error}</p>}
            <button className="button" disabled={busy}>{busy ? 'Submitting…' : 'Request booking'}</button>
          </form>
        )}
      </div>
    </section>
  )
}
