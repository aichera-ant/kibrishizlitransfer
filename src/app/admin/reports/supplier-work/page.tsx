'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { debounce } from 'lodash';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import PaginationControls from '@/components/PaginationControls';
import { Skeleton } from '@/components/ui/skeleton';

// Updated formatCurrency to accept only number | null | undefined
const formatCurrency = (value: number | null | undefined): string => {
	if (value === null || value === undefined || isNaN(value)) return '-';
	return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

// Yeni formatlama fonksiyonları
const formatDateOnly = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
        return format(parseISO(dateString), 'dd.MM.yyyy');
    } catch {
        console.error('Invalid date format (date only):', dateString);
        return '-';
    }
};

const formatTimeOnly = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
        return format(parseISO(dateString), 'HH:mm');
    } catch {
        console.error('Invalid date format (time only):', dateString);
        return '-';
    }
};

// Interface for raw data item from Supabase
interface RawReservationItem {
	id: number;
	code: string;
	created_at: string;
	reservation_time: string;
    customer_name: string | null;
	supplier_cost: number | null;
	supplier_id: number | null;
	suppliers: { name: string }[] | null;
	locations: { name: string }[] | null;
	dropoff_location: { name: string }[] | null;
}

// Interface for report items (güncellendi)
interface ReportItem {
	id: number;
	created_at: string;       // Kayıt Tarihi
	reservation_time: string; // Transfer Tarihi/Saati
	code: string;             // Rezervasyon No
    customer_name: string;    // Yolcu İsmi (eklendi)
    pickup_location_name: string; // Nereden (eklendi)
    dropoff_location_name: string; // Nereye (eklendi)
	supplier_name: string;    // Tedarikçi Adı
	supplier_cost: number | null; // Maliyet
}

// Interface for Suppliers (for filter dropdown)
interface Supplier {
	id: number;
	name: string;
}

// Pagination state
interface PaginationState {
	currentPage: number;
	itemsPerPage: number;
	totalItems: number | null;
}

