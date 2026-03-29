import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue with Vite bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

import { useSettingsStore } from '../../store/useSettingsStore';

// ── Types ──

interface RouteData {
  name: string;
  path: string;
  distance: string;
  destination: string;
  waypoints: string;
  notes: string;
}

interface RallyPoints {
  primary: string;
  secondary: string;
  outOfArea: string;
}

// ── Colored marker factory ──

function createColoredIcon(color: string): L.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#222" stroke-width="1"/>
    <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
  </svg>`;
  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

const RALLY_COLORS: Record<string, { color: string; label: string; priority: string }> = {
  primary: { color: '#3fb950', label: 'Primary Rally Point', priority: 'Home / Safe Room' },
  secondary: { color: '#d29922', label: 'Secondary Rally Point', priority: 'Backup Location' },
  outOfArea: { color: '#f0883e', label: 'Out-of-Area Rally Point', priority: 'Route Waypoint' },
};

const ROUTE_COLORS: Record<string, string> = {
  alpha: '#3fb950',   // green
  bravo: '#58a6ff',   // blue
  charlie: '#bc8cff',  // purple
};

const ROUTE_LABELS: Record<string, string> = {
  alpha: 'Route Alpha (Primary)',
  bravo: 'Route Bravo (Alternate)',
  charlie: 'Route Charlie (On Foot)',
};

// ── Default center: continental US ──
const DEFAULT_CENTER: [number, number] = [39.8, -98.5];
const DEFAULT_ZOOM = 4;
const CONFIGURED_ZOOM = 8;

// ── Haversine distance (miles) ──
function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Parse distance from route data (e.g., "200 miles / 3.5 hrs") ──
function parseDistanceMiles(distStr: string): number | null {
  if (!distStr) return null;
  const match = distStr.match(/(\d+(?:\.\d+)?)\s*(?:mi|mile)/i);
  if (match) return parseFloat(match[1]);
  // Try just a number
  const numMatch = distStr.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) return parseFloat(numMatch[1]);
  return null;
}

// ── Read localStorage ──
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

// ── Generate simple route line (bearing-based offset from origin) ──
function generateRouteLine(
  origin: [number, number],
  routeId: string,
  distanceMiles: number | null,
): [number, number][] {
  // Each route gets a different general direction
  const bearings: Record<string, number> = {
    alpha: -30,   // northwest-ish
    bravo: 60,    // northeast-ish
    charlie: -60, // west-ish
  };
  const bearing = ((bearings[routeId] ?? 0) * Math.PI) / 180;
  const dist = distanceMiles ?? 100; // default 100 miles
  // Convert miles to rough lat/lng offset
  const latPerMile = 1 / 69;
  const lngPerMile = 1 / (69 * Math.cos((origin[0] * Math.PI) / 180));

  const midDist = dist * 0.5;
  const midOffsetLat = Math.cos(bearing + 0.15) * midDist * latPerMile;
  const midOffsetLng = Math.sin(bearing + 0.15) * midDist * lngPerMile;

  const endOffsetLat = Math.cos(bearing) * dist * latPerMile;
  const endOffsetLng = Math.sin(bearing) * dist * lngPerMile;

  return [
    origin,
    [origin[0] + midOffsetLat, origin[1] + midOffsetLng],
    [origin[0] + endOffsetLat, origin[1] + endOffsetLng],
  ];
}

// ── Component ──

export default function RouteMap() {
  const location = useSettingsStore((s) => s.location);

  const hasCoords = location.latitude != null && location.longitude != null;
  const center: [number, number] = hasCoords
    ? [location.latitude!, location.longitude!]
    : DEFAULT_CENTER;
  const zoom = hasCoords ? CONFIGURED_ZOOM : DEFAULT_ZOOM;

  // Read rally points
  const rallyPoints = useMemo<RallyPoints>(
    () => readJson('bugout-rally', { primary: '', secondary: '', outOfArea: '' }),
    [],
  );

  // Read routes
  const routes = useMemo<Record<string, RouteData>>(
    () => readJson('bugout-routes', {}),
    [],
  );

  // Rally markers
  const rallyMarkers = useMemo(() => {
    if (!hasCoords) return [];
    const entries = Object.entries(rallyPoints) as [string, string][];
    return entries
      .filter(([, val]) => val && val.trim().length > 0)
      .map(([key, val], idx) => {
        const config = RALLY_COLORS[key] || RALLY_COLORS.primary;
        // Offset markers slightly from center so they don't stack
        const offsets: [number, number][] = [
          [0, 0],
          [0.015, 0.02],
          [-0.01, 0.03],
        ];
        const offset = offsets[idx] || [0, 0];
        return {
          key,
          position: [center[0] + offset[0], center[1] + offset[1]] as [number, number],
          icon: createColoredIcon(config.color),
          label: config.label,
          priority: config.priority,
          name: val,
        };
      });
  }, [hasCoords, rallyPoints, center]);

  // Route lines
  const routeLines = useMemo(() => {
    if (!hasCoords) return [];
    return Object.entries(routes)
      .filter(([, r]) => r.name || r.path || r.distance)
      .map(([id, r]) => {
        const distMiles = parseDistanceMiles(r.distance);
        return {
          id,
          color: ROUTE_COLORS[id] || '#58a6ff',
          label: ROUTE_LABELS[id] || `Route ${id}`,
          positions: generateRouteLine(center, id, distMiles),
          data: r,
        };
      });
  }, [hasCoords, routes, center]);

  // Distance info for first route with distance data
  const distanceInfo = useMemo(() => {
    for (const [, r] of Object.entries(routes)) {
      const miles = parseDistanceMiles(r.distance);
      if (miles && miles > 0) {
        const drivingHrs = (miles / 50).toFixed(1);
        const footDays = (miles / 17.5).toFixed(1); // avg of 15-20 mi/day
        return { miles: Math.round(miles), drivingHrs, footDays, routeName: r.name || 'primary route' };
      }
    }
    // If we have coords and rally points, estimate from straight-line
    if (hasCoords && rallyMarkers.length > 0) {
      const farthest = rallyMarkers[rallyMarkers.length - 1];
      const miles = haversineMiles(center[0], center[1], farthest.position[0], farthest.position[1]);
      if (miles > 1) {
        const drivingHrs = (miles / 50).toFixed(1);
        const footDays = (miles / 17.5).toFixed(1);
        return { miles: Math.round(miles), drivingHrs, footDays, routeName: farthest.name };
      }
    }
    return null;
  }, [routes, hasCoords, rallyMarkers, center]);

  return (
    <div className="mb-6">
      {/* Map container */}
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 400 }}>
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#161b22' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User location marker */}
          {hasCoords && (
            <Marker position={center}>
              <Popup>
                <strong>{location.city || 'Your Location'}{location.state ? `, ${location.state}` : ''}</strong>
                <br />
                <span style={{ fontSize: '0.8em', color: '#888' }}>
                  {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                </span>
              </Popup>
            </Marker>
          )}

          {/* Rally point markers */}
          {rallyMarkers.map((m) => (
            <Marker key={m.key} position={m.position} icon={m.icon}>
              <Popup>
                <strong>{m.label}</strong>
                <br />
                {m.name}
                <br />
                <span style={{ fontSize: '0.8em', color: '#888' }}>Priority: {m.priority}</span>
              </Popup>
            </Marker>
          ))}

          {/* Route lines */}
          {routeLines.map((rl) => (
            <Polyline
              key={rl.id}
              positions={rl.positions}
              pathOptions={{ color: rl.color, weight: 3, opacity: 0.8, dashArray: rl.id === 'charlie' ? '10 6' : undefined }}
            >
              <Popup>
                <strong>{rl.label}</strong>
                {rl.data.name && <><br />{rl.data.name}</>}
                {rl.data.distance && <><br />{rl.data.distance}</>}
                {rl.data.destination && <><br />To: {rl.data.destination}</>}
              </Popup>
            </Polyline>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-2 px-1">
        {hasCoords && (
          <span className="flex items-center gap-1.5 text-xs text-text-dim">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-2 inline-block" /> Your Location
          </span>
        )}
        {rallyMarkers.length > 0 && Object.entries(RALLY_COLORS).map(([key, cfg]) => {
          if (!rallyPoints[key as keyof RallyPoints]) return null;
          return (
            <span key={key} className="flex items-center gap-1.5 text-xs text-text-dim">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: cfg.color }} /> {cfg.label}
            </span>
          );
        })}
        {routeLines.map((rl) => (
          <span key={rl.id} className="flex items-center gap-1.5 text-xs text-text-dim">
            <span className="w-4 h-0.5 inline-block rounded" style={{ backgroundColor: rl.color }} /> {rl.label}
          </span>
        ))}
      </div>

      {/* Distance / time estimate */}
      {distanceInfo && (
        <div className="mt-3 bg-surface border border-border rounded-md p-3">
          <h5 className="text-xs uppercase tracking-wider text-text-dim mb-1.5">
            Travel Estimate &mdash; {distanceInfo.routeName}
          </h5>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-text-primary">
              <span className="text-accent-2 font-medium">{distanceInfo.miles} mi</span>{' '}
              straight-line distance
            </span>
            <span className="text-text-primary">
              Driving: ~<span className="text-threat-green font-medium">{distanceInfo.drivingHrs} hrs</span> at 50 mph
            </span>
            <span className="text-text-primary">
              On foot: ~<span className="text-threat-yellow font-medium">{distanceInfo.footDays} days</span> at 15-20 mi/day
            </span>
          </div>
        </div>
      )}

      {/* Hint when no coordinates configured */}
      {!hasCoords && (
        <p className="text-xs text-text-dim mt-2 italic">
          Set your latitude/longitude in Settings &rarr; Location to center the map on your position and see route overlays.
        </p>
      )}
    </div>
  );
}
