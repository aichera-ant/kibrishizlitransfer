'use client'

import { useState, useEffect, useCallback, ChangeEvent, FormEvent, ElementType, ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast, Toaster } from 'sonner'
import {
    ArrowLeft, User, Mail, Phone, Users, Plane, MapPin, Car, Building, CalendarClock, Info, CreditCard, CircleDollarSign, StickyNote, Pencil, Save, X,
    Loader2,
    AlertCircle,
    PlaneTakeoff,
    Search
} from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface Location {
    id: number;
    name: string;
    bolge?: { name: string } | null;
}

interface Vehicle {
    id: number;
    name: string;
    capacity?: number;
    plate_number?: string;
}

interface Supplier {
    id: number;
    name: string;
}

interface Reservation {
    id: number;
    code: string;
    pickup_location_id: number;
    dropoff_location_id: number;
    vehicle_id: number;
    reservation_time: string;
    passenger_count: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    flight_number: string | null;
    notes: string | null;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    total_price: number;
    payment_status: 'pending' | 'paid' | 'refunded';
    created_at?: string;
    updated_at?: string;
    supplier_id: number | null;
    locations: Location | null;
    dropoff_location: Location | null;
    vehicles: Vehicle | null;
    suppliers: Supplier | null;
    flight_status: string | null;
    flight_departure_time: string | null;
    flight_arrival_time: string | null;
    flight_departure_airport: string | null;
    flight_arrival_airport: string | null;
    flight_airline_name: string | null;
    flight_departure_terminal: string | null;
    flight_arrival_terminal: string | null;
    flight_departure_gate: string | null;
    flight_arrival_gate: string | null;
    flight_departure_delay: number | null;
    flight_arrival_delay: number | null;
    flight_last_checked: string | null;
}

interface EditFormData {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    passenger_count: number | string;
    flight_number: string | null;
    notes: string | null;
    status: Reservation['status'];
    payment_status: Reservation['payment_status'];
    supplier_id: string | null;
}

const initialFormDataState: EditFormData = {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    passenger_count: 1,
    flight_number: null,
    notes: null,
    status: 'pending',
    payment_status: 'pending',
    supplier_id: null,
};

const statusColors: { [key in Reservation['status']]: string } = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    confirmed: 'bg-green-100 text-green-800 border-green-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
    completed: 'bg-blue-100 text-blue-800 border-blue-300',
};

const paymentStatusColors: { [key in Reservation['payment_status']]: string } = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    paid: 'bg-green-100 text-green-800 border-green-300',
    refunded: 'bg-orange-100 text-orange-800 border-orange-300',
};

const reservationStatuses: { value: Reservation['status'], label: string }[] = [
    { value: 'pending', label: 'Beklemede' },
    { value: 'confirmed', label: 'Onaylandı' },
    { value: 'cancelled', label: 'İptal Edildi' },
    { value: 'completed', label: 'Tamamlandı' },
];

const paymentStatuses: { value: Reservation['payment_status'], label: string }[] = [
    { value: 'pending', label: 'Beklemede' },
    { value: 'paid', label: 'Ödendi' },
    { value: 'refunded', label: 'İade Edildi' },
];

// Uçuş durumu çevirileri
const flightStatusTranslations: { [key: string]: string } = {
    scheduled: 'Planlandı',
    active: 'Aktif',
    landed: 'İndi',
    cancelled: 'İptal Edildi',
    incident: 'Olay Var',
    diverted: 'Yönlendirildi',
    unknown: 'Bilinmiyor'
};

const formatCurrency = (value: number | string | null | undefined, currency = 'TRY') => {
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '-';
    }
    try {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (error) {
        console.error("Currency formatting error:", error);
        return `${amount.toFixed(2)} TL`;
    }
}

const formatDateTime = (dateTimeString: string | null | undefined): string => {
    if (!dateTimeString || !isValid(parseISO(dateTimeString))) {
        return '-';
    }
    try {
        return format(parseISO(dateTimeString), 'dd.MM.yyyy HH:mm');
    } catch (error) {
        console.error("DateTime formatting error:", error);
        return dateTimeString;
    }
}

