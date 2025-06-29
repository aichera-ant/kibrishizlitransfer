'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import { Skeleton } from "@/components/ui/skeleton"
import { PlusCircle, Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react' 
// import Link from 'next/link' 
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
  } from "@/components/ui/alert-dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea" // Adres için
import dynamic from 'next/dynamic'; // Dinamik import için eklendi

// Harita bileşenini dinamik olarak import et (SSR olmadan)
const LocationMapSelector = dynamic(() => import('@/components/admin/LocationMapSelector'), {
    ssr: false,
    loading: () => <p>Harita Yükleniyor...</p> // Yüklenirken gösterilecek içerik
});

// Bölge veri tipi (locations ile ilişkili)
interface Bolge {
    id: number;
    name: string;
}

// Lokasyon veri tipi - Supabase join için güncellendi
interface Location {
    id: number;
    name: string;
    type: 'airport' | 'hotel' | 'other';
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    is_active: boolean;
    bolge_id: number | null;
    bolge: { name: string } | null; // Join ile gelecek bölge adı
    created_at?: string; 
    updated_at?: string; 
}

// Supabase sayfalama meta verisi
interface PaginationMeta {
    currentPage: number;
    lastPage: number;
    totalCount: number;
    perPage: number;
}

// Yeni lokasyon formu için tip
interface NewLocationData {
    name: string;
    type: 'airport' | 'hotel' | 'other';
    address: string;
    latitude: string; // String olarak güncellendi
    longitude: string; // String olarak güncellendi
    is_active: boolean;
    bolge_id: number | null;
}

// Düzenleme formu için tip
interface EditLocationData extends Omit<NewLocationData, 'latitude' | 'longitude'> { // Omit ile genişletildi
    id: number;
    latitude: string; // String olarak güncellendi
    longitude: string; // String olarak güncellendi
}

const initialNewLocationData: NewLocationData = {
    name: '',
    type: 'other', // Varsayılan tip
    address: '',
    latitude: '', // Başlangıçta boş string
    longitude: '',
    is_active: true,
    bolge_id: null,
};

