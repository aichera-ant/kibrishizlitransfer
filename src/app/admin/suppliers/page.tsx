'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle } from 'lucide-react';

// --- Types --- Interfaces ---
type SupplierType = 'İşavansı' | 'Firma' | 'Ortak' | 'Araç Tedarikçisi';

interface Supplier {
    id: number;
    name: string;
    contact_name: string | null; // Eklendi
    contact_email: string | null; // Eklendi
    contact_phone: string | null; // Eklendi
    is_active: boolean; // Eklendi
    address: string | null;
    tax_id: string | null;
    phone: string | null; // Genel telefon?
    email: string | null; // Genel email?
    supplier_type: SupplierType;
    created_at: string; // Bu genellikle gösterilmez ama fetch edilir
    updated_at?: string | null; // Eklendi
    deleted_at?: string | null; // Eklendi
}

interface SupplierFormData {
    id?: number | null;
    name: string;
    contact_name: string; // Eklendi
    contact_email: string; // Eklendi
    contact_phone: string; // Eklendi
    is_active: boolean; // Eklendi
    address: string;
    tax_id: string;
    phone: string; // Genel telefon?
    email: string; // Genel email?
    supplier_type: SupplierType;
}

const initialFormData: SupplierFormData = {
    name: '',
    contact_name: '', // Eklendi
    contact_email: '', // Eklendi
    contact_phone: '', // Eklendi
    is_active: true, // Eklendi, varsayılan aktif
    address: '',
    tax_id: '',
    phone: '', // Genel telefon?
    email: '', // Genel email?
    supplier_type: 'Firma', // Default value
};

const supplierTypes: SupplierType[] = ['İşavansı', 'Firma', 'Ortak', 'Araç Tedarikçisi'];

// ... (supplierTypes remains the same) ...

