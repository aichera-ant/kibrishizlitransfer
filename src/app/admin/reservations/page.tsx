'use client'

import React, { useState, useEffect, useCallback } from 'react'
// import apiClient from '@/lib/api/client' // apiClient kaldırıldı
import { supabase } from '@/lib/supabaseClient' // supabase eklendi
import { type Tables } from '@/types/supabase'; // Added for Supabase table types
import { PostgrestError } from '@supabase/supabase-js'; // Import PostgrestError
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
    DialogTrigger // DialogTrigger eklendi
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog" // AlertDialog eklendi
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
// Lucide ikonları güncellendi/eklendi
import { PlusCircle, Trash2, Search, AlertCircle, Loader2, Filter, Eye, Pencil } from 'lucide-react' // Removed Edit, CheckCircle2, XCircle, Check, ChevronsUpDown
import Link from 'next/link' // Şimdilik kaldırıldı, detay sayfası yerine modal kullanılacak
import { format, parseISO, isValid } from 'date-fns' // isValid eklendi
// import { AxiosError } from 'axios' // Axios kaldırıldı
import { toast, Toaster } from 'sonner' // sonner eklendi
// import { useToast } from "@/hooks/use-toast" // Shadcn useToast yerine sonner kullanılacak
// import { Toaster } from "@/components/ui/toaster" // Shadcn Toaster yerine sonner kullanılacak
import PaginationControls from '@/components/PaginationControls' // PaginationControls eklendi
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert" // Re-adding Alert imports for now

// --- Arayüzler (Interfaces) ---

interface Location {
    id: number;
    name: string;
    bolge_id: number | null;
}

interface Vehicle {
    id: number;
    name: string;
    type: string;
    capacity?: number;
    plate_number?: string;
}

interface Supplier {
    id: number;
    name: string;
}

// Ana Rezervasyon Arayüzü (Supabase Tablosuna Göre)
interface Reservation {
    id: number;
    code: string;
    pickup_location_id: number;
    dropoff_location_id: number;
    vehicle_id: number;
    reservation_time: string; // ISO string formatında
    passenger_count: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    flight_number: string | null;
    notes: string | null;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    total_price: number;
    payment_status: 'pending' | 'paid' | 'refunded'; // 'pending' -> 'unpaid' olabilir, kontrol edilecek
    created_at?: string;
    updated_at?: string;
    supplier_id: number | null;

    // İlişkili verileri göstermek için (opsiyonel, sorguya göre doldurulacak)
    locations?: { // pickup_location için
        name: string;
    } | null;
    dropoff_location?: { // dropoff_location için
        name: string;
    } | null;
    vehicles?: Vehicle | null; // vehicle için
    suppliers?: Supplier | null; // supplier için
}

// Form Verisi Arayüzü (Ekleme/Düzenleme için)
// Not: code ve total_price gibi alanların nasıl ele alınacağına karar verilecek.
// Şimdilik temel alanları içeriyor.
type ReservationFormData = Omit<Reservation,
    'id' | 'code' | 'created_at' | 'updated_at' | 'locations' | 'dropoff_location' | 'vehicles' | 'suppliers' | 'total_price' // Otomatik veya ilişkili alanlar çıkarıldı
> & {
    total_price: string; // Fiyat input için string olabilir
    supplier_cost?: number | null; // Tedarikçi maliyeti (opsiyonel olarak ekleyelim)
    // Diğer gerekli form alanları eklenebilir
};

// API yanıtı yerine Supabase count kullanılacak
// interface ReservationsApiResponse { ... }

// Pagination Meta (Supabase count ve page'e göre)
interface PaginationMeta {
    currentPage: number;
    lastPage: number;
    total: number;
    from: number;
    to: number;
}

const ITEMS_PER_PAGE = 10;

// --- Yardımcı Fonksiyonlar ve Sabitler ---

const statusColors: { [key in Reservation['status']]: string } = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    confirmed: 'bg-green-100 text-green-800 border-green-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
    completed: 'bg-blue-100 text-blue-800 border-blue-300',
}

// Ödeme durumu için isim ve renkler (Supabase'deki değere göre 'pending' veya 'unpaid' olabilir)
const paymentStatuses: { value: Reservation['payment_status'], label: string }[] = [
    { value: 'pending', label: 'Ödeme Bekliyor' }, // veya 'unpaid'
    { value: 'paid', label: 'Ödendi' },
    { value: 'refunded', label: 'İade Edildi' },
];

const paymentStatusColors: { [key in Reservation['payment_status']]: string } = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300', // veya 'unpaid'
    paid: 'bg-green-100 text-green-800 border-green-300',
    refunded: 'bg-orange-100 text-orange-800 border-orange-300',
};

// Rezervasyon Durumu sabitleri (Türkçe etiketlerle)
const reservationStatuses: { value: Reservation['status'], label: string }[] = [
    { value: 'pending', label: 'Beklemede' },
    { value: 'confirmed', label: 'Onaylandı' },
    { value: 'cancelled', label: 'İptal Edildi' },
    { value: 'completed', label: 'Tamamlandı' },
];


// Para formatlama
const formatCurrency = (value: number | string | null | undefined, currency = 'TRY') => {
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '-';
    }
    try {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (_error) { // error -> _error
        console.error("Currency formatting error:", _error);
        return `${amount.toFixed(2)} ${currency}`;
    }
}

// Tarih Formatlama
const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
        const date = parseISO(dateString);
        if (!isValid(date)) return '-';
        return format(date, 'dd.MM.yyyy HH:mm'); // Örnek format
    } catch (_error) { // error -> _error
        console.error("Date formatting error:", _error);
        return '-';
    }
}

// --- Ana Component ---

