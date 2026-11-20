import React, { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { HomePage } from './pages/HomePage.jsx'
import './style.css'

const StaffPage = lazy(() => import('./pages/StaffPage.jsx'))

const referral = new URLSearchParams(location.search).get('ref')
if (referral && /^[A-Za-z0-9_-]{1,40}$/.test(referral)) {
  sessionStorage.setItem('zero-pest-ref', referral)
}

const root = createRoot(document.getElementById('root'))
root.render(
  location.pathname === '/staff'
    ? <Suspense fallback={null}><StaffPage /></Suspense>
    : <HomePage />,
)
