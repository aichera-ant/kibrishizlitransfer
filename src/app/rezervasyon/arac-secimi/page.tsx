'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import Image from 'next/image';

import { Users, BaggageClaim, ArrowRight } from 'lucide-react';

import { tr } from 'date-fns/locale';


// API yanıt tipi (aynen)
interface AvailableVehicleOption {
    vehicle_id: number;
    vehicle_name: string;
    vehicle_capacity: number;
    image_url?: string | null;
    transfer_type: 'private' | 'shared';
    price_type: 'per_vehicle' | 'per_person';
    base_price: number;
    calculated_price: number;
    currency: string;
}

// Lokasyon adı state'i için
interface LocationInfo {
    id: string;
    name: string;
}

function VehicleSelectionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State'ler (ekstralar ve genel seçim kaldırıldı)
    const [vehicleOptions, setVehicleOptions] = useState<AvailableVehicleOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pickupLocationName, setPickupLocationName] = useState<string | null>(null);
    const [dropoffLocationName, setDropoffLocationName] = useState<string | null>(null);

    // URL'den parametreleri al (aynen)
    const pickupLocationId = searchParams.get('pickup');
    const dropoffLocationId = searchParams.get('dropoff');
    const dateISO = searchParams.get('date');
    const passengers = searchParams.get('passengers');

    // Verileri fetch etme (Sadece araçlar ve lokasyon isimleri)
    useEffect(() => {
        if (!pickupLocationId || !dropoffLocationId || !passengers) {
            setError('Gerekli rota bilgileri eksik.');
            setIsLoading(false);
            return;
        }

        const fetchOptions = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
                
                // Araçları fetch et
                const vehicleParams = new URLSearchParams({
                    pickup_location_id: pickupLocationId,
                    dropoff_location_id: dropoffLocationId,
                    passenger_count: passengers,
                });
                const vehiclesRes = await fetch(`${apiBaseUrl}/vehicles/available?${vehicleParams.toString()}`);
                if (!vehiclesRes.ok) throw new Error(`Araçlar alınamadı: ${vehiclesRes.statusText}`);
                const vehiclesData = await vehiclesRes.json();
                setVehicleOptions(vehiclesData.data || []);

                // Lokasyon isimlerini fetch et (Basit GET /locations kullandık, ID ile filtreleme yoksa tümünü çeker)
                const locationsRes = await fetch(`${apiBaseUrl}/locations`);
                 if (!locationsRes.ok) throw new Error(`Lokasyonlar alınamadı: ${locationsRes.statusText}`);
                const locationsData = await locationsRes.json();
                const locationsList: LocationInfo[] = locationsData.data || [];
                setPickupLocationName(locationsList.find(l => l.id.toString() === pickupLocationId)?.name || `ID: ${pickupLocationId}`);
                setDropoffLocationName(locationsList.find(l => l.id.toString() === dropoffLocationId)?.name || `ID: ${dropoffLocationId}`);

            } catch (error: unknown) {
                console.error('Transfer seçenekleri yüklenirken hata:', error);
                let message = 'Araç seçenekleri yüklenirken bir hata oluştu.';
                if (error instanceof Error) {
                    message = error.message;
                }
                setError(message);
                setVehicleOptions([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOptions();
    }, [pickupLocationId, dropoffLocationId, passengers]);

    // Araç seçimi ve yönlendirme fonksiyonu
    const handleSelectVehicle = (option: AvailableVehicleOption) => {
        if (!pickupLocationId || !dropoffLocationId || !dateISO || !passengers) {
             alert('Rota bilgileri eksik, lütfen geri dönüp tekrar deneyin.');
             return;
        }
        
        const queryParams = new URLSearchParams({
            pickup: pickupLocationId,
            dropoff: dropoffLocationId,
            date: dateISO,
            passengers: passengers,
            vehicleId: option.vehicle_id.toString(),
            transferType: option.transfer_type,
            price: option.calculated_price.toFixed(2) // Hesaplanan fiyatı sonraki adıma gönderelim
        });

        // Extras parametresi kaldırıldı
        router.push(`/rezervasyon/detay?${queryParams.toString()}`);
    };

    // ----- Render ----- //

    if (isLoading) {
        return <div className="container mx-auto px-4 py-12 md:py-20 text-center">Araç Seçenekleri Yükleniyor...</div>;
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-12 md:py-20 text-center">
                <h1 className="text-2xl font-bold text-destructive">Hata</h1>
                <p className="text-muted-foreground mt-2">{error}</p>
            </div>
        );
    }
    
    if (vehicleOptions.length === 0) {
         return (
            <div className="container mx-auto px-4 py-12 md:py-20 text-center">
                <h1 className="text-2xl font-bold">Uygun Araç Bulunamadı</h1>
                <p className="text-muted-foreground mt-2">Seçtiğiniz kriterlere uygun araç bulunamadı. Lütfen tarih veya yolcu sayısını değiştirerek tekrar deneyin.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 md:py-20 space-y-8">
            {/* Başlık ve Rota Özeti */}
            <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-2 text-primary">Araç Seçimi</h1>
                {dateISO && (
                    <p className="text-center text-muted-foreground text-lg">
                        {pickupLocationName || 'Nereden'} <ArrowRight className="inline h-5 w-5 mx-1"/> {dropoffLocationName || 'Nereye'} <br/>
                        {format(new Date(dateISO), 'dd MMMM yyyy', { locale: tr })} - {passengers} Yolcu
                    </p>
                )}
            </div>

            {/* Araç Listesi */} 
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicleOptions.map((option) => {
                    const key = `${option.vehicle_id}_${option.transfer_type}`;
                    
                    // Araç ismine göre lokal resim kullanma
                    let imageUrl = option.image_url;
                    // API'den gelen adı normalleştir: küçük harf, boşluksuz
                    const normalizedVehicleName = option.vehicle_name.toLowerCase().replace(/\s+/g, '');

                    if (normalizedVehicleName.includes('vito')) {
                        imageUrl = '/mercedes-vito-siyah.jpg';
                    } else if (normalizedVehicleName.includes('sprinter')) {
                        imageUrl = '/mercedes-sprinter-siyah.jpg';
                    }
                    
                    return (
                        <Card key={key} className="overflow-hidden flex flex-col md:flex-row border-border/40 hover:shadow-md transition-shadow">
                            {/* Sol Taraf: Resim */}
                            <div className="md:w-1/3 bg-muted flex items-center justify-center p-4">
                                {imageUrl ? (
                                    <Image src={imageUrl} alt={option.vehicle_name} width={200} height={120} className="object-contain rounded max-h-[120px]" />
                                ) : (
                                    <div className="w-full h-[120px] bg-secondary rounded flex items-center justify-center text-muted-foreground text-sm">Resim Yok</div>
                                )}
                            </div>
                            
                            {/* Orta Bölüm: Bilgiler */}
                            <div className="flex-1 p-4 md:p-6 space-y-3">
                                <h3 className={`text-xl font-semibold ${option.transfer_type === 'private' ? 'text-blue-700' : 'text-green-700'}`}>
                                    {option.transfer_type === 'private' ? 'Özel Transfer' : 'Paylaşımlı Transfer'}
                                </h3>
                                <div>
                                    <p className="text-xs text-muted-foreground">Güzergah</p>
                                    <p className="font-medium">{pickupLocationName || 'Nereden'} ➜ {dropoffLocationName || 'Nereye'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Araç İsmi</p>
                                        <p className="font-medium">{option.vehicle_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Yolcu Kapasitesi</p>
                                        <p className="font-medium flex items-center"><Users className="w-3 h-3 mr-1"/> {option.vehicle_capacity} kişi</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Uzaklık & Süre</p>
                                        <p className="font-medium text-muted-foreground">0.0 km / 0 dk</p> {/* Placeholder */} 
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Valiz Sayısı</p>
                                        <p className="font-medium flex items-center"><BaggageClaim className="w-3 h-3 mr-1"/> {option.vehicle_capacity} valiz</p> {/* Placeholder, kapasite ile aynı varsayıldı */} 
                                    </div>
                                </div>
                                {/* Paylaşımlıysa ek fiyatlar (opsiyonel) */}
                                {option.transfer_type === 'shared' && option.price_type === 'per_person' && (
                                    <div className="pt-2">
                                        <p className="text-xs text-muted-foreground mb-1">Kişi Sayısına Göre Fiyatlar</p>
                                        <div className="flex flex-wrap gap-2">
                                            {[...Array(option.vehicle_capacity)].map((_, i) => (
                                                <Button key={i+1} variant="outline" size="sm" className={`text-xs h-7 px-2 ${i+1 === parseInt(passengers || '1') ? 'border-primary text-primary' : 'border-border/50'}`}>
                                                    {i+1} Kişi {(option.base_price * (i+1)).toFixed(0)} TL
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sağ Taraf: Fiyat ve Buton */} 
                            <div className="md:w-1/4 bg-secondary/30 p-4 md:p-6 flex flex-col items-center justify-center text-center border-t md:border-t-0 md:border-l border-border/30 space-y-3">
                                 <p className="text-2xl md:text-3xl font-bold text-primary">{option.calculated_price.toFixed(2)} <span className="text-lg font-normal">TL</span></p>
                                 {option.price_type === 'per_person' && (
                                     <p className="text-xs text-muted-foreground -mt-2">({option.base_price.toFixed(0)} TL / kişi)</p>
                                 )}
                                <Button 
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
                                    onClick={() => handleSelectVehicle(option)}
                                >
                                    Rezervasyon Yap
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Ek Hizmetler ve Toplam Fiyat kaldırıldı */} 
            
        </div>
    );
}

// Ana Export (Suspense ile)
export default function VehicleSelectionPage() { // İsmi değiştir
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-12 md:py-20 text-center">Yükleniyor...</div>}>
            <VehicleSelectionContent />
        </Suspense>
    );
} 