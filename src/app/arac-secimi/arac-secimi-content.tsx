'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, Car, Users, Check, CreditCard, Loader2, Ticket, Timer } from 'lucide-react'
import { ReservationSummary } from '@/components/reservation-summary'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AxiosError } from 'axios'
import apiClient from '@/lib/api/client'
import { type ReservationData } from '@/app/rezervasyon-basarili/page'
import { IMaskInput } from 'react-imask'

interface ApiErrorResponse {
  message: string;
  errors?: { [key: string]: string[] };
}

export interface VehicleTypeOption {
  type: string; // e.g., "Mercedes VITO" (used as ID-like, for image)
  name: string; // e.g., "Mercedes Vito" (display name)
  capacity: number;
  price: number;
  currency: string;
  price_type: 'per_vehicle' | 'per_person';
  transfer_type: 'private' | 'shared'; // This was part of the old TransferOption, now part of VehicleTypeOption
  vehicle_id_example: number; // Example vehicle ID of this type
  // image_url can be derived using getVehicleImageUrl(type)
  // luggage_capacity is not in the new API response for vehicle types
  // estimated_duration and distance are not in the new API response
}

interface Extra {
  id: number;
  name: string;
  price: number;
}

interface SelectedExtraSummary {
  id: number;
  name: string;
  price: number;
}

interface ReservationSummaryProps {
    pickupLocationName?: string;
    dropoffLocationName?: string;
    formattedReservationDate?: string;
    passengerCount?: number | string;
    selectedVehicleName?: string;
    selectedTransferType?: string; 
    totalPrice?: number;
    currency?: string;
    selectedExtrasList?: SelectedExtraSummary[];
}

export interface AracSecimiContentProps {
	transferOptions: VehicleTypeOption[]
	transferError: string | null
	searchParams: {
		pickup: number | null
		dropoff: number | null
		date: string | null
		passengers: number
		pickupLocationName?: string
		dropoffLocationName?: string
		reservationCode?: string
	}
}

function formatReservationDate(dateString: string | null): string {
  if (!dateString) return 'Tarih belirtilmedi'
  try {
    const date = new Date(dateString)
    return format(date, 'PPP EEEE HH:mm', { locale: tr })
  } catch (error) {
    console.error('Tarih formatlama hatası:', error)
    return 'Geçersiz tarih'
  }
}

const getVehicleImageUrl = (vehicleType: string): string | null => {
  const normalizedVehicleType = vehicleType.toLowerCase().replace(/\s+/g, '');
  if (normalizedVehicleType.includes('vito')) {
    return '/mercedes-vito-siyah.jpg'; 
  } else if (normalizedVehicleType.includes('sprinter')) {
    return '/mercedes-sprinter-siyah.jpg'; 
  } else if (normalizedVehicleType.includes('sclass') || normalizedVehicleType.includes('s-class') || normalizedVehicleType.includes('s_class') || normalizedVehicleType.includes('mercedesclass')) {
    return '/mercedes_s_class.jpeg';
  } else if (normalizedVehicleType.includes('range') || normalizedVehicleType.includes('rover') || normalizedVehicleType.includes('rangerover')) {
    return '/range_rover.jpeg';
  }
  return null;
};

