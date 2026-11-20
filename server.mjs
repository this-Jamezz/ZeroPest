import express from 'express'
import { DatabaseSync } from 'node:sqlite'
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import nodemailer from 'nodemailer'

const app = express()
const services = ['Termite Control', 'Rodent Control', 'Mosquito Control', 'Cockroach Control']
const statuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled']
const directory = process.env.DATA_DIR || 'data'
mkdirSync(directory, { recursive: true })
const db = new DatabaseSync(resolve(directory, 'bookings.sqlite'))
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS referrers (
    code TEXT PRIMARY KEY, name TEXT NOT NULL, eligible INTEGER NOT NULL,
    kind TEXT NOT NULL, rate INTEGER NOT NULL, cap INTEGER, trigger TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bookings (
    reference TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL,
    service TEXT NOT NULL, name TEXT NOT NULL, contact TEXT NOT NULL, address TEXT NOT NULL,
    date TEXT NOT NULL, time TEXT NOT NULL, notes TEXT NOT NULL, referral TEXT REFERENCES referrers(code),
    rule TEXT, status TEXT NOT NULL DEFAULT 'Pending', value INTEGER NOT NULL DEFAULT 0,
    refund INTEGER NOT NULL DEFAULT 0, paid INTEGER NOT NULL DEFAULT 0,
    payout INTEGER NOT NULL DEFAULT 0, commission_amount INTEGER NOT NULL DEFAULT 0,
    created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, action TEXT, detail TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS mail_queue (
    reference TEXT REFERENCES bookings(reference), kind TEXT, recipient TEXT,
    sent INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(reference, kind)
  );
`)
const find = reference => db.prepare('SELECT * FROM bookings WHERE reference = ?').get(reference)
const referrer = code => db.prepare('SELECT * FROM referrers WHERE code = ?').get(code)
const audit = (action, detail) => db.prepare('INSERT INTO audit(action, detail) VALUES (?, ?)').run(action, JSON.stringify(detail))
function transaction(work) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
const mailer = process.env.SMTP_URL && nodemailer.createTransport(process.env.SMTP_URL)
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
let mailing = false
async function sendQueuedMail() {
  if (mailing || !mailer || !process.env.MAIL_FROM) return
  mailing = true
  try {
    for (const item of db.prepare('SELECT * FROM mail_queue WHERE sent = 0 ORDER BY rowid LIMIT 50').all()) {
      const booking = find(item.reference)
      const owner = item.kind === 'owner'
      try {
        await mailer.sendMail({
          from: process.env.MAIL_FROM, to: item.recipient,
          subject: (owner ? 'New booking ' : 'Booking request received ') + booking.reference,
          text: owner ? 'A new ' + booking.service + ' request is available in the staff dashboard. Reference: ' + booking.reference :
            'We received your request for ' + booking.service + ' on ' + booking.date + ' at ' + booking.time +
            '. Your appointment is pending staff confirmation. Reference: ' + booking.reference + '.',
        })
        db.prepare('UPDATE mail_queue SET sent = 1 WHERE reference = ? AND kind = ?').run(item.reference, item.kind)
      } catch (error) { console.error('Booking notification could not be sent:', item.kind, item.reference, error.code || 'SMTP error') }
    }
  } finally { mailing = false }
}
setInterval(sendQueuedMail, 60_000).unref()

app.disable('x-powered-by')
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)
app.use('/api', express.json({ limit: '12kb' }), (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  const origin = req.get('origin')
  if (origin && origin !== req.protocol + '://' + req.get('host')) return res.status(403).json({ error: 'Request origin is not allowed.' })
  next()
})
const sessions = new Map()
const loginAttempts = new Map()
const cookieName = 'zp_session'
function sessionToken(req) {
  return (req.headers.cookie || '').match(/(?:^|;\s*)zp_session=([0-9a-f]{64})(?:;|$)/)?.[1]
}
function requireAuth(req, res, next) {
  const token = sessionToken(req)
  const session = sessions.get(token)
  if (!session || session.expires < Date.now()) {
    sessions.delete(token)
    return res.status(401).json({ error: 'Sign in to continue.' })
  }
  req.role = session.role
  next()
}
function ownerOnly(req, res, next) {
  if (req.role !== 'owner') return res.status(403).json({ error: 'Owner access required.' })
  next()
}
function passwordMatches(input, expected) {
  const digest = value => createHash('sha256').update(value).digest()
  return typeof input === 'string' && Boolean(expected) && timingSafeEqual(digest(input), digest(expected))
}
app.post('/api/login', (req, res) => {
  const now = Date.now()
  const attempts = loginAttempts.get(req.ip)
  if (attempts?.until > now && attempts.count >= 8) return res.status(429).json({ error: 'Try again in 10 minutes.' })
  const { password } = req.body || {}
  const role = passwordMatches(password, process.env.OWNER_PASSWORD) ? 'owner' : passwordMatches(password, process.env.STAFF_PASSWORD) ? 'staff' : null
  if (!role) {
    loginAttempts.set(req.ip, attempts?.until > now ? { ...attempts, count: attempts.count + 1 } : { count: 1, until: now + 600_000 })
    return res.status(401).json({ error: 'Password incorrect or staff access is unavailable.' })
  }
  loginAttempts.delete(req.ip)
  sessions.delete(sessionToken(req))
  const token = randomBytes(32).toString('hex')
  sessions.set(token, { role, expires: now + 28_800_000 })
  res.cookie(cookieName, token, { httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: 28_800_000 }).json({ role })
})
app.get('/api/session', requireAuth, (req, res) => res.json({ role: req.role }))
app.post('/api/logout', requireAuth, (req, res) => {
  sessions.delete(sessionToken(req))
  res.clearCookie(cookieName).json({ ok: true })
})
setInterval(() => {
  for (const [key, item] of loginAttempts) if (item.until < Date.now()) loginAttempts.delete(key)
  for (const [key, item] of sessions) if (item.expires < Date.now()) sessions.delete(key)
}, 600_000).unref()

app.post('/api/bookings', (req, res) => {
  const body = req.body || {}
  const fields = Object.fromEntries(['service', 'name', 'contact', 'address', 'date', 'time', 'notes', 'referral'].map(key => [key, typeof body[key] === 'string' ? body[key].trim() : '']))
  const { service, name, contact, address, date, time, notes, referral } = fields
  if (typeof body.key !== 'string' || !/^[a-f0-9-]{36}$/.test(body.key)) return res.status(400).json({ error: 'Invalid request identifier.' })
  const fingerprint = createHash('sha256').update(JSON.stringify(fields)).digest('hex')
  const existing = db.prepare('SELECT reference, fingerprint FROM bookings WHERE request_key = ?').get(body.key)
  if (existing) {
    if (existing.fingerprint !== fingerprint) return res.status(409).json({ error: 'This request was already received as ' + existing.reference + '. Restore the original values to retrieve the confirmation.' })
    return res.json({ reference: existing.reference, status: 'Pending' })
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', dateStyle: 'short' }).format(new Date())
  const parsedDate = Date.parse(date + 'T00:00:00Z')
  const phone = /^[+\d().\s-]+$/.test(contact) && contact.replace(/\D/g, '').length >= 7 && contact.replace(/\D/g, '').length <= 15
  if (!services.includes(service) || !name || name.length > 120 || !address || address.length > 300 || contact.length > 120 ||
      !(emailPattern.test(contact) || phone) || notes.length > 1000 || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsedDate) || new Date(parsedDate).toISOString().slice(0, 10) !== date || date < today ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return res.status(400).json({ error: 'Check your contact details and enter a valid preferred schedule and service address.' })
  }
  const reference = 'ZP-' + randomUUID().split('-').slice(0, 2).join('').toUpperCase()
  transaction(() => {
    const ref = referrer(referral)
    const rule = ref ? JSON.stringify(ref) : null
    db.prepare('INSERT INTO bookings(reference, request_key, fingerprint, service, name, contact, address, date, time, notes, referral, rule) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(reference, body.key, fingerprint, service, name, contact, address, date, time, notes, ref?.code ?? null, rule)
    const queue = db.prepare('INSERT INTO mail_queue(reference, kind, recipient) VALUES (?, ?, ?)')
    if (emailPattern.test(contact)) queue.run(reference, 'customer', contact)
    if (process.env.OWNER_EMAIL) queue.run(reference, 'owner', process.env.OWNER_EMAIL)
  })
  res.status(201).json({ reference, status: 'Pending' })
  void sendQueuedMail()
})
app.use('/api/admin', requireAuth)

function commissionAmount(booking, rule) {
  const eligible = Math.min(Math.max(0, booking.value - booking.refund), rule?.cap ?? Infinity)
  return rule?.eligible && eligible && booking.status !== 'Cancelled'
    ? (rule.kind === 'flat' ? rule.rate : Math.round(eligible * rule.rate / 10000)) : 0
}
function commission(booking) {
  const rule = JSON.parse(booking.rule)
  const amount = booking.commission_amount
  const earned = booking.status === 'Completed' && (booking.paid || rule?.trigger === 'completed')
  return { pending: earned ? 0 : amount, earned: earned ? Math.max(0, amount - booking.payout) : 0,
    paid: booking.payout, adjustment: Math.max(0, booking.payout - (earned ? amount : 0)) }
}
function filtered(query) {
  const filters = [['from', 'date >= ?'], ['to', 'date <= ?'], ['service', 'service = ?'], ['status', 'status = ?'], ['referral', 'COALESCE(referral, \'direct\') = ?']]
    .filter(([key]) => typeof query[key] === 'string' && query[key])
  const where = filters.length ? ' WHERE ' + filters.map(([, sql]) => sql).join(' AND ') : ''
  return db.prepare('SELECT * FROM bookings' + where + ' ORDER BY created DESC').all(...filters.map(([key]) => query[key]))
}
app.get('/api/admin/bookings', (req, res) => {
  const rows = filtered(req.query)
  const totals = Object.create(null)
  if (req.role === 'owner') {
    for (const row of rows.filter(row => row.referral)) {
      const values = commission(row)
      totals[row.referral] ??= { pending: 0, earned: 0, paid: 0, adjustment: 0 }
      for (const key of Object.keys(values)) totals[row.referral][key] += values[key]
    }
  }
  res.json({ bookings: rows.map(({ request_key, fingerprint, rule, payout, commission_amount, ...row }) => req.role === 'owner' ? { ...row, commission: commission({ ...row, rule, payout, commission_amount }) } : row),
    sources: db.prepare('SELECT code, name FROM referrers ORDER BY name').all(), totals, currency: process.env.BUSINESS_CURRENCY || '' })
})
const validMoney = amount => Number.isSafeInteger(amount) && amount >= 0 && amount <= 1_000_000_000
app.patch('/api/admin/bookings/:reference', (req, res) => {
  const body = req.body || {}
  const booking = find(req.params.reference)
  if (!booking) return res.status(404).json({ error: 'Booking not found.' })
  if (!statuses.includes(body.status) || !validMoney(body.value) || !validMoney(body.refund) || body.refund > body.value || typeof body.paid !== 'boolean') {
    return res.status(400).json({ error: 'Enter valid amounts, payment and booking status.' })
  }
  const amount = commissionAmount(body, JSON.parse(booking.rule))
  db.prepare('UPDATE bookings SET status = ?, value = ?, refund = ?, paid = ?, commission_amount = ? WHERE reference = ?')
    .run(body.status, body.value, body.refund, Number(body.paid), amount, booking.reference)
  res.json({ ok: true })
})
app.post('/api/admin/bookings/:reference/payout', ownerOnly, (req, res) => {
  const booking = find(req.params.reference)
  const amount = booking && commission(booking).earned
  if (!amount || req.body?.expectedPaid !== booking.payout || req.body?.amount !== amount) return res.status(409).json({ error: 'The payable amount has changed. Refresh before recording a payout.' })
  transaction(() => {
    db.prepare('UPDATE bookings SET payout = payout + ? WHERE reference = ?').run(amount, booking.reference)
    audit('Payout recorded', { reference: booking.reference, amount, referral: booking.referral })
  })
  res.json({ ok: true })
})
app.get('/api/admin/refs', ownerOnly, (req, res) => res.json(db.prepare('SELECT * FROM referrers ORDER BY name').all()))
app.post('/api/admin/refs', ownerOnly, (req, res) => {
  const { code, name, kind, rate, cap, eligible, trigger } = req.body || {}
  if (typeof name !== 'string' || !name.trim() || name.length > 100 || !['flat', 'percent'].includes(kind) ||
      !validMoney(rate) || (kind === 'percent' && rate > 10000) || (cap !== null && !validMoney(cap)) ||
      typeof eligible !== 'boolean' || !['completed', 'completed-paid'].includes(trigger) ||
      (code && (typeof code !== 'string' || !referrer(code)))) {
    return res.status(400).json({ error: 'Enter a name and valid commission rule.' })
  }
  const id = code || randomBytes(7).toString('hex')
  transaction(() => {
    const old = referrer(id)
    db.prepare('INSERT INTO referrers VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET name=excluded.name, eligible=excluded.eligible, kind=excluded.kind, rate=excluded.rate, cap=excluded.cap, trigger=excluded.trigger')
      .run(id, name.trim(), Number(eligible), kind, rate, cap, trigger)
    audit(old ? 'Referral rule changed' : 'Referral created', { code: id, previous: old, current: referrer(id) })
  })
  res.json({ code: id })
})
app.get('/api/admin/audit', ownerOnly, (req, res) => res.json(db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 100').all()))
app.get('/api/admin/export', (req, res) => {
  const quote = value => {
    const string = String(value ?? '')
    return '"' + (/^[\s]*[=+@-]|^[\t\r\n]/.test(string) ? "'" : '') + string.replaceAll('"', '""') + '"'
  }
  const cols = ['reference', 'name', 'contact', 'address', 'service', 'date', 'time', 'referral', 'status', 'value', 'refund', 'paid']
  const extra = req.role === 'owner' ? ['pending', 'earned', 'paid_commission', 'adjustment'] : []
  const csv = filtered(req.query).map(row => {
    const amounts = req.role === 'owner' ? Object.values(commission(row)).map(amount => (amount / 100).toFixed(2)) : []
    return [...cols.map(key => ['value', 'refund'].includes(key) ? (row[key] / 100).toFixed(2) : row[key]), ...amounts].map(quote).join(',')
  })
  res.attachment('zero-pest-bookings.csv').type('text/csv').send([[...cols, ...extra].join(','), ...csv].join('\r\n'))
})
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }))
if (process.argv.includes('--dev')) {
  const { createServer } = await import('vite')
  app.use((req, res, next) => {
    const path = decodeURIComponent(req.path).replaceAll('\\', '/')
    if (/(?:^|\/)(?:\.env[^/]*|data(?:-verify-[^/]*)?)(?:\/|$)|\.sqlite(?:$|[-/])/i.test(path)) return res.sendStatus(404)
    next()
  })
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'spa' })
  app.use(vite.middlewares)
} else {
  app.use(express.static('dist'))
  app.get(['/', '/staff'], (req, res) => res.sendFile(resolve('dist/index.html')))
}
app.use((error, req, res, next) => {
  console.error(error.message)
  res.status(error.status || 500).json({ error: error.status === 400 ? 'Invalid request.' : 'Unable to process the request.' })
})
const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 5173)
app.listen(port, host, () => console.log('Zero Pest Control running at http://' + host + ':' + port))

