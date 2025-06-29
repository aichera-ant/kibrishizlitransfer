'use client'; // İstemci bileşeni olarak işaretlendi

import { useState } from 'react';
import Link from 'next/link'
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react'
import { cn } from '@/lib/utils' // Shadcn UI utils
import {
	LayoutDashboard,
	FolderCog,
	LineChart,
	ChevronDown,
	Car,
	MapPin,
	Map,
	Users,
	Tags,
	DollarSign,
	UserCog,
	Settings2,
	ListChecks,
	Landmark, // Muhasebe ikonu eklendi
	Activity, // Masraf Girişi ikonu
	FileSpreadsheet, // Cari Hesap ikonu eklendi
	BarChart3,
	PieChart,
} from 'lucide-react' // İkonlar eklendi
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible" // Collapsible eklendi

interface AdminLayoutProps {
	children: ReactNode
}

// Menü öğeleri için yeni arayüz
interface MenuItem {
	href?: string; // Grup başlıkları için olmayabilir
	label: string;
	icon?: React.ElementType;
	isGroup?: boolean;
	subItems?: MenuItem[];
}

// Güncellenmiş menü yapısı (ikonlarla ve doğru linklerle)
const menuStructure: MenuItem[] = [
	{ href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{
		label: 'Yönetim',
		icon: FolderCog,
		isGroup: true,
		subItems: [
			{ href: '/admin/vehicles', label: 'Araç Yönetimi', icon: Car },
			{ href: '/admin/locations', label: 'Lokasyon Yönetimi', icon: MapPin },
			{ href: '/admin/bolge', label: 'Bölge Yönetimi', icon: Map },
			{ href: '/admin/suppliers', label: 'Tedarikçi Yönetimi', icon: Users },
			{ href: '/admin/price-lists', label: 'Satış Fiyatları', icon: Tags },
			{ href: '/admin/supplier-prices', label: 'Tedarikçi Maliyetleri', icon: DollarSign },
			{ href: '/admin/extras', label: 'Ekstra Yönetimi', icon: Settings2 },
			{ href: '/admin/expense-types', label: 'Masraf Türleri', icon: Tags },
			{ href: '/admin/reservations', label: 'Rezervasyon Yönetimi', icon: ListChecks },
			{ href: '/admin/users', label: 'Kullanıcı Yönetimi', icon: UserCog },
		]
	},
	{
		label: 'Muhasebe',
		icon: Landmark,
		isGroup: true,
		subItems: [
			{ href: '/admin/accounting/expenses', label: 'Masraf Girişi', icon: Activity },
			{ href: '/admin/reports/current-account-list', label: 'Cari Hesap Listesi', icon: ListChecks },
			{ href: '/admin/reports/current-account', label: 'Cari Hesap Ekstresi', icon: FileSpreadsheet },
			{ href: '/admin/reports/expense-type', label: 'Masraf Türü Raporu', icon: PieChart },
		]
	},
	{
		label: 'Raporlar',
		icon: LineChart,
		isGroup: true,
		subItems: [
			{ href: '/admin/reports/financial', label: 'Rezervasyon Kâr/Zarar Raporu', icon: BarChart3 },
			{ href: '/admin/reports/supplier-work', label: 'Tedarikçi İş Raporu', icon: FileSpreadsheet },
		]
	},
];

export default function AdminLayout({ children }: AdminLayoutProps) {
	const pathname = usePathname(); // Aktif link için
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
		// Sayfa yüklendiğinde aktif linkin grubunu açık başlat
		const initialOpenGroups: Record<string, boolean> = {};
		menuStructure.forEach(item => {
			if (item.isGroup && item.subItems?.some(sub => pathname.startsWith(sub.href ?? ''))) {
				initialOpenGroups[item.label] = true;
			}
		});
		return initialOpenGroups;
	});

	// Çıkış yap butonu ve mantığı ekle

	return (
		<div className="flex min-h-screen w-full">
			<aside className="hidden w-64 flex-col border-r bg-gray-100/40 p-4 dark:bg-gray-800/40 md:flex">
				<nav className="flex flex-col gap-1">
					<Link
						href="/admin/dashboard" // Admin ana sayfası yerine dashboard'a yönlendir
						className="mb-4 text-lg font-semibold flex items-center gap-2" // İkon için flex eklendi
					>
						{/* İsteğe bağlı logo/ikon */} Kıbrıs Transfer Admin
					</Link>

					{menuStructure.map((item) => {
						if (item.isGroup && item.subItems) {
							const isOpen = openGroups[item.label] ?? false;
							return (
								<Collapsible
									key={item.label}
									open={isOpen}
									onOpenChange={(open: boolean) => setOpenGroups(prev => ({ ...prev, [item.label]: open }))}
									className="w-full"
								>
									<CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50">
										<div className="flex items-center gap-3">
											{item.icon && <item.icon className="h-4 w-4" />}
											{item.label}
										</div>
										<ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "")} />
									</CollapsibleTrigger>
									<CollapsibleContent className="pl-6 pt-1 space-y-1"> {/* Alt gruplar arası boşluk için space-y-1 eklendi */}
										{item.subItems.map((subItem) => {
											// Eğer alt öğe de bir grup ise, iç içe Collapsible oluştur
											if (subItem.isGroup && subItem.subItems) {
												const isSubOpen = openGroups[subItem.label] ?? false;
												return (
													<Collapsible
														key={subItem.label}
														open={isSubOpen}
														onOpenChange={(open: boolean) => setOpenGroups(prev => ({ ...prev, [subItem.label]: open }))}
														className="w-full"
													>
														<CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50">
															<div className="flex items-center gap-3">
																{subItem.icon && <subItem.icon className="h-4 w-4" />}
																{subItem.label}
															</div>
															<ChevronDown className={cn("h-4 w-4 transition-transform", isSubOpen ? "rotate-180" : "")} />
														</CollapsibleTrigger>
														<CollapsibleContent className="pl-6 pt-1 space-y-1">
															{subItem.subItems.map((nestedItem) => (
																<Link
																	key={nestedItem.href}
																	href={nestedItem.href ?? '#'}
																	className={cn(
																		'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
																		pathname === nestedItem.href ? 'bg-gray-200 font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-50' : ''
																	)}
																>
																	{nestedItem.icon && <nestedItem.icon className="h-4 w-4" />} {nestedItem.label}
																</Link>
															))}
														</CollapsibleContent>
													</Collapsible>
												);
											} else {
												// Normal alt link
												return (
													<Link
														key={subItem.href}
														href={subItem.href ?? '#'}
														className={cn(
															'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
															pathname === subItem.href ? 'bg-gray-200 font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-50' : ''
														)}
													>
														{subItem.icon && <subItem.icon className="h-4 w-4" />} {subItem.label}
													</Link>
												);
											}
										})}
									</CollapsibleContent>
								</Collapsible>
							);
						} else {
							// Standalone item (Dashboard)
							return (
								<Link
									key={item.href}
									href={item.href ?? '#'}
									className={cn(
										'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
										pathname === item.href ? 'bg-gray-200 font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-50' : ''
									)}
								>
									{item.icon && <item.icon className="h-4 w-4" />}
									{item.label}
								</Link>
							);
						}
					})}
				</nav>
				<div className="mt-auto">
					{/* TODO: Çıkış Yap Butonu */}
					{/* <Button variant="outline" className="w-full">Çıkış Yap</Button> */}
				</div>
			</aside>
			<main className="flex-1 p-6">{children}</main>
		</div>
	)
} 