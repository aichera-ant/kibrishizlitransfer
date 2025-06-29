// Araç tipleri ve kapasiteleri
export const vehicleTypes = [
  { id: 1, name: 'Mercedes Vito', capacity: 7 },
  { id: 2, name: 'Mercedes Sprinter', capacity: 13 },
  { id: 3, name: 'Mercedes Taksi', capacity: 3 },
];

// Varsayılan maksimum yolcu sayısı (eğer araç tipi bulunamazsa vb.)
export const DEFAULT_MAX_PASSENGERS = 15;

// Saat ve dakika seçenekleri
export const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
export const minutes = ['00', '15', '30', '45']; 