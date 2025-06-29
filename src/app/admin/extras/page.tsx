'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
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
    DialogTrigger
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { PlusCircle, Edit, Trash2, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import PaginationControls from '@/components/PaginationControls'

interface Extra {
    id: number;
    name: string;
    description: string | null;
    price: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

type ExtraFormData = Omit<Extra, 'id' | 'created_at' | 'updated_at' | 'price'> & {
    price: string;
};

interface PaginationMeta {
    currentPage: number;
    lastPage: number;
    total: number;
    from: number;
    to: number;
}

const ITEMS_PER_PAGE = 10;

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
    } catch (error) {
        console.error("Currency formatting error:", error);
        return `${amount.toFixed(2)} ${currency}`;
    }
}

export default function AdminExtrasPage() {
    const [extras, setExtras] = useState<Extra[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalExtras, setTotalExtras] = useState(0)
    const [searchTerm, setSearchTerm] = useState('')
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedExtra, setSelectedExtra] = useState<Extra | null>(null)
    const [formData, setFormData] = useState<ExtraFormData>(initializeFormData())
    const [formErrors, setFormErrors] = useState<{ [key: string]: string | undefined }>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    function initializeFormData(): ExtraFormData {
        return {
            name: '',
            description: '',
            price: '',
            is_active: true,
        };
    }

    const fetchExtras = useCallback(async (page = 1, search = '') => {
        setIsLoading(true)
        setError(null)
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        try {
            let query = supabase
                .from('extras')
                .select('*', { count: 'exact' })
                .order('id', { ascending: true })
                .range(from, to);

            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }

            const { data, error: fetchError, count } = await query;

            if (fetchError) throw fetchError;

            setExtras(data || []);
            setTotalExtras(count || 0);
            setCurrentPage(page);
        } catch (err: unknown) {
            console.error('Ekstralar alınamadı (Supabase):', err)
            let specificMessage = 'Ekstralar yüklenirken bir hata oluştu.';
            if (err instanceof Error) {
                specificMessage = err.message || specificMessage;
            }
            setError(specificMessage);
            toast.error(specificMessage);
            setExtras([]);
            setTotalExtras(0);
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchExtras(1, searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, fetchExtras])

    const handlePageChange = (page: number) => {
        fetchExtras(page, searchTerm);
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: ExtraFormData) => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
             setFormErrors((prev: { [key: string]: string | undefined }) => ({ ...prev, [name]: undefined }));
         }
    }

    const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
        setFormData((prev: ExtraFormData) => ({ ...prev, is_active: !!checked }));
    }

    const validateForm = (data: ExtraFormData): boolean => {
        const errors: { [key: string]: string } = {};
        if (!data.name.trim()) errors.name = 'Ekstra adı gereklidir.';
        const priceValue = parseFloat(data.price);
        if (isNaN(priceValue) || priceValue < 0) errors.price = 'Geçerli bir fiyat giriniz (0 veya daha büyük).';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const openModalForNew = () => {
        setSelectedExtra(null);
        setFormData(initializeFormData());
        setFormErrors({});
        setIsAddDialogOpen(true);
    }

    const openModalForEdit = (extra: Extra) => {
        setSelectedExtra(extra);
        setFormData({
            name: extra.name,
            description: extra.description || '',
            price: extra.price.toString(),
            is_active: extra.is_active,
        });
        setFormErrors({});
        setIsEditDialogOpen(true);
    }

    const handleAddExtra = async () => {
        if (!validateForm(formData)) return;
        setIsSubmitting(true);

        const payload = {
            ...formData,
            price: parseFloat(formData.price),
            description: (formData.description || '').trim() || null,
        };

        try {
            const { error } = await supabase.from('extras').insert(payload);
            if (error) throw error;
            toast.success("Ekstra başarıyla eklendi.");
            setIsAddDialogOpen(false);
            fetchExtras(1, searchTerm);
        } catch (err: unknown) {
            console.error('Ekstra eklenemedi (Supabase):', err);
            let specificMessage = 'Ekstra eklenirken bilinmeyen bir veritabanı hatası oluştu.';
            if (err instanceof Error) {
                specificMessage = err.message || specificMessage;
            }
            toast.error(`Ekstra eklenirken hata oluştu: ${specificMessage}`);
             setFormErrors(prev => ({ ...prev, form: specificMessage }));
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleUpdateExtra = async () => {
        if (!selectedExtra || !validateForm(formData)) return;
        setIsSubmitting(true);

        const payload = {
            ...formData,
            price: parseFloat(formData.price),
            description: (formData.description || '').trim() || null,
        };

        try {
            const { error } = await supabase
                .from('extras')
                .update(payload)
                .eq('id', selectedExtra.id);
            if (error) throw error;
            toast.success("Ekstra başarıyla güncellendi.");
            setIsEditDialogOpen(false);
            fetchExtras(currentPage, searchTerm);
        } catch (err: unknown) {
            console.error('Ekstra güncellenemedi (Supabase):', err);
            let specificMessage = 'Ekstra güncellenirken bilinmeyen bir veritabanı hatası oluştu.';
            if (err instanceof Error) {
                specificMessage = err.message || specificMessage;
            }
            toast.error(`Ekstra güncellenirken hata oluştu: ${specificMessage}`);
             setFormErrors(prev => ({ ...prev, form: specificMessage }));
        } finally {
            setIsSubmitting(false);
        }
    }

    const openModalForDelete = (extra: Extra) => {
        setSelectedExtra(extra);
        setIsDeleteDialogOpen(true);
    }

    const confirmDelete = async () => {
        if (!selectedExtra) return;
        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('extras')
                .delete()
                .eq('id', selectedExtra.id);
            if (error) throw error;
            toast.success("Ekstra başarıyla silindi.");
            setIsDeleteDialogOpen(false);
            const remainingItems = totalExtras - 1;
            const newLastPage = Math.ceil(remainingItems / ITEMS_PER_PAGE);
            const pageToFetch = currentPage > newLastPage ? Math.max(1, newLastPage) : currentPage;
            fetchExtras(pageToFetch, searchTerm);
        } catch (err: unknown) {
            console.error('Ekstra silinemedi (Supabase):', err);
            let specificMessage = 'Ekstra silinirken bilinmeyen bir veritabanı hatası oluştu.';
            if (err instanceof Error) {
                specificMessage = err.message || specificMessage;
            }
            toast.error(`Ekstra silinirken hata oluştu: ${specificMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    const lastPage = Math.ceil(totalExtras / ITEMS_PER_PAGE);
    const paginationMeta: PaginationMeta = {
        currentPage: currentPage,
        lastPage: lastPage > 0 ? lastPage : 1,
        total: totalExtras,
        from: totalExtras === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1,
        to: Math.min(currentPage * ITEMS_PER_PAGE, totalExtras),
    };

    return (
        <div className="container mx-auto p-4">
            <Toaster />
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Ekstra Yönetimi</h1>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openModalForNew}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Ekstra Ekle
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle><span>Yeni Ekstra Ekle</span></DialogTitle>
                            <DialogDescription><span>Yeni ekstra ürün veya hizmet detaylarını girin.</span></DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); handleAddExtra(); }} className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-name" className="text-right"><span>Ad <span className="text-red-500">*</span></span></Label>
                                <Input id="add-name" name="name" value={formData.name} onChange={handleInputChange} required className="col-span-3" />
                                {formErrors.name && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.name}</p>}
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-description" className="text-right"><span>Açıklama</span></Label>
                                <Textarea id="add-description" name="description" value={formData.description || ''} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-price" className="text-right"><span>Fiyat (TRY) <span className="text-red-500">*</span></span></Label>
                                <Input id="add-price" name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange} required className="col-span-3" />
                                {formErrors.price && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.price}</p>}
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="add-is_active" className="text-right"><span>Aktif mi?</span></Label>
                                <div className="col-span-3 flex items-center">
                                    <Checkbox id="add-is_active" name="is_active" checked={formData.is_active} onCheckedChange={handleCheckboxChange} />
                                </div>
                            </div>
                            {formErrors.form && <p className="col-span-4 text-center text-sm text-red-500">{String(formErrors.form)}</p>}
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

            <div className="mb-4">
                <Input
                    placeholder="Ekstra adı veya açıklamasına göre ara..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
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
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Ad</TableHead>
                            <TableHead>Açıklama</TableHead>
                            <TableHead>Fiyat</TableHead>
                            <TableHead>Aktif</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                                <TableRow key={`skel-${index}`}>
                                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : extras.length > 0 ? (
                            extras.map((extra: Extra) => (
                                <TableRow key={extra.id}>
                                    <TableCell>{extra.id}</TableCell>
                                    <TableCell>{extra.name}</TableCell>
                                    <TableCell className="max-w-xs truncate" title={extra.description || ''}>{extra.description || '-'}</TableCell>
                                    <TableCell>{formatCurrency(extra.price)}</TableCell>
                                    <TableCell>
                                        {extra.is_active ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-1">
                                            <Dialog open={isEditDialogOpen && selectedExtra?.id === extra.id} onOpenChange={setIsEditDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => openModalForEdit(extra)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle><span>Ekstra Düzenle (ID: {selectedExtra?.id})</span></DialogTitle>
                                                        <DialogDescription><span>Ekstra ürün veya hizmet detaylarını güncelleyin.</span></DialogDescription>
                                                    </DialogHeader>
                                                     <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); handleUpdateExtra(); }} className="grid gap-4 py-4">
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-name" className="text-right"><span>Ad <span className="text-red-500">*</span></span></Label>
                                                            <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} required className="col-span-3" />
                                                            {formErrors.name && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.name}</p>}
                                                        </div>
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-description" className="text-right"><span>Açıklama</span></Label>
                                                            <Textarea id="edit-description" name="description" value={formData.description || ''} onChange={handleInputChange} className="col-span-3" />
                                                        </div>
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-price" className="text-right"><span>Fiyat (TRY) <span className="text-red-500">*</span></span></Label>
                                                            <Input id="edit-price" name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange} required className="col-span-3" />
                                                            {formErrors.price && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.price}</p>}
                                                        </div>
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="edit-is_active" className="text-right"><span>Aktif mi?</span></Label>
                                                            <div className="col-span-3 flex items-center">
                                                                <Checkbox id="edit-is_active" name="is_active" checked={formData.is_active} onCheckedChange={handleCheckboxChange} />
                                                            </div>
                                                        </div>
                                                        {formErrors.form && <p className="col-span-4 text-center text-sm text-red-500">{String(formErrors.form)}</p>}
                                                        <DialogFooter>
                                                            <DialogClose asChild><Button type="button" variant="outline">İptal</Button></DialogClose>
                                                            <Button type="submit" disabled={isSubmitting}>
                                                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Güncelle
                                                            </Button>
                                                        </DialogFooter>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>

                                            <AlertDialog open={isDeleteDialogOpen && selectedExtra?.id === extra.id} onOpenChange={setIsDeleteDialogOpen}>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => openModalForDelete(extra)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            `{selectedExtra?.name}` adlı ekstrayı silmek üzeresiniz (ID: {selectedExtra?.id}). Bu işlem geri alınamaz.
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
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Gösterilecek ekstra bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {!isLoading && totalExtras > 0 && (
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