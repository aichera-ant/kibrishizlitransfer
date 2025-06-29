'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from "@/lib/supabaseClient" // Eklendi
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
import { Skeleton } from "@/components/ui/skeleton"
import { PlusCircle, Pencil, Trash2, Loader2, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
    DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'sonner' // sonner eklendi (linter hatası devam ederse kaldırılabilir)

// --- Arayüz Tanımları ---

// Bolge (Select için)
interface Bolge {
    id: number;
    name: string;
}

// Araç Tipi (Sabit Liste)
/* // Removed unused vehicleTypes variable
const vehicleTypes = [
    'Sedan', 
    'SUV', 
    'Minivan', 
    'VIP Minivan', 
    'Midibus', 
    'Bus',
];
*/

// Transfer Tipi (Enum)
const transferTypes = ['private', 'shared'] as const; // Enum değerleri
type TransferType = typeof transferTypes[number];

// Fiyat Tipi (Enum)
const priceTypes = ['per_vehicle', 'per_person'] as const; // Enum değerleri
type PriceType = typeof priceTypes[number];

// PriceList Arayüzü (Supabase tablosuna göre)
interface PriceList {
    id: number;
    vehicle_type: string | null;
    from_bolge_id: number | null;
    to_bolge_id: number | null;
    transfer_type: TransferType;
    price: number;
    currency: string;
    is_active: boolean;
    price_type: PriceType;
    created_at?: string;
    updated_at?: string;
    // İlişkili veriler (join ile alınacaksa)
    bolge_from?: { name: string } | null;
    bolge_to?: { name: string } | null;
}

// Form Verisi Arayüzü (Omit yerine doğrudan tanımlama)
interface PriceListFormData {
    vehicle_type: string | null;
    from_bolge_id: number | null; // State'te number tutulacak
    to_bolge_id: number | null;   // State'te number tutulacak
    transfer_type: TransferType;
    price: string; // Formda string, gönderirken number'a çevrilecek
    currency: string;
    is_active: boolean;
    price_type: PriceType;
}

// Sayfalama Meta Verileri
interface PaginationMeta {
    currentPage: number;
    lastPage: number;
    total: number;
    from: number;
    to: number;
}

const ITEMS_PER_PAGE = 15;

// Yardımcı Fonksiyon: Para Birimi Formatlama
const formatCurrency = (value: number | string | null | undefined, currency: string = 'EUR') => {
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
        return `${amount.toFixed(2)} ${currency}`;
    }
};

// Data for Selects
interface Vehicle {
    id: number;
    name: string; // Veya 'type' olabilir, kontrol edilmeli
    type: string;
}

