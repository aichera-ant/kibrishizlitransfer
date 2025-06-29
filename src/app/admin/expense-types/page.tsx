'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from 'sonner'
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ExpenseType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    parent_id: number | null;
    is_group: boolean;
}

interface DisplayExpenseType extends ExpenseType {
    level: number;
}

interface ExpenseTypeFormData {
    name: string;
    description: string;
    parent_id: string;
    is_group: boolean;
}

const initialFormData: ExpenseTypeFormData = {
    name: '',
    description: '',
    parent_id: 'null',
    is_group: false
};

export default function ExpenseTypesPage() {
    const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [formData, setFormData] = useState<ExpenseTypeFormData>(initialFormData)
    const [editingExpenseType, setEditingExpenseType] = useState<ExpenseType | null>(null)
    const [deletingExpenseType, setDeletingExpenseType] = useState<ExpenseType | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [displayList, setDisplayList] = useState<DisplayExpenseType[]>([])

    const processAndSetDisplayList = (types: ExpenseType[]) => {
        const groups = types.filter(t => t.is_group && !t.parent_id).sort((a, b) => a.name.localeCompare(b.name));
        const childrenMap = new Map<number, ExpenseType[]>();

        types.forEach(t => {
            if (!t.is_group && t.parent_id) {
                const children = childrenMap.get(t.parent_id) || [];
                children.push(t);
                childrenMap.set(t.parent_id, children);
            }
        });

        childrenMap.forEach(children => children.sort((a, b) => a.name.localeCompare(b.name)));

        const finalDisplayList: DisplayExpenseType[] = [];
        groups.forEach(group => {
            finalDisplayList.push({ ...group, level: 0 });
            const children = childrenMap.get(group.id) || [];
            children.forEach(child => {
                finalDisplayList.push({ ...child, level: 1 });
            });
        });

        setDisplayList(finalDisplayList);
    };

    const fetchExpenseTypes = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const { data, error: fetchError } = await supabase
                .from('expense_types')
                .select('*');

            if (fetchError) throw fetchError;
            const fetchedTypes = data || [];
            setExpenseTypes(fetchedTypes);
            processAndSetDisplayList(fetchedTypes);

        } catch (err: unknown) {
            console.error("Masraf türleri alınırken hata:", err);
            if (err instanceof Error) {
                setError(err.message || "Masraf türleri yüklenirken bir hata oluştu.");
                toast.error(err.message || "Masraf türleri yüklenemedi.");
            } else {
                setError("Masraf türleri yüklenirken bilinmeyen bir hata oluştu.");
                toast.error("Masraf türleri yüklenemedi.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExpenseTypes();
    }, [fetchExpenseTypes]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormError(null); // Clear error on input change
    };

    const validateForm = (): boolean => {
        if (!formData.name.trim()) {
            setFormError("Masraf türü adı boş bırakılamaz.");
            return false;
        }
        // Add more specific validations if needed
        return true;
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!formData.is_group && formData.parent_id === 'null') {
            setFormError("Bir masraf türü için üst grup seçmelisiniz.");
            return;
        }
        setIsProcessing(true);
        setFormError(null);

        try {
            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                parent_id: formData.parent_id === 'null' ? null : Number(formData.parent_id),
                is_group: formData.is_group
            };

            const { error: insertError } = await supabase
                .from('expense_types')
                .insert(payload);

            if (insertError) throw insertError;

            toast.success(`Masraf türü "${formData.name}" başarıyla eklendi.`);
            setIsAddDialogOpen(false);
            setFormData(initialFormData);
            fetchExpenseTypes(); // Refresh list
        } catch (err: unknown) {
            console.error("Masraf türü eklenirken hata:", err);
            if (err instanceof Error) {
                setFormError(err.message || "Masraf türü eklenirken bir hata oluştu.");
                toast.error(err.message || "Masraf türü eklenemedi.");
            } else {
                setFormError("Masraf türü eklenirken bilinmeyen bir hata oluştu.");
                toast.error("Masraf türü eklenemedi.");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditClick = (expenseType: ExpenseType) => {
        setEditingExpenseType(expenseType);
        setFormData({
            name: expenseType.name,
            description: expenseType.description || '',
            parent_id: expenseType.parent_id?.toString() ?? 'null',
            is_group: expenseType.is_group
        });
        setFormError(null);
        setIsEditDialogOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingExpenseType || !validateForm()) return;
        if (!formData.is_group && formData.parent_id === 'null') {
            setFormError("Bir masraf türü için üst grup seçmelisiniz.");
            return;
        }
        if (formData.parent_id === editingExpenseType.id.toString()) {
            setFormError("Bir öğeyi kendi üst grubu olarak ayarlayamazsınız.");
            return;
        }
        setIsProcessing(true);
        setFormError(null);

        try {
            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                parent_id: formData.parent_id === 'null' ? null : Number(formData.parent_id),
                is_group: formData.is_group
            };

            const { error: updateError } = await supabase
                .from('expense_types')
                .update(payload)
                .eq('id', editingExpenseType.id);

            if (updateError) throw updateError;

            toast.success(`Masraf türü "${formData.name}" başarıyla güncellendi.`);
            setIsEditDialogOpen(false);
            setEditingExpenseType(null);
            setFormData(initialFormData);
            fetchExpenseTypes(); // Refresh list
        } catch (err: unknown) {
            console.error("Masraf türü güncellenirken hata:", err);
            if (err instanceof Error) {
                setFormError(err.message || "Masraf türü güncellenirken bir hata oluştu.");
                toast.error(err.message || "Masraf türü güncellenemedi.");
            } else {
                setFormError("Masraf türü güncellenirken bilinmeyen bir hata oluştu.");
                toast.error("Masraf türü güncellenemedi.");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteClick = (expenseType: ExpenseType) => {
        setDeletingExpenseType(expenseType);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingExpenseType) return;
        setIsProcessing(true);

        try {
            const { error: deleteError } = await supabase
                .from('expense_types')
                .delete()
                .eq('id', deletingExpenseType.id);

            if (deleteError) throw deleteError;

            toast.success(`Masraf türü "${deletingExpenseType.name}" başarıyla silindi.`);
            setExpenseTypes(prev => prev.filter(et => et.id !== deletingExpenseType.id));
            setDeletingExpenseType(null);
            fetchExpenseTypes();
        } catch (err: unknown) {
            console.error("Masraf türü silinirken hata:", err);
            if (err instanceof Error) {
                setFormError(err.message || "Masraf türü silinirken bir hata oluştu.");
                toast.error(err.message || "Masraf türü silinemedi.");
            } else {
                setFormError("Masraf türü silinirken bilinmeyen bir hata oluştu.");
                toast.error("Masraf türü silinemedi.");
            }
        } finally {
            setIsProcessing(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const availableGroups = expenseTypes.filter(et => et.is_group && et.id !== editingExpenseType?.id);

    const renderFormFields = () => (
        <>
            <div className="grid gap-2 mb-4">
                <Label>Tür *</Label>
                <RadioGroup
                    defaultValue={formData.is_group ? "group" : "type"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, is_group: value === "group" }))}
                    className="flex space-x-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="type" id="type" />
                        <Label htmlFor="type">Masraf Türü</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="group" id="group" />
                        <Label htmlFor="group">Grup</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="grid gap-2 mb-4">
                <Label htmlFor="name">{formData.is_group ? "Grup Adı" : "Masraf Türü Adı"} *</Label>
                <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={formError && !formData.name.trim() ? "border-red-500" : ""}
                />
            </div>

            <div className="grid gap-2 mb-4">
                <Label htmlFor="parent_id">Üst Grup</Label>
                <Select
                    value={formData.parent_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, parent_id: value }))}
                    disabled={formData.is_group}
                >
                    <SelectTrigger className={formError && !formData.is_group && formData.parent_id === 'null' ? "border-red-500" : ""}>
                        <SelectValue placeholder="Üst Grup Seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="null">-- Yok --</SelectItem>
                        {availableGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                                {group.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {formData.is_group && (
                    <p className="text-xs text-muted-foreground mt-1">Gruplar en üst seviyededir, bir üst grup seçilemez.</p>
                )}
            </div>

            <div className="grid gap-2 mb-4">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                />
            </div>
            {formError && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Hata</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                </Alert>
            )}
        </>
    );

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Masraf Türleri Yönetimi</h1>
                <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
                    setIsAddDialogOpen(isOpen);
                    if (!isOpen) {
                        setFormData(initialFormData);
                        setFormError(null);
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Yeni Masraf Türü Ekle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleAddSubmit}>
                            <DialogHeader>
                                <DialogTitle>Yeni Masraf Türü Ekle</DialogTitle>
                                <DialogDescription>
                                    Yeni bir masraf türü tanımlayın.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                {renderFormFields()}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" disabled={isProcessing}>İptal</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Ekle
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
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
                            <TableHead>Ad</TableHead>
                            <TableHead>Açıklama</TableHead>
                            <TableHead>Oluşturulma Tarihi</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Kayıtlı masraf türü/grubu bulunamadı.
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayList.map((item) => {
                                return (
                                    <TableRow key={item.id} className={cn(
                                        item.is_group ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                    )}>
                                        <TableCell className={cn(
                                             "font-medium",
                                             item.is_group ? "font-semibold" : "pl-8"
                                             )}>
                                            {item.name}
                                        </TableCell>
                                        <TableCell>{item.description || '-'}</TableCell>
                                        <TableCell>{format(new Date(item.created_at), 'dd.MM.yyyy HH:mm')}</TableCell>
                                        <TableCell className="text-right">
                                            <Dialog open={isEditDialogOpen && editingExpenseType?.id === item.id} onOpenChange={(isOpen) => {
                                                if (!isOpen) {
                                                    setIsEditDialogOpen(false);
                                                    setEditingExpenseType(null);
                                                    setFormData(initialFormData);
                                                    setFormError(null);
                                                }
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditClick(item as ExpenseType)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px]">
                                                    <form onSubmit={handleEditSubmit}>
                                                        <DialogHeader>
                                                            <DialogTitle>Masraf Türünü/Grubunu Düzenle</DialogTitle>
                                                            <DialogDescription>
                                                                Bilgileri güncelleyin.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="py-4">
                                                            {renderFormFields()}
                                                        </div>
                                                        <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button type="button" variant="outline" disabled={isProcessing}>İptal</Button>
                                                            </DialogClose>
                                                            <Button type="submit" disabled={isProcessing}>
                                                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                                Güncelle
                                                            </Button>
                                                        </DialogFooter>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>

                                            <AlertDialog open={isDeleteDialogOpen && deletingExpenseType?.id === item.id} onOpenChange={setIsDeleteDialogOpen}>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(item as ExpenseType)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {`Masraf türü "${deletingExpenseType?.name || ''}" ve buna bağlı tüm alt masraf türleri (varsa) kalıcı olarak silinecektir. Bu işlem geri alınamaz. 
                                                            Bu masraf türü herhangi bir masraf girişinde kullanılıyorsa, silme işlemi başarısız olabilir veya &quot;beklenmedik sorunlara&quot; yol açabilir. 
                                                            Lütfen silmeden önce masraf türünün &quot;kullanımda olmadığından&quot; emin olun.`}
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
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            )}
        </div>
    );
} 