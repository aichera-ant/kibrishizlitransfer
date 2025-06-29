'use client'

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';

// Leaflet ikonlarının düzgün görünmesi için varsayılan ikon ayarları
// Bu kısım bazen SSR ile sorun çıkarabilir, gerekirse dinamik import edilebilir.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface LocationMapSelectorProps {
    latitude: number | null;
    longitude: number | null;
    onCoordinatesChange: (lat: number, lng: number) => void;
    mapHeight?: string; // Harita yüksekliği için prop
}

// Harita merkezini ve işaretçiyi güncelleyen yardımcı bileşen
const MapUpdater = ({ center }: { center: LatLngExpression }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

// Harita tıklama olaylarını dinleyen yardımcı bileşen
const ClickHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            onClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

const LocationMapSelector: React.FC<LocationMapSelectorProps> = ({ 
    latitude,
    longitude,
    onCoordinatesChange,
    mapHeight = '300px' // Varsayılan yükseklik
}) => {
    // Kıbrıs'ın merkezi veya mevcut koordinatlar
    const initialCenter: LatLngExpression = 
        latitude && longitude 
        ? [latitude, longitude] 
        : [35.1264, 33.4299]; // Kıbrıs merkezi (varsayılan)
    
    const position: LatLngExpression | null = latitude && longitude ? [latitude, longitude] : null;

    return (
        <MapContainer 
            center={initialCenter} 
            zoom={position ? 13 : 8} // Koordinat varsa daha yakın başla
            scrollWheelZoom={true} 
            style={{ height: mapHeight, width: '100%' }} // Stil eklendi
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
             {/* Koordinatlar değiştiğinde harita merkezini güncelle */}
            <MapUpdater center={position || initialCenter} />
            {/* Haritaya tıklanınca koordinatları güncelle */}
            <ClickHandler onClick={onCoordinatesChange} />
            {/* İşaretçi (eğer koordinat varsa göster) */}
            {position && (
                <Marker position={position}></Marker>
            )}
        </MapContainer>
    );
};

export default LocationMapSelector; 