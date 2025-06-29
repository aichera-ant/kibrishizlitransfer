'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
// import { Badge } from "@/components/ui/badge"
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
import { supabase } from "@/lib/supabaseClient"

// Define interfaces
interface Supplier {
    id: number;
    name: string;
}

interface Vehicle {
    id: number;
    name: string;
    type: string;
    plate_number: string;
    capacity: number;
    luggage_capacity: number;
    supplier_id: number;
    is_active: boolean;
    driver_phone?: string | null;
    operation_phone?: string | null;
    suppliers: { name: string } | null;
}

// Add missing Pagination type definitions
// interface PaginationLinks { // Unused type
//     first: string | null;
//     last: string | null;
//     prev: string | null;
//     next: string | null;
// }

// Supabase pagination meta data (daha basit)
interface PaginationMeta {
    currentPage: number;
    lastPage: number;
    totalCount: number;
    perPage: number;
}

// Type for the new vehicle form
interface NewVehicleData {
    name: string;
    type: string;
    plate_number: string;
    capacity: number;
    luggage_capacity: number;
    supplier_id: number | null;
    is_active: boolean;
    driver_phone?: string;
    operation_phone?: string;
}

// Düzenleme formu için tip - Geri eklendi
interface EditVehicleData {
    id: number; // ID gerekli
    name: string;
    type: string;
    plate_number: string;
    capacity: number;
    luggage_capacity: number;
    supplier_id: number | null; // Null olabilir başlangıçta
    is_active: boolean;
    driver_phone: string; // Boş string olabilir
    operation_phone: string; // Boş string olabilir
}

