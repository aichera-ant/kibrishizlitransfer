'use client'

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { LatLngBoundsExpression } from 'leaflet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, ServerCrash, CheckCircle, MapPin, CalendarDays, Car, Users as UsersIcon, Hash, Receipt, ClockIcon, User, Phone, Mail, StickyNote, BadgeCheckIcon, Hourglass, Star, Printer, Send } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

// --- TypeScript Arayüzleri ---
interface LocationResource {
  id: number;
  name: string;
  type: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

// Ekstra hizmet için arayüz
export interface ExtraData {
  id: number;
  name: string;
  description?: string | null;
  price: number; 
}

interface VehicleResource {
  id: number;
  name: string;
  type?: string; // Opsiyonel
  capacity?: number; // Opsiyonel yapıldı (? eklendi)
  image_url?: string | null; // Opsiyonel araç görseli
}

export interface ReservationData {
  id: number;
  code: string; // Rezervasyon Kodu (örn: RES-F3ICEUAF)
  user_id?: number | null; // İlişkili kullanıcı ID'si (varsa)
  vehicle_id: number;
  pickup_location_id: number;
  dropoff_location_id: number;
  reservation_time: string; // ISO 8601 formatında tarih ve saat
  passenger_count: number;
  customer_name: string;
  customer_last_name?: string | null; // Müşteri Soyadı
  customer_email: string;
  customer_phone: string;
  flight_number?: string | null; // Uçuş Kodu (varsa)
  notes?: string | null; // Ek Notlar (varsa)
  total_price: number; // Toplam Fiyat (sayısal)
  status: string; // Rezervasyon Durumu (örn: 'Beklemede', 'Onaylandı', 'İptal Edildi')
  payment_status: string; // Ödeme Durumu (örn: 'Ödeme Bekliyor', 'Ödendi', 'İade Edildi')
  created_at: string; // Oluşturulma tarihi (ISO 8601)
  updated_at: string; // Güncellenme tarihi (ISO 8601)

