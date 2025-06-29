export interface Location {
  id: number;
  name: string;
  type: 'airport' | 'hotel' | 'other';
  address: string;
  latitude?: number | null; // API'de isteğe bağlı görünüyor
  longitude?: number | null; // API'de isteğe bağlı görünüyor
  is_active: boolean;
  created_at: string;
  updated_at: string;
} 