// --- Komponent ---
export default function PriceListsPage() {
    const [priceLists, setPriceLists] = useState<PriceList[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1); // State eklendi
    const [totalPriceLists, setTotalPriceLists] = useState(0); // State eklendi
    // const [meta, setMeta] = useState<PaginationMeta | null>(null) // Eski meta yerine total kullanılıyor

    // Delete State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<PriceList | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Add State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [newFormData, setNewFormData] = useState<PriceListFormData>({
        vehicle_type: null,
        from_bolge_id: null,
        to_bolge_id: null,
        transfer_type: 'private',
        price: '',
        currency: 'EUR',
        is_active: true,
        price_type: 'per_vehicle',
    });
    const [isAdding, setIsAdding] = useState(false) // Bu state kullanılabilir
    const [addFormErrors, setAddFormErrors] = useState<{ [key: string]: string }>({}) // Form hataları için state

    // Edit State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [itemToEdit, setItemToEdit] = useState<PriceList | null>(null)
    const [editFormData, setEditFormData] = useState<PriceListFormData | null>(null) // Edit için ayrı state
    const [isEditing, setIsEditing] = useState(false) // Bu state kullanılabilir
    const [editFormErrors, setEditFormErrors] = useState<{ [key: string]: string }>({}) // Form hataları için state

    // Data for Selects
    const [bolges, setBolges] = useState<Bolge[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([]) // Araç tipleri için state

    // --- Veri Çekme ---

    // Araç Tiplerini Çek
    const fetchVehicles = useCallback(async () => {
        try {
            // is_active varsa filtreleyebiliriz
            const { data, error: fetchError } = await supabase
                .from('vehicles')
                .select('id, name, type') // 'name' ve 'type' sütunlarını seçiyoruz
                .order('name', { ascending: true });
            if (fetchError) throw fetchError;
            setVehicles(data || []);
        } catch (err) {
            console.error("Araç tipleri çekilirken hata:", err);
            setError('Form için araç tipleri yüklenemedi.');
            toast.error('Araç tipleri yüklenemedi.');
            setVehicles([]);
        }
    }, []);

    // Bölgeleri Çek
    const fetchBolges = useCallback(async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('bolge')
                .select('id, name')
                .eq('is_active', true)
                .order('name', { ascending: true });
            if (fetchError) throw fetchError;
            setBolges(data || []);
        } catch (err) {
            console.error("Bölge verileri çekilirken hata:", err);
            setError('Form için bölge verileri yüklenemedi.');
            toast.error('Bölge verileri yüklenemedi.');
            setBolges([]);
        }
    }, []);

    // Fiyat Listelerini Çek
    const fetchPriceLists = useCallback(async (page: number) => {
        setIsLoading(true);
        setError(null);
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        try {
            // İlişkili bölge adlarını da çekelim
            const { data, error: fetchError, count } = await supabase
                .from('price_lists')
                .select('*, bolge_from:from_bolge_id(name), bolge_to:to_bolge_id(name)', { count: 'exact' })
                .order('id', { ascending: true })
                .range(from, to);

            if (fetchError) throw fetchError;

            setPriceLists(data as PriceList[] || []);
            setTotalPriceLists(count || 0);
            setCurrentPage(page);
        } catch (err: unknown) {
            console.error("Fiyat listesi verileri çekilirken hata:", err);
            if (err instanceof Error) {
                setError(err.message || 'Fiyat listeleri yüklenirken bir hata oluştu.');
            } else {
                setError('Fiyat listeleri yüklenirken bilinmeyen bir hata oluştu.');
            }
            setPriceLists([]);
            setTotalPriceLists(0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // İlk Yükleme
    useEffect(() => {
        fetchBolges();
        fetchVehicles(); // Araç tiplerini de çek
        fetchPriceLists(1);
    }, [fetchBolges, fetchVehicles, fetchPriceLists]);

    // Sayfa Değişimi
    const handlePageChange = (page: number) => {
        fetchPriceLists(page);
    }

    // --- Form Doğrulama ---
    const validateForm = (data: PriceListFormData): { [key: string]: string } => {
        const errors: { [key: string]: string } = {};
        if (!data.from_bolge_id) errors.from_bolge_id = 'Başlangıç bölgesi gereklidir.';
        if (!data.to_bolge_id) errors.to_bolge_id = 'Varış bölgesi gereklidir.';
        if (data.from_bolge_id === data.to_bolge_id) errors.to_bolge_id = 'Başlangıç ve varış bölgesi aynı olamaz.';
        if (!data.vehicle_type) errors.vehicle_type = 'Araç tipi gereklidir.';
        if (!data.transfer_type) errors.transfer_type = 'Transfer tipi gereklidir.';
        if (!data.price_type) errors.price_type = 'Fiyat tipi gereklidir.';
        const priceValue = parseFloat(data.price);
        if (isNaN(priceValue) || priceValue <= 0) errors.price = 'Geçerli bir pozitif fiyat giriniz.';
        if (!data.currency) errors.currency = 'Para birimi gereklidir.';
        return errors;
    };

    // --- Silme İşlemleri ---
    const handleDeleteClick = (item: PriceList) => {
        setItemToDelete(item);
        setIsDeleteDialogOpen(true);
        setError(null);
    }

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        setError(null);
        try {
            const { error: deleteError } = await supabase
                .from('price_lists')
                .delete()
                .eq('id', itemToDelete.id);

            if (deleteError) throw deleteError;

            toast.success('Fiyat listesi başarıyla silindi.');
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);

            // Sayfa kontrolü
            const remainingItems = totalPriceLists - 1;
            const newLastPage = Math.ceil(remainingItems / ITEMS_PER_PAGE);
            const pageToFetch = currentPage > newLastPage ? Math.max(1, newLastPage) : currentPage;
            fetchPriceLists(pageToFetch);

        } catch (err: unknown) {
            console.error("Fiyat listesi silinirken hata:", err);
            if (err instanceof Error) {
                toast.error(err.message || 'Fiyat listesi silinirken bir hata oluştu.');
            } else {
                toast.error('Fiyat listesi silinirken bilinmeyen bir hata oluştu.');
            }
        } finally {
            setIsDeleting(false);
        }
    }

    // --- Ekleme İşlemleri ---
    const handleAddNewClick = () => {
        setNewFormData({ // Formu sıfırla
            vehicle_type: null,
            from_bolge_id: null,
            to_bolge_id: null,
            transfer_type: 'private',
            price: '',
            currency: 'EUR',
            is_active: true,
            price_type: 'per_vehicle',
        });
        setAddFormErrors({});
        setIsAddDialogOpen(true);
    };

    const handleNewInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setNewFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (addFormErrors[name]) {
            setAddFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleNewSelectChange = (name: keyof PriceListFormData, value: string | number | null) => {
        let processedValue: string | number | null = value;

        if (name === 'from_bolge_id' || name === 'to_bolge_id') {
            // Gelen değer string ise number'a çevir, değilse null yap
            processedValue = typeof value === 'string' && value !== '' ? parseInt(value, 10) : null;
            if (isNaN(processedValue as number)) {
                processedValue = null;
            }
        }
        // Diğer string alanlar için (vehicle_type, transfer_type, price_type) doğrudan value ata
        else if (typeof value !== 'string') {
             // Beklenmeyen durum, string olmayan değer gelirse null ata veya logla
             processedValue = null;
        }

        setNewFormData(prev => ({
            ...prev,
            [name]: processedValue as PriceListFormData[typeof name]
        }));
    };

     const handleNewCheckboxChange = (name: keyof PriceListFormData, checked: boolean) => {
        setNewFormData(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    const handleAddPriceList = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validateForm(newFormData);
        if (Object.keys(errors).length > 0) {
            setAddFormErrors(errors);
            return;
        }
        setAddFormErrors({});
        setIsAdding(true);

        // Supabase'e gönderilecek veriyi hazırla
        const payload = {
            ...newFormData,
            price: parseFloat(newFormData.price),
            from_bolge_id: newFormData.from_bolge_id ? parseInt(String(newFormData.from_bolge_id), 10) : null,
            to_bolge_id: newFormData.to_bolge_id ? parseInt(String(newFormData.to_bolge_id), 10) : null,
        };

        try {
            const { error: insertError } = await supabase
                .from('price_lists')
                .insert([payload]);

            if (insertError) throw insertError;

            toast.success('Fiyat listesi başarıyla eklendi.');
            fetchPriceLists(currentPage); // Listeyi yenile
            setIsAddDialogOpen(false); // Modalı kapat
        } catch (err: unknown) {
            console.error("Fiyat listesi eklenirken hata:", err);
            if (err instanceof Error) {
                setAddFormErrors({ form: err.message || 'Fiyat listesi eklenirken bir hata oluştu.' });
                toast.error(err.message || 'Fiyat listesi eklenemedi.');
            } else {
                setAddFormErrors({ form: 'Fiyat listesi eklenirken bilinmeyen bir hata oluştu.' });
                toast.error('Fiyat listesi eklenemedi.');
            }
        } finally {
            setIsAdding(false);
        }
    }

    // --- Düzenleme İşlemleri ---
    const handleEditClick = (item: PriceList) => {
        setItemToEdit(item);
        setEditFormData({
            ...item,
            from_bolge_id: item.from_bolge_id,
            to_bolge_id: item.to_bolge_id,
            price: String(item.price), // price number ise stringe çevir
            vehicle_type: item.vehicle_type, // bu zaten string | null olmalı
        });
        setIsEditDialogOpen(true);
        setEditFormErrors({});
    };

    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setEditFormData(prev => prev ? { // Önceki state null değilse güncelle
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        } : null);
        if (editFormErrors[name]) {
            setEditFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleEditSelectChange = (name: keyof PriceListFormData, value: string | number | null) => {
        if (!editFormData) return;
         let processedValue: string | number | null = value;

        if (name === 'from_bolge_id' || name === 'to_bolge_id') {
             processedValue = typeof value === 'string' && value !== '' ? parseInt(value, 10) : null;
             if (isNaN(processedValue as number)) {
                 processedValue = null;
             }
         }
         else if (typeof value !== 'string') {
              processedValue = null;
         }

        setEditFormData(prev => prev ? {
            ...prev,
            [name]: processedValue as PriceListFormData[typeof name]
        } : null);
    };

    const handleEditCheckboxChange = (name: keyof PriceListFormData, checked: boolean) => {
        setEditFormData(prev => prev ? {
            ...prev,
            [name]: checked
        }: null);
    };

    const handleUpdatePriceList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editFormData || !itemToEdit) return;

        const errors = validateForm(editFormData);
        if (Object.keys(errors).length > 0) {
            setEditFormErrors(errors);
            return;
        }
        setEditFormErrors({});
        setIsEditing(true);

        const payload = {
            ...editFormData,
            price: parseFloat(editFormData.price),
            from_bolge_id: editFormData.from_bolge_id ? parseInt(String(editFormData.from_bolge_id), 10) : null,
            to_bolge_id: editFormData.to_bolge_id ? parseInt(String(editFormData.to_bolge_id), 10) : null,
        };

        try {
            const { error: updateError } = await supabase
                .from('price_lists')
                .update(payload)
                .eq('id', itemToEdit.id);

            if (updateError) throw updateError;

            fetchPriceLists(currentPage); // Listeyi yenile
            setIsEditDialogOpen(false); // Modalı kapat
            toast.success('Fiyat listesi başarıyla güncellendi.');
        } catch (err: unknown) {
            console.error("Fiyat listesi güncellenirken hata:", err);
            if (err instanceof Error) {
                setEditFormErrors({ form: err.message || 'Fiyat listesi güncellenirken bir hata oluştu.' });
                toast.error(err.message || 'Fiyat listesi güncellenemedi.');
            } else {
                setEditFormErrors({ form: 'Fiyat listesi güncellenirken bilinmeyen bir hata oluştu.' });
                toast.error('Fiyat listesi güncellenemedi.');
            }
        } finally {
            setIsEditing(false);
        }
    }

    // --- Sayfalama Meta Hesaplama ---
    const lastPage = Math.ceil(totalPriceLists / ITEMS_PER_PAGE);
    const paginationMeta: PaginationMeta = {
        currentPage: currentPage,
        lastPage: lastPage,
        total: totalPriceLists,
        from: Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalPriceLists),
        to: Math.min(currentPage * ITEMS_PER_PAGE, totalPriceLists),
    };

    // --- Render ---
    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Fiyat Listeleri</h1>
                {/* Ekleme Dialogu */}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAddNewClick}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Fiyat Ekle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Yeni Fiyat Listesi Ekle</DialogTitle>
                            <DialogDescription>Yeni fiyat listesi detaylarını girin.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddPriceList} className="grid gap-4 py-4">
                            {/* From Bolge Select */}
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-from_bolge_id" className="text-right">Nereden <span className="text-red-500">*</span></Label>
                                <Select
                                    name="from_bolge_id"
                                    value={newFormData.from_bolge_id?.toString() ?? ''}
                                    onValueChange={(value) => handleNewSelectChange('from_bolge_id', value)}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Başlangıç Bölgesi Seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bolges.map(bolge => (
                                            <SelectItem key={bolge.id} value={bolge.id.toString()}>
                                                {bolge.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {addFormErrors.from_bolge_id && <p className="col-span-4 text-right text-sm text-red-500">{addFormErrors.from_bolge_id}</p>}
                            </div>
                            {/* To Bolge Select */}
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-to_bolge_id" className="text-right">Nereye <span className="text-red-500">*</span></Label>
                                <Select
                                    name="to_bolge_id"
                                    value={newFormData.to_bolge_id?.toString() ?? ''}
                                    onValueChange={(value) => handleNewSelectChange('to_bolge_id', value)}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Varış Bölgesi Seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bolges.map(bolge => (
                                            <SelectItem key={bolge.id} value={bolge.id.toString()}>
                                                {bolge.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {addFormErrors.to_bolge_id && <p className="col-span-4 text-right text-sm text-red-500">{addFormErrors.to_bolge_id}</p>}
                            </div>
                             {/* Vehicle Type Select */}
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-vehicle_type" className="text-right">Araç Tipi <span className="text-red-500">*</span></Label>
                                <Select
                                    name="vehicle_type"
                                    value={newFormData.vehicle_type ?? ''}
                                    onValueChange={(value) => handleNewSelectChange('vehicle_type', value)}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Araç Tipi Seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* Tekrarlayan tipleri filtrele ve tip stringini key/value olarak kullan */}
                                        {[...new Set(vehicles.map(v => v.type))].map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {addFormErrors.vehicle_type && <p className="col-span-4 text-right text-sm text-red-500">{addFormErrors.vehicle_type}</p>}
                            </div>
                             {/* Transfer Type Select */}
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-transfer_type" className="text-right">Transfer Tipi <span className="text-red-500">*</span></Label>
                                <Select
                                    name="transfer_type"
                                    value={newFormData.transfer_type}
                                    onValueChange={(value) => handleNewSelectChange('transfer_type', value as TransferType)}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {transferTypes.map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {addFormErrors.transfer_type && <p className="col-span-4 text-right text-sm text-red-500">{addFormErrors.transfer_type}</p>}
                            </div>
                             {/* Price Type Select */}
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-price_type" className="text-right">Fiyat Tipi <span className="text-red-500">*</span></Label>
                                <Select
                                    name="price_type"
                                    value={newFormData.price_type}
                                    onValueChange={(value) => handleNewSelectChange('price_type', value as PriceType)}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priceTypes.map(type => (
                                            <SelectItem key={type} value={type}>{type === 'per_vehicle' ? 'Araç Başı' : 'Kişi Başı'}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {addFormErrors.price_type && <p className="col-span-4 text-right text-sm text-red-500">{addFormErrors.price_type}</p>}
                            </div>
                            {/* Price Input */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-price" className="text-right">Fiyat <span className="text-red-500">*</span></Label>
                                <Input
                                    id="add-price"
                                    name="price"
                                    type="number"
                                    step="0.01"
                                    value={newFormData.price}
                                    onChange={handleNewInputChange}
                                    required
                                    className="col-span-3"
                                />
                                {addFormErrors.price && <p className="col-span-4 text-right text-sm text-red-500">{addFormErrors.price}</p>}
                            </div>
                            {/* Currency Input */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-currency" className="text-right">Para Birimi <span className="text-red-500">*</span></Label>
                                <Input
                                    id="add-currency"
                                    name="currency"
                                    value={newFormData.currency}
                                    onChange={handleNewInputChange}
                                    required
                                    className="col-span-3"
                                    // TODO: Belki Select yapılabilir (EUR, TRY, USD, GBP)
                                />
                                {addFormErrors.currency && <p className="col-span-4 text-right text-sm text-red-500">{addFormErrors.currency}</p>}
                            </div>
                             {/* Is Active Checkbox */}
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-is_active" className="text-right">Aktif mi?</Label>
                                <div className="col-span-3 flex items-center">
                                <Checkbox
                                    id="add-is_active"
                                    name="is_active"
                                    checked={newFormData.is_active}
                                     onCheckedChange={(checked: boolean | 'indeterminate') => handleNewCheckboxChange('is_active', !!checked)}
                                />
                                </div>
                            </div>
                            {addFormErrors.form && <p className="col-span-4 text-center text-sm text-red-500">{addFormErrors.form}</p>}
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">İptal</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isAdding}>
                                    {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Kaydet
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Nereden</TableHead>
                            <TableHead>Nereye</TableHead>
                            <TableHead>Araç Tipi</TableHead>
                            <TableHead>Transfer Tipi</TableHead>
                            <TableHead>Fiyat Tipi</TableHead>
                            <TableHead>Fiyat</TableHead>
                            <TableHead>Aktif</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={`skel-${index}`}>
                                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : priceLists.length > 0 ? (
                            priceLists.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.id}</TableCell>
                                    <TableCell>{item.bolge_from?.name ?? '-'}</TableCell>
                                    <TableCell>{item.bolge_to?.name ?? '-'}</TableCell>
                                    <TableCell>{item.vehicle_type ?? '-'}</TableCell>
                                    <TableCell>{item.transfer_type}</TableCell>
                                    <TableCell>{item.price_type === 'per_vehicle' ? 'Araç Başı' : 'Kişi Başı'}</TableCell>
                                    <TableCell>{formatCurrency(item.price, item.currency)}</TableCell>
                                    <TableCell>
                                        <Checkbox checked={item.is_active} disabled className="cursor-default" />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-1">
                                            {/* Düzenleme Dialogu */}
                                            <Dialog open={isEditDialogOpen && itemToEdit?.id === item.id} onOpenChange={setIsEditDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[600px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Fiyat Listesi Düzenle (ID: {itemToEdit?.id})</DialogTitle>
                                                        <DialogDescription>Fiyat listesi detaylarını güncelleyin.</DialogDescription>
                                                    </DialogHeader>
                                                     <form onSubmit={handleUpdatePriceList} className="grid gap-4 py-4">
                                                        {/* From Bolge Select */}
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-from_bolge_id" className="text-right">Nereden <span className="text-red-500">*</span></Label>
                                                            <Select
                                                                name="from_bolge_id"
                                                                value={editFormData?.from_bolge_id?.toString() ?? ''}
                                                                onValueChange={(value) => handleEditSelectChange('from_bolge_id', value)}
                                                            >
                                                                <SelectTrigger className="col-span-3">
                                                                    <SelectValue placeholder="Başlangıç Bölgesi Seçin" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {bolges.map(bolge => (
                                                                        <SelectItem key={bolge.id} value={bolge.id.toString()}>
                                                                            {bolge.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {editFormErrors.from_bolge_id && <p className="col-span-4 text-right text-sm text-red-500">{editFormErrors.from_bolge_id}</p>}
                                                        </div>
                                                        {/* To Bolge Select */}
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-to_bolge_id" className="text-right">Nereye <span className="text-red-500">*</span></Label>
                                                            <Select
                                                                name="to_bolge_id"
                                                                value={editFormData?.to_bolge_id?.toString() ?? ''}
                                                                onValueChange={(value) => handleEditSelectChange('to_bolge_id', value)}
                                                            >
                                                                <SelectTrigger className="col-span-3">
                                                                    <SelectValue placeholder="Varış Bölgesi Seçin" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {bolges.map(bolge => (
                                                                        <SelectItem key={bolge.id} value={bolge.id.toString()}>
                                                                            {bolge.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {editFormErrors.to_bolge_id && <p className="col-span-4 text-right text-sm text-red-500">{editFormErrors.to_bolge_id}</p>}
                                                        </div>
                                                         {/* Vehicle Type Select */}
                                                         <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-vehicle_type" className="text-right">Araç Tipi <span className="text-red-500">*</span></Label>
                                                            <Select
                                                                name="vehicle_type"
                                                                value={editFormData?.vehicle_type ?? ''}
                                                                onValueChange={(value) => handleEditSelectChange('vehicle_type', value)}
                                                            >
                                                                <SelectTrigger className="col-span-3">
                                                                    <SelectValue placeholder="Araç Tipi Seçin" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {/* Tekrarlayan tipleri filtrele ve tip stringini key/value olarak kullan */}
                                                                    {[...new Set(vehicles.map(v => v.type))].map(type => (
                                                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {editFormErrors.vehicle_type && <p className="col-span-4 text-right text-sm text-red-500">{editFormErrors.vehicle_type}</p>}
                                                        </div>
                                                          {/* Transfer Type Select */}
                                                         <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-transfer_type" className="text-right">Transfer Tipi <span className="text-red-500">*</span></Label>
                                                            <Select
                                                                name="transfer_type"
                                                                value={editFormData?.transfer_type ?? ''}
                                                                onValueChange={(value) => handleEditSelectChange('transfer_type', value as TransferType)}
                                                            >
                                                                <SelectTrigger className="col-span-3">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {transferTypes.map(type => (
                                                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {editFormErrors.transfer_type && <p className="col-span-4 text-right text-sm text-red-500">{editFormErrors.transfer_type}</p>}
                                                        </div>
                                                        {/* Price Type Select */}
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-price_type" className="text-right">Fiyat Tipi <span className="text-red-500">*</span></Label>
                                                            <Select
                                                                name="price_type"
                                                                value={editFormData?.price_type ?? ''}
                                                                onValueChange={(value) => handleEditSelectChange('price_type', value as PriceType)}
                                                            >
                                                                <SelectTrigger className="col-span-3">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {priceTypes.map(type => (
                                                                        <SelectItem key={type} value={type}>{type === 'per_vehicle' ? 'Araç Başı' : 'Kişi Başı'}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {editFormErrors.price_type && <p className="col-span-4 text-right text-sm text-red-500">{editFormErrors.price_type}</p>}
                                                        </div>
                                                        {/* Price Input */}
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-price" className="text-right">Fiyat <span className="text-red-500">*</span></Label>
                                                            <Input
                                                                id="edit-price"
                                                                name="price"
                                                                type="number"
                                                                step="0.01"
                                                                value={editFormData?.price ?? ''}
                                                                onChange={handleEditInputChange}
                                                                required
                                                                className="col-span-3"
                                                            />
                                                             {editFormErrors.price && <p className="col-span-4 text-right text-sm text-red-500">{editFormErrors.price}</p>}
                                                        </div>
                                                        {/* Currency Input */}
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-currency" className="text-right">Para Birimi <span className="text-red-500">*</span></Label>
                                                            <Input
                                                                id="edit-currency"
                                                                name="currency"
                                                                value={editFormData?.currency ?? 'EUR'}
                                                                onChange={handleEditInputChange}
                                                                required
                                                                className="col-span-3"
                                                            />
                                                             {editFormErrors.currency && <p className="col-span-4 text-right text-sm text-red-500">{editFormErrors.currency}</p>}
                                                        </div>
                                                        {/* Is Active Checkbox */}
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-is_active" className="text-right">Aktif mi?</Label>
                                                            <div className="col-span-3 flex items-center">
                                                            <Checkbox
                                                                id="edit-is_active"
                                                                name="is_active"
                                                                checked={editFormData?.is_active ?? true}
                                                                onCheckedChange={(checked: boolean | 'indeterminate') => handleEditCheckboxChange('is_active', !!checked)}
                                                            />
                                                            </div>
                                                        </div>
                                                        {editFormErrors.form && <p className="col-span-4 text-center text-sm text-red-500">{editFormErrors.form}</p>}
                                                        <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button type="button" variant="outline" onClick={() => setItemToEdit(null)}>İptal</Button>
                                                            </DialogClose>
                                                            <Button type="submit" disabled={isEditing}>
                                                                {isEditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                                Güncelle
                                                            </Button>
                                                        </DialogFooter>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>

                                            {/* Silme AlertDialogu */}
                                            <AlertDialog open={isDeleteDialogOpen && itemToDelete?.id === item.id} onOpenChange={setIsDeleteDialogOpen}>
                                                 <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => handleDeleteClick(item)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            ID: {itemToDelete?.id} olan fiyat listesini silmek üzeresiniz. Bu işlem geri alınamaz.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel onClick={() => setItemToDelete(null)}>İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
                                                             {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                            Evet, Sil
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
                                    Gösterilecek fiyat listesi bulunamadı.
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
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={paginationMeta.currentPage <= 1}
                            >
                                <ArrowLeft className="mr-1 h-4 w-4" /> Önceki
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
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