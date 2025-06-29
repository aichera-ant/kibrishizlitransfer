import type { Config } from 'tailwindcss'

const config = {
  darkMode: "class", // Linter hatası için düzeltildi
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "", // Shadcn UI için prefix genellikle boş bırakılır
  theme: {
    container: { // Shadcn UI container ayarları
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        "brand-gold": "#D4AF37", // Altın sarısı
        // Shadcn UI Renkleri (Koyu Tema)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))", // Odak rengi için altın sarısını kullanacağız
        background: "hsl(var(--background))", // Ana arka plan (koyu gri/siyah)
        foreground: "hsl(var(--foreground))", // Ana metin rengi (beyaz/açık gri)
        primary: {
          DEFAULT: "hsl(var(--primary))", // Ana renk (örn. koyu gri)
          foreground: "hsl(var(--primary-foreground))", // Ana renk üzerindeki metin (açık renk)
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))", // İkincil renk (örn. daha açık gri)
          foreground: "hsl(var(--secondary-foreground))", // İkincil renk üzerindeki metin
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))", // Hata/silme rengi (kırmızı tonu)
          foreground: "hsl(var(--destructive-foreground))", // Hata rengi üzerindeki metin
        },
        muted: {
          DEFAULT: "hsl(var(--muted))", // Sessiz/pasif renk (koyu gri)
          foreground: "hsl(var(--muted-foreground))", // Sessiz renk üzerindeki metin (açık gri)
        },
        accent: {
          DEFAULT: "hsl(var(--accent))", // Vurgu rengi (hover vb. için altın sarısı olabilir)
          foreground: "hsl(var(--accent-foreground))", // Vurgu rengi üzerindeki metin (koyu renk)
        },
        popover: {
          DEFAULT: "hsl(var(--popover))", // Popover arka planı (koyu)
          foreground: "hsl(var(--popover-foreground))", // Popover metni (açık)
        },
        card: {
          DEFAULT: "hsl(var(--card))", // Kart arka planı (koyu)
          foreground: "hsl(var(--card-foreground))", // Kart metni (açık)
        },
      },
      borderRadius: { // Shadcn UI kenar yuvarlaklığı
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: { // Shadcn UI animasyonları
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      // Eski backgroundImage tanımını koruyalım
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require("tailwindcss-animate")], // Shadcn UI animasyonları için
} satisfies Config

export default config 