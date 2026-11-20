import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { once } from 'node:events'
import { resolve } from 'node:path'

const directory = mkdtempSync(resolve('data-verify-'))
const ownerPassword = randomUUID()
const staffPassword = randomUUID()
const port = process.env.TEST_PORT || '5174'
const url = 'http://127.0.0.1:' + port
const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: port, DATA_DIR: directory, OWNER_PASSWORD: ownerPassword,
    STAFF_PASSWORD: staffPassword, SMTP_URL: '', OWNER_EMAIL: '' },
  stdio: ['ignore', 'pipe', 'inherit'],
})
async function api(path, expected, { cookie, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (cookie) headers.Cookie = cookie
  const response = await fetch(url + '/api/' + path, { method, headers, body: body && JSON.stringify(body) })
  assert.equal(response.status, expected, await response.clone().text())
  return response
}
async function login(password) {
  const response = await api('login', 200, { method: 'POST', body: { password } })
  return response.headers.get('set-cookie').split(';')[0]
}
try {
  await Promise.race([once(server.stdout, 'data'), once(server, 'exit').then(([code]) => { throw new Error('Server exited: ' + code) })])
  for (const path of ['/', '/staff', '/logo.png', '/hero.webp']) assert.equal((await fetch(url + path)).status, 200)
  await api('admin/bookings', 401)
  await api('admin/export', 401)
  const owner = await login(ownerPassword)
  const staff = await login(staffPassword)
  await api('admin/refs', 403, { cookie: staff })
  const { code } = await (await api('admin/refs', 200, { cookie: owner, method: 'POST',
    body: { name: 'Test referrer', kind: 'percent', rate: 1000, cap: null, eligible: true, trigger: 'completed-paid' } })).json()
  const details = { service: 'Termite Control', name: 'Test customer', contact: 'customer@example.test', address: 'Test address',
    date: new Date(Date.now() + 172800000).toISOString().slice(0, 10), time: '10:00' }
  const referred = { ...details, key: randomUUID(), referral: code }
  const post = async (body, status) => (await api('bookings', status, { method: 'POST', body })).json()
  const request = await post(referred, 201)
  assert.equal(request.status, 'Pending')
  assert.deepEqual(await post(referred, 200), request)
  const direct = await post({ ...details, key: randomUUID() }, 201)
  const list = async cookie => (await api('admin/bookings', 200, { cookie })).json()
  const { bookings } = await list(owner)
  assert.equal(bookings.length, 2)
  assert.equal(bookings.find(row => row.reference === request.reference).referral, code)
  assert.equal(bookings.find(row => row.reference === direct.reference).referral, null)
  assert.ok((await list(staff)).bookings.every(row => !('commission' in row)))
  const path = 'admin/bookings/' + request.reference
  const update = (status, paid, refund) => api(path, 200, { cookie: staff, method: 'PATCH', body: { status, paid, refund, value: 20000 } })
  const totals = async () => (await list(owner)).totals[code]
  await update('Completed', false, 0)
  assert.equal((await totals()).pending, 2000)
  await update('Completed', true, 0)
  assert.equal((await totals()).earned, 2000)
  const payout = expected => api(path + '/payout', expected, { cookie: owner, method: 'POST', body: { expectedPaid: 0, amount: 2000 } })
  await payout(200)
  await payout(409)
  assert.equal((await totals()).paid, 2000)
  await update('Completed', true, 10000)
  assert.equal((await totals()).adjustment, 1000)
  await update('Cancelled', true, 10000)
  assert.equal((await totals()).adjustment, 2000)
  const csv = await (await api('admin/export?referral=' + code, 200, { cookie: owner })).text()
  assert.ok(csv.includes(request.reference) && !csv.includes(direct.reference))
  assert.equal((await (await api('admin/audit', 200, { cookie: owner })).json()).length, 2)
  console.log('Verified bookings, retries, referrals, access, CSV, commissions, payouts and refund reconciliation.')
} finally {
  if (server.exitCode === null) {
    const exited = once(server, 'exit')
    server.kill()
    await exited
  }
  if (!directory.startsWith(resolve('data-verify-'))) throw new Error('Unexpected temporary directory')
  rmSync(directory, { recursive: true, force: true })
}
