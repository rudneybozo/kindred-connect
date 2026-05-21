import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import polyline from '@mapbox/polyline';

// Fix for default marker icons in React Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const vehicleIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapViewProps {
  stops: Array<{
    id: string;
    latitude: number;
    longitude: number;
    name: string;
    order_index?: number;
    type?: 'customer' | 'vehicle';
    driverName?: string;
  }>;
  routeGeometry?: string; // Polyline encoded string
}

function ChangeView({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

const MapView = ({ stops, routeGeometry }: MapViewProps) => {
  if (stops.length === 0) return null;

  const decodedRoute = useMemo(() => {
    if (!routeGeometry) return null;
    try {
      // polyline.decode returns [lat, lng] pairs
      return polyline.decode(routeGeometry);
    } catch (e) {
      console.error('Error decoding polyline:', e);
      return null;
    }
  }, [routeGeometry]);

  const positions = stops.map(s => [s.latitude, s.longitude] as [number, number]);
  
  // If we have a decoded route, include its points in bounds
  const boundsPoints = decodedRoute ? [...positions, ...decodedRoute as [number, number][]] : positions;
  const bounds = L.latLngBounds(boundsPoints);

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border shadow-inner bg-slate-100 relative z-0">
      <MapContainer 
        bounds={bounds} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView bounds={bounds} />
        
        {stops.map((stop) => (
          <Marker 
            key={stop.id} 
            position={[stop.latitude, stop.longitude]}
            icon={stop.type === 'vehicle' ? vehicleIcon : customerIcon}
          >
            <Popup>
              <div className="text-sm font-medium">
                {stop.type === 'vehicle' ? (
                  <div className="flex flex-col">
                    <span className="font-bold text-red-600">Veículo / Motorista</span>
                    <span>{stop.driverName || 'Motorista'}</span>
                    <span className="text-xs text-gray-500 font-normal">Ponto de Partida</span>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="font-bold text-blue-600">
                      {stop.order_index !== undefined ? `Parada #${stop.order_index + 1}` : 'Cliente'}
                    </span>
                    <span>{stop.name}</span>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {decodedRoute && (
          <Polyline 
            positions={decodedRoute as [number, number][]} 
            color="#2563eb" 
            weight={5} 
            opacity={0.8}
            lineJoin="round"
          />
        )}

        {positions.length > 1 && !routeGeometry && (
          <Polyline positions={positions} color="#2563eb" weight={3} opacity={0.6} dashArray="5, 10" />
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;