const formatCurrency = (amount: number | undefined, currencyCode: string = 'TRY'): string => {
  if (amount === undefined || isNaN(amount)) {
    return 'Fiyat Yok';
  }
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDateTimeForAPI = (dateString: string | null): string | null => {
  if (!dateString) return null;
  try {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    console.error('API için tarih formatlama hatası:', error);
    return null;
  }
};

export default function AracSecimiContent({ 
  transferOptions, 
  transferError, 
  searchParams 
}: AracSecimiContentProps) {
  
  const router = useRouter();
  const formSectionRef = useRef<HTMLDivElement>(null);

  // Helper Stepper Component
  const Stepper = ({ currentStage }: { currentStage: number }) => {
    const stages = [
      { id: 1, title: 'Araç Seçimi' },
      { id: 2, title: 'Ekstralar & Kontrol' },
      { id: 3, title: 'Yolcu & Ödeme' },
    ];
  
    return (
      <div className="w-full mb-6 pt-2">
        <div className="flex items-start">
          {stages.map((stage, index) => (
            <React.Fragment key={stage.id}>
              <div className="flex flex-col items-center text-center w-1/3 px-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-medium transition-all duration-300
                              ${currentStage === stage.id ? 'border-primary bg-primary text-primary-foreground scale-110' : ''}
                              ${currentStage > stage.id ? 'border-primary bg-primary text-primary-foreground' : ''}
                              ${currentStage < stage.id ? 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400' : ''}`}
                >
                  {currentStage > stage.id ? <Check size={20} /> : stage.id}
                </div>
                <p className={`mt-2 text-xs ${currentStage === stage.id ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {stage.title}
                </p>
              </div>
              {index < stages.length - 1 && (
                <div className={`flex-1 h-1 mt-5 mx-2 rounded 
                                ${currentStage > stage.id ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };
  // End of Stepper Component

  const [selectedOption, setSelectedOption] = useState<VehicleTypeOption | null>(null)
  const [showUserInfoForm, setShowUserInfoForm] = useState(false)
  const [extras, setExtras] = useState<Extra[]>([])
  const [selectedExtras, setSelectedExtras] = useState<number[]>([])
  const [isLoadingExtras, setIsLoadingExtras] = useState(false)
  const [finalTotalPrice, setFinalTotalPrice] = useState<number | undefined>(undefined);
  const [selectedExtrasDetails, setSelectedExtrasDetails] = useState<SelectedExtraSummary[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isEditingLocked, setIsEditingLocked] = useState(false);
  const [displayReservationCode, setDisplayReservationCode] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isCodeExpired, setIsCodeExpired] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card'); // Default to card
  const [reservationCode, setReservationCode] = useState<string | null>(null); // State for reservation code
  const [availableExtras, setAvailableExtras] = useState<Extra[]>([]);
  const [paymentRedirectInfo, setPaymentRedirectInfo] = useState<{
    show: boolean;
    message: string;
    countdown: number;
  }>({ show: false, message: '', countdown: 0 });

  const initialFormData = useMemo(() => ({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    flightCode: '',
    notes: '',
    cardholderName: '', 
    cardNumber: '',
    expiryDate: '',
    cvc: '',
  }), []);

  const [formData, setFormData] = useState(initialFormData);

  // Callback to reset form and selections
  const resetFormAndSelections = useCallback(() => {
    console.log("[AracSecimiContent] resetFormAndSelections called.");
    setSelectedOption(null);
    setFormData(initialFormData);
    setSelectedExtras([]);
    setSelectedExtrasDetails([]);
    setShowUserInfoForm(false);
    setIsEditingLocked(false);
    setSubmitError(null);
    setEmailError(null);
    setFinalTotalPrice(undefined);
    setSelectedPaymentMethod('card');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('tempReservationDetails');
    }
    // console.log("[AracSecimiContent] Form and selections have been reset.");
  }, [initialFormData]);

  const calculateBasePrice = useCallback((option: VehicleTypeOption | null): number | undefined => {
    if (!option) return undefined;
    // Assuming price_type 'per_vehicle', passenger count is not directly used for base price
    // If 'per_person', then searchParams.passengers would be needed.
    // For now, VehicleTypeOption provides a final price.
    return option.price;
  }, []);

  const calculateExtrasTotal = useCallback((): number => {
    return selectedExtras.reduce((total: number, extraId: number) => {
      const extra = extras.find((e: Extra) => e.id === extraId);
      const priceAsNumber = extra?.price ? parseFloat(extra.price.toString()) : 0;
      return total + (isNaN(priceAsNumber) ? 0 : priceAsNumber);
    }, 0);
  }, [selectedExtras, extras]);

  const fetchExtras = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }
    setIsLoadingExtras(true);
    try {
      const response = await apiClient.get<{ data: Extra[] }>('/extras');
      setExtras(response.data.data || []);
    } catch (error: unknown) {
      console.error('Ekstra hizmetler alınamadı:', error);
    } finally {
      setIsLoadingExtras(false);
    }
  }, []);

  useEffect(() => {
    fetchExtras();
  }, [fetchExtras]);

  useEffect(() => {
    const details = selectedExtras.map(id => {
      const extra = extras.find(e => e.id === id);
      return extra ? { id: extra.id, name: extra.name, price: extra.price } : null;
    }).filter((e): e is SelectedExtraSummary => e !== null);
    setSelectedExtrasDetails(details);
  }, [selectedExtras, extras]);

  // Unified useEffect for session initialization, restoration, and new code generation
  useEffect(() => {
    const urlCode = searchParams.reservationCode;
    console.log("[AracSecimiContent] Main session useEffect triggered. urlCode:", urlCode, "transferOptions loaded:", transferOptions && transferOptions.length > 0);

    const initializeNewSession = () => {
      console.log("[AracSecimiContent] initializeNewSession called.");
      resetFormAndSelections(); // Ensure form is reset first

      const newCode = uuidv4().substring(0, 8).toUpperCase();
      setReservationCode(newCode);
      setDisplayReservationCode(newCode);
      const newRemainingTime = 30 * 60; // 30 minutes
      setRemainingTime(newRemainingTime);
      setIsCodeExpired(false);

      if (typeof window !== 'undefined') {
        const expires = Date.now() + newRemainingTime * 1000;
        sessionStorage.setItem('tempReservation', JSON.stringify({ code: newCode, expiresAt: expires }));
        sessionStorage.removeItem('tempReservationDetails'); // Ensure old details are cleared
        // console.log(`[AracSecimiContent] New code ${newCode} generated, timer set, form reset.`);
      }
    };

    if (!urlCode) {
      initializeNewSession();
    } else {
      // urlCode is present, attempt to restore session
      setReservationCode(urlCode); // Set the primary reservation code from URL

      if (typeof window !== 'undefined') {
        const storedSessionData = sessionStorage.getItem('tempReservation');
        const storedDetailsData = sessionStorage.getItem('tempReservationDetails');

        if (storedSessionData) {
          try {
            const { code: storedCode, expiresAt } = JSON.parse(storedSessionData);

            if (storedCode === urlCode) {
              const now = Date.now();
              const timeLeft = Math.round((expiresAt - now) / 1000);

              if (timeLeft > 0) {
                // console.log(`[AracSecimiContent] Restoring session for ${urlCode}. Time left: ${timeLeft}s`);
                setDisplayReservationCode(storedCode);
                setRemainingTime(timeLeft);
                setIsCodeExpired(false);

                if (storedDetailsData && transferOptions && transferOptions.length > 0) {
                  // console.log("[AracSecimiContent] Restoring details from tempReservationDetails.");
                  try {
                    const {
                      vehicleType,
                      formData: restoredFormData,
                      selectedExtras: restoredSelectedExtras
                    } = JSON.parse(storedDetailsData);

                    const matchingOption = transferOptions.find(opt => opt.type === vehicleType);
                    if (matchingOption) {
                      setSelectedOption(matchingOption);
                      if (restoredFormData) setFormData(restoredFormData);
                      if (restoredSelectedExtras) setSelectedExtras(restoredSelectedExtras);
                      setShowUserInfoForm(true);
                      setIsEditingLocked(true);
                    } else {
                      // console.warn("[AracSecimiContent] Vehicle from session not in options. Starting new session.");
                      initializeNewSession(); // Fallback to new session if details are inconsistent
                    }
                  } catch {
                    // console.error("[AracSecimiContent] Failed to parse tempReservationDetails. Starting new session.", _parseError);
                    initializeNewSession(); // Fallback to new session
                  }
                } else {
                  // No details to restore, or options not ready, but session code and timer are valid.
                  // This might mean user selected a vehicle, but form not filled yet.
                  // Or, they are returning to a state before vehicle selection was fully processed for session storage.
                  // If `resetFormAndSelections` was called previously, this state should be fine.
                  // If `storedDetailsData` is null but session is valid, it means we proceed with the current (likely reset) form state.
                  // console.log("[AracSecimiContent] Valid session but no/incomplete details in sessionStorage or transferOptions not ready.");
                }
              } else {
                // console.warn(`[AracSecimiContent] Session for ${urlCode} expired. Initializing new session.`);
                initializeNewSession(); // Session expired, treat as new
              }
            } else {
              // console.warn(`[AracSecimiContent] URL code ${urlCode} mismatch with stored code ${storedCode}. Initializing new session.`);
              initializeNewSession(); // Code mismatch, treat as new
            }
          } catch {
            // console.error("[AracSecimiContent] Failed to parse tempReservation. Initializing new session.", _error);
            initializeNewSession(); // Parse error, treat as new
          }
        } else {
          // urlCode present, but no 'tempReservation' in sessionStorage. This means an invalid link or cleared session.
          // console.warn(`[AracSecimiContent] urlCode ${urlCode} present, but no session found in storage. Initializing new session.`);
          initializeNewSession();
        }
      }
    }
  // Key dependencies: if the URL code changes, or if vehicle options load (needed for restoring selection).
  // resetFormAndSelections is memoized and stable.
  }, [searchParams.reservationCode, transferOptions, resetFormAndSelections]);

  useEffect(() => {
    if (remainingTime === null || remainingTime <= 0 || isCodeExpired) {
      return;
    }

    const intervalId = setInterval(() => {
      setRemainingTime(prevTime => {
        if (prevTime === null || prevTime <= 1) {
          clearInterval(intervalId);
          setIsCodeExpired(true);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('tempReservation');
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [remainingTime, isCodeExpired]);

  useEffect(() => {
    const basePrice = calculateBasePrice(selectedOption);
    const extrasTotal = calculateExtrasTotal();
    if (basePrice !== undefined) {
      setFinalTotalPrice(basePrice + extrasTotal);
    } else {
      setFinalTotalPrice(undefined);
    }
  }, [selectedOption, selectedExtras, extras, calculateBasePrice, calculateExtrasTotal]);

  const handleOptionSelect = (option: VehicleTypeOption) => {
    if (isEditingLocked) return; // Prevent selection if editing is locked
    setSelectedOption(option);
    setSubmitError(null); // Clear previous submission errors
  };

  const handleOptionDeselect = () => {
    setSelectedOption(null);
    setShowUserInfoForm(false); 
    setSelectedExtras([]);
    setFinalTotalPrice(undefined);
    setSelectedExtrasDetails([]);
  };

  const handleExtraSelect = (extraId: number) => {
    setSelectedExtras(prev => {
      if (prev.includes(extraId)) {
        return prev.filter(id => id !== extraId);
      } else {
        return [...prev, extraId];
      }
    });
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'email') {
      if (value && !validateEmail(value)) {
        setEmailError('Lütfen geçerli bir e-posta adresi girin.');
      } else {
        setEmailError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('[handleSubmit] Current selectedPaymentMethod before validation:', selectedPaymentMethod); // Log 1

    if (!selectedOption) {
      setSubmitError("Lütfen bir araç seçin.");
      return;
    }
    if (!validateEmail(formData.email)) {
        setEmailError("Geçerli bir e-posta adresi giriniz.");
        return;
    }
    setEmailError(null); // Clear email error if validation passes

    if (isCodeExpired) {
      setSubmitError("Rezervasyon süreniz doldu. Lütfen yeni bir rezervasyon kodu oluşturun.");
      return;
    }

    // Ensure reservationCode exists before submitting
    if (!reservationCode) {
      setSubmitError("Rezervasyon kodu oluşturulamadı. Lütfen sayfayı yenileyin.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const reservationDate = formatDateTimeForAPI(searchParams.date);
    if (!reservationDate) {
      setSubmitError("Rezervasyon tarihi geçersiz.");
      setIsSubmitting(false);
      return;
    }

    const basePrice = calculateBasePrice(selectedOption);
    if (basePrice === undefined) {
      setSubmitError("Araç fiyatı hesaplanamadı.");
      setIsSubmitting(false);
      return;
    }
    const extrasTotal = calculateExtrasTotal();
    const totalPrice = basePrice + extrasTotal;

    const selectedExtrasForPayload = selectedExtras.map(id => {
      const extra = extras.find(e => e.id === id);
      return extra ? { id: extra.id, name: extra.name, price: extra.price } : null;
    }).filter(e => e !== null);

    const payload = {
      pickup_location_id: searchParams.pickup,
      dropoff_location_id: searchParams.dropoff,
      reservation_date: reservationDate,
      passenger_count: searchParams.passengers,
      vehicle_id: selectedOption.vehicle_id_example, // Using example_id
      transfer_type: selectedOption.transfer_type, // from VehicleTypeOption
      customer_name: formData.firstName,
      customer_last_name: formData.lastName,
      customer_email: formData.email,
      customer_phone: formData.phone,
      flight_details: formData.flightCode,
      notes: formData.notes,
      total_price: totalPrice,
      currency: selectedOption.currency,
      payment_method: selectedPaymentMethod, // Use state here
      card_details: selectedPaymentMethod === 'card' ? {
        cardholder_name: formData.cardholderName,
        card_number: formData.cardNumber.replace(/\s/g, ''), // Boşlukları kaldır
        expiry_date: formData.expiryDate, // Already unmasked by iMask
        cvc: formData.cvc, // Already unmasked by iMask
      } : null, // Set to null if not card payment
      extras: selectedExtrasForPayload,
      status: 'pending_confirmation', // Default status
      code: reservationCode, // Send the client-generated reservation code
    };
    
    console.log('[handleSubmit] Payload to be sent:', JSON.stringify(payload, null, 2)); // Log 2

    // Store minimal details for potential re-edit if coming from confirmation link
    if (displayReservationCode) {
      sessionStorage.setItem('tempReservationDetails', JSON.stringify({
        pickup: searchParams.pickup,
        dropoff: searchParams.dropoff,
        date: searchParams.date,
        passengers: searchParams.passengers,
        vehicleType: selectedOption.type, // Store vehicle type
        formData,
        selectedExtras,
        totalPrice,
        currency: selectedOption.currency,
      }));
    }

    try {
      if (selectedPaymentMethod === 'card') {
        console.log('[handleSubmit] Processing card payment via TIKO Edge Function');
        
        // TIKO Sanal POS entegrasyonu
        const paymentData = {
          orderData: {
            orderId: reservationCode,
            amount: totalPrice,
            currency: selectedOption.currency,
            installment: 0 // Şimdilik taksitsiz
          },
          cardData: {
            cardName: formData.cardholderName,
            cardNo: formData.cardNumber.replace(/\s/g, ''), // Boşlukları kaldır
            cardCvv: formData.cvc,
            cardExpireMonth: formData.expiryDate.split('/')[0],
            cardExpireYear: formData.expiryDate.split('/')[1],
            cardType: '' // Şimdilik boş, gerekirse kart türü tespit edilebilir
          },
          userInfo: {
            userIp: '127.0.0.1', // Gerçek IP'yi almak için ek çalışma gerekebilir
            userName: `${formData.firstName} ${formData.lastName}`,
            userEmail: formData.email,
            userPhone: formData.phone,
            userAddress: ''
          },
          urls: {
            // TIKO callback için API endpoint kullan
            urlOk: `https://www.kibrishizlitransfer.com/api/tiko-callback?payment_status=success&reservation_code=${reservationCode}`,
            urlFail: `https://www.kibrishizlitransfer.com/api/tiko-callback?payment_status=failed&reservation_code=${reservationCode}`
          },
          description: `${searchParams.pickupLocationName} - ${searchParams.dropoffLocationName} Transfer`
        };

        // Supabase Edge Function'a istek gönder
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uxwzfghgqldhkkzsrlfu.supabase.co';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4d3pmZ2hncWxkaGtrenNybGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3ODE2MTgsImV4cCI6MjA2MTM1NzYxOH0.xAEZEE7zBqjcSDzREFFty5hHYSKLMVNRDTaFsHjTU9I';
        
        console.log('[handleSubmit] Calling Edge Function with payload:', paymentData);
        
        const paymentResponse = await fetch(`${supabaseUrl}/functions/v1/payment-process`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentData)
        });

        console.log('[handleSubmit] Edge Function response status:', paymentResponse.status);
        
        if (!paymentResponse.ok) {
          const errorText = await paymentResponse.text();
          console.error('[handleSubmit] Edge Function error:', errorText);
          throw new Error('Ödeme işlemi başlatılamadı');
        }

        const paymentResult = await paymentResponse.json();
        console.log('[handleSubmit] Edge Function result:', paymentResult);
        console.log('[handleSubmit] paymentResult.success:', paymentResult.success);
        console.log('[handleSubmit] paymentResult.tikoUrl:', paymentResult.tikoUrl);
        console.log('[handleSubmit] paymentResult.formData keys:', Object.keys(paymentResult.formData || {}));
        
        if (paymentResult.success && paymentResult.tikoUrl && paymentResult.formData) {
          console.log('[handleSubmit] TIKO URL validation:', {
            url: paymentResult.tikoUrl,
            isValidUrl: paymentResult.tikoUrl.includes('tikokart.com'),
            isSandbox: paymentResult.tikoUrl.includes('sandbox'),
            formDataSize: Object.keys(paymentResult.formData).length
          });
          
          // Önce rezervasyonu oluştur (ödeme pending durumunda)
          const reservationPayload = {
            ...payload,
            card_details: null, // Güvenlik için kart bilgilerini API'ye gönderme
            payment_status: 'PENDING',
            tiko_order_id: reservationCode
          };

          const response = await apiClient.post<{ code: string; [key: string]: unknown; }>('/reservations', reservationPayload);
          
          if (response.data?.code) {
            // 3D Secure yönlendirme bilgilendirmesi göster
            setPaymentRedirectInfo({
              show: true,
              message: '3D Secure doğrulama için banka sayfasına yönlendiriliyorsunuz...',
              countdown: 3
            });
            
            // 3 saniye geri sayım
            let count = 3;
            const countdownInterval = setInterval(() => {
              count--;
              setPaymentRedirectInfo(prev => ({ ...prev, countdown: count }));
              
              if (count <= 0) {
                clearInterval(countdownInterval);
                
                console.log('[handleSubmit] Countdown finished, redirecting to TIKO...');
                console.log('[handleSubmit] TIKO URL:', paymentResult.tikoUrl);
                console.log('[handleSubmit] Form Data:', paymentResult.formData);
                
                // Modal'ı gizle
                setPaymentRedirectInfo({ show: false, message: '', countdown: 0 });
                
                // Kısa bir bekleme süresi ekle (modal'ın kapanması için)
                setTimeout(() => {
                  // TIKO 3D Secure sayfasına yönlendir
                  const form = document.createElement('form');
                  form.method = 'POST';
                  form.action = paymentResult.tikoUrl;
                  form.style.display = 'none';
                  form.target = '_self'; // Aynı sekmede aç

                  // Form verilerini ekle
                  console.log('[handleSubmit] Processing form data:', paymentResult.formData);
                  Object.entries(paymentResult.formData).forEach(([key, value]) => {
                    console.log(`[handleSubmit] Adding form field: ${key} = ${value}`);
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = value as string;
                    form.appendChild(input);
                  });
                  
                  // Tüm form alanlarını tekrar logla
                  console.log('[handleSubmit] Final form fields:');
                  for (let i = 0; i < form.elements.length; i++) {
                    const element = form.elements[i] as HTMLInputElement;
                    console.log(`  ${element.name} = ${element.value}`);
                  }

                  document.body.appendChild(form);
                  console.log('[handleSubmit] Form created and appended, submitting...');
                  console.log('[handleSubmit] Form action:', form.action);
                  console.log('[handleSubmit] Form method:', form.method);
                  console.log('[handleSubmit] Form children count:', form.children.length);
                  
                  // Form'u submit et
                  try {
                    console.log('[handleSubmit] About to submit form to:', form.action);
                    form.submit();
                    console.log('[handleSubmit] Form submitted successfully!');
                    
                    // Debug: Form submission'dan sonra kısa bir alert (üretimde kaldırılacak)
                    setTimeout(() => {
                      console.log('[handleSubmit] Form submission completed, checking if still on same page...');
                    }, 1000);
                  } catch (error) {
                    console.error('[handleSubmit] Form submission error:', error);
                    setPaymentRedirectInfo({ show: false, message: '', countdown: 0 });
                    setSubmitError('3D Secure sayfasına yönlendirme başarısız oldu. Lütfen tekrar deneyin.');
                    setIsSubmitting(false);
                  }
                }, 100); // 100ms bekleme
              }
            }, 1000);
          } else {
            throw new Error('Rezervasyon oluşturulamadı');
          }
        } else {
          console.error('[handleSubmit] Payment processing failed:', paymentResult);
          throw new Error(paymentResult.error || 'Ödeme işlemi başarısız - Edge Function yanıtı geçersiz');
        }
      } else { // Diğer ödeme yöntemleri (Havale/EFT) için direkt API çağrısı
        const response = await apiClient.post<{ code: string; [key: string]: unknown; }>('/reservations', payload);
        if (response.data?.code) {
          const summaryForRedirect = JSON.stringify(summaryProps);
          const newReservationCode = response.data.code;
          router.push(`/rezervasyon-basarili?code=${newReservationCode}&summary=${encodeURIComponent(summaryForRedirect)}`);
        } else {
          throw new Error('Rezervasyon başarılı ancak yanıt formatı beklenenden farklı.');
        }
      }
    } catch (error: unknown) {
      console.error('Rezervasyon oluşturma hatası:', error);
      let errorMessage = 'Rezervasyonunuz oluşturulurken bir hata meydana geldi. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
      
      if (error instanceof AxiosError && error.response && error.response.status === 422) {
        const responseData = error.response.data as ApiErrorResponse;
        console.log('Backend 422 Yanıt Verisi:', responseData);
        
        if (responseData.errors) {
          const errorMessages = Object.entries(responseData.errors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('\n');
          errorMessage = `Lütfen aşağıdaki alanları kontrol edin:\n${errorMessages}`;
        } else if (responseData.message) {
            errorMessage = responseData.message;
      } else {
            errorMessage = `Doğrulama hatası: ${JSON.stringify(responseData)}`;
        }
      } else if (error instanceof AxiosError && error.response) {
          const responseData = error.response.data as ApiErrorResponse;
          if (responseData.message) {
              errorMessage = responseData.message;
          }
      } else if (error instanceof Error) {
          errorMessage = error.message;
      }
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryProps: ReservationSummaryProps = {
    pickupLocationName: searchParams.pickupLocationName,
    dropoffLocationName: searchParams.dropoffLocationName,
    formattedReservationDate: formatReservationDate(searchParams.date),
    passengerCount: searchParams.passengers,
    selectedVehicleName: selectedOption?.name,
    selectedTransferType: selectedOption?.transfer_type === 'private' ? 'Özel' : 'Paylaşımlı',
    totalPrice: finalTotalPrice,
    currency: selectedOption?.currency,
    selectedExtrasList: selectedExtrasDetails
  }

  const reservationSummaryData: Partial<ReservationData> | undefined = selectedOption ? {
      pickup_location: { id: searchParams.pickup ?? 0, name: searchParams.pickupLocationName ?? 'Bilinmiyor', type: 'location' },
      dropoff_location: { id: searchParams.dropoff ?? 0, name: searchParams.dropoffLocationName ?? 'Bilinmiyor', type: 'location' },
      reservation_time: searchParams.date ?? '',
      passenger_count: searchParams.passengers,
      vehicle: {
        id: selectedOption.vehicle_id_example,
        name: selectedOption.name,
        type: selectedOption.type,
        capacity: selectedOption.capacity,
        image_url: getVehicleImageUrl(selectedOption.type),
      },
      extras: selectedExtrasDetails.map(e => ({ id: e.id, name: e.name, price: e.price })),
      total_price: finalTotalPrice,
  } : undefined;

  // Determine current stage for Stepper
  let currentStage = 1;
  if (selectedOption) { 
    currentStage = 2; 
  }
  if (showUserInfoForm) { // This will override stage 2 if form is shown
    currentStage = 3; 
  }

  if (transferError) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Hata</AlertTitle>
        <AlertDescription>{transferError}</AlertDescription>
      </Alert>
    );
  }

  if (transferOptions.length === 0) {
    return (
       <Alert variant="default" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Uygun Araç Bulunamadı</AlertTitle>
        <AlertDescription>
          Belirttiğiniz kriterlere uygun araç bulunamadı. Lütfen farklı tarih veya yolcu sayısı deneyin ya da bizimle iletişime geçin.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-24 pb-8">
      {/* 3D Secure Yönlendirme Ekranı */}
      {paymentRedirectInfo.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit">
                <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl mb-2">3D Secure Doğrulama</CardTitle>
              <CardDescription className="text-base">
                {paymentRedirectInfo.message}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-6xl font-bold text-primary">
                {paymentRedirectInfo.countdown}
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Açılacak sayfada kredi kartınızın 3D Secure şifresini girin</p>
                <p>• İşlem tamamlandığında otomatik olarak sitemize döneceksiniz</p>
                <p>• Sayfayı kapatmayın ve bekleyin</p>
              </div>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {!isEditingLocked && (
            <>
              <h1 className="text-3xl font-bold">Araç Seçimi</h1>
              <p className="text-muted-foreground">
                Size uygun transfer seçeneğini belirleyin.
              </p>

              {transferOptions && transferOptions.length > 0 ? (
                <div className="space-y-6">
                  {transferOptions.map(option => {
                    const isSelected = selectedOption?.type === option.type;
                    const imageUrl = getVehicleImageUrl(option.type || '');

                    return (
                      <Card key={option.type} className={`overflow-hidden transition-all duration-300 rounded-lg ${isSelected ? 'border-primary border-2 shadow-md ring-1 ring-primary' : 'border hover:shadow-md'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center p-6 md:p-8">
                          <div className="md:col-span-1 flex justify-center items-center aspect-video md:aspect-auto bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden">
                            {imageUrl ? (
                                     <Image 
                                       src={imageUrl} 
                             alt={option.name}
                             width={300}
                             height={180}
                             className="object-cover w-full h-full"
                                     />
                                   ) : (
                              <div className="text-center text-muted-foreground p-4">
                                <Car size={48} className="mx-auto mb-2" />
                                Görsel Yok
                                     </div>
                            )}
                               </div>

                          <div className="md:col-span-2 flex flex-col justify-between space-y-3 md:space-y-0 md:pl-4">
                                 <div>
                              <h3 className="text-3xl font-bold mb-1.5">{option.name}</h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground mt-1 text-base">
                                <span className="flex items-center"><Users size={15} className="mr-1.5" /> Max. {option.capacity} Yolcu</span>
                                   </div>
                                 </div>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-2 md:mt-4 space-y-2 md:space-y-0">
                              <span className="text-4xl font-bold text-primary">
                                {formatCurrency(option.price, option.currency)}
                              </span>
                              {isSelected ? (
                                 <Button 
                                  onClick={handleOptionDeselect}
                                   size="lg"
                                  variant="outline"
                                  className="w-full md:w-auto"
                                  disabled={isEditingLocked}
                                 >
                                   Seçimi Kaldır
                                 </Button>
                              ) : (
                                <Button 
                                  onClick={() => handleOptionSelect(option)}
                                  size="lg"
                                  variant="default"
                                  className="w-full md:w-auto"
                                 >
                                  Seç
                                 </Button>
                              )}
                               </div>
                             </div>
                           </div>

                           {isSelected && (
                          <div className="bg-gray-50 dark:bg-gray-900 p-4 md:p-6 border-t">
                             <h3 className="text-xl font-semibold mb-4">Ekstra Hizmetler</h3>
                             {isLoadingExtras ? (
                                <div className="flex items-center justify-center text-muted-foreground">
                                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                   Ekstralar yükleniyor...
                                </div>
                             ) : extras.length > 0 ? (
                               <div className="space-y-3">
                                 {extras.map((extra) => {
                                     const isExtraSelected = selectedExtras.includes(extra.id);
                                     return (
                                     <div
                                         key={extra.id}
                                       onClick={() => {
                                        if (isEditingLocked) return;
                                        handleExtraSelect(extra.id)
                                     }}
                                     className={`flex items-center justify-between p-3 border rounded-md transition-all duration-200 ease-in-out ${
                                       isExtraSelected ? 'bg-primary/10 border-primary ring-1 ring-primary shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                                     } ${isEditingLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                   >
                                     <span className={`font-medium ${isExtraSelected ? 'text-primary' : ''}`}>{extra.name}</span>
                                     <div className="flex items-center space-x-3">
                                       <span className={`text-sm font-semibold ${isExtraSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                         {formatCurrency(extra.price, option.currency)}
                                       </span>
                                       <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isExtraSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                         {isExtraSelected && <Check size={12} className="text-primary-foreground" />}
                                       </div>
                                     </div>
                                   </div>
                                     );
                                   })}
                                 </div>
                             ) : (
                               <p className="text-muted-foreground">Uygun ekstra hizmet bulunmamaktadır.</p>
                               )}
                             </div>
                        )}
                       </Card>
                      )
                   })}
                 </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Uygun transfer seçeneği bulunamadı.</p>
              )}
            </>
          )}

          {showUserInfoForm && (
             <Card ref={formSectionRef} className="mt-8 border-primary border-2 shadow-lg">
              <CardHeader>
                 <CardTitle className="text-2xl">Yolcu ve Ödeme Bilgileri</CardTitle>
              </CardHeader>
               <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <Label htmlFor="firstName">İsim</Label>
                    <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="Adınız" required />
                  </div>
                        <div>
                           <Label htmlFor="lastName">Soyisim</Label>
                    <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Soyadınız" required />
                  </div>
                </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                   <Label htmlFor="phone">Telefon Numarası</Label>
                           <Input 
                             id="phone"
                             name="phone"
                             type="tel"
                             value={formData.phone}
                             onChange={handleInputChange}
                             placeholder="+90 veya 0 ile başlayan numaranızı girin"
                             required 
                             autoComplete="tel"
                           />
                </div>
                        <div>
                  <Label htmlFor="email">E-posta Adresi</Label>
                           <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="ornek@mail.com" required />
                           {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                </div>
                </div>
                      <div>
                          <Label htmlFor="flightCode">Uçuş Kodu (Varış ise)</Label>
                          <Input id="flightCode" name="flightCode" value={formData.flightCode} onChange={handleInputChange} placeholder="Örn: TK1234" />
                </div>
                      <div>
                          <Label htmlFor="notes">Ek Notlar</Label>
                          <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Sürücü için özel istekleriniz veya notlarınız..." />
                      </div>

                     <Tabs 
                        defaultValue="card" 
                        className="pt-4 border-t" 
                        onValueChange={(value) => {
                           console.log('[Tabs onValueChange] New payment method selected:', value); // Log 3
                           setSelectedPaymentMethod(value);
                        }} 
                        value={selectedPaymentMethod}
                     >
                         <TabsList className="grid w-full grid-cols-2 mb-4">
                           <TabsTrigger value="card">Kredi/Banka Kartı</TabsTrigger>
                           <TabsTrigger value="bank">Havale/EFT/Fast</TabsTrigger>
                         </TabsList>

                         <TabsContent value="card" className="space-y-4">
                           <h3 className="text-lg font-semibold">Kart Bilgileri</h3>
                           <div>
                             <Label htmlFor="cardholderName">Kart Sahibinin Adı Soyadı</Label>
                             <Input id="cardholderName" name="cardholderName" value={formData.cardholderName} onChange={handleInputChange} placeholder="Kart üzerindeki isim" required />
                  </div>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="md:col-span-2">
                    <Label htmlFor="cardNumber">Kart Numarası</Label>
                    <IMaskInput 
                                 mask="0000-0000-0000-0000"
                                 unmask={true}
                                 onAccept={(value: string) => handleInputChange({ target: { name: 'cardNumber', value } } as React.ChangeEvent<HTMLInputElement>)}
                      id="cardNumber" 
                      name="cardNumber" 
                      placeholder="---- ---- ---- ----" 
                      required 
                                 inputMode="numeric"
                                 autoComplete="cc-number"
                                 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                    />
                  </div>
                             <div>
                               <Label htmlFor="expiryDate">Son Kullanma Tarihi (AA/YY)</Label>
                      <IMaskInput 
                                 mask="00/00"
                                 unmask={true}
                                 onAccept={(value: string) => handleInputChange({ target: { name: 'expiryDate', value } } as React.ChangeEvent<HTMLInputElement>)}
                        id="expiryDate" 
                        name="expiryDate" 
                        placeholder="AA/YY" 
                        required 
                                 inputMode="numeric"
                                 autoComplete="cc-exp"
                                 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                      />
                    </div>
                             <div>
                      <Label htmlFor="cvc">CVC</Label>
                      <IMaskInput 
                                 mask="000"
                                 unmask={true}
                                 onAccept={(value: string) => handleInputChange({ target: { name: 'cvc', value } } as React.ChangeEvent<HTMLInputElement>)}
                        id="cvc" 
                        name="cvc"
                                 placeholder="123" 
                        required 
                                 inputMode="numeric"
                                 autoComplete="cc-csc"
                                 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                      />
                    </div>
                  </div>
                         </TabsContent>

                         <TabsContent value="bank" className="space-y-4">
                            <h3 className="text-lg font-semibold">Havale/EFT/Fast ile Ödeme</h3>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
                               <p className="text-sm text-muted-foreground mb-3">
                                 Lütfen aşağıdaki banka hesabına transfer yaparak ödemenizi gerçekleştirin.
                                 Rezervasyonunuz, ödemeniz onaylandıktan sonra kesinleşecektir.
                                 Açıklama kısmına rezervasyon numaranızı yazmayı unutmayın.
                               </p>
                               <div className="space-y-1 text-sm">
                                 <p><strong>Hesap Adı:</strong> Ortaköy Hızlı Transfer İşletmeleri Ltd.</p>
                                 <p><strong>IBAN:</strong> TR60 0006 2000 4930 0006 2931 55</p>
                                 <p><strong>Banka:</strong> Garanti Bankası</p>
                               </div>
                            </div>
                         </TabsContent>
                     </Tabs>

                      <div className="text-right pt-4">
                        <Button type="submit" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              İşleniyor...
                        </>
                      ) : (
                            'Rezervasyonu Tamamla'
                      )}
                    </Button>
                      </div>
              </form> 
               </CardContent>
            </Card>
          )}

          {submitError && (
             <Alert variant="destructive" className="mb-4 text-left">
               <AlertTriangle className="h-4 w-4" />
               <AlertTitle>Rezervasyon Hatası</AlertTitle>
               <AlertDescription style={{ whiteSpace: 'pre-wrap' }}>
                  {submitError}
               </AlertDescription>
             </Alert>
          )}

      </div>

        <div className="lg:col-span-1">
          <div className="sticky top-[calc(theme(spacing.16)+2rem)] z-10"> 
            <Stepper currentStage={currentStage} />

            <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm">
              {displayReservationCode && !isCodeExpired && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Ticket className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Rezervasyon No: <span className="text-base font-bold text-primary tracking-wider ml-1">{displayReservationCode}</span>
                    </p>
    </div>
                  <div className="flex items-center justify-center space-x-2 pt-1">
                     <Timer className="w-4 h-4 text-red-600 flex-shrink-0" />
                     <p className="text-sm font-bold text-red-600">
                       Rezervasyonu Tamamlamak için Kalan Süre: {
                         remainingTime !== null ? 
                         `${Math.floor(remainingTime / 60).toString().padStart(2, '0')}:${(remainingTime % 60).toString().padStart(2, '0')}` 
                         : '--:--'
                       }
                     </p>
                  </div>
                </div>
              )}
              {isCodeExpired && (
                <div className="flex items-center justify-center space-x-2 text-center">
                    <Timer className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-600 font-semibold">
                      {displayReservationCode ? `Rezervasyon (${displayReservationCode}) süresi doldu.` : 'Rezervasyon oturumu geçersiz.'}
                      <br/>Lütfen ana sayfadan tekrar arama yapın.
                    </p>
                </div>
              )}
            </div>

            <ReservationSummary
                reservation={reservationSummaryData}
                isLoading={!transferOptions && !transferError}
                currency={selectedOption?.currency}
                baseVehiclePrice={calculateBasePrice(selectedOption)}
            />
            
            {selectedOption && (
              <div className="mt-6 text-right">
                 <Button
                   size="lg"
                   onClick={() => {
                    if (isEditingLocked) {
                      setIsEditingLocked(false);
                      setShowUserInfoForm(false);
                    } else {
                      if (isCodeExpired || remainingTime === null || remainingTime <= 0) {
                          alert("Rezervasyon oturumunuzun süresi doldu. Lütfen ana sayfadan tekrar başlayın.");
                          return;
                      }
                      setShowUserInfoForm(true);
                      setIsEditingLocked(true);
                      setTimeout(() => {
                        formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }
                   }}
                   className="w-full" 
                 >
                   {isEditingLocked ? 'Değişiklik Yap' : 'Devam Et'} 
                   {!isEditingLocked && <CreditCard className="ml-2" size={18} />} 
                 </Button>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 