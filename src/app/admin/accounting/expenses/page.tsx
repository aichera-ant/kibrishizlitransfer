'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from 'sonner'
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, Eye, Calendar as CalendarIcon, ChevronsUpDown, Check, X, Download, Upload } from 'lucide-react'
import { format, parseISO, parse } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { Workbook } from 'exceljs'
import * as FileSaver from 'file-saver'
// import { type Database, type Tables } from '@/types/supabase' // Unused type imports

// --- Types --- Interfaces ---
interface Vehicle {
    id: number;
    plate_number: string;
    name: string; // For display
}

interface Supplier {
    id: number;
    name: string;
}

interface ExpenseType {
    id: number;
    name: string;
}

interface ExpenseDetail {
    id?: number; // Optional for new details
    expense_list_id?: number; // Optional for new details
    detail_date: Date | null;
    receipt_no: string;
    expense_type_id: number | null;
    detail_description: string;
    amount: string; // String olarak değiştirildi
    _key?: string; // Temporary key for list rendering
    _destroy?: boolean; // Mark for deletion on update
}

interface ExpenseListEntry {
    id: number;
    entry_date: string;
    expense_no: string;
    description: string | null;
    vehicle_id: number | null;
    supplier_id: number | null;
    total_amount: number;
    created_at: string;
    vehicles: { plate_number: string } | null; // For display
    suppliers: { name: string } | null;
    expense_details?: ExpenseDetail[];
}

interface ExpenseListFormData {
    id?: number | null;
    entry_date: Date | null;
    expense_no: string;
    description: string;
    vehicle_id: number | null;
    supplier_id: number | null;
    details: ExpenseDetail[];
}

const KIBRIS_TRANSFER_SUPPLIER_ID = 1;

const initialDetailData: ExpenseDetail = {
    detail_date: new Date(),
    receipt_no: '',
    expense_type_id: null,
    detail_description: '',
    amount: '', // String olarak kalıyor
    _key: Date.now().toString(), // Simple unique key
};

const initialFormData: ExpenseListFormData = {
    entry_date: new Date(),
    expense_no: '',
    description: '',
    vehicle_id: null,
    supplier_id: null,
    details: [{ ...initialDetailData }],
};

// Excel'den okunan ve işlenmiş veriyi temsil eden arayüz
interface ParsedImportedExpense {
    master: Omit<ExpenseListFormData, 'details' | 'id'> & { originalIndex: number }; // include original row index
    details: (Omit<ExpenseDetail, '_key' | '_destroy' | 'id' | 'expense_list_id'> & { originalIndex: number })[];
}

// Supabase'e gönderilecek masraf detayı için payload tipi
type ExpenseDetailUpsertPayload = {
  id?: number;
  expense_list_id: number;
  detail_date: string;
  receipt_no: string | null;
  expense_type_id: number;
  detail_description: string | null;
  amount: number;
};

// --- Helper Functions ---
const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    try {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
    } catch (e) {
        console.error("Currency formatting error:", e, "Value:", value);
        return 'Hata';
    }
};

const parseLocaleNumber = (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    
    let numStr: string;
    if (typeof value === 'number') {
        numStr = String(value);
    } else if (typeof value === 'string') {
        numStr = value.trim();
        if (numStr === '') return null;
    } else {
        console.warn("Unexpected type received in parseLocaleNumber:", typeof value);
        return null;
    }

    let normalizedString: string;

    if (numStr.includes(',')) {
        normalizedString = numStr.replace(/\./g, '').replace(/,/g, '.');
    } else if (numStr.includes('.')) {
        normalizedString = numStr;
    } else {
        normalizedString = numStr;
    }

    const num = parseFloat(normalizedString);

    return isNaN(num) ? null : num;
};

const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '-';
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return format(dateObj, 'dd.MM.yyyy', { locale: tr });
    } catch { return '-'; }
};

