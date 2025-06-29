'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Supabase import
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { debounce } from 'lodash';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils'; // cn import edildi
import PaginationControls from '@/components/PaginationControls'; 
import { Skeleton } from '@/components/ui/skeleton'; // Skeleton eklendi

// Updated formatCurrency to accept only number | null | undefined
const formatCurrency = (value: number | null | undefined): string => {
	 if (value === null || value === undefined || isNaN(value)) return '-';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

interface ReportItem {
	id: number;
	reservation_time: string;
	code: string; // Rezervasyon No
	supplier_name: string | null; // Added supplier name from relation
	total_price: number; // Satış Tutarı
	cost: number; // Maliyet (supplier_cost'tan gelecek)
	profit: number; // Kâr/Zarar (Calculated)
	supplier_cost: number | null; // Supabase'den gelen ham veri
	// currency might not be needed if always TRY
}

// Type for raw data from Supabase for financial report
type RawFinancialData = Omit<ReportItem, 'supplier_name' | 'cost' | 'profit'> & {
	suppliers: { name: string | null } | null;
	// total_price and supplier_cost are part of ReportItem, item will have them.
};

interface Supplier {
	id: number;
	name: string;
}

// Using a simpler pagination state for Supabase
interface PaginationState {
	currentPage: number;
	itemsPerPage: number;
	totalItems: number | null;
}

export default function FinancialReportsPage() {
	const [reportData, setReportData] = useState<ReportItem[]>([]);
	const [suppliers, setSuppliers] = useState<Supplier[]>([]);
	const [pagination, setPagination] = useState<PaginationState>({ currentPage: 1, itemsPerPage: 15, totalItems: null }); // Default page size 15
	const [filters, setFilters] = useState<{ date_from: Date | undefined; date_to: Date | undefined; supplier_id: string }>({ date_from: undefined, date_to: undefined, supplier_id: 'all' });
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch Suppliers from Supabase
	const fetchSuppliers = useCallback(async () => {
		try {
			const { data, error } = await supabase
				.from('suppliers')
				.select('id, name')
				.order('name');

			if (error) throw error;
			setSuppliers(data || []);
		} catch (err: unknown) {
			console.error('Tedarikçiler çekilirken hata:', err);
			if (err instanceof Error) {
				setError(err.message || 'Tedarikçi listesi yüklenemedi.');
			} else {
				setError('Tedarikçi listesi yüklenirken bilinmeyen bir hata oluştu.');
			}
		}
	}, [setSuppliers, setError]);

	useEffect(() => {
		fetchSuppliers();
	}, [fetchSuppliers]);

	// Fetch Report Data from Supabase
	const fetchReportData = useCallback(async (page = 1, currentFilters = filters) => {
		setIsLoading(true);
		setError(null);
		const itemsPerPage = pagination.itemsPerPage;
		const rangeFrom = (page - 1) * itemsPerPage;
		const rangeTo = rangeFrom + itemsPerPage - 1;

		try {
			let query = supabase
				.from('reservations')
				.select(`
					id,
					code,
					reservation_time,
					total_price,
					supplier_cost,
					supplier_id,
					suppliers ( name )
				`, { count: 'exact' }) // Get total count for pagination
				.order('reservation_time', { ascending: false }) // Order by reservation time
				.range(rangeFrom, rangeTo); // Apply pagination range

			if (currentFilters.date_from) {
				query = query.gte('reservation_time', format(currentFilters.date_from, 'yyyy-MM-dd'));
			}
			if (currentFilters.date_to) {
				// Add time to include the whole day
				const toDate = new Date(currentFilters.date_to);
				toDate.setHours(23, 59, 59, 999);
				query = query.lte('reservation_time', toDate.toISOString());
			}
			if (currentFilters.supplier_id && currentFilters.supplier_id !== 'all') {
				query = query.eq('supplier_id', parseInt(currentFilters.supplier_id, 10));
			}

			const { data, error, count } = await query;

			if (error) throw error;

			const formattedData: ReportItem[] = (data || []).map((item: RawFinancialData) => {
				const cost = item.supplier_cost || 0;
				const profit = (item.total_price || 0) - cost;
				return {
					id: item.id,
					reservation_time: item.reservation_time,
					code: item.code,
					supplier_name: item.suppliers?.name || '-',
					total_price: item.total_price || 0,
					cost: cost,
					profit: profit,
					supplier_cost: item.supplier_cost
				};
			});

			setReportData(formattedData);
			setPagination(prev => ({ ...prev, currentPage: page, totalItems: count }));
			
		} catch (err: unknown) {
			console.error('Rapor verileri çekilirken hata:', err);
			let message = 'Rapor verileri yüklenirken bilinmeyen bir hata oluştu.';
			if (err instanceof Error) {
				message = err.message || message;
			}
			setError(message);
			setReportData([]);
			setPagination(prev => ({ ...prev, totalItems: 0 }));
		} finally {
			setIsLoading(false);
		}
	}, [filters, pagination.itemsPerPage]);

	// Filtreler değiştiğinde veriyi çek (debounce ile)
	const debouncedFetchData = useCallback(debounce(fetchReportData, 500), [fetchReportData]);

	useEffect(() => {
		debouncedFetchData(1, filters);
		// Cleanup debounce on component unmount or when fetchReportData changes
		return () => debouncedFetchData.cancel();
	}, [filters, debouncedFetchData]);

	const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		// Reset to page 1 when filters change
		setPagination(prev => ({ ...prev, currentPage: 1 })); 
	};

	const handlePageChange = (newPage: number) => {
		setPagination(prev => ({ ...prev, currentPage: newPage }));
		fetchReportData(newPage, filters); // Fetch data for the new page
	};

	// Tedarikçi filtresi için kontrol eklendi
	const handleSupplierFilterChange = (value: string) => {
		handleFilterChange('supplier_id', value);
	};

	// Toplamları hesapla (useMemo ile optimize edildi)
	const totals = useMemo(() => {
		if (!reportData || reportData.length === 0) {
			return { totalSales: 0, totalCost: 0, totalProfit: 0 };
		}
		return reportData.reduce((acc, item) => {
			acc.totalSales += item.total_price || 0;
			acc.totalCost += item.cost || 0;
			acc.totalProfit += item.profit || 0;
			return acc;
		}, { totalSales: 0, totalCost: 0, totalProfit: 0 });
	}, [reportData]);

	return (
		<div>
			<h1 className="text-2xl font-semibold mb-4">Rezervasyon Kâr/Zarar Raporu</h1>

			{/* Filtreleme Alanı */}
			<div className="flex items-center space-x-2 mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
				<Filter className="h-5 w-5 text-gray-500" />
				<span className="font-semibold text-gray-700 dark:text-gray-300">Filtrele:</span>
				{/* Tarih Aralığı */}
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant={"outline"}
							className={cn(
								"w-[180px] justify-start text-left font-normal",
								!filters.date_from && "text-muted-foreground"
							)}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{filters.date_from ? format(filters.date_from, "dd/MM/yyyy") : <span>Başlangıç Tarihi</span>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0">
						<Calendar
							mode="single"
							selected={filters.date_from}
							onSelect={(date) => handleFilterChange('date_from', date)}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant={"outline"}
							className={cn(
								"w-[180px] justify-start text-left font-normal",
								!filters.date_to && "text-muted-foreground"
							)}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{filters.date_to ? format(filters.date_to, "dd/MM/yyyy") : <span>Bitiş Tarihi</span>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0">
						<Calendar
							mode="single"
							selected={filters.date_to}
							onSelect={(date) => handleFilterChange('date_to', date)}
							initialFocus
						/>
					</PopoverContent>
				</Popover>

				{/* Tedarikçi Seçimi */}
				<Select value={filters.supplier_id} onValueChange={handleSupplierFilterChange}>
					<SelectTrigger className="w-[200px]">
						<SelectValue placeholder="Tedarikçi Seçin" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tüm Tedarikçiler</SelectItem>
						{suppliers.map((supplier) => (
							<SelectItem key={supplier.id} value={supplier.id.toString()}>{supplier.name}</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Button onClick={() => setFilters({ date_from: undefined, date_to: undefined, supplier_id: 'all' })} variant="outline">Filtreleri Temizle</Button>
			</div>

			{/* Yüklenme Durumu */}
			{isLoading && <p>Rapor verileri yükleniyor...</p>}

			{/* Hata Durumu */}
			{error && <p className="text-red-500">{error}</p>}

			{/* Rapor Tablosu */}
			{!isLoading && !error && reportData.length > 0 && (
				<>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[120px]">Rez. Tarihi</TableHead>
								<TableHead>Rez. No</TableHead>
								<TableHead>Tedarikçi</TableHead>
								<TableHead className="text-right">Satış Tutarı</TableHead>
								<TableHead className="text-right">Maliyet</TableHead>
								<TableHead className="text-right">Kâr/Zarar</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								// Skeleton Loading Rows
								Array.from({ length: 5 }).map((_, i) => (
									<TableRow key={`skel-${i}`}>
										<TableCell><Skeleton className="h-4 w-full" /></TableCell>
										<TableCell><Skeleton className="h-4 w-full" /></TableCell>
										<TableCell><Skeleton className="h-4 w-full" /></TableCell>
										<TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
										<TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
										<TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
									</TableRow>
								))
							) : reportData.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="h-24 text-center">
										Kayıt bulunamadı.
									</TableCell>
								</TableRow>
							) : (
								reportData.map((item) => (
									<TableRow key={item.id}>
										<TableCell>
											{item.reservation_time ? format(parseISO(item.reservation_time), 'dd.MM.yyyy') : '-'}
										</TableCell>
										<TableCell>{item.code}</TableCell>
										<TableCell>{item.supplier_name || 'N/A'}</TableCell>
										<TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
										<TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
										<TableCell className={`text-right font-semibold ${item.profit < 0 ? 'text-red-600' : ''}`}>{formatCurrency(item.profit)}</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
						{/* Totals Footer */}
						{!isLoading && reportData.length > 0 && (
							<TableFooter>
								<TableRow>
									<TableCell colSpan={3} className="text-right font-bold">Toplamlar</TableCell>
									<TableCell className="text-right font-bold">{formatCurrency(totals.totalSales)}</TableCell>
									<TableCell className="text-right font-bold">{formatCurrency(totals.totalCost)}</TableCell>
									<TableCell className="text-right font-bold">{formatCurrency(totals.totalProfit)}</TableCell>
								</TableRow>
							</TableFooter>
						)}
					</Table>
					{/* Pagination Controls */}
					{!isLoading && pagination.totalItems !== null && pagination.totalItems > pagination.itemsPerPage && (
						(() => { // Calculate lastPage inside an IIFE to pass it
							const lastPage = Math.ceil(pagination.totalItems! / pagination.itemsPerPage);
							// Calculate 'from' and 'to' for the optional info text
							const fromItem = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
							const toItem = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems!);
							return (
								<PaginationControls
									currentPage={pagination.currentPage}
									lastPage={lastPage} // Pass calculated lastPage
									onPageChange={handlePageChange}
									// Optional props for info text:
									total={pagination.totalItems}
									perPage={pagination.itemsPerPage}
									from={fromItem}
									to={toItem}
								/>
							);
						})()
					)}
				</>
			)}

			{/* Veri Yok Durumu */}
			{!isLoading && suppliers.length > 0 && reportData.length === 0 && (
				<div className="text-center text-gray-500 mt-4 border rounded-lg p-10">
					Seçili filtrelere uygun rapor verisi bulunamadı.
				</div>
			)}

			{/* Tedarikçiler yüklenirken veya rapor yüklenirken farklı mesaj */}
			{(isLoading || suppliers.length === 0 && !error) && !reportData.length && (
				<div className="text-center text-gray-500 mt-4 border rounded-lg p-10">
					Veriler yükleniyor...
				</div>
			)}

		</div>
	);
} 