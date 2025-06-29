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
  console.error('[API Locations Error] Supabase URL or Anon Key is missing. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
  // In a real app, you might throw an error or have a fallback, 
  // but for now, we'll let GET handler check for supabase client.
}

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client not initialized. Check server logs.' }, { status: 500 });
  }
  
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 1000;

  if (isNaN(limit) || limit <= 0) {
    return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
  }

  try {
    const { data, error, status } = await supabase
      .from('locations')
      .select('id, name, type, address, latitude, longitude')
      .limit(limit);

    if (error && status !== 406) { // 406 can be a range error if limit is too high, but data might still be returned
      console.error('[API Locations Error]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // The client-side getLocationsClient expects { data: Location[] } or Location[]
    // Let's return { data: locations_data } to be consistent if it was expected before,
    // or simply locations_data if it's simpler for new client code.
    // The existing client code tries data.data || data.
    // For simplicity and directness, returning the array directly is often cleaner for new routes.
    // However, to match the client expectation of `data.data || data`, we can wrap it.
    return NextResponse.json({ data: data || [] });

  } catch (e: unknown) {
    console.error('[API Locations Catch Error]', e);
    let message = 'An unexpected error occurred';
    if (e instanceof Error) {
        message = e.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 