// --- Component ---
export default function ExpenseEntryPage() {
    // --- States ---
    const [expenseList, setExpenseList] = useState<ExpenseListEntry[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [formData, setFormData] = useState<ExpenseListFormData>(initialFormData)
    const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [isGeneratingNo, setIsGeneratingNo] = useState(false)
    // Date States
    const [isMasterDatePopoverOpen, setIsMasterDatePopoverOpen] = useState(false);
    const [detailDatePopoverOpen, setDetailDatePopoverOpen] = useState<Record<string, boolean>>({});
    const [masterDateString, setMasterDateString] = useState('');
    const [detailDateStrings, setDetailDateStrings] = useState<Record<string, string>>({});
    // Vehicle Popover State
    const [isVehiclePopoverOpen, setIsVehiclePopoverOpen] = useState(false);
    const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);

    // --- Excel Import States ---
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedImportedData, setParsedImportedData] = useState<ParsedImportedExpense[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [importedTotalAmount, setImportedTotalAmount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Data Fetching ---
    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [listRes, vehiclesRes, typesRes, suppliersRes] = await Promise.all([
                supabase.from('expenses_list').select('*, vehicles(plate_number), suppliers(name)').order('entry_date', { ascending: false }),
                supabase.from('vehicles').select('id, plate_number, name').eq('supplier_id', KIBRIS_TRANSFER_SUPPLIER_ID).order('plate_number'),
                supabase.from('expense_types').select('id, name').eq('is_group', false).order('name'),
                supabase.from('suppliers').select('id, name').order('name')
            ]);

            if (listRes.error) {
                if (listRes.error.code === 'PGRST200') {
                    console.error("Supabase schema cache hatası olabilir (expenses_list <-> suppliers):", listRes.error);
                    setError("Tedarikçi ilişkisi yüklenemedi. API şema önbelleği güncel olmayabilir.");
                    toast.error("Tedarikçi bilgileri yüklenemedi.");
                    const { data: listDataFallback, error: fallbackError } = await supabase.from('expenses_list').select('*, vehicles(plate_number)').order('entry_date', { ascending: false });
                    if (fallbackError) throw fallbackError;
                    setExpenseList(listDataFallback || []);
                } else {
                    throw listRes.error;
                }
            } else {
                setExpenseList(listRes.data || []);
            }
            
            if (vehiclesRes.error) throw vehiclesRes.error;
            if (typesRes.error) throw typesRes.error;
            if (suppliersRes.error) throw suppliersRes.error; 

            setVehicles(vehiclesRes.data || []);
            setExpenseTypes(typesRes.data || []);
            setSuppliers(suppliersRes.data || []); 

        } catch (err: unknown) {
            console.error("Veri yüklenirken hata:", err);
            setError("Masraf giriş verileri yüklenirken bir hata oluştu.");
            toast.error("Veriler yüklenemedi.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // --- Function to generate next expense number ---
    const fetchAndSetNextExpenseNo = useCallback(async (): Promise<string> => {
        setIsGeneratingNo(true);
        let nextExpenseNo = '';
        try {
            const today = new Date();
            const datePrefix = format(today, 'yyyyMMdd');

            const { data, error } = await supabase
                .from('expenses_list')
                .select('expense_no')
                .like('expense_no', `KHT-${datePrefix}____`)
                .order('expense_no', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            let nextSeq = 1;
            if (data && data.expense_no) {
                 const seqStr = data.expense_no.substring(12);
                 const lastSeq = parseInt(seqStr, 10);
                 if (!isNaN(lastSeq)) {
                    nextSeq = lastSeq + 1;
                }
            }

            const nextSeqStr = nextSeq.toString().padStart(4, '0');
            const dateBasedNo = `${datePrefix}${nextSeqStr}`;
            nextExpenseNo = `KHT-${dateBasedNo}`;

            setFormData((prev: ExpenseListFormData) => ({ ...prev, expense_no: nextExpenseNo }));

        } catch (err: unknown) {
            console.error("Error generating next expense number:", err);
            toast.error("Otomatik masraf numarası üretilemedi.");
            setFormData((prev: ExpenseListFormData) => ({ ...prev, expense_no: '' }));
        } finally {
            setIsGeneratingNo(false);
        }
        return nextExpenseNo;
    }, []);

    // --- Form Handling ---
    const handleMasterInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: ExpenseListFormData) => ({ ...prev, [name]: value }));
        setFormError(null);
    };

    const handleMasterDateChange = (date: Date | undefined) => {
        setFormData((prev: ExpenseListFormData) => ({ ...prev, entry_date: date ?? null }));
        setMasterDateString(date ? format(date, 'dd.MM.yyyy') : '');
    };

    const handleMasterDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMasterDateString(e.target.value);
    };

    const handleMasterDateInputBlur = () => {
        try {
            const parsedDate = parse(masterDateString, 'dd.MM.yyyy', new Date());
            if (!isNaN(parsedDate.getTime())) {
                setFormData((prev: ExpenseListFormData) => ({ ...prev, entry_date: parsedDate }));
                setMasterDateString(format(parsedDate, 'dd.MM.yyyy'));
            } else if (masterDateString.trim() !== '') {
                setFormData((prev: ExpenseListFormData) => ({ ...prev, entry_date: null }));
                setMasterDateString('');
            }
        } catch {
             setFormData((prev: ExpenseListFormData) => ({ ...prev, entry_date: null }));
             setMasterDateString('');
        }
    };

    const handleVehicleChange = (vehicleId: number | null) => {
        setFormData((prev: ExpenseListFormData) => ({ ...prev, vehicle_id: vehicleId }));
        setIsVehiclePopoverOpen(false);
    };

    const handleSupplierChange = (supplierId: number | null) => {
        setFormData((prev: ExpenseListFormData) => ({ ...prev, supplier_id: supplierId }));
    };

    const handleDetailChange = (index: number, field: keyof ExpenseDetail, value: string | number | boolean | Date | null | undefined) => {
        setFormData((prev: ExpenseListFormData) => {
            const newDetails = [...prev.details];
            const detailToUpdate = { ...newDetails[index] };

            if (field === 'expense_type_id') {
                detailToUpdate[field] = value ? Number(value) : null;
            } else if (field === 'amount') {
                detailToUpdate[field] = String(value || '');
            } else if (field === 'detail_date') {
                detailToUpdate[field] = value instanceof Date ? value : (value ? parseISO(String(value)) : null);
            } else if (field === 'receipt_no' || field === 'detail_description') {
                detailToUpdate[field] = String(value || '');
            } else if (field === '_key') { // Handle _key specifically
                detailToUpdate[field] = typeof value === 'string' ? value : undefined;
            } else if (field === '_destroy') { // Handle _destroy specifically
                detailToUpdate[field] = typeof value === 'boolean' ? value : undefined;
            } else if (field === 'id' || field === 'expense_list_id') { // Handle id and expense_list_id
                detailToUpdate[field] = typeof value === 'number' ? value : undefined;
            } else {
                // Should not happen if all keys of ExpenseDetail are handled
                // console.warn('Unhandled field in handleDetailChange:', field);
            }
            
            newDetails[index] = detailToUpdate;
            return { ...prev, details: newDetails };
        });
    };

     const handleDetailDateChange = (index: number, date: Date | undefined) => {
        const detailKey = formData.details[index]?._key;
        handleDetailChange(index, 'detail_date', date ?? null);
        if (detailKey) {
             setDetailDateStrings((prev: Record<string, string>) => ({...prev, [detailKey]: date ? format(date, 'dd.MM.yyyy') : ''}));
        }
    };

    const handleDetailDateInputChange = (index: number, value: string) => {
        const detailKey = formData.details[index]?._key;
        if(detailKey){
            setDetailDateStrings((prev: Record<string, string>) => ({...prev, [detailKey]: value}));
        }
    };

    const handleDetailDateInputBlur = (index: number) => {
         const detailKey = formData.details[index]?._key;
         if (!detailKey) return;
         const value = detailDateStrings[detailKey] ?? '';
         try {
            const parsedDate = parse(value, 'dd.MM.yyyy', new Date());
            if (!isNaN(parsedDate.getTime())) {
                handleDetailChange(index, 'detail_date', parsedDate);
                setDetailDateStrings((prev: Record<string, string>) => ({...prev, [detailKey]: format(parsedDate, 'dd.MM.yyyy')}));
            } else if (value.trim() !== '') {
                 handleDetailChange(index, 'detail_date', null);
                 setDetailDateStrings((prev: Record<string, string>) => ({...prev, [detailKey]: ''}));
            }
        } catch {
             handleDetailChange(index, 'detail_date', null);
             setDetailDateStrings((prev: Record<string, string>) => ({...prev, [detailKey]: ''}));
        }
    };

    const addDetailRow = () => {
        setFormData((prev: ExpenseListFormData) => ({ ...prev, details: [...prev.details, { ...initialDetailData, _key: Date.now().toString() }] }));
    };

    const removeDetailRow = (index: number) => {
         setFormData((prev: ExpenseListFormData) => {
            const detailToRemove = prev.details[index];
            if (detailToRemove.id) {
                const newDetails = [...prev.details];
                newDetails[index] = { ...detailToRemove, _destroy: true };
                return { ...prev, details: newDetails };
            } else {
                 return { ...prev, details: prev.details.filter((_: ExpenseDetail, i: number) => i !== index) };
            }
        });
    };

    const validateForm = (): boolean => {
        setFormError(null);
        if (!formData.entry_date) {
            setFormError("Giriş tarihi boş bırakılamaz.");
            return false;
        }
        if (!formData.expense_no.trim()) {
            setFormError("Masraf numarası boş bırakılamaz.");
            return false;
        }
         if (!formData.vehicle_id) {
            setFormError("Araç seçimi zorunludur.");
            return false;
        }
        if (formData.details.filter((d: ExpenseDetail) => !d._destroy).length === 0) {
            setFormError("En az bir masraf detayı girilmelidir.");
            return false;
        }
        for (const [index, detail] of formData.details.filter((d: ExpenseDetail) => !d._destroy).entries()) {
            if (!detail.detail_date) {
                setFormError(`Detay tarihi boş bırakılamaz (Satır ${index + 1}).`);
                return false;
            }
             if (!detail.expense_type_id) {
                setFormError(`Masraf türü seçimi zorunludur (Satır ${index + 1}).`);
                return false;
            }
            const parsedAmount = parseLocaleNumber(detail.amount);
            if (parsedAmount === null || parsedAmount <= 0) {
                setFormError(`Geçerli bir tutar girilmelidir (Satır ${index + 1}, 0'dan büyük). Ondalık ayıracı olarak virgül (,) kullanın.`);
                return false;
            }
        }
        return true;
    };

    async function handleSaveSubmitWithRetry(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!validateForm()) return;
        setIsProcessing(true);
        setFormError(null);

        const maxRetries = 3;
        let attempt = 0;
        let success = false;
        let currentExpenseNo = formData.expense_no;

        while (attempt < maxRetries && !success) {
            attempt++;

            const totalAmount = formData.details
                .filter((d: ExpenseDetail) => !d._destroy)
                .reduce((sum: number, detail: ExpenseDetail) => sum + (parseLocaleNumber(detail.amount) || 0), 0);

            const masterPayload = {
                entry_date: format(formData.entry_date!, 'yyyy-MM-dd'),
                expense_no: currentExpenseNo.trim(),
                description: formData.description.trim() || null,
                vehicle_id: formData.vehicle_id,
                supplier_id: formData.supplier_id,
                total_amount: totalAmount
            };

            try {
                let expenseListId: number;
                let successMessage: string;

                if (formData.id) {
                    const { data: updatedMaster, error: updateMasterError } = await supabase
                        .from('expenses_list')
                        .update(masterPayload)
                        .eq('id', formData.id)
                        .select('id')
                        .single();
                    if (updateMasterError) throw updateMasterError;
                    if (!updatedMaster) throw new Error("Ana kayıt güncellenemedi.");
                    expenseListId = updatedMaster.id;
                    successMessage = "Masraf başarıyla güncellendi.";
                } else {
                    const { data: insertedMaster, error: insertMasterError } = await supabase
                        .from('expenses_list')
                        .insert(masterPayload)
                        .select('id')
                        .single();

                    if (insertMasterError) {
                        if (insertMasterError.code === '23505' && insertMasterError.message?.includes('expenses_list_expense_no_key')) {
                            console.warn(`Attempt ${attempt}: Expense number conflict for ${currentExpenseNo}. Regenerating...`);
                            if (attempt < maxRetries) {
                                toast.info(`Masraf numarası çakıştı, yeni numara deneniyor... (${attempt}/${maxRetries})`);
                                const newExpenseNo = await fetchAndSetNextExpenseNo();
                                if (!newExpenseNo) {
                                    setFormError("Yeni masraf numarası üretilemedi. Lütfen tekrar deneyin.");
                                    toast.error("Numara üretme hatası!");
                                    break;
                                }
                                currentExpenseNo = newExpenseNo;
                                await new Promise(resolve => setTimeout(resolve, 150 * attempt));
                                continue;
                            } else {
                                throw insertMasterError;
                            }
                        } else {
                            throw insertMasterError;
                        }
                    }
                     if (!insertedMaster) throw new Error("Ana kayıt eklenemedi.");
                     expenseListId = insertedMaster.id;
                    successMessage = "Masraf başarıyla eklendi.";
                }

                const detailUpserts = formData.details
                   .filter((d: ExpenseDetail) => !d._destroy)
                   .map((detail: ExpenseDetail) => {
                       const payload: ExpenseDetailUpsertPayload = {
                           expense_list_id: expenseListId!, 
                           detail_date: format(detail.detail_date!, 'yyyy-MM-dd'),
                           receipt_no: detail.receipt_no.trim() || null,
                           expense_type_id: detail.expense_type_id!,
                           detail_description: detail.detail_description.trim() || null,
                           amount: parseLocaleNumber(detail.amount)!,
                       };
                       if (detail.id) { 
                           payload.id = detail.id;
                       }
                       return payload;
                   });

               const detailsToDelete = formData.details
                   .filter((d: ExpenseDetail) => d._destroy && d.id)
                   .map((d: ExpenseDetail) => d.id!);

               if (detailsToDelete.length > 0) {
                   const { error: deleteDetailsError } = await supabase
                       .from('expense_details')
                       .delete()
                       .in('id', detailsToDelete);
                   if (deleteDetailsError) throw deleteDetailsError;
               }

                if (detailUpserts.length > 0) {
                    const { error: upsertError } = await supabase
                       .from('expense_details')
                       .upsert(detailUpserts, { onConflict: 'id' });
                    if (upsertError) throw upsertError;
                }

               toast.success(successMessage);
               setIsAddEditDialogOpen(false);
               setFormData(initialFormData);
               fetchInitialData();
               success = true;

           } catch (err: unknown) {
                console.error(`Attempt ${attempt} failed:`, err);
                if (attempt >= maxRetries || !success) {
                     let specificErrorMessage: string | null = null;
                     let genericErrorMessage = "Masraf kaydedilirken bilinmeyen bir hata oluştu.";

                     if (typeof err === 'object' && err !== null) {
                         const errorObject = err as { code?: string; message?: string }; // Assert after check
                         if (errorObject.code === '23505' && errorObject.message?.includes('expenses_list_expense_no_key')) {
                             specificErrorMessage = `Masraf numarası çakışması ${maxRetries} denemeden sonra devam ediyor. Lütfen sayfayı yenileyin veya manuel kontrol edin.`;
                             toast.error("Masraf numarası çakışması çözülemedi!");
                         } else if (errorObject.message) {
                             genericErrorMessage = errorObject.message;
                         }
                     } else if (err instanceof Error) {
                        genericErrorMessage = err.message;
                     }


                     if (specificErrorMessage) {
                        setFormError(specificErrorMessage);
                     } else {
                        setFormError(genericErrorMessage);
                        toast.error("Masraf kaydedilemedi.");
                     }
                     break;
                 }
            }
        }

        setIsProcessing(false);
    }

    const handleDeleteClick = (id: number) => {
        setDeletingExpenseId(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingExpenseId) return;
        setIsProcessing(true);
        setError(null);
        try {
            // First delete related details
            const { error: detailsError } = await supabase
                .from('expense_details')
                .delete()
                .eq('expense_list_id', deletingExpenseId);

            if (detailsError) throw detailsError;

            // Then delete the master record
            const { error: masterError } = await supabase
                .from('expenses_list')
                .delete()
                .eq('id', deletingExpenseId);

            if (masterError) throw masterError;

            toast.success("Masraf başarıyla silindi.");
            setExpenseList((prev: ExpenseListEntry[]) => prev.filter((item: ExpenseListEntry) => item.id !== deletingExpenseId));
            setIsDeleteDialogOpen(false);
            setDeletingExpenseId(null);
        } catch (e: unknown) { 
            let errorMessage = "Masraf silinirken bilinmeyen bir hata oluştu.";
            if (e instanceof Error) {
                errorMessage = e.message;
            }
            console.error("Error deleting expense:", e);
            toast.error(errorMessage);
            setError(errorMessage); 
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditClick = async (item: ExpenseListEntry) => {
        setIsAddEditDialogOpen(true);
        setFormError(null);

        // Convert detail amounts back to string for the form if they are numbers
        const detailsForForm = item.expense_details?.map(detail => ({
            ...detail,
            detail_date: detail.detail_date ? parseISO(String(detail.detail_date)) : null,
            amount: String(detail.amount ?? ''), // Ensure amount is a string
            _key: detail.id?.toString() || Date.now().toString() + Math.random(), // Ensure _key exists
        })) || [{ ...initialDetailData, _key: Date.now().toString() }];

        setFormData({
            id: item.id,
            entry_date: item.entry_date ? parseISO(item.entry_date) : null,
            expense_no: item.expense_no,
            description: item.description || '',
            vehicle_id: item.vehicle_id,
            supplier_id: item.supplier_id,
            details: detailsForForm,
        });

        // Set date strings for popovers/inputs
        if (item.entry_date) {
            const masterDate = parseISO(item.entry_date);
            setMasterDateString(format(masterDate, 'dd.MM.yyyy'));
        }
        const newDetailDateStrings: Record<string, string> = {};
        detailsForForm.forEach(detail => {
            if (detail.detail_date && detail._key) {
                newDetailDateStrings[detail._key] = format(detail.detail_date, 'dd.MM.yyyy');
            }
        });
        setDetailDateStrings(newDetailDateStrings);
    };

    // --- Excel Functions (using exceljs) ---
    const handleDownloadTemplate = async () => {
        setIsProcessing(true);
        try {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Masraf Listesi');

            // Sütun başlıklarını ve genişliklerini ayarla
            worksheet.columns = [
                { header: 'Masraf Ana Tarih (GG.AA.YYYY)', key: 'master_date', width: 25 },
                { header: 'Masraf No (Opsiyonel)', key: 'expense_no', width: 25 },
                { header: 'Araç Plakası (Sistemdeki Gibi)', key: 'vehicle_plate', width: 30 },
                { header: 'Tedarikçi Adı (Sistemdeki Gibi)', key: 'supplier_name', width: 30 },
                { header: 'Ana Açıklama', key: 'master_description', width: 40 },
                { header: 'Detay Tarihi (GG.AA.YYYY)', key: 'detail_date', width: 25 },
                { header: 'Fiş No', key: 'receipt_no', width: 20 },
                { header: 'Masraf Türü Adı (Sistemdeki Gibi)', key: 'expense_type_name', width: 30 },
                { header: 'Detay Açıklama', key: 'detail_description', width: 40 },
                { header: 'Tutar (Sayısal, Örn: 123.45)', key: 'amount', width: 20 },
            ];

            // Başlık satırını kalın yap
            worksheet.getRow(1).font = { bold: true };

            // Örnek bir satır ekle (kullanıcıya yol göstermesi için)
            worksheet.addRow({
                master_date: '01.01.2024',
                expense_no: 'MASRAF-001',
                vehicle_plate: vehicles.length > 0 ? vehicles[0].plate_number : 'ABC 123',
                supplier_name: suppliers.length > 0 ? suppliers[0].name : 'Örnek Tedarikçi',
                master_description: 'Örnek ana masraf açıklaması',
                detail_date: '01.01.2024',
                receipt_no: 'FIS-12345',
                expense_type_name: expenseTypes.length > 0 ? expenseTypes[0].name : 'Yakıt',
                detail_description: 'Örnek detay masraf açıklaması',
                amount: 150.75
            });

            // Kullanıcıya sistemdeki araç, tedarikçi ve masraf türlerini hatırlatmak için notlar ekle
            // let notes = "Lütfen Araç Plakası, Tedarikçi Adı ve Masraf Türü Adı alanlarını sistemde kayıtlı olanlarla tam eşleşecek şekilde giriniz.\n";
            // notes += "Sistemdeki Araç Plakaları: " + (vehicles.map((v: Vehicle) => v.plate_number).join(', ') || 'Yok') + "\n";
            // notes += "Sistemdeki Tedarikçiler: " + (suppliers.map((s: Supplier) => s.name).join(', ') || 'Yok') + "\n";
            // notes += "Sistemdeki Masraf Türleri: " + (expenseTypes.map((et: ExpenseType) => et.name).join(', ') || 'Yok');
            
            // Notları bir hücreye yazdır (birleştirilmiş hücreye de yazılabilir)
            // worksheet.addRows([[], [notes]]); // Bu şekilde boş satırlar ekleyip sonra birleştirebilirsiniz
            // Şimdilik basit bir loglama veya ayrı bir 'Hatırlatmalar' sayfası daha iyi olabilir.
            // console.log(notes); // Veya bir uyarı mesajı olarak gösterilebilir.

            // Dosyayı oluştur ve indir
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            FileSaver.saveAs(blob, 'Masraf_Listesi_Sablonu.xlsx');

            toast.success('Masraf listesi şablonu başarıyla indirildi.');

        } catch (err: unknown) { // any -> unknown
            console.error("Şablon indirilirken hata:", err);
            toast.error('Şablon indirilirken bir hata oluştu.');
            // Detaylı hata loglaması için err objesini inceleyebilirsiniz
            // if (err instanceof Error) { setImportError(err.message); }
        } finally {
            setIsProcessing(false);
        }
    };

    const processExcelData = (file: File) => {
        setIsImporting(true);
        setImportError(null);
        setParsedImportedData([]);

        const parseExcelDate = (cellValue: string | number | Date | null | undefined): Date | null => {
            if (!cellValue) return null;
            if (cellValue instanceof Date) return cellValue;
            // Excel bazen sayı olarak tarih dönebilir, XLSX.SSF.parse_date_code ile çevir
            if (typeof cellValue === 'number') {
                try {
                    const parsed = XLSX.SSF.parse_date_code(cellValue);
                    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0);
                    return null;
                } catch {
                    return null;
                }
            }
            // Sadece string ise split ve parseISO denenmeli
            if (typeof cellValue === 'string') {
                // GG.AA.YYYY formatını dene
                try {
                    const parts = cellValue.split('.');
                    if (parts.length === 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1; // Ay 0-indexed
                        const year = parseInt(parts[2], 10);
                        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                            const date = new Date(year, month, day);
                            if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                                return date;
                            }
                        }
                    }
                } catch { /* Hata olursa diğer formatları dene */ }
                // ISO formatını veya diğer yaygın formatları dene
                try {
                    const parsedDate = parseISO(cellValue);
                    if (!isNaN(parsedDate.getTime())) return parsedDate;
                } catch { /* Hata olursa null dön */ }
            }
            return null;
        };

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                if (!data) {
                    throw new Error("Dosya içeriği okunamadı.");
                }
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as unknown[][];

                if (jsonData.length <= 1) { // Başlık satırı + veri yoksa
                    throw new Error("Excel dosyasında işlenecek veri bulunamadı veya dosya boş.");
                }

                const headers = jsonData[0] as string[];
                const expectedHeaders = [
                    'Masraf Ana Tarih (GG.AA.YYYY)', 'Masraf No (Opsiyonel)', 'Araç Plakası (Sistemdeki Gibi)', 
                    'Tedarikçi Adı (Sistemdeki Gibi)', 'Ana Açıklama', 'Detay Tarihi (GG.AA.YYYY)', 
                    'Fiş No', 'Masraf Türü Adı (Sistemdeki Gibi)', 'Detay Açıklama', 'Tutar (Sayısal, Örn: 123.45)'
                ];
                
                // Başlık kontrolü (tam eşleşme veya kısmi)
                const lowerCaseHeaders = headers.map(h => String(h).toLowerCase().trim());
                const lowerCaseExpectedHeaders = expectedHeaders.map(h => h.toLowerCase().trim());

                for (let i = 0; i < lowerCaseExpectedHeaders.length; i++) {
                    if (lowerCaseHeaders[i] !== lowerCaseExpectedHeaders[i]) {
                        // console.warn(`Başlık uyuşmazlığı: Beklenen: "${expectedHeaders[i]}", Gelen: "${headers[i]}"`);
                        // throw new Error(`Excel başlıkları şablonla uyuşmuyor. Sütun ${i+1}: Beklenen "${expectedHeaders[i]}", Gelen "${headers[i] || 'BOŞ'}". Lütfen şablonu kullanın.`);
                    }
                }
                
                const processedData: ParsedImportedExpense[] = [];
                let currentMaster: (Omit<ExpenseListFormData, 'details' | 'id'> & { originalIndex: number }) | null = null;
                let masterDetails: (Omit<ExpenseDetail, '_key' | '_destroy' | 'id' | 'expense_list_id'> & { originalIndex: number })[] = [];
                let overallTotalAmount = 0;

                for (let i = 1; i < jsonData.length; i++) { // Başlık satırını atla (i=1)
                    const row = jsonData[i] as unknown[]; // Değişiklik: any[] -> unknown[]
                    
                    const masterDateRaw = row[0]; // Masraf Ana Tarih
                    const expenseNoRaw = row[1];    // Masraf No
                    const vehiclePlateRaw = row[2]; // Araç Plakası
                    const supplierNameRaw = row[3]; // Tedarikçi Adı
                    const masterDescriptionRaw = row[4]; // Ana Açıklama
                    
                    const detailDateRaw = row[5];   // Detay Tarihi
                    const receiptNoRaw = row[6];    // Fiş No
                    const expenseTypeNameRaw = row[7]; // Masraf Türü Adı
                    const detailDescriptionRaw = row[8]; // Detay Açıklama
                    const amountRaw = row[9];       // Tutar

                    // Yeni bir ana masraf başlığı mı?
                    // Eğer ana masraf için gerekli alanlardan en az biri doluysa ve bir önceki master'dan farklıysa yeni master kabul et
                    if (masterDateRaw || vehiclePlateRaw || supplierNameRaw) { // Bu alanlardan biri bile doluysa yeni master olabilir
                        if (currentMaster) { // Önceki master'ı kaydet
                            processedData.push({ master: { ...currentMaster }, details: [...masterDetails] });
                        }
                        masterDetails = []; // Yeni master için detayları sıfırla
                        
                        const masterDate = parseExcelDate(masterDateRaw as string | number | Date | null | undefined);
                        if (!masterDate) {
                            throw new Error(`Satır ${i + 1}: Geçersiz 'Masraf Ana Tarih'. Lütfen GG.AA.YYYY formatında girin.`);
                        }

                        const vehicle = vehicles.find((v: Vehicle) => v.plate_number?.toLowerCase() === String(vehiclePlateRaw || '').toLowerCase().trim());
                        const supplier = suppliers.find((s: Supplier) => s.name?.toLowerCase() === String(supplierNameRaw || '').toLowerCase().trim());

                        currentMaster = {
                            entry_date: masterDate,
                            expense_no: String(expenseNoRaw || '').trim(),
                            vehicle_id: vehicle?.id || null,
                            supplier_id: supplier?.id || null,
                            description: String(masterDescriptionRaw || '').trim(),
                            originalIndex: i + 1
                        };
                    }

                    // Detay bilgilerini işle (eğer master varsa ve detay için en azından tutar veya masraf türü doluysa)
                    if (currentMaster && (expenseTypeNameRaw || amountRaw)) {
                        const detailDate = parseExcelDate(detailDateRaw as string | number | Date | null | undefined);
                        if (!detailDate) {
                             throw new Error(`Satır ${i + 1}: Geçersiz 'Detay Tarihi'. Lütfen GG.AA.YYYY formatında girin.`);
                        }
                        const expenseType = expenseTypes.find((et: ExpenseType) => et.name?.toLowerCase() === String(expenseTypeNameRaw || '').toLowerCase().trim());
                        if (!expenseType) {
                            throw new Error(`Satır ${i + 1}: Geçersiz veya bulunamayan 'Masraf Türü Adı': "${expenseTypeNameRaw || 'BOŞ'}". Sistemdeki türlerden birini kullanın.`);
                        }
                        
                        const amount = parseLocaleNumber(String(amountRaw || '0'));
                        if (amount === null || isNaN(amount)) {
                            throw new Error(`Satır ${i + 1}: Geçersiz 'Tutar' değeri: "${amountRaw || 'BOŞ'}". Sayısal bir değer olmalıdır.`);
                        }
                        overallTotalAmount += amount;

                        masterDetails.push({
                            detail_date: detailDate,
                            receipt_no: String(receiptNoRaw || '').trim(),
                            expense_type_id: expenseType.id,
                            detail_description: String(detailDescriptionRaw || '').trim(),
                            amount: String(amount), // amount'ı string olarak saklıyoruz
                            originalIndex: i + 1
                        });
                    }
                }
                 // Son kalan master'ı da ekle
                 if (currentMaster) {
                    processedData.push({ master: { ...currentMaster }, details: [...masterDetails] });
                }

                if(processedData.length === 0){
                    throw new Error("Excel dosyasından geçerli bir masraf ve detay bilgisi çıkarılamadı. Lütfen şablonu ve verileri kontrol edin.");
                }

                setParsedImportedData(processedData);
                setImportedTotalAmount(overallTotalAmount);
                setIsReviewModalOpen(true);
                if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input

            } catch (err: unknown) { 
                console.error("Excel dosyası işlenirken hata:", err);
                setImportError(err instanceof Error ? err.message : "Excel dosyası okunurken veya işlenirken bir hata oluştu.");
                toast.error("Excel dosyası işlenemedi.");
            } finally {
                setIsImporting(false);
            }
        };
        reader.onerror = () => {
            setIsImporting(false);
            const message = "Dosya okunurken bir hata oluştu.";
            setImportError(message);
            toast.error(message);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Call the processing function directly
            processExcelData(file); 
        } else {
            console.log("Dosya seçilmedi.");
            // Ensure loading indicator is turned off if no file is chosen after clicking
            setIsImporting(false); 
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // --- Review and Confirmation Handlers ---
    const handleConfirmImport = async () => {
        if (parsedImportedData.length === 0) {
            toast.error("İçeri aktarılacak veri bulunamadı.");
            return;
        }
        setIsProcessing(true);
        setImportError(null);
        let successCount = 0;
        const errorMessages: string[] = [];

        try {
            for (const item of parsedImportedData) {
                try {
                    // 1. Ana masrafı (master) ekle
                    const { data: masterData, error: masterError } = await supabase
                        .from('expenses_list')
                        .insert({
                            entry_date: item.master.entry_date!.toISOString(),
                            expense_no: item.master.expense_no || (await fetchAndSetNextExpenseNo()),
                            vehicle_id: item.master.vehicle_id,
                            supplier_id: item.master.supplier_id,
                            description: item.master.description,
                            total_amount: item.details.reduce((sum: number, d: Omit<ExpenseDetail, '_key' | '_destroy' | 'id' | 'expense_list_id'> & { originalIndex: number }) => sum + (parseLocaleNumber(d.amount) || 0), 0)
                        })
                        .select('id')
                        .single();

                    if (masterError) throw new Error(`Ana masraf (Satır ${item.master.originalIndex}) eklenemedi: ${masterError.message}`);
                    if (!masterData || !masterData.id) throw new Error(`Ana masraf (Satır ${item.master.originalIndex}) için ID alınamadı.`);

                    const expenseListId = masterData.id;

                    // 2. Detayları (details) ekle
                    if (item.details && item.details.length > 0) {
                        const detailsToInsert = item.details.map((detail: Omit<ExpenseDetail, '_key' | '_destroy' | 'id' | 'expense_list_id'> & { originalIndex: number }) => ({
                            expense_list_id: expenseListId,
                            detail_date: detail.detail_date!.toISOString(),
                            receipt_no: detail.receipt_no,
                            expense_type_id: detail.expense_type_id,
                            detail_description: detail.detail_description,
                            amount: parseLocaleNumber(detail.amount)
                        }));

                        const { error: detailsError } = await supabase
                            .from('expense_details')
                            .insert(detailsToInsert);

                        if (detailsError) throw new Error(`Detaylar (Ana Masraf Satır ${item.master.originalIndex}) eklenemedi: ${detailsError.message}`);
                    }
                    successCount++;
                } catch (err: unknown) { // any -> unknown
                    const message = err instanceof Error ? err.message : String(err);
                    console.error("İçeri aktarma sırasında öğe hatası:", message, "Öğe:", item);
                    errorMessages.push(message);
                }
            }

            if (errorMessages.length > 0) {
                setImportError(`Bazı kayıtlar içeri aktarılamadı: ${errorMessages.join("; ")}`);
                toast.warning(`${successCount} kayıt başarıyla aktarıldı, ${errorMessages.length} kayıtta hata oluştu.`);
            } else {
                toast.success(`${successCount} masraf kaydı başarıyla içeri aktarıldı.`);
            }

            await fetchInitialData(); // Listeyi yenile

        } catch (err: unknown) { // any -> unknown
            console.error("Genel içeri aktarma hatası:", err);
            const message = err instanceof Error ? err.message : "İçeri aktarma sırasında genel bir hata oluştu.";
            setImportError(message);
            toast.error(message);
        } finally {
            setIsProcessing(false);
            setIsReviewModalOpen(false);
            setParsedImportedData([]);
            setImportedTotalAmount(0);
        }
    };

    const handleCancelImport = () => {
        setIsReviewModalOpen(false);
        setParsedImportedData([]);
        setImportError(null);
        setImportedTotalAmount(0);
        toast.info("Excel içe aktarma iptal edildi.");
    };

    // --- Render Functions ---
    const renderReviewModal = () => (
        <Dialog open={isReviewModalOpen} onOpenChange={(isOpen: boolean) => { if (!isOpen) handleCancelImport(); }}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>İçe Aktarılan Masrafları Gözden Geçir</DialogTitle>
                    <DialogDescription>
                        Aşağıda Excel&apos;den okunan masraf girişleri bulunmaktadır. Lütfen kontrol edin ve onaylayın.
                        ({parsedImportedData.length} adet masraf grubu bulundu).
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto"> 
                    {parsedImportedData.map((expenseGroup: ParsedImportedExpense, groupIndex: number) => (
                        <div key={expenseGroup.master.expense_no || groupIndex} className="mb-6 p-4 border rounded-lg">
                             <h4 className="font-semibold mb-2 border-b pb-1">Masraf No: {expenseGroup.master.expense_no}</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                                <div><strong>Giriş Tarihi:</strong> {formatDate(expenseGroup.master.entry_date)}</div>
                                <div><strong>Araç:</strong> {vehicles.find((v: Vehicle) => v.id === expenseGroup.master.vehicle_id)?.plate_number ?? '-'}</div>
                                <div><strong>Tedarikçi:</strong> {suppliers.find((s: Supplier) => s.id === expenseGroup.master.supplier_id)?.name ?? '-'}</div>
                                <div className="col-span-2"><strong>Ana Açıklama:</strong> {expenseGroup.master.description || '-'}</div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Detay Tarihi</TableHead>
                                        <TableHead>Fiş No</TableHead>
                                        <TableHead>Masraf Türü</TableHead>
                                        <TableHead>Detay Açıklama</TableHead>
                                        <TableHead className="text-right">Tutar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenseGroup.details.map((detail: (Omit<ExpenseDetail, '_key' | '_destroy' | 'id' | 'expense_list_id'> & { originalIndex: number }), detailIndex: number) => (
                                        <TableRow key={detailIndex}>
                                            <TableCell>{formatDate(detail.detail_date)}</TableCell>
                                            <TableCell>{detail.receipt_no || '-'}</TableCell>
                                            <TableCell>{expenseTypes.find((et: ExpenseType) => et.id === detail.expense_type_id)?.name ?? 'Hatalı Tür'}</TableCell>
                                            <TableCell>{detail.detail_description || '-'}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(parseLocaleNumber(detail.amount))}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ))}
                </div>
                <div className="text-lg font-semibold text-right mt-4 mb-4 pr-6">
                    Toplam Tutar: {formatCurrency(importedTotalAmount)}
                </div>
                <DialogFooter className="pt-4 border-t">
                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={handleCancelImport} disabled={isProcessing}>İptal</Button>
                        <Button type="button" onClick={handleConfirmImport} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Onayla ve Kaydet
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    const renderAddEditForm = () => (
        <DialogContent className="sm:max-w-6xl">
            <div className="flex justify-end gap-2 mb-4 border-b pb-4">
                 <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                     <Download className="mr-2 h-4 w-4" />
                     Şablon İndir
                 </Button>
                 <Button variant="outline" size="sm" onClick={triggerFileInput} disabled={isImporting}>
                     {isImporting ? (
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     ) : (
                         <Upload className="mr-2 h-4 w-4" />
                     )}
                     {isImporting ? "İçe Aktarılıyor..." : "Excel İçe Aktar"}
                 </Button>
                 <input
                     type="file"
                     ref={fileInputRef}
                     onChange={handleFileUpload}
                     accept=".xlsx, .xls"
                     style={{ display: 'none' }} // Hide the default file input
                 />
            </div>
            <form onSubmit={handleSaveSubmitWithRetry}>
                <DialogHeader>
                    <DialogTitle>{formData.id ? 'Masrafı Düzenle' : 'Yeni Masraf Girişi'}</DialogTitle>
                    <DialogDescription>
                        Masraf bilgilerini ve detaylarını girin.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="entry_date">Giriş Tarihi *</Label>
                        <div className="flex items-center gap-2">
                             <Input 
                                id="entry_date"
                                placeholder="gg.aa.yyyy"
                                value={masterDateString}
                                onChange={handleMasterDateInputChange} 
                                onBlur={handleMasterDateInputBlur}
                                className={cn(!formData.entry_date && masterDateString !== '' && "border-red-500")}
                             />
                             <Popover open={isMasterDatePopoverOpen} onOpenChange={setIsMasterDatePopoverOpen}>
                                 <PopoverTrigger asChild>
                                     <Button variant={"outline"} size="icon" className="h-9 w-9">
                                        <CalendarIcon className="h-4 w-4" />
                                    </Button>
                                 </PopoverTrigger>
                                 <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={formData.entry_date ?? undefined}
                                        onSelect={(date: Date | undefined) => {
                                            handleMasterDateChange(date);
                                            setIsMasterDatePopoverOpen(false);
                                        }}
                                        initialFocus
                                        locale={tr}
                                    />
                                 </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="expense_no">Masraf No/Fatura no *</Label>
                        <div className="relative">
                             <Input id="expense_no" name="expense_no" value={formData.expense_no} onChange={handleMasterInputChange} required />
                             {isGeneratingNo && (
                                 <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                             )}
                        </div>
                    </div>
                     <div className="space-y-2">
                         <Label htmlFor="vehicle_id">Araç *</Label>
                          <Popover open={isVehiclePopoverOpen} onOpenChange={setIsVehiclePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={true}
                                    className="w-full justify-between"
                                >
                                    {formData.vehicle_id
                                        ? vehicles.find((v: Vehicle) => v.id === formData.vehicle_id)?.plate_number
                                        : "Araç Seçin..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command>
                                    <CommandInput placeholder="Araç Plakası Ara..." />
                                     <CommandList>
                                        <CommandEmpty>Araç bulunamadı.</CommandEmpty>
                                        <CommandGroup>
                                            {vehicles.map((vehicle: Vehicle) => (
                                                <CommandItem
                                                    key={vehicle.id}
                                                    value={vehicle.plate_number}
                                                    onSelect={() => {
                                                        handleVehicleChange(vehicle.id);
                                                        setIsVehiclePopoverOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            formData.vehicle_id === vehicle.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {vehicle.plate_number} ({vehicle.name})
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                     </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="supplier_id">Tedarikçi</Label>
                         <Popover open={isSupplierPopoverOpen} onOpenChange={setIsSupplierPopoverOpen}>
                             <PopoverTrigger asChild>
                                 <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isSupplierPopoverOpen}
                                    className="w-full justify-between"
                                    disabled={!suppliers.length}
                                >
                                    {formData.supplier_id
                                        ? suppliers.find((supplier: Supplier) => supplier.id === formData.supplier_id)?.name
                                        : "Tedarikçi Seçin..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command>
                                     <CommandInput placeholder="Tedarikçi ara..." />
                                     <CommandList>
                                        <CommandEmpty>Tedarikçi bulunamadı.</CommandEmpty>
                                        <CommandGroup>
                                             <CommandItem
                                                key="remove-supplier"
                                                value=""
                                                onSelect={() => handleSupplierChange(null)}
                                             >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        formData.supplier_id === null ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                Seçimi Kaldır
                                            </CommandItem>
                                             {suppliers.map((supplier: Supplier) => (
                                                <CommandItem
                                                    key={supplier.id}
                                                    value={supplier.name}
                                                    onSelect={() => {
                                                        handleSupplierChange(supplier.id);
                                                        setIsSupplierPopoverOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            formData.supplier_id === supplier.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {supplier.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                     </CommandList>
                                 </Command>
                             </PopoverContent>
                         </Popover>
                     </div>
                     <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="description">Açıklama</Label>
                        <Textarea id="description" name="description" value={formData.description} onChange={handleMasterInputChange} />
                    </div>
                </div>

                 <div className="mt-6 border-t pt-4 max-h-[40vh] overflow-y-auto pr-2">
                    <h3 className="text-lg font-semibold mb-3">Masraf Detayları</h3>
                     {formData.details.map((detail: ExpenseDetail, index: number) => (
                        !detail._destroy && (
                            <div key={detail._key || detail.id} className="mb-4 p-3 border rounded grid grid-cols-1 md:grid-cols-6 gap-3 relative">
                                 <div className="space-y-1 md:col-span-1">
                                     <Label htmlFor={`detail_date_${index}`}>Tarih *</Label>
                                     <div className="flex items-center gap-1">
                                         <Input
                                            id={`detail_date_${index}`}
                                            placeholder="gg.aa.yyyy"
                                            value={detailDateStrings[detail._key!] ?? ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailDateInputChange(index, e.target.value)}
                                            onBlur={() => handleDetailDateInputBlur(index)}
                                            className={cn("h-9", !detail.detail_date && (detailDateStrings[detail._key!] ?? '') !== '' && "border-red-500")}
                                         />
                                         <Popover open={detailDatePopoverOpen[detail._key!] ?? false} onOpenChange={(open: boolean) => setDetailDatePopoverOpen((prev: Record<string, boolean>) => ({...prev, [detail._key!]: open}))}>
                                             <PopoverTrigger asChild>
                                                 <Button size="icon" variant={"outline"} className="h-9 w-9 flex-shrink-0">
                                                     <CalendarIcon className="h-4 w-4" />
                                                 </Button>
                                             </PopoverTrigger>
                                             <PopoverContent className="w-auto p-0">
                                                <Calendar 
                                                    mode="single" 
                                                    selected={detail.detail_date ?? undefined} 
                                                    onSelect={(date: Date | undefined) => {
                                                        handleDetailDateChange(index, date);
                                                        const detailKey = formData.details[index]?._key;
                                                        if(detailKey) {
                                                            setDetailDatePopoverOpen((prev: Record<string, boolean>) => ({...prev, [detailKey]: false}));
                                                        }
                                                    }} 
                                                    initialFocus 
                                                    locale={tr} 
                                                />
                                             </PopoverContent>
                                         </Popover>
                                     </div>
                                 </div>
                                <div className="space-y-1 md:col-span-1">
                                    <Label htmlFor={`receipt_no_${index}`}>Fiş No</Label>
                                    <Input id={`receipt_no_${index}`} value={detail.receipt_no} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailChange(index, 'receipt_no', e.target.value)} />
                                </div>
                                <div className="space-y-1 md:col-span-1">
                                    <Label htmlFor={`expense_type_id_${index}`}>Masraf Türü *</Label>
                                     <Select value={detail.expense_type_id?.toString() ?? ''} onValueChange={(value: string) => handleDetailChange(index, 'expense_type_id', value)} >
                                        <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                                        <SelectContent>
                                            {expenseTypes.map((type: ExpenseType) => (
                                                <SelectItem key={type.id} value={type.id.toString()}>{type.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-1 md:col-span-2">
                                    <Label htmlFor={`detail_description_${index}`}>Açıklama</Label>
                                    <Input id={`detail_description_${index}`} value={detail.detail_description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailChange(index, 'detail_description', e.target.value)} />
                                </div>
                                <div className="space-y-1 md:col-span-1">
                                    <Label htmlFor={`amount_${index}`}>Tutar *</Label>
                                    <Input id={`amount_${index}`} type="text" inputMode="decimal" value={detail.amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailChange(index, 'amount', e.target.value)} required />
                                </div>
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute -top-2 -right-2 text-red-500 hover:text-red-700 h-6 w-6"
                                    onClick={() => removeDetailRow(index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addDetailRow} className="mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" /> Detay Ekle
                    </Button>
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
        </DialogContent>
    );

    // --- Render ---
    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Masraf Girişleri</h1>
                <Dialog open={isAddEditDialogOpen} onOpenChange={(isOpen: boolean) => {
                     setIsAddEditDialogOpen(isOpen);
                     if (isOpen && !formData.id) {
                        setFormData(initialFormData);
                        setFormError(null);
                        fetchAndSetNextExpenseNo();
                     } else if (isOpen && formData.id) {
                         setFormError(null);
                     } else if (!isOpen) {
                         setFormData(initialFormData);
                         setMasterDateString('');
                         setDetailDateStrings({});
                     }
                 }}>
                     <DialogTrigger asChild>
                         <Button onClick={() => { setFormData(initialFormData); setFormError(null); }}>
                             <PlusCircle className="mr-2 h-4 w-4" />
                             Yeni Masraf Girişi
                         </Button>
                     </DialogTrigger>
                    {renderAddEditForm()}
                </Dialog>
            </div>

            {importError && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>İçe Aktarma Hatası</AlertTitle>
                    <AlertDescription>{importError}</AlertDescription>
                </Alert>
            )}

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
                            <TableHead>Giriş Tarihi</TableHead>
                             <TableHead>Masraf No</TableHead>
                             <TableHead>Araç</TableHead>
                             <TableHead>Tedarikçi</TableHead>
                             <TableHead>Açıklama</TableHead>
                             <TableHead className="text-right">Toplam Tutar</TableHead>
                             <TableHead className="text-right">İşlemler</TableHead>
                         </TableRow>
                     </TableHeader>
                     <TableBody>
                        {expenseList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Kayıtlı masraf girişi bulunamadı.
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenseList.map((item: ExpenseListEntry) => (
                                <TableRow key={item.id}>
                                    <TableCell>{formatDate(item.entry_date)}</TableCell>
                                    <TableCell className="font-medium">{item.expense_no}</TableCell>
                                    <TableCell>{item.vehicles?.plate_number || '-'}</TableCell>
                                    <TableCell>{item.suppliers?.name || '-'}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={item.description || ''}>
                                        {item.description || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.total_amount)}</TableCell>
                                    <TableCell className="text-right">
                                         <Link href={`/admin/accounting/expenses/${item.id}`} passHref legacyBehavior>
                                            <Button variant="ghost" size="icon" className="mr-2" title="Görüntüle">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                         </Link>

                                        <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditClick(item)}>
                                             <Edit className="h-4 w-4" />
                                         </Button>

                                        <AlertDialog open={isDeleteDialogOpen && deletingExpenseId === item.id} onOpenChange={setIsDeleteDialogOpen}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(item.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {`Masraf No `}<span className="font-semibold">{item.expense_no}</span>{` olan masraf girişi ve tüm detayları kalıcı olarak silinecektir. Bu işlem geri alınamaz.`}
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

            {/* Render the review modal */}
            {renderReviewModal()} 
        </div>
    );
} 