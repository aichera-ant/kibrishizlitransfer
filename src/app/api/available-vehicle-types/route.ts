import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase'; // Adjusted import path for App Router

// Supabase İstemcisini Başlatma (ortam değişkenleri global olarak erişilebilir olmalı)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing in environment variables for API route.");
  // Gerçek bir uygulamada bu durum daha iyi yönetilmeli
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient<Database>(supabaseUrl, supabaseAnonKey) : null;

// Parametre ve Sonuç Arayüzleri (vehicles.ts'den alındı)
interface GetAvailableVehicleTypesParams {
  pickup_location_id: number;
  dropoff_location_id: number;
  passenger_count: number;
}

// type VehicleRow = Database['public']['Tables']['vehicles']['Row']; // Removed unused type
// type PriceListRow = Database['public']['Tables']['price_lists']['Row']; // Removed unused type

interface VehicleTypeOption {
  type: string;
  name: string;
  capacity: number;
  price: number;
  currency: string;
  price_type: Database["public"]["Enums"]["price_type"];
  transfer_type: Database["public"]["Enums"]["transfer_type"];
  vehicle_id_example: number;
}

interface GetAvailableVehicleTypesResult {
  options: VehicleTypeOption[];
  error: string | null;
}

// getAvailableVehicleTypes fonksiyonu (vehicles.ts'den alındı ve buraya taşındı)
async function getAvailableVehicleTypesInternal(
  params: GetAvailableVehicleTypesParams
): Promise<GetAvailableVehicleTypesResult> {
  if (!supabase) {
    return { options: [], error: "Supabase client could not be initialized in API route." };
  }
  const { pickup_location_id, dropoff_location_id, passenger_count } = params;
  console.log("[API Route - getAvailableVehicleTypes] Received params:", params);

  try {
    if (!pickup_location_id || !dropoff_location_id || !passenger_count) {
      return { options: [], error: "Missing required parameters (pickup, dropoff, passenger_count)." };
    }
    if (isNaN(passenger_count) || passenger_count < 1) {
        return { options: [], error: "Invalid passenger count." };
    }

    const { data: pickupLocationData, error: pickupLocationError } = await supabase
      .from('locations')
      .select('bolge_id')
      .eq('id', pickup_location_id)
      .single();
    if (pickupLocationError || !pickupLocationData) {
      console.error("[API Route - getAvailableVehicleTypes] Error fetching pickup location:", pickupLocationError);
      return { options: [], error: pickupLocationError?.message || "Could not fetch pickup location details." };
    }

    const { data: dropoffLocationData, error: dropoffLocationError } = await supabase
      .from('locations')
      .select('bolge_id')
      .eq('id', dropoff_location_id)
      .single();
    if (dropoffLocationError || !dropoffLocationData) {
      console.error("[API Route - getAvailableVehicleTypes] Error fetching dropoff location:", dropoffLocationError);
      return { options: [], error: dropoffLocationError?.message || "Could not fetch dropoff location details." };
    }
    
    const pickup_bolge_id = pickupLocationData.bolge_id;
    const dropoff_bolge_id = dropoffLocationData.bolge_id;
    if (!pickup_bolge_id || !dropoff_bolge_id) {
        return { options: [], error: "Could not determine region IDs for locations." };
    }
    console.log(`[API Route - getAvailableVehicleTypes] Pickup Bolge ID: ${pickup_bolge_id}, Dropoff Bolge ID: ${dropoff_bolge_id}`);

    const { data: potentialVehicles, error: potentialVehiclesError } = await supabase
      .from('vehicles')
      .select('id, name, type, capacity')
      .eq('is_active', true)
      .gte('capacity', passenger_count);
    if (potentialVehiclesError) {
      console.error("[API Route - getAvailableVehicleTypes] Error fetching potential vehicles:", potentialVehiclesError);
      return { options: [], error: potentialVehiclesError.message || "Could not fetch potential vehicles." };
    }
    if (!potentialVehicles || potentialVehicles.length === 0) {
      console.log("[API Route - getAvailableVehicleTypes] No potential vehicles found matching criteria.");
      return { options: [], error: null }; 
    }
    console.log(`[API Route - getAvailableVehicleTypes] Found ${potentialVehicles.length} potential vehicles raw.`);

    const vehicleTypes = [...new Set(potentialVehicles.map(v => v.type))];
    if (vehicleTypes.length === 0) {
        console.log("[API Route - getAvailableVehicleTypes] No unique vehicle types from potential vehicles.");
        return { options: [], error: null };
    }

    const { data: priceLists, error: priceListError } = await supabase
        .from('price_lists')
        .select('*')
        .eq('from_bolge_id', pickup_bolge_id)
        .eq('to_bolge_id', dropoff_bolge_id)
        .in('vehicle_type', vehicleTypes)
        .eq('is_active', true);
    if (priceListError) {
        console.error("[API Route - getAvailableVehicleTypes] Error fetching price lists:", priceListError);
        return { options: [], error: priceListError.message || "Could not fetch price lists." };
    }
    if (!priceLists || priceLists.length === 0) {
        console.log("[API Route - getAvailableVehicleTypes] No price lists found for the given route and vehicle types.");
        return { options: [], error: null };
    }
    console.log(`[API Route - getAvailableVehicleTypes] Fetched ${priceLists.length} price list entries.`);

    const availableOptions: VehicleTypeOption[] = [];
    for (const vehicle of potentialVehicles) {
        const matchingPriceList = priceLists.find(pl => pl.vehicle_type === vehicle.type);
        if (matchingPriceList) {
            if (!availableOptions.some(opt => opt.type === vehicle.type)) {
                availableOptions.push({
                    type: vehicle.type,
                    name: vehicle.name,
                    capacity: vehicle.capacity,
                    price: matchingPriceList.price,
                    currency: matchingPriceList.currency,
                    price_type: matchingPriceList.price_type,
                    transfer_type: matchingPriceList.transfer_type,
                    vehicle_id_example: vehicle.id,
                });
            }
        }
    }
    console.log(`[API Route - getAvailableVehicleTypes] Created ${availableOptions.length} vehicle type options.`);
    return { options: availableOptions, error: null };

  } catch (error: unknown) {
    console.error("[API Route - getAvailableVehicleTypes] Catch Error:", error);
    let message = "An unexpected error occurred while fetching vehicle options.";
    if (error instanceof Error) {
        message = error.message;
    }
    return { options: [], error: message };
  }
}

// App Router GET Handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pickup_location_id_str = searchParams.get('pickup_location_id');
  const dropoff_location_id_str = searchParams.get('dropoff_location_id');
  const passenger_count_str = searchParams.get('passenger_count');

  if (!pickup_location_id_str || !dropoff_location_id_str || !passenger_count_str) {
    return NextResponse.json({ options: [], error: "Missing required query parameters (pickup_location_id, dropoff_location_id, passenger_count)." }, { status: 400 });
  }

  const params: GetAvailableVehicleTypesParams = {
    pickup_location_id: parseInt(pickup_location_id_str, 10),
    dropoff_location_id: parseInt(dropoff_location_id_str, 10),
    passenger_count: parseInt(passenger_count_str, 10),
  };

  if (isNaN(params.pickup_location_id) || isNaN(params.dropoff_location_id) || isNaN(params.passenger_count)) {
    return NextResponse.json({ options: [], error: "Invalid numeric query parameters." }, { status: 400 });
  }

  const result = await getAvailableVehicleTypesInternal(params);

  if (result.error && result.options.length === 0) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result, { status: 200 });
} 