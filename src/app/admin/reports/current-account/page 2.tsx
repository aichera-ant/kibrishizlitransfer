'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
import { format, parseISO } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
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

// --- Types --- Interfaces ---
// interface Supplier {
//     id: string;
//     name: string;
// }

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

// Type for raw data from Supabase query before processing expense_types
type RawExpenseDetailData = Omit<ExpenseDetail, 'expense_types'> & {
    expense_types: { name: string | null } | { name: string | null }[] | null;
};

// Helper Function for Currency Formatting
const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '-'; // Return '-' for invalid values
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

// --- Component Content ---
function CurrentAccountReportContent() {
    const searchParams = useSearchParams();
    const supplierId = searchParams.get('supplierId');
    const fromDateStr = searchParams.get('from');
    const toDateStr = searchParams.get('to');

    // --- States ---
    const [supplierName, setSupplierName] = useState<string>('');
    const [reportData, setReportData] = useState<ReportRow[]>([])
    const [isLoadingReport, setIsLoadingReport] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    // State for Expense Detail Modal
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(null);
    const [expenseDetails, setExpenseDetails] = useState<ExpenseDetail[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    // --- Data Fetching (triggered by URL params) ---
    const fetchReportData = useCallback(async () => {
        if (!supplierId || !fromDateStr || !toDateStr) {
            setError('URL parametreleri eksik veya geçersiz (supplierId, from, to).');
            setReportData([]);
            setSupplierName('');
            setIsLoadingReport(false);
            return;
        }

        setIsLoadingReport(true);
        setError(null);
        setReportData([]);
        setSupplierName(''); // Reset supplier name

        try {
             // Fetch supplier name
            const { data: supplierData, error: supplierError } = await supabase
                .from('suppliers')
                .select('name')
                .eq('id', supplierId)
                .single();

            if (supplierError) {
                console.error("Error fetching supplier name:", supplierError);
                // Continue without name or throw error?
                // setError("Tedarikçi adı alınamadı.");
            }
            setSupplierName(supplierData?.name || `ID: ${supplierId}`);

            // Fetch expenses
            const { data: expenses, error: expensesError } = await supabase
                .from('expenses_list')
                .select<string, Expense>('created_at, id, description, total_amount, expense_no')
                .eq('supplier_id', supplierId)
                .gte('entry_date', fromDateStr) // Use entry_date here as well
                .lte('entry_date', toDateStr)
                .order('entry_date', { ascending: true }); // Order by entry_date

            if (expensesError) throw expensesError;

            if (!expenses) {
                setReportData([]);
                setIsLoadingReport(false);
                return;
            }

            let balance = 0;
            const formattedReportData: ReportRow[] = expenses.map((expense: Expense) => {
                const debit = 0; 
                const credit = expense.total_amount > 0 ? expense.total_amount : 0;
                balance += debit - credit; 
                const balanceType = balance < 0 ? 'A' : 'B'; 
                return {
                    date: format(parseISO(expense.created_at), 'dd/MM/yyyy'), // Use parseISO for string dates
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
            let message = 'Bilinmeyen bir hata oluştu';
            if (err instanceof Error) {
                message = err.message;
            }
            setError(`Rapor alınırken hata oluştu: ${message}`);
            console.error("Error fetching report data:", err);
        } finally {
            setIsLoadingReport(false);
        }
    }, [supplierId, fromDateStr, toDateStr]);

    useEffect(() => {
        // Fetch data when URL parameters are available
        fetchReportData();
    }, [fetchReportData]);
    
    // --- Event Handlers ---
    const handleShowDetailsClick = (expenseId: number) => {
        setSelectedExpenseId(expenseId);
        setExpenseDetails([]); // Clear previous details
        setDetailError(null); // Clear previous error
        setIsLoadingDetails(true);
        setIsDetailModalOpen(true);
    };

    // Fetch expense details when modal opens and selectedExpenseId is set
    useEffect(() => {
        const fetchDetails = async () => {
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
                        expense_types ( name )
                    `)
                    .eq('expense_list_id', selectedExpenseId);

                if (error) {
                    throw error;
                }
                
                const processedData: ExpenseDetail[] = (data || []).map((item: RawExpenseDetailData) => ({
                    ...item,
                    expense_types: Array.isArray(item.expense_types) ? item.expense_types[0] ?? null : item.expense_types,
                }));

                setExpenseDetails(processedData);
            } catch (err: unknown) {
                console.error("Error fetching expense details:", err);
                // We can check err type if needed, but for now, a generic message is fine.
                setDetailError("Masraf detayları yüklenemedi.");
            } finally {
                setIsLoadingDetails(false);
            }
        };

        if (isDetailModalOpen && selectedExpenseId) {
            fetchDetails();
        }
    }, [selectedExpenseId, isDetailModalOpen]);

    // --- Render ---
    return (
        <div className="p-4 md:p-6">
             {/* Updated Title to include supplier name and date range */}
             <h1 className="text-2xl font-semibold mb-1">Cari Hesap Ekstresi</h1>
             {supplierName && (
                 <h2 className="text-lg text-muted-foreground mb-4">
                     {supplierName} ({fromDateStr && format(parseISO(fromDateStr), 'dd.MM.yyyy')} -
                     {toDateStr && format(parseISO(toDateStr), 'dd.MM.yyyy')})
                 </h2>
             )}

            {/* Error Display */} 
             {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Hata</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Report Table */} 
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
                     <TableBody>
                         {isLoadingReport ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <p>Rapor yükleniyor...</p>
                                    {/* Add Skeleton rows if preferred */}
                                    {/* Example:
                                    Array.from({ length: 5 }).map((_, i) => (
                                         <TableRow key={i}>
                                             <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                             <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                                             <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                                             <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                             <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                             <TableCell className="text-right"><Skeleton className="h-4 w-[100px]" /></TableCell>
                                         </TableRow>
                                     ))
                                    */}
                                </TableCell>
                            </TableRow>
                         ) : reportData.length === 0 && !error ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                     Bu tedarikçi için seçili tarih aralığında kayıt bulunamadı.
                                </TableCell>
                            </TableRow>
                         ) : (
                            reportData.map((row) => (
                                 <TableRow key={row.expenseId}>
                                     <TableCell>{row.date}</TableCell>
                                     <TableCell>
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

            {/* Expense Detail Modal (Keep as is) */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>Masraf Detayları (No: {reportData.find(r => r.expenseId === selectedExpenseId)?.documentNumber})</DialogTitle>
                        <DialogDescription>
                            Bu masrafın detay kalemleri aşağıdadır.
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
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Fiş No</TableHead>
                                        <TableHead>Tür</TableHead>
                                        <TableHead>Açıklama</TableHead>
                                        <TableHead className="text-right">Tutar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenseDetails.map((detail) => (
                                        <TableRow key={detail.id}>
                                            <TableCell>
                                                {detail.detail_date ? format(parseISO(detail.detail_date), 'dd/MM/yyyy') : '-'} 
                                            </TableCell>
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

// --- Main Component Wrapper for Suspense ---
export default function CurrentAccountReportPage() {
    // Wrap the main content in Suspense to handle useSearchParams
    return (
        <Suspense fallback={<div>Parametreler yükleniyor...</div>}>
            <CurrentAccountReportContent />
        </Suspense>
    );
} 