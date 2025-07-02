'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
// import { ReservationForm } from '@/components/reservation-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CreditCard, CheckCircle, /*CircleDollarSign,*/ ServerCrash, Loader2 } from "lucide-react"
import { ReservationSummary } from '@/components/reservation-summary'
// import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { AxiosError } from 'axios'

// Lokasyon verisi için basit tip
interface Location {
    id: number;
    name: string;
    type: string;
}

// Arayüzler (rezervasyon-basarili/page.tsx'den alınabilir)
interface Vehicle {
    id: number;
    name: string;
    type?: string;
    capacity?: number;
}

interface ExtraData {
    id: number;
    name: string;
    price: number;
}

interface ReservationSummaryData {
    id: number;
    code: string;
    pickup_location_id: number;
    dropoff_location_id: number;
    vehicle_id: number;
    reservation_time: string;
    passenger_count: number;
    total_price: number;
    currency: string;
    status: string;
    payment_status: string;
    created_at: string;
    pickup_location?: Location | null; // API yanıtından geliyorsa
    dropoff_location?: Location | null;
    vehicle?: Vehicle | null;
    extras?: ExtraData[] | null;
}

// Bileşenin ana içeriği
function ReservationCompleteContent() {
    const searchParams = useSearchParams();
    const paymentStatus = searchParams.get('payment_status');
    const reservationCode = searchParams.get('reservation_code');
    const [error, setError] = useState<string | null>(null);

    const [reservation, setReservation] = useState<ReservationSummaryData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!reservationCode) {
            setError('Rezervasyon kodu bulunamadı.');
            setLoading(false);
            return;
        }

        const fetchReservationDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
                const response = await fetch(`${apiBaseUrl}/reservations/${reservationCode}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: response.statusText }));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setReservation(data.data);

                // Lokasyonları ayrıca fetch etmeye gerek yok, reservation objesi içinden gelmeli.
                // Eğer gelmiyorsa API yanıtını güncellemek gerekir.

            } catch (err: unknown) {
                console.error("Rezervasyon detayları alınırken hata:", err);
                let message = 'Rezervasyon detayları yüklenirken bir hata oluştu.';
                if (err instanceof AxiosError) {
                    message = err.response?.data?.message || err.message;
                } else if (err instanceof Error) {
                    message = err.message;
                }
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchReservationDetails();
    }, [reservationCode]);

    if (loading) {
        return (
            <div className="container mx-auto max-w-2xl py-12 px-4 text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Rezervasyon detayları yükleniyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-12 md:py-20 text-center">
                <Alert variant="destructive" className="max-w-lg mx-auto">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Hata</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!reservation) {
        return (
            <div className="container mx-auto px-4 py-12 md:py-20 text-center">
                <Alert variant="destructive" className="max-w-lg mx-auto">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Rezervasyon Bulunamadı</AlertTitle>
                    <AlertDescription>
                        Rezervasyon kodunuzu kontrol edin veya destek ile iletişime geçin.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Ödeme durumuna göre başlık ve ikon
    const statusConfig = {
        success: { title: "Ödeme Başarılı!", icon: <CheckCircle className="h-16 w-16 text-green-500" />, description: "Rezervasyonunuz onaylandı. Detaylar aşağıdadır.", alertType: "success" as const },
        pending: { title: "Ödeme Beklemede", icon: <CreditCard className="h-16 w-16 text-yellow-500" />, description: "Ödemeniz henüz onaylanmadı. Onaylandığında bilgilendirileceksiniz.", alertType: "warning" as const },
        failed: { title: "Ödeme Başarısız", icon: <ServerCrash className="h-16 w-16 text-destructive" />, description: "Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin veya destek ile iletişime geçin.", alertType: "destructive" as const },
        default: { title: "Rezervasyon Tamamlandı", icon: <CheckCircle className="h-16 w-16 text-primary" />, description: "Rezervasyon detaylarınız aşağıdadır.", alertType: "default" as const }
    };

    const currentStatus = statusConfig[paymentStatus as keyof typeof statusConfig] || statusConfig.default;

    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <Card className="shadow-lg">
                <CardHeader className="text-center">
                    {currentStatus.icon}
                    <CardTitle className="text-2xl font-bold mt-4">{currentStatus.title}</CardTitle>
                    <CardDescription>{currentStatus.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {currentStatus.alertType === 'warning' && (
                        <Alert variant={'default'} className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
                            <CreditCard className="h-4 w-4 text-yellow-600" />
                            <AlertTitle className="text-yellow-800 dark:text-yellow-300">{currentStatus.title}</AlertTitle>
                            <AlertDescription className="text-yellow-700 dark:text-yellow-400">{currentStatus.description}</AlertDescription>
                        </Alert>
                    )}
                    {currentStatus.alertType === 'destructive' && (
                         <Alert variant={'destructive'}>
                            <ServerCrash className="h-4 w-4" />
                            <AlertTitle>{currentStatus.title}</AlertTitle>
                            <AlertDescription>{currentStatus.description}</AlertDescription>
                        </Alert>
                    )}
                    
                    <div className="text-center text-sm text-muted-foreground">
                        Rezervasyon Kodunuz: <strong className="text-primary font-mono">{reservation.code}</strong>
                    </div>

                    {/* ReservationSummary bileşenine reservation objesini gönderiyoruz */}
                    <ReservationSummary 
                        reservation={reservation}
                        isLoading={loading}
                        currency={reservation.currency || 'TRY'} 
                    />

                </CardContent>
                <CardFooter className="flex justify-center pt-6 border-t">
                    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                        <Button asChild variant="outline">
                            <Link href="/">Ana Sayfaya Dön</Link>
                        </Button>
                        {/* Rezervasyon detay sayfasına link eklenebilir (varsa) */}
                        {/* <Button asChild>
                            <Link href={`/profilim/rezervasyonlarim/${reservation.code}`}>Rezervasyonu Görüntüle</Link>
                        </Button> */}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

// Suspense ile sarmalayıcı
export default function RezervasyonTamamlaPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-12 md:py-20 text-center">Sayfa Yükleniyor...</div>}>
            <ReservationCompleteContent />
        </Suspense>
    )
} 