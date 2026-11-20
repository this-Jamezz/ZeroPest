import React, { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { HomePage } from './pages/HomePage.jsx'
import { InteriorPage } from './pages/InteriorPage.jsx'
import { services } from './content/services.js'
import './style.css'

const StaffPage = lazy(() => import('./pages/StaffPage.jsx'))

const referral = new URLSearchParams(location.search).get('ref')
if (referral && /^[A-Za-z0-9_-]{1,40}$/.test(referral)) {
  sessionStorage.setItem('zero-pest-ref', referral)
}

const root = createRoot(document.getElementById('root'))
const path = location.pathname.replace(/\/$/, '') || '/'
const service = services.find(item => path === '/services/' + item.image)
root.render(
  path === '/staff'
    ? <Suspense fallback={null}><StaffPage /></Suspense>
    : path === '/contact' || path.startsWith('/services/')
      ? <InteriorPage service={service} contact={path === '/contact'} />
      : <HomePage />,
)
