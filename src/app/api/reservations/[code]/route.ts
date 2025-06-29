import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing from environment variables for reservations/[code] route.')
  // Consider how to handle this in production
}

const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const reservationCode = params.code

  if (!reservationCode) {
    return NextResponse.json({ message: 'Reservation code is required' }, { status: 400 })
  }

  console.log(`[API /reservations/[code]] Fetching reservation with code: ${reservationCode}`);

  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, pickup_location:locations!reservations_pickup_location_id_foreign(id, name, type, address, latitude, longitude), dropoff_location:locations!reservations_dropoff_location_id_foreign(id, name, type, address, latitude, longitude), vehicle:vehicles(id, name, type, capacity, image_url)')
      .eq('code', reservationCode)
      .single() // Expecting only one reservation for a given code

    if (error) {
      console.error('[API /reservations/[code]] Supabase error:', error)
      if (error.code === 'PGRST116') { // PGRST116: "The result contains 0 rows"
        return NextResponse.json({ message: `Reservation with code '${reservationCode}' not found.` }, { status: 404 });
      }
      return NextResponse.json({ message: 'Error fetching reservation from database.', details: error.message }, { status: 500 })
    }

    if (data) {
      return NextResponse.json({ data }, { status: 200 })
    } else {
      // This case should ideally be caught by error.code === 'PGRST116' if .single() is used
      return NextResponse.json({ message: `Reservation with code '${reservationCode}' not found (no data).` }, { status: 404 });
    }

  } catch (error: unknown) {
    console.error('[API /reservations/[code]] Error processing request:', error)
    let message = 'An unexpected error occurred.';
    const details = null;
    if (error instanceof Error) {
        message = error.message;
        // details = error.stack; // Optionally add stack for more debug info if needed
    }
    return NextResponse.json({ message, details }, { status: 500 });
  }
} 