'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api/client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save } from 'lucide-react'
import { AxiosError } from 'axios'

// Arayüzler (Detay sayfasından alınabilir veya ortak bir yere taşınabilir)
interface LocationSummary { id: number; name: string; }
interface VehicleSummary { id: number; type?: string; }
interface SupplierSummary { id: number; name: string; }

interface CreateFormData {
    pickup_location_id: number | null;
    dropoff_location_id: number | null;
    vehicle_id: number | null;
    reservation_time: string; // Tarih saat seçici eklenecek
    passenger_count: number | string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    flight_number: string | null;
    notes: string | null;
    total_price: number | string; // Otomatik hesaplama veya manuel giriş?
    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'; // Admin için varsayılan olabilir
    payment_status?: 'pending' | 'paid' | 'refunded'; // Admin için varsayılan olabilir
    supplier_id: number | null;
    user_id?: number | null; // Adminin kendi ID'si veya seçilebilir?
}

interface LocationsApiResponse { data: LocationSummary[]; }
interface VehiclesApiResponse { data: VehicleSummary[]; }
interface SuppliersApiResponse { data: SupplierSummary[]; }

export default function CreateReservationPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [formData, setFormData] = useState<Partial<CreateFormData>>({
        pickup_location_id: null,
        dropoff_location_id: null,
        vehicle_id: null,
        reservation_time: '',
        passenger_count: 1,
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        flight_number: null,
        notes: null,
        total_price: '',
        status: 'confirmed', // Varsayılan
        payment_status: 'pending', // Varsayılan
        supplier_id: null,
        user_id: null, // TODO: Otomatik ayarlanabilir veya seçtirilebilir
    });
    const [locations, setLocations] = useState<LocationSummary[]>([]);
    const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
    const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({}); // Hata mesajları için

    // Lokasyon, Araç, Tedarikçi verilerini çekme
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [locationsRes, vehiclesRes, suppliersRes] = await Promise.all([
                apiClient.get<LocationsApiResponse>('/locations'), // Genel lokasyon endpoint'i varsayımı
                apiClient.get<VehiclesApiResponse>('/admin/vehicles'), // Admin araç endpoint'i varsayımı
                apiClient.get<SuppliersApiResponse>('/admin/suppliers')
            ]);
            setLocations(locationsRes.data.data);
            setVehicles(vehiclesRes.data.data);
            setSuppliers(suppliersRes.data.data);
        } catch (err) {
            console.error('Gerekli veriler alınamadı:', err);
            toast({ title: "Hata", description: "Form için gerekli veriler yüklenemedi.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Hata mesajını temizle
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: [] }));
        }
    };

    const handleSelectChange = (name: keyof CreateFormData, value: string | number | null) => {
         let finalValue: string | number | null = value;
         if (name === 'pickup_location_id' || name === 'dropoff_location_id' || name === 'vehicle_id' || name === 'supplier_id') {
             finalValue = value === 'null' ? null : (value === '' ? null : Number(value));
         }
        setFormData(prev => ({ ...prev, [name]: finalValue }));
         // Hata mesajını temizle
         if (errors[name]) {
             setErrors(prev => ({ ...prev, [name]: [] }));
         }
    };

    // Rezervasyon oluşturma
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({}); // Eski hataları temizle

        // TODO: reservation_time formatını API'nin beklediği hale getir (YYYY-MM-DD HH:MM:SS)
        // TODO: user_id ataması (varsa)

        try {
            await apiClient.post('/api/admin/reservations', formData);
            toast({ title: "Başarılı", description: "Rezervasyon başarıyla oluşturuldu." });
            router.push('/admin/reservations'); // Listeleme sayfasına yönlendir
        } catch (err: unknown) {
            console.error('Rezervasyon oluşturulamadı:', err);
            if (err instanceof AxiosError && err.response?.status === 422 && err.response?.data?.errors) {
                 // Validasyon hatalarını state'e yaz
                setErrors(err.response.data.errors);
                toast({ title: "Doğrulama Hatası", description: "Lütfen formdaki hataları düzeltin.", variant: "destructive" });
            } else {
                let errorMessage = 'Rezervasyon oluşturulurken bir hata oluştu.';
                if (err instanceof AxiosError && err.response?.data?.message) {
                    errorMessage = err.response.data.message;
                }
                toast({ title: "Hata", description: errorMessage, variant: "destructive" });
            }
        } finally {
             setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                </Button>
                <h1 className="text-xl font-semibold">Yeni Rezervasyon Ekle</h1>
                {/* Boşluk bırakmak için div */}
                <div></div> 
            </div>

            <form onSubmit={handleSubmit}>
                 <Card>
                    <CardHeader>
                        <CardTitle>Rezervasyon Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Alış Lokasyonu */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                            <Label htmlFor="pickup_location_id" className="sm:col-span-1">Alış Lokasyonu</Label>
                            <Select name="pickup_location_id" value={String(formData.pickup_location_id ?? '')} onValueChange={(val) => handleSelectChange('pickup_location_id', val)}>
                                <SelectTrigger className="sm:col-span-2"><SelectValue placeholder="Lokasyon Seçin" /></SelectTrigger>
                                <SelectContent>
                                    {locations.map(loc => <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                             {errors.pickup_location_id && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.pickup_location_id.join(', ')}</p>}
                        </div>
                        
                        {/* Bırakış Lokasyonu */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                             <Label htmlFor="dropoff_location_id" className="sm:col-span-1">Bırakış Lokasyonu</Label>
                             <Select name="dropoff_location_id" value={String(formData.dropoff_location_id ?? '')} onValueChange={(val) => handleSelectChange('dropoff_location_id', val)}>
                                <SelectTrigger className="sm:col-span-2"><SelectValue placeholder="Lokasyon Seçin" /></SelectTrigger>
                                <SelectContent>
                                    {locations.map(loc => <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>)}
                                </SelectContent>
                             </Select>
                             {errors.dropoff_location_id && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.dropoff_location_id.join(', ')}</p>}
                        </div>

                        {/* Araç */}
                         <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                            <Label htmlFor="vehicle_id" className="sm:col-span-1">Araç</Label>
                             <Select name="vehicle_id" value={String(formData.vehicle_id ?? '')} onValueChange={(val) => handleSelectChange('vehicle_id', val)}>
                                <SelectTrigger className="sm:col-span-2"><SelectValue placeholder="Araç Seçin" /></SelectTrigger>
                                <SelectContent>
                                    {vehicles.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.type}</SelectItem>)}
                                </SelectContent>
                             </Select>
                             {errors.vehicle_id && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.vehicle_id.join(', ')}</p>}
                        </div>

                        {/* Rezervasyon Tarihi/Saati - Şimdilik basit input, DatePicker eklenebilir */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                            <Label htmlFor="reservation_time" className="sm:col-span-1">Rezervasyon Tarihi ve Saati</Label>
                            <Input id="reservation_time" name="reservation_time" type="datetime-local" value={formData.reservation_time ?? ''} onChange={handleInputChange} className="sm:col-span-2" />
                            {errors.reservation_time && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.reservation_time.join(', ')}</p>}
                        </div>
                        
                        {/* Yolcu Sayısı */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                             <Label htmlFor="passenger_count" className="sm:col-span-1">Yolcu Sayısı</Label>
                            <Input id="passenger_count" name="passenger_count" type="number" min="1" value={formData.passenger_count ?? ''} onChange={handleInputChange} className="sm:col-span-2" />
                            {errors.passenger_count && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.passenger_count.join(', ')}</p>}
                        </div>

                         {/* Müşteri Adı */}
                         <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                            <Label htmlFor="customer_name" className="sm:col-span-1">Müşteri Adı</Label>
                             <Input id="customer_name" name="customer_name" value={formData.customer_name ?? ''} onChange={handleInputChange} className="sm:col-span-2" />
                             {errors.customer_name && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.customer_name.join(', ')}</p>}
                        </div>
                        
                        {/* Müşteri Email */}
                         <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                             <Label htmlFor="customer_email" className="sm:col-span-1">Müşteri Email</Label>
                             <Input id="customer_email" name="customer_email" type="email" value={formData.customer_email ?? ''} onChange={handleInputChange} className="sm:col-span-2" />
                             {errors.customer_email && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.customer_email.join(', ')}</p>}
                         </div>

                        {/* Müşteri Telefon */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                            <Label htmlFor="customer_phone" className="sm:col-span-1">Müşteri Telefon</Label>
                            <Input id="customer_phone" name="customer_phone" type="tel" value={formData.customer_phone ?? ''} onChange={handleInputChange} className="sm:col-span-2" />
                            {errors.customer_phone && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.customer_phone.join(', ')}</p>}
                        </div>

                         {/* Uçuş No */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                            <Label htmlFor="flight_number" className="sm:col-span-1">Uçuş No</Label>
                            <Input id="flight_number" name="flight_number" value={formData.flight_number ?? ''} onChange={handleInputChange} className="sm:col-span-2" />
                             {errors.flight_number && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.flight_number.join(', ')}</p>}
                        </div>

                         {/* Toplam Fiyat */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                            <Label htmlFor="total_price" className="sm:col-span-1">Toplam Fiyat</Label>
                            <Input id="total_price" name="total_price" type="number" step="0.01" min="0" value={formData.total_price ?? ''} onChange={handleInputChange} className="sm:col-span-2" />
                            {errors.total_price && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.total_price.join(', ')}</p>}
                        </div>

                         {/* Tedarikçi */}
                         <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                            <Label htmlFor="supplier_id" className="sm:col-span-1">Tedarikçi</Label>
                             <Select name="supplier_id" value={String(formData.supplier_id ?? '')} onValueChange={(val) => handleSelectChange('supplier_id', val)}>
                                <SelectTrigger className="sm:col-span-2"><SelectValue placeholder="Tedarikçi Seçin (Opsiyonel)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">Tedarikçi Yok</SelectItem>
                                    {suppliers.map(supplier => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.name}</SelectItem>)}
                                </SelectContent>
                             </Select>
                             {errors.supplier_id && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.supplier_id.join(', ')}</p>}
                         </div>

                         {/* Notlar */}
                         <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                            <Label htmlFor="notes" className="sm:col-span-1">Notlar</Label>
                             <Textarea id="notes" name="notes" value={formData.notes ?? ''} onChange={handleInputChange} className="sm:col-span-2" rows={3} />
                             {errors.notes && <p className="text-red-500 text-xs sm:col-span-3 sm:pl-1">{errors.notes.join(', ')}</p>}
                        </div>

                        {/* Durum ve Ödeme Durumu (Admin paneli olduğu için varsayılan ayarlı, gizli olabilir veya gösterilebilir) */}
                        {/* 
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                             <Label htmlFor="status" className="sm:col-span-1">Durum</Label>
                             <Select name="status" value={formData.status ?? 'confirmed'} onValueChange={(val) => handleSelectChange('status', val)}>
                                <SelectTrigger className="sm:col-span-2"><SelectValue /></SelectTrigger>
                                <SelectContent>...</SelectContent>
                             </Select>
                         </div> 
                         */}

                    </CardContent>
                 </Card>
                 
                 <div className="flex justify-end mt-6">
                     <Button type="submit" disabled={isLoading}>
                         <Save className="mr-2 h-4 w-4" /> Rezervasyonu Kaydet
                     </Button>
                 </div>
            </form>
        </div>
    );
} 