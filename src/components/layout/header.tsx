'use client' // Gerekirse client taraflı etkileşimler için

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

const Header = () => {
  return (
    <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-50 w-full border-b border-border/40">
      <div className="container flex h-20 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Image 
            src="/logo.jpeg" 
            alt="Kıbrıs Hızlı Transfer Logo" 
            width={840} 
            height={240} 
            className="h-48 w-auto object-contain"
          />
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex gap-8 text-base font-medium">
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
          <Button variant="ghost" size="default" className="text-foreground/70 text-base">
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