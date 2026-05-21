import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Fix for default marker icons in React Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  stops: Array<{
    id: string;
    latitude: number;
    longitude: number;
    name: string;
    order_index?: number;
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

  const positions = stops.map(s => [s.latitude, s.longitude] as [number, number]);
  const bounds = L.latLngBounds(positions);

  // Helper to decode polyline if needed, or we can use a library
  // For now, let's assume we might receive coordinates or just use the stops
  
  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border shadow-inner bg-slate-100">
      <MapContainer 
        bounds={bounds} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView bounds={bounds} />
        
        {stops.map((stop, index) => (
          <Marker key={stop.id} position={[stop.latitude, stop.longitude]}>
            <Popup>
              <div className="text-sm font-medium">
                {stop.order_index !== undefined ? `${stop.order_index + 1}. ` : ''}
                {stop.name}
              </div>
            </Popup>
          </Marker>
        ))}

        {positions.length > 1 && !routeGeometry && (
          <Polyline positions={positions} color="blue" weight={3} opacity={0.6} dashArray="5, 10" />
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;
