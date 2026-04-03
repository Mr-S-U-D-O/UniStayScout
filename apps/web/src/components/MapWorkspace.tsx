import React, { useEffect, useMemo } from 'react';
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

const schoolIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
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

  const mapStats = useMemo(() => {
    if (listings.length === 0) {
      return {
        avgPrice: 0,
        verifiedCount: 0,
        nearestDistance: null as number | null,
      };
    }

    const avgPrice = Math.round(listings.reduce((sum, listing) => sum + listing.price, 0) / listings.length);
    const verifiedCount = listings.filter((listing) => listing.isVerified).length;
    const nearestDistance = listings.reduce<number | null>((nearest, listing) => {
      if (typeof listing.distanceKm !== 'number') return nearest;
      if (nearest === null) return listing.distanceKm;
      return Math.min(nearest, listing.distanceKm);
    }, null);

    return { avgPrice, verifiedCount, nearestDistance };
  }, [listings]);

  const spotlightListings = useMemo(() => {
    return [...listings]
      .sort((a, b) => {
        const aRecommended = recommendedIds.includes(a.id) ? 1 : 0;
        const bRecommended = recommendedIds.includes(b.id) ? 1 : 0;
        if (aRecommended !== bRecommended) return bRecommended - aRecommended;

        const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      })
      .slice(0, 3);
  }, [listings, recommendedIds]);

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
            <span className="meta-pill verified">{recommendedIds.length} AI picks</span>
          )}
          <span className="meta-pill map-theme-pill">{mapTheme === 'street' ? 'Street view' : 'Terrain view'}</span>
        </div>
      </div>

      <div className="map-insights">
        <div className="map-insight-chip">
          <span className="map-insight-label">Average rent</span>
          <strong>R{mapStats.avgPrice || 0}</strong>
        </div>
        <div className="map-insight-chip">
          <span className="map-insight-label">Verified</span>
          <strong>{mapStats.verifiedCount}/{listings.length}</strong>
        </div>
        <div className="map-insight-chip">
          <span className="map-insight-label">Nearest listing</span>
          <strong>{mapStats.nearestDistance === null ? 'N/A' : `${mapStats.nearestDistance.toFixed(1)} km`}</strong>
        </div>
      </div>

      <div className="map-stage">
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
          <Marker
            icon={schoolIcon}
            position={[selectedSchool.latitude, selectedSchool.longitude]}
          >
            <Popup>
              <strong>{selectedSchool.name}</strong><br />
              Selected school
            </Popup>
          </Marker>
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
                R{item.price} {item.currency} - {item.distanceKm?.toFixed(1)}km
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {spotlightListings.length > 0 && (
          <aside className="map-spotlight">
            <h3>Map Spotlight</h3>
            <div className="map-spotlight-list">
              {spotlightListings.map((listing) => (
                <button
                  type="button"
                  key={listing.id}
                  className={`map-spotlight-item ${selectedListing?.id === listing.id ? 'active' : ''}`}
                  onClick={() => setSelectedListingId(listing.id)}
                >
                  <span className="map-spotlight-title">{listing.title}</span>
                  <span className="map-spotlight-meta">R{listing.price} {listing.currency} • {listing.distanceKm?.toFixed(1) ?? 'N/A'}km</span>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
