// 'use server' // Removed unnecessary directive

import { supabase } from '@/lib/supabaseClient'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ArrowLeft, Hash, Car, User, Calendar as CalendarIcon, FileText, List, Sigma, AlertTriangle } from 'lucide-react'

// Helper Function for Currency Formatting (duplicate from list page, consider moving to utils)
const formatCurrency = (value: number | string | null | undefined) => {
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    if (amount === null || amount === undefined || isNaN(amount)) return '-';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
};

// Helper Function for Date Formatting (duplicate from list page, consider moving to utils)
const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '-';
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return format(dateObj, 'dd.MM.yyyy', { locale: tr });
    } catch { return '-'; }
};

// Type for fetched expense data (adjust based on actual query)
interface ExpenseDetailData {
    id: number;
    entry_date: string;
    expense_no: string;
    description: string | null;
    total_amount: number;
    vehicles: { plate_number: string; name?: string } | null;
    suppliers: { name: string } | null;
    expense_details: {
        id: number;
        detail_date: string;
        receipt_no: string | null;
        detail_description: string | null;
        amount: number;
        expense_types: { name: string } | null; // Assuming expense_types can be joined
    }[];
}

// Interface for Expense Type (for mapping names)
// interface ExpenseType { // Unused interface
//     id: number;
//     name: string;
// }

async function getExpenseDetails(id: number): Promise<{ expense: ExpenseDetailData | null; /* expenseTypes: ExpenseType[]; */ error: string | null }> {
    try {
        // Fetch the main expense record and its details
        // Try fetching details with type name directly
        const { data, error } = await supabase
            .from('expenses_list')
            .select(`
                *,
                vehicles ( plate_number, name ),
                suppliers ( name ),
                expense_details ( *, expense_types ( name ) )
            `)
            .eq('id', id)
            .single();

        if (error) {
            // Handle relationship error gracefully (maybe schema cache)
            if (error.code === 'PGRST200' || error.code === 'PGRST201') { // PGRST201: multiple rows (shouldn't happen with .single())
                 console.warn("Supabase ilişki hatası (veya ID bulunamadı/birden fazla bulundu):", error);
                 // Try fetching without relations as a fallback
                 const { data: fallbackData, error: fallbackError } = await supabase
                    .from('expenses_list')
                    .select('*, expense_details(*)') // Fetch details separately
                    .eq('id', id)
                    .single();
                 
                 if (fallbackError || !fallbackData) {
                     console.error("Fallback sorgusu da başarısız oldu:", fallbackError);
                     return { expense: null, /* expenseTypes: [], */ error: "Masraf verisi bulunamadı veya yüklenirken hata oluştu." };
                 }
                 // Manual mapping (vehicle/supplier names won't be available here)
                  return { expense: { ...fallbackData, vehicles: null, suppliers: null } as ExpenseDetailData, /* expenseTypes, */ error: null };

            } else {
                 console.error("Masraf detayı alınırken Supabase hatası:", error);
                return { expense: null, /* expenseTypes: [], */ error: "Masraf verisi yüklenirken bir hata oluştu." };
            }
        }

        if (!data) {
            return { expense: null, /* expenseTypes: [], */ error: null }; // Not found handled by notFound() later
        }

        return { expense: data as ExpenseDetailData, /* expenseTypes, */ error: null };
    } catch (err: unknown) {
        console.error("Masraf detayı alınırken hata:", err);
        return { expense: null, /* expenseTypes: [], */ error: "Masraf verisi yüklenirken beklenmedik bir hata oluştu." };
    }
}

export default async function MinimalPageTest({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Minimal Sayfa Testi</h1>
      <p>Alınan ID: {params.id}</p>
    </div>
  );
} 