export default function SupplierWorkReportPage() {
	const [reportData, setReportData] = useState<ReportItem[]>([]);
	const [suppliers, setSuppliers] = useState<Supplier[]>([]);
	const [pagination, setPagination] = useState<PaginationState>({ currentPage: 1, itemsPerPage: 15, totalItems: null });
	const [filters, setFilters] = useState<{ date_from: Date | undefined; date_to: Date | undefined; supplier_id: string }>({ date_from: undefined, date_to: undefined, supplier_id: 'all' });
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch Suppliers for the filter dropdown
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
				// setError('Tedarikçi listesi yüklenemedi.'); // Optionally show error
			}
		}
	}, [setSuppliers]);

	useEffect(() => {
		fetchSuppliers();
	}, [fetchSuppliers]);

	// Fetch Report Data from Supabase (güncellendi)
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
					created_at,
					reservation_time,
                    customer_name, 
					supplier_cost,
					supplier_id,
					suppliers ( name ),
                    locations:pickup_location_id ( name ),
                    dropoff_location:dropoff_location_id ( name )
				`, { count: 'exact' })
				.not('supplier_id', 'is', null) // Sadece tedarikçisi olan rezervasyonlar
				.order('reservation_time', { ascending: false })
				.range(rangeFrom, rangeTo);

			// Apply filters
			if (currentFilters.date_from) {
				query = query.gte('reservation_time', format(currentFilters.date_from, 'yyyy-MM-dd'));
			}
			if (currentFilters.date_to) {
				const toDate = new Date(currentFilters.date_to);
				toDate.setHours(23, 59, 59, 999);
				query = query.lte('reservation_time', toDate.toISOString());
			}
			if (currentFilters.supplier_id && currentFilters.supplier_id !== 'all') {
				query = query.eq('supplier_id', parseInt(currentFilters.supplier_id, 10));
			}

			const { data, error, count } = await query;

			if (error) {
                // Check if error is due to missing 'supplier_cost'
                if ('code' in error && error.code === '42703' && 'message' in error && typeof error.message === 'string' && error.message.includes('supplier_cost')) {
                     throw new Error('Maliyet sütunu (supplier_cost) bulunamadı. Lütfen veritabanı şemasını kontrol edin.');
                }
                 throw error;
            }

			// Veriyi formatla (güncellendi)
			const formattedData: ReportItem[] = (data || []).map((item: RawReservationItem) => ({
				id: item.id,
				created_at: item.created_at,
				reservation_time: item.reservation_time,
				code: item.code,
                customer_name: item.customer_name || '-', // Yolcu adı
                pickup_location_name: item.locations?.[0]?.name || '-', // Nereden - updated access
                dropoff_location_name: item.dropoff_location?.[0]?.name || '-', // Nereye - updated access
				supplier_name: item.suppliers?.[0]?.name || '-', // Tedarikçi - updated access
				supplier_cost: item.supplier_cost,
			}));

			setReportData(formattedData);
			setPagination(prev => ({ ...prev, currentPage: page, totalItems: count }));

		} catch (err: unknown) {
			console.error('Rapor verileri çekilirken hata:', err);
            let message = 'Rapor verileri yüklenirken bir hata oluştu.';
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

	// Debounced fetch data on filter change
	const debouncedFetchData = useMemo(() => debounce(fetchReportData, 500), [fetchReportData]);

	useEffect(() => {
		debouncedFetchData(1, filters);
		return () => debouncedFetchData.cancel();
	}, [filters, debouncedFetchData]);

	// Handle filter changes
	const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		setPagination(prev => ({ ...prev, currentPage: 1 }));
	};

	const handlePageChange = (newPage: number) => {
		setPagination(prev => ({ ...prev, currentPage: newPage }));
		fetchReportData(newPage, filters);
	};

	const handleSupplierFilterChange = (value: string) => {
		handleFilterChange('supplier_id', value);
	};

	// Calculate totals
	const totalCost = useMemo(() => {
		if (!reportData || reportData.length === 0) {
			return 0;
		}
		return reportData.reduce((acc, item) => acc + (item.supplier_cost || 0), 0);
	}, [reportData]);

	return (
		<div>
			<h1 className="text-2xl font-semibold mb-4">Tedarikçi İş Raporu</h1>

			{/* Filter Area */}
			<div className="flex flex-wrap items-center gap-2 mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
				<Filter className="h-5 w-5 text-gray-500" />
				<span className="font-semibold text-gray-700 dark:text-gray-300 mr-2">Filtrele:</span>

				{/* Date Range */}
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant={"outline"}
							className={cn("w-[180px] justify-start text-left font-normal", !filters.date_from && "text-muted-foreground")}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{filters.date_from ? format(filters.date_from, "dd/MM/yyyy") : <span>Başlangıç Tarihi</span>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0">
						<Calendar mode="single" selected={filters.date_from} onSelect={(date) => handleFilterChange('date_from', date)} initialFocus />
					</PopoverContent>
				</Popover>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant={"outline"}
							className={cn("w-[180px] justify-start text-left font-normal", !filters.date_to && "text-muted-foreground")}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{filters.date_to ? format(filters.date_to, "dd/MM/yyyy") : <span>Bitiş Tarihi</span>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0">
						<Calendar mode="single" selected={filters.date_to} onSelect={(date) => handleFilterChange('date_to', date)} initialFocus />
					</PopoverContent>
				</Popover>

				{/* Supplier Selection */}
				<Select value={filters.supplier_id} onValueChange={handleSupplierFilterChange} disabled={suppliers.length === 0}>
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

			{/* Loading State */}
			{isLoading && (
				<div className="space-y-2">
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                 </div>
			)}

			{/* Error State */}
			{error && <p className="text-red-500">{error}</p>}

			{/* Report Table */}
			{!isLoading && !error && (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Kayıt Tarihi</TableHead>
							<TableHead>Transfer Tarihi</TableHead>
							<TableHead>Transfer Saati</TableHead>
							<TableHead>Rez. No</TableHead>
							<TableHead>Yolcu İsmi</TableHead>
							<TableHead>Nereden</TableHead>
							<TableHead>Nereye</TableHead>
							<TableHead>Tedarikçi</TableHead>
							<TableHead className="text-right">Maliyet</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{reportData.length > 0 ? (
							reportData.map((item) => (
								<TableRow key={item.id}>
									<TableCell>{formatDateOnly(item.created_at)}</TableCell>
									<TableCell>{formatDateOnly(item.reservation_time)}</TableCell>
									<TableCell>{formatTimeOnly(item.reservation_time)}</TableCell>
									<TableCell>{item.code}</TableCell>
									<TableCell>{item.customer_name}</TableCell>
									<TableCell>{item.pickup_location_name}</TableCell>
									<TableCell>{item.dropoff_location_name}</TableCell>
									<TableCell>{item.supplier_name}</TableCell>
									<TableCell className="text-right">{formatCurrency(item.supplier_cost)}</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={9} className="h-24 text-center">
									Raporlanacak veri bulunamadı.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
					<TableFooter>
						<TableRow>
							<TableCell colSpan={8} className="text-right font-semibold">Toplam Maliyet</TableCell>
							<TableCell className="text-right font-semibold">{formatCurrency(totalCost)}</TableCell>
						</TableRow>
					</TableFooter>
				</Table>
			)}

			{/* Pagination Controls */}
            {!isLoading && pagination.totalItems !== null && pagination.totalItems > pagination.itemsPerPage && (
                (() => {
                    const lastPage = Math.ceil(pagination.totalItems! / pagination.itemsPerPage);
                    const fromItem = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
                    const toItem = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems!);
                    return (
                        <PaginationControls
                            currentPage={pagination.currentPage}
                            lastPage={lastPage}
                            onPageChange={handlePageChange}
                            total={pagination.totalItems}
                            perPage={pagination.itemsPerPage}
                            from={fromItem}
                            to={toItem}
                        />
                    );
                })()
            )}
		</div>
	);
} 