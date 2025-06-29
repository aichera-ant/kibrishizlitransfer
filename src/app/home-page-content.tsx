'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Users, PlaneTakeoff, CarFront, Clock, MapPin, ShieldCheck, Star, Users2, Wallet, Loader2, Search, MapPinned } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Location } from "@/types/location"
import { createClient } from '@supabase/supabase-js'

// Supabase İstemcisini Başlatma
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.")
  // Uygulamanın bu noktada nasıl davranacağına karar verin.
  // Belki bir hata mesajı göstermek veya boş veriyle devam etmek.
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

// Rezervasyon Kodu Üretme Fonksiyonu
function generateReservationCode(length = 7): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Combobox için helper type
interface ComboboxOption {
  value: string
  label: string
}

export default function HomePageContent() {
  const router = useRouter()

  // State Tanımları (başlangıç değeri initialLocations)
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null)
  const [reservationDate, setReservationDate] = useState<Date | undefined>(new Date())
  const [reservationTime, setReservationTime] = useState<string>('10:00')
  const [passengerCount, setPassengerCount] = useState<number>(1)
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Combobox için state'ler
  const [openPickup, setOpenPickup] = useState(false)
  const [openDropoff, setOpenDropoff] = useState(false)
  const [openDatePopover, setOpenDatePopover] = useState(false)

  // Lokasyonları Combobox formatına dönüştür
  const locationOptions: ComboboxOption[] = locations.map((loc: Location) => ({
    value: loc.id.toString(),
    label: loc.name,
  }))

  // Fiyat Kontrolü / Forma Yönlendirme Fonksiyonu
  const handleSearch = async () => {
    if (!pickupLocation || !dropoffLocation || !reservationDate || !reservationTime) {
      console.error("Eksik alanlar")
      setError("Lütfen tüm alanları doldurun.") 
      return
    }
    setError(null)

    // 1. Rezervasyon Kodu Üret
    const reservationCode = generateReservationCode();
    const expiryTime = Date.now() + 30 * 60 * 1000; // 30 dakika sonrası

    // 2. SessionStorage'a Kaydet
    try {
      if (typeof window !== 'undefined') { // Tarayıcı ortamında olduğumuzdan emin ol
        sessionStorage.setItem('tempReservation', JSON.stringify({
          code: reservationCode,
          expiresAt: expiryTime
        }));
      }
    } catch (error) {
      console.error("SessionStorage'a yazılamadı:", error);
      // Opsiyonel: Kullanıcıyı uyar veya kodsuz devam et?
      // Şimdilik devam ediyoruz, araç seçimi sayfasında kontrol edilecek.
    }

    // Tarih ve saati birleştir
    const combinedDateTime = new Date(reservationDate)
    const [hours, minutes] = reservationTime.split(':').map(Number)
    combinedDateTime.setHours(hours)
    combinedDateTime.setMinutes(minutes)
    combinedDateTime.setSeconds(0)
    combinedDateTime.setMilliseconds(0)

    const searchParams = new URLSearchParams({
      pickup: pickupLocation.id.toString(),
      dropoff: dropoffLocation.id.toString(),
      date: combinedDateTime.toISOString(), // ISO 8601 formatında gönder
      passengers: passengerCount.toString(),
      pickupLocationName: pickupLocation.name,
      dropoffLocationName: dropoffLocation.name,
    })

    // Doğrudan araç seçimi sayfasına yönlendir
    router.push(`/arac-secimi?${searchParams.toString()}`)
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) {
        setError("Supabase istemcisi başlatılamadı. Lütfen ortam değişkenlerini kontrol edin.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setLocations([])
      try {
        // Eş zamanlı Supabase istekleri
        const [locationsResponse, vehicleTypesResponse] = await Promise.all([
          supabase.from('locations').select('*'),
          supabase.from('vehicles').select('type') 
        ])

        if (locationsResponse.error) {
          throw new Error(`Lokasyonlar yüklenemedi: ${locationsResponse.error.message}`)
        }
        if (vehicleTypesResponse.error) {
          throw new Error(`Araç tipleri yüklenemedi: ${vehicleTypesResponse.error.message}`)
        }

        const locationsData = locationsResponse.data || []
        
        // vehicles'dan gelen type'ları al ve benzersiz hale getir
        // const vehicleObjects = vehicleTypesResponse.data || [] // Unused variable
        // const uniqueVehicleTypes = [...new Set(vehicleObjects.map(item => item.type).filter(Boolean))] as string[] // Unused variable
        
        setLocations(locationsData as Location[]) // Gelen verinin Location tipinde olduğunu varsayıyoruz

      } catch (err: unknown) {
        console.error("Ana sayfa verileri yüklenirken hata:", err)
        let message = 'Veriler yüklenirken bir hata oluştu.'
        if (err instanceof Error) {
          message = err.message
        }
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <>
      {/* --- HERO / FİYAT KONTROL ALANI --- */}
      <section 
        className="w-full pt-24 md:pt-32 lg:pt-48 xl:pt-64 pb-16 md:pb-20 relative" 
        style={{
          backgroundImage: `url('/backround.jpeg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="container px-4 md:px-6 relative z-10">
          <Card className="max-w-6xl mx-auto bg-background/95 backdrop-blur-md p-8 md:p-10 shadow-2xl border border-border/30 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              
              {/* Nereden (Combobox) */}
              <div className="md:col-span-1 space-y-1.5">
                <Label htmlFor="pickupLocationHero" className="text-foreground/80 flex items-center"><MapPin className="w-4 h-4 mr-1"/> Nereden</Label>
                <Popover open={openPickup} onOpenChange={setOpenPickup}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPickup}
                      className="w-full justify-between text-foreground border-border/50 hover:border-primary/50 data-[state=open]:ring-2 data-[state=open]:ring-ring data-[state=open]:ring-offset-2"
                    >
                      {pickupLocation
                        ? locationOptions.find((option) => option.value === pickupLocation.id.toString())?.label
                        : "Seçiniz..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                    <Command>
                      <CommandInput placeholder="Konum ara..." />
                      <CommandList>
                        <CommandEmpty>Konum bulunamadı.</CommandEmpty>
                        <CommandGroup>
                          {locationOptions.length === 0 ? (
                             <CommandItem disabled>Konum bulunamadı veya yüklenemedi.</CommandItem>
                          ) : (
                            locationOptions.map((option) => (
                              <CommandItem
                                key={option.value}
                                onSelect={(currentValue: string) => {
                                  const selectedOption = locationOptions.find(opt => 
                                      opt.label.toLowerCase() === currentValue.toLowerCase() ||
                                      opt.value === currentValue
                                  )
                                  const selectedLocationId = selectedOption ? selectedOption.value : undefined
                                  
                                  setPickupLocation(selectedLocationId === pickupLocation?.id.toString() ? null : locations.find(loc => loc.id.toString() === selectedLocationId) as Location)
                                  setOpenPickup(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    pickupLocation?.id.toString() === option.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {option.label}
                              </CommandItem>
                            ))
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Nereye (Combobox) */}
              <div className="md:col-span-1 space-y-1.5">
                <Label htmlFor="dropoffLocationHero" className="text-foreground/80 flex items-center"><MapPinned className="w-4 h-4 mr-1"/> Nereye</Label>
                 <Popover open={openDropoff} onOpenChange={setOpenDropoff}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openDropoff}
                      className="w-full justify-between text-foreground border-border/50 hover:border-primary/50 data-[state=open]:ring-2 data-[state=open]:ring-ring data-[state=open]:ring-offset-2"
                    >
                      {dropoffLocation
                        ? locationOptions.find((option) => option.value === dropoffLocation.id.toString())?.label
                        : "Seçiniz..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                    <Command>
                      <CommandInput placeholder="Konum ara..." />
                      <CommandList>
                      <CommandEmpty>Konum bulunamadı.</CommandEmpty>
                      <CommandGroup>
                         {locationOptions.length === 0 ? (
                             <CommandItem disabled>Konum bulunamadı veya yüklenemedi.</CommandItem>
                          ) : (
                            locationOptions.map((option) => (
                              <CommandItem
                                key={option.value}
                                disabled={option.value === pickupLocation?.id.toString()} // Aynı lokasyon seçilemesin
                                onSelect={(currentValue: string) => {
                                  const selectedOption = locationOptions.find(opt => 
                                      opt.label.toLowerCase() === currentValue.toLowerCase() ||
                                      opt.value === currentValue
                                  )
                                  const selectedLocationId = selectedOption ? selectedOption.value : undefined

                                  setDropoffLocation(selectedLocationId === dropoffLocation?.id.toString() ? null : locations.find(loc => loc.id.toString() === selectedLocationId) as Location)
                                  setOpenDropoff(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    dropoffLocation?.id.toString() === option.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {option.label}
                              </CommandItem>
                            ))
                          )}
                      </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Gidiş Tarihi ve Saati - Konteyner kaldırıldı */}
              {/* <div className=\"md:col-span-2 grid grid-cols-[auto_minmax(0,_1fr)] md:grid-cols-[auto_120px] gap-2\"> Eski Konteyner */} 
              
                  {/* Gidiş Tarihi - Doğrudan ana grid içinde, md:col-span-1 eklendi */}
                  <div className="md:col-span-1 space-y-1.5">
                    <Label htmlFor="reservationDateHero" className="text-foreground/80 flex items-center"><CalendarIcon className="w-4 h-4 mr-1"/> Tarih</Label>
                    <Popover open={openDatePopover} onOpenChange={setOpenDatePopover}> 
                      <PopoverTrigger asChild>
                        <Button
                          id="reservationDateHero"
                          variant="outline"
                          className={`w-full justify-start text-left font-normal border-border/50 hover:border-primary/50 data-[state=open]:ring-2 data-[state=open]:ring-ring data-[state=open]:ring-offset-2 ${!reservationDate && "text-muted-foreground"}`}
                        >
                          {reservationDate ? format(reservationDate, "PPP", { locale: tr }) : <span>Tarih</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={reservationDate}
                          onSelect={(date) => { 
                            setReservationDate(date)
                            setOpenDatePopover(false) 
                          }}
                          initialFocus
                          disabled={(date: Date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Gidiş Saati - Doğrudan ana grid içinde, md:col-span-1 eklendi */}
                  <div className="md:col-span-1 space-y-1.5">
                     <Label htmlFor="reservationTimeHero" className="text-foreground/80 flex items-center"><Clock className="w-4 h-4 mr-1"/> Saat</Label>
                     <Input
                        id="reservationTimeHero"
                        type="time"
                        value={reservationTime}
                        onChange={(e) => setReservationTime(e.target.value)}
                        className="border-border/50 focus-visible:ring-primary"
                     />
                  </div>
              {/* </div> Eski Konteyner Kapanışı */} 

              {/* Yolcu Sayısı */}
              <div className="md:col-span-1 space-y-1.5">
                <Label htmlFor="passengerCountHero" className="text-foreground/80 flex items-center"><Users className="w-4 h-4 mr-1"/> Yolcu</Label>
                <Input 
                  id="passengerCountHero"
                  type="number"
                  min={1}
                  value={passengerCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassengerCount(parseInt(e.target.value, 10) || 1)}
                  className="text-center border-border/50 focus-visible:ring-primary"
                />
              </div>

              {/* Buton */}
              <div className="md:col-span-1">
                <Button 
                  size="lg" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground focus-visible:ring-primary"
                  onClick={handleSearch}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  {isLoading ? 'Yükleniyor...' : 'Uygun Araçları Bul'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* --- YENİ BÖLÜM: HİZMETLERİMİZ --- */}
      <section className="w-full py-12 md:py-20 lg:py-28 bg-background border-b border-border/20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-secondary text-secondary-foreground px-3 py-1 text-sm">Hizmetlerimiz</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-primary">Size Özel Transfer Çözümleri</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Kıbrıs&apos;ın eşsiz güzelliklerini keşfederken veya iş seyahatlerinizde, konforlu ve güvenilir ulaşım
                Kıbrıs&apos;ın en seçkin transfer firması olarak, size özel çözümler sunuyoruz.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 mt-12">
            <div className="grid gap-1 text-center p-4 rounded-lg hover:bg-secondary/50 transition-colors">
              <PlaneTakeoff className="h-8 w-8 mx-auto text-primary" />
              <h3 className="text-lg font-bold">Havalimanı Transferi</h3>
              <p className="text-sm text-muted-foreground">Ercan Havalimanı&aposn;dan otelinize veya istediğiniz adrese hızlı ve konforlu ulaşım.</p>
            </div>
            <div className="grid gap-1 text-center p-4 rounded-lg hover:bg-secondary/50 transition-colors">
              <MapPin className="h-8 w-8 mx-auto text-primary" />
              <h3 className="text-lg font-bold">Otel ve Bölge Transferleri</h3>
              <p className="text-sm text-muted-foreground">Otelinizden başka bir otele, casinoya veya turistik bölgeye özel transfer hizmeti.</p>
            </div>
            <div className="grid gap-1 text-center p-4 rounded-lg hover:bg-secondary/50 transition-colors">
              <Clock className="h-8 w-8 mx-auto text-primary" />
              <h3 className="text-lg font-bold">Saatlik Şoförlü Araç</h3>
              <p className="text-sm text-muted-foreground">İş veya gezi amaçlı, size özel şoförlü araç kiralama hizmetimizle zamanınızı yönetin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- YENİ BÖLÜM: ARAÇ FİLOMUZ --- */}
      <section className="w-full py-12 md:py-20 lg:py-28 bg-secondary/30 border-b border-border/20">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6 lg:gap-10">
          <div className="space-y-3">
            <div className="inline-block rounded-lg bg-primary text-primary-foreground px-3 py-1 text-sm">Araç Filomuz</div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Konfor ve Güvenlik Standartlarımız</h2>
            <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              İster havalimanı transferi, ister şehir içi ulaşım, ister özel turlarınız için olsun, geniş araç
              filomuz ve deneyimli şoförlerimizle hizmetinizdeyiz. Müşteri memnuniyeti odaklı yaklaşımımızla,
              seyahatinizin her anını özel kılmak için çalışıyoruz.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             <Card className="p-6 flex flex-col items-center text-center bg-background">
               <CarFront className="w-12 h-12 mb-4 text-primary" />
               <h3 className="text-xl font-bold mb-2">Ekonomik Sedan</h3>
               <p className="text-sm text-muted-foreground">Tek veya çift kişilik yolculuklar için ideal, konforlu ve uygun fiyatlı seçenek.</p>
             </Card>
             <Card className="p-6 flex flex-col items-center text-center bg-background">
               <Users2 className="w-12 h-12 mb-4 text-primary" />
               <h3 className="text-xl font-bold mb-2">VIP Minivan</h3>
               <p className="text-sm text-muted-foreground">Geniş aileler veya gruplar için lüks ve ferah iç hacim sunan özel donanımlı araçlar.</p>
             </Card>
             <Card className="p-6 flex flex-col items-center text-center bg-background">
               <Star className="w-12 h-12 mb-4 text-primary" />
               <h3 className="text-xl font-bold mb-2">Premium Araçlar</h3>
               <p className="text-sm text-muted-foreground">Özel misafirleriniz veya prestijli yolculuklarınız için son model lüks sedan ve SUV&apos;lar.</p>
             </Card>
          </div>
        </div>
      </section>

      {/* --- YENİ BÖLÜM: NEDEN BİZ? --- */}
       <section className="w-full py-12 md:py-20 lg:py-28 bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
             <div className="inline-block rounded-lg bg-secondary text-secondary-foreground px-3 py-1 text-sm">Avantajlarımız</div>
             <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-primary">Neden Kıbrıs Transfer?</h2>
             <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
               Müşteri memnuniyeti odaklı yaklaşımımız ve kaliteli hizmet anlayışımızla fark yaratıyoruz.
             </p>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
             <div className="grid gap-1">
               <ShieldCheck className="h-8 w-8 text-primary" />
               <h3 className="text-lg font-bold">Güvenli Yolculuk</h3>
               <p className="text-sm text-muted-foreground">Deneyimli şoförlerimiz ve sigortalı araçlarımızla güvenliğinizi ön planda tutuyoruz.</p>
             </div>
             <div className="grid gap-1">
               <Wallet className="h-8 w-8 text-primary" />
               <h3 className="text-lg font-bold">Uygun Fiyatlar</h3>
               <p className="text-sm text-muted-foreground">Kaliteli hizmeti, rekabetçi ve şeffaf fiyatlandırma politikasıyla sunuyoruz.</p>
             </div>
             <div className="grid gap-1">
               <Clock className="h-8 w-8 text-primary" />
               <h3 className="text-lg font-bold">7/24 Hizmet</h3>
               <p className="text-sm text-muted-foreground">Günün her saati, haftanın her günü kesintisiz transfer ve destek hizmeti sağlıyoruz.</p>
             </div>
          </div>
        </div>
      </section>
    </>
  )
} 