import React from 'react'
// Kullanılmayan tüm importlar kaldırıldı
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
// import { Calendar } from '@/components/ui/calendar'
// import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
// import { Check, ChevronsUpDown, CalendarIcon, Users, PlaneLanding, PlaneTakeoff, CarFront, Clock, MapPin, ShieldCheck, Star, Users2, Wallet } from 'lucide-react'
// import { cn } from "@/lib/utils"
// import { format } from 'date-fns'
// import { tr } from 'date-fns/locale'
import HomePageContent from './home-page-content'
import type { Location } from "@/types/location" // Location tipi tekrar import edildi
import { supabase } from '@/lib/supabaseClient' // Supabase istemcisini import et

// Server Component olduğu için useRouter, useState kaldırıldı
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
// import { Calendar } from "@/components/ui/calendar"
// import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
// import { Check, ChevronsUpDown, Calendar as CalendarIcon, Users, PlaneLanding, PlaneTakeoff, CarFront, Clock, MapPin, ShieldCheck, Star, Users2, Wallet } from "lucide-react"
// import { cn } from "@/lib/utils"
// import { format } from 'date-fns'
// import { tr } from 'date-fns/locale' // Türkçe locale ekle
// import type { Location } from "@/types/location" // Tip importu doğru

// Client Component (state, router, UI)
// import HomePageContent from './home-page-content' // Yeni client component'i import et

// Sunucu tarafında lokasyonları çekmek için fonksiyon (değişiklik yok)
async function getLocations(): Promise<Location[]> {
  try {
    // Eski fetch kaldırıldı
    // const apiUrl = process.env.INTERNAL_API_BASE_URL || 'http://nginx/api';
    // console.log('[Server Fetch] Fetching locations from:', apiUrl);
    // const response = await fetch(`${apiUrl}/locations`, {
    //   cache: 'no-store'
    // })
    // if (!response.ok) {
    //   console.error("[Server Fetch Error] Failed to fetch locations: Network response was not ok", response.status, response.statusText, await response.text());
    //   return []
    // }
    // const data = await response.json()
    // return data.data || []

    // Supabase ile locations tablosundan veriyi çek
    const { data, error } = await supabase
      .from('locations') // Tablo adı: locations
      .select('*') // Tüm sütunları seç
      .eq('is_active', true) // Sadece aktif lokasyonları al (opsiyonel)
      .order('name', { ascending: true }); // İsime göre sırala (opsiyonel)

    if (error) {
      console.error('[Supabase Fetch Error] Failed to fetch locations:', error);
      return [];
    }

    // Supabase doğrudan veriyi döndürür (data.data demeye gerek yok)
    return data || [];

      } catch (error) {
    console.error("[Generic Fetch Error] Failed to fetch locations:", error);
    return []
  }
}

// Ana Sayfa (Server Component) - Sadece veri çeker ve Client Component'i render eder
export default async function HomePage() {
  // Veriyi sunucuda çek
  const locations = await getLocations()

  // Client Component'i render et ve veriyi prop olarak geçir
  return <HomePageContent initialLocations={locations} />
}

// --- BURADAN AŞAĞISI home-page-content.tsx ADINDA YENİ BİR DOSYAYA TAŞINACAK ---
// // "use client" // Yeni dosyanın başına eklenecek
// import React, { useState } from 'react';
// import { useRouter } from 'next/navigation';
// // ... Diğer gerekli importlar (Button, Input, Card vs.) ...
// import type { Location } from "@/types/location";
// import type { ComboboxOption } from './page'; // Veya tipi buraya taşı

// interface HomePageContentProps {
//   initialLocations: Location[];
// }

// export default function HomePageContent({ initialLocations }: HomePageContentProps) {
//   const router = useRouter();

//   // State Tanımları (başlangıç değeri initialLocations)
//   const [pickupLocation, setPickupLocation] = useState<string | undefined>();
//   const [dropoffLocation, setDropoffLocation] = useState<string | undefined>();
//   const [reservationDate, setReservationDate] = useState<Date | undefined>();
//   const [passengerCount, setPassengerCount] = useState<number>(1);
//   const [locations, setLocations] = useState<Location[]>(initialLocations);
//   const [isCheckingPrice, setIsCheckingPrice] = useState(false);
//   const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

//   const [openPickup, setOpenPickup] = useState(false);
//   const [openDropoff, setOpenDropoff] = useState(false);

//   const locationOptions: ComboboxOption[] = locations.map((loc: Location) => ({
//     value: loc.id.toString(),
//     label: loc.name,
//   }));

//   const handleCheckPriceOrProceed = async () => {
//     // ... (Fonksiyon içeriği aynı) ...
//   };

//   return (
//     <>
//       {/* --- HERO / FİYAT KONTROL ALANI --- */}
//       {/* ... (Önceki return içeriğinin tamamı buraya gelecek) ... */}
//     </>
//   );
// }
