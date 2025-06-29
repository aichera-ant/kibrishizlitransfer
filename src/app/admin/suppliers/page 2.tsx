'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { PlusCircle, Pencil, Trash2, ArrowLeft, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const ITEMS_PER_PAGE = 10

// Supplier interface'i tanımla (vehicles sayfasındaki gibi)
interface Supplier {
	id: number;
	created_at: string; // veya Date
	updated_at: string | null; // veya Date | null
	deleted_at: string | null; // veya Date | null
	name: string;
	contact_name: string | null;
	contact_email: string | null;
	contact_phone: string | null;
	is_active: boolean;
}

// Tedarikçi ekleme/düzenleme formu için veri tipi
// Omit kullanmaya devam edebiliriz, name ve is_active zorunlu
type SupplierFormData = Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>

// Sayfalama meta verileri tipi
interface PaginationMeta {
	currentPage: number;
	lastPage: number;
	total: number;
	from: number;
	to: number;
}

export default function AdminSuppliersPage() {
	const [suppliers, setSuppliers] = useState<Supplier[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [currentPage, setCurrentPage] = useState(1)
	const [totalSuppliers, setTotalSuppliers] = useState(0)

	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
	const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
	const [formData, setFormData] = useState<SupplierFormData>({
		name: '',
		contact_name: null,
		contact_email: null,
		contact_phone: null,
		is_active: true,
	})
	const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

	// Veri Çekme Fonksiyonu
	const fetchSuppliers = useCallback(async (page: number) => {
		setIsLoading(true)
		setError(null)
		const from = (page - 1) * ITEMS_PER_PAGE
		const to = from + ITEMS_PER_PAGE - 1

		try {
			const { data, error: fetchError, count } = await supabase
				.from('suppliers')
				.select('*', { count: 'exact' })
				.order('id', { ascending: true })
				.range(from, to)

			if (fetchError) throw fetchError

			setSuppliers(data || [])
			setTotalSuppliers(count || 0)
			setCurrentPage(page)

		} catch (err: unknown) {
			console.error('Tedarikçiler alınamadı:', err)
			const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.'
			setError(`Tedarikçiler yüklenirken bir hata oluştu: ${errorMessage}`)
			toast.error('Tedarikçiler yüklenemedi.', { description: errorMessage })
			setSuppliers([])
			setTotalSuppliers(0)
		} finally {
			setIsLoading(false)
		}
	}, [])

	// İlk yükleme
	useEffect(() => {
		fetchSuppliers(1)
	}, [fetchSuppliers])

	// Form Doğrulama Fonksiyonu
	const validateForm = (data: SupplierFormData): boolean => {
		const errors: { [key: string]: string } = {}
		if (!data.name.trim()) {
			errors.name = 'Tedarikçi adı gereklidir.'
		}
		if (data.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email)) {
			errors.contact_email = 'Geçerli bir e-posta adresi giriniz.'
		}
		// Telefon için basit bir format kontrolü (opsiyonel, daha karmaşık regex kullanılabilir)
		// if (data.contact_phone && !/^\+?[0-9\s\-()]+$/.test(data.contact_phone)) {
		//  errors.contact_phone = 'Geçerli bir telefon numarası giriniz.'
		// }
		setFormErrors(errors)
		return Object.keys(errors).length === 0
	}

	// Input Değişikliklerini Yönetme
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value, type, checked } = e.target
		setFormData(prev => ({
			...prev,
			[name]: type === 'checkbox' ? checked : (value === '' ? null : value) // Boş string ise null yap
		}))
		// Değişiklik oldukça ilgili hatayı temizle
		if (formErrors[name]) {
			setFormErrors(prev => ({ ...prev, [name]: '' }))
		}
	}

	// Tedarikçi Ekleme
	const handleAddSupplier = async () => {
		if (!validateForm(formData)) return

		try {
			const { error: insertError } = await supabase
				.from('suppliers')
				.insert([formData])

			if (insertError) throw insertError

			toast.success('Tedarikçi başarıyla eklendi.')
			setIsAddDialogOpen(false)
			setFormData({ name: '', contact_name: null, contact_email: null, contact_phone: null, is_active: true }) // Formu sıfırla
			fetchSuppliers(currentPage) // Listeyi yenile
		} catch (err: unknown) {
			console.error('Tedarikçi eklenemedi:', err)
			const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.'
			toast.error('Tedarikçi eklenemedi.', { description: errorMessage })
		}
	}

	// Düzenleme Dialogunu Açma
	const handleEditClick = (supplier: Supplier) => {
		setSelectedSupplier(supplier)
		setFormData({
			name: supplier.name,
			contact_name: supplier.contact_name,
			contact_email: supplier.contact_email,
			contact_phone: supplier.contact_phone,
			is_active: supplier.is_active,
		})
		setFormErrors({}) // Hataları temizle
		setIsEditDialogOpen(true)
	}

	// Tedarikçi Güncelleme
	const handleUpdateSupplier = async () => {
		if (!selectedSupplier || !validateForm(formData)) return

		try {
			const { error: updateError } = await supabase
				.from('suppliers')
				.update(formData)
				.eq('id', selectedSupplier.id)

			if (updateError) throw updateError

			toast.success('Tedarikçi başarıyla güncellendi.')
			setIsEditDialogOpen(false)
			setSelectedSupplier(null)
			fetchSuppliers(currentPage) // Listeyi yenile
		} catch (err: unknown) {
			console.error('Tedarikçi güncellenemedi:', err)
			const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.'
			toast.error('Tedarikçi güncellenemedi.', { description: errorMessage })
		}
	}

	// Silme Dialogunu Açma
	const handleDeleteClick = (supplier: Supplier) => {
		setSelectedSupplier(supplier)
		setIsDeleteDialogOpen(true)
	}

	// Tedarikçi Silme
	const confirmDelete = async () => {
		if (!selectedSupplier) return

		try {
			// 1. İlişkili kayıt kontrolü (vehicles)
			const { count: vehicleCount, error: vehicleError } = await supabase
				.from('vehicles')
				.select('id', { count: 'exact', head: true })
				.eq('supplier_id', selectedSupplier.id)
			if (vehicleError) throw new Error(`Araç kontrolü hatası: ${vehicleError.message}`)
			if (vehicleCount && vehicleCount > 0) {
				throw new Error(`Bu tedarikçiye bağlı ${vehicleCount} araç bulunmaktadır. Önce araçları silin veya başka bir tedarikçiye atayın.`);
			}

			// 2. İlişkili kayıt kontrolü (reservations)
			const { count: reservationCount, error: reservationError } = await supabase
				.from('reservations')
				.select('id', { count: 'exact', head: true })
				.eq('supplier_id', selectedSupplier.id)
			if (reservationError) throw new Error(`Rezervasyon kontrolü hatası: ${reservationError.message}`)
			if (reservationCount && reservationCount > 0) {
				throw new Error(`Bu tedarikçiye bağlı ${reservationCount} rezervasyon bulunmaktadır.`);
			}

			// 3. İlişkili kayıt kontrolü (users)
			const { count: userCount, error: userError } = await supabase
				.from('users')
				.select('id', { count: 'exact', head: true })
				.eq('supplier_id', selectedSupplier.id)
			if (userError) throw new Error(`Kullanıcı kontrolü hatası: ${userError.message}`)
			if (userCount && userCount > 0) {
				throw new Error(`Bu tedarikçiye bağlı ${userCount} kullanıcı bulunmaktadır.`);
			}

			// 4. İlişkili kayıt kontrolü (supplier_price_lists)
			const { count: priceListCount, error: priceListError } = await supabase
				.from('supplier_price_lists')
				.select('id', { count: 'exact', head: true })
				.eq('supplier_id', selectedSupplier.id)
			if (priceListError) throw new Error(`Fiyat listesi kontrolü hatası: ${priceListError.message}`)
			if (priceListCount && priceListCount > 0) {
				throw new Error(`Bu tedarikçiye bağlı ${priceListCount} fiyat listesi bulunmaktadır.`);
			}

			// Silme işlemi
			const { error: deleteError } = await supabase
				.from('suppliers')
				.delete()
				.eq('id', selectedSupplier.id)

			if (deleteError) throw deleteError

			toast.success('Tedarikçi başarıyla silindi.')
			setIsDeleteDialogOpen(false)
			setSelectedSupplier(null)
			// Silme sonrası sayfa kontrolü
			const remainingItems = totalSuppliers - 1
			const newLastPage = Math.ceil(remainingItems / ITEMS_PER_PAGE)
			const pageToFetch = currentPage > newLastPage ? Math.max(1, newLastPage) : currentPage;
			fetchSuppliers(pageToFetch)

		} catch (err: unknown) {
			console.error('Tedarikçi silinemedi:', err)
			const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.'
			toast.error('Tedarikçi silinemedi.', { description: errorMessage })
			setIsDeleteDialogOpen(false) // Hata durumunda da dialogu kapat
		}
	}

	// Sayfalama Hesaplamaları
	const lastPage = Math.ceil(totalSuppliers / ITEMS_PER_PAGE)
	const paginationMeta: PaginationMeta = {
		currentPage: currentPage,
		lastPage: lastPage,
		total: totalSuppliers,
		from: Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalSuppliers),
		to: Math.min(currentPage * ITEMS_PER_PAGE, totalSuppliers),
	}

	const handleNextPage = () => {
		if (currentPage < lastPage) {
			fetchSuppliers(currentPage + 1)
		}
	}

	const handlePreviousPage = () => {
		if (currentPage > 1) {
			fetchSuppliers(currentPage - 1)
		}
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Tedarikçi Yönetimi</h1>
				<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
					<DialogTrigger asChild>
						<Button onClick={() => {
							setFormData({ name: '', contact_name: null, contact_email: null, contact_phone: null, is_active: true });
							setFormErrors({});
							setIsAddDialogOpen(true);
						}}>
							<PlusCircle className="mr-2 h-4 w-4" /> Yeni Tedarikçi Ekle
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Yeni Tedarikçi Ekle</DialogTitle>
							<DialogDescription>
								Yeni tedarikçi bilgilerini girin. Kaydetmek için butona tıklayın.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="name" className="text-right">
									Ad <span className="text-red-500">*</span>
								</Label>
								<Input
									id="name"
									name="name"
									value={formData.name}
									onChange={handleInputChange}
									className="col-span-3"
								/>
								{formErrors.name && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.name}</p>}
							</div>
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="contact_name" className="text-right">
									İletişim Adı
								</Label>
								<Input
									id="contact_name"
									name="contact_name"
									value={formData.contact_name ?? ''}
									onChange={handleInputChange}
									className="col-span-3"
								/>
							</div>
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="contact_email" className="text-right">
									İletişim E-posta
								</Label>
								<Input
									id="contact_email"
									name="contact_email"
									type="email"
									value={formData.contact_email ?? ''}
									onChange={handleInputChange}
									className="col-span-3"
								/>
								{formErrors.contact_email && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.contact_email}</p>}
							</div>
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="contact_phone" className="text-right">
									İletişim Telefon
								</Label>
								<Input
									id="contact_phone"
									name="contact_phone"
									type="tel"
									value={formData.contact_phone ?? ''}
									onChange={handleInputChange}
									className="col-span-3"
								/>
								{/* {formErrors.contact_phone && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.contact_phone}</p>} */}
							</div>
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="is_active" className="text-right">
									Aktif mi?
								</Label>
								<div className="col-span-3 flex items-center">
									<Checkbox
										id="is_active"
										name="is_active"
										checked={formData.is_active}
										onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: !!checked }))}
									/>
								</div>
							</div>
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button type="button" variant="outline">İptal</Button>
							</DialogClose>
							<Button type="button" onClick={handleAddSupplier}>Kaydet</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{error && (
				<div className="mb-4 rounded border border-red-400 bg-red-100 p-4 text-red-700">
					<p><strong>Hata:</strong> {error}</p>
				</div>
			)}

			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>ID</TableHead>
							<TableHead>Ad</TableHead>
							<TableHead>İletişim Adı</TableHead>
							<TableHead>İletişim E-posta</TableHead>
							<TableHead>İletişim Telefon</TableHead>
							<TableHead>Aktif</TableHead>
							<TableHead className="text-right">İşlemler</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, index) => (
								<TableRow key={`skel-${index}`}>
									<TableCell><Skeleton className="h-5 w-8" /></TableCell>
									<TableCell><Skeleton className="h-5 w-40" /></TableCell>
									<TableCell><Skeleton className="h-5 w-32" /></TableCell>
									<TableCell><Skeleton className="h-5 w-48" /></TableCell>
									<TableCell><Skeleton className="h-5 w-32" /></TableCell>
									<TableCell><Skeleton className="h-5 w-12" /></TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end space-x-2">
											<Skeleton className="h-8 w-8 rounded-md" />
											<Skeleton className="h-8 w-8 rounded-md" />
										</div>
									</TableCell>
								</TableRow>
							))
						) : suppliers.length > 0 ? (
							suppliers.map((supplier) => (
								<TableRow key={supplier.id}>
									<TableCell>{supplier.id}</TableCell>
									<TableCell className="font-medium">{supplier.name}</TableCell>
									<TableCell>{supplier.contact_name ?? '-'}</TableCell>
									<TableCell>{supplier.contact_email ?? '-'}</TableCell>
									<TableCell>{supplier.contact_phone ?? '-'}</TableCell>
									<TableCell>
										<Checkbox checked={supplier.is_active} disabled className="cursor-default" />
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end space-x-1">
											{/* Düzenleme Dialogu */}
											<Dialog open={isEditDialogOpen && selectedSupplier?.id === supplier.id} onOpenChange={(isOpen) => {
												if (!isOpen) {
													setSelectedSupplier(null); // Dialog kapanınca seçimi temizle
												}
												setIsEditDialogOpen(isOpen);
											}}>
												<DialogTrigger asChild>
													<Button variant="ghost" size="icon" onClick={() => handleEditClick(supplier)}>
														<Pencil className="h-4 w-4" />
													</Button>
												</DialogTrigger>
												<DialogContent className="sm:max-w-[425px]">
													<DialogHeader>
														<DialogTitle>Tedarikçi Düzenle</DialogTitle>
														<DialogDescription>
															Tedarikçi bilgilerini güncelleyin. Kaydetmek için butona tıklayın.
														</DialogDescription>
													</DialogHeader>
													<div className="grid gap-4 py-4">
														{/* Form Alanları (Ekleme ile aynı) */}
														<div className="grid grid-cols-4 items-center gap-4">
															<Label htmlFor="edit-name" className="text-right">
																Ad <span className="text-red-500">*</span>
															</Label>
															<Input
																id="edit-name"
																name="name"
																value={formData.name}
																onChange={handleInputChange}
																className="col-span-3"
															/>
															{formErrors.name && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.name}</p>}
														</div>
														<div className="grid grid-cols-4 items-center gap-4">
															<Label htmlFor="edit-contact_name" className="text-right">
																İletişim Adı
															</Label>
															<Input
																id="edit-contact_name"
																name="contact_name"
																value={formData.contact_name ?? ''}
																onChange={handleInputChange}
																className="col-span-3"
															/>
														</div>
														<div className="grid grid-cols-4 items-center gap-4">
															<Label htmlFor="edit-contact_email" className="text-right">
																İletişim E-posta
															</Label>
															<Input
																id="edit-contact_email"
																name="contact_email"
																type="email"
																value={formData.contact_email ?? ''}
																onChange={handleInputChange}
																className="col-span-3"
															/>
															{formErrors.contact_email && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.contact_email}</p>}
														</div>
														<div className="grid grid-cols-4 items-center gap-4">
															<Label htmlFor="edit-contact_phone" className="text-right">
																İletişim Telefon
															</Label>
															<Input
																id="edit-contact_phone"
																name="contact_phone"
																type="tel"
																value={formData.contact_phone ?? ''}
																onChange={handleInputChange}
																className="col-span-3"
															/>
															{/* {formErrors.contact_phone && <p className="col-span-4 text-right text-sm text-red-500">{formErrors.contact_phone}</p>} */}
														</div>
														<div className="grid grid-cols-4 items-center gap-4">
															<Label htmlFor="edit-is_active" className="text-right">
																Aktif mi?
															</Label>
															<div className="col-span-3 flex items-center">
																<Checkbox
																	id="edit-is_active"
																	name="is_active"
																	checked={formData.is_active}
																	onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: !!checked }))}
																/>
															</div>
														</div>
													</div>
													<DialogFooter>
														<DialogClose asChild>
															<Button type="button" variant="outline" onClick={() => setSelectedSupplier(null)}>İptal</Button>
														</DialogClose>
														<Button type="button" onClick={handleUpdateSupplier}>Kaydet</Button>
													</DialogFooter>
												</DialogContent>
											</Dialog>

											{/* Silme AlertDialogu */}
											<AlertDialog open={isDeleteDialogOpen && selectedSupplier?.id === supplier.id} onOpenChange={(isOpen) => {
												if (!isOpen) {
													setSelectedSupplier(null); // Dialog kapanınca seçimi temizle
												}
												setIsDeleteDialogOpen(isOpen);
											}}>
												<AlertDialogTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-500 hover:text-red-700"
														onClick={() => handleDeleteClick(supplier)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
														<AlertDialogDescription>
															&quot;{selectedSupplier?.name}&quot; adlı tedarikçiyi silmek üzeresiniz. Bu işlem geri alınamaz ve tedarikçiye bağlı araç, rezervasyon, kullanıcı veya fiyat listesi varsa işlem başarısız olur.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel onClick={() => setSelectedSupplier(null)}>İptal</AlertDialogCancel>
														<AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
															Evet, Sil
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center">
									Gösterilecek tedarikçi bulunamadı.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
				{/* Sayfalama */}
				{!isLoading && totalSuppliers > 0 && (
					<div className="mt-4 flex items-center justify-between px-2">
						<span className="text-sm text-muted-foreground">
							{paginationMeta.total} kayıttan {paginationMeta.from} - {paginationMeta.to} arası gösteriliyor.
						</span>
						<div className="space-x-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handlePreviousPage}
								disabled={paginationMeta.currentPage <= 1}
							>
								<ArrowLeft className="mr-1 h-4 w-4" /> Önceki
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleNextPage}
								disabled={paginationMeta.currentPage >= paginationMeta.lastPage}
							>
								Sonraki <ArrowRight className="ml-1 h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</Card>
		</div>
	)
} 