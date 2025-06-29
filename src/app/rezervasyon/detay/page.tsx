'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReservationForm } from '@/components/reservation-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ServerCrash, User } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { format, parseISO } from 'date-fns';
import { AxiosError } from 'axios';

// --- TypeScript Arayüzleri ---
// Kişisel bilgiler için tip tanımı (reservation-form'dan alınabilir veya burada tanımlanabilir)
interface PersonalDetailsFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  flightNumber?: string;
  notes?: string;
}

interface ApiErrorResponse { message: string; errors?: { [key: string]: string[] }; }

// --- Bileşen Props --- (searchParams dışındaki proplar kaldırıldı)
interface RezervasyonDetayProps {
    params: { id: string }; // vehicleId gibi görünüyor ama adı 'id'
}

function ReservationDetailsContent({ params }: RezervasyonDetayProps) {
    const searchParams = useSearchParams(); // Hook'u burada kullan
    const { id: vehicleIdParam } = params; // Parametreden gelen 'id'

    // State'ler
    const [isLoading, ] = useState(false); // setIsLoading kaldırıldı (virgül kaldı)
    const [error, setError] = useState<string | null>(null); // Genel sayfa hatası
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null); // Form gönderim hatası
    const [vehicleName, setVehicleName] = useState<string | null>(null);
  const [pickupName, setPickupName] = useState<string | null>(null);
  const [dropoffName, setDropoffName] = useState<string | null>(null);

    // URL'den query parametrelerini al
    const pickupLocationId = searchParams.get('pickup');
    const dropoffLocationId = searchParams.get('dropoff');
  const dateParam = searchParams.get('date');
  const passengersParam = searchParams.get('passengers');
  const transferTypeParam = searchParams.get('transferType') as 'private' | 'shared' | null;
    const priceParam = searchParams.get('price');
    const selectedExtrasParam = searchParams.get('selectedExtras');
    // const vehicleIdFromQuery = searchParams.get('vehicleId'); // Bu params.id ile aynı olmalı

    // Seçilen ekstraları parse et
    const selectedExtras = useMemo(() => {
      if (!selectedExtrasParam) return [];
      try {
        return JSON.parse(decodeURIComponent(selectedExtrasParam)) as number[];
      } catch (e) {
        console.error("Seçilen ekstralar parse edilemedi:", e);
        return [];
      }
    }, [selectedExtrasParam]);

     // Başlangıçta sadece isimleri göstermek için basit state güncellemesi (API çağrısı gerekebilir)
    useEffect(() => {
        // Gerçekte API'den isimler çekilebilir, şimdilik ID'leri gösterelim
        if (pickupLocationId) setPickupName(`Lokasyon ID: ${pickupLocationId}`);
        if (dropoffLocationId) setDropoffName(`Lokasyon ID: ${dropoffLocationId}`);
        if (vehicleIdParam) setVehicleName(`Araç ID: ${vehicleIdParam}`);
    }, [pickupLocationId, dropoffLocationId, vehicleIdParam]);


    // Form gönderim fonksiyonu (ReservationForm'a prop olarak geçilecek)
    const handleSubmitPersonalDetails = async (personalData: PersonalDetailsFormData) => {
        setIsSubmitting(true);
        setApiError(null);
        setError(null); // Genel sayfadaki hatayı da temizle

        // Gerekli parametrelerin varlığını ve geçerliliğini kontrol et
        const reservationDate = dateParam ? parseISO(dateParam) : null;
        const passengerCount = passengersParam ? parseInt(passengersParam, 10) : null;
  const basePrice = priceParam ? parseFloat(priceParam) : null;
        const pickupId = pickupLocationId ? parseInt(pickupLocationId, 10) : null;
        const dropoffId = dropoffLocationId ? parseInt(dropoffLocationId, 10) : null;
        const vehicleId = vehicleIdParam ? parseInt(vehicleIdParam, 10) : null;

        if (!pickupId || !dropoffId || !reservationDate || !passengerCount || !vehicleId || !transferTypeParam || basePrice === null) {
            setApiError("Rezervasyon için gerekli bilgiler eksik veya geçersiz. Lütfen önceki adıma dönüp tekrar deneyin.");
            setIsSubmitting(false);
            return;
        }

        // Rezervasyon Payload'ını Oluştur
        const reservationPayload = {
            pickup_location_id: pickupId,
            dropoff_location_id: dropoffId,
            vehicle_id: vehicleId,
            reservation_time: format(reservationDate, 'yyyy-MM-dd HH:mm:ss'),
            passenger_count: passengerCount,
            customer_name: personalData.customerName,
            customer_email: personalData.customerEmail,
            customer_phone: personalData.customerPhone,
            flight_number: personalData.flightNumber || null,
            notes: personalData.notes || null,
            transfer_type: transferTypeParam,
            base_price: basePrice,
            selected_extras: selectedExtras.length > 0 ? selectedExtras : undefined,
        };

        console.log("Rezervasyon İsteği Gönderiliyor:", reservationPayload);

        try {
            const response = await apiClient.post('/reservations', reservationPayload);
            const reservationCode = response.data?.data?.code || response.data?.code;

            if (reservationCode) {
                // ID yerine KODU gönderiyoruz
                window.location.href = `/rezervasyon-basarili?id=${reservationCode}`;
            } else {
                throw new Error('Rezervasyon başarılı ancak rezervasyon kodu alınamadı.');
            }
        } catch (err: unknown) { // any yerine unknown
            console.error('Rezervasyon oluşturma hatası:', err);
            let message = 'Rezervasyon oluşturulurken bir hata oluştu. Lütfen bilgilerinizi kontrol edin veya destek ile iletişime geçin.';
            if (err instanceof AxiosError && err.response?.data) {
                const errorData = err.response.data as ApiErrorResponse;
                message = errorData.message || message;
                // Validation hatalarını da işleyebilirsiniz: errorData.errors
            } else if (err instanceof Error) {
                message = err.message;
            }
            setApiError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Genel sayfa yükleme hatası durumu
    if (error && !isLoading) { // isLoading false ise hatayı göster
    return (
            <div className="container mx-auto px-4 py-12 md:py-20">
                 <Alert variant="destructive">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Hata</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                 </Alert>
      </div>
    );
  }

    // Özet Bilgileri (Basitleştirildi)
    const renderSummary = () => (
        <div className="mb-8 p-6 bg-muted/40 rounded-lg border">
            <h3 className="text-xl font-semibold mb-4 text-center">Rezervasyon Özeti</h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Nereden:</span>
                    <span className="font-medium text-right">{pickupName || 'Yükleniyor...'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Nereye:</span>
                    <span className="font-medium text-right">{dropoffName || 'Yükleniyor...'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Tarih:</span>
                    <span className="font-medium text-right">{dateParam ? format(parseISO(dateParam), 'dd.MM.yyyy HH:mm') : '-'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Yolcu:</span>
                    <span className="font-medium text-right">{passengersParam} Kişi</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Araç:</span>
                    <span className="font-medium text-right">{vehicleName || 'Yükleniyor...'} ({transferTypeParam || '-'})</span>
                </div>
                {/* Ekstralar ve Fiyat buraya eklenebilir */} 
                        </div>
                    </div>
    );

    return (
        <div className="container mx-auto px-4 py-12 md:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                 {/* Sol Sütun: Özet */} 
                 <div className="lg:col-span-1 lg:sticky lg:top-24 h-fit">
                     {renderSummary()}
      </div>

                 {/* Sağ Sütun: Form */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl md:text-3xl font-semibold mb-6 flex items-center">
                        <User className="mr-2 h-6 w-6 text-primary"/> Yolcu Bilgileri ve İletişim
                    </h2>
                    <p className="text-muted-foreground mb-6">Lütfen rezervasyonunuzu tamamlamak için aşağıdaki bilgileri eksiksiz doldurun.</p>
                    <ReservationForm
                        isSubmitting={isSubmitting}
                        onSubmitPersonalDetails={handleSubmitPersonalDetails}
                    />
                    {/* API Hata Mesajı */}
                    {apiError && (
                        <Alert variant="destructive" className="mt-6">
                            <ServerCrash className="h-4 w-4" />
                            <AlertTitle>Rezervasyon Hatası</AlertTitle>
                            <AlertDescription>{apiError}</AlertDescription>
                        </Alert>
                    )}
                </div>
      </div>
    </div>
  );
}

// Ana Export (Suspense ile)
export default function RezervasyonDetayPageWrapper({ params }: RezervasyonDetayProps) {
  return (
      <Suspense fallback={
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
        </div>
      }>
        <ReservationDetailsContent params={params} />
    </Suspense>
  );
} 