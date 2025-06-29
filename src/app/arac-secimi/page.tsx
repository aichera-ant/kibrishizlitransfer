'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AracSecimiContent, { AracSecimiContentProps, VehicleTypeOption } from './arac-secimi-content';
import { Loader2 } from 'lucide-react'; // Yüklenme ikonu için
// import type { Database } from '@/types/supabase'; // Eğer Database enumları gibi şeyler gerekirse diye import edilebilir

// --- Arayüzler ---
interface Location {
    id: number;
    name: string;
    type?: string; // type alanı locations tablosunda var mı kontrol edilmeli, supabase.ts'de var.
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
}

// --- Veri Çekme Fonksiyonları (İstemci tarafı) ---

async function getLocationsClient(): Promise<Location[]> {
	try {
        // NEXT_PUBLIC_API_BASE_URL kullanımı /api/locations şeklinde değiştirilecek, çünkü aynı Next.js projesi içinde.
		const response = await fetch(`/api/locations?limit=1000`, { cache: 'no-store' }); // Yerel API yolu
		if (!response.ok) throw new Error(`Failed to fetch locations: ${response.statusText}`);
		const data = await response.json();
        // /api/locations endpoint'inin yanıt yapısı data: { data: [] } şeklinde mi, yoksa doğrudan { data: [] } mı kontrol edilecek.
        // Şimdilik data.data varsayımıyla devam, eğer endpoint doğrudan array dönüyorsa data direkt kullanılır.
		return (data.data || data || []) as Location[]; // data.data veya data olabilir
	} catch (err) {
		console.error('[Client Fetch Error] Error in getLocationsClient:', err);
		return []; // Hata durumunda boş dizi dön
	}
}

async function getAvailableVehicleTypesClient(searchParams: URLSearchParams): Promise<{ options: VehicleTypeOption[]; error: string | null }> {
	const pickupId = searchParams.get('pickup');
	const dropoffId = searchParams.get('dropoff');
	// const date = searchParams.get('date'); // date kaldırıldı
	const passengers = searchParams.get('passengers');

	// if (!pickupId || !dropoffId || !date || !passengers) { // date kontrolü kaldırıldı
	if (!pickupId || !dropoffId || !passengers) {
		return { options: [], error: 'Eksik arama parametreleri (pickup, dropoff, passengers).' };
	}

	try {
        // API endpoint'i /api/available-vehicle-types olarak güncellendi
		const queryParams = new URLSearchParams({
			pickup_location_id: pickupId,
			dropoff_location_id: dropoffId,
			// date: date, // date parametresi kaldırıldı
			passenger_count: passengers,
		});
		const fetchUrl = `/api/available-vehicle-types?${queryParams.toString()}`; // Yerel API yolu
		const response = await fetch(fetchUrl, { cache: 'no-store' });

		if (!response.ok) {
			let errorMessage = `API Hatası (${response.status})`;
			try {
				const errorData = await response.json();
				errorMessage = errorData.error || errorData.message || `${errorMessage} - ${response.statusText}`;
			} catch { errorMessage = `${errorMessage} - ${response.statusText}.`; }
			return { options: [], error: errorMessage };
		}

		const data = await response.json(); // Yeni API doğrudan { options: [], error: null } döner
		return { options: data.options || [], error: data.error || null };

	} catch (err: unknown) {
        let errorMessage = 'Araç tipi seçenekleri alınırken beklenmedik bir hata oluştu.';
        if (err instanceof Error) { errorMessage = err.message; }
		return { options: [], error: errorMessage };
	}
}

