'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
import { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import { Calendar as CalendarIcon, Search, AlertTriangle, FileText } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from 'next/link'

// --- Types --- Interfaces ---
interface Supplier {
    id: string;
    name: string;
}

interface SupplierBalance {
    supplierId: string;
    supplierName: string;
    balance: number; // Consider if this is closing balance or net change
    // Add debit/credit totals for the period if needed
    totalDebit: number;
    totalCredit: number;
}

// Helper Function for Currency Formatting
const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

// --- Component ---
export default function CurrentAccountListPage() {
    // --- States ---
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const today = new Date();
        const startDate = new Date(2025, 0, 1); // January is month 0
        if (startDate > today) {
            return { from: today, to: today }; 
        }
        return { from: startDate, to: today };
    });
    const [reportData, setReportData] = useState<SupplierBalance[]>([])
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true)
    const [isLoadingReport, setIsLoadingReport] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

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

    // --- Report Logic ---
    const fetchAndSetReportData = useCallback(async (currentDateRange: DateRange | undefined) => {
        if (!currentDateRange?.from || !currentDateRange?.to) {
            setError('Geçerli bir tarih aralığı gerekli.');
            setReportData([]);
            setIsLoadingReport(false);
            return;
        }
        if (isLoadingSuppliers) {
            console.log("Waiting for suppliers to load...");
            return;
        }

        setIsLoadingReport(true);
        setError(null);
        setReportData([]);
        console.log(`Fetching report data for range: ${format(currentDateRange.from, 'yyyy-MM-dd')} to ${format(currentDateRange.to, 'yyyy-MM-dd')}`);

        try {
            const { data: expenses, error: expensesError } = await supabase
                .from('expenses_list')
                .select('supplier_id, total_amount')
                .gte('entry_date', format(currentDateRange.from, 'yyyy-MM-dd'))
                .lte('entry_date', format(currentDateRange.to, 'yyyy-MM-dd'));
                
            if (expensesError) throw expensesError;
            console.log("Fetched expenses:", expenses);

            const supplierBalances: Record<string, { totalDebit: number; totalCredit: number }> = {};
            suppliers.forEach(supplier => {
                supplierBalances[supplier.id] = { totalDebit: 0, totalCredit: 0 };
            });

            if (expenses && expenses.length > 0) {
                 expenses.forEach(expense => {
                    if (expense.supplier_id && supplierBalances[expense.supplier_id]) {
                        supplierBalances[expense.supplier_id].totalCredit += expense.total_amount || 0;
                    }
                 });
            }
            
            const formattedData: SupplierBalance[] = suppliers.map(supplier => {
                 const balanceData = supplierBalances[supplier.id];
                 const balance = balanceData.totalDebit - balanceData.totalCredit; 
                return {
                    supplierId: supplier.id,
                    supplierName: supplier.name,
                    balance: balance,
                    totalDebit: balanceData.totalDebit,
                    totalCredit: balanceData.totalCredit,
                };
            }).filter(item => item.totalDebit !== 0 || item.totalCredit !== 0); 

            console.log("Formatted data:", formattedData);
            setReportData(formattedData);

        } catch (err: unknown) {
            let message = 'Liste oluşturulurken bilinmeyen bir hata oluştu.';
            if (err instanceof Error) {
                message = err.message || message;
            }
            setError(`Liste oluşturulurken hata oluştu: ${message}`);
            console.error("Error generating supplier list:", err);
        } finally {
            setIsLoadingReport(false);
        }
    }, [suppliers, isLoadingSuppliers]); 

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    useEffect(() => {
        if (!isLoadingSuppliers && suppliers.length > 0 && dateRange?.from && dateRange?.to) {
            fetchAndSetReportData(dateRange);
        }
    }, [isLoadingSuppliers, suppliers, dateRange, fetchAndSetReportData]); 

    // --- Event Handlers ---
    const handleDateSelect = (selectedRange: DateRange | undefined) => {
        setDateRange(selectedRange);
        if (selectedRange?.from && selectedRange?.to) {
            setIsDatePopoverOpen(false);
        }
    };

    const handleFilterButtonClick = () => {
        fetchAndSetReportData(dateRange);
    };

    // --- Render ---
    return (
        <div className="p-4 md:p-6">
            <h1 className="text-2xl font-semibold mb-4">Cari Hesap Listesi</h1>

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

                {/* Action Button */} 
                <Button onClick={handleFilterButtonClick} disabled={isLoadingReport || !dateRange?.from || !dateRange?.to}>
                    <Search className="mr-2 h-4 w-4" />
                    {isLoadingReport ? "Yükleniyor..." : "Filtrele"}
                </Button>
            </div>

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
                             <TableHead>Cari Hesap Adı</TableHead>
                             <TableHead className="text-right">Dönem Borç</TableHead>
                             <TableHead className="text-right">Dönem Alacak</TableHead>
                             <TableHead className="text-right">Dönem Bakiye</TableHead>
                             <TableHead className="text-right">İşlemler</TableHead>
                         </TableRow>
                     </TableHeader>
                     <TableBody>
                         {isLoadingReport ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                     <Skeleton className="h-4 w-1/2 mx-auto" />
                                </TableCell>
                            </TableRow>
                         ) : reportData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                     Lütfen tarih aralığı seçip {" "}
                                     <span className="font-semibold">Filtrele</span>{" "}
                                     butonuna basın veya seçili aralıkta hareket bulunamadı.
                                </TableCell>
                            </TableRow>
                         ) : (
                            reportData.map((row) => (
                                 <TableRow key={row.supplierId}>
                                     <TableCell className="font-medium">{row.supplierName}</TableCell>
                                     <TableCell className="text-right">{formatCurrency(row.totalDebit)}</TableCell>
                                     <TableCell className="text-right">{formatCurrency(row.totalCredit)}</TableCell>
                                     <TableCell className="text-right font-semibold">{formatCurrency(row.balance)}</TableCell>
                                     <TableCell className="text-right">
                                         <Link 
                                            href={{
                                                pathname: '/admin/reports/current-account',
                                                query: { 
                                                    supplierId: row.supplierId,
                                                    from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
                                                    to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
                                                }
                                            }}
                                            passHref
                                            legacyBehavior
                                        >
                                             <Button variant="outline" size="sm">
                                                 <FileText className="mr-2 h-4 w-4" />
                                                 Ekstreyi Gör
                                             </Button>
                                         </Link>
                                     </TableCell>
                                 </TableRow>
                            ))
                         )}
                     </TableBody>
                 </Table>
            </div>
        </div>
    );
} 