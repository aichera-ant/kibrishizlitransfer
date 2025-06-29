import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
} else {
  console.error('[API Extras Error] Supabase URL or Anon Key is missing. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
}

export async function GET(_request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client not initialized. Check server logs.' }, { status: 500 });
  }

  try {
    // Assuming your extras table is named 'extras' and has these fields.
    // Adjust if your table/column names are different.
    const { data, error, status } = await supabase
      .from('extras') 
      .select('id, name, price'); // Removed currency from select

    if (error && status !== 406) {
      console.error('[API Extras Error]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // The client-side fetchExtras in AracSecimiContent expects { data: Extra[] }
    // It does: setExtras(response.data.data || []);
    return NextResponse.json({ data: data || [] });

  } catch (e: unknown) {
    console.error('[API Extras Catch Error]', e);
    let message = 'An unexpected error occurred';
    if (e instanceof Error) {
        message = e.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 