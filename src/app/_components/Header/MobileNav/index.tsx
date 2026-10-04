'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { Header } from '../../../../payload/payload-types'
import { useAuth } from '../../../_providers/Auth'
import { CartLink } from '../../CartLink'
import { CMSLink } from '../../Link'

import classes from './index.module.scss'

const MobileNav: React.FC<{ header: Header | null }> = ({ header }) => {
  const { user } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const navItems = header?.navItems || []

  return (
    <div
      className={[classes.mobileNav, user === undefined && classes.hide].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={classes.toggle}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? 'Close' : 'Menu'}
      </button>
      {isOpen && (
        <nav id="mobile-navigation" className={classes.menu} aria-label="Mobile navigation">
          {navItems.map(({ link }, index) => (
            <CMSLink key={index} {...link} appearance="none" className={classes.link} />
          ))}
          <CartLink className={classes.link} />
          {user ? (
            <Link href="/account" className={classes.link}>
              Account
            </Link>
          ) : (
            <Link href="/login" className={classes.link}>
              Login
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}

export default MobileNav
