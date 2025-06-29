import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next'; // Gerekirse diye, ama doğrudan fonksiyon olarak da kullanılabilir.
import type { Database } from '../../types/supabase'; // Supabase türlerini import et
// import { SupabaseClient } from '@supabase/supabase-js'; // Unused
// import { Database as SupabaseDatabase, Tables } from '@/types/supabase'; // Unused
// import { VehicleRow, PriceListRow } from '@/types/supabase-specific'; // Assuming these were defined elsewhere if needed

// Supabase İstemcisini Başlatma
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Sunucu tarafında service_role key de kullanılabilir, daha güvenli olur.

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing in environment variables.");
  // Bu durumda fonksiyonun bir hata fırlatması veya uygun bir şekilde yönetilmesi gerekir.
}

// Supabase client'ını Database türü ile oluştur
const supabase = supabaseUrl && supabaseAnonKey ? createClient<Database>(supabaseUrl, supabaseAnonKey) : null;

interface GetAvailableVehicleTypesParams {
  pickup_location_id: number;
  dropoff_location_id: number;
  passenger_count: number;
}

// Removed unused type aliases for VehicleRow and PriceListRow
// // vehicles tablosundan bir satırın türü
// type VehicleRow = Database['public']['Tables']['vehicles']['Row'];
// // price_lists tablosundan bir satırın türü
// type PriceListRow = Database['public']['Tables']['price_lists']['Row'];

// Sonuç olarak dönecek araç tipi seçeneği arayüzü
interface VehicleTypeOption {
  type: string;                 // Araç tipi (vehicles.type)
  name: string;                 // Araç adı/modeli (vehicles.name)
  capacity: number;             // Araç kapasitesi (vehicles.capacity)
  price: number;                // Hesaplanan fiyat (price_lists.price)
  currency: string;             // Fiyat para birimi (price_lists.currency)
  price_type: Database["public"]["Enums"]["price_type"]; // Fiyat tipi (price_lists.price_type)
  transfer_type: Database["public"]["Enums"]["transfer_type"]; // Transfer tipi (price_lists.transfer_type)
  vehicle_id_example: number;   // O tipe ait bir araç ID'si (opsiyonel, referans için)
  // Diğer gerekli olabilecek alanlar eklenebilir
}

interface GetAvailableVehicleTypesResult {
  options: VehicleTypeOption[];
  error: string | null;
}

