'use client'

// import React, { useState, useEffect, useCallback, useRef } from 'react'; // Kaldırıldı
// import Image from 'next/image'; // Kaldırıldı
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
// ... (diğer importlar)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, Car, Users, Check, CreditCard, Loader2, ServerCrash, User } from 'lucide-react'
import { ReservationSummary } from '@/components/reservation-summary'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AxiosError } from 'axios'
import apiClient from '@/lib/api/client'

// Kullanılmıyor
/*
interface ApiErrorResponse { 
    message: string; 
    errors?: { [key: string]: string[] }; 
}
*/

// Vehicle arayüzü burada tanımlı olmalı
interface Vehicle {
	id: number
	name: string
	type: string
	capacity: number
	luggage_capacity?: number | null
	image_url?: string | null
}

interface PriceDetailsShared {
	per_person: number
	pricing_tiers: { passengers: number; total_price: number }[]
	currency: string
}

interface PriceDetailsPrivate {
	total_price: number
	currency: string
}

// TransferOption arayüzünü export et
export interface TransferOption {
	id: string
	type: 'private' | 'shared'
	vehicle: Vehicle // Vehicle arayüzünü kullanır
	price_details: PriceDetailsShared | PriceDetailsPrivate
	estimated_duration: string | null
	distance: string | null
}

// ... (Diğer arayüzler: Extra, SelectedExtraSummary, ReservationSummaryProps, AracSecimiContentProps)

// ... (Helper fonksiyonlar: formatReservationDate, getVehicleImageUrl, formatCurrency, formatDateTimeForAPI)

// AracSecimiContentProps Arayüzü (Tekrar eklendi ve export edildi)
export interface AracSecimiContentProps {
	transferOptions: TransferOption[]; // TransferOption tipini kullanır
	transferError: string | null;
	searchParams: {
		pickup: number | null;
		dropoff: number | null;
		date: string | null;
		passengers: number;
		pickupLocationName?: string;
		dropoffLocationName?: string;
	};
}

export default function AracSecimiContent({ 
    transferOptions,
    transferError,
    searchParams
}: AracSecimiContentProps) {
    // ... (Component içeriği)
} 