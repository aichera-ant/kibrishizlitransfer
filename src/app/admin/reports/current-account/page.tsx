'use client'; // Moved to the top of the file

import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
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
import { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import { Calendar as CalendarIcon, ChevronsUpDown, Check, Search, AlertTriangle, Loader2, FileSpreadsheet } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"
// import * as ExcelJS from 'exceljs';
// import { saveAs } from 'file-saver'; // Unused import

// --- Types --- Interfaces ---
interface Supplier {
    id: string;
    name: string;
}

interface ReportRow {
    date: string;
    documentNumber: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    expenseId: number;
    balanceType: 'A' | 'B';
}

interface Expense {
    created_at: string;
    id: number;
    description: string | null;
    total_amount: number;
    expense_no: string;
}

interface ExpenseDetail {
    id: number;
    expense_list_id: number;
    expense_type_id: number;
    amount: number;
    detail_date: string | null;
    receipt_no: string | null;
    detail_description: string | null;
    expense_types: {
        name: string | null;
    } | null;
}

// Helper Function for Currency Formatting
const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '-'; // Return '-' for invalid values
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

// Moved all client logic and state into this component
function ReportContent() {
    // 'use client'; // Removed from here

    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [reportData, setReportData] = useState<ReportRow[]>([])
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false)
    const [loading, setLoading] = useState(false);
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isInitialParamsLoad, setIsInitialParamsLoad] = useState(true);

    // State for Expense Detail Modal
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(null);
    const [expenseDetails, setExpenseDetails] = useState<ExpenseDetail[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    // URL parametrelerini okumak için hook
    const searchParams = useSearchParams()

    // --- Data Fetching --- 
    const fetchSuppliers = useCallback(async () => {
        setIsLoadingSuppliers(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name')
                .order('name', { ascending: true });

            if (error) throw error;
            setSuppliers(data || []);
        } catch (err: unknown) {
            console.error("Tedarikçiler yüklenirken hata:", err);
            if (err instanceof Error) {
                setError(err.message || "Tedarikçi listesi yüklenemedi.");
            } else {
                setError("Tedarikçi listesi yüklenirken bilinmeyen bir hata oluştu.");
            }
        } finally {
            setIsLoadingSuppliers(false);
        }
    }, []);

    // --- Report Fetching Logic (Parametreler kaldırıldı, state kullanılacak) ---
    const handleShowReport = useCallback(async () => {
        if (!selectedSupplierId || !dateRange?.from || !dateRange?.to) {
            setError('Lütfen bir tedarikçi ve geçerli bir tarih aralığı seçin.');
            setReportData([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setReportData([]);

        try {
            const { data: expenses, error: expensesError } = await supabase
                .from('expenses_list')
                .select<string, Expense>('created_at, id, description, total_amount, expense_no')
                .eq('supplier_id', selectedSupplierId)
                .gte('created_at', format(dateRange.from, 'yyyy-MM-dd'))
                .lte('created_at', format(dateRange.to, 'yyyy-MM-dd'))
                .order('created_at', { ascending: true });

            if (expensesError) {
                throw expensesError;
            }

            if (!expenses) {
                setReportData([]);
                setLoading(false);
                return;
            }

            let balance = 0;
            const formattedReportData: ReportRow[] = expenses.map((expense: Expense) => {
                const debit = 0;
                const credit = expense.total_amount > 0 ? expense.total_amount : 0;
                balance += debit - credit;
                const balanceType = balance < 0 ? 'A' : 'B';
                return {
                    date: format(new Date(expense.created_at), 'dd/MM/yyyy'),
                    documentNumber: expense.expense_no,
                    description: expense.description || '-',
                    debit: debit,
                    credit: credit,
                    balance: balance,
                    expenseId: expense.id,
                    balanceType: balanceType,
                };
            });

            setReportData(formattedReportData);
        } catch (err: unknown) {
            let message = 'Rapor alınırken bilinmeyen bir hata oluştu.';
            if (err instanceof Error) {
                message = err.message || message;
            }
            setError(`Rapor alınırken hata oluştu: ${message}`);
            console.error("Error fetching report data:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedSupplierId, dateRange]);

    // Tedarikçileri ilk yüklemede çek
    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    // URL parametrelerini oku ve state'leri ayarla
    useEffect(() => {
        const supplierIdParam = searchParams.get('supplierId');
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');

        if (isInitialParamsLoad && supplierIdParam && fromParam && toParam) {
            try {
                const fromDate = parseISO(fromParam);
                const toDate = parseISO(toParam);

                if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
                    const newDateRange = { from: fromDate, to: toDate };
                    setSelectedSupplierId(supplierIdParam);
                    setDateRange(newDateRange);
                } else {
                    console.warn("URL'deki tarih parametreleri geçersiz.");
                    setIsInitialParamsLoad(false);
                }
            } catch (e: any) {
                console.error("URL parametreleri işlenirken hata:", e);
                setIsInitialParamsLoad(false);
            }
        } else {
            setIsInitialParamsLoad(false);
        }
    }, [searchParams, isInitialParamsLoad]);

    // State'ler (URL'den veya manuel) ayarlandıktan sonra raporu getirmek için useEffect
    useEffect(() => {
        if (isInitialParamsLoad && selectedSupplierId && dateRange?.from && dateRange?.to) {
            handleShowReport();
            setIsInitialParamsLoad(false);
        }
    }, [selectedSupplierId, dateRange, isInitialParamsLoad, handleShowReport]);

    // --- Event Handlers ---
    const handleDateSelect = (selectedRange: DateRange | undefined) => {
        setDateRange(selectedRange);
        // Close popover if both dates are selected
        if (selectedRange?.from && selectedRange?.to) {
            setIsDatePopoverOpen(false);
        }
    };

    const handleShowDetailsClick = (expenseId: number) => {
        setSelectedExpenseId(expenseId);
        setExpenseDetails([]); // Clear previous details
        setDetailError(null); // Clear previous error
        setIsLoadingDetails(true);
        setIsDetailModalOpen(true);
    };

    const fetchDetails = useCallback(async () => {
        if (!selectedExpenseId) return;
        setIsLoadingDetails(true);
        setDetailError(null);
        try {
            const { data, error } = await supabase
                .from('expense_details')
                .select(`
                    id,
                    expense_list_id,
                    expense_type_id,
                    amount,
                    detail_date,
                    receipt_no,
                    detail_description,
                    expense_types (
                        name
                    )
                `)
                .eq('expense_list_id', selectedExpenseId);

            if (error) throw error;

            const processedDetails = (data || []).map((item: any) => {
                let finalExpenseType = null;
                if (Array.isArray(item.expense_types) && item.expense_types.length > 0) {
                    finalExpenseType = item.expense_types[0];
                } else if (item.expense_types && typeof item.expense_types === 'object' && !Array.isArray(item.expense_types)) {
                    finalExpenseType = item.expense_types;
                }

                return {
                    ...item,
                    expense_types: finalExpenseType as { name: string | null } | null,
                };
            });
            setExpenseDetails(processedDetails as ExpenseDetail[]);
        } catch (err: any) {
            console.error("Masraf detayları çekilirken hata:", err);
            if (err instanceof Error) {
                setDetailError(err.message || "Masraf detayları yüklenirken bir hata oluştu.");
            } else {
                setDetailError("Masraf detayları yüklenirken bilinmeyen bir hata oluştu.");
            }
        } finally {
            setIsLoadingDetails(false);
        }
    }, [selectedExpenseId, setIsLoadingDetails, setDetailError, setExpenseDetails]);

    // Fetch expense details when modal opens and selectedExpenseId is set
    useEffect(() => {
        if (isDetailModalOpen && selectedExpenseId) {
            fetchDetails();
        }
    }, [selectedExpenseId, isDetailModalOpen, fetchDetails]);

    // --- Excel Export Function ---
    const handleExportExcel = async () => {
        if (!reportData || reportData.length === 0 || isExporting) {
            return; // Veri yoksa veya zaten dışa aktarılıyorsa işlem yapma
        }
        setIsExporting(true);

        try {
            // const workbook = new ExcelJS.Workbook(); // Unused
            // console.log("Workbook created successfully."); // Placeholder for actual export logic
        } catch (err: unknown) { // Keep unknown for now, will refine if error occurs
            console.error("Excel export error (workbook creation):", err);
            let message = 'Error creating Excel workbook.';
            if (err instanceof Error) {
                message = err.message || message;
            }
            setError(message);
        } finally {
            setIsExporting(false);
        }
    };

    // --- Render ---
    // Helper to get display value for Supplier Button (Refined Logic)
    const getSupplierButtonLabel = useMemo(() => {
        // Tedarikçiler yükleniyorsa
        if (isLoadingSuppliers) {
            return "Tedarikçiler Yükleniyor...";
        }
        // Tedarikçi seçilmişse VE liste yüklendiyse
        if (selectedSupplierId && suppliers.length > 0) {
            const selectedSupplier = suppliers.find((supplier: Supplier) => supplier.id === selectedSupplierId);
            // Tedarikçi listede bulunduysa ismini döndür
            if (selectedSupplier) {
                return selectedSupplier.name;
            } else {
                // ID seçili ama listede yok (URL'den geçersiz ID gelmiş olabilir)
                console.warn(`Seçilen Tedarikçi ID (${selectedSupplierId}) listede bulunamadı.`);
                // Kullanıcıya seçim yapmasını belirtmek için varsayılana dön
                return "Tedarikçi Seçin...";
            }
        }
        // Henüz tedarikçi seçilmemişse veya liste boşsa
        return "Tedarikçi Seçin...";
    // Bağımlılıklar: selectedSupplierId veya suppliers değiştiğinde etiket yeniden hesaplanır
    }, [selectedSupplierId, suppliers, isLoadingSuppliers]);

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-2xl font-semibold mb-4">Cari Hesap Raporları</h1>

            {/* Filters Section */} 
            <div className="flex flex-wrap items-end gap-4 mb-6 p-4 border rounded-lg bg-card">
                {/* Date Range Picker */} 
                <div className="space-y-2">
                     <label className="text-sm font-medium">Tarih Aralığı</label>
                     <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                         <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-[260px] justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "dd LLL, y", { locale: tr })} -{" "}
                                            {format(dateRange.to, "dd LLL, y", { locale: tr })}
                                        </>
                                    ) : (
                                        format(dateRange.from, "dd LLL, y", { locale: tr })
                                    )
                                ) : (
                                    <span>Tarih aralığı seçin</span>
                                )}
                             </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={handleDateSelect}
                                numberOfMonths={2}
                                locale={tr}
                             />
                         </PopoverContent>
                     </Popover>
                </div>

                {/* Supplier Select */} 
                <div className="space-y-2">
                     <label className="text-sm font-medium">Tedarikçi *</label>
                     <Popover open={isSupplierPopoverOpen} onOpenChange={setIsSupplierPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isSupplierPopoverOpen}
                                className="w-[260px] justify-between"
                                disabled={isLoadingSuppliers}
                            >
                                <span className="truncate">{getSupplierButtonLabel}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[260px] p-0">
                            <Command>
                                <CommandInput placeholder="Tedarikçi ara..." />
                                <CommandList>
                                    {isLoadingSuppliers ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">Yükleniyor...</div>
                                    ) : suppliers.length === 0 ? (
                                        <CommandEmpty>Tedarikçi bulunamadı.</CommandEmpty>
                                    ) : (
                                        <CommandGroup>
                                            {suppliers.map((supplier: Supplier) => (
                                                <CommandItem
                                                    key={supplier.id}
                                                    value={supplier.name}
                                                    onSelect={() => {
                                                        setSelectedSupplierId(supplier.id);
                                                        setIsSupplierPopoverOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedSupplierId === supplier.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {supplier.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                     </Popover>
                </div>

                {/* Action Buttons */}
                <div className="flex items-end gap-2"> {/* Butonları yan yana getirmek için div */}
                    <Button onClick={handleShowReport} disabled={loading || isLoadingSuppliers || !selectedSupplierId || !dateRange?.from || !dateRange?.to}>
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</> : <><Search className="mr-2 h-4 w-4" /> Cari Hesap Ekstresini Göster</>}
                    </Button>

                    {/* Excel Export Button */}
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={isExporting || !reportData || reportData.length === 0}
                        title="Excel'e Aktar"
                    >
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Error Display */} 
             {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Hata</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Report Table (Placeholder) */} 
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                             <TableHead>Tarih</TableHead>
                             <TableHead>Masraf/Fatura No</TableHead>
                             <TableHead>Açıklama</TableHead>
                             <TableHead className="text-right">Borç</TableHead>
                             <TableHead className="text-right">Alacak</TableHead>
                             <TableHead className="text-right">Bakiye</TableHead>
                         </TableRow>
                     </TableHeader>
                     <TableBody className="bg-white divide-y divide-gray-200">
                         {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                     <p>Rapor yükleniyor...</p>
                                </TableCell>
                            </TableRow>
                         ) : reportData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                     Seçili kriterlere uygun kayıt bulunamadı veya henüz rapor oluşturulmadı.
                                </TableCell>
                            </TableRow>
                         ) : (
                            reportData.map((row: ReportRow, index: number) => (
                                 <TableRow key={index} className="hover:bg-gray-50">
                                     <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{row.date}</TableCell>
                                     <TableCell>
                                        {/* Clickable span to open modal */}
                                        <span
                                            className="text-blue-600 hover:underline cursor-pointer"
                                            onClick={() => handleShowDetailsClick(row.expenseId)}
                                        >
                                            {row.documentNumber}
                                        </span>
                                     </TableCell>
                                     <TableCell className="max-w-[300px] truncate" title={row.description}>{row.description || '-'}</TableCell>
                                     <TableCell className="text-right">{formatCurrency(row.debit)}</TableCell>
                                     <TableCell className="text-right">{formatCurrency(row.credit)}</TableCell>
                                     <TableCell className="text-right font-medium">
                                        {formatCurrency(row.balance)} {row.balanceType === 'A' ? '(A)' : '(B)'}
                                     </TableCell>
                                 </TableRow>
                            ))
                         )}
                     </TableBody>
                 </Table>
            </div>

            {/* Expense Detail Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Masraf Detayları (Fiş No: {expenseDetails.length > 0 ? reportData.find((r: ReportRow) => r.expenseId === selectedExpenseId)?.documentNumber : '-'})</DialogTitle>
                        <DialogDescription>
                            Seçilen masraf kaydına ait detaylar aşağıdadır.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoadingDetails ? (
                            <p>Detaylar yükleniyor...</p>
                        ) : detailError ? (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Hata</AlertTitle>
                                <AlertDescription>{detailError}</AlertDescription>
                            </Alert>
                        ) : expenseDetails.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Detay Tarihi</TableHead>
                                        <TableHead>Fiş No</TableHead>
                                        <TableHead>Masraf Türü</TableHead>
                                        <TableHead>Açıklama</TableHead>
                                        <TableHead className="text-right">Tutar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenseDetails.map((detail: ExpenseDetail) => (
                                        <TableRow key={detail.id}>
                                            <TableCell>{detail.detail_date ? format(parseISO(detail.detail_date), 'dd.MM.yyyy') : '-'}</TableCell>
                                            <TableCell>{detail.receipt_no || '-'}</TableCell>
                                            <TableCell>{detail.expense_types?.name || 'Bilinmeyen Tür'}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={detail.detail_description || ''}>{detail.detail_description || '-'}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(detail.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p>Bu masraf için detay bulunamadı.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Kapat
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// This is the main page component that wraps ReportContent with Suspense
export default function CurrentAccountReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen w-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-3 text-xl font-semibold text-gray-700">Rapor Sayfası Yükleniyor...</p></div>}>
      <ReportContent />
    </Suspense>
  );
} 