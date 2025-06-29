'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image'; // Araç resimleri için
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { parseISO } from 'date-fns';

// API yanıt tipleri (Basitleştirilmiş)
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

interface ExtraService {
    id: number;
    name: string;
    description?: string | null;
    price: number;
}

function SelectionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State'ler
    const [vehicleOptions, setVehicleOptions] = useState<AvailableVehicleOption[]>([]);
    const [extras, setExtras] = useState<ExtraService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVehicleKey, setSelectedVehicleKey] = useState<string | null>(null); // vehicleId_transferType
    const [selectedExtraIds, setSelectedExtraIds] = useState<number[]>([]);

    // URL'den parametreleri al
    const pickupLocationId = searchParams.get('pickup');
    const dropoffLocationId = searchParams.get('dropoff');
    const dateISO = searchParams.get('date');
    const passengers = searchParams.get('passengers');
    const reservationDate = dateISO ? parseISO(dateISO) : null;

    // Verileri fetch etme
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

                // Ekstraları fetch et
                const extrasRes = await fetch(`${apiBaseUrl}/extras`);
                if (!extrasRes.ok) throw new Error(`Ek hizmetler alınamadı: ${extrasRes.statusText}`);
                const extrasData = await extrasRes.json();
                setExtras(extrasData.data || []);

            } catch (error: unknown) {
                console.error("Veri yüklenirken hata:", error);
                let message = 'Gerekli veriler yüklenirken bir hata oluştu.';
                if (error instanceof Error) {
                    message = error.message;
                }
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOptions();
    }, [pickupLocationId, dropoffLocationId, passengers]);

    // Seçilen araç objesini bulma
    const selectedVehicleOption = useMemo(() => {
        if (!selectedVehicleKey) return null;
        const [id, type] = selectedVehicleKey.split('_');
        return vehicleOptions.find(opt => opt.vehicle_id === parseInt(id) && opt.transfer_type === type) || null;
    }, [selectedVehicleKey, vehicleOptions]);

    // Seçilen ekstraların objelerini bulma
    const selectedExtras = useMemo(() => {
        return extras.filter(extra => selectedExtraIds.includes(extra.id));
    }, [selectedExtraIds, extras]);

    // Toplam fiyatı hesaplama
    const totalPrice = useMemo(() => {
        let total = selectedVehicleOption?.calculated_price || 0;
        selectedExtras.forEach(extra => total += extra.price);
        return total;
    }, [selectedVehicleOption, selectedExtras]);

    // Ekstra seçimi toggle fonksiyonu
    const handleExtraChange = (extraId: number, checked: boolean) => {
        setSelectedExtraIds(prev => 
            checked ? [...prev, extraId] : prev.filter(id => id !== extraId)
        );
    };

    // Devam et butonu fonksiyonu
    const handleProceed = () => {
        if (!selectedVehicleOption || !pickupLocationId || !dropoffLocationId || !dateISO || !passengers) {
            alert('Lütfen devam etmek için bir araç seçin ve tüm bilgilerin doğru olduğundan emin olun.');
            return;
        }
        
        const queryParams = new URLSearchParams({
            pickup: pickupLocationId,
            dropoff: dropoffLocationId,
            date: dateISO,
            passengers: passengers,
            vehicleId: selectedVehicleOption.vehicle_id.toString(),
            transferType: selectedVehicleOption.transfer_type,
            extras: selectedExtraIds.join(','), // Ekstra ID'lerini virgülle ayırarak gönder
            price: totalPrice.toFixed(2) // Hesaplanan fiyatı gönder
        });

        router.push(`/rezervasyon/detay?${queryParams.toString()}`);
    };

    // ----- Render ----- //

    if (isLoading) {
        return <div className="container mx-auto px-4 py-12 md:py-20 text-center">Seçenekler Yükleniyor...</div>;
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-12 md:py-20 text-center">
                <h1 className="text-2xl font-bold text-destructive">Hata</h1>
                <p className="text-muted-foreground mt-2">{error}</p>
                {/* Geri butonu eklenebilir */}
            </div>
        );
    }
    
    if (vehicleOptions.length === 0) {
         return (
            <div className="container mx-auto px-4 py-12 md:py-20 text-center">
                <h1 className="text-2xl font-bold">Uygun Araç Bulunamadı</h1>
                <p className="text-muted-foreground mt-2">Seçtiğiniz kriterlere uygun araç bulunamadı. Lütfen tarih veya yolcu sayısını değiştirerek tekrar deneyin.</p>
                {/* Geri butonu eklenebilir */}
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 md:py-20 space-y-12">
            {/* Başlık ve Rota Özeti */}
            <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-2 text-primary">Araç ve Hizmet Seçimi</h1>
                {reservationDate && (
                    <p className="text-center text-muted-foreground text-lg">
                        {format(reservationDate, 'dd MMMM yyyy', { locale: tr })} - {passengers} Yolcu
                    </p>
                )}
                {/* Lokasyon isimlerini göstermek için API'den çekmek gerekebilir */}
            </div>

            {/* Araç Seçimi Bölümü */}
            <Card>
                <CardHeader>
                    <CardTitle>Araç Seçenekleri</CardTitle>
                    <CardDescription>Size uygun transfer aracını seçin.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup 
                        value={selectedVehicleKey || undefined} 
                        onValueChange={setSelectedVehicleKey}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {vehicleOptions.map((option) => {
                            const key = `${option.vehicle_id}_${option.transfer_type}`;
                            return (
                                <Label 
                                    key={key} 
                                    htmlFor={key}
                                    className={`border rounded-lg p-4 flex flex-col items-center justify-between cursor-pointer transition-colors hover:bg-muted/50 ${selectedVehicleKey === key ? 'border-primary ring-2 ring-primary' : 'border-border'}`}
                                >
                                    <div className="flex items-center space-x-3 mb-4 w-full">
                                        <RadioGroupItem value={key} id={key} className="sr-only" /> {/* Görünmez Radio */} 
                                        {/* Araç Resmi (Placeholder) */}
                                        {option.image_url ? (
                                             <Image src={option.image_url} alt={option.vehicle_name} width={100} height={60} className="object-contain rounded" />
                                        ) : (
                                            <div className="w-[100px] h-[60px] bg-secondary rounded flex items-center justify-center text-muted-foreground text-sm">Resim Yok</div>
                                        )}
                                        <div className="flex-1">
                                            <p className="font-semibold text-lg">{option.vehicle_name}</p>
                                            <p className="text-sm text-muted-foreground">Kapasite: {option.vehicle_capacity} Yolcu</p>
                                            <p className={`text-sm font-medium ${option.transfer_type === 'private' ? 'text-blue-600' : 'text-green-600'}`}>
                                                {option.transfer_type === 'private' ? 'Özel Transfer' : 'Paylaşımlı Transfer'}
                                            </p>
                                        </div>
                                    </div>
                                    <Separator className="my-2"/>
                                    <div className="text-right w-full mt-2">
                                        <p className="text-xl font-bold text-primary">{option.calculated_price.toFixed(2)} {option.currency}</p>
                                        {option.price_type === 'per_person' && (
                                            <p className="text-xs text-muted-foreground">({option.base_price.toFixed(2)} {option.currency} / kişi)</p>
                                        )}
                                    </div>
                                </Label>
                            );
                        })}
                    </RadioGroup>
                </CardContent>
            </Card>

            {/* Ek Hizmetler Bölümü */}
            {extras.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Ek Hizmetler</CardTitle>
                        <CardDescription>İhtiyaç duyabileceğiniz ek hizmetleri seçin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {extras.map((extra) => (
                            <div key={extra.id} className="flex items-center justify-between space-x-4 p-3 border rounded-md">
                                <div className="flex items-center space-x-3">
                                    <Checkbox 
                                        id={`extra-${extra.id}`}
                                        checked={selectedExtraIds.includes(extra.id)}
                                        onCheckedChange={(checked) => handleExtraChange(extra.id, !!checked)}
                                    />
                                    <Label htmlFor={`extra-${extra.id}`} className="flex flex-col">
                                        <span className="font-medium">{extra.name}</span>
                                        {extra.description && <span className="text-sm text-muted-foreground">{extra.description}</span>}
                                    </Label>
                                </div>
                                <span className="font-semibold text-primary">+{extra.price.toFixed(2)} TL</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Toplam Fiyat ve Devam Butonu */} 
            <Card className="sticky bottom-4 shadow-lg border border-border/50 z-50">
                 <CardContent className="p-4 flex items-center justify-between gap-4">
                     <div>
                         <p className="text-sm text-muted-foreground">Toplam Tutar</p>
                         <p className="text-2xl font-bold text-primary">{totalPrice.toFixed(2)} TL</p>
                     </div>
                     <Button 
                        size="lg" 
                        onClick={handleProceed} 
                        disabled={!selectedVehicleKey} // Araç seçilmeden devam edilemesin
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                         Devam Et
                     </Button>
                 </CardContent>
             </Card>
        </div>
    );
}

// Ana Export (Suspense ile)
export default function SelectionPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-12 md:py-20 text-center">Yükleniyor...</div>}>
            <SelectionContent />
        </Suspense>
    );
} 