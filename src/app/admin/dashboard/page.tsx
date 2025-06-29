'use client'

import React, { useEffect, useState, useCallback } from 'react'
// import apiClient from '@/lib/api/client' // Eski API istemcisi kaldırıldı
import { supabase } from '@/lib/supabaseClient' // Supabase istemcisi eklendi
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import { Eye, Car, Building, FileText, Clock } from 'lucide-react'
// import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns' // All unused
// import { tr } from 'date-fns/locale' // All unused
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select' // All unused
// import { AxiosError } from 'axios' // AxiosError kaldırıldı

// Admin rezervasyon listesindeki Reservation arayüzüne benzer
interface RecentReservation {
	id: number;
	code: string;
	customer_name: string;
	status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
	created_at: string; // Sıralama için eklendi
}

// Backend'den gelen özet veri yapısı
interface DashboardSummary {
	totalReservations: number;
	pendingReservations: number;
	totalVehicles: number;
	totalSuppliers: number;
	recentReservations: RecentReservation[];
}

// Yeni Finansal Özet arayüzü (şimdilik kullanılmayacak)
// interface FinancialSummary { ... }

// Durum renkleri (Rezervasyon listesinden alınabilir)
const statusColors: { [key: string]: string } = {
	pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
	confirmed: 'bg-green-100 text-green-800 border-green-300',
	cancelled: 'bg-red-100 text-red-800 border-red-300',
	completed: 'bg-blue-100 text-blue-800 border-blue-300',
};

export default function DashboardPage() {
	const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null)
	// const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null); // Şimdilik kaldırıldı
	const [isLoading, setIsLoading] = useState(true)
	// const [isLoadingFinancial, setIsLoadingFinancial] = useState(true); // Şimdilik kaldırıldı
	const [error, setError] = useState<string | null>(null)
	// const [financialError, setFinancialError] = useState<string | null>(null); // Şimdilik kaldırıldı

	// Supabase'den özet verileri çekme fonksiyonu
	const fetchDashboardData = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			// Paralel sorgular
			const [ 
				reservationsCount, 
				pendingCount, 
				vehiclesCount, 
				suppliersCount, 
				recentReservationsData 
			] = await Promise.all([
				supabase.from('reservations').select('id', { count: 'exact', head: true }),
				supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
				supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('is_active', true), // Aktif araçları say
				supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('is_active', true), // Aktif tedarikçileri say
				supabase.from('reservations').select('id, code, customer_name, status, created_at').order('created_at', { ascending: false }).limit(5)
			]);

			// Hata kontrolü
			if (reservationsCount.error) throw reservationsCount.error;
			if (pendingCount.error) throw pendingCount.error;
			if (vehiclesCount.error) throw vehiclesCount.error;
			if (suppliersCount.error) throw suppliersCount.error;
			if (recentReservationsData.error) throw recentReservationsData.error;

			// Verileri state'e ata
			setSummaryData({
				totalReservations: reservationsCount.count ?? 0,
				pendingReservations: pendingCount.count ?? 0,
				totalVehicles: vehiclesCount.count ?? 0,
				totalSuppliers: suppliersCount.count ?? 0,
				recentReservations: (recentReservationsData.data as RecentReservation[]) ?? [],
			});

		} catch (err: unknown) {
			console.error('Dashboard özeti alınamadı (Supabase):', err)
			let errorMessage = 'Genel dashboard verileri yüklenirken bir hata oluştu.';
			if (err instanceof Error) { // Genel Error kontrolü
				errorMessage = err.message;
			}
			setError(errorMessage)
		} finally {
			setIsLoading(false)
		}
	}, [])

	// Finansal veri çekme fonksiyonu (şimdilik kaldırıldı)
	// const fetchFinancialData = useCallback(async () => { ... }, [])

	useEffect(() => {
		fetchDashboardData()
		// fetchFinancialData() // Şimdilik kaldırıldı
	}, [fetchDashboardData]) // Bağımlılık güncellendi

	if (error) {
		return (
			<div className="space-y-4">
				<div className="rounded border border-red-400 bg-red-100 p-4 text-red-700">
					<h2 className="font-semibold">Genel Veri Hatası</h2>
					<p>{error}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			
			{/* İstatistik Kartları (veri kaynağı summaryData oldu) */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Toplam Rezervasyon</CardTitle>
						<FileText className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoading ? <Skeleton className="h-8 w-16" /> : summaryData?.totalReservations ?? '-'}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Bekleyen Rezervasyon</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoading ? <Skeleton className="h-8 w-16" /> : summaryData?.pendingReservations ?? '-'}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Toplam Araç</CardTitle>
						<Car className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoading ? <Skeleton className="h-8 w-16" /> : summaryData?.totalVehicles ?? '-'}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Toplam Tedarikçi</CardTitle>
						<Building className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoading ? <Skeleton className="h-8 w-16" /> : summaryData?.totalSuppliers ?? '-'}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Finansal Özet Kartları (şimdilik kaldırıldı) */}
			{/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"> ... </div> */}

			{/* Son Rezervasyonlar Tablosu (veri kaynağı summaryData oldu) */}
			<Card>
				<CardHeader>
					<CardTitle>Son Rezervasyonlar</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>ID</TableHead>
								<TableHead>Kod</TableHead>
								<TableHead>Müşteri</TableHead>
								<TableHead>Durum</TableHead>
								<TableHead className="text-right">Detay</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								Array.from({ length: 5 }).map((_, index) => (
									<TableRow key={index}>
										<TableCell><Skeleton className="h-5 w-8" /></TableCell>
										<TableCell><Skeleton className="h-5 w-24" /></TableCell>
										<TableCell><Skeleton className="h-5 w-32" /></TableCell>
										<TableCell><Skeleton className="h-6 w-20 rounded-md" /></TableCell>
										<TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md inline-block" /></TableCell>
									</TableRow>
								))
							) : summaryData?.recentReservations && summaryData.recentReservations.length > 0 ? (
								summaryData.recentReservations.map((res: RecentReservation) => (
									<TableRow key={res.id}>
										<TableCell>{res.id}</TableCell>
										<TableCell className="font-mono text-xs">{res.code}</TableCell>
										<TableCell className="font-medium">{res.customer_name}</TableCell>
										<TableCell>
											<Badge variant="outline" className={`${statusColors[res.status] || 'border-gray-300'} whitespace-nowrap`}>
												{res.status}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<Link href={`/admin/reservations/${res.id}`}
												  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
												<Eye className="h-4 w-4" />
											</Link>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={5} className="h-24 text-center">
										Son rezervasyon bulunamadı.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
} 