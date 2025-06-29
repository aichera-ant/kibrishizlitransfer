'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Loader2, PlusCircle, Pencil, Trash2 } from "lucide-react"
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

// Arayüzler
interface Bolge {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PaginationMeta {
    currentPage: number;
    lastPage: number;
    totalCount: number;
    perPage: number;
}

interface NewBolgeData {
    name: string;
    is_active: boolean;
}

interface EditBolgeData extends NewBolgeData {
    id: number;
}

const initialNewBolgeData: NewBolgeData = {
    name: '',
    is_active: true,
};

export default function BolgeYonetimiPage() {
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBolgeData, setNewBolgeData] = useState<NewBolgeData>(initialNewBolgeData);
  const [isAdding, setIsAdding] = useState(false); // Eskiden isSaving idi
  const [addError, setAddError] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bolgeToDelete, setBolgeToDelete] = useState<Bolge | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [bolgeToEdit, setBolgeToEdit] = useState<Bolge | null>(null);
  const [editBolgeData, setEditBolgeData] = useState<EditBolgeData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch Bolgeler (Supabase)
  const fetchBolgeler = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage - 1;

    try {
      const { data, error: fetchError, count } = await supabase
        .from('bolge') 
        .select('*', { count: 'exact' }) 
        .order('id', { ascending: true })
        .range(startIndex, endIndex);

      if (fetchError) throw fetchError;
      
      setBolgeler(data as Bolge[] || []); 
      setCurrentPage(page);
      setMeta({
            currentPage: page,
            lastPage: Math.ceil((count ?? 0) / itemsPerPage),
            totalCount: count ?? 0,
            perPage: itemsPerPage,
        });
    } catch (err: unknown) {
      console.error("Bölge verileri çekilirken hata (Supabase):", err);
      if (err instanceof Error) {
        setError(err.message || 'Bölgeler yüklenirken bir hata oluştu.');
      } else {
        setError('Bölgeler yüklenirken bilinmeyen bir hata oluştu.');
      }
      setBolgeler([]);
      setMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage, setIsLoading, setError, setBolgeler, setCurrentPage, setMeta]);

  useEffect(() => {
    fetchBolgeler(currentPage);
  }, [currentPage, fetchBolgeler]);

  // Add Handlers
  const handleAddInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewBolgeData(prev => ({ ...prev, [name]: value }));
    };
  const handleAddCheckboxChange = (checked: boolean) => {
        setNewBolgeData(prev => ({ ...prev, is_active: checked }));
    };

  const handleAddNewBolge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newBolgeData.name.trim()) {
      setAddError('Bölge adı boş olamaz.'); 
      return;
    }
    setIsAdding(true);
    setAddError(null);
    try {
      const { error: insertError } = await supabase
        .from('bolge')
        .insert(newBolgeData);

      if (insertError) throw insertError;

      fetchBolgeler(currentPage); // Listeyi güncelle
      setNewBolgeData(initialNewBolgeData); // Formu sıfırla
      setIsAddDialogOpen(false);
    } catch (err: unknown) {
      console.error("Bölge kaydedilirken hata (Supabase):", err);
      if (err instanceof Error) {
        setAddError(err.message || 'Bölge kaydedilirken bir hata oluştu.');
      } else {
        setAddError('Bölge kaydedilirken bilinmeyen bir hata oluştu.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Edit Handlers
  const handleEditClick = (bolge: Bolge) => {
    setBolgeToEdit(bolge);
    setEditBolgeData({ 
        id: bolge.id,
        name: bolge.name,
        is_active: bolge.is_active
    });
    setEditError(null);
    setIsEditDialogOpen(true);
  };
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditBolgeData(prev => prev ? { ...prev, [name]: value } : null);
    };
  const handleEditCheckboxChange = (checked: boolean) => {
        setEditBolgeData(prev => prev ? { ...prev, is_active: checked } : null);
    };

  const handleUpdateBolge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editBolgeData || !editBolgeData.name.trim()) {
      setEditError('Bölge adı boş olamaz.');
      return;
    }
    
    if (editBolgeData.name === bolgeToEdit?.name && editBolgeData.is_active === bolgeToEdit?.is_active) {
        setIsEditDialogOpen(false);
        return;
    }

    setIsUpdating(true);
    setEditError(null);
    try {
      const payload = {
          name: editBolgeData.name,
          is_active: editBolgeData.is_active
      };
      const { error: updateError } = await supabase
        .from('bolge')
        .update(payload)
        .eq('id', editBolgeData.id);

      if (updateError) throw updateError;

      setBolgeler(prev => prev.map(b => b.id === editBolgeData.id ? { ...b, ...payload } : b));
      
      setIsEditDialogOpen(false);
      setBolgeToEdit(null);
      setEditBolgeData(null);
    } catch (err: unknown) {
      console.error("Bölge güncellenirken hata (Supabase):", err);
      if (err instanceof Error) {
        setEditError(err.message || 'Bölge güncellenirken bir hata oluştu.');
      } else {
        setEditError('Bölge güncellenirken bilinmeyen bir hata oluştu.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Handlers
  const handleDeleteClick = (bolge: Bolge) => {
    setBolgeToDelete(bolge);
    setError(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!bolgeToDelete) return;

    setIsDeleting(true);
    setError(null);
    try {
        // 1. İlişkili Lokasyon Kontrolü
        const { count: locCount, error: locCheckError } = await supabase
            .from('locations')
            .select('id', { count: 'exact', head: true })
            .eq('bolge_id', bolgeToDelete.id);

        if (locCheckError) throw new Error(`Lokasyon kontrol hatası: ${locCheckError.message}`);
        if ((locCount ?? 0) > 0) {
             setError(`Bu bölge (${locCount} adet) lokasyonda kullanıldığı için silinemez.`);
             setIsDeleting(false);
             setIsDeleteDialogOpen(false);
             setBolgeToDelete(null);
             return;
        }

        // 2. İlişkili Fiyat Listesi Kontrolü (from)
        const { count: priceFromCount, error: priceFromCheckError } = await supabase
            .from('price_lists')
            .select('id', { count: 'exact', head: true })
            .eq('from_bolge_id', bolgeToDelete.id);
        
        if (priceFromCheckError) throw new Error(`Fiyat listesi (kalkış) kontrol hatası: ${priceFromCheckError.message}`);
        if ((priceFromCount ?? 0) > 0) {
             setError(`Bu bölge (${priceFromCount} adet) fiyat listesinde (kalkış) kullanıldığı için silinemez.`);
             setIsDeleting(false);
             setIsDeleteDialogOpen(false);
             setBolgeToDelete(null);
             return;
        }

        // 3. İlişkili Fiyat Listesi Kontrolü (to)
         const { count: priceToCount, error: priceToCheckError } = await supabase
            .from('price_lists')
            .select('id', { count: 'exact', head: true })
            .eq('to_bolge_id', bolgeToDelete.id);
        
        if (priceToCheckError) throw new Error(`Fiyat listesi (varış) kontrol hatası: ${priceToCheckError.message}`);
        if ((priceToCount ?? 0) > 0) {
             setError(`Bu bölge (${priceToCount} adet) fiyat listesinde (varış) kullanıldığı için silinemez.`);
             setIsDeleting(false);
             setIsDeleteDialogOpen(false);
             setBolgeToDelete(null);
             return;
        }

        // 4. İlişki yoksa sil
        const { error: deleteError } = await supabase
            .from('bolge')
            .delete()
            .eq('id', bolgeToDelete.id);

        if (deleteError) throw deleteError;

        setBolgeler(prev => prev.filter(b => b.id !== bolgeToDelete.id));
         // Sayfa yönetimi
        if (bolgeler.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
        } else {
            fetchBolgeler(currentPage); // Sayıyı ve sırayı güncellemek için yeniden çek
        }

        setIsDeleteDialogOpen(false);
        setBolgeToDelete(null);
    } catch (err: unknown) {
      console.error("Bölge silinirken hata (Supabase):", err);
      if (err instanceof Error) {
        setError(err.message || 'Bölge silinirken bir hata oluştu.');
      } else {
        setError('Bölge silinirken bilinmeyen bir hata oluştu.');
      }
      setIsDeleting(false);
    }
  };

  // Sayfa Değiştirme Handler
  const handlePageChange = (page: number) => {
        setCurrentPage(page);
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex items-center justify-between">
           <h1 className="text-2xl font-semibold">Bölge Yönetimi</h1>
           <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Bölge Ekle
                </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Yeni Bölge Ekle</DialogTitle>
                    <DialogDescription>
                    Yeni transfer bölgesi adını girin.
                    </DialogDescription>
                </DialogHeader>
                {addError && (
                    <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Ekleme Hatası</AlertTitle>
                    <AlertDescription>{addError}</AlertDescription>
                    </Alert>
                )}
                <form onSubmit={handleAddNewBolge} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Ad</Label>
                        <Input id="name" name="name" value={newBolgeData.name} onChange={handleAddInputChange} className="col-span-3" placeholder="Örn: Girne Merkez" required/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="is_active" className="text-right">Aktif mi?</Label>
                         <Checkbox id="is_active" name="is_active" checked={newBolgeData.is_active} onCheckedChange={handleAddCheckboxChange} className="col-span-3 justify-self-start"/>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isAdding}>İptal</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isAdding}>
                        {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kaydet
                        </Button>
                    </DialogFooter>
                </form>
                </DialogContent>
            </Dialog>
       </div>

      {error && !isAddDialogOpen && !isEditDialogOpen && !isDeleteDialogOpen && (
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Hata</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

      <Card>
        <CardContent className="p-0"> {/* Padding'i kaldırdık, tabloya bırakalım */}
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Aktif</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: itemsPerPage }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                ) : bolgeler.length > 0 ? (
                    bolgeler.map((bolge) => (
                        <TableRow key={bolge.id}>
                            <TableCell>{bolge.id}</TableCell>
                            <TableCell className="font-medium">{bolge.name}</TableCell>
                            <TableCell>{bolge.is_active ? 'Evet' : 'Hayır'}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(bolge)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => handleDeleteClick(bolge)}
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                   <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            Gösterilecek bölge bulunamadı.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
           {/* Sayfalama */} 
           {meta && meta.lastPage > 1 && (
                <div className="flex items-center justify-center space-x-2 p-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Önceki</Button>
                    <span className="px-4 py-2 text-sm text-muted-foreground">Sayfa {currentPage} / {meta.lastPage}</span>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === meta.lastPage}>Sonraki</Button>
                </div>
            )}
        </CardContent>
      </Card>

        {/* Düzenleme Dialogu */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Bölge Düzenle (ID: {bolgeToEdit?.id})</DialogTitle>
                <DialogDescription>
                    Bölge adını veya aktiflik durumunu güncelleyin.
                </DialogDescription>
                </DialogHeader>
                 {editError && (
                    <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Güncelleme Hatası</AlertTitle>
                    <AlertDescription>{editError}</AlertDescription>
                    </Alert>
                )}
                {editBolgeData && (
                    <form onSubmit={handleUpdateBolge} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit_name" className="text-right">Ad</Label>
                            <Input id="edit_name" name="name" value={editBolgeData.name} onChange={handleEditInputChange} className="col-span-3" required/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit_is_active" className="text-right">Aktif mi?</Label>
                            <Checkbox id="edit_is_active" name="is_active" checked={editBolgeData.is_active} onCheckedChange={handleEditCheckboxChange} className="col-span-3 justify-self-start"/>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" onClick={() => {setIsEditDialogOpen(false); setBolgeToEdit(null); setEditBolgeData(null);}} disabled={isUpdating}>İptal</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>

        {/* Silme Onay Dialogu */} 
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Emin Misiniz?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {`Seçili bölgeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz. 
                        Bölgeye bağlı lokasyonlar varsa silme işlemi başarısız olacaktır. 
                        Silmeden önce bölgenin herhangi bir lokasyonda kullanılmadığından emin olun.`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {error && isDeleteDialogOpen && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Silme Hatası</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setBolgeToDelete(null)} disabled={isDeleting}>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sil
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  )
} 