export default function AdminReservationsPage() {
    // State Değişkenleri
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalReservations, setTotalReservations] = useState(0)
    const [searchTerm, setSearchTerm] = useState('') // Arama state'i eklendi

    // Modal State'leri
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

    // Form State'leri
    const [formData, setFormData] = useState<Partial<ReservationFormData>>(initializeFormData()) // Partial<T> başlangıç için
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [cheaperSupplierInfo, setCheaperSupplierInfo] = useState<string | null>(null); // Daha ucuz tedarikçi bilgisi için state

    // Filtre state'leri (Supabase'e uygun) - Şimdilik basit tutuluyor
    const [filters, _setFilters] = useState<{
        status: string | null;
        payment_status: string | null;
        date_from: string;
        date_to: string;
    }>({
        status: null,
        payment_status: null,
        date_from: '',
        date_to: '',
    });

    // --- Veri Çekme Fonksiyonları ---

    const fetchLocations = useCallback(async () => {
        try {
            const { data: locationsData, error: fetchError } = await supabase
                .from('locations')
                .select('id, name, bolge_id')
                .order('name', { ascending: true });
            if (fetchError) {
                console.error('Error fetching locations:', fetchError);
                throw new Error('Lokasyonlar yüklenemedi: ' + fetchError.message);
            }
            setLocations(locationsData || []);
        } catch (err) {
            console.error('Lokasyonlar alınamadı (Supabase):', err);
            toast.error(`Lokasyon listesi yüklenirken bir hata oluştu: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
        }
    }, []);

    const fetchVehicles = useCallback(async () => {
        try {
            const { data: vehiclesData, error: fetchError } = await supabase
                .from('vehicles')
                .select('id, name, capacity, plate_number, type')
                .order('name', { ascending: true });
            if (fetchError) {
                console.error('Error fetching vehicles:', fetchError);
                throw new Error('Araçlar yüklenemedi: ' + fetchError.message);
            }
            setVehicles(vehiclesData || []);
        } catch (err) {
            console.error('Araçlar alınamadı (Supabase):', err);
            toast.error(`Araç listesi yüklenirken bir hata oluştu: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
        }
    }, []);

    const fetchSuppliers = useCallback(async () => {
        try {
            const { data: suppliersData, error: fetchError } = await supabase
                .from('suppliers')
                .select('id, name')
                .order('name', { ascending: true });
            if (fetchError) {
                console.error('Error fetching suppliers:', fetchError);
                throw new Error('Tedarikçiler yüklenemedi: ' + fetchError.message);
            }
            setSuppliers(suppliersData || []);
        } catch (err) {
            console.error('Tedarikçiler alınamadı (Supabase):', err);
            toast.error(`Tedarikçi listesi yüklenirken bir hata oluştu: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
        }
    }, []);

    const fetchReservations = useCallback(async (page = 1, search = '') => {
        setIsLoading(true)
        setError(null)
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        try {
            let query = supabase
                .from('reservations')
                // İlişkili verileri çekme (daha okunaklı tablo için)
                .select(`
                    *,
                    locations:pickup_location_id (id, name),
                    dropoff_location:dropoff_location_id (id, name),
                    vehicles (id, name, capacity, plate_number),
                    suppliers (id, name)
                `, { count: 'exact' })
                .order('reservation_time', { ascending: false }) // Rezervasyon tarihine göre sırala (en yeni)
                .range(from, to);

            // Arama Mantığı (örnek: müşteri adı, email, kod)
            if (search) {
                query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,code.ilike.%${search}%`);
            }

            // Filtreleme Mantığı (basit örnek)
            if (filters.status) {
                 query = query.eq('status', filters.status);
            }
            if (filters.payment_status) {
                 query = query.eq('payment_status', filters.payment_status);
            }
            // Tarih filtreleri eklenebilir (.gte, .lte)

            const { data, error: fetchError, count } = await query as { data: Reservation[] | null; error: PostgrestError | null; count: number | null };

            if (fetchError) throw fetchError;

            // Gelen veriyi Reservation[] tipine cast ediyoruz
            setReservations(data || []);
            setTotalReservations(count || 0);
            setCurrentPage(page);

        } catch (err: unknown) { 
            console.error('Rezervasyonlar alınamadı (Supabase):', err)
            let errorMessage = 'Bilinmeyen bir veri yükleme hatası oluştu.';
            if (err && typeof (err as { message?: string })?.message === 'string') {
                errorMessage = (err as { message: string }).message;
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError('Rezervasyonlar yüklenirken bir hata oluştu: ' + errorMessage);
            toast.error(errorMessage);
            setReservations([]);
            setTotalReservations(0);
        } finally {
            setIsLoading(false)
        }
    }, [filters]) // filters bağımlılığı eklendi

    // Initial Data Fetch
    useEffect(() => {
        fetchReservations(1, searchTerm); // Arama terimiyle ilk veriyi çek
        fetchLocations();
        fetchVehicles();
        fetchSuppliers();
    }, [fetchReservations, fetchLocations, fetchVehicles, fetchSuppliers, searchTerm]); // searchTerm bağımlılığı eklendi

    // Arama için Debounce (Opsiyonel ama önerilir)
     useEffect(() => {
         const timer = setTimeout(() => {
             fetchReservations(1, searchTerm);
         }, 500); // 500ms bekle
         return () => clearTimeout(timer);
     }, [searchTerm, fetchReservations]);


    // --- Form Yönetimi ---

    function initializeFormData(): Partial<ReservationFormData> {
        // Yeni rezervasyon için varsayılan değerler
        return {
            pickup_location_id: undefined,
            dropoff_location_id: undefined,
            vehicle_id: undefined,
            reservation_time: '',
            passenger_count: 1,
            customer_name: '',
            customer_email: '',
            customer_phone: '',
            flight_number: null,
            notes: null,
            status: 'pending',
            total_price: '0',
            payment_status: 'pending',
            supplier_id: null,
        };
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let processedValue: string | number | null = value;
    
        if (type === 'number' || name === 'passenger_count' || name === 'pickup_location_id' || name === 'dropoff_location_id' || name === 'vehicle_id') {
            processedValue = value === '' ? null : parseInt(value, 10); // parseInt, boş string için NaN döner, bu yüzden null kontrolü
            if (isNaN(processedValue as number)) processedValue = null; // Eğer NaN ise null yap (örn. vehicle_id için)
        } else if (name === 'supplier_id') {
            processedValue = value === 'null' || value === '' ? null : parseInt(value, 10);
            if (isNaN(processedValue as number)) processedValue = null;
        } else if (name === 'total_price' || name === 'supplier_cost') {
             // Fiyat alanları için string olarak kalsın, validasyon/kayıt sırasında parse edilecek.
             // Ya da burada parseFloat ile parse edip number tutulabilir. Şimdilik string.
             processedValue = value;
        }
    
        setFormData((prev: Partial<ReservationFormData>) => ({
            ...prev,
            [name]: processedValue
        }));
    
        // Dinamik validasyon (opsiyonel)
        if (formErrors[name]) {
            setFormErrors((prev: { [key: string]: string | undefined }) => ({ ...prev, [name]: undefined }));
        }

        // Tedarikçi maliyeti ve toplam fiyat değiştiğinde ucuz tedarikçi kontrolü
        if ((name === 'supplier_id' || name === 'vehicle_id') && formData.vehicle_id && value) {
            const currentVehicleId = formData.vehicle_id; // Known to be number due to the if-condition
            let supplierArg: number | null;

            if (name === 'supplier_id') {
                const numValue = Number(value);
                supplierArg = isNaN(numValue) ? null : numValue;
            } else { // name must be 'vehicle_id' here
                supplierArg = formData.supplier_id === undefined ? null : formData.supplier_id;
            }
            checkCheaperSupplier(supplierArg, currentVehicleId);
        }
    };

    const handleSelectChange = (name: keyof ReservationFormData, value: string | number | null | undefined) => {
        // The value from Select components is generally already processed:
        // - number | null for ID fields
        // - ReservationStatus for status field, etc.
        // - string for others that might pass through here, or undefined

        // The main goal is to set the state. formData is Partial<ReservationFormData>.
        // If value is undefined, it correctly represents an optional field not being set.
        // If value is null, it should only be for fields that are explicitly nullable in ReservationFormData (e.g., supplier_id, flight_number, notes, supplier_cost).
        // For fields that are strictly typed (e.g. pickup_location_id: number), if a <Select> passes null for "no selection",
        // it should ideally be converted to `undefined` for Partial<T> if T[key] is not nullable.

        let finalValueToSet: string | number | null | undefined = value; // Changed from any

        if (name === 'pickup_location_id' || name === 'dropoff_location_id' || name === 'vehicle_id') {
            // These are `number` in ReservationFormData. `Partial` makes them `number | undefined`.
            // `value` from Select is `number | null`.
            // We must map `null` to `undefined`.
            finalValueToSet = (value === null) ? undefined : value;
        } else if (name === 'passenger_count') {
            // `number` in ReservationFormData. `Partial` makes it `number | undefined`.
            const numVal = Number(value);
            finalValueToSet = (value === null || value === undefined || value === '' || isNaN(numVal) || numVal < 1) ? 1 : numVal; // Default to 1
        } else if (name === 'total_price') {
            // `string` in ReservationFormData. `Partial` makes it `string | undefined`.
            finalValueToSet = (value === null || value === undefined) ? undefined : String(value); // Or '' based on init
            if (formData.total_price === '' && finalValueToSet === undefined) finalValueToSet = ''; // Preserve empty string from init if value becomes undefined
        }
        // For supplier_id (number | null), status (string union), payment_status (string union), flight_number (string | null), notes (string | null), supplier_cost (number | null)
        // the incoming `value` (which can be string, number, null, or undefined) is generally fine or will be cast by the Select.
        // `undefined` is acceptable for all Partial fields.
        // `null` is acceptable if the original type included `null`.

        setFormData((prev: Partial<ReservationFormData>) => ({
            ...prev,
            [name]: finalValueToSet
        }));

        if (formErrors[name]) {
            setFormErrors((prev: { [key: string]: string | undefined }) => ({ ...prev, [name]: undefined }));
        }
    };

    const checkCheaperSupplier = useCallback(async (supplierId: number | null, vehicleId: number | null) => {
        if (!supplierId || !vehicleId) {
            setCheaperSupplierInfo(null);
            return;
        }
        // Bu fonksiyonun daha detaylı implementasyonu gerekecek,
        // vehicle_types ve price_lists tablolarına bakarak, seçili araç için
        // mevcut tedarikçiden daha ucuza sağlayan başka tedarikçi var mı kontrolü.
        // Şimdilik basit bir placeholder:
        // console.log("Checking for cheaper supplier for:", supplierId, vehicleId);
        setCheaperSupplierInfo(null); // Gerçek kontrol eklenene kadar.
    }, []); // formData bağımlılığı gerekebilir, eğer formData.vehicle_id vs içeriden okunuyorsa. Şimdiki yapıda parametre alıyor.

    // Form Validasyonu
    const validateForm = (data: Partial<ReservationFormData>): boolean => {
        const errors: { [key: string]: string | undefined } = {};
        if (!data.pickup_location_id) errors.pickup_location_id = "Alış lokasyonu zorunludur.";
        if (!data.dropoff_location_id) errors.dropoff_location_id = "Bırakış lokasyonu zorunludur.";
        if (!data.vehicle_id) errors.vehicle_id = "Araç seçimi zorunludur.";
        if (!data.reservation_time) errors.reservation_time = "Rezervasyon zamanı zorunludur.";
        else {
            try {
                if(!isValid(parseISO(data.reservation_time))) errors.reservation_time = "Geçerli bir tarih ve saat girin.";
            } catch { // Changed catch (_e) to catch {}
                errors.reservation_time = "Geçersiz tarih formatı.";
            }
        }
        if (!data.passenger_count || data.passenger_count < 1) errors.passenger_count = "Yolcu sayısı en az 1 olmalıdır.";
        if (!data.customer_name?.trim()) errors.customer_name = "Müşteri adı zorunludur.";
        if (!data.customer_email?.trim()) errors.customer_email = "Müşteri e-postası zorunludur.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_email)) errors.customer_email = "Geçersiz e-posta formatı.";
        if (!data.customer_phone?.trim()) errors.customer_phone = "Müşteri telefonu zorunludur.";
        // total_price validasyonu (number olmalı ve pozitif)
        const price = parseFloat(data.total_price || '0');
        if (isNaN(price) || price <= 0) errors.total_price = "Toplam fiyat geçerli bir pozitif sayı olmalıdır.";


        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    
    // useCallback bağımlılık düzeltmesi (formErrors eklendi)
    const memoizedValidateForm = useCallback(validateForm, []);

    // --- Tedarikçi Yardımcı Fonksiyonları ---
    const findAndSelectBestSupplier = useCallback(async () => {
        const { pickup_location_id, dropoff_location_id, vehicle_id } = formData;
        if (!pickup_location_id || !dropoff_location_id || !vehicle_id) {
            toast.warning('Lütfen önce alış, bırakış lokasyonlarını ve aracı seçin.');
            return;
        }
        const selectedVehicle = vehicles.find(v => v.id === vehicle_id);
        const vehicleType = selectedVehicle?.type;
        if (!vehicleType) {
             toast.error('Seçili aracın tipi bulunamadı.');
             return;
         }

        // Seçilen lokasyonların bolge_id'lerini bul
        const pickupLoc = locations.find(l => l.id === pickup_location_id);
        const pickupBolgeId = pickupLoc?.bolge_id || null;
        const dropoffLoc = locations.find(l => l.id === dropoff_location_id);
        const dropoffBolgeId = dropoffLoc?.bolge_id || null;

        if (!pickupBolgeId || !dropoffBolgeId) {
            toast.error('Seçili lokasyonların bölge bilgisi bulunamadı.');
            return;
        }

        setIsSubmitting(true);
        setCheaperSupplierInfo(null);
        try {
             console.log('Finding best supplier using Bolge IDs:', {
                 from_bolge_id: pickupBolgeId,
                 to_bolge_id: dropoffBolgeId,
                 vehicle_type: vehicleType
             });
            const { data: cheapestPriceData, error: cheapestPriceError } = await supabase
                .from('supplier_price_lists')
                .select('supplier_id, cost')
                .eq('from_bolge_id', pickupBolgeId)
                .eq('to_bolge_id', dropoffBolgeId)
                .eq('vehicle_type', vehicleType)
                .order('cost', { ascending: true })
                .limit(1)
                .maybeSingle();

             if (cheapestPriceError) throw cheapestPriceError;
             if (cheapestPriceData && cheapestPriceData.supplier_id !== null) {
                 const bestSupplierId = cheapestPriceData.supplier_id;
                 const bestCost = cheapestPriceData.cost;
                 const bestSupplier = suppliers.find(s => s.id === bestSupplierId);

                 // Doğrudan form state'ini güncelle, handleSelectChange'i çağırma
                 setFormData((prev: Partial<ReservationFormData>) => ({
                     ...prev,
                     supplier_id: bestSupplierId,
                     supplier_cost: bestCost
                 }));
                 // Bilgi mesajını temizle (çünkü en ucuzu seçildi)
                 setCheaperSupplierInfo(null);

                 toast.success(`En uygun tedarikçi ${bestSupplier?.name || 'Bilinmeyen'} seçildi (Maliyet: ${formatCurrency(bestCost)}).`);
             } else {
                 toast.info('Bu rota ve araç tipi için uygun fiyatlı tedarikçi bulunamadı.');
             }

        } catch (err: unknown) { // Changed from any to unknown
            console.error('En uygun tedarikçi bulunurken hata:', err);
            toast.error('En uygun tedarikçi bulunurken bir hata oluştu.');
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, vehicles, suppliers, locations, setFormData]); // locations ve setFormData bağımlılıklara eklendi

    // --- Modal Açma Fonksiyonları ---

    const openModalForNew = () => {
        setSelectedReservation(null);
        setFormData(initializeFormData());
        setFormErrors({});
        setIsAddDialogOpen(true);
    }

    const openModalForEdit = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        // Mevcut rezervasyon verilerini forma doldur
        setFormData({
            pickup_location_id: reservation.pickup_location_id,
            dropoff_location_id: reservation.dropoff_location_id,
            vehicle_id: reservation.vehicle_id,
            // reservation_time formatını input[type=datetime-local] için uygun hale getir
            reservation_time: reservation.reservation_time ? format(parseISO(reservation.reservation_time), "yyyy-MM-dd'T'HH:mm") : '',
            passenger_count: reservation.passenger_count,
            customer_name: reservation.customer_name,
            customer_email: reservation.customer_email,
            customer_phone: reservation.customer_phone,
            flight_number: reservation.flight_number,
            notes: reservation.notes,
            status: reservation.status,
            total_price: reservation.total_price.toString(),
            payment_status: reservation.payment_status,
            supplier_id: reservation.supplier_id,
        });
        setFormErrors({});
        setIsEditDialogOpen(true);
    }

     const openModalForDelete = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setIsDeleteDialogOpen(true);
    }

    // --- CRUD İşlemleri ---

    const handleAddReservation = async () => {
        if (!memoizedValidateForm(formData)) { // validateForm -> memoizedValidateForm
            toast.error("Lütfen formdaki hataları düzeltin.");
            return;
        }
        setIsSubmitting(true);
        try {
            // total_price'ı string'den number'a çevir
            const submissionData = {
                ...formData,
                total_price: parseFloat(formData.total_price || '0'),
                supplier_cost: formData.supplier_cost ? parseFloat(formData.supplier_cost.toString()) : null,
                 // Diğer sayısal alanları da kontrol et (örn: passenger_count)
                passenger_count: Number(formData.passenger_count || 1),
                // Supabase'e null gitmesi gereken string ID'ler için:
                supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
                // pickup_location_id, dropoff_location_id, vehicle_id zaten number veya null olmalı
            };
            
            // code alanı için: YYYYMMDD-XXXX (XXXX rastgele sayı veya artan ID olabilir)
            const now = new Date();
            const datePart = format(now, 'yyyyMMdd');
            const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 haneli rastgele sayı
            const reservationCode = `${datePart}-${randomPart}`;

            const { error: insertError } = await supabase
                .from('reservations')
                .insert([{ ...submissionData, code: reservationCode } as Partial<Tables<'reservations'>['Insert']>]); // Typed Supabase data

            if (insertError) throw insertError;

            toast.success("Rezervasyon başarıyla eklendi!");
            fetchReservations(currentPage, searchTerm);
            setIsAddDialogOpen(false);
        } catch (err: unknown) { // Changed from any to unknown
            console.error("Rezervasyon eklenirken hata:", err);
            const message = err instanceof Error ? err.message : "Rezervasyon eklenirken bir hata oluştu.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateReservation = async () => {
        if (!selectedReservation || !memoizedValidateForm(formData)) { // validateForm -> memoizedValidateForm
            toast.error("Lütfen formdaki hataları düzeltin.");
            return;
        }
        setIsSubmitting(true);
        try {
            const submissionData = {
                ...formData,
                total_price: parseFloat(formData.total_price || '0'),
                supplier_cost: formData.supplier_cost ? parseFloat(formData.supplier_cost.toString()) : null,
                passenger_count: Number(formData.passenger_count || 1),
                supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
            };

            const { error: updateError } = await supabase
                .from('reservations')
                .update(submissionData as Partial<Tables<'reservations'>['Update']>) // Typed Supabase data
                .eq('id', selectedReservation.id);

            if (updateError) throw updateError;

            toast.success("Rezervasyon başarıyla güncellendi!");
            fetchReservations(currentPage, searchTerm);
            setIsEditDialogOpen(false);
            setSelectedReservation(null);
        } catch (err: unknown) { // Changed from any to unknown
            console.error("Rezervasyon güncellenirken hata:", err);
            const message = err instanceof Error ? err.message : "Rezervasyon güncellenirken bilinmeyen bir hata oluştu.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!selectedReservation) return;
        setIsSubmitting(true); // Silme işlemi için de kullanılabilir
        try {
            const { error: deleteError } = await supabase
                .from('reservations')
                .delete()
                .eq('id', selectedReservation.id);

            if (deleteError) throw deleteError;

            toast.success("Rezervasyon başarıyla silindi!");
            fetchReservations(currentPage, searchTerm); // Sayfayı yenile
             // Eğer silinen sayfa son sayfadaki tek öğe ise ve sayfa 1 değilse, bir önceki sayfaya git
            if (reservations.length === 1 && currentPage > 1) {
                handlePageChange(currentPage - 1);
            }
            setIsDeleteDialogOpen(false);
            setSelectedReservation(null);
        } catch (err: unknown) { // Changed from any to unknown
            console.error("Rezervasyon silinirken hata:", err);
            const message = err instanceof Error ? err.message : "Rezervasyon silinirken bir hata oluştu.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Pagination ---
    const lastPage = Math.ceil(totalReservations / ITEMS_PER_PAGE);
    const paginationMeta: PaginationMeta = {
        currentPage: currentPage,
        lastPage: lastPage > 0 ? lastPage : 1,
        total: totalReservations,
        from: totalReservations === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1,
        to: Math.min(currentPage * ITEMS_PER_PAGE, totalReservations),
    };

    const handlePageChange = (page: number) => {
        fetchReservations(page, searchTerm);
    }

    // --- Render ---

    return (
        <div className="container mx-auto p-4">
            <Toaster position="top-center" /> {/* Toaster konumu */}
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Rezervasyon Yönetimi</h1>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openModalForNew}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Rezervasyon Ekle
                        </Button>
                    </DialogTrigger>
                    {/* --- YENİ REZERVASYON MODAL İÇERİĞİ --- */}
                    <DialogContent className="sm:max-w-[600px]"> {/* Daha geniş modal */}
                        <DialogHeader>
                            <DialogTitle><span>Yeni Rezervasyon Ekle</span></DialogTitle>
                            <DialogDescription><span>Yeni rezervasyon detaylarını girin.</span></DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); handleAddReservation(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">

                            {/* Müşteri Bilgileri */}
                            <div className="col-span-1 md:col-span-2 font-semibold border-b pb-2 mb-2">Müşteri Bilgileri</div>
                            <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-customer_name">Ad Soyad <span className="text-red-500">*</span></Label>
                                <Input id="add-customer_name" name="customer_name" value={formData.customer_name || ''} onChange={handleInputChange} required />
                                {formErrors.customer_name && <p className="text-sm text-red-500">{formErrors.customer_name}</p>}
                            </div>
                             <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-customer_email">E-posta <span className="text-red-500">*</span></Label>
                                <Input id="add-customer_email" name="customer_email" type="email" value={formData.customer_email || ''} onChange={handleInputChange} required />
                                {formErrors.customer_email && <p className="text-sm text-red-500">{formErrors.customer_email}</p>}
                            </div>
                             <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-customer_phone">Telefon <span className="text-red-500">*</span></Label>
                                <Input id="add-customer_phone" name="customer_phone" value={formData.customer_phone || ''} onChange={handleInputChange} required />
                                {formErrors.customer_phone && <p className="text-sm text-red-500">{formErrors.customer_phone}</p>}
                            </div>
                            <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-flight_number">Uçuş No</Label>
                                <Input id="add-flight_number" name="flight_number" value={formData.flight_number || ''} onChange={handleInputChange} />
                            </div>

                            {/* Transfer Bilgileri */}
                             <div className="col-span-1 md:col-span-2 font-semibold border-b pb-2 mb-2 mt-4">Transfer Bilgileri</div>
                             <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-pickup_location_id">Alış Lokasyonu <span className="text-red-500">*</span></Label>
                                <Select onValueChange={(value) => handleSelectChange('pickup_location_id', value ? parseInt(value) : null)} value={formData.pickup_location_id?.toString() || ''}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Lokasyon seçin..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {formErrors.pickup_location_id && <p className="text-sm text-red-500">{formErrors.pickup_location_id}</p>}
                            </div>
                             <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-dropoff_location_id">Bırakış Lokasyonu <span className="text-red-500">*</span></Label>
                                <Select onValueChange={(value) => handleSelectChange('dropoff_location_id', value ? parseInt(value) : null)} value={formData.dropoff_location_id?.toString() || ''}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Lokasyon seçin..." />
                                    </SelectTrigger>
                                     <SelectContent>
                                        {locations.map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {formErrors.dropoff_location_id && <p className="text-sm text-red-500">{formErrors.dropoff_location_id}</p>}
                            </div>
                            <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-vehicle_id">Araç <span className="text-red-500">*</span></Label>
                                <Select onValueChange={(value) => handleSelectChange('vehicle_id', value ? parseInt(value) : null)} value={formData.vehicle_id?.toString() || ''}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Araç seçin..." />
                                    </SelectTrigger>
                                     <SelectContent>
                                        {vehicles.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {formErrors.vehicle_id && <p className="text-sm text-red-500">{formErrors.vehicle_id}</p>}
                            </div>
                             <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-reservation_time">Rezervasyon Zamanı <span className="text-red-500">*</span></Label>
                                <Input id="add-reservation_time" name="reservation_time" type="datetime-local" value={formData.reservation_time || ''} onChange={handleInputChange} required />
                                {formErrors.reservation_time && <p className="text-sm text-red-500">{formErrors.reservation_time}</p>}
                            </div>
                            <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-passenger_count">Yolcu Sayısı <span className="text-red-500">*</span></Label>
                                <Input id="add-passenger_count" name="passenger_count" type="number" min="1" value={formData.passenger_count || 1} onChange={handleInputChange} required />
                                {formErrors.passenger_count && <p className="text-sm text-red-500">{formErrors.passenger_count}</p>}
                            </div>
                             <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-total_price">Toplam Fiyat (TRY) <span className="text-red-500">*</span></Label>
                                <Input id="add-total_price" name="total_price" type="number" step="0.01" value={formData.total_price || '0'} onChange={handleInputChange} required />
                                {formErrors.total_price && <p className="text-sm text-red-500">{formErrors.total_price}</p>}
                            </div>

                            {/* Durum ve Notlar */}
                             <div className="col-span-1 md:col-span-2 font-semibold border-b pb-2 mb-2 mt-4">Durum ve Notlar</div>
                             <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-status">Rezervasyon Durumu <span className="text-red-500">*</span></Label>
                                <Select onValueChange={(value) => handleSelectChange('status', value as Reservation['status'])} value={formData.status || 'pending'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Durum seçin..." />
                                    </SelectTrigger>
                                     <SelectContent>
                                        {reservationStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {formErrors.status && <p className="text-sm text-red-500">{formErrors.status}</p>}
                            </div>
                             <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-payment_status">Ödeme Durumu <span className="text-red-500">*</span></Label>
                                <Select onValueChange={(value) => handleSelectChange('payment_status', value as Reservation['payment_status'])} value={formData.payment_status || 'pending'}>
                                     <SelectTrigger>
                                        <SelectValue placeholder="Ödeme durumu seçin..." />
                                    </SelectTrigger>
                                     <SelectContent>
                                        {paymentStatuses.map(ps => <SelectItem key={ps.value} value={ps.value}>{ps.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {formErrors.payment_status && <p className="text-sm text-red-500">{formErrors.payment_status}</p>}
                            </div>
                             <div className="grid items-center gap-1.5">
                                <Label htmlFor="add-supplier_id">Tedarikçi (Opsiyonel)</Label>
                                <div className="flex items-center gap-2">
                                    <Select
                                        onValueChange={(value) => handleSelectChange('supplier_id', value === 'none' ? null : (value ? parseInt(value) : null))}
                                        value={formData.supplier_id?.toString() || 'none'}
                                    >
                                         <SelectTrigger>
                                            <SelectValue placeholder="Tedarikçi seçin..." />
                                        </SelectTrigger>
                                         <SelectContent>
                                            <SelectItem value="none">-- Tedarikçi Yok --</SelectItem>
                                            {suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={findAndSelectBestSupplier} // Yeni fonksiyon çağrısı
                                        disabled={!formData.pickup_location_id || !formData.dropoff_location_id || !formData.vehicle_id || isSubmitting}
                                        aria-label="En Uygun Tedarikçiyi Bul"
                                    >
                                        <Search className="h-4 w-4" /> {/* veya ZoomIn */}
                                    </Button>
                                </div>
                                {/* Daha ucuz tedarikçi bilgisi */}
                                {cheaperSupplierInfo && <p className="text-sm text-yellow-600 mt-1">{cheaperSupplierInfo}</p>}
                            </div>
                            <div className="grid items-center gap-1.5 col-span-1 md:col-span-2">
                                <Label htmlFor="add-notes">Notlar</Label>
                                <Textarea id="add-notes" name="notes" value={formData.notes || ''} onChange={handleInputChange} />
                            </div>

                            {/* Genel Form Hatası */}
                             {formErrors.form && <p className="col-span-1 md:col-span-2 text-center text-sm text-red-500">{String(formErrors.form)}</p>}

                        </form>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">İptal</Button></DialogClose>
                            <Button type="button" onClick={handleAddReservation} disabled={isSubmitting}> {/* type="submit" yerine onClick */}
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Kaydet
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* --- Filtreleme Alanı (Basitleştirilmiş) --- */}
            <Card className="mb-4">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Filter className="mr-2 h-5 w-5" /> Filtreler
                    </CardTitle>
                </CardHeader>
                 <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {/* Arama Input */}
                    <div className="col-span-2 md:col-span-4">
                        <Label htmlFor="search">Ara (Müşteri Adı, Email, Kod)</Label>
                        <Input
                            id="search"
                            placeholder="Arama terimi girin..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                     {/* Diğer filtreler eklenebilir (Status, Payment Status, Date Range) */}
                     {/* Örnek Status Filtresi */}
                     {/* <div className="grid items-center gap-1.5">
                         <Label>Rez. Durumu</Label>
                         <Select onValueChange={(value) => setFilters(prev => ({...prev, status: value === 'all' ? null : value}))} value={filters.status || 'all'}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="all">Tümü</SelectItem>
                                 {reservationStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                             </SelectContent>
                         </Select>
                     </div> */}
                 </CardContent>
            </Card>

            {/* Hata Mesajı */}
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* --- Rezervasyon Tablosu --- */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kod</TableHead>
                            <TableHead>Müşteri</TableHead>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Alış</TableHead>
                            <TableHead>Bırakış</TableHead>
                            <TableHead>Araç</TableHead>
                            <TableHead>Fiyat</TableHead>
                            <TableHead>Rez. Durumu</TableHead>
                            <TableHead>Ödeme Durumu</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                                <TableRow key={`skel-${index}`}>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : reservations.length > 0 ? (
                            reservations.map((rez) => (
                                <TableRow key={rez.id}>
                                    <TableCell className="font-medium">{rez.code}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{rez.customer_name}</div>
                                        <div className="text-xs text-muted-foreground">{rez.customer_email}</div>
                                        <div className="text-xs text-muted-foreground">{rez.customer_phone}</div>
                                    </TableCell>
                                    <TableCell>{formatDateTime(rez.reservation_time)}</TableCell>
                                    <TableCell>{rez.locations?.name || rez.pickup_location_id}</TableCell>
                                    <TableCell>{rez.dropoff_location?.name || rez.dropoff_location_id}</TableCell>
                                    <TableCell>{rez.vehicles?.name || rez.vehicle_id}</TableCell>
                                    <TableCell>{formatCurrency(rez.total_price)}</TableCell>
                                    <TableCell><Badge variant="outline" className={statusColors[rez.status] || ''}>{reservationStatuses.find(s => s.value === rez.status)?.label || rez.status}</Badge></TableCell>
                                    <TableCell><Badge variant="outline" className={paymentStatusColors[rez.payment_status] || ''}>{paymentStatuses.find(ps => ps.value === rez.payment_status)?.label || rez.payment_status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-1">
                                             {/* Detay Linki Eklendi */}
                                              <Link href={`/admin/reservations/${rez.id}`} passHref>
                                                 <Button variant="ghost" size="icon" aria-label="Detayları Görüntüle">
                                                     <Eye className="h-4 w-4" />
                                                 </Button>
                                             </Link>

                                            {/* Düzenleme Modalı */}
                                            <Dialog open={isEditDialogOpen && selectedReservation?.id === rez.id} onOpenChange={setIsEditDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => openModalForEdit(rez)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[600px]">
                                                    <DialogHeader>
                                                         <DialogTitle><span>Rezervasyon Düzenle (Kod: {selectedReservation?.code})</span></DialogTitle>
                                                         <DialogDescription><span>Rezervasyon detaylarını güncelleyin.</span></DialogDescription>
                                                     </DialogHeader>
                                                     <form onSubmit={(e) => { e.preventDefault(); handleUpdateReservation(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                                                         {/* Form alanları (Add modal'dakine benzer, value'lar formData'dan okunur) */}
                                                         {/* Müşteri Bilgileri */}
                                                         <div className="col-span-1 md:col-span-2 font-semibold border-b pb-2 mb-2">Müşteri Bilgileri</div>
                                                          <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-customer_name">Ad Soyad <span className="text-red-500">*</span></Label>
                                                             <Input id="edit-customer_name" name="customer_name" value={formData.customer_name || ''} onChange={handleInputChange} required />
                                                             {formErrors.customer_name && <p className="text-sm text-red-500">{formErrors.customer_name}</p>}
                                                         </div>
                                                          <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-customer_email">E-posta <span className="text-red-500">*</span></Label>
                                                             <Input id="edit-customer_email" name="customer_email" type="email" value={formData.customer_email || ''} onChange={handleInputChange} required />
                                                             {formErrors.customer_email && <p className="text-sm text-red-500">{formErrors.customer_email}</p>}
                                                         </div>
                                                          <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-customer_phone">Telefon <span className="text-red-500">*</span></Label>
                                                             <Input id="edit-customer_phone" name="customer_phone" value={formData.customer_phone || ''} onChange={handleInputChange} required />
                                                             {formErrors.customer_phone && <p className="text-sm text-red-500">{formErrors.customer_phone}</p>}
                                                         </div>
                                                         <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-flight_number">Uçuş No</Label>
                                                             <Input id="edit-flight_number" name="flight_number" value={formData.flight_number || ''} onChange={handleInputChange} />
                                                         </div>

                                                          {/* Transfer Bilgileri */}
                                                          <div className="col-span-1 md:col-span-2 font-semibold border-b pb-2 mb-2 mt-4">Transfer Bilgileri</div>
                                                          <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-pickup_location_id">Alış Lokasyonu <span className="text-red-500">*</span></Label>
                                                             <Select onValueChange={(value) => handleSelectChange('pickup_location_id', value ? parseInt(value) : null)} value={formData.pickup_location_id?.toString() || ''}>
                                                                 <SelectTrigger><SelectValue placeholder="Lokasyon seçin..." /></SelectTrigger>
                                                                 <SelectContent>
                                                                     {/* Sadece lokasyon adını göster */}
                                                                     {locations.map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
                                                                 </SelectContent>
                                                             </Select>
                                                             {formErrors.pickup_location_id && <p className="text-sm text-red-500">{formErrors.pickup_location_id}</p>}
                                                         </div>
                                                          <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-dropoff_location_id">Bırakış Lokasyonu <span className="text-red-500">*</span></Label>
                                                             <Select onValueChange={(value) => handleSelectChange('dropoff_location_id', value ? parseInt(value) : null)} value={formData.dropoff_location_id?.toString() || ''}>
                                                                 <SelectTrigger><SelectValue placeholder="Lokasyon seçin..." /></SelectTrigger>
                                                                 <SelectContent>
                                                                     {/* Sadece lokasyon adını göster */}
                                                                     {locations.map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
                                                                 </SelectContent>
                                                             </Select>
                                                             {formErrors.dropoff_location_id && <p className="text-sm text-red-500">{formErrors.dropoff_location_id}</p>}
                                                         </div>
                                                         <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-vehicle_id">Araç <span className="text-red-500">*</span></Label>
                                                             <Select onValueChange={(value) => handleSelectChange('vehicle_id', value ? parseInt(value) : null)} value={formData.vehicle_id?.toString() || ''}>
                                                                 <SelectTrigger><SelectValue placeholder="Araç seçin..." /></SelectTrigger>
                                                                 <SelectContent>
                                                                    {/* Araçları listele */}
                                                                    {vehicles.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                                                                </SelectContent>
                                                             </Select>
                                                             {formErrors.vehicle_id && <p className="text-sm text-red-500">{formErrors.vehicle_id}</p>}
                                                         </div>
                                                          <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-reservation_time">Rezervasyon Zamanı <span className="text-red-500">*</span></Label>
                                                             <Input id="edit-reservation_time" name="reservation_time" type="datetime-local" value={formData.reservation_time || ''} onChange={handleInputChange} required />
                                                             {formErrors.reservation_time && <p className="text-sm text-red-500">{formErrors.reservation_time}</p>}
                                                         </div>
                                                         <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-passenger_count">Yolcu Sayısı <span className="text-red-500">*</span></Label>
                                                             <Input id="edit-passenger_count" name="passenger_count" type="number" min="1" value={formData.passenger_count || 1} onChange={handleInputChange} required />
                                                             {formErrors.passenger_count && <p className="text-sm text-red-500">{formErrors.passenger_count}</p>}
                                                         </div>
                                                          <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-total_price">Toplam Fiyat (TRY) <span className="text-red-500">*</span></Label>
                                                             <Input id="edit-total_price" name="total_price" type="number" step="0.01" value={formData.total_price || '0'} onChange={handleInputChange} required />
                                                             {formErrors.total_price && <p className="text-sm text-red-500">{formErrors.total_price}</p>}
                                                         </div>

                                                         {/* Durum ve Notlar */}
                                                          <div className="col-span-1 md:col-span-2 font-semibold border-b pb-2 mb-2 mt-4">Durum ve Notlar</div>
                                                          <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-status">Rezervasyon Durumu <span className="text-red-500">*</span></Label>
                                                             <Select onValueChange={(value) => handleSelectChange('status', value as Reservation['status'])} value={formData.status || 'pending'}>
                                                                 <SelectTrigger><SelectValue placeholder="Durum seçin..." /></SelectTrigger>
                                                                 <SelectContent>{reservationStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                                                             </Select>
                                                             {formErrors.status && <p className="text-sm text-red-500">{formErrors.status}</p>}
                                                         </div>
                                                          <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-payment_status">Ödeme Durumu <span className="text-red-500">*</span></Label>
                                                             <Select onValueChange={(value) => handleSelectChange('payment_status', value as Reservation['payment_status'])} value={formData.payment_status || 'pending'}>
                                                                 <SelectTrigger><SelectValue placeholder="Ödeme durumu seçin..." /></SelectTrigger>
                                                                 <SelectContent>{paymentStatuses.map(ps => <SelectItem key={ps.value} value={ps.value}>{ps.label}</SelectItem>)}</SelectContent>
                                                             </Select>
                                                             {formErrors.payment_status && <p className="text-sm text-red-500">{formErrors.payment_status}</p>}
                                                         </div>
                                                          <div className="grid items-center gap-1.5">
                                                             <Label htmlFor="edit-supplier_id">Tedarikçi (Opsiyonel)</Label>
                                                             <div className="flex items-center gap-2">
                                                                 <Select
                                                                     onValueChange={(value) => handleSelectChange('supplier_id', value === 'none' ? null : (value ? parseInt(value) : null))}
                                                                     value={formData.supplier_id?.toString() || 'none'}
                                                                 >
                                                                     <SelectTrigger><SelectValue placeholder="Tedarikçi seçin..." /></SelectTrigger>
                                                                     <SelectContent>
                                                                         <SelectItem value="none">-- Tedarikçi Yok --</SelectItem>
                                                                         {suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                                                     </SelectContent>
                                                                 </Select>
                                                                  <Button
                                                                     type="button"
                                                                     variant="outline"
                                                                     size="icon"
                                                                     onClick={findAndSelectBestSupplier} // Yeni fonksiyon çağrısı
                                                                     disabled={!formData.pickup_location_id || !formData.dropoff_location_id || !formData.vehicle_id || isSubmitting}
                                                                     aria-label="En Uygun Tedarikçiyi Bul"
                                                                 >
                                                                     <Search className="h-4 w-4" /> {/* veya ZoomIn */}
                                                                 </Button>
                                                             </div>
                                                             {/* Daha ucuz tedarikçi bilgisi */}
                                                             {cheaperSupplierInfo && <p className="text-sm text-yellow-600 mt-1">{cheaperSupplierInfo}</p>}
                                                         </div>
                                                         <div className="grid items-center gap-1.5 col-span-1 md:col-span-2">
                                                             <Label htmlFor="edit-notes">Notlar</Label>
                                                             <Textarea id="edit-notes" name="notes" value={formData.notes || ''} onChange={handleInputChange} />
                                                         </div>

                                                         {/* Genel Form Hatası */}
                                                         {formErrors.form && <p className="col-span-1 md:col-span-2 text-center text-sm text-red-500">{String(formErrors.form)}</p>}
                                                     </form>
                                                     <DialogFooter>
                                                         <DialogClose asChild><Button type="button" variant="outline">İptal</Button></DialogClose>
                                                         <Button type="button" onClick={handleUpdateReservation} disabled={isSubmitting}> {/* type="submit" yerine onClick */}
                                                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Güncelle
                                                         </Button>
                                                     </DialogFooter>
                                                 </DialogContent>
                                             </Dialog>

                                            {/* Silme Modalı */}
                                            <AlertDialog open={isDeleteDialogOpen && selectedReservation?.id === rez.id} onOpenChange={setIsDeleteDialogOpen}>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => openModalForDelete(rez)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                 <AlertDialogContent>
                                                     <AlertDialogHeader>
                                                         <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                         <AlertDialogDescription>
                                                             {`${selectedReservation?.code}`} kodlu rezervasyonu (ID: {selectedReservation?.id}, Müşteri: {selectedReservation?.customer_name}) silmek üzeresiniz. Bu işlem geri alınamaz.
                                                         </AlertDialogDescription>
                                                     </AlertDialogHeader>
                                                     <AlertDialogFooter>
                                                         <AlertDialogCancel>İptal</AlertDialogCancel>
                                                         <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
                                                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Evet, Sil
                                                         </AlertDialogAction>
                                                     </AlertDialogFooter>
                                                 </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center"> {/* colSpan güncellendi */}
                                    Gösterilecek rezervasyon bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {/* Sayfalama Kontrolleri */}
                 {!isLoading && totalReservations > 0 && (
                    <PaginationControls
                        currentPage={paginationMeta.currentPage}
                        lastPage={paginationMeta.lastPage}
                        total={paginationMeta.total}
                        from={paginationMeta.from}
                        to={paginationMeta.to}
                        onPageChange={handlePageChange}
                    />
                )}
            </Card>
        </div>
    );
} 