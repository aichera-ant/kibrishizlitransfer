'use client' // searchParams kullanmak için Client Component

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react' // Daha uygun bir ikon
import { Button } from "@/components/ui/button"

function SuccessContent() {
    const searchParams = useSearchParams()
    const reservationCode = searchParams.get('code')

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
            <div className="bg-card border border-border p-8 rounded-lg shadow-xl text-center max-w-lg">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-primary mb-4">Rezervasyon Başarılı!</h1>
                <p className="text-lg mb-6 text-foreground">
                    Transfer rezervasyonunuz başarıyla alınmıştır.
                </p>
                {reservationCode ? (
                    <div className="mb-6">
                        <p className="text-sm text-muted-foreground mb-1">Rezervasyon Kodunuz:</p>
                        <p className="text-2xl font-semibold bg-secondary text-secondary-foreground px-4 py-2 rounded inline-block">
                            {reservationCode}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">Lütfen bu kodu referans için saklayınız.</p>
                    </div>
                ) : (
                    <p className="text-destructive">Rezervasyon kodu bulunamadı.</p>
                )}
                <p className="text-sm mb-6 text-muted-foreground">
                    Rezervasyon detaylarınız ve onayınız e-posta adresinize gönderilecektir.
                </p>
                <Button asChild size="lg">
                    <Link href="/">
                        Yeni Rezervasyon Yap
                    </Link>
                </Button>
            </div>
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