export async function getAvailableVehicleTypes(
  params: GetAvailableVehicleTypesParams
): Promise<GetAvailableVehicleTypesResult> {
  if (!supabase) {
    return { options: [], error: "Supabase client could not be initialized." };
  }

  const { pickup_location_id, dropoff_location_id, passenger_count } = params;

  console.log("[API - getAvailableVehicleTypes] Received params:", params);

  try {
    // 1. Giriş Doğrulaması (Temel)
    if (!pickup_location_id || !dropoff_location_id || !passenger_count) {
      return { options: [], error: "Missing required parameters (pickup, dropoff, passenger_count)." };
    }
    if (isNaN(passenger_count) || passenger_count < 1) {
        return { options: [], error: "Invalid passenger count." };
    }

    // 1. Lokasyonların Bölge ID'lerini Alma
    const { data: pickupLocationData, error: pickupLocationError } = await supabase
      .from('locations')
      .select('bolge_id')
      .eq('id', pickup_location_id)
      .single();

    if (pickupLocationError || !pickupLocationData) {
      console.error("[API - getAvailableVehicleTypes] Error fetching pickup location:", pickupLocationError);
      return { options: [], error: pickupLocationError?.message || "Could not fetch pickup location details." };
    }

    const { data: dropoffLocationData, error: dropoffLocationError } = await supabase
      .from('locations')
      .select('bolge_id')
      .eq('id', dropoff_location_id)
      .single();

    if (dropoffLocationError || !dropoffLocationData) {
      console.error("[API - getAvailableVehicleTypes] Error fetching dropoff location:", dropoffLocationError);
      return { options: [], error: dropoffLocationError?.message || "Could not fetch dropoff location details." };
    }
    
    const pickup_bolge_id = pickupLocationData.bolge_id;
    const dropoff_bolge_id = dropoffLocationData.bolge_id;

    if (!pickup_bolge_id || !dropoff_bolge_id) {
        return { options: [], error: "Could not determine region IDs for locations." };
    }

    console.log(`[API - getAvailableVehicleTypes] Pickup Bolge ID: ${pickup_bolge_id}, Dropoff Bolge ID: ${dropoff_bolge_id}`);

    // 2. Potansiyel Araçları (is_active ve kapasiteye göre) Çekme
    const { data: potentialVehicles, error: potentialVehiclesError } = await supabase
      .from('vehicles')
      .select('id, name, type, capacity') // Sadece gerekli alanları seçiyoruz
      .eq('is_active', true)
      .gte('capacity', passenger_count);

    if (potentialVehiclesError) {
      console.error("[API - getAvailableVehicleTypes] Error fetching potential vehicles:", potentialVehiclesError);
      return { options: [], error: potentialVehiclesError.message || "Could not fetch potential vehicles." };
    }

    if (!potentialVehicles || potentialVehicles.length === 0) {
      console.log("[API - getAvailableVehicleTypes] No potential vehicles found matching capacity/active criteria.");
      // Bu durumda boş bir seçenek listesi döndürmek daha uygun olabilir, hata yerine.
      return { options: [], error: null }; 
    }

    console.log(`[API - getAvailableVehicleTypes] Found ${potentialVehicles.length} potential vehicles raw.`);

    const availableOptions: VehicleTypeOption[] = [];
    // Kullanılacak price_lists kayıtlarını toplu çekmek için araç tiplerini topla
    const vehicleTypes = [...new Set(potentialVehicles.map(v => v.type))];

    if (vehicleTypes.length === 0) {
        console.log("[API - getAvailableVehicleTypes] No unique vehicle types from potential vehicles.");
        return { options: [], error: null };
    }

    // 3. Toplu Fiyat Listesi Sorgusu
    const { data: priceLists, error: priceListError } = await supabase
        .from('price_lists')
        .select('*')
        .eq('from_bolge_id', pickup_bolge_id)
        .eq('to_bolge_id', dropoff_bolge_id)
        .in('vehicle_type', vehicleTypes)
        .eq('is_active', true);

    if (priceListError) {
        console.error("[API - getAvailableVehicleTypes] Error fetching price lists:", priceListError);
        return { options: [], error: priceListError.message || "Could not fetch price lists." };
    }

    if (!priceLists || priceLists.length === 0) {
        console.log("[API - getAvailableVehicleTypes] No price lists found for the given route and vehicle types.");
        return { options: [], error: null };
    }
    
    console.log(`[API - getAvailableVehicleTypes] Fetched ${priceLists.length} price list entries.`);

    // Potansiyel araçları, fiyat listesiyle eşleşen araç tiplerine göre işle
    for (const vehicle of potentialVehicles) {
        // Bu araç tipi için uygun bir fiyat listesi var mı?
        const matchingPriceList = priceLists.find(pl => pl.vehicle_type === vehicle.type);

        if (matchingPriceList) {
            // Aynı araç tipi için daha önce eklenmediyse ekle
            // Bu kontrol, aynı araç tipinden birden fazla araç varsa, seçeneğin sadece bir kez eklenmesini sağlar.
            if (!availableOptions.some(opt => opt.type === vehicle.type)) {
                availableOptions.push({
                    type: vehicle.type,
                    name: vehicle.name, // Ya da daha genel bir tip adı (örn: vehicle.type'dan türetilmiş)
                    capacity: vehicle.capacity,
                    price: matchingPriceList.price, // Null değilse emin ol
                    currency: matchingPriceList.currency,
                    price_type: matchingPriceList.price_type,
                    transfer_type: matchingPriceList.transfer_type,
                    vehicle_id_example: vehicle.id, 
                });
            }
        }
    }
    
    console.log(`[API - getAvailableVehicleTypes] Created ${availableOptions.length} vehicle type options.`);

    return { options: availableOptions, error: null };

  } catch (error: unknown) {
    console.error("[API - getAvailableVehicleTypes] Catch Error:", error);
    // Attempt to access error.message safely
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while fetching vehicle options.";
    return { options: [], error: errorMessage };
  }
}

// Eğer bu dosyayı Next.js API rotası olarak kullanmak isterseniz:
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetAvailableVehicleTypesResult | { error: string }>
) {
  if (req.method === 'GET') {
    const { pickup_location_id, dropoff_location_id, passenger_count } = req.query;

    if (!pickup_location_id || !dropoff_location_id || !passenger_count) {
      return res.status(400).json({ error: "Missing required query parameters." });
    }

    const params: GetAvailableVehicleTypesParams = {
      pickup_location_id: parseInt(pickup_location_id as string, 10),
      dropoff_location_id: parseInt(dropoff_location_id as string, 10),
      passenger_count: parseInt(passenger_count as string, 10),
    };

    if (isNaN(params.pickup_location_id) || isNaN(params.dropoff_location_id) || isNaN(params.passenger_count)) {
        return res.status(400).json({ error: "Invalid numeric query parameters." });
    }

    const result = await getAvailableVehicleTypes(params);
    if (result.error && result.options.length === 0) {
      return res.status(500).json({ options: [], error: result.error });
    }
    return res.status(200).json(result);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 