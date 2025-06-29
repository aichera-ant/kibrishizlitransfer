'use client' // Gerekirse client taraflı etkileşimler için

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const Header = () => {
  return (
    <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-50 w-full border-b border-border/40">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          {/* <img src="/logo.png" alt="Fly Kibris Logo" className="h-8 w-auto" /> */}
          <span className="font-bold text-xl text-primary">Kıbrıs Transfer</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <Link href="/hizmetler" className="text-foreground/70 hover:text-foreground transition-colors">
            Hizmetler
          </Link>
          <Link href="/araclar" className="text-foreground/70 hover:text-foreground transition-colors">
            Araçlar
          </Link>
          <Link href="/hakkimizda" className="text-foreground/70 hover:text-foreground transition-colors">
            Hakkımızda
          </Link>
          <Link href="/iletisim" className="text-foreground/70 hover:text-foreground transition-colors">
            İletişim
          </Link>
        </nav>

        {/* Right Section - Language/Login etc. */}
        <div className="flex items-center gap-4">
          {/* Placeholder for language switcher or other actions */}
          <Button variant="ghost" size="sm" className="text-foreground/70">
            TR
          </Button>
          {/* Maybe Login/Signup Button */}
          {/* <Button size="sm">Giriş Yap</Button> */}
        </div>

        {/* Mobile Menu Button (optional) */}
        {/* Add later if needed */}

      </div>
    </header>
  )
}

export default Header 