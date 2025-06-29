'use client';

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, Filter, Eye, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Yardımcı Fonksiyon: Para Formatlama
const formatCurrency = (value: number | null | undefined): string => {
	if (value === null || value === undefined || isNaN(value)) return '-';
	return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

// Arayüzler
interface ExpenseType {
    id: number;
    name: string;
    parent_id: number | null;
}

interface ReportDataRow {
    id: number;
    name: string;
    totalAmount: number;
    isParent: boolean;
    children: ReportDataRow[]; // Alt türler için
}

// Modal detayları için arayüz
interface ExpenseDetail {
    id: number;
    created_at: string; // Veya detail_date kullanılıyorsa o
    detail_description: string | null;
    receipt_no: string | null;
    amount: number;
}

export default function ExpenseTypeReportPage() {
    const [reportData, setReportData] = useState<ReportDataRow[]>([]);
    const [allExpenseTypes, setAllExpenseTypes] = useState<ExpenseType[]>([]);
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state'leri
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalData, setModalData] = useState<ExpenseDetail[]>([]);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Fetch All Expense Types
    const fetchExpenseTypes = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('expense_types')
                .select('id, name, parent_id')
                .order('name'); // veya parent_id, name

            if (error) throw error;
            setAllExpenseTypes(data || []);
        } catch (err: unknown) {
            console.error('Masraf türleri çekilirken hata:', err);
            if (err instanceof Error) {
                setError(err.message || 'Masraf türleri yüklenemedi.');
            } else {
                setError('Masraf türleri yüklenirken bilinmeyen bir hata oluştu.');
            }
            setAllExpenseTypes([]);
        }
    }, []);

    // Fetch and Process Report Data
    const fetchReportData = useCallback(async (currentDateRange: { from: Date | undefined; to: Date | undefined }) => {
        if (allExpenseTypes.length === 0) {
             // Masraf türleri henüz yüklenmediyse bekle
             // veya fetchExpenseTypes'i burada tetikle? Şimdilik bekleyelim.
             console.log("Masraf türleri bekleniyor...");
             // setIsLoading(true); // Zaten true olabilir
             return;
        }
        setIsLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('expense_details')
                .select('expense_type_id, amount')
                .not('expense_type_id', 'is', null);

            if (currentDateRange.from) {
                query = query.gte('created_at', format(currentDateRange.from, 'yyyy-MM-dd'));
            }
            if (currentDateRange.to) {
                const toDate = new Date(currentDateRange.to);
                toDate.setHours(23, 59, 59, 999);
                query = query.lte('created_at', toDate.toISOString());
            }

            const { data: expensesData, error: expensesError } = await query;

            if (expensesError) throw expensesError;

            // Client-side Aggregation and Grouping
            const aggregatedTotals: { [key: number]: number } = {};
            (expensesData || []).forEach(expense => {
                if (expense.expense_type_id && expense.amount !== null) {
                     aggregatedTotals[expense.expense_type_id] = (aggregatedTotals[expense.expense_type_id] || 0) + expense.amount;
                }
            });

            // Build Hierarchical Structure
            const expenseTypeMap = new Map(allExpenseTypes.map(et => [et.id, { ...et, children: [] as ReportDataRow[], totalAmount: aggregatedTotals[et.id] || 0 }]));
            const hierarchy: ReportDataRow[] = [];

            expenseTypeMap.forEach(item => {
                // Kümülatif toplamı burada hesaplamaya gerek yok, aşağıda yapacağız.
                // item.cumulativeTotal = item.totalAmount;

                if (item.parent_id && expenseTypeMap.has(item.parent_id)) {
                    const parent = expenseTypeMap.get(item.parent_id)!;
                     // Çocukları parent'ın children dizisine ekle
                    parent.children.push({
                        id: item.id,
                        name: item.name,
                        totalAmount: item.totalAmount, // Sadece bu alt türün toplamı
                        isParent: false,
                        children: []
                    });
                } else {
                    // Ana türleri hierarchy dizisine ekle
                     hierarchy.push({
                         id: item.id,
                         name: item.name,
                         // Başlangıçta sadece kendi direkt toplamını ata, sonra güncellenecek
                         totalAmount: item.totalAmount,
                         isParent: true,
                         // Çocukları referans olarak ata (map'teki güncellenmiş children dizisi)
                         children: item.children
                     });
                }
            });

            // Ana türlerin kümülatif toplamlarını hesapla
            hierarchy.forEach(parent => {
                if (parent.isParent) {
                    // Kendi direkt toplamı + tüm çocuklarının toplamı
                    parent.totalAmount = parent.children.reduce((sum, child) => sum + child.totalAmount, parent.totalAmount);
                }
            });

            // Ana türleri ve alt türleri olmayanları filtrele (opsiyonel, gerekirse)
            // const finalReportData = hierarchy.filter(item => item.isParent && (item.totalAmount > 0 || item.children.length > 0));
            // Şimdilik tüm ana türleri gösterelim
            setReportData(hierarchy);

        } catch (err: unknown) {
            console.error('Rapor verileri çekilirken/işlenirken hata:', err);
            let message = 'Rapor verileri yüklenirken bilinmeyen bir hata oluştu.';
            if (err instanceof Error) {
                message = err.message || message;
            }
            setError(message);
            setReportData([]);
        } finally {
            setIsLoading(false);
        }
    }, [allExpenseTypes]); // allExpenseTypes bağımlılığı eklendi

    // Fetch Modal Details
    const fetchModalDetails = useCallback(async (expenseTypeId: number, currentDateRange: { from: Date | undefined; to: Date | undefined }) => {
        if (!expenseTypeId) return;

        setIsModalLoading(true);
        setModalError(null);
        setModalData([]);

        // İlgili masraf türü nesnesini bul
        const selectedType = allExpenseTypes.find(et => et.id === expenseTypeId);
        if (!selectedType) {
            setModalError("Masraf türü bilgisi bulunamadı.");
            setIsModalLoading(false);
            return;
        }

        setModalTitle(selectedType.name); // Modal başlığını ayarla

        // Ana tür ise alt türlerin ID'lerini de al
        let targetTypeIds = [expenseTypeId];
        if (selectedType.parent_id === null) { // Basit kontrol: parent_id'si null olanlar ana türdür varsayımı
            const childrenIds = allExpenseTypes
                .filter(et => et.parent_id === expenseTypeId)
                .map(et => et.id);
            targetTypeIds = [...targetTypeIds, ...childrenIds];
        }

        try {
            let query = supabase
                .from('expense_details')
                .select('id, created_at, detail_description, receipt_no, amount') // Gerekli detay sütunları
                .in('expense_type_id', targetTypeIds) // Ana tür ve varsa alt türler
                .order('created_at', { ascending: false }); // Tarihe göre sırala

            if (currentDateRange.from) {
                query = query.gte('created_at', format(currentDateRange.from, 'yyyy-MM-dd'));
            }
            if (currentDateRange.to) {
                const toDate = new Date(currentDateRange.to);
                toDate.setHours(23, 59, 59, 999);
                query = query.lte('created_at', toDate.toISOString());
            }

            const { data, error: detailsError } = await query;

            if (detailsError) throw detailsError;

            setModalData(data || []);

        } catch (err: unknown) {
            console.error('Modal detayları çekilirken hata:', err);
            let message = 'Detaylar yüklenirken bilinmeyen bir hata oluştu.';
            if (err instanceof Error) {
                message = err.message || message;
            }
            setModalError(message);
            setModalData([]);
        } finally {
            setIsModalLoading(false);
        }
    }, [allExpenseTypes]); // allExpenseTypes bağımlılığı eklendi

    // Initial fetch for expense types
    useEffect(() => {
        fetchExpenseTypes();
    }, [fetchExpenseTypes]);

    // Fetch report data when expense types are loaded or date range changes
    useEffect(() => {
        if (allExpenseTypes.length > 0) {
            fetchReportData(dateRange);
        }
    }, [dateRange, allExpenseTypes, fetchReportData]); // fetchReportData eklendi

    // Handle Date Filter Change
    const handleDateChange = (field: 'from' | 'to', date: Date | undefined) => {
        setDateRange(prev => ({ ...prev, [field]: date }));
    };

    // Handle Icon Click
    const handleIconClick = useCallback((expenseTypeId: number) => {
        setIsModalOpen(true);
        fetchModalDetails(expenseTypeId, dateRange); // Seçili tarih aralığı ile detayları getir
    }, [fetchModalDetails, dateRange]); // dateRange bağımlılığı eklendi

    // Render Report Rows Recursively
    const renderReportRows = (rows: ReportDataRow[], isChild = false) => {
        return rows.map((row, index) => (
            <Fragment key={row.id}>
                <div className={cn(
                    "flex justify-between items-center py-2 pl-2 pr-2 border-t", // Sol padding (pl-2) eklendi
                    row.isParent ? 'bg-gray-100 dark:bg-gray-800 font-semibold' : 'ml-8 dark:bg-gray-850', // Child için pl-3 kaldırıldı, ikon için yer açıldı
                    index === 0 && !isChild && "border-t-0"
                )}>
                    <div className="flex items-center flex-grow min-w-0"> {/* flex-grow ve min-w-0 eklendi */}
                        {/* Göz İkonu Butonu */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 mr-2 flex-shrink-0" // Boyut küçültüldü, sağ margin eklendi, shrink engellendi
                            onClick={() => handleIconClick(row.id)}
                            aria-label={`${row.name} detaylarını gör`}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        <span className="truncate" title={row.name}>{row.name}</span> {/* title eklendi */}
                    </div>
                    <span className="text-right whitespace-nowrap ml-2 flex-shrink-0">{formatCurrency(row.totalAmount)}</span> {/* Sol margin ve shrink engellendi */}
                </div>
                {/* Render children recursively */}
                {row.isParent && row.children.length > 0 && (
                    renderReportRows(row.children, true)
                )}
            </Fragment>
        ));
    };

    // Calculate Grand Total
    const grandTotal = useMemo(() => {
        return reportData.reduce((sum, row) => sum + row.totalAmount, 0);
    }, [reportData]);

    // Calculate Modal Total
    const modalTotal = useMemo(() => {
        if (isModalLoading || modalError || !modalData) return 0;
        return modalData.reduce((sum, detail) => sum + (detail.amount || 0), 0);
    }, [modalData, isModalLoading, modalError]);

    return (
        <div className="container mx-auto p-4">
             <h1 className="text-2xl font-semibold mb-4">Masraf Türü Raporu</h1>

            {/* Filter Area */}
			<div className="flex flex-wrap items-center gap-2 mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
				<Filter className="h-5 w-5 text-gray-500" />
				<span className="font-semibold text-gray-700 dark:text-gray-300 mr-2">Filtrele:</span>

				{/* Date Range */}
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant={"outline"}
							className={cn("w-[180px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : <span>Başlangıç Tarihi</span>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0">
						<Calendar mode="single" selected={dateRange.from} onSelect={(date) => handleDateChange('from', date)} initialFocus />
					</PopoverContent>
				</Popover>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant={"outline"}
							className={cn("w-[180px] justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : <span>Bitiş Tarihi</span>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0">
						<Calendar mode="single" selected={dateRange.to} onSelect={(date) => handleDateChange('to', date)} initialFocus />
					</PopoverContent>
				</Popover>
                {/* TODO: Filtreleri Temizle Butonu eklenebilir */}
			</div>

            {/* Error State */}
			{error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
             )}

            {/* Loading State */}
            {isLoading && (
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-5 w-full" />
                         <Skeleton className="h-5 w-11/12 ml-4" />
                         <Skeleton className="h-5 w-11/12 ml-4" />
                         <Skeleton className="h-5 w-full" />
                         <Skeleton className="h-5 w-11/12 ml-4" />
                    </CardContent>
                 </Card>
             )}

            {/* Report Display */}
            {!isLoading && !error && (
                <Card className="overflow-hidden"> {/* overflow-hidden eklendi */}
                    <CardHeader>
                        <CardTitle>Masraf Dağılımı</CardTitle>
                        {dateRange.from && dateRange.to && (
                            <p className="text-sm text-muted-foreground pt-1">
                                {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                            </p>
                        )}
                    </CardHeader>
                    {/* CardContent'dan padding kaldırıldı, satırlara eklendi */}
                    <CardContent className="p-0">
                        {reportData.length > 0 ? (
                           renderReportRows(reportData)
                        ) : (
                            <p className="text-center text-muted-foreground p-6"> {/* Padding artırıldı */}
                                Seçili kriterlere uygun masraf kaydı bulunamadı.
                            </p>
                        )}
                    </CardContent>
                    {/* Genel Toplam Footer'ı eklendi */}
                    {reportData.length > 0 && (
                         <CardFooter className="bg-gray-100 dark:bg-gray-800 py-3 px-4 border-t">
                            <div className="flex justify-between items-center w-full font-bold text-lg">
                                <span>Genel Toplam</span>
                                <span>{formatCurrency(grandTotal)}</span>
                            </div>
                         </CardFooter>
                     )}
                </Card>
            )}

            {/* Detail Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{modalTitle ? `${modalTitle} - Masraf Detayları` : "Masraf Detayları"}</DialogTitle>
                        {dateRange.from && dateRange.to && (
                            <DialogDescription>
                                Tarih Aralığı: {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                        {isModalLoading && (
                             <div className="flex justify-center items-center py-10">
                                 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                             </div>
                         )}
                        {modalError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Hata!</AlertTitle>
                                <AlertDescription>{modalError}</AlertDescription>
                            </Alert>
                        )}
                        {!isModalLoading && !modalError && (
                            modalData.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tarih</TableHead>
                                            <TableHead>Açıklama</TableHead>
                                            <TableHead>Fiş No</TableHead>
                                            <TableHead className="text-right">Tutar</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {modalData.map((detail) => (
                                            <TableRow key={detail.id}>
                                                <TableCell>{format(parseISO(detail.created_at), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>{detail.detail_description || '-'}</TableCell>
                                                <TableCell>{detail.receipt_no || '-'}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(detail.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter className="bg-gray-50 dark:bg-gray-850 sticky bottom-0">
                                        <TableRow>
                                            <TableCell colSpan={3} className="font-semibold text-lg text-right pr-2">
                                                {modalTitle ? `${modalTitle} Toplamı:` : 'Toplam Tutar:'}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-lg">
                                                {formatCurrency(modalTotal)}
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            ) : (
                                <p className="text-center text-muted-foreground py-6">Bu masraf türü için seçili tarih aralığında detay bulunamadı.</p>
                            )
                        )}
                    </div>
                    <DialogFooter className="pt-4 border-t sm:justify-end">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Kapat</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}