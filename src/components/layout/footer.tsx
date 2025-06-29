import React from 'react'

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary/50 border-t border-border/40 py-6 mt-auto">
      <div className="container text-center text-sm text-muted-foreground">
        © {currentYear} Kıbrıs Transfer. Tüm hakları saklıdır.
      </div>
    </footer>
  )
}

export default Footer 