'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircle, Pencil, Trash2, AlertCircle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner' // Tekrar aktif edildi
import { format, parseISO, isValid } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// --- Interface Tanımları (Yeni Yapıya Göre) ---

// Tedarikçi (Select için)
interface Supplier {
    id: number;
    name: string;
}

// Araç (Select için)
interface Vehicle {
    id: number;
    name: string; // veya type + plate_number gösterilebilir
    plate_number?: string | null; // Eklendi
    type?: string | null; // Eklendi
}

// Bolge (Select için)
interface Bolge {
    id: number;
    name: string;
}

// SupplierPriceList (Gerçek tablo yapısına göre)
interface SupplierPriceList {
    id: number;
    supplier_id: number | null;
    vehicle_id: number | null;
    from_bolge_id: number | null;
    to_bolge_id: number | null;
    cost: number; // price -> cost (DECIMAL/number)
    currency: string;
    valid_from: string | null; // start_date -> valid_from (TIMESTAMP/string)
    valid_to: string | null;   // end_date -> valid_to (TIMESTAMP/string)
    created_at: string;
    updated_at?: string | null;

    // İlişkili veriler (join ile alınacak)
    suppliers?: { name: string } | null;
    vehicles?: { name: string, type: string | null, plate_number: string | null } | null; // type ve plate_number eklendi
    bolge_from?: { name: string } | null;
    bolge_to?: { name: string } | null;
}

// Form Verisi Tipi (Input ve Select değerlerini tutar)
type SupplierPriceListFormData = {
    supplier_id: string | null;
    vehicle_id: string | null;
    from_bolge_id: string | null;
    to_bolge_id: string | null;
    cost: string;
    currency: string;
    valid_from: string;
    valid_to: string;
};

// Sayfalama Meta Verileri (Aynı kalabilir)
interface PaginationMeta {
    currentPage: number;
    lastPage: number;
    total: number;
    from: number;
    to: number;
}

const ITEMS_PER_PAGE = 15;

// Supabase insert/update için payload tipi (Manuel tanım geri geldi)
type PriceListPayload = {
    supplier_id: number | null;
    vehicle_id: number | null;
    from_bolge_id: number | null;
    to_bolge_id: number | null;
    cost: number;
    currency: string;
    valid_from: string | null;
    valid_to: string | null;
};

// --- Yardımcı Fonksiyonlar (Aynı kalabilir) ---

// Para Birimi Formatlama
const formatCurrency = (value: number | string | null | undefined, currency: string = 'TRY') => {
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
    } catch (error) {
        console.error("Para birimi formatlama hatası:", error);
        const formattedAmount = amount.toFixed(2);
        return `${formattedAmount} ${currency}`;
    }
};


// Tarih Formatlama (Gösterim için: DD.MM.YYYY)
const formatDateForDisplay = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
        // Zaman damgası 'Z' içerebilir, parseISO bunu işler
        const date = parseISO(dateString);
        if (!isValid(date)) return 'Geçersiz Tarih';
        return format(date, 'dd.MM.yyyy'); // Saati göstermiyoruz
    } catch (error) {
        console.error("Tarih formatlama hatası (gösterim):", error, dateString);
        return 'Hata';
    }
};

// Tarih Formatlama (Input type=\"date\" için: YYYY-MM-DD)
const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
        const date = parseISO(dateString);
         if (!isValid(date)) return '';
        return format(date, 'yyyy-MM-dd');
    } catch (error) {
        console.error("Tarih formatlama hatası (input):", error, dateString);
        return '';
    }
};