// --- Component ---
export default function SupplierManagementPage() {
    // ... (states remain mostly the same, add Switch import later if needed) ...
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [formData, setFormData] = useState<SupplierFormData>(initialFormData)
    const [deletingSupplierId, setDeletingSupplierId] = useState<number | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    // ... (fetchSuppliers remains the same) ...
    const fetchSuppliers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*') // Select all columns
                .order('name', { ascending: true });

            if (error) throw error;
            setSuppliers(data || []);
        } catch (err: unknown) {
            console.error("Tedarikçiler yüklenirken hata:", err);
            setError("Tedarikçi verileri yüklenirken bir hata oluştu.");
            const message = err instanceof Error ? err.message : "Bilinmeyen bir yükleme hatası.";
            toast.error("Tedarikçiler yüklenemedi.", { description: message });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    // ... (handleInputChange, handleSelectChange, validateForm remain mostly the same for now) ...
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // Handle checkbox for is_active later if we use it
        setFormData(prev => ({
             ...prev,
             [name]: value
         }));
        setFormError(null);
    };

    const handleSwitchChange = (checked: boolean) => {
        setFormData(prev => ({ ...prev, is_active: checked }));
        setFormError(null);
    };

    const handleSelectChange = (value: SupplierType) => {
        setFormData(prev => ({ ...prev, supplier_type: value }));
        setFormError(null);
    };

    const validateForm = (): boolean => {
        setFormError(null);
        if (!formData.name.trim()) {
            setFormError("Firma adı boş bırakılamaz.");
            return false;
        }
        // Validate contact_email if provided
        if (formData.contact_email.trim() && !/\S+@\S+\.\S+/.test(formData.contact_email)) {
            setFormError("Geçerli bir iletişim e-posta adresi girin.");
            return false;
        }
         // Validate general email if provided
         if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
            setFormError("Geçerli bir genel e-posta adresi girin.");
            return false;
        }
        return true;
    };

    // --- Save/Update Handling ---
    const handleSaveSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // Formun sayfa yenilemesini engelle
        if (!validateForm()) {
            return; // Doğrulama başarısızsa çık
        }

        setIsProcessing(true);
        setFormError(null);

        const supplierData = {
            name: formData.name.trim(),
            contact_name: formData.contact_name.trim() || null,
            contact_email: formData.contact_email.trim() || null,
            contact_phone: formData.contact_phone.trim() || null,
            is_active: formData.is_active,
            address: formData.address.trim() || null,
            tax_id: formData.tax_id.trim() || null,
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
            supplier_type: formData.supplier_type,
            updated_at: new Date().toISOString(), // Güncelleme zamanı
        };

        try {
            let result;
            if (formData.id) {
                // Update existing supplier
                const { data, error } = await supabase
                    .from('suppliers')
                    .update(supplierData)
                    .eq('id', formData.id)
                    .select() // Güncellenen veriyi geri al
                    .single(); // Tek bir kayıt döndüğünü varsay

                if (error) throw error;
                result = data;
                toast.success(`"${result.name}" başarıyla güncellendi.`);
                 // Yerel state'i güncelle
                 setSuppliers(prev => prev.map(s => s.id === result!.id ? { ...s, ...result! } : s));
            } else {
                // Add new supplier
                const { data, error } = await supabase
                    .from('suppliers')
                    .insert(supplierData)
                    .select() // Eklenen veriyi geri al
                    .single(); // Tek bir kayıt döndüğünü varsay

                if (error) throw error;
                result = data;
                toast.success(`"${result.name}" başarıyla eklendi.`);
                 // Yerel state'e ekle
                 setSuppliers(prev => [...prev, result!].sort((a, b) => a.name.localeCompare(b.name)));
            }

            setIsAddEditDialogOpen(false); // Dialog'u kapat
            setFormData(initialFormData); // Formu sıfırla

        } catch (err: unknown) {
            console.error("Tedarikçi kaydedilirken/güncellenirken hata:", err);
            const errorMessage = err instanceof Error ? err.message : (formData.id ? "Tedarikçi güncellenirken bir hata oluştu." : "Tedarikçi kaydedilirken bir hata oluştu.");
            setFormError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Edit Handling ---
    const handleEditClick = (supplier: Supplier) => {
        setFormData({
            id: supplier.id,
            name: supplier.name,
            contact_name: supplier.contact_name || '',
            contact_email: supplier.contact_email || '',
            contact_phone: supplier.contact_phone || '',
            is_active: supplier.is_active ?? true, // Default to true if null/undefined
            address: supplier.address || '',
            tax_id: supplier.tax_id || '',
            phone: supplier.phone || '', // Genel telefon?
            email: supplier.email || '', // Genel email?
            supplier_type: supplier.supplier_type,
        });
        setFormError(null);
        setIsAddEditDialogOpen(true);
    };

    // ... (Delete handling remains the same) ...
    const handleDeleteClick = (id: number) => {
        setDeletingSupplierId(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingSupplierId) return;
        setIsProcessing(true);
        try {
            const { error: deleteError } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', deletingSupplierId);

            if (deleteError) throw deleteError;

            toast.success("Tedarikçi başarıyla silindi.");
            setSuppliers(prev => prev.filter(s => s.id !== deletingSupplierId));
            setIsDeleteDialogOpen(false);
            setDeletingSupplierId(null);
        } catch (err: unknown) {
            console.error("Tedarikçi silinirken hata:", err);
            const message = err instanceof Error ? err.message : "Tedarikçi silinirken bir hata oluştu.";
            toast.error("Silme işlemi başarısız oldu.", { description: message });
            setFormError(message); // Genel hata mesajı için
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Render Add/Edit Form ---
    const renderAddEditForm = () => (
        <form onSubmit={handleSaveSubmit}>
            <DialogHeader>
                <DialogTitle>{formData.id ? 'Tedarikçiyi Düzenle' : 'Yeni Tedarikçi Ekle'}</DialogTitle>
                <DialogDescription>
                    Tedarikçi firma bilgilerini girin. * ile işaretli alanlar zorunludur.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-4"> {/* 3 sütuna çıkarıldı */}
                 {/* Column 1 */}
                 <div className="space-y-2">
                     <Label htmlFor="name">Firma Adı *</Label>
                     <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                 </div>
                 <div className="space-y-2">
                     <Label htmlFor="supplier_type">Firma Tipi *</Label>
                     <Select name="supplier_type" value={formData.supplier_type} onValueChange={handleSelectChange} required>
                         <SelectTrigger>
                             <SelectValue placeholder="Firma Tipi Seçin..." />
                         </SelectTrigger>
                         <SelectContent>
                             {supplierTypes.map(type => (
                                 <SelectItem key={type} value={type}>{type}</SelectItem>
                             ))}
                         </SelectContent>
                     </Select>
                 </div>
                <div className="space-y-2">
                    <Label htmlFor="tax_id">Firma VKN</Label>
                    <Input id="tax_id" name="tax_id" value={formData.tax_id} onChange={handleInputChange} />
                </div>


                {/* Column 2 */}
                 <div className="space-y-2">
                     <Label htmlFor="contact_name">İletişim Adı</Label>
                     <Input id="contact_name" name="contact_name" value={formData.contact_name} onChange={handleInputChange} />
                 </div>
                 <div className="space-y-2">
                     <Label htmlFor="contact_phone">İletişim Telefon</Label>
                     <Input id="contact_phone" name="contact_phone" type="tel" value={formData.contact_phone} onChange={handleInputChange} />
                 </div>
                 <div className="space-y-2">
                     <Label htmlFor="contact_email">İletişim Email</Label>
                     <Input id="contact_email" name="contact_email" type="email" value={formData.contact_email} onChange={handleInputChange} />
                 </div>

                 {/* Column 3 */}
                 <div className="space-y-2">
                     <Label htmlFor="phone">Genel Telefon</Label>
                     <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
                 </div>
                 <div className="space-y-2">
                     <Label htmlFor="email">Genel Email</Label>
                     <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                 </div>
                 <div className="flex items-center space-x-2 pt-8"> {/* pt-8 ile hizalama */}
                    <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={handleSwitchChange}
                    />
                    <Label htmlFor="is_active">Aktif</Label>
                </div>


                 {/* Address (spans across columns) */}
                <div className="space-y-2 md:col-span-3"> {/* 3 sütunu kapla */}
                    <Label htmlFor="address">Firma Adresi</Label>
                    <Textarea id="address" name="address" value={formData.address} onChange={handleInputChange} rows={3} />
                </div>

            </div>

            {formError && (
                <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Form Hatası</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                </Alert>
            )}

            <DialogFooter className="mt-6">
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isProcessing}>İptal</Button>
                </DialogClose>
                <Button type="submit" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {formData.id ? 'Güncelle' : 'Kaydet'}
                </Button>
            </DialogFooter>
        </form>
    );

    // --- Main Render ---
    return (
        <div>
            {/* ... (Header remains the same) ... */}
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Tedarikçi Yönetimi</h1> {/* Updated Title */}
                <Dialog open={isAddEditDialogOpen} onOpenChange={(isOpen) => {
                    setIsAddEditDialogOpen(isOpen);
                    if (!isOpen) {
                        setFormData(initialFormData); // Dialog kapanınca formu sıfırla
                        setFormError(null);
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Yeni Tedarikçi Ekle {/* Updated Button Text */}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-3xl"> {/* Genişliği ayarlayabilirsiniz */}
                        {renderAddEditForm()} {/* This function will be updated next */}
                    </DialogContent>
                </Dialog>
            </div>

            {/* ... (Loading/Error handling remains the same) ... */}
             {isLoading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            ) : error ? (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Hata</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            {/* Updated Headers based on screenshot and new fields */}
                            <TableHead>Ad</TableHead>
                            <TableHead>Firma Tipi</TableHead>
                            <TableHead>İletişim Adı</TableHead>
                            <TableHead>İletişim Telefon</TableHead>
                            <TableHead>İletişim Email</TableHead>
                            <TableHead>VKN</TableHead>
                            <TableHead>Aktif</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    Kayıtlı tedarikçi bulunamadı.
                                </TableCell>
                            </TableRow>
                        ) : (
                            suppliers.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell className="font-medium">{supplier.name}</TableCell>
                                    <TableCell>{supplier.supplier_type}</TableCell>
                                    <TableCell>{supplier.contact_name || '-'}</TableCell>
                                    <TableCell>{supplier.contact_phone || '-'}</TableCell>
                                    <TableCell>{supplier.contact_email || '-'}</TableCell>
                                    <TableCell>{supplier.tax_id || '-'}</TableCell>
                                    <TableCell>{supplier.is_active ? 'Evet' : 'Hayır'}</TableCell>
                                    <TableCell className="text-right">
                                        {/* Edit Button */}
                                        <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditClick(supplier)}>
                                             <Edit className="h-4 w-4" />
                                         </Button>

                                        {/* Delete Button */}
                                        <AlertDialog open={isDeleteDialogOpen && deletingSupplierId === supplier.id} onOpenChange={setIsDeleteDialogOpen}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(supplier.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {'"'}<span className="font-semibold">{supplier.name}</span>{'"'} adlı tedarikçiyi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel disabled={isProcessing}>İptal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={confirmDelete} disabled={isProcessing} className="bg-red-500 hover:bg-red-600">
                                                         {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                         Sil
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            )}
        </div>
    );
} 