  // İlişkili veriler (API'den geliyorsa)
  vehicle?: VehicleResource | null;
  pickup_location?: LocationResource | null;
  dropoff_location?: LocationResource | null;
  extras?: ExtraData[] | null; // Ekstra hizmetler dizisi (opsiyonel)
  // user?: UserResource | null; // İhtiyaç olursa eklenebilir
  // supplier?: SupplierResource | null; // İhtiyaç olursa eklenebilir
}

interface ApiErrorResponse { message: string; }

// Harita component'inden tipleri import et
import type { MarkerData, RouteInfo } from '@/components/map-display'

// ... (formatCurrency, formatIsoDateTime fonksiyonları) ...
const formatCurrency = (amount: number | undefined, currencyCode: string = 'TRY'): string => {
  if (amount === undefined || isNaN(amount)) return 'Fiyat Yok'; 
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};
const formatIsoDateTime = (isoString: string | null | undefined): string => {
  if (!isoString) return '-';
  try { return format(parseISO(isoString), 'dd MMMM yyyy EEEE HH:mm', { locale: tr }); }
  catch (error) { console.error('ISO tarih formatlama hatası:', error); return 'Geçersiz Tarih'; }
};

// --- Yeni Helper Fonksiyonlar ---
// Metreyi kilometreye çevirip formatla
const formatDistance = (distanceInMeters: number | undefined): string => {
  if (distanceInMeters === undefined || isNaN(distanceInMeters)) return '-';
  const distanceInKm = distanceInMeters / 1000;
  return `${distanceInKm.toFixed(1)} km`; // Bir ondalık basamak
};

// Saniyeyi dakika veya saate çevirip formatla
const formatDuration = (durationInSeconds: number | undefined): string => {
  if (durationInSeconds === undefined || isNaN(durationInSeconds)) return '-';
  const minutes = Math.round(durationInSeconds / 60);
  if (minutes < 60) {
    return `${minutes} dakika`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} saat ${remainingMinutes} dakika`;
};

// --- Harita Component'ini Dinamik Olarak Yükle ---
const MapDisplay = dynamic(() => import('@/components/map-display'), {
    ssr: false,
    loading: () => <div className="flex justify-center items-center h-[400px] bg-muted rounded"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/> Harita Yükleniyor...</div>
});

// --- Status Badge Helper ---
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  const lowerStatus = status?.toLowerCase();
  if (lowerStatus === 'onaylandı' || lowerStatus === 'tamamlandı' || lowerStatus === 'ödendi') {
    return 'outline';
  }
  if (lowerStatus === 'iptal edildi' || lowerStatus === 'başarısız') {
    return 'destructive';
  }
  if (lowerStatus === 'beklemede' || lowerStatus === 'ödeme bekleniyor') {
    return 'secondary';
  }
  return 'secondary'; // Varsayılan
};

const getStatusIcon = (status: string): React.ReactNode => {
    const lowerStatus = status?.toLowerCase();
    if (lowerStatus === 'onaylandı' || lowerStatus === 'tamamlandı' || lowerStatus === 'ödendi') {
      return <BadgeCheckIcon className="mr-1.5 h-4 w-4" />;
    }
    if (lowerStatus === 'iptal edildi' || lowerStatus === 'başarısız') {
      return <ServerCrash className="mr-1.5 h-4 w-4" />;
    }
    if (lowerStatus === 'beklemede' || lowerStatus === 'ödeme bekleniyor') {
      return <Hourglass className="mr-1.5 h-4 w-4" />;
    }
    return <ClockIcon className="mr-1.5 h-4 w-4" />; // Varsayılan
}

// --- Durum Metinlerini Türkçeleştirme Fonksiyonu ---
const translateStatus = (status: string | null | undefined): string => {
  if (!status) return 'Bilinmiyor';
  const lowerStatus = status.toLowerCase();
  switch (lowerStatus) {
    case 'pending': return 'Beklemede';
    case 'pending_confirmation': return 'Onay Bekliyor';
    case 'confirmed': return 'Onaylandı';
    case 'cancelled': return 'İptal Edildi';
    case 'completed': return 'Tamamlandı';
    case 'paid': return 'Ödendi';
    case 'unpaid': return 'Ödenmedi';
    case 'refunded': return 'İade Edildi';
    // Eklemek istediğiniz diğer durumlar buraya eklenebilir
    default: return status; // Eşleşme yoksa orijinal metni döndür
  }
};

function ReservationSuccessContent() {
  const searchParams = useSearchParams();
  const codeValueFromUrl = searchParams.get('code');

  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false); // İstemci tarafı render kontrolü için state

  // --- Harita için verileri hazırla ---
  const [mapMarkers, setMapMarkers] = useState<MarkerData[]>([]);
  const [mapBounds, setMapBounds] = useState<LatLngBoundsExpression | undefined>(undefined);
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.1264, 33.4299]);
  const [mapZoom, setMapZoom] = useState<number>(9);
  // --- Rota bilgisi için yeni state'ler ---
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  // --- E-posta Tekrar Gönderme State'leri ---
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Koordinatları useMemo ile memoize et
  const pickupCoords = useMemo(() => {
    if (reservation?.pickup_location?.latitude && reservation?.pickup_location?.longitude) {
      return [reservation.pickup_location.latitude, reservation.pickup_location.longitude] as [number, number];
    }
    return null;
  }, [reservation]); // reservation değişince yeniden hesapla

  const dropoffCoords = useMemo(() => {
    if (reservation?.dropoff_location?.latitude && reservation?.dropoff_location?.longitude) {
      return [reservation.dropoff_location.latitude, reservation.dropoff_location.longitude] as [number, number];
    }
    return null;
  }, [reservation]); // reservation değişince yeniden hesapla

  useEffect(() => {
    if (!codeValueFromUrl) {
      setError("Query parametresi bulunamadı (?id=...). URL'yi kontrol edin." );
      setIsLoading(false);
      return;
    }

    const fetchReservation = async () => {
      setIsLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL
                     ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/reservations/${codeValueFromUrl}`
                     : `/api/reservations/${codeValueFromUrl}`;
      
      console.log(`[ReservationSuccessPage] Fetching reservation with CODE value from 'id' param: ${codeValueFromUrl} from URL: ${apiUrl}`);

      try {
        const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
        console.log(`[ReservationSuccessPage] Fetch response status: ${response.status}`);

        if (!response.ok) {
           if (response.status === 404) {
               console.warn(`[ReservationSuccessPage] GET /reservations/${codeValueFromUrl} failed (404). Trying /by-code/ endpoint...`);
               const apiUrlByCode = process.env.NEXT_PUBLIC_API_BASE_URL
                               ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/reservations/by-code/${codeValueFromUrl}`
                               : `/api/reservations/by-code/${codeValueFromUrl}`;
               
               console.log(`[ReservationSuccessPage] Retrying with URL: ${apiUrlByCode}`);
               const retryResponse = await fetch(apiUrlByCode, { headers: { 'Accept': 'application/json' } });
               console.log(`[ReservationSuccessPage] Retry Fetch response status: ${retryResponse.status}`);

               if (!retryResponse.ok) {
                   let errorMessage = `Rezervasyon detayları alınamadı (Status: ${retryResponse.status}).`;
                   try { const errorData: ApiErrorResponse = await retryResponse.json(); errorMessage = errorData.message || errorMessage; } catch { /* jsonError unused */ errorMessage = retryResponse.statusText || errorMessage; }
                   throw new Error(errorMessage);
               }
               const responseData = await retryResponse.json();
               console.log('[ReservationSuccessPage] Parsed response data (after retry):', JSON.stringify(responseData, null, 2));
               processSuccessfulResponse(responseData);
               return;
           }
           
           let errorMessage = `Rezervasyon detayları alınamadı (${response.status}).`;
           try { const errorData: ApiErrorResponse = await response.json(); errorMessage = errorData.message || errorMessage; } catch { /* jsonError unused */ errorMessage = response.statusText || errorMessage; }
           throw new Error(errorMessage);
        }
        
        const responseData = await response.json();
        console.log('[ReservationSuccessPage] Parsed response data (first try):', JSON.stringify(responseData, null, 2));
        processSuccessfulResponse(responseData);

      } catch (err: unknown) {
        console.error("Rezervasyon fetch hatası:", err);
        let errorMessage = "Bilinmeyen bir hata oluştu.";
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        console.log('[ReservationSuccessPage] Fetch process finished.');
      }
    };

    const processSuccessfulResponse = (responseData: ReservationData | {data: ReservationData}) => {
      let foundData: ReservationData | null = null;
      if (responseData && 'data' in responseData && typeof responseData.data === 'object' && responseData.data?.code) {
          foundData = responseData.data;
      } else if (responseData && 'code' in responseData) {
          foundData = responseData as ReservationData;
      }

      if (foundData) {
          setReservation(foundData);
      } else {
          console.error('[ReservationSuccessPage] Invalid data structure in successful response:', responseData);
          setError("API yanıtında beklenen rezervasyon verisi bulunamadı.");
      }
    }

    fetchReservation();
  }, [codeValueFromUrl]);

  useEffect(() => {
    // Component mount olduğunda isClient'ı true yap
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (reservation) {
      const markers: MarkerData[] = [];
      const validPositions: [number, number][] = [];

      // Alış Noktası
      if (reservation.pickup_location && 
          typeof reservation.pickup_location.latitude === 'number' && 
          typeof reservation.pickup_location.longitude === 'number') {
        const pos: [number, number] = [reservation.pickup_location.latitude, reservation.pickup_location.longitude];
        markers.push({
          position: pos,
          popupText: `Alış: ${reservation.pickup_location.name}`,
          icon: 'pickup'
        });
        validPositions.push(pos);
      }

      // Bırakış Noktası
      if (reservation.dropoff_location && 
          typeof reservation.dropoff_location.latitude === 'number' && 
          typeof reservation.dropoff_location.longitude === 'number') {
         const pos: [number, number] = [reservation.dropoff_location.latitude, reservation.dropoff_location.longitude];
         markers.push({
           position: pos,
           popupText: `Bırakış: ${reservation.dropoff_location.name}`,
           icon: 'dropoff'
         });
         validPositions.push(pos);
      }

      setMapMarkers(markers);

      // Harita merkezini ve sınırlarını ayarla
      if (validPositions.length > 1) {
          // İki veya daha fazla nokta varsa, haritayı bu noktalara sığdır
          setMapBounds(validPositions);
          // Merkezi veya zoom'u ayrıca ayarlamaya gerek yok, fitBounds halleder
      } else if (validPositions.length === 1) {
          // Sadece bir nokta varsa, haritayı ona ortala
          setMapCenter(validPositions[0]);
          setMapZoom(13); // Tek nokta için daha yakın zoom
          setMapBounds(undefined); // Bounds'u temizle
      } else {
          // Hiç geçerli nokta yoksa varsayılan merkez ve zoom'da kalsın
          setMapCenter([35.1264, 33.4299]);
          setMapZoom(9);
          setMapBounds(undefined);
      }
    }
  }, [reservation]);

  useEffect(() => {
    if (reservation) {
      setRouteInfo(null);
    }
  }, [reservation]);

  // Callback fonksiyonu: Rota bulunduğunda state'i güncelle
  const handleRouteFound = useCallback((info: RouteInfo) => {
      console.log('[ReservationSuccessPage] Route info received:', info);
      setRouteInfo(info);
  }, []);

  // *** E-posta Tekrar Gönderme Handler ***
  const handleResendEmail = async () => {
    if (!reservation || !reservation.code) {
      setResendStatus('error');
      setResendMessage('Rezervasyon kodu bulunamadı.');
      return;
    }

    setIsResendingEmail(true);
    setResendStatus('idle');
    setResendMessage(null);

    try {
      // ------ BACKEND API ÇAĞRISI GEREKLİ ------
      // Örnek: const response = await apiClient.post(`/reservations/${reservation.code}/resend-email`);
      // Gerçek API endpoint'i ve metodu (POST, GET vb.) backend'e göre ayarlanmalı.
      
      // Şimdilik başarılı varsayalım (simülasyon)
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 saniye bekle
      // if (response.status === 200) { // API'den başarılı yanıt gelirse
        setResendStatus('success');
        setResendMessage(`Rezervasyon ${reservation.code} için onay e-postası tekrar gönderildi.`);
      // } else {
      //   throw new Error('API yanıtı başarısız.');
      // }
      // ------ BACKEND API ÇAĞRISI BİTİŞ ------
      
    } catch (error) {
      console.error('E-posta tekrar gönderme hatası:', error);
      setResendStatus('error');
      setResendMessage('E-posta gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsResendingEmail(false);
      // Mesajın bir süre sonra kaybolmasını sağlayabiliriz
      setTimeout(() => {
        setResendStatus('idle');
        setResendMessage(null);
      }, 5000); // 5 saniye sonra mesajı temizle
    }
  };

  // *** JSX KISMI ***
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="max-w-5xl mx-auto shadow-lg border-green-200">
        <CardHeader className="bg-green-50 border-b border-green-200 rounded-t-lg">
          <CardTitle className="flex items-center text-green-700">
            <CheckCircle className="mr-3 h-7 w-7 flex-shrink-0" />
            <span className="text-xl sm:text-2xl font-semibold">Rezervasyon Başarıyla Oluşturuldu!</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* --- Yüklenme Durumu --- */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Rezervasyon detayları yükleniyor...</p>
              <p className="text-sm text-muted-foreground">Lütfen bekleyin.</p>
            </div>
          )}

          {/* --- Hata Durumu --- */}
          {error && !isLoading && (
            <Alert variant="destructive" className="items-start">
                <ServerCrash className="h-5 w-5 mt-1" />
                <AlertTitle>Bir Hata Oluştu!</AlertTitle>
                <AlertDescription>
                    {error}
                    <br />
                    Lütfen daha sonra tekrar deneyin veya destek ile iletişime geçin.
                </AlertDescription>
            </Alert>
          )}

          {/* --- Rezervasyon Bulunamadı Durumu --- */}
          {!isLoading && !error && !reservation && (
             <Alert variant="destructive">
                <ServerCrash className="h-5 w-5" />
                <AlertTitle>Rezervasyon Bulunamadı</AlertTitle>
                <AlertDescription>
                   Sağlanan kod ile eşleşen bir rezervasyon bulunamadı. Lütfen kodu kontrol edin veya destek ile iletişime geçin.
                </AlertDescription>
             </Alert>
          )}

          {/* --- Başarılı Durum ve Detaylar --- */}
          {!isLoading && !error && reservation && (
            <>
              <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                      Rezervasyon detaylarınız aşağıdadır. Bilgiler ayrıca <strong>{reservation.customer_email}</strong> adresine e-posta olarak gönderilmiştir.
                  </AlertDescription>
              </Alert>

              <p className="text-sm text-center text-muted-foreground italic">
                  (Lokasyonlar için harita gösterimi aşağıdadır)
              </p>

              {/* --- Rezervasyon Kodu --- */}
              <div className="text-center bg-amber-50 border border-amber-200 rounded-md py-3 px-4">
                  <p className="text-sm font-medium text-amber-700 tracking-wide">Rezervasyon Kodunuz:</p>
                  <p className="text-2xl font-bold text-amber-900 tracking-wider">{reservation.code}</p>
              </div>

              <Separator />

              {/* --- Transfer Detayları --- */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-1">Transfer Detayları</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" />
                        <span className="font-medium text-gray-600 w-28 flex-shrink-0">Nereden:</span>
                        <span className="text-gray-800">{reservation.pickup_location?.name ?? 'Bilinmiyor'}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span className="font-medium text-gray-600 w-28 flex-shrink-0">Nereye:</span>
                        <span className="text-gray-800">{reservation.dropoff_location?.name ?? 'Bilinmiyor'}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                        <CalendarDays className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                        <span className="font-medium text-gray-600 w-28 flex-shrink-0">Transfer Tarihi:</span>
                        <span className="text-gray-800">{formatIsoDateTime(reservation.reservation_time)}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                        <Car className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                        <span className="font-medium text-gray-600 w-28 flex-shrink-0">Araç:</span>
                        <span className="text-gray-800">{reservation.vehicle?.type ?? 'Bilinmiyor'} ({reservation.vehicle?.capacity ?? '?'} Kişi)</span>
                    </div>
                    <div className="flex items-start space-x-2">
                        <UsersIcon className="h-4 w-4 mt-0.5 text-teal-600 flex-shrink-0" />
                        <span className="font-medium text-gray-600 w-28 flex-shrink-0">Yolcu Sayısı:</span>
                        <span className="text-gray-800">{reservation.passenger_count}</span>
                    </div>
                    {reservation.flight_number && (
                        <div className="flex items-start space-x-2">
                            <Hash className="h-4 w-4 mt-0.5 text-indigo-600 flex-shrink-0" />
                            <span className="font-medium text-gray-600 w-28 flex-shrink-0">Uçuş Kodu:</span>
                            <span className="text-gray-800">{reservation.flight_number}</span>
                        </div>
                    )}
                    {/* Mesafe ve Süre Bilgisi */} 
                    {routeInfo && (
                        <>
                            <div className="flex items-start space-x-2">
                                <MapPin className="h-4 w-4 mt-0.5 text-orange-600 flex-shrink-0" />
                                <span className="font-medium text-gray-600 w-28 flex-shrink-0">Tahmini Mesafe:</span>
                                <span className="text-gray-800">{formatDistance(routeInfo.distance)}</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <ClockIcon className="h-4 w-4 mt-0.5 text-orange-600 flex-shrink-0" />
                                <span className="font-medium text-gray-600 w-28 flex-shrink-0">Tahmini Süre:</span>
                                <span className="text-gray-800">{formatDuration(routeInfo.duration)}</span>
                            </div>
                        </>
                    )}
                </div>
              </div>

              {/* --- Ek Hizmetler --- */}
              {reservation.extras && reservation.extras.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-md font-semibold text-gray-700 flex items-center border-t pt-3"><Star className="h-4 w-4 mr-2 text-amber-500" /> Seçilen Ek Hizmetler:</h4>
                    <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-gray-600">
                       {reservation.extras.map((extra) => (
                           <li key={extra.id}>
                               {extra.name} 
                               {extra.price > 0 && (
                                   <span className="text-xs text-muted-foreground"> ({formatCurrency(extra.price)})</span>
                               )}
                           </li>
                       ))}
                    </ul>
                </div>
              )}

              <Separator />

              {/* --- Ek Notlar --- */}
              {reservation.notes && (
                <div className="space-y-1">
                    <h4 className="text-md font-semibold text-gray-700 flex items-center"><StickyNote className="h-4 w-4 mr-2 text-gray-500" /> Ek Notlar:</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 border rounded p-3 whitespace-pre-wrap">{reservation.notes}</p>
                </div>
              )}

              <Separator />

              {/* --- Müşteri Bilgileri --- */}
               <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-1">Müşteri Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-600 w-28 flex-shrink-0">Ad Soyad:</span>
                        <span className="text-gray-800">{`${reservation.customer_name || ''} ${reservation.customer_last_name || ''}`.trim()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-600 w-28 flex-shrink-0">Telefon:</span>
                        <span className="text-gray-800">{reservation.customer_phone}</span>
                    </div>
                     <div className="flex items-center space-x-2 md:col-span-2">
                        <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-600 w-28 flex-shrink-0">E-posta:</span>
                        <span className="text-gray-800">{reservation.customer_email}</span>
                    </div>
                </div>
              </div>

              <Separator />

              {/* --- Fiyat ve Durum Bilgileri --- */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                   <div className="flex flex-col items-center sm:items-start bg-blue-50 p-3 rounded border border-blue-100">
                      <div className="flex items-center font-medium text-blue-700 mb-1">
                          <Receipt className="h-4 w-4 mr-1.5" />
                          <span>Toplam Ücret</span>
                      </div>
                      <span className="text-xl font-bold text-blue-900">{formatCurrency(reservation.total_price)}</span>
                   </div>
                   <div className="flex flex-col items-center sm:items-start bg-gray-50 p-3 rounded border border-gray-100">
                       <div className="flex items-center font-medium text-gray-700 mb-1">
                           {getStatusIcon(reservation.status)}
                           <span>Rezervasyon Durumu</span>
                       </div>
                       {/* Durumu Türkçeleştir */}
                       <Badge variant={getStatusBadgeVariant(reservation.status)} className="capitalize">
                         {translateStatus(reservation.status) || 'Bilinmiyor'}
                       </Badge>
                   </div>
                    <div className="flex flex-col items-center sm:items-start bg-gray-50 p-3 rounded border border-gray-100">
                       <div className="flex items-center font-medium text-gray-700 mb-1">
                           {getStatusIcon(reservation.payment_status)}
                           <span>Ödeme Durumu</span>
                       </div>
                       {/* Durumu Türkçeleştir */}
                       <Badge variant={getStatusBadgeVariant(reservation.payment_status)} className="capitalize">
                         {translateStatus(reservation.payment_status) || 'Bilinmiyor'}
                       </Badge>
                   </div>
              </div>

              <Separator />

              {/* --- Harita --- */}
              <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Transfer Rotası</h3>
                  {isClient && reservation && pickupCoords && dropoffCoords && (
                    <div className="rounded-lg overflow-hidden border">
                        <MapDisplay
                            key={reservation.code}
                            center={ 
                                pickupCoords // Memoize edilmiş pickupCoords'u kullan
                                ? pickupCoords
                                : mapCenter
                            }
                            zoom={mapZoom}
                            mapHeight="350px"
                            pickupCoords={pickupCoords} // Memoize edilmiş prop
                            dropoffCoords={dropoffCoords} // Memoize edilmiş prop
                            onRouteFound={handleRouteFound}
                            markers={mapMarkers} 
                            bounds={ (pickupCoords && dropoffCoords) ? undefined : mapBounds}                           
                        />
                    </div>
                  )}
                  {/* Harita gösterilemiyorsa mesaj */}
                  {(!isClient || !pickupCoords || !dropoffCoords) && (
                    <div className="text-center text-sm text-muted-foreground py-4 px-3 bg-gray-50 border rounded">
                      (Rota çizimi için gerekli lokasyon koordinatları bulunamadı)
                    </div>
                  )}
              </div>

              {/* --- Yeni Rezervasyon Butonu --- */}
              {/* Buton Alanı - Flex Container */} 
              <div className="text-center pt-6 space-y-4 sm:space-y-0 sm:flex sm:justify-center sm:items-center sm:space-x-4">
                  <Button
                      onClick={() => window.location.href = '/'} // Ana sayfaya yönlendir
                      size="lg"
                      className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white"
                  >
                      Yeni Rezervasyon Yap
                  </Button>
                  
                  {/* Yazdır Butonu */} 
                  <Button
                      onClick={() => window.print()}
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto"
                  >
                      <Printer className="mr-2 h-4 w-4" />
                      Yazdır
                  </Button>

                  {/* E-posta Gönder Butonu */} 
                  <Button
                      onClick={handleResendEmail} // Henüz tanımlanmadı
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={isResendingEmail}
                  >
                      {isResendingEmail ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <Send className="mr-2 h-4 w-4" /> 
                      )}
                      {isResendingEmail ? 'Gönderiliyor...' : 'E-posta Gönder'}
                  </Button>
              </div>
              {/* E-posta Gönderme Geri Bildirimi */} 
              {resendMessage && (
                <p className={`text-center text-sm mt-3 ${resendStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {resendMessage}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// *** Ana Sayfa Component'i (Suspense ile sarmalanmış) ***
export default function ReservationSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
      </div>
    }>
      <ReservationSuccessContent />
    </Suspense>
  );
} 