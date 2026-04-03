import React, { useEffect } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Listing, School } from '../types';

const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const highlightedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapViewportController({
  selectedSchool,
  selectedListing,
  listings
}: {
  selectedSchool?: School;
  selectedListing: Listing | null;
  listings: Listing[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedListing) {
      map.setView([selectedListing.latitude, selectedListing.longitude], Math.max(map.getZoom(), 14), { animate: true });
      return;
    }
    if (listings.length > 0) {
      const bounds = L.latLngBounds(listings.map((item) => [item.latitude, item.longitude] as [number, number]));
      if (selectedSchool) bounds.extend([selectedSchool.latitude, selectedSchool.longitude]);
      map.fitBounds(bounds, { padding: [35, 35], animate: true });
      return;
    }
    if (selectedSchool) {
      map.setView([selectedSchool.latitude, selectedSchool.longitude], 13, { animate: true });
    }
  }, [map, selectedListing, listings, selectedSchool]);

  return null;
}

type Props = {
  selectedSchool?: School;
  selectedListing: Listing | null;
  listings: Listing[];
  recommendedIds: string[];
  radiusKm: number;
  mapTheme: 'street' | 'terrain';
  setSelectedListingId: (id: string) => void;
};

export function MapWorkspace({
  selectedSchool,
  selectedListing,
  listings,
  recommendedIds,
  radiusKm,
  mapTheme,
  setSelectedListingId
}: Props) {
  if (!selectedSchool) return null;

  return (
    <section className="map-pane panel">
      <div className="map-head">
        <div>
          <h2>Explore on Map</h2>
          <p className="muted">
            {selectedSchool.name} • {listings.length} listing{listings.length === 1 ? '' : 's'} in view
          </p>
        </div>
        <div className="map-head-badges">
          {recommendedIds.length > 0 && (
            <span className="meta-pill verified">🤖 {recommendedIds.length} AI picks</span>
          )}
        </div>
      </div>

      <MapContainer
        className="map-canvas"
        center={[selectedSchool.latitude, selectedSchool.longitude]}
        zoom={13}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={
            mapTheme === 'street'
              ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              : 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
          }
        />
        <MapViewportController
          selectedSchool={selectedSchool}
          selectedListing={selectedListing}
          listings={listings}
        />
        <Circle
          center={[selectedSchool.latitude, selectedSchool.longitude]}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#2563eb', fillOpacity: 0.06, weight: 2 }}
        />
        {listings.map((item) => (
          <Marker
            key={item.id}
            icon={recommendedIds.includes(item.id) ? highlightedIcon : defaultIcon}
            position={[item.latitude, item.longitude]}
            eventHandlers={{ click: () => setSelectedListingId(item.id) }}
          >
            <Popup>
              <strong>{item.title}</strong><br />
              {item.locationLabel}<br />
              R{item.price} {item.currency} — {item.distanceKm?.toFixed(1)}km
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </section>
  );
}