// --- İSTEMCİ BİLEŞENİ İÇERİĞİ ---
function AracSecimiPageContent() {
    const searchParamsHook = useSearchParams();
    const [locations, setLocations] = useState<Location[]>([]);
    const [transferOptions, setTransferOptions] = useState<VehicleTypeOption[]>([]); // Tip VehicleTypeOption[] olarak güncellendi
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const currentSearchParams = new URLSearchParams(searchParamsHook.toString());
        
        // Gerekli parametreler yoksa işlem yapma (date kontrolü kaldırıldı)
        if (!currentSearchParams.has('pickup') || 
            !currentSearchParams.has('dropoff') || 
            // !currentSearchParams.has('date') || 
            !currentSearchParams.has('passengers'))
        {
            setError("Gerekli arama parametreleri (pickup, dropoff, passengers) URL'de bulunamadı.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const fetchData = async () => {
            try {
                const [fetchedLocations, fetchedTransferResult] = await Promise.all([
                    getLocationsClient(),
                    getAvailableVehicleTypesClient(currentSearchParams) // Fonksiyon adı güncellendi
                ]);

                setLocations(fetchedLocations);
                setTransferOptions(fetchedTransferResult.options);
                setError(fetchedTransferResult.error);

            } catch (err: unknown) {
                console.error("[Client Component Error] Error fetching page data:", err);
                let message = 'Veriler yüklenirken istemci tarafında bir hata oluştu.';
                if (err instanceof Error) { message = err.message; }
                setError(message);
                setTransferOptions([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [searchParamsHook]); // searchParamsHook değiştiğinde tekrar çalıştır

    // AracSecimiContent'e gönderilecek propsları hazırla (date ile ilgili kısımlar kaldırıldı)
    const pickupIdStr = searchParamsHook.get('pickup');
    const dropoffIdStr = searchParamsHook.get('dropoff');
    const dateStr = searchParamsHook.get('date'); // date is needed for AracSecimiContentProps
    const passengersStr = searchParamsHook.get('passengers');

    const pickupLocation = locations.find(loc => loc.id === parseInt(pickupIdStr || '0', 10));
    const dropoffLocation = locations.find(loc => loc.id === parseInt(dropoffIdStr || '0', 10));

	const clientProps: AracSecimiContentProps = {
        transferOptions: transferOptions,
        transferError: error,
        searchParams: {
            pickup: pickupIdStr ? parseInt(pickupIdStr, 10) : null,
            dropoff: dropoffIdStr ? parseInt(dropoffIdStr, 10) : null,
            date: dateStr || null, // Reinstated date prop
            passengers: passengersStr ? parseInt(passengersStr, 10) : 1,
			pickupLocationName: pickupLocation?.name,
			dropoffLocationName: dropoffLocation?.name,
            reservationCode: searchParamsHook.get('reservationCode') || undefined
        },
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-12 md:py-20 text-center flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Araç seçenekleri yükleniyor...</p>
            </div>
        );
    }

    // Hata veya veri olmama durumu AracSecimiContent içinde daha detaylı yönetilebilir.
    // return <AracSecimiContent {...clientProps} />;
    // Şimdilik hata varsa basit bir mesaj gösterelim:
    if (error && transferOptions.length === 0) {
         return (
            <div className="container mx-auto px-4 py-12 md:py-20 text-center">
                <h1 className="text-2xl font-bold text-destructive">Hata</h1>
                <p className="text-muted-foreground mt-2">{error}</p>
                {/* Geri butonu eklenebilir */}
            </div>
        );
    }

     if (!isLoading && transferOptions.length === 0 && !error) {
         return (
            <div className="container mx-auto px-4 py-12 md:py-20 text-center">
                <h1 className="text-2xl font-bold">Uygun Araç Bulunamadı</h1>
                <p className="text-muted-foreground mt-2">Seçtiğiniz kriterlere uygun araç bulunamadı. Lütfen tarih veya yolcu sayısını değiştirerek tekrar deneyin.</p>
            </div>
        );
    }
    
    return <AracSecimiContent {...clientProps} />;
}


// --- ANA EXPORT (Suspense ile) ---
export default function AracSecimiPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-12 md:py-20 text-center flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Sayfa yükleniyor...</p>
            </div>
        }>
            <AracSecimiPageContent />
        </Suspense>
    );
}

// Skeleton Loader (Kullanılmıyorsa kaldırılabilir)
/*
function AracSecimiSkeleton() {
	// ...
}
*/ 