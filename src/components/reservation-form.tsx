'use client'

import React /*, { useState }*/ from 'react'; // useState kaldırıldı
// import { useRouter } from 'next/navigation'; // Kaldırıldı
// import { format, setHours, setMinutes, setSeconds, isValid } from "date-fns"; // Kaldırıldı
// import { Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react"; // Kaldırıldı
import { useForm, /*Controller,*/ SubmitHandler } from "react-hook-form"; // Controller kaldırıldı
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IMaskInput } from 'react-imask';

// Shadcn UI Bileşenleri
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
// import { Button } from "@/components/ui/button"; // Button kaldırıldı
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label"; // Kaldırıldı
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Kaldırıldı
import { Textarea } from "@/components/ui/textarea";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Kaldırıldı
// import { Calendar } from "@/components/ui/calendar"; // Kaldırıldı
// import { cn } from "@/lib/utils"; // Kaldırıldı
// import { Separator } from "@/components/ui/separator"; // Kaldırıldı

// Taşınan sabitleri ve yardımcı bileşeni import et
// import { vehicleTypes, DEFAULT_MAX_PASSENGERS, hours, minutes } from "@/config/reservation-options"; // Kaldırıldı
// import { FieldError } from "@/components/form-helpers"; // Kaldırıldı

// Kişisel bilgiler için tip tanımı
interface PersonalDetailsFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  flightNumber?: string;
  notes?: string;
}

interface ReservationFormProps {
    onSubmitPersonalDetails: SubmitHandler<PersonalDetailsFormData>;
    isSubmitting: boolean;
    initialData?: Partial<PersonalDetailsFormData>; // Opsiyonel başlangıç verisi
}

// Zod Şemasını sadeleştir
const personalInfoSchema = z.object({
  customerName: z.string().min(1, { message: 'Ad Soyad zorunludur.' }).max(255),
  customerEmail: z.string().email({ message: 'Geçerli bir e-posta adresi girin.' }).max(255),
  customerPhone: z.string().min(10, { message: 'Telefon numarası geçersiz.' }).max(20), // Min/max ayarlanabilir
  flightNumber: z.string().max(50).optional().or(z.literal('')), // Boş string veya max 50 karakter
  notes: z.string().max(500).optional().or(z.literal('')), // Boş string veya max 500 karakter
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;

export function ReservationForm({ onSubmitPersonalDetails, /*isSubmitting,*/ initialData }: ReservationFormProps) { // isSubmitting kaldırıldı
    // const router = useRouter(); // Kaldırıldı

    const form = useForm<PersonalInfoData>({
        resolver: zodResolver(personalInfoSchema),
        defaultValues: { // Başlangıç değerleri
            customerName: initialData?.customerName || '',
            customerEmail: initialData?.customerEmail || '',
            customerPhone: initialData?.customerPhone || '',
            flightNumber: initialData?.flightNumber || '',
            notes: initialData?.notes || '',
        },
    });

    // ... (form render)
        return (
        // Formun ID'si, dışarıdan submit edilebilmesi için
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitPersonalDetails)} className="space-y-6" id="reservation-form-id">
                <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ad Soyad</FormLabel>
                            <FormControl>
                                <Input placeholder="Adınız ve soyadınız" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>E-posta Adresi</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="ornek@mail.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Telefon Numarası</FormLabel>
                                <FormControl>
                                    {/* IMaskInput kullanımı örneği */}
                                    <IMaskInput
                                        mask="{[+00] (000) 000 00 00}"
                                        unmask={true} // Değeri maskesiz olarak al
                                        lazy={false} // Placeholder'ı her zaman göster
                                        placeholder="(+90) (5XX) XXX XX XX"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        {...field} // react-hook-form ile entegrasyon
                                        onAccept={(value) => field.onChange(value)} // Değeri state'e yaz
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
                 <FormField
                     control={form.control}
                     name="flightNumber"
                     render={({ field }) => (
                         <FormItem>
                             <FormLabel>Uçuş Numarası <span className="text-xs text-muted-foreground">(İsteğe bağlı)</span></FormLabel>
                             <FormControl>
                                 <Input placeholder="Örn: TK1234" {...field} />
                             </FormControl>
                             <FormMessage />
                         </FormItem>
                     )}
                 />
                 <FormField
                     control={form.control}
                     name="notes"
                     render={({ field }) => (
                         <FormItem>
                             <FormLabel>Ek Notlar <span className="text-xs text-muted-foreground">(İsteğe bağlı)</span></FormLabel>
                             <FormControl>
                                 <Textarea
                                     placeholder="Özel istekleriniz veya notlarınız varsa buraya yazabilirsiniz..."
                                     className="resize-none"
                                     rows={3}
                                     {...field}
                                 />
                             </FormControl>
                             <FormMessage />
                         </FormItem>
                     )}
                 />
                {/* Submit butonu formun dışında, ID ile bağlanıyor */}
                {/* <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Kişisel Bilgileri Kaydet ve Devam Et
                </Button> */}
            </form>
        </Form>
    );
} 