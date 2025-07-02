'use client' // searchParams kullanmak için Client Component

import React, { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, AlertTriangle, CreditCard, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PaymentStatus {
    status: 'loading' | 'paid' | 'pending' | 'failed' | 'unknown'
    message: string
}

function SuccessContent() {
    const searchParams = useSearchParams()
    const reservationCode = searchParams.get('code')
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ 
        status: 'loading', 
        message: 'Ödeme durumu kontrol ediliyor...' 
    })

    useEffect(() => {
        if (!reservationCode) {
            setPaymentStatus({
                status: 'unknown',
                message: 'Rezervasyon kodu bulunamadı'
            })
            return
        }

        const checkPaymentStatus = async () => {
            try {
                // Rezervasyon detaylarını getir ve ödeme durumunu kontrol et
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'
                const response = await fetch(`${apiBaseUrl}/reservations/code/${reservationCode}`)
                
                if (!response.ok) {
                    throw new Error('Rezervasyon bulunamadı')
                }

                const data = await response.json()
                const reservation = data.data

                // Ödeme durumuna göre status belirle
                if (reservation.payment_status === 'paid') {
                    setPaymentStatus({
                        status: 'paid',
                        message: 'Ödemeniz başarıyla alınmıştır'
                    })
                } else if (reservation.payment_status === 'pending' || reservation.payment_status === 'PENDING') {
                    setPaymentStatus({
                        status: 'pending',
                        message: 'Ödemeniz henüz alınmamıştır. Havale/EFT ile ödeme yaptıysanız, ödemenizin onaylanması 24 saat sürebilir.'
                    })
                } else {
                    setPaymentStatus({
                        status: 'failed',
                        message: 'Ödeme işlemi başarısız olmuştur'
                    })
                }
            } catch (error) {
                console.error('Payment status check error:', error)
                setPaymentStatus({
                    status: 'unknown',
                    message: 'Ödeme durumu kontrol edilirken bir hata oluştu'
                })
            }
        }

        checkPaymentStatus()
    }, [reservationCode])

    const getStatusConfig = () => {
        switch (paymentStatus.status) {
            case 'loading':
                return {
                    icon: <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />,
                    title: 'Kontrol Ediliyor...',
                    variant: 'default' as const,
                    description: paymentStatus.message
                }
            case 'paid':
                return {
                    icon: <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />,
                    title: 'Rezervasyon Onaylandı!',
                    variant: 'default' as const,
                    description: 'Transfer rezervasyonunuz başarıyla onaylanmıştır. Ödemeniz alınmıştır.'
                }
            case 'pending':
                return {
                    icon: <CreditCard className="w-16 h-16 text-yellow-500 mx-auto mb-4" />,
                    title: 'Rezervasyon Alındı',
                    variant: 'default' as const,
                    description: 'Transfer rezervasyonunuz alınmıştır. Ödeme onayını bekliyoruz.'
                }
            case 'failed':
                return {
                    icon: <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />,
                    title: 'Ödeme Başarısız',
                    variant: 'destructive' as const,
                    description: 'Rezervasyonunuz oluşturuldu ancak ödeme işlemi başarısız oldu. Lütfen destek ile iletişime geçin.'
                }
            default:
                return {
                    icon: <AlertTriangle className="w-16 h-16 text-gray-500 mx-auto mb-4" />,
                    title: 'Durum Belirsiz',
                    variant: 'destructive' as const,
                    description: paymentStatus.message
                }
        }
    }

    const statusConfig = getStatusConfig()

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
            <Card className="shadow-xl max-w-lg w-full">
                <CardHeader className="text-center">
                    {statusConfig.icon}
                    <CardTitle className="text-2xl font-bold">{statusConfig.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                    {statusConfig.variant === 'destructive' ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Dikkat</AlertTitle>
                            <AlertDescription>{statusConfig.description}</AlertDescription>
                        </Alert>
                    ) : (
                        <p className="text-lg text-foreground">
                            {statusConfig.description}
                        </p>
                    )}
                    
                    {paymentStatus.status === 'pending' && (
                        <Alert>
                            <CreditCard className="h-4 w-4" />
                            <AlertTitle>Ödeme Bilgisi</AlertTitle>
                            <AlertDescription>
                                {paymentStatus.message}
                            </AlertDescription>
                        </Alert>
                    )}

                    {reservationCode && paymentStatus.status !== 'loading' && (
                        <div className="mb-6">
                            <p className="text-sm text-muted-foreground mb-1">Rezervasyon Kodunuz:</p>
                            <p className="text-2xl font-semibold bg-secondary text-secondary-foreground px-4 py-2 rounded inline-block">
                                {reservationCode}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">Lütfen bu kodu referans için saklayınız.</p>
                        </div>
                    )}

                    {paymentStatus.status !== 'loading' && (
                        <p className="text-sm text-muted-foreground">
                            Rezervasyon detaylarınız e-posta adresinize gönderilmiştir.
                        </p>
                    )}

                    <div className="space-y-3">
                        <Button asChild size="lg" className="w-full">
                            <Link href="/">
                                Ana Sayfaya Dön
                            </Link>
                        </Button>
                        
                        {paymentStatus.status === 'failed' && (
                            <Button asChild variant="outline" size="lg" className="w-full">
                                <Link href="/iletisim">
                                    Destek ile İletişime Geç
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Suspense kullanımı, searchParams'ın Client Component'larda okunması için önerilir.
export default function ReservationSuccessPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-foreground">Yükleniyor...</div>}>
            <SuccessContent />
        </Suspense>
    )
} 