interface EditableFieldProps {
    label: string;
    name: keyof EditFormData;
    value: EditFormData[keyof EditFormData];
    originalValue: EditFormData[keyof EditFormData];
    isEditing: boolean;
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onSelectChange: (name: keyof EditFormData, value: string) => void;
    suppliers?: Supplier[];
    Icon?: ElementType;
    type?: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select-status' | 'select-payment' | 'select-supplier';
}

const EditableField: React.FC<EditableFieldProps> = ({
    label, name, value, originalValue, isEditing, onChange, onSelectChange, suppliers = [], Icon, type = 'text'
}) => {
    const currentValue = value;

    if (!isEditing) {
        let displayValue: ReactNode = originalValue ?? '-';

        if (name === 'status') {
            displayValue = <Badge variant="outline" className={statusColors[originalValue as keyof typeof statusColors] || ''}>{reservationStatuses.find(s => s.value === originalValue)?.label || originalValue || '-'}</Badge>;
        } else if (name === 'payment_status') {
            displayValue = <Badge variant="outline" className={paymentStatusColors[originalValue as keyof typeof paymentStatusColors] || ''}>{paymentStatuses.find(ps => ps.value === originalValue)?.label || originalValue || '-'}</Badge>;
        } else if (name === 'supplier_id') {
            const supplier = suppliers.find(s => s.id === Number(originalValue));
            displayValue = supplier ? supplier.name : (originalValue ? 'Bilinmeyen Tedarikçi' : 'Yok');
        } else if (originalValue === null || originalValue === undefined || originalValue === '') {
            displayValue = '-';
        }

        return (
            <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center">
                    {Icon && <Icon className="mr-2 h-4 w-4" />} {label}
                </Label>
                <div className="mt-1 text-base">{displayValue}</div>
            </div>
        );
    }

    if (type === 'textarea') {
        return (
            <div>
                <Label htmlFor={`edit-${name}`} className="text-sm font-medium text-muted-foreground flex items-center">
                    {Icon && <Icon className="mr-2 h-4 w-4" />} {label}
                </Label>
                <Textarea id={`edit-${name}`} name={name} value={String(currentValue ?? '')} onChange={onChange} className="mt-1" />
            </div>
        );
    } else if (type === 'select-status') {
        return (
            <div>
                <Label htmlFor={`edit-${name}`} className="text-sm font-medium text-muted-foreground flex items-center">
                    {Icon && <Icon className="mr-2 h-4 w-4" />} {label}
                </Label>
                <Select name={name} value={String(currentValue ?? '')} onValueChange={(val) => onSelectChange(name, val)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {reservationStatuses.map((s: { value: string; label: string }) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        );
    } else if (type === 'select-payment') {
        return (
            <div>
                <Label htmlFor={`edit-${name}`} className="text-sm font-medium text-muted-foreground flex items-center">
                    {Icon && <Icon className="mr-2 h-4 w-4" />} {label}
                </Label>
                <Select name={name} value={String(currentValue ?? '')} onValueChange={(val) => onSelectChange(name, val)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {paymentStatuses.map((ps: { value: string; label: string }) => <SelectItem key={ps.value} value={ps.value}>{ps.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        );
    } else if (type === 'select-supplier') {
        return (
            <div>
                <Label htmlFor={`edit-${name}`} className="text-sm font-medium text-muted-foreground flex items-center">
                    {Icon && <Icon className="mr-2 h-4 w-4" />} {label}
                </Label>
                <Select name={name} value={String(currentValue ?? 'null')} onValueChange={(val) => onSelectChange(name, val)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Tedarikçi Seçin" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="null">-- Tedarikçi Yok --</SelectItem>
                        {suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        );
    } else {
        return (
            <div>
                <Label htmlFor={`edit-${name}`} className="text-sm font-medium text-muted-foreground flex items-center">
                    {Icon && <Icon className="mr-2 h-4 w-4" />} {label}
                </Label>
                <Input
                    id={`edit-${name}`}
                    name={name}
                    type={type === 'number' ? 'number' : type === 'tel' ? 'tel' : 'text'}
                    value={String(currentValue ?? '')}
                    onChange={onChange}
                    className="mt-1"
                    step={type === 'number' ? 'any' : undefined}
                />
            </div>
        );
    }
};

interface FlightTimeData {
    scheduled: string | null;
    actual: string | null;
    estimated?: string | null;
}

interface FlightInfo {
    flight_date: string;
    flight_status: string;
    departure: FlightTimeData & { airport?: string; timezone?: string; terminal?: string; gate?: string; delay?: number | null };
    arrival: FlightTimeData & { airport?: string; timezone?: string; terminal?: string; gate?: string; delay?: number | null };
    airline?: { name?: string };
    flight?: { iata?: string; number?: string };
}

interface AviationStackResponse {
    data: FlightInfo[];
    error?: { code: string; message: string; };
}

export default function ReservationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [reservation, setReservation] = useState<Reservation | null>(null)
    const [suppliers, _setSuppliers] = useState<Supplier[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState<EditFormData>(initialFormDataState)
    const [error, setError] = useState<string | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [flightStatusInfo, setFlightStatusInfo] = useState<FlightInfo | null>(null);
    const [isFetchingFlightStatus, setIsFetchingFlightStatus] = useState(false);
    const [flightFetchError, setFlightFetchError] = useState<string | null>(null);
    const [isSavingFlightStatus, setIsSavingFlightStatus] = useState(false);
    const [originalFormData, setOriginalFormData] = useState<EditFormData | null>(null);

    const fetchReservationData = useCallback(async (reservationId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const { data: fetchedReservation, error: fetchError } = await supabase
                .from('reservations')
                .select(`
                    *,
                    locations:pickup_location_id (id, name, bolge (name)),
                    dropoff_location:dropoff_location_id (id, name, bolge (name)),
                    vehicles (id, name, capacity, plate_number),
                    suppliers (id, name)
                `)
                .eq('id', reservationId)
                .single();

            if (fetchError) throw fetchError;

            if (fetchedReservation) {
                setReservation(fetchedReservation);
                const newFormData: EditFormData = {
                    customer_name: fetchedReservation.customer_name ?? '',
                    customer_email: fetchedReservation.customer_email ?? '',
                    customer_phone: fetchedReservation.customer_phone ?? '',
                    passenger_count: fetchedReservation.passenger_count ?? 1,
                    flight_number: fetchedReservation.flight_number ?? null,
                    notes: fetchedReservation.notes ?? null,
                    status: fetchedReservation.status ?? 'pending',
                    payment_status: fetchedReservation.payment_status ?? 'pending',
                    supplier_id: fetchedReservation.supplier_id?.toString() ?? null,
                };
                setFormData(newFormData);
                setOriginalFormData(newFormData);
            } else {
                setError('Rezervasyon bulunamadı.');
                setReservation(null);
                setOriginalFormData(null);
            }
        } catch (err: unknown) {
            console.error("Error fetching reservation:", err);
            const message = err instanceof Error ? err.message : 'Rezervasyon yüklenirken bir hata oluştu.';
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchSuppliers = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('suppliers').select('id, name');
            if (error) throw error;
            _setSuppliers(data || []);
        } catch (err: any) {
            console.error('Error fetching suppliers:', err);
            toast.error('Tedarikçiler yüklenirken bir hata oluştu.');
            _setSuppliers([]);
        }
    }, []);

    useEffect(() => {
        if (id) {
            fetchReservationData(id);
            fetchSuppliers();
        }
    }, [id, fetchReservationData, fetchSuppliers]);

    const fetchFlightStatus = async () => {
        if (!reservation?.flight_number) {
            toast.warning("Bu rezervasyon için bir uçuş numarası girilmemiş.");
            return;
        }
        const AVIATIONSTACK_API_KEY = '626ace8fbbd036a4dec71dcbedb6e271';

        setIsFetchingFlightStatus(true);
        setFlightFetchError(null);
        setFlightStatusInfo(null);

        try {
            const apiUrl = `http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&flight_iata=${reservation.flight_number}`;

            const response = await fetch(apiUrl);
            const data: AviationStackResponse = await response.json();

            if (!response.ok || data.error) {
                console.error("AviationStack API Hatası:", data.error);
                throw new Error(data.error?.message || `API Hatası: ${response.status}`);
            }

            if (data.data && data.data.length > 0) {
                setFlightStatusInfo(data.data[0]);
                toast.success("Uçuş durumu bilgisi başarıyla alındı.");
            } else {
                setFlightFetchError("Belirtilen uçuş numarası ve tarih için uçuş bulunamadı.");
                toast.warning("Uçuş bulunamadı.");
            }

        } catch (err: unknown) {
            console.error('Uçuş durumu alınırken hata:', err);
            const message = err instanceof Error ? err.message : "Uçuş durumu bilgisi alınırken bir hata oluştu.";
            setFlightFetchError(message);
            toast.error(message);
        } finally {
            setIsFetchingFlightStatus(false);
        }
    };

    const saveFlightStatusToReservation = async () => {
        if (!reservation || !flightStatusInfo) return;

        setIsSavingFlightStatus(true);
        try {
            const updateData: Partial<Reservation> = {
                flight_status: flightStatusInfo.flight_status ?? null,
                flight_departure_time: flightStatusInfo.departure?.actual || flightStatusInfo.departure?.estimated || flightStatusInfo.departure?.scheduled || null,
                flight_arrival_time: flightStatusInfo.arrival?.actual || flightStatusInfo.arrival?.estimated || flightStatusInfo.arrival?.scheduled || null,
                flight_departure_airport: flightStatusInfo.departure?.airport ?? null,
                flight_arrival_airport: flightStatusInfo.arrival?.airport ?? null,
                flight_airline_name: flightStatusInfo.airline?.name ?? null,
                flight_departure_terminal: flightStatusInfo.departure?.terminal ?? null,
                flight_arrival_terminal: flightStatusInfo.arrival?.terminal ?? null,
                flight_departure_gate: flightStatusInfo.departure?.gate ?? null,
                flight_arrival_gate: flightStatusInfo.arrival?.gate ?? null,
                flight_departure_delay: flightStatusInfo.departure?.delay ?? null,
                flight_arrival_delay: flightStatusInfo.arrival?.delay ?? null,
                flight_last_checked: new Date().toISOString()
            };

            const { data: updatedReservation, error: updateError } = await supabase
                .from('reservations')
                .update(updateData)
                .eq('id', reservation.id)
                .select(`
                    *,
                    locations:pickup_location_id (id, name, bolge:bolge_id(name)),
                    dropoff_location:dropoff_location_id (id, name, bolge:bolge_id(name)),
                    vehicles (id, name, capacity, plate_number),
                    suppliers (id, name),
                    flight_status,
                    flight_departure_time,
                    flight_arrival_time,
                    flight_departure_airport,
                    flight_arrival_airport,
                    flight_airline_name,
                    flight_departure_terminal,
                    flight_arrival_terminal,
                    flight_departure_gate,
                    flight_arrival_gate,
                    flight_departure_delay,
                    flight_arrival_delay,
                    flight_last_checked
                 `)
                .single();

            if (updateError) throw updateError;

            if (updatedReservation) {
                setReservation(updatedReservation as Reservation);
                toast.success("Uçuş bilgileri rezervasyona başarıyla kaydedildi.");
            } else {
                 toast.error("Uçuş bilgileri kaydedildi ancak güncel veri alınamadı.");
            }

        } catch (err: unknown) {
            console.error("Uçuş bilgileri kaydedilirken hata:", err);
            toast.error(err instanceof Error ? err.message : "Uçuş bilgileri kaydedilirken bir hata oluştu.");
        } finally {
            setIsSavingFlightStatus(false);
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const processedValue = e.target.type === 'number' ? (parseFloat(value) || 0) : value;
        setFormData(prev => ({
            ...prev,
            [name]: processedValue,
        }));
    };

    const handleSelectChange = (name: keyof EditFormData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCancelEdit = () => {
        if (originalFormData) {
            setFormData(originalFormData);
        }
        setIsEditing(false);
    };

    const handleUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (!reservation || !originalFormData) return;
        setIsUpdating(true);

        const changedFields: Partial<EditFormData> = {};
        let hasChanges = false;

        if (originalFormData) {
            if (formData.customer_name !== originalFormData.customer_name) { changedFields.customer_name = formData.customer_name; hasChanges = true; }
            if (formData.customer_email !== originalFormData.customer_email) { changedFields.customer_email = formData.customer_email; hasChanges = true; }
            if (formData.customer_phone !== originalFormData.customer_phone) { changedFields.customer_phone = formData.customer_phone; hasChanges = true; }
            if (formData.passenger_count !== originalFormData.passenger_count) { changedFields.passenger_count = formData.passenger_count; hasChanges = true; }
            if (formData.flight_number !== originalFormData.flight_number) { changedFields.flight_number = formData.flight_number; hasChanges = true; }
            if (formData.notes !== originalFormData.notes) { changedFields.notes = formData.notes; hasChanges = true; }
            if (formData.status !== originalFormData.status) { changedFields.status = formData.status; hasChanges = true; }
            if (formData.payment_status !== originalFormData.payment_status) { changedFields.payment_status = formData.payment_status; hasChanges = true; }
            if (formData.supplier_id !== originalFormData.supplier_id) { changedFields.supplier_id = formData.supplier_id; hasChanges = true; }
        }

        if (!hasChanges) {
            toast.info("Değişiklik yapılmadı.");
            setIsUpdating(false);
            setIsEditing(false);
            return;
        }
        
        const updateDataForSupabase: Partial<Omit<Reservation, 'id' | 'created_at' | 'updated_at' | 'locations' | 'dropoff_location' | 'vehicles' | 'suppliers'>> = {};

        if (changedFields.customer_name !== undefined) updateDataForSupabase.customer_name = changedFields.customer_name;
        if (changedFields.customer_email !== undefined) updateDataForSupabase.customer_email = changedFields.customer_email;
        if (changedFields.customer_phone !== undefined) updateDataForSupabase.customer_phone = changedFields.customer_phone;
        if (changedFields.passenger_count !== undefined) {
            const pc = Number(changedFields.passenger_count);
            updateDataForSupabase.passenger_count = isNaN(pc) ? 0 : pc;
        }
        if (changedFields.flight_number !== undefined) updateDataForSupabase.flight_number = changedFields.flight_number;
        if (changedFields.notes !== undefined) updateDataForSupabase.notes = changedFields.notes;
        if (changedFields.status !== undefined) updateDataForSupabase.status = changedFields.status;
        if (changedFields.payment_status !== undefined) updateDataForSupabase.payment_status = changedFields.payment_status;
        if (changedFields.supplier_id !== undefined) {
            const supId = changedFields.supplier_id;
            updateDataForSupabase.supplier_id = (supId && supId !== 'null' && supId.trim() !== '') ? Number(supId) : null;
        }

        try {
            const { data: updatedDbReservation, error: updateError } = await supabase
                .from('reservations')
                .update(updateDataForSupabase)
                .eq('id', reservation.id)
                .select(`
                    *,
                    locations:pickup_location_id (id, name, bolge (name)),
                    dropoff_location:dropoff_location_id (id, name, bolge (name)),
                    vehicles (id, name, capacity, plate_number),
                    suppliers (id, name)
                `)
                .single();

            if (updateError) throw updateError;

            if (updatedDbReservation) {
                setReservation(updatedDbReservation);
                const newFormDataFromDb: EditFormData = {
                    customer_name: updatedDbReservation.customer_name ?? '',
                    customer_email: updatedDbReservation.customer_email ?? '',
                    customer_phone: updatedDbReservation.customer_phone ?? '',
                    passenger_count: updatedDbReservation.passenger_count ?? 1,
                    flight_number: updatedDbReservation.flight_number ?? null,
                    notes: updatedDbReservation.notes ?? null,
                    status: updatedDbReservation.status ?? 'pending',
                    payment_status: updatedDbReservation.payment_status ?? 'pending',
                    supplier_id: updatedDbReservation.supplier_id?.toString() ?? null,
                };
                setFormData(newFormDataFromDb);
                setOriginalFormData(newFormDataFromDb); 
                
                toast.success('Rezervasyon başarıyla güncellendi!');
                setIsEditing(false);
            }
        } catch (err: unknown) {
            console.error("Error updating reservation:", err);
            const message = err instanceof Error ? err.message : 'Rezervasyon güncellenirken bilinmeyen bir hata oluştu.';
            toast.error(message);
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                 <Skeleton className="h-8 w-32 mb-6" />
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                 </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-6 flex flex-col items-center justify-center h-[calc(100vh-200px)]">
                 <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                 <h2 className="text-xl font-semibold mb-2">Hata!</h2>
                 <p className="text-center text-muted-foreground">{error}</p>
                 <Button onClick={() => router.back()} className="mt-6">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                </Button>
            </div>
        )
    }

    if (!reservation) {
        return (
             <div className="container mx-auto p-6 flex flex-col items-center justify-center h-[calc(100vh-200px)]">
                 <p>Rezervasyon bulunamadı.</p>
                  <Button onClick={() => router.back()} className="mt-6">
                     <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                 </Button>
             </div>
         )
    }

    return (
        <div className="container mx-auto p-6">
            <Toaster position="top-center" />
            <form onSubmit={handleUpdate}>
                <div className="flex items-center justify-between mb-6">
                    <Button variant="outline" onClick={() => router.back()} type="button">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Rezervasyon Listesine Dön
                    </Button>
                    <div>
                        {isEditing ? (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleCancelEdit} type="button"><X className="mr-2 h-4 w-4" /> İptal</Button>
                                <Button type="submit" disabled={isUpdating}>
                                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Kaydet
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={() => setIsEditing(true)} type="button"><Pencil className="mr-2 h-4 w-4" /> Düzenle</Button>
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl font-semibold">Rezervasyon Kodu: {reservation.code}</CardTitle>
                            <div className="flex flex-col items-end text-sm text-muted-foreground">
                                <span>Oluşturulma: {formatDateTime(reservation.created_at)}</span>
                                <span>Güncellenme: {formatDateTime(reservation.updated_at)}</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-primary">Müşteri Bilgileri</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <EditableField
                                        label="Müşteri Adı" name="customer_name"
                                        value={formData.customer_name} originalValue={originalFormData?.customer_name ?? ''}
                                        isEditing={isEditing} onChange={handleInputChange} onSelectChange={handleSelectChange} Icon={User}
                                    />
                                    <EditableField
                                        label="E-posta" name="customer_email"
                                        value={formData.customer_email} originalValue={originalFormData?.customer_email ?? ''}
                                        isEditing={isEditing} onChange={handleInputChange} onSelectChange={handleSelectChange} Icon={Mail} type="email"
                                    />
                                    <EditableField
                                        label="Telefon" name="customer_phone"
                                        value={formData.customer_phone} originalValue={originalFormData?.customer_phone ?? ''}
                                        isEditing={isEditing} onChange={handleInputChange} onSelectChange={handleSelectChange} Icon={Phone} type="tel"
                                    />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-primary">Yolculuk Detayları</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <MapPin className="mr-2 h-4 w-4" /> Alış Lokasyonu
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {reservation.locations?.name ?? '-'}
                                            <div className="text-sm text-muted-foreground">
                                                {reservation.locations?.bolge ? `(${reservation.locations.bolge.name})` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <MapPin className="mr-2 h-4 w-4" /> Bırakış Lokasyonu
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {reservation.dropoff_location?.name ?? '-'}
                                            <div className="text-sm text-muted-foreground">
                                                {reservation.dropoff_location?.bolge ? `(${reservation.dropoff_location.bolge.name})` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <CalendarClock className="mr-2 h-4 w-4" /> Rezervasyon Zamanı
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {formatDateTime(reservation.reservation_time)}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <Car className="mr-2 h-4 w-4" /> Araç
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {reservation.vehicles?.name ?? '-'}
                                            <div className="text-sm text-muted-foreground">
                                                {reservation.vehicles?.plate_number ? `(${reservation.vehicles.plate_number})` : ''} {reservation.vehicles?.capacity ? `- ${reservation.vehicles.capacity} Kişi` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <EditableField
                                        label="Yolcu Sayısı" name="passenger_count"
                                        value={formData.passenger_count} originalValue={originalFormData?.passenger_count ?? 1}
                                        isEditing={isEditing} onChange={handleInputChange} onSelectChange={handleSelectChange} Icon={Users} type="number"
                                    />
                                    <div className="md:col-span-3">
                                        <EditableField label="Notlar" name="notes" value={formData.notes} originalValue={originalFormData?.notes ?? ''} isEditing={isEditing} onChange={handleInputChange} onSelectChange={handleSelectChange} Icon={StickyNote} type="textarea" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-primary">Uçuş Bilgileri</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                    <div>
                                        {isEditing ? (
                                            <EditableField label="Uçuş No" name="flight_number" value={formData.flight_number} originalValue={originalFormData?.flight_number ?? null} isEditing={isEditing} onChange={handleInputChange} onSelectChange={handleSelectChange} Icon={Plane} />
                                        ) : (
                                            <div className="flex flex-col space-y-1">
                                                <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                                    <Plane className="mr-2 h-4 w-4" /> Uçuş No
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base mt-1">{reservation.flight_number || '-'}</span>
                                                    {reservation.flight_number && (
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="outline" size="icon" className="h-7 w-7 flex-shrink-0" onClick={fetchFlightStatus} disabled={isFetchingFlightStatus} title="Uçuş Durumunu Kontrol Et" type="button">
                                                                    {isFetchingFlightStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-80">
                                                                <div className="grid gap-4">
                                                                    <div className="space-y-1">
                                                                        <h4 className="font-medium leading-none">Uçuş Durumu ({reservation.flight_number})</h4>
                                                                        <p className="text-xs text-muted-foreground">AviationStack API canlı verileri.</p>
                                                                    </div>
                                                                    <div className="grid gap-2 text-sm">
                                                                        {isFetchingFlightStatus && <div className="flex items-center justify-center p-4 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Yükleniyor...</div>}
                                                                        {flightFetchError && <div className="text-red-600 flex items-center text-xs"><AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" /> {flightFetchError}</div>}
                                                                        {flightStatusInfo && !flightFetchError && (
                                                                            <>
                                                                                <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1">
                                                                                    <Info className="h-4 w-4 text-muted-foreground"/> <span className="font-semibold">Durum:</span> <Badge variant={flightStatusInfo.flight_status === 'landed' ? 'success' : flightStatusInfo.flight_status === 'scheduled' ? 'secondary' : flightStatusInfo.flight_status === 'cancelled' ? 'destructive' : 'outline'}>{flightStatusTranslations[flightStatusInfo.flight_status] || flightStatusInfo.flight_status?.toUpperCase()}</Badge>
                                                                                    <PlaneTakeoff className="h-4 w-4 text-muted-foreground"/> <span className="font-semibold">Plan. Kalkış:</span> <span>{formatDateTime(flightStatusInfo.departure?.scheduled)}</span>
                                                                                    <PlaneTakeoff className="h-4 w-4 text-muted-foreground"/> <span className="font-semibold">Gerçek Kalkış:</span> <span>{formatDateTime(flightStatusInfo.departure?.actual) || '-'}</span>
                                                                                    <CalendarClock className="h-4 w-4 text-muted-foreground"/> <span className="font-semibold">Plan. Varış:</span> <span>{formatDateTime(flightStatusInfo.arrival?.scheduled)}</span>
                                                                                    <CalendarClock className="h-4 w-4 text-muted-foreground"/> <span className="font-semibold">Tahmini Varış:</span> <span>{formatDateTime(flightStatusInfo.arrival?.estimated) || '-'}</span>
                                                                                    <CalendarClock className="h-4 w-4 text-muted-foreground"/> <span className="font-semibold">Gerçek Varış:</span> <span>{formatDateTime(flightStatusInfo.arrival?.actual) || '-'}</span>
                                                                                    {(flightStatusInfo.departure?.delay || flightStatusInfo.arrival?.delay) && (
                                                                                        <>
                                                                                         <AlertCircle className="h-4 w-4 text-orange-500"/> <span className="font-semibold text-orange-500">Gecikme:</span>
                                                                                         <span className="text-orange-500">
                                                                                             {flightStatusInfo.departure?.delay ? `Kalkış ${flightStatusInfo.departure.delay} dk` : ''}
                                                                                             {flightStatusInfo.departure?.delay && flightStatusInfo.arrival?.delay ? ', ' : ''}
                                                                                             {flightStatusInfo.arrival?.delay ? `Varış ${flightStatusInfo.arrival.delay} dk` : ''}
                                                                                         </span>
                                                                                        </>
                                                                                     )}
                                                                                </div>
                                                                                <Button size="sm" className="mt-4 w-full" onClick={saveFlightStatusToReservation} disabled={isSavingFlightStatus}>
                                                                                    {isSavingFlightStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2" />} Rezervasyona Kaydet
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <Info className="mr-2 h-4 w-4" /> Kayıtlı Uçuş Durumu
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {reservation.flight_status ? <Badge variant={reservation.flight_status === 'landed' ? 'success' : reservation.flight_status === 'scheduled' ? 'secondary' : reservation.flight_status === 'cancelled' ? 'destructive' : 'outline'}>{flightStatusTranslations[reservation.flight_status] || reservation.flight_status.toUpperCase()}</Badge> : '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <CalendarClock className="mr-2 h-4 w-4" /> Kayıtlı Kalkış Saati
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {formatDateTime(reservation.flight_departure_time) || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <CalendarClock className="mr-2 h-4 w-4" /> Kayıtlı Varış Saati
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {formatDateTime(reservation.flight_arrival_time) || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <PlaneTakeoff className="mr-2 h-4 w-4" /> Kalkış Havaalanı
                                        </Label>
                                        <div className="mt-1 text-base truncate" title={reservation.flight_departure_airport ?? ''}>
                                            {reservation.flight_departure_airport || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <PlaneTakeoff className="mr-2 h-4 w-4 rotate-180" /> Varış Havaalanı
                                        </Label>
                                        <div className="mt-1 text-base truncate" title={reservation.flight_arrival_airport ?? ''}>
                                            {reservation.flight_arrival_airport || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <Info className="mr-2 h-4 w-4" /> Havayolu
                                        </Label>
                                        <div className="mt-1 text-base truncate" title={reservation.flight_airline_name ?? ''}>
                                            {reservation.flight_airline_name || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <Info className="mr-2 h-4 w-4" /> Kalkış Terminal/Kapı
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {reservation.flight_departure_terminal || '-'} / {reservation.flight_departure_gate || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <Info className="mr-2 h-4 w-4" /> Varış Terminal/Kapı
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {reservation.flight_arrival_terminal || '-'} / {reservation.flight_arrival_gate || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <AlertCircle className="mr-2 h-4 w-4" /> Gecikme (Kalkış/Varış)
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {reservation.flight_departure_delay !== null ? `${reservation.flight_departure_delay} dk` : '-'} / {reservation.flight_arrival_delay !== null ? `${reservation.flight_arrival_delay} dk` : '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <CalendarClock className="mr-2 h-4 w-4" /> Son Kontrol Zamanı
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {formatDateTime(reservation.flight_last_checked) || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-primary">Ödeme ve Durum Bilgileri</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                                            <CircleDollarSign className="mr-2 h-4 w-4" /> Toplam Fiyat
                                        </Label>
                                        <div className="mt-1 text-base">
                                            {formatCurrency(reservation.total_price)}
                                        </div>
                                    </div>
                                    <EditableField
                                        label="Rezervasyon Durumu" name="status"
                                        value={formData.status} originalValue={originalFormData?.status ?? 'pending'}
                                        isEditing={isEditing} onChange={handleInputChange} onSelectChange={handleSelectChange} Icon={Info} type="select-status"
                                    />
                                    <EditableField
                                        label="Ödeme Durumu" name="payment_status"
                                        value={formData.payment_status} originalValue={originalFormData?.payment_status ?? 'pending'}
                                        isEditing={isEditing} onChange={handleInputChange} onSelectChange={handleSelectChange} Icon={CreditCard} type="select-payment"
                                    />
                                    <EditableField
                                        label="Tedarikçi" name="supplier_id"
                                        value={formData.supplier_id} originalValue={originalFormData?.supplier_id ?? null}
                                        isEditing={isEditing} onChange={handleInputChange} onSelectChange={handleSelectChange} Icon={Building} type="select-supplier" suppliers={suppliers}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}