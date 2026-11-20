import React, { useEffect, useState } from 'react'
import { BookingRow } from '../components/staff/BookingRow.jsx'
import { ReferralForm } from '../components/staff/ReferralForm.jsx'
import { statuses, dollars, write } from '../components/staff/bookingFields.js'
import { services } from '../data/services.js'
import { api } from '../lib/api.js'

export default function StaffPage() {
  const [role, setRole] = useState(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filters, setFilters] = useState({})
  const [data, setData] = useState(null)
  const [refs, setRefs] = useState([])
  const [audit, setAudit] = useState([])
  const [revision, setRevision] = useState(0)
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()
  useEffect(() => {
    api('session').then(result => setRole(result.role)).catch(() => {}).finally(() => setChecking(false))
  }, [])
  useEffect(() => {
    if (!role) return
    let current = true
    const requests = [api('admin/bookings?' + query)]
    if (role === 'owner') requests.push(api('admin/refs'), api('admin/audit'))
    Promise.all(requests).then(([result, referrers, history]) => {
      if (!current) return
      setData(result)
      setRefs(referrers || [])
      setAudit(history || [])
    }).catch(err => { if (current) setError(err.message) })
    return () => { current = false }
  }, [role, query, revision])
  async function act(work) {
    setError('')
    setNotice('')
    try {
      await work()
      setRevision(value => value + 1)
      setNotice('Saved.')
    } catch (err) { setError(err.message) }
  }
  async function login(event) {
    event.preventDefault()
    setError('')
    try {
      const password = new FormData(event.currentTarget).get('password')
      setRole((await api('login', write('POST', { password }))).role)
    } catch (err) { setError(err.message) }
  }
  const owner = role === 'owner'
  return <main className="admin">
    <div className="admin-top"><div className="wrap"><div className="admin-row"><a href="/" className="brand"><img src="/logo.png" alt="" /> Zero Pest Control</a>{role && <button className="button" onClick={async () => {
      try { await api('logout', { method: 'POST' }); setRole(null); setData(null); setNotice('') } catch (err) { setError(err.message) }
    }}>Sign out</button>}</div></div></div>
    <div className="wrap admin-content">
    {error && <p role="alert" className="error">{error}</p>}
    {notice && role && <p role="status">{notice}</p>}
    {checking ? <p role="status">Checking access…</p> : !role ?
      <form className="admin-panel admin-form login" aria-labelledby="staff-login" onSubmit={login}>
        <h1 id="staff-login">Staff access</h1><p>Sign in to manage pest control bookings.</p>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button className="button">Sign in</button>
      </form> :
      <>
        <div className="admin-heading"><h1>Booking dashboard</h1><p>Review requests, update job status, and reconcile payments.</p></div>
        <div className="admin-summary" aria-label="Filter bookings by status">
          {['', ...statuses].map(status => <button type="button" key={status} aria-pressed={(filters.status || '') === status}
            onClick={() => setFilters(previous => ({ ...previous, status }))}>{status || 'All statuses'}</button>)}
        </div>
        <section className="admin-panel">
          <div className="admin-row"><h2>Bookings</h2><a className="button" href={'/api/admin/export?' + query}>Export CSV</a></div>
          <search className="admin-filters" aria-label="Booking filters">{[['from', 'From date'], ['to', 'To date'], ['service', 'Service'], ['referral', 'Referral source']].map(([key, title]) => {
            const props = { value: filters[key] || '', onChange: e => setFilters({ ...filters, [key]: e.target.value }) }
            const options = key === 'service' ? services.map(({ title }) => [title, title]) : null
            return <label key={key}>{title}{key === 'from' || key === 'to' ? <input type="date" {...props} /> :
              <select {...props}><option value="">All</option>{(options || [['direct', 'Direct'], ...(data?.sources || []).map(source => [source.code, source.name])]).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select>}</label>
          })}</search>
          {data?.bookings.length ? <div className="table-scroll" role="region" aria-label="Booking results" tabIndex={0}><table className="booking-table" aria-label="Bookings" role="table"><thead><tr>{['Request', 'Customer', 'Referral', 'Booking and payment', ...(owner ? ['Commission'] : [])].map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody role="rowgroup">
            {data.bookings.map(row => <BookingRow key={row.reference} row={row} owner={owner} currency={data.currency} act={act} />)}
          </tbody></table></div> : <p className="empty-state">{data ? 'No bookings match these filters.' : 'Loading bookings…'}</p>}
        </section>
        {owner && data && <>
          <section className="admin-panel"><h2>Commission totals</h2><p>Totals reflect the current booking filters and preferred service dates.</p>
            <div className="table-scroll"><table><thead><tr>{['Referrer','Pending','Earned','Paid','Adjustment due'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>
              {Object.entries(data.totals).map(([code, amounts]) => <tr key={code}><td>{data.sources.find(source => source.code === code)?.name || code}</td>{Object.entries(amounts).map(([key, amount]) => <td key={key}>{dollars(amount)} {data.currency}</td>)}</tr>)}
            </tbody></table></div>
          </section>
          <section className="admin-panel"><h2>Referrals</h2><ReferralForm key={'new-' + refs.length} act={act} currency={data.currency} />
            {refs.map(item => <details key={item.code}><summary>{item.name} · {item.code}</summary><ReferralForm item={item} act={act} currency={data.currency} /></details>)}
          </section>
          <section className="admin-panel"><h2>Commission activity</h2>{audit.length ? audit.map(item => <details key={item.id}><summary>{item.action} · {item.created} UTC</summary><pre className="overflow-auto">{JSON.stringify(JSON.parse(item.detail), null, 2)}</pre></details>) : <p>No activity recorded.</p>}</section>
        </>}
      </>}
  </div></main>
}
