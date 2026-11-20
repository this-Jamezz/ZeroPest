import React from 'react'
import { api } from '../../lib/api.js'
import { statuses, dollars, cents, write } from './bookingFields.js'

export function BookingRow({ row, owner, currency, act }) {
  const totals = row.commission
  function save(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    act(() => api('admin/bookings/' + row.reference, write('PATCH', {
      status: fields.get('status'), value: cents(fields.get('value')), refund: cents(fields.get('refund')), paid: fields.has('paid'),
    })))
  }
  return <tr>
    <th scope="row"><strong>{row.reference}</strong><div>{row.service}</div><div>{row.date} · {row.time}</div></th>
    <td data-label="Customer"><strong>{row.name}</strong><div>{row.contact}</div><div>{row.address}</div>{row.notes && <p>{row.notes}</p>}</td>
    <td data-label="Referral">{row.referral || 'Direct'}</td>
    <td data-label="Booking and payment">
      <span className="status" data-status={row.status}>{row.status}</span>
      <div>{dollars(row.value)} {currency} · {row.paid ? 'Paid' : 'Unpaid'}</div>
      <details><summary>Edit booking</summary><form className="admin-form" aria-label={'Edit booking ' + row.reference} onSubmit={save}>
      <label>Status<select name="status" defaultValue={row.status}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label>
      <label>Job value {currency}<input type="number" name="value" min="0" max="10000000" step=".01" required defaultValue={dollars(row.value)} /></label>
      <label>Refund {currency}<input type="number" name="refund" min="0" max="10000000" step=".01" required defaultValue={dollars(row.refund)} /></label>
      <label className="flex items-center gap-2"><input className="!w-auto !min-w-0 !min-h-0" type="checkbox" name="paid" defaultChecked={Boolean(row.paid)} /> Job paid</label>
      <button className="button">Save booking</button>
    </form></details></td>
    {owner && <td data-label="Commission">{row.referral ? <>
      {Object.entries(totals).map(([name, amount]) => <div className="capitalize" key={name}>{name}: {dollars(amount)} {currency}</div>)}
      {totals.earned > 0 && <button className="button mt-2" onClick={() => {
        if (window.confirm('Record this commission as already paid?')) act(() => api('admin/bookings/' + row.reference + '/payout', write('POST', { expectedPaid: totals.paid, amount: totals.earned })))
      }}>Record payout</button>}
    </> : '—'}</td>}
  </tr>
}
