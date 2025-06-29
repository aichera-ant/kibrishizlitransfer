import React from 'react';
// import { Button } from './ui/button'; // Button kaldırıldı
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
// import { MapPin, Calendar, Clock, Users, Sun, Moon, Car, Plane, Info, PlusCircle } from 'lucide-react'; // Clock, Sun, Moon, Plane kaldırıldı
import { MapPin, Calendar, /*Clock,*/ Users, /*Sun, Moon,*/ Car, /*Plane,*/ Info, PlusCircle } from 'lucide-react';
import { type ReservationData, type ExtraData } from '@/app/rezervasyon-basarili/page';
import { Skeleton } from './ui/skeleton';

// YENİ: Para birimi formatlama fonksiyonu
const formatCurrency = (amount: number | undefined, currencyCode: string = 'TRY'): string => {
  if (amount === undefined || isNaN(amount)) {
    return '-'; // Fiyat yoksa veya sayı değilse tire göster
  }
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// YENİ: Seçili Ekstra Detayı Arayüzü
interface SelectedExtraSummary {
  id: number;
  name: string;
  price: number;
}

// Bileşenin alacağı prop'lar için interface güncellendi
interface ReservationSummaryProps {
    reservation?: Partial<ReservationData>;
    isLoading?: boolean;
    currency?: string;
    baseVehiclePrice?: number; // Araç temel fiyatı için yeni prop
}

export function ReservationSummary({ 
	reservation, 
	isLoading, 
    currency = 'TRY',
    baseVehiclePrice // Yeni prop'u al
}: ReservationSummaryProps) {

	// Prop'lardan gelen verileri kullanmak yerine doğrudan reservation objesinden alalım
	const pickupLocationName = reservation?.pickup_location?.name;
    const dropoffLocationName = reservation?.dropoff_location?.name;
    // Tarih formatlama için fonksiyon (gerekirse)
    const formattedReservationDate = reservation?.reservation_time ? formatIsoDateTime(reservation.reservation_time) : undefined;
    const passengerCount = reservation?.passenger_count;
    const selectedVehicleName = reservation?.vehicle?.name; // Veya type
    const totalPrice = reservation?.total_price; // number olmalı
    const selectedExtrasList = reservation?.extras?.map((e: ExtraData) => ({ id: e.id, name: e.name, price: e.price }));

    // Eğer totalPrice string ise number'a çevir
    const numericTotalPrice = typeof totalPrice === 'string' ? parseFloat(totalPrice) : totalPrice;

    if (isLoading) {
        return (
            <Card className="w-full shadow-sm border border-border/40">
                <CardHeader className="bg-muted/30 py-3 px-4 border-b border-border/40">
                     <Skeleton className="h-6 w-3/5" />
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-3/5" />
                        <Skeleton className="h-4 w-2/5" />
                        <Skeleton className="h-4 w-3/5" />
                    </div>
                    <Separator/>
                    <div className="flex items-center justify-between pt-2">
                         <Skeleton className="h-6 w-1/4" />
                         <Skeleton className="h-6 w-1/3" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!reservation) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Rezervasyon Özeti</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Özet bilgisi yüklenemedi.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full shadow-sm border border-border/40">
            <CardHeader className="py-4 px-4">
                <CardTitle className="text-xl font-bold">Rezervasyon Özeti</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Transfer Detayları */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-base text-gray-700">Transfer Detayları</h3>
                    {renderDetailItem(MapPin, 'Nereden', pickupLocationName)}
                    {renderDetailItem(MapPin, 'Nereye', dropoffLocationName)}
                    {renderDetailItem(Calendar, 'Tarih & Saat', formattedReservationDate)}
                    {renderDetailItem(Users, 'Yolcu Sayısı', passengerCount?.toString())}
                    {renderDetailItem(Car, 'Seçilen Araç', selectedVehicleName)}
                    {/* Araç Ücreti BURADAN KESİLDİ */}
                    {/* {renderDetailItem(Info, 'Araç Ücreti', formatCurrency(baseVehiclePrice, currency))} */}
                    {/* {renderDetailItem(Info, 'Transfer Tipi', selectedTransferType)} */}
                </div>

                {/* Araç Ücreti BURAYA TAŞINDI ve Stili Güncellendi */}
                {baseVehiclePrice !== undefined && (
                  <>
                   <Separator />
                    <div className="flex items-center justify-between text-base font-semibold pt-2">
                      <span className="flex items-center text-gray-700">
                        <Info className="w-4 h-4 mr-2 text-muted-foreground" />
                        Araç Ücreti
                      </span>
                      <span className="font-bold text-gray-800">{formatCurrency(baseVehiclePrice, currency)}</span>
                    </div>
                  </>
                )}

                {/* Ek Hizmetler */}
                {selectedExtrasList && selectedExtrasList.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-2">
                            <h3 className="font-semibold text-base text-gray-700">Ek Hizmetler</h3>
                            {selectedExtrasList.map((extra: SelectedExtraSummary) => (
                                <div key={extra.id} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 flex items-center">
                                        <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-green-600"/> {extra.name}
                                    </span>
                                    <span className="font-medium text-gray-800">{formatCurrency(extra.price, currency)}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Toplam Fiyat */}
                <Separator />
                <div className="flex items-center justify-between text-lg font-bold text-primary pt-2">
                    <span className="flex items-center">
                        <Info className="w-5 h-5 mr-2" /> Toplam Ücret
                    </span>
                    <span>{numericTotalPrice !== undefined ? formatCurrency(numericTotalPrice, currency) : 'Seçim Bekleniyor'}</span>
                </div>

            </CardContent>
        </Card>
    );
}

// Yardımcı Render Fonksiyonu (varsa)
const renderDetailItem = (IconComponent: React.ElementType, label: string, value?: string | number | null) => {
    if (!value) return null;
    return (
        <div className="flex items-center text-sm space-x-2">
            <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-gray-600 w-24">{label}:</span>
            <span className="text-gray-800 break-words">{value}</span>
        </div>
    );
};

// ISO tarih formatlama fonksiyonu (başka bir yerde tanımlı değilse)
function formatIsoDateTime(isoString: string): string {
    try {
        // return format(parseISO(isoString), 'dd MMMM yyyy, HH:mm', { locale: tr });
        // format ve tr importları kaldırıldığı için basit formatlama:
        const date = new Date(isoString);
        return date.toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' });
    } catch (error) {
        console.error("Tarih formatlama hatası:", error);
        return isoString; // Hata durumunda orijinal stringi döndür
    }
} 