const initialNewVehicleData: NewVehicleData = {
    name: '',
    type: '',
    plate_number: '',
    capacity: 1,
    luggage_capacity: 0,
    supplier_id: null,
    is_active: true,
    driver_phone: '',
    operation_phone: ''
};

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [meta, setMeta] = useState<PaginationMeta | null>(null)
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // State for Delete Confirmation Dialog
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Add State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [newVehicleData, setNewVehicleData] = useState<NewVehicleData>(initialNewVehicleData)
    const [isAdding, setIsAdding] = useState(false)
    const [addError, setAddError] = useState<string | null>(null)

    // Edit State - Tipi EditVehicleData olarak değiştirildi
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null) // Orijinal aracı tutmak için
    const [editVehicleData, setEditVehicleData] = useState<EditVehicleData | null>(null) // Form state'i için ayrı
    const [isUpdating, setIsUpdating] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)

    // Fetch Suppliers (Supabase) - Supabase kullanacak şekilde düzeltildi
    const fetchSuppliers = useCallback(async () => {
        try {
            const { data, error: supplierError } = await supabase
                .from('suppliers')
                .select('id, name')
                .eq('is_active', true) // Sadece aktif tedarikçiler
                .order('name', { ascending: true });

            if (supplierError) throw supplierError;
            setSuppliers(data || []);
        } catch (err: unknown) { 
            console.error("Tedarikçiler çekilirken hata (Supabase):", err);
            let message = 'Tedarikçi listesi yüklenemedi.';
            if (err instanceof Error) {
                message = err.message;
            }
            setError(message); 
            setSuppliers([]);
        } 
        // setIsLoading burada değiştirilmiyor, fetchVehicles içinde yönetiliyor
    }, [setSuppliers, setError]);

    const fetchVehicles = useCallback(async (page = 1) => {
        setIsLoading(true);
        setError(null);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage - 1;

        try {
            const { data, error: fetchError, count } = await supabase
                .from('vehicles')
                .select('*, suppliers(name)', { count: 'exact' }) // Join ile tedarikçi adını al
                .order('id', { ascending: true })
                .range(startIndex, endIndex); // Sayfalama
            
            if (fetchError) {
                 throw fetchError;
             }

            setVehicles(data as Vehicle[] || []); 
            setCurrentPage(page);
            setMeta({
                currentPage: page,
                lastPage: Math.ceil((count ?? 0) / itemsPerPage),
                totalCount: count ?? 0,
                perPage: itemsPerPage,
            });
        } catch (err: unknown) {
            console.error("Araç verileri çekilirken hata (Supabase):", err);
            setError((err as Error).message || 'Araçlar yüklenirken bir hata oluştu.');
            setVehicles([]);
            setMeta(null);
        } finally {
            setIsLoading(false);
        }
    }, [itemsPerPage, setIsLoading, setError, setVehicles, setCurrentPage, setMeta]);

    useEffect(() => {
        fetchVehicles();
        fetchSuppliers(); // Ensure suppliers are fetched
    }, [fetchVehicles, fetchSuppliers]);

    const handleDelete = (vehicle: Vehicle) => {
        setVehicleToDelete(vehicle)
        setError(null)
        setIsDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!vehicleToDelete) return

        setIsDeleting(true)
        setError(null)
        try {
            // 1. Rezervasyon kontrolü
            const { count, error: checkError } = await supabase
                .from('reservations') // Rezervasyon tablosunun adının 'reservations' olduğunu varsayıyoruz
                .select('id', { count: 'exact', head: true }) // Sadece sayıyı almak için head: true
                .eq('vehicle_id', vehicleToDelete.id); // Rezervasyon tablosundaki araç ID sütununun adını kontrol edin

            if (checkError) {
                throw new Error(`Rezervasyon kontrolü sırasında hata: ${checkError.message}`);
            }

            if (count !== null && count > 0) {
                // Eğer rezervasyon varsa, hata mesajı göster ve silme
                setError(`Bu araç (${count} adet) rezervasyonda kullanıldığı için silinemez. Önce ilgili rezervasyonları silin veya değiştirin.`);
                setIsDeleteDialogOpen(false); // Dialog'u kapatabiliriz veya hata mesajını dialog içinde gösterebiliriz
                setVehicleToDelete(null);
                setIsDeleting(false);
                return; // Silme işlemine devam etme
            }

            // 2. Rezervasyon yoksa silme işlemine devam et
            const { error: deleteError } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', vehicleToDelete.id);
            
            if (deleteError) throw deleteError; // Supabase silme hatasını fırlat

            setVehicles(prev => prev.filter(v => v.id !== vehicleToDelete.id))
            
             // Sayfa yönetimi (aynı kalabilir)
            if (vehicles.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1); 
            } else if (meta && vehicles.length > 1) {
                 fetchVehicles(currentPage); 
            } else if (meta && meta.totalCount <= itemsPerPage) {
                 setCurrentPage(1);
             } else {
                 // State güncellemesi yeterli
             }

            setIsDeleteDialogOpen(false)
            setVehicleToDelete(null)
        } catch (err: unknown) { 
            console.error('Araç silinemedi (Supabase):', err)
            let message = 'Araç silinirken bir hata oluştu.';
            if (err instanceof Error) {
                message = err.message;
            }
            setError(message)
        } finally {
            setIsDeleting(false)
        }
    }

    const handlePageChange = (page: number) => {
        fetchVehicles(page);
    }

    // Add Handlers
    const handleAddInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewVehicleData(prev => ({
            ...prev,
            [name]: name === 'capacity' || name === 'luggage_capacity' ? parseInt(value, 10) || 0 : value
        }));
        if (addError) setAddError(null); // Clear general error on input change
    };

    const handleAddSelectChange = (name: keyof NewVehicleData, value: string | number | null) => {
        let processedValue: string | number | null | boolean = value;
        if (name === 'supplier_id') {
            processedValue = value ? parseInt(String(value), 10) : null;
            if (isNaN(processedValue as number)) {
                processedValue = null; // Eğer parseInt NaN dönerse null ata
            }
        } else if (name === 'is_active') {
            // Bu durum handleAddCheckboxChange tarafından yönetiliyor olmalı,
            // ama select ile de yönetiliyorsa diye bir kontrol.
            // Normalde Select boolean değer döndürmez, string 'true'/'false' döner.
            processedValue = String(value).toLowerCase() === 'true';
        }
        // Diğer string alanlar için (type vs.) value olduğu gibi kalır (string | null)

        setNewVehicleData(prev => ({
            ...prev,
            // Tip zorlaması (Type assertion) kullanarak atama yapılıyor.
            // processedValue'nun name'e karşılık gelen doğru tipte olduğundan emin olunmalı.
            [name]: processedValue as NewVehicleData[typeof name]
        }));
        if (addError) setAddError(null);
    };

    const handleAddCheckboxChange = (name: keyof NewVehicleData, checked: boolean) => {
        setNewVehicleData(prev => ({ ...prev, [name]: checked }));
    };

    const handleAddNewVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAddError(null);

        // Validate required fields before setIsAdding(true) and payload creation
        if (!newVehicleData.name.trim()) { setAddError("Araç adı boş bırakılamaz."); return; }
        if (!newVehicleData.type.trim()) { setAddError("Araç tipi boş bırakılamaz."); return; }
        if (!newVehicleData.plate_number.trim()) { setAddError("Plaka boş bırakılamaz."); return; }
        if (newVehicleData.supplier_id === null || newVehicleData.supplier_id === undefined) { 
            setAddError("Tedarikçi seçimi zorunludur."); return; 
        }

        setIsAdding(true);

        const payload = {
            name: newVehicleData.name,
            type: newVehicleData.type,
            plate_number: newVehicleData.plate_number,
            capacity: typeof newVehicleData.capacity === 'string' ? parseInt(newVehicleData.capacity, 10) : newVehicleData.capacity,
            luggage_capacity: typeof newVehicleData.luggage_capacity === 'string' ? parseInt(newVehicleData.luggage_capacity, 10) : newVehicleData.luggage_capacity,
            supplier_id: Number(newVehicleData.supplier_id), // supplier_id'nin null olmadığı yukarıda kontrol edildi
            is_active: newVehicleData.is_active,
            driver_phone: newVehicleData.driver_phone || null,
            operation_phone: newVehicleData.operation_phone || null,
        };

        // Ensure numeric fields are valid numbers, default to 0 if NaN
        if (isNaN(payload.capacity)) payload.capacity = 0;
        if (isNaN(payload.luggage_capacity)) payload.luggage_capacity = 0;

        try {
            const { error: dbInsertError } = await supabase // Renamed to dbInsertError
                .from('vehicles')
                .insert(payload)
                .select('*, suppliers(name)') // Insert sonrası veriyi çek (opsiyonel)
                .single();

            if (dbInsertError) { // Use renamed variable
                throw dbInsertError;
            }

            // const insertedVehicleWithSupplier = data; // data'yı kullanabilirsiniz
            fetchVehicles(currentPage); // Veya sadece listeyi yenileyin
            setIsAddDialogOpen(false);
            setNewVehicleData(initialNewVehicleData); // Formu sıfırla
        } catch (err: unknown) {
            console.error("Araç eklenirken hata:", err);
            let message = 'Araç eklenirken bir hata oluştu.';
            if (err instanceof Error) {
                message = err.message;
            }
            setAddError(message);
        } finally {
            setIsAdding(false);
        }
    };

    // Edit Handlers - EditVehicleData'ya göre güncellendi
    const handleEditClick = (vehicle: Vehicle) => {
        setVehicleToEdit(vehicle); // Orijinal veriyi sakla
        // Form state'ini EditVehicleData tipine uygun hazırla
        setEditVehicleData({
            id: vehicle.id,
            name: vehicle.name,
            type: vehicle.type,
            plate_number: vehicle.plate_number,
            capacity: vehicle.capacity,
            luggage_capacity: vehicle.luggage_capacity,
            supplier_id: vehicle.supplier_id, 
            is_active: vehicle.is_active,
            driver_phone: vehicle.driver_phone || '', 
            operation_phone: vehicle.operation_phone || '' 
        });
        setEditError(null);
        setIsEditDialogOpen(true);
    };

    // Input değişikliklerini handle etmek için genel bir handler
    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditVehicleData(prev => {
            if (!prev) return null;
            let processedValue: string | number = value;
            if (name === 'capacity' || name === 'luggage_capacity') {
                processedValue = value === '' ? 0 : parseInt(value, 10);
                if (isNaN(processedValue as number)) processedValue = 0;
            }
            return {
                ...prev,
                [name]: processedValue
            };
        });
        if (editError) setEditError(null); // Clear error on input change
    };

    // Select değişikliklerini handle etmek için handler
    const handleEditSelectChange = (value: string | null) => {
        setEditVehicleData(prev => prev ? {
            ...prev,
            supplier_id: value ? Number(value) : null
        } : null);
    };

    // Checkbox değişikliklerini handle etmek için handler
     const handleEditCheckboxChange = (checked: boolean) => {
        setEditVehicleData(prev => prev ? { 
            ...prev, 
            is_active: checked 
        } : null);
    };

    const handleUpdateVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!vehicleToEdit || !editVehicleData) return;

        setEditError(null);

        // Validate required fields
        if (!editVehicleData.name.trim()) { setEditError("Araç adı boş bırakılamaz."); return; }
        if (!editVehicleData.type.trim()) { setEditError("Araç tipi boş bırakılamaz."); return; }
        if (!editVehicleData.plate_number.trim()) { setEditError("Plaka boş bırakılamaz."); return; }
        if (editVehicleData.supplier_id === null || editVehicleData.supplier_id === undefined) { 
            setEditError("Tedarikçi seçimi zorunludur."); return; 
        }

        setIsUpdating(true);

        const payloadUpdate: Omit<EditVehicleData, 'id'> = {
            name: editVehicleData.name,
            type: editVehicleData.type,
            plate_number: editVehicleData.plate_number,
            capacity: typeof editVehicleData.capacity === 'string' ? parseInt(editVehicleData.capacity, 10) : editVehicleData.capacity,
            luggage_capacity: typeof editVehicleData.luggage_capacity === 'string' ? parseInt(editVehicleData.luggage_capacity, 10) : editVehicleData.luggage_capacity,
            supplier_id: Number(editVehicleData.supplier_id), // supplier_id null değil kontrolü yapıldı
            is_active: editVehicleData.is_active,
            driver_phone: editVehicleData.driver_phone || '',
            operation_phone: editVehicleData.operation_phone || ''
        };
        
        if (isNaN(payloadUpdate.capacity)) payloadUpdate.capacity = 0;
        if (isNaN(payloadUpdate.luggage_capacity)) payloadUpdate.luggage_capacity = 0;

        try {
            const { error: dbUpdateError } = await supabase // Removed unused _updatedData destructuring
                .from('vehicles')
                .update(payloadUpdate)
                .eq('id', vehicleToEdit.id)
                .select('*, suppliers(name)') 
                .single();

            if (dbUpdateError) { 
                throw dbUpdateError;
            }
            
            fetchVehicles(currentPage);
            setIsEditDialogOpen(false);
            setVehicleToEdit(null); 
            setEditVehicleData(null);
        } catch (err: unknown) {
            console.error("Araç güncellenirken hata:", err);
            let message = 'Araç güncellenirken bir hata oluştu.';
            if (err instanceof Error) {
                message = err.message;
            }
            setEditError(message);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Araç Yönetimi</h1>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Yeni Araç Ekle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[525px]">
                        <DialogHeader>
                            <DialogTitle>Yeni Araç Ekle</DialogTitle>
                            <DialogDescription>
                                Yeni bir araç eklemek için aşağıdaki formu doldurun.
                            </DialogDescription>
                        </DialogHeader>
                        {addError && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Ekleme Hatası</AlertTitle>
                                <AlertDescription>{addError}</AlertDescription>
                            </Alert>
                        )}
                        <form onSubmit={handleAddNewVehicle} className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Ad</Label>
                                <Input id="name" name="name" value={newVehicleData.name} onChange={handleAddInputChange} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="type" className="text-right">Tip</Label>
                                <Input id="type" name="type" value={newVehicleData.type} onChange={handleAddInputChange} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="plate_number" className="text-right">Plaka</Label>
                                <Input id="plate_number" name="plate_number" value={newVehicleData.plate_number} onChange={handleAddInputChange} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="capacity" className="text-right">Kapasite</Label>
                                <Input id="capacity" name="capacity" type="number" min="1" value={newVehicleData.capacity} onChange={handleAddInputChange} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="luggage_capacity" className="text-right">Bagaj Kap.</Label>
                                <Input id="luggage_capacity" name="luggage_capacity" type="number" min="0" value={newVehicleData.luggage_capacity} onChange={handleAddInputChange} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="supplier_id" className="text-right">Tedarikçi</Label>
                                <Select 
                                    name="supplier_id" 
                                    value={newVehicleData.supplier_id?.toString() || ''} 
                                    onValueChange={(value) => handleAddSelectChange('supplier_id', value)}
                                    required
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Tedarikçi Seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.length > 0 ? suppliers.map(supplier => (
                                            <SelectItem key={supplier.id} value={supplier.id.toString()}>{supplier.name}</SelectItem>
                                        )) : <SelectItem value="" disabled>Tedarikçi bulunamadı</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="driver_phone" className="text-right">Sürücü Tel</Label>
                                <Input id="driver_phone" name="driver_phone" value={newVehicleData.driver_phone || ''} onChange={handleAddInputChange} className="col-span-3" placeholder="Opsiyonel" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="operation_phone" className="text-right">Operasyon Tel</Label>
                                <Input id="operation_phone" name="operation_phone" value={newVehicleData.operation_phone || ''} onChange={handleAddInputChange} className="col-span-3" placeholder="Opsiyonel" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="is_active" className="text-right">Aktif mi?</Label>
                                <Checkbox 
                                    id="is_active"
                                    name="is_active"
                                    checked={newVehicleData.is_active}
                                    onCheckedChange={(checked) => handleAddCheckboxChange('is_active', Boolean(checked))}
                                    className="col-span-3 justify-self-start"
                                />
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

            {error && (
                <div className="mb-4 rounded border border-red-400 bg-red-100 p-4 text-red-700">
                    <p><strong>Hata:</strong> {error}</p>
                </div>
            )}

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Ad</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Plaka</TableHead>
                            <TableHead>Kapasite</TableHead>
                            <TableHead>Bagaj Kap.</TableHead>
                            <TableHead>Tedarikçi</TableHead>
                            <TableHead>Aktif</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: itemsPerPage }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : vehicles.length > 0 ? (
                            vehicles.map((vehicle) => (
                                <TableRow key={vehicle.id}>
                                    <TableCell>{vehicle.id}</TableCell>
                                    <TableCell>{vehicle.name}</TableCell>
                                    <TableCell className="font-medium">{vehicle.type}</TableCell>
                                    <TableCell>{vehicle.plate_number}</TableCell>
                                    <TableCell>{vehicle.capacity}</TableCell>
                                    <TableCell>{vehicle.luggage_capacity}</TableCell>
                                    <TableCell>{vehicle.suppliers?.name || '-'}</TableCell>
                                    <TableCell>{vehicle.is_active ? 'Evet' : 'Hayır'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleEditClick(vehicle)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700"
                                                onClick={() => handleDelete(vehicle)}
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
                                <TableCell colSpan={9} className="h-24 text-center">
                                    Gösterilecek araç bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {meta && meta.lastPage > 1 && (
                    <div className="flex items-center justify-center space-x-2 p-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Önceki
                        </Button>
                        <span className="px-4 py-2 text-sm text-muted-foreground">
                            Sayfa {currentPage} / {meta.lastPage} (Toplam: {meta.totalCount})
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === meta.lastPage}
                        >
                            Sonraki
                        </Button>
                    </div>
                )}
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu aracı (&apos;{vehicleToDelete?.name}&apos;) silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
                        <AlertDialogCancel onClick={() => setVehicleToDelete(null)} disabled={isDeleting}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Dialog - Ad Input eklendi */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>Aracı Düzenle (ID: {vehicleToEdit?.id})</DialogTitle>
                        <DialogDescription>
                            Araç bilgilerini güncellemek için formu düzenleyin.
                        </DialogDescription>
                    </DialogHeader>
                    {editError && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Güncelleme Hatası</AlertTitle>
                            <AlertDescription>{editError}</AlertDescription>
                        </Alert>
                    )}
                    {editVehicleData && (
                        <form onSubmit={handleUpdateVehicle} className="grid gap-4 py-4">
                            {/* Ad Input */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_name" className="text-right">Ad</Label>
                                <Input id="edit_name" name="name" value={editVehicleData.name} onChange={handleEditInputChange} className="col-span-3" required />
                            </div>
                            {/* Tip Input */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_type" className="text-right">Tip</Label>
                                <Input id="edit_type" name="type" value={editVehicleData.type} onChange={handleEditInputChange} className="col-span-3" required />
                            </div>
                            {/* Plaka Input */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_plate_number" className="text-right">Plaka</Label>
                                <Input id="edit_plate_number" name="plate_number" value={editVehicleData.plate_number} onChange={handleEditInputChange} className="col-span-3" required />
                            </div>
                            {/* Kapasite Input */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_capacity" className="text-right">Kapasite</Label>
                                <Input id="edit_capacity" name="capacity" type="number" min="1" value={editVehicleData.capacity} onChange={handleEditInputChange} className="col-span-3" required />
                            </div>
                             {/* Bagaj Kapasitesi Input */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_luggage_capacity" className="text-right">Bagaj Kap.</Label>
                                <Input id="edit_luggage_capacity" name="luggage_capacity" type="number" min="0" value={editVehicleData.luggage_capacity} onChange={handleEditInputChange} className="col-span-3" required />
                            </div>
                            {/* Tedarikçi Select */}
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_supplier_id" className="text-right">Tedarikçi</Label>
                                <Select 
                                    name="supplier_id" 
                                    value={editVehicleData.supplier_id?.toString() || ''} 
                                    onValueChange={handleEditSelectChange} 
                                    required
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Tedarikçi Seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.length > 0 ? suppliers.map(supplier => (
                                            <SelectItem key={supplier.id} value={supplier.id.toString()}>{supplier.name}</SelectItem>
                                        )) : <SelectItem value="" disabled>Tedarikçi bulunamadı</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Sürücü Tel Input */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_driver_phone" className="text-right">Sürücü Tel</Label>
                                <Input id="edit_driver_phone" name="driver_phone" value={editVehicleData.driver_phone} onChange={handleEditInputChange} className="col-span-3" placeholder="Opsiyonel" />
                            </div>
                            {/* Operasyon Tel Input */}
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_operation_phone" className="text-right">Operasyon Tel</Label>
                                <Input id="edit_operation_phone" name="operation_phone" value={editVehicleData.operation_phone} onChange={handleEditInputChange} className="col-span-3" placeholder="Opsiyonel" />
                            </div>
                            {/* Aktif Checkbox */}
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit_is_active" className="text-right">Aktif mi?</Label>
                                <Checkbox 
                                    id="edit_is_active"
                                    name="is_active" 
                                    checked={editVehicleData.is_active}
                                    onCheckedChange={handleEditCheckboxChange} 
                                    className="col-span-3 justify-self-start"
                                />
                            </div>
                            {/* Dialog Footer */}
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" onClick={() => {setIsEditDialogOpen(false); setVehicleToEdit(null); setEditVehicleData(null);}} disabled={isUpdating}>İptal</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isUpdating}>
                                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                                    Kaydet
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
} 