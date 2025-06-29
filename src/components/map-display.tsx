/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useEffect, useRef } from 'react'; // useState kaldırıldı
import { MapContainer, TileLayer, Marker, useMap, Tooltip } from 'react-leaflet';
import L, { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import "leaflet-routing-machine";

// Leaflet ikonlarının düzgün görünmesi için varsayılan ikon ayarları
// Bu kısım olmazsa ikonlar kaybolabilir veya bozuk görünebilir
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
	iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- Types ---
type MarkerData = {
	position: [number, number];
	popupText?: string;
	icon?: 'pickup' | 'dropoff' | 'default';
};

// Rota bilgisi için yeni tip
export interface RouteInfo {
	distance: number; // metre cinsinden
	duration: number; // saniye cinsinden
}

interface MapDisplayProps {
	center: [number, number];
	zoom: number;
	markers?: MarkerData[];
	style?: React.CSSProperties;
	bounds?: LatLngBoundsExpression;
	mapHeight?: string;
	// Rota için başlangıç ve bitiş noktaları
	pickupCoords?: [number, number] | null;
	dropoffCoords?: [number, number] | null;
	// Rota bilgisi için callback
	onRouteFound?: (info: RouteInfo) => void;
}

// Haritayı sınırlara sığdıran yardımcı component
const FitBounds: React.FC<{ bounds?: LatLngBoundsExpression }> = ({ bounds }:{ bounds?: LatLngBoundsExpression }) => { // Explicit tip ekle
	const map = useMap();
	React.useEffect(() => {
		if (bounds) {
			map.fitBounds(bounds);
		}
	}, [map, bounds]);
	return null;
};

// --- Rota Çizme Bileşeni ---
interface RoutingMachineProps {
	start: LatLngExpression;
	end: LatLngExpression;
	onRouteFound?: (info: RouteInfo) => void;
}

const RoutingMachine: React.FC<RoutingMachineProps> = ({ start, end, onRouteFound }) => { // Props tipi kullan
	const map = useMap();

	useEffect(() => {
		if (!map || !start || !end) return;

		// L objesini any olarak cast et
		const routingControl = (L as any).Routing.control({
			waypoints: [
				L.latLng(start as L.LatLngExpression),
				L.latLng(end as L.LatLngExpression)
			],
			routeWhileDragging: false,
			addWaypoints: false, // Kullanıcının yeni nokta eklemesini engelle
			draggableWaypoints: false, // Noktaların sürüklenmesini engelle
			fitSelectedRoutes: true,
			show: false, // Rota talimatlarını gösterme paneli
			// İkonları ve çizgi stilini özelleştir (isteğe bağlı)
			lineOptions: {
				styles: [{ color: '#007bff', opacity: 1, weight: 8 }]
			},
			 createMarker: function() { return null; } // Başlangıç/bitiş için varsayılan markerları gizle (biz kendimiz ekliyoruz)
		}).addTo(map);

		// Rota bulunduğunda bilgileri al
		routingControl.on('routesfound', function(e: any) { // e'ye any tip ver
			const routes = e.routes;
			if (routes.length > 0) {
				const summary = routes[0].summary;
				console.log('[RoutingMachine] Route found:', summary);
				if(onRouteFound) {
					onRouteFound({
						distance: summary.totalDistance, // metre
						duration: summary.totalTime,     // saniye
					});
				}
			}
		});

		routingControl.on('routingerror', function(e: any) { // e'ye any tip ver
			 console.error("[RoutingMachine] Routing error:", e.error);
		});

		// Cleanup: Component unmount edildiğinde routing control'ü kaldır
		return () => {
			if (map && routingControl) {
				console.log('[RoutingMachine] Removing routing control.');
				map.removeControl(routingControl);
			}
		};
	}, [map, start, end, onRouteFound]);

	return null;
};

// --- Ana Harita Bileşeni ---
const MapDisplay: React.FC<MapDisplayProps> = ({
	center = [35.1264, 33.4299],
	zoom = 9,
	markers = [],
	style,
	mapHeight = '400px',
	bounds,
	pickupCoords,
	dropoffCoords,
	onRouteFound
}) => {
	const mapRef = useRef<L.Map | null>(null);
	const routingControlRef = useRef<L.Routing.Control | null>(null);

	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;

		// Rota kontrolünü oluştur veya güncelle
		if (pickupCoords && dropoffCoords) {
			const waypoints = [
				L.latLng(pickupCoords[0], pickupCoords[1]),
				L.latLng(dropoffCoords[0], dropoffCoords[1])
			];

			// const planOptions = { // Unused variable
			// 	addWaypoints: false, // Yeni waypoint eklemeyi kapat
			// 	draggableWaypoints: false, // Sürüklemeyi kapat
			// 	createMarker: function(i: number, waypoint: any, n: number) { // L.Routing.Waypoint yerine any
			// 		const iconUrl = i === 0 ? 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png' : (i === n - 1 ? 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png' : undefined);
			// 		const popupText = i === 0 ? 'Alış Noktası' : (i === n - 1 ? 'Bırakış Noktası' : `Ara Nokta ${i + 1}`); // Unused variable
			// 		let marker;
			// 		if (iconUrl) {
			// 			const customIcon = L.icon({
			// 				iconUrl: iconUrl,
			// 				iconSize: [30, 41],
			// 				iconAnchor: [15, 41],
			// 				popupAnchor: [0, -41]
			// 			});
			// 			marker = L.marker(waypoint.latLng, { icon: customIcon, draggable: false });
			// 		} else {
			// 			marker = L.marker(waypoint.latLng, { draggable: false });
			// 		}
			// 		(marker as any)._routingMarker = true;
			// 		return null; // Rota makinesi marker oluşturmasın
			// 	}
			// };

			const routingOptions: L.Routing.RoutingControlOptions & { plan?: L.Routing.PlanOptions } = {
				waypoints: waypoints,
				routeWhileDragging: false,
				lineOptions: {
					styles: [{ color: '#1d4ed8', opacity: 0.8, weight: 6 }],
					extendToWaypoints: false, // Eksik özellik eklendi
					missingRouteTolerance: 50 // Eksik özellik için varsayılan değer eklendi
				},
				show: false, // Rota özetini gizle
				addWaypoints: false,
				fitSelectedRoutes: true, // Otomatik zoom/fit yap
			};

			if (routingControlRef.current) {
				console.log("[MapDisplay] Updating existing routing control waypoints.");
				routingControlRef.current.setWaypoints(waypoints);
			} else {
				console.log("[MapDisplay] Creating new routing control.");
				routingControlRef.current = L.Routing.control(routingOptions).addTo(map);
				routingControlRef.current.on('routesfound', function(e: any) { // L.Routing.RoutesFoundEvent yerine any
					const routes = e.routes;
					if (routes.length > 0) {
						const summary = routes[0].summary;
						const routeData: RouteInfo = {
							distance: summary.totalDistance, // metre cinsinden
							duration: summary.totalTime // saniye cinsinden
						};
						console.log("[MapDisplay] Route found:", routeData);
						if (onRouteFound) {
							onRouteFound(routeData);
						}
					}
				}).on('routingerror', function(e: any) { // L.Routing.RoutingErrorEvent yerine any
					console.error("[MapDisplay] Routing error:", e.error);
				});
			}
		} else if (routingControlRef.current) {
			console.log("[MapDisplay] Removing routing control.");
			map.removeControl(routingControlRef.current);
			routingControlRef.current = null;
		}

		// Haritayı Sığdırma (rota çizimi yoksa veya markerlar için)
		if (!pickupCoords || !dropoffCoords) {
            if (bounds) { // Bounds varsa fitBounds kullan
                map.fitBounds(bounds as LatLngBoundsExpression);
            } else if (markers.length > 0) { // Markerlar varsa ve bounds yoksa, markerlara fit et
                const markerBounds = L.latLngBounds(markers.map(m => m.position as LatLngExpression));
                if (markerBounds.isValid()) {
                    map.fitBounds(markerBounds, { padding: [50, 50] }); // Biraz padding ekleyebiliriz
                }
            } // Hiçbir şey yoksa varsayılan merkez/zoom'da kalır
		}
	}, [pickupCoords, dropoffCoords, mapHeight, center, zoom, bounds, markers, onRouteFound]); // Bağımlılıklar kontrol edildi

	const mapStyle = {
		height: mapHeight,
		width: '100%',
		...style // Dışarıdan gelen ek stilleri birleştir
	};

	return (
		<MapContainer
			center={center as LatLngExpression}
			zoom={zoom}
			style={mapStyle}
			scrollWheelZoom={false}
			ref={mapRef}
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			{/* Mevcut Markerları ve Rota Markerlarını Göster (Declarative) */}
			{markers.map((markerData, index) => {
				// Güvenli pozisyon kontrolü
				const position = markerData.position;
				if (!Array.isArray(position) || position.length !== 2 || typeof position[0] !== 'number' || typeof position[1] !== 'number') return null;

				return (
					<Marker key={`prop-marker-${index}`} position={position as LatLngExpression}>
						{markerData.popupText && (
							<Tooltip permanent direction="top" offset={[0, -41]} className="custom-leaflet-tooltip">
								{markerData.popupText}
							</Tooltip>
						)}
					</Marker>
				);
			})}
			{/* Rota Çizimi (eğer başlangıç ve bitiş varsa) */}
			{pickupCoords && dropoffCoords && (
				<RoutingMachine
					start={pickupCoords}
					end={dropoffCoords}
					onRouteFound={onRouteFound}
				/>
			)}
			{/* Haritayı Sığdırma (rota çizimi yoksa veya markerlar için) */}
            {(!pickupCoords || !dropoffCoords) && bounds && <FitBounds bounds={bounds} />}
		</MapContainer>
	);
};

// MarkerData tipini de export et (rezervasyon-basarili sayfasında kullanılıyordu)
export type { MarkerData };
export default MapDisplay;