export default function AdminLocationsPage() {
    const [locations, setLocations] = useState<Location[]>([])
    const [bolgeler, setBolgeler] = useState<Bolge[]>([]) // Bölgeler için state
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [meta, setMeta] = useState<PaginationMeta | null>(null)
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15; 

    // Delete State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [locationToDelete, setLocationToDelete] = useState<Location | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Add State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [newLocationData, setNewLocationData] = useState<NewLocationData>(initialNewLocationData)
    const [isAdding, setIsAdding] = useState(false)
    const [addError, setAddError] = useState<string | null>(null)

    // Edit State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [locationToEdit, setLocationToEdit] = useState<Location | null>(null)
    const [editLocationData, setEditLocationData] = useState<EditLocationData | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)

    // Fetch Bölgeler (Supabase) - Formlar için
    const fetchBolgeler = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('bolge') // Tablo adı 'bolge' olarak varsayıldı
                .select('id, name')
                // .eq('is_active', true) // Bölge tablosunda is_active varsa eklenebilir
                .order('name', { ascending: true });

            if (error) throw error;
            setBolgeler(data || []);
        } catch (err: unknown) {
            console.error("Bölgeler çekilirken hata (Supabase):", err);
            if (err instanceof Error) {
                setError(err.message || 'Bölge listesi yüklenemedi.'); 
            } else {
                setError('Bölge listesi yüklenirken bilinmeyen bir hata oluştu.');
            }
        }
    }, [setBolgeler, setError]);

    // Fetch Lokasyonlar (Supabase) - Ana veri
    const fetchLocations = useCallback(async (page = 1) => {
        setIsLoading(true);
        setError(null);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage - 1;

        try {
            const { data, error: fetchError, count } = await supabase
                .from('locations')
                .select('*, bolge(name)', { count: 'exact' }) // Bölge adını join ile al
                .order('id', { ascending: true })
                .range(startIndex, endIndex); 
            
            if (fetchError) throw fetchError;

            setLocations(data as Location[] || []);
            setCurrentPage(page);
            setMeta({
                currentPage: page,
                lastPage: Math.ceil((count ?? 0) / itemsPerPage),
                totalCount: count ?? 0,
                perPage: itemsPerPage,
            });
        } catch (err: unknown) {
            console.error("Lokasyon verileri çekilirken hata (Supabase):", err);
            setError((err as Error).message || 'Lokasyonlar yüklenirken bir hata oluştu.');
            setLocations([]);
            setMeta(null);
        } finally {
            setIsLoading(false);
        }
    }, [itemsPerPage, setIsLoading, setError, setLocations, setCurrentPage, setMeta]);

    useEffect(() => {
        fetchBolgeler(); // Formlar için bölgeleri çek
        fetchLocations(currentPage); // Mevcut sayfa için lokasyonları çek
    }, [currentPage, fetchBolgeler, fetchLocations]); // currentPage, fetchBolgeler, fetchLocations değiştiğinde yeniden çek

    // Harita koordinatları değiştiğinde state'i güncelleyen handler
    // Hem ekleme hem düzenleme formu için kullanılacak
    const handleMapCoordinatesChange = (lat: number, lng: number) => {
        if (isAddDialogOpen) {
            setNewLocationData(prev => ({
                ...prev,
                latitude: lat.toFixed(6), 
                longitude: lng.toFixed(6),
            }));
        } else if (isEditDialogOpen && editLocationData) {
            setEditLocationData(prev => prev ? {
                ...prev,
                latitude: lat.toFixed(6),
                longitude: lng.toFixed(6),
            } : null);
        }
    };

    // Add Handlers
    const handleAddInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target; 
        setNewLocationData(prev => ({
            ...prev,
            [name]: value 
        }));
    };

    const handleAddSelectChange = (name: keyof NewLocationData, value: string | number | null) => {
        let processedValue: string | number | null | 'airport' | 'hotel' | 'other' = null;
        if (name === 'bolge_id') {
            processedValue = value === 'none' || value === '' ? null : Number(value);
        } else if (name === 'type') {
            processedValue = value as 'airport' | 'hotel' | 'other'; // Type assertion
        } else {
            processedValue = value; 
        }

        setNewLocationData(prev => ({
            ...prev,
            [name]: processedValue
        }));
    };

    const handleAddCheckboxChange = (checked: boolean) => {
        setNewLocationData(prev => ({ ...prev, is_active: checked }));
    };

    const handleAddNewLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        setAddError(null);

        try {
            const payload = {
                ...newLocationData,
                latitude: parseCoordinate(newLocationData.latitude),
                longitude: parseCoordinate(newLocationData.longitude),
                bolge_id: newLocationData.bolge_id ? Number(newLocationData.bolge_id) : null
            };

            const { error: insertError } = await supabase
                .from('locations')
                .insert(payload);

            if (insertError) throw insertError;

            setNewLocationData(initialNewLocationData); 
            setIsAddDialogOpen(false);
            fetchLocations(1); // Sayfa 1'e dönerek listeyi yenile

        } catch (err: unknown) {
            console.error("Lokasyon eklenirken hata (Supabase):", err);
            if (err instanceof Error) {
                setAddError(err.message || 'Lokasyon eklenirken bir hata oluştu.');
            } else {
                setAddError('Lokasyon eklenirken bilinmeyen bir hata oluştu.');
            }
        } finally {
            setIsAdding(false);
        }
    };

    // Edit Handlers
    const handleEditClick = (location: Location) => {
        console.log('handleEditClick called for location:', location.id);
        setLocationToEdit(location);
        setEditLocationData({
            id: location.id,
            name: location.name,
            type: location.type,
            address: location.address || '',
            latitude: location.latitude?.toString() || '',
            longitude: location.longitude?.toString() || '',
            is_active: location.is_active,
            bolge_id: location.bolge_id,
        });
        setEditError(null);
        setIsEditDialogOpen(true);
        console.log('isEditDialogOpen should be true now');
    };

    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target; // type kontrolü kaldırıldı
        setEditLocationData(prev => prev ? {
            ...prev,
            [name]: value // Değeri doğrudan string olarak ata
        } : null);
    };

    const handleEditSelectChange = (name: keyof EditLocationData, value: string | number | null) => {
         let processedValue: string | number | null = null;
        if (name === 'bolge_id') {
            processedValue = value === 'none' || value === '' ? null : Number(value);
        } else {
            processedValue = value; 
        }
        setEditLocationData(prev => prev ? {
            ...prev,
            [name]: processedValue 
        } : null);
    };

     const handleEditCheckboxChange = (checked: boolean) => {
        setEditLocationData(prev => prev ? { ...prev, is_active: checked } : null);
    };

    const handleUpdateLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editLocationData) return;

        setIsUpdating(true);
        setEditError(null);

        try {
            const payload = {
                name: editLocationData.name,
                type: editLocationData.type,
                address: editLocationData.address,
                latitude: parseCoordinate(editLocationData.latitude), // parseCoordinate kullanıldı
                longitude: parseCoordinate(editLocationData.longitude), // parseCoordinate kullanıldı
                is_active: editLocationData.is_active,
                bolge_id: editLocationData.bolge_id ? Number(editLocationData.bolge_id) : null,
            };

            const { error: updateError } = await supabase
                .from('locations')
                .update(payload)
                .eq('id', editLocationData.id);

            if (updateError) throw updateError;

            // Local state güncelleme
            const bolgeName = bolgeler.find(b => b.id === payload.bolge_id)?.name;
            setLocations(prev => prev.map(loc => 
                loc.id === editLocationData.id 
                ? { 
                    ...loc, 
                    ...payload, 
                    bolge: bolgeName ? { name: bolgeName } : null 
                  } 
                : loc
            ));

            setIsEditDialogOpen(false);
            setLocationToEdit(null);
            setEditLocationData(null);

        } catch (err: unknown) {
            console.error("Lokasyon güncellenirken hata (Supabase):", err);
            if (err instanceof Error) {
                setEditError(err.message || 'Lokasyon güncellenirken bir hata oluştu.');
            } else {
                setEditError('Lokasyon güncellenirken bilinmeyen bir hata oluştu.');
            }
        } finally {
            setIsUpdating(false);
        }
    };

    // Delete Handlers
    const handleDeleteClick = (location: Location) => {
        setLocationToDelete(location);
        setError(null); // Dialog açılmadan ana hatayı temizle
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!locationToDelete) return;

        setIsDeleting(true);
        setError(null); // Dialog içindeki hatayı temizle

        try {
            // 1. Rezervasyon kontrolü (pickup)
            const { count: pickupCount, error: pickupCheckError } = await supabase
                .from('reservations')
                .select('id', { count: 'exact', head: true })
                .eq('pickup_location_id', locationToDelete.id);
            
            if (pickupCheckError) throw new Error(`Alış lokasyonu kontrol hatası: ${pickupCheckError.message}`);

            // 2. Rezervasyon kontrolü (dropoff)
             const { count: dropoffCount, error: dropoffCheckError } = await supabase
                .from('reservations')
                .select('id', { count: 'exact', head: true })
                .eq('dropoff_location_id', locationToDelete.id);

            if (dropoffCheckError) throw new Error(`Bırakış lokasyonu kontrol hatası: ${dropoffCheckError.message}`);
            
            const totalReservations = (pickupCount ?? 0) + (dropoffCount ?? 0);

            if (totalReservations > 0) {
                setError(`Bu lokasyon (${totalReservations} adet) rezervasyonda (alış veya bırakış) kullanıldığı için silinemez.`);
                // Dialog açık kalsın ki kullanıcı hatayı görsün
                setIsDeleting(false);
                return; 
            }

            // 3. Rezervasyon yoksa sil
            const { error: deleteError } = await supabase
                .from('locations')
                .delete()
                .eq('id', locationToDelete.id);
            
            if (deleteError) throw deleteError; 

            setLocations(prev => prev.filter(loc => loc.id !== locationToDelete.id));
            
            // Sayfa yönetimi
            if (locations.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            } else {
                fetchLocations(currentPage); // Sayıyı ve sırayı güncellemek için yeniden çek
            }

            setIsDeleteDialogOpen(false);
            setLocationToDelete(null);
        } catch (err: unknown) {
            console.error('Lokasyon silinemedi (Supabase):', err);
            if (err instanceof Error) {
                setError(err.message || 'Lokasyon silinirken bir hata oluştu.');
            } else {
                setError('Lokasyon silinirken bilinmeyen bir hata oluştu.');
            }
        } finally {
            setIsDeleting(false);
        }
    };

     // Sayfa Değiştirme Handler
    const handlePageChange = (page: number) => {
        fetchLocations(page);
    };

    // Helper: Koordinatları number'a çevirir, geçersizse null döner
    const parseCoordinate = (coord: string | number | undefined | null): number | null => {
        if (typeof coord === 'number') return coord;
        if (typeof coord === 'string' && coord.trim() !== '') {
            const num = parseFloat(coord);
            return isNaN(num) ? null : num;
        }
        return null;
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Lokasyon Yönetimi</h1>
                <Dialog 
                    open={isAddDialogOpen} 
                    onOpenChange={(isOpen) => {
                        console.log('Add Dialog onOpenChange called, isOpen:', isOpen);
                        setIsAddDialogOpen(isOpen);
                    }}
                 >
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Yeni Lokasyon Ekle
                        </Button>
                    </DialogTrigger>
                    {/* Yeni Lokasyon Ekleme Dialog İçeriği */}
                    <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader>
                            <DialogTitle>Yeni Lokasyon Ekle</DialogTitle>
                            <DialogDescription>
                                Yeni lokasyon bilgilerini girin.
                            </DialogDescription>
                        </DialogHeader>
                        {addError && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Ekleme Hatası</AlertTitle>
                                <AlertDescription>{addError}</AlertDescription>
                            </Alert>
                        )}
                        <form onSubmit={handleAddNewLocation} className="grid gap-4 py-4">
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Ad</Label>
                                <Input id="name" name="name" value={newLocationData.name} onChange={handleAddInputChange} className="col-span-3" required />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="type" className="text-right">Tip</Label>
                                <Select name="type" value={newLocationData.type} onValueChange={(value) => handleAddSelectChange('type', value)} required>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Tip Seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="airport">Havaalanı</SelectItem>
                                        <SelectItem value="hotel">Otel</SelectItem>
                                        <SelectItem value="other">Diğer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="address" className="text-right">Adres</Label>
                                <Textarea id="address" name="address" value={newLocationData.address} onChange={handleAddInputChange} className="col-span-3" required />
                            </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="bolge_id" className="text-right">Bölge</Label>
                                <Select name="bolge_id" value={newLocationData.bolge_id?.toString() || 'none'} onValueChange={(value) => handleAddSelectChange('bolge_id', value)}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Bölge Seçin (Opsiyonel)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Bölge Yok</SelectItem> 
                                        {bolgeler.map(bolge => (
                                            <SelectItem key={bolge.id} value={bolge.id.toString()}>{bolge.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="latitude">Enlem</Label>
                                    <Input id="latitude" name="latitude" type="number" step="any" value={newLocationData.latitude} onChange={handleAddInputChange} placeholder="Opsiyonel" />
                                </div>
                                <div>
                                     <Label htmlFor="longitude">Boylam</Label>
                                    <Input id="longitude" name="longitude" type="number" step="any" value={newLocationData.longitude} onChange={handleAddInputChange} placeholder="Opsiyonel" />
                                </div>
                            </div>
                            {/* Harita Bileşeni - Ekleme */}
                            <div className="mt-2">
                                <Label>Konumu Haritadan Seç</Label>
                                <LocationMapSelector 
                                    latitude={parseCoordinate(newLocationData.latitude)}
                                    longitude={parseCoordinate(newLocationData.longitude)}
                                    onCoordinatesChange={handleMapCoordinatesChange}
                                />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="is_active" className="text-right">Aktif mi?</Label>
                                <Checkbox id="is_active" name="is_active" checked={newLocationData.is_active} onCheckedChange={handleAddCheckboxChange} className="col-span-3 justify-self-start" />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                     <Button type="button" variant="outline" disabled={isAdding}>İptal</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isAdding}>
                                    {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                                    Ekle
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {error && !isDeleteDialogOpen && !isEditDialogOpen && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Hata</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Ad</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Bölge</TableHead> {/* Bölge Sütunu */} 
                            <TableHead>Adres</TableHead>
                            <TableHead>Aktif</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: itemsPerPage }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell> {/* Bölge Skeleton */} 
                                    <TableCell><Skeleton className="h-5 w-60" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : locations.length > 0 ? (
                            locations.map((location) => (
                                <TableRow key={location.id}>
                                    <TableCell>{location.id}</TableCell>
                                    <TableCell className="font-medium">{location.name}</TableCell>
                                    <TableCell>{location.type}</TableCell>
                                    <TableCell>{location.bolge?.name || '-'}</TableCell> {/* Bölge Adı */} 
                                    <TableCell>{location.address ?? '-'}</TableCell>
                                    <TableCell>{location.is_active ? 'Evet' : 'Hayır'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => {
                                                     console.log('Edit button clicked for location:', location.id);
                                                     handleEditClick(location);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700"
                                                onClick={() => handleDeleteClick(location)}
                                                disabled={isDeleting} // Silme işlemi sırasında butonu devre dışı bırak
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Gösterilecek lokasyon bulunamadı.
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
            </Card>

             {/* Silme Onay Dialogu */} 
             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {`Lokasyon &apos;${locationToDelete?.name || ''}&apos; kalıcı olarak silinecektir. Bu işlem geri alınamaz.`}
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
                        <AlertDialogCancel onClick={() => setLocationToDelete(null)} disabled={isDeleting}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             {/* Düzenleme Dialogu */} 
            <Dialog 
                open={isEditDialogOpen} 
                onOpenChange={(isOpen) => {
                     console.log('Edit Dialog onOpenChange called, isOpen:', isOpen);
                     setIsEditDialogOpen(isOpen);
                 }}
            >
                 <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle>Lokasyonu Düzenle (ID: {locationToEdit?.id})</DialogTitle>
                        <DialogDescription>Lokasyon bilgilerini güncelleyin.</DialogDescription>
                    </DialogHeader>
                    {editError && (
                       <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Güncelleme Hatası</AlertTitle>
                            <AlertDescription>{editError}</AlertDescription>
                        </Alert>
                    )}
                    {editLocationData && (
                        <form onSubmit={handleUpdateLocation} className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_name" className="text-right">Ad</Label>
                                <Input id="edit_name" name="name" value={editLocationData.name} onChange={handleEditInputChange} className="col-span-3" required />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_type" className="text-right">Tip</Label>
                                <Select name="type" value={editLocationData.type} onValueChange={(value) => handleEditSelectChange('type', value)} required>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="airport">Havaalanı</SelectItem>
                                        <SelectItem value="hotel">Otel</SelectItem>
                                        <SelectItem value="other">Diğer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_address" className="text-right">Adres</Label>
                                <Textarea id="edit_address" name="address" value={editLocationData.address} onChange={handleEditInputChange} className="col-span-3" required />
                            </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_bolge_id" className="text-right">Bölge</Label>
                                <Select name="bolge_id" value={editLocationData.bolge_id?.toString() || 'none'} onValueChange={(value) => handleEditSelectChange('bolge_id', value)}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Bölge Seçin (Opsiyonel)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Bölge Yok</SelectItem> 
                                        {bolgeler.map(bolge => (
                                            <SelectItem key={bolge.id} value={bolge.id.toString()}>{bolge.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="edit_latitude">Enlem</Label>
                                    <Input id="edit_latitude" name="latitude" type="number" step="any" value={editLocationData.latitude} onChange={handleEditInputChange} placeholder="Opsiyonel" />
                                </div>
                                <div>
                                     <Label htmlFor="edit_longitude">Boylam</Label>
                                    <Input id="edit_longitude" name="longitude" type="number" step="any" value={editLocationData.longitude} onChange={handleEditInputChange} placeholder="Opsiyonel" />
                                </div>
                            </div>
                            {/* Harita Bileşeni - Düzenleme */}
                             <div className="mt-2">
                                <Label>Konumu Haritadan Seç</Label>
                                <LocationMapSelector 
                                    latitude={parseCoordinate(editLocationData.latitude)}
                                    longitude={parseCoordinate(editLocationData.longitude)}
                                    onCoordinatesChange={handleMapCoordinatesChange}
                                />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_is_active" className="text-right">Aktif mi?</Label>
                                <Checkbox id="edit_is_active" name="is_active" checked={editLocationData.is_active} onCheckedChange={handleEditCheckboxChange} className="col-span-3 justify-self-start" />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" onClick={() => {setIsEditDialogOpen(false); setLocationToEdit(null); setEditLocationData(null);}} disabled={isUpdating}>İptal</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isUpdating}>
                                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kaydet
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
} 