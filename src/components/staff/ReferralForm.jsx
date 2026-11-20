import React, { useState } from 'react'
import { api } from '../../lib/api.js'
import { dollars, cents, write } from './bookingFields.js'

export function ReferralForm({ item, act, currency }) {
  const [kind, setKind] = useState(item?.kind || 'percent')
  function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    act(() => api('admin/refs', write('POST', {
      code: item?.code, name: fields.get('name'), kind, rate: cents(fields.get('rate')),
      cap: fields.get('cap') === '' ? null : cents(fields.get('cap')), eligible: fields.has('eligible'), trigger: fields.get('trigger'),
    })))
  }
  return <form className="admin-panel" onSubmit={submit}>
    <div className="form-grid">
      <label>Name<input required name="name" maxLength="100" defaultValue={item?.name} /></label>
      <label>Commission type<select value={kind} onChange={e => setKind(e.target.value)}><option value="percent">Percentage</option><option value="flat">Flat fee</option></select></label>
      <label>{kind === 'percent' ? 'Rate (%)' : 'Flat fee ' + currency}<input name="rate" type="number" step=".01" min="0" max={kind === 'percent' ? 100 : 10000000} required defaultValue={item ? dollars(item.rate) : '0'} /></label>
      <label>Eligible job value cap {currency}<input name="cap" type="number" step=".01" min="0" max="10000000" defaultValue={item?.cap != null ? dollars(item.cap) : ''} /></label>
      <label>Earn when<select name="trigger" defaultValue={item?.trigger || 'completed-paid'}><option value="completed-paid">Completed and paid</option><option value="completed">Completed</option></select></label>
      <label className="flex items-center gap-2"><input className="!w-auto !min-h-0" name="eligible" type="checkbox" defaultChecked={item ? Boolean(item.eligible) : true} /> Eligible</label>
      {item && <label className="full">Referral link<input readOnly onFocus={e => e.target.select()} value={location.origin + '/?ref=' + item.code} /></label>}
    </div>
    <button className="button">{item ? 'Save referral rule' : 'Create referral'}</button>
  </form>
}
