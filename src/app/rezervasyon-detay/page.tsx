'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReservationForm } from '@/components/reservation-form';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseISO } from 'date-fns'; // Tarihi parse etmek için

// Suspense ile kullanılacak asıl sayfa bileşeni
function ReservationDetailsContent() {
  const searchParams = useSearchParams();

  // Query parametrelerini al
  const pickupParam = searchParams.get('pickup');
  const dropoffParam = searchParams.get('dropoff');
  const dateParam = searchParams.get('date');
  const passengersParam = searchParams.get('passengers');

  // Parametreleri forma uygun hale getir
  const initialValues = {
    pickupLocationId: pickupParam ? parseInt(pickupParam) : undefined,
    dropoffLocationId: dropoffParam ? parseInt(dropoffParam) : undefined,
    // Tarihi ISO string'den Date objesine çevir
    reservationDate: dateParam ? parseISO(dateParam) : undefined, 
    passengerCount: passengersParam ? parseInt(passengersParam) : undefined,
  };

  // Basit bir kontrol: Gerekli parametreler eksikse hata mesajı göster
  if (!initialValues.pickupLocationId || !initialValues.dropoffLocationId || !initialValues.reservationDate) {
    return (
      <div className="container mx-auto px-4 py-12 md:py-20 text-center">
        <h1 className="text-2xl font-bold text-destructive">Rezervasyon Detayları Yüklenemedi</h1>
        <p className="text-muted-foreground mt-2">Gerekli bilgiler eksik. Lütfen ana sayfadan tekrar deneyin.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <Card className="max-w-4xl mx-auto bg-background text-card-foreground border border-border shadow-lg">
        <CardHeader>
          {/* Başlık veya geri butonu eklenebilir */}
          <CardTitle className="text-2xl font-semibold text-center text-primary">Rezervasyon Detaylarınızı Tamamlayın</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <ReservationForm initialValues={initialValues} />
        </CardContent>
      </Card>
    </div>
  );
}

// useSearchParams hook'unu Suspense ile sarmalayan ana export
export default function ReservationDetailsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-12 md:py-20 text-center">Yükleniyor...</div>}>
      <ReservationDetailsContent />
    </Suspense>
  );
} 