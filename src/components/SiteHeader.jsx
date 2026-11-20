import React, { useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { Brand } from './Brand.jsx'

const links = [['Home', '#home'], ['Services', '#services'], ['About', '#about'], ['FAQ', '#faq'], ['Request a Visit', '#book'], ['Contact', '#contact']]
const compactNavigation = '(max-width: 53rem)'

export function SiteHeader() {
  const [compact, setCompact] = useState(() => matchMedia(compactNavigation).matches)
  const [expanded, setExpanded] = useState(false)
  const [active, setActive] = useState('#home')
  const [atTop, setAtTop] = useState(() => window.scrollY < 12)
  const header = useRef(null)
  const list = useRef(null)
  const nativePopover = 'popover' in HTMLElement.prototype
  useEffect(() => {
    const media = matchMedia(compactNavigation)
    const update = () => { setCompact(media.matches); setExpanded(false) }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const sections = links.map(([, href]) => document.getElementById(href.slice(1)))
    const page = document.documentElement
    let frame = 0
    function update() {
      frame = 0
      setAtTop(window.scrollY < 12)
      if (window.scrollY > 0 && window.scrollY + page.clientHeight >= page.scrollHeight - 2) {
        setActive('#contact')
        return
      }
      // Include the anchor's breathing room below the sticky header.
      const marker = parseFloat(getComputedStyle(page).scrollPaddingBlockStart) + 2
      const current = sections.findLast(section => section.getBoundingClientRect().top <= marker)
      setActive(current ? `#${current.id}` : '#home')
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const resize = new ResizeObserver(schedule)
    resize.observe(header.current)
    resize.observe(document.querySelector('main'))
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      resize.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])
  function dismiss() {
    if (compact && nativePopover) list.current.hidePopover()
    setExpanded(false)
  }
  return <header ref={header} className="header" data-at-top={atTop}>
    <div className="wrap nav">
      <Brand onClick={dismiss} />
      <nav className="site-nav" aria-label="Main navigation">
        {compact && <button type="button" className="menu" aria-controls="site-menu"
          popoverTarget={nativePopover ? 'site-menu' : undefined}
          aria-expanded={nativePopover ? undefined : expanded}
          onClick={nativePopover ? undefined : () => setExpanded(!expanded)}>
          <Menu size={19} aria-hidden="true" /> Menu
        </button>}
        <ul id="site-menu" ref={list} className="site-menu" popover={compact && nativePopover ? 'auto' : undefined}
          hidden={compact && !nativePopover && !expanded}>
          {links.map(([label, href]) => <li key={href}>
            <a className="nav-link" href={href}
              aria-current={active === href ? 'location' : undefined} onClick={dismiss}>
              {label}
            </a>
          </li>)}
        </ul>
      </nav>
    </div>
  </header>
}