// --- Bileşen ---
export default function AdminSupplierPricesPage() {
    // State'ler
    const [priceLists, setPriceLists] = useState<SupplierPriceList[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]); // Tedarikçi listesi (Select için)
    const [vehicles, setVehicles] = useState<Vehicle[]>([]); // Araç listesi (Select için)
    const [bolges, setBolges] = useState<Bolge[]>([]); // Bölge listesi (Select için)
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPriceLists, setTotalPriceLists] = useState(0);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedPriceList, setSelectedPriceList] = useState<SupplierPriceList | null>(null); // Düzenleme/Silme için
    const [formData, setFormData] = useState<SupplierPriceListFormData>(initializeFormData()); // Form state'i (Add/Edit için ortak)
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false); // Ekleme/Güncelleme için

    // Boş form verisi döndüren fonksiyon (FormData tipine uygun)
    function initializeFormData(): SupplierPriceListFormData {
        return {
            supplier_id: null,
            vehicle_id: null,
            from_bolge_id: null,
            to_bolge_id: null,
            cost: '',
            currency: 'TRY',
            valid_from: '',
            valid_to: '',
        };
    }

    // --- Veri Çekme ---

    // Aktif Tedarikçileri Çek (Select için)
    const fetchSuppliers = useCallback(async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('suppliers')
                .select('id, name')
                .eq('is_active', true)
                .order('name', { ascending: true });
            if (fetchError) throw fetchError;
            setSuppliers(data || []);
        } catch (err: unknown) {
            console.error('Tedarikçiler alınamadı:', err);
            toast.error('Select için tedarikçi listesi yüklenemedi.');
            setSuppliers([]);
        }
    }, []);

    // Aktif Araçları Çek (Select için)
    const fetchVehicles = useCallback(async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('vehicles')
                .select('id, name, type, plate_number') // Gerekli alanlar
                .eq('is_active', true)
                .order('name', { ascending: true });
            if (fetchError) throw fetchError;
            setVehicles(data || []);
        } catch (err: unknown) {
            console.error('Araçlar alınamadı:', err);
            toast.error('Select için araç listesi yüklenemedi.');
            setVehicles([]);
        }
    }, []);

    // Aktif Bölgeleri Çek (Select için)
    const fetchBolges = useCallback(async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('bolge')
                .select('id, name')
                .eq('is_active', true)
                .order('name', { ascending: true });
            if (fetchError) throw fetchError;
            setBolges(data || []);
        } catch (err: unknown) {
            console.error('Bölgeler alınamadı:', err);
            toast.error('Select için bölge listesi yüklenemedi.');
            setBolges([]);
        }
    }, []);


    // Tedarikçi Fiyat Listelerini Çek (Ana Veri)
    const fetchSupplierPriceLists = useCallback(async (page: number) => {
        setIsLoading(true);
        setError(null);
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        try {
            // İlişkili tablolarla join yapalım
            const { data, error: fetchError, count } = await supabase
                .from('supplier_price_lists')
                .select(`
                    *,
                    suppliers ( name ),
                    vehicles ( name, type, plate_number ),
                    bolge_from:from_bolge_id ( name ),
                    bolge_to:to_bolge_id ( name )
                `, { count: 'exact' })
                .order('id', { ascending: true })
                .range(from, to);

            if (fetchError) throw fetchError;

            setPriceLists(data as SupplierPriceList[] || []);
            setTotalPriceLists(count || 0);
            setCurrentPage(page);

        } catch (err: unknown) {
            console.error('Fiyat listeleri alınamadı:', err);
            const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
            setError(`Fiyat listeleri yüklenirken bir hata oluştu: ${errorMessage}`);
            toast.error('Fiyat listeleri yüklenemedi.', { description: errorMessage });
            setPriceLists([]);
            setTotalPriceLists(0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // İlk yükleme (Select verileri ve ana liste)
    useEffect(() => {
        fetchSuppliers();
        fetchVehicles();
        fetchBolges();
        fetchSupplierPriceLists(1);
    }, [fetchSuppliers, fetchVehicles, fetchBolges, fetchSupplierPriceLists]); // Bağımlılıklar eklendi

    // --- Form İşlemleri ---

    const validateForm = (data: SupplierPriceListFormData): boolean => {
        const errors: { [key: string]: string } = {};
        if (!data.supplier_id) errors.supplier_id = 'Tedarikçi seçimi gereklidir.';
        if (!data.vehicle_id) errors.vehicle_id = 'Araç seçimi gereklidir.';
        if (!data.from_bolge_id) errors.from_bolge_id = 'Başlangıç bölgesi gereklidir.';
        if (!data.to_bolge_id) errors.to_bolge_id = 'Varış bölgesi gereklidir.';
        if (data.from_bolge_id === data.to_bolge_id && data.from_bolge_id !== null) {
             errors.to_bolge_id = 'Başlangıç ve varış bölgesi farklı olmalıdır.';
        }
        const costValue = parseFloat(data.cost);
        if (isNaN(costValue) || costValue <= 0) errors.cost = 'Geçerli bir pozitif maliyet giriniz.';
        if (!data.currency) errors.currency = 'Para birimi gereklidir.';
        if (!data.valid_from) errors.valid_from = 'Başlangıç tarihi gereklidir.';
        if (!data.valid_to) errors.valid_to = 'Bitiş tarihi gereklidir.';
        // TODO: valid_from ve valid_to tarih karşılaştırması eklenebilir

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
         // Hata mesajını temizle
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSelectChange = (name: keyof SupplierPriceListFormData, value: string | null) => {
        setFormData((prev: SupplierPriceListFormData) => ({
            ...prev,
            // Değeri string olarak alıp state'e null veya string olarak kaydediyoruz
             [name]: value,
        }));
         // Hata mesajını temizle
        if (formErrors[name]) {
             setFormErrors(prev => ({ ...prev, [name]: '' }));
         }
    };

    const handleAddNewClick = () => {
        setSelectedPriceList(null); // Seçili öğeyi temizle
        setFormData(initializeFormData()); // Formu sıfırla
        setFormErrors({});
        setIsAddDialogOpen(true);
    };

     const handleAddPriceList = async () => {
        if (!validateForm(formData)) return;
        setIsSubmitting(true);

        const selectedVehicleId = formData.vehicle_id ? parseInt(formData.vehicle_id, 10) : null;

        const payload: PriceListPayload = {
            supplier_id: formData.supplier_id ? parseInt(formData.supplier_id, 10) : null,
            vehicle_id: selectedVehicleId,
            from_bolge_id: formData.from_bolge_id ? parseInt(formData.from_bolge_id, 10) : null,
            to_bolge_id: formData.to_bolge_id ? parseInt(formData.to_bolge_id, 10) : null,
            cost: parseFloat(formData.cost),
            currency: formData.currency,
            valid_from: formData.valid_from ? formData.valid_from : null,
            valid_to: formData.valid_to ? formData.valid_to : null,
        };

        console.log("Adding Price List Payload:", payload);

        try {
            const { error } = await supabase.from('supplier_price_lists').insert(payload);
            if (error) throw error;
            toast.success('Fiyat başarıyla eklendi.');
            setIsAddDialogOpen(false);
            fetchSupplierPriceLists(1);
        } catch (err: unknown) {
             console.error('Fiyat eklenemedi:', err);
             const message = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
             toast.error(`Fiyat eklenirken hata: ${message}`);
             setFormErrors({ form: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (priceList: SupplierPriceList) => {
        setSelectedPriceList(priceList);
        // Gelen veriyi FormData tipine uygun hale getir (null kontrolleri önemli)
        setFormData({
            supplier_id: priceList.supplier_id ? priceList.supplier_id.toString() : null,
            vehicle_id: priceList.vehicle_id ? priceList.vehicle_id.toString() : null,
            from_bolge_id: priceList.from_bolge_id ? priceList.from_bolge_id.toString() : null,
            to_bolge_id: priceList.to_bolge_id ? priceList.to_bolge_id.toString() : null,
            cost: priceList.cost != null ? priceList.cost.toString() : '',
            currency: priceList.currency ?? 'TRY', // currency null ise varsayılan ata
            valid_from: formatDateForInput(priceList.valid_from),
            valid_to: formatDateForInput(priceList.valid_to),
        });
        setFormErrors({});
        setIsEditDialogOpen(true);
    };

     const handleUpdatePriceList = async () => {
        if (!selectedPriceList || !validateForm(formData)) return;
        setIsSubmitting(true);

        const selectedVehicleId = formData.vehicle_id ? parseInt(formData.vehicle_id, 10) : null;

       const payload: PriceListPayload = {
            supplier_id: formData.supplier_id ? parseInt(formData.supplier_id, 10) : null,
            vehicle_id: selectedVehicleId,
            from_bolge_id: formData.from_bolge_id ? parseInt(formData.from_bolge_id, 10) : null,
            to_bolge_id: formData.to_bolge_id ? parseInt(formData.to_bolge_id, 10) : null,
            cost: parseFloat(formData.cost),
            currency: formData.currency,
            valid_from: formData.valid_from ? formData.valid_from : null,
            valid_to: formData.valid_to ? formData.valid_to : null,
       };

         console.log("Updating Price List Payload (ID:", selectedPriceList.id, "):", payload);

        try {
            const { error } = await supabase
                .from('supplier_price_lists')
                .update(payload)
                .eq('id', selectedPriceList.id);
            if (error) throw error;
            toast.success('Fiyat başarıyla güncellendi.');
            setIsEditDialogOpen(false);
            fetchSupplierPriceLists(currentPage);
        } catch (err: unknown) {
             console.error('Fiyat güncellenemedi:', err);
             const message = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
             toast.error(`Fiyat güncellenirken hata: ${message}`);
             setFormErrors({ form: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Silme Modunu Aç (BURASI GÜNCELLENECEK)
    const handleDeleteClick = (priceList: SupplierPriceList) => {
        setSelectedPriceList(priceList);
        setIsDeleteDialogOpen(true);
    };

    // Silme İşlemi (BURASI GÜNCELLENECEK)
    const confirmDelete = async () => {
        if (!selectedPriceList) return;
        setIsSubmitting(true);
        try {
             const { error } = await supabase
                .from('supplier_price_lists')
                .delete()
                .eq('id', selectedPriceList.id);
            if (error) throw error;
            toast.success('Tedarikçi fiyat listesi başarıyla silindi.');
            setIsDeleteDialogOpen(false);
            const remainingItems = totalPriceLists - 1;
            const newLastPage = Math.ceil(remainingItems / ITEMS_PER_PAGE);
            const pageToFetch = currentPage > newLastPage ? Math.max(1, newLastPage) : currentPage;
            fetchSupplierPriceLists(pageToFetch);
        } catch (err: unknown) {
            console.error('Silme hatası:', err);
            const message = err instanceof Error && err.message ? err.message : "Silme işlemi sırasında bir hata oluştu.";
             toast.error('Silme başarısız.', { description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

     // Sayfalama İşlemleri (Aynı kalabilir)
    const handleNextPage = () => {
        const lastPage = Math.ceil(totalPriceLists / ITEMS_PER_PAGE);
        if (currentPage < lastPage) {
            fetchSupplierPriceLists(currentPage + 1);
        }
    };
    const handlePreviousPage = () => {
        if (currentPage > 1) {
            fetchSupplierPriceLists(currentPage - 1);
        }
    };
     // Sayfalama Meta Hesaplama
     const lastPage = Math.ceil(totalPriceLists / ITEMS_PER_PAGE);
     const paginationMeta: PaginationMeta = {
         currentPage: currentPage,
         lastPage: lastPage > 0 ? lastPage : 1, // En az 1 sayfa
         total: totalPriceLists,
         from: totalPriceLists === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1,
         to: Math.min(currentPage * ITEMS_PER_PAGE, totalPriceLists),
     };


// --- Render (BURASI GÜNCELLENECEK) ---

return (
    <div>
        <div className="mb-4 flex items-center justify-between">
             <h1 className="text-2xl font-semibold">Tedarikçi Fiyatları</h1>
             {/* Ekleme Dialogu */}
             <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                 <DialogTrigger asChild>
                     <Button onClick={handleAddNewClick}>
                         <PlusCircle className="mr-2 h-4 w-4" /> Yeni Tedarikçi Fiyatı Ekle
                     </Button>
                 </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    {/* FORM İÇERİĞİ GÜNCELLENECEK */}
                     <DialogHeader>
                        <DialogTitle>Yeni Tedarikçi Fiyatı Ekle</DialogTitle>
                        <DialogDescription>Yeni tedarikçi fiyatı için detayları girin.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddPriceList(); }} className="grid gap-4 py-4">
                        {/* Supplier Select */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-supplier_id" className="text-right">Tedarikçi <span className="text-red-500">*</span></Label>
                            <Select name="supplier_id" value={formData.supplier_id ?? ''} onValueChange={(value) => handleSelectChange('supplier_id', value)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Tedarikçi Seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map((supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.id.toString()}>{supplier.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {formErrors.supplier_id && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.supplier_id}</p>}
                        </div>
                        {/* Vehicle Select */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-vehicle_id" className="text-right">Araç <span className="text-red-500">*</span></Label>
                            <Select name="vehicle_id" value={formData.vehicle_id ?? ''} onValueChange={(value) => handleSelectChange('vehicle_id', value)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Araç Seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles.map((vehicle) => (
                                        <SelectItem key={vehicle.id} value={vehicle.id.toString()}>{`${vehicle.name} (${vehicle.type || '-'} / ${vehicle.plate_number || '-'})`}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {formErrors.vehicle_id && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.vehicle_id}</p>}
                        </div>
                        {/* From Bolge Select */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-from_bolge_id" className="text-right">Nereden <span className="text-red-500">*</span></Label>
                            <Select name="from_bolge_id" value={formData.from_bolge_id ?? ''} onValueChange={(value) => handleSelectChange('from_bolge_id', value)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Başlangıç Bölgesi Seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {bolges.map((bolge) => (
                                        <SelectItem key={bolge.id} value={bolge.id.toString()}>{bolge.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {formErrors.from_bolge_id && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.from_bolge_id}</p>}
                        </div>
                        {/* To Bolge Select */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-to_bolge_id" className="text-right">Nereye <span className="text-red-500">*</span></Label>
                            <Select name="to_bolge_id" value={formData.to_bolge_id ?? ''} onValueChange={(value) => handleSelectChange('to_bolge_id', value)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Varış Bölgesi Seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {bolges.map((bolge) => (
                                        <SelectItem key={bolge.id} value={bolge.id.toString()}>{bolge.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {formErrors.to_bolge_id && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.to_bolge_id}</p>}
                        </div>
                        {/* Cost Input */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-cost" className="text-right">Maliyet <span className="text-red-500">*</span></Label>
                            <Input id="add-cost" name="cost" type="number" step="0.01" value={formData.cost} onChange={handleInputChange} required className="col-span-3" />
                            {formErrors.cost && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.cost}</p>}
                        </div>
                        {/* Currency Input */}
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-currency" className="text-right">Para Birimi <span className="text-red-500">*</span></Label>
                            <Input id="add-currency" name="currency" value={formData.currency} onChange={handleInputChange} required className="col-span-3" maxLength={3} />
                            {formErrors.currency && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.currency}</p>}
                        </div>
                        {/* Valid From Input */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-valid_from" className="text-right">Geçerlilik Başlangıcı <span className="text-red-500">*</span></Label>
                            <Input id="add-valid_from" name="valid_from" type="date" value={formData.valid_from} onChange={handleInputChange} required className="col-span-3" />
                            {formErrors.valid_from && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.valid_from}</p>}
                        </div>
                        {/* Valid To Input */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-valid_to" className="text-right">Geçerlilik Bitişi <span className="text-red-500">*</span></Label>
                            <Input id="add-valid_to" name="valid_to" type="date" value={formData.valid_to} onChange={handleInputChange} required className="col-span-3" />
                            {formErrors.valid_to && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.valid_to}</p>}
                        </div>
                        {/* Genel Form Hatası */}
                        {formErrors.form && <p className="col-span-4 text-center text-sm text-red-500">{formErrors.form}</p>}
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">İptal</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                               {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>

         {error && (
             <Alert variant="destructive" className="mb-4">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Hata!</AlertTitle>
                 <AlertDescription>{error}</AlertDescription>
             </Alert>
         )}

        <Card>
            <Table>
                <TableHeader>
                    {/* TABLO BAŞLIKLARI GÜNCELLENECEK */}
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tedarikçi</TableHead>
                        <TableHead>Araç</TableHead>
                        <TableHead>Nereden</TableHead>
                        <TableHead>Nereye</TableHead>
                        <TableHead>Maliyet</TableHead>
                        <TableHead>Geçerlilik Başlangıcı</TableHead>
                        <TableHead>Geçerlilik Bitişi</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {/* TABLO İÇERİĞİ GÜNCELLENECEK */}
                     {isLoading ? (
                         Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={`skel-${index}`}>
                                <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-16" /></TableCell>
                             </TableRow>
                        ))
                    ) : priceLists.length > 0 ? (
                         priceLists.map((item) => (
                             <TableRow key={item.id}>
                                {/* Veri gösterimi güncellenecek */}
                                <TableCell>{item.id}</TableCell>
                                <TableCell>{item.suppliers?.name ?? '-'}</TableCell>
                                <TableCell>{item.vehicles ? `${item.vehicles.name} (${item.vehicles.type || 'Tip Yok'} - ${item.vehicles.plate_number || 'Plaka Yok'})` : '-'}</TableCell>
                                <TableCell>{item.bolge_from?.name ?? '-'}</TableCell>
                                <TableCell>{item.bolge_to?.name ?? '-'}</TableCell>
                                <TableCell>{formatCurrency(item.cost, item.currency)}</TableCell>
                                <TableCell>{formatDateForDisplay(item.valid_from)}</TableCell>
                                <TableCell>{formatDateForDisplay(item.valid_to)}</TableCell>
                                <TableCell className="text-right">
                                     <div className="flex justify-end space-x-1">
                                        {/* Düzenleme Dialogu */}
                                         <Dialog open={isEditDialogOpen && selectedPriceList?.id === item.id} onOpenChange={setIsEditDialogOpen}>
                                             <DialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                                                     <Pencil className="h-4 w-4" />
                                                 </Button>
                                             </DialogTrigger>
                                            <DialogContent className="sm:max-w-[600px]">
                                                {/* DÜZENLEME FORMU BURAYA GELECEK */}
                                                 <DialogHeader>
                                                    <DialogTitle>Tedarikçi Fiyatı Düzenle (ID: {selectedPriceList?.id})</DialogTitle>
                                                     <DialogDescription>Tedarikçi fiyatı detaylarını güncelleyin.</DialogDescription>
                                                 </DialogHeader>
                                                <form onSubmit={(e) => { e.preventDefault(); handleUpdatePriceList(); }} className="grid gap-4 py-4">
                                                    {/* Supplier Select */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-supplier_id" className="text-right">Tedarikçi <span className="text-red-500">*</span></Label>
                                                        <Select name="supplier_id" value={formData.supplier_id ?? ''} onValueChange={(value) => handleSelectChange('supplier_id', value)}>
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue placeholder="Tedarikçi Seçin" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {suppliers.map((supplier) => (
                                                                    <SelectItem key={supplier.id} value={supplier.id.toString()}>{supplier.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {formErrors.supplier_id && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.supplier_id}</p>}
                                                    </div>
                                                    {/* Vehicle Select */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-vehicle_id" className="text-right">Araç <span className="text-red-500">*</span></Label>
                                                        <Select name="vehicle_id" value={formData.vehicle_id ?? ''} onValueChange={(value) => handleSelectChange('vehicle_id', value)}>
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue placeholder="Araç Seçin" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {vehicles.map((vehicle) => (
                                                                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>{`${vehicle.name} (${vehicle.type || '-'} / ${vehicle.plate_number || '-'})`}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {formErrors.vehicle_id && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.vehicle_id}</p>}
                                                    </div>
                                                    {/* From Bolge Select */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-from_bolge_id" className="text-right">Nereden <span className="text-red-500">*</span></Label>
                                                        <Select name="from_bolge_id" value={formData.from_bolge_id ?? ''} onValueChange={(value) => handleSelectChange('from_bolge_id', value)}>
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue placeholder="Başlangıç Bölgesi Seçin" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {bolges.map((bolge) => (
                                                                    <SelectItem key={bolge.id} value={bolge.id.toString()}>{bolge.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {formErrors.from_bolge_id && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.from_bolge_id}</p>}
                                                    </div>
                                                    {/* To Bolge Select */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-to_bolge_id" className="text-right">Nereye <span className="text-red-500">*</span></Label>
                                                        <Select name="to_bolge_id" value={formData.to_bolge_id ?? ''} onValueChange={(value) => handleSelectChange('to_bolge_id', value)}>
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue placeholder="Varış Bölgesi Seçin" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {bolges.map((bolge) => (
                                                                    <SelectItem key={bolge.id} value={bolge.id.toString()}>{bolge.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {formErrors.to_bolge_id && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.to_bolge_id}</p>}
                                                    </div>
                                                    {/* Cost Input */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-cost" className="text-right">Maliyet <span className="text-red-500">*</span></Label>
                                                        <Input id="edit-cost" name="cost" type="number" step="0.01" value={formData.cost} onChange={handleInputChange} required className="col-span-3" />
                                                        {formErrors.cost && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.cost}</p>}
                                                    </div>
                                                    {/* Currency Input */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-currency" className="text-right">Para Birimi <span className="text-red-500">*</span></Label>
                                                        <Input id="edit-currency" name="currency" value={formData.currency} onChange={handleInputChange} required className="col-span-3" maxLength={3} />
                                                        {formErrors.currency && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.currency}</p>}
                                                    </div>
                                                    {/* Valid From Input */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-valid_from" className="text-right">Geçerlilik Başlangıcı <span className="text-red-500">*</span></Label>
                                                        <Input id="edit-valid_from" name="valid_from" type="date" value={formData.valid_from} onChange={handleInputChange} required className="col-span-3" />
                                                        {formErrors.valid_from && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.valid_from}</p>}
                                                    </div>
                                                    {/* Valid To Input */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-valid_to" className="text-right">Geçerlilik Bitişi <span className="text-red-500">*</span></Label>
                                                        <Input id="edit-valid_to" name="valid_to" type="date" value={formData.valid_to} onChange={handleInputChange} required className="col-span-3" />
                                                        {formErrors.valid_to && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.valid_to}</p>}
                                                    </div>
                                                    {/* Genel Form Hatası */}
                                                    {formErrors.form && <p className="col-span-4 text-center text-sm text-red-500">{formErrors.form}</p>}
                                                    <DialogFooter>
                                                        <DialogClose asChild><Button type="button" variant="outline">İptal</Button></DialogClose>
                                                        <Button type="submit" disabled={isSubmitting}>
                                                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Güncelle
                                                        </Button>
                                                    </DialogFooter>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                         {/* Silme AlertDialogu */}
                                         <AlertDialog open={isDeleteDialogOpen && selectedPriceList?.id === item.id} onOpenChange={setIsDeleteDialogOpen}>
                                             <AlertDialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(item)}>
                                                     <Trash2 className="h-4 w-4" />
                                                 </Button>
                                             </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        ID: {selectedPriceList?.id} olan tedarikçi fiyat kaydını silmek üzeresiniz. Bu işlem geri alınamaz.
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
                             <TableCell colSpan={9} className="h-24 text-center">
                                 Gösterilecek tedarikçi fiyatı bulunamadı.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
             {/* Sayfalama */}
             {!isLoading && totalPriceLists > 0 && (
                 <div className="mt-4 flex items-center justify-between border-t px-2 py-4">
                     <span className="text-sm text-muted-foreground">
                         {paginationMeta.total} kayıttan {paginationMeta.from} - {paginationMeta.to} arası gösteriliyor.
                    </span>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreviousPage}
                            disabled={paginationMeta.currentPage <= 1}
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> Önceki
                         </Button>
                         <Button
                             variant="outline"
                             size="sm"
                             onClick={handleNextPage}
                             disabled={paginationMeta.currentPage >= paginationMeta.lastPage}
                         >
                            Sonraki <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    </div>
);

} 