import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
// import { v4 as uuidv4 } from 'uuid'; // Removed unused import

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing from environment variables.')
  // Potentially throw an error or handle this case as appropriate
}

const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

// Function to generate a short, somewhat readable reservation code
// function generateReservationCode(): string { // Removed unused function
// const prefix = "KTR"; // Kibris Transfer Reservation
// const timestampPart = Date.now().toString().slice(-4); // Last 4 digits of current timestamp
// const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random alphanumeric chars
// return `${prefix}${timestampPart}${randomPart}`;
// } // Removed unused function generateReservationCode


export async function POST(request: NextRequest) {
  console.log('[API /reservations] POST request received.');
  try {
    console.log('[API /reservations] Attempting to parse JSON payload...');
    const payload = await request.json();
    console.log('[API /reservations] JSON payload parsed successfully.');
    
    // LOG THE ENTIRE PAYLOAD BEFORE VALIDATIONS
    console.log('[API /reservations] Raw payload before validation:', JSON.stringify(payload, null, 2));

    // Validate essential payload parts (basic validation)
    console.log('[API /reservations] Validating required reservation fields...');
    if (!payload.pickup_location_id || !payload.dropoff_location_id || !payload.reservation_date || !payload.passenger_count || !payload.vehicle_id) {
      console.error('[API /reservations] Validation failed: Missing required reservation fields.');
      return NextResponse.json({ message: 'Missing required reservation fields.' }, { status: 400 });
    }

    console.log('[API /reservations] Validating required customer fields...');
    if (!payload.customer_name || !payload.customer_last_name || !payload.customer_email || !payload.customer_phone) {
        console.error('[API /reservations] Validation failed: Missing required customer fields.');
        return NextResponse.json({ message: 'Missing required customer fields.' }, { status: 400 });
    }

    // console.log('[API /reservations] Validating card details if payment method is card...');
    // if (payload.payment_method === 'card' && (!payload.card_details || !payload.card_details.cardholder_name || !payload.card_details.card_number || !payload.card_details.expiry_date || !payload.card_details.cvc)) {
    //     console.error('[API /reservations] Validation failed: Missing required card details for card payment.');
    //     return NextResponse.json({ message: 'Missing required card details for card payment.' }, { status: 400 });
    // }

    console.log('[API /reservations] Validating presence of reservation code...');
    // Validate that the client-sent reservation code is present
    if (!payload.code) {
      console.error('[API /reservations] Validation failed: Reservation code is missing from payload.');
      return NextResponse.json({ message: 'Reservation code is missing from payload.' }, { status: 400 });
    }
    console.log('[API /reservations] All validations passed.');

    // Use the reservation code from the payload
    const newReservationCode = payload.code;

    console.log('[API /reservations] Received payload:', payload); // Gelen payload'ı logla

    const reservationData = {
      pickup_location_id: payload.pickup_location_id,
      dropoff_location_id: payload.dropoff_location_id,
      reservation_time: payload.reservation_date, // Changed from reservation_date
      passenger_count: payload.passenger_count,
      vehicle_id: payload.vehicle_id, // This is vehicle_id_example from frontend
      // transfer_type: payload.transfer_type, // Temporarily removed, column not found in DB schema
      customer_name: payload.customer_name,
      customer_last_name: payload.customer_last_name,
      customer_email: payload.customer_email,
      customer_phone: payload.customer_phone,
      flight_details: payload.flight_details,
      notes: payload.notes,
      total_price: payload.total_price,
      currency: payload.currency,
      payment_method: payload.payment_method,
      card_details: null, // Always set to null to prevent saving card details
      extras: payload.extras, // Array of {id, name, price}
      status: payload.status || 'pending_confirmation',
      code: newReservationCode,
    };

    console.log('[API /reservations] Processing reservationData:', JSON.stringify(reservationData, null, 2)); // Log the data to be inserted

    const { data, error } = await supabase
      .from('reservations')
      .insert([reservationData])
      .select()
      .single(); // Assuming you want the inserted row back and expect only one row

    if (error) {
      console.error('Supabase insert error:', error);
      // Check for unique constraint violation for CODE, if such constraint exists on CODE column
      if (error.code === '23505' && error.message.toLowerCase().includes('constraint') && error.message.toLowerCase().includes('code')) {
        return NextResponse.json({ message: 'Failed to generate a unique reservation code (duplicate). Please try again.' }, { status: 500 });
      }
      return NextResponse.json({ message: 'Error creating reservation in database.', details: error.message }, { status: 500 });
    }

    if (data) {
      return NextResponse.json({ 
        message: 'Reservation created successfully!', 
        code: newReservationCode, // Return the new code
        reservationId: data.id // Optionally return the DB id
      }, { status: 201 });
    } else {
      // This case should ideally not be reached if insert was successful and .single() was used.
      return NextResponse.json({ message: 'Reservation created but no data returned from DB.' }, { status: 500 });
    }

  } catch (error: unknown) { // error: any -> error: unknown
    console.error('Error processing reservation request:', error);
    let message = 'An unexpected error occurred.';
    let details = null;

    if (error instanceof SyntaxError) { // Specific check for JSON parsing error
        message = 'Invalid request body: Malformed JSON.';
        // For SyntaxError, error.message is often descriptive enough for details
        if (error instanceof Error) details = error.message; 
        return NextResponse.json({ message, details }, { status: 400 });
    }
    
    // General error handling
    if (error instanceof Error) {
        message = error.message;
        // details = error.stack; // Optionally add stack for more debug info
    }
    return NextResponse.json({ message, details }, { status: 500 });
  }
} 