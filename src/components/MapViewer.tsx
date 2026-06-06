import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  Polyline,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteState } from '../types/gpx';
import type { UserLocation } from '../types/location';

// Leaflet 기본 마커 아이콘 (Vite 환경에서 깨지는 문제) 해결을 위해
// CDN 의 아이콘 URL 을 명시적으로 지정한다.
const defaultIcon = L.icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapViewerProps {
  /** 표시할 경로들 */
  routes: RouteState[];
  /** 활성 경로 ID (마커/팝업 강조) */
  activeRouteId?: string | null;
  /** 공통 km 구간 (있으면 모든 visible 경로에서 강조) */
  highlightRange?: { startKm: number; endKm: number } | null;
  /** "전체 보기" 트리거 카운트 (값이 바뀌면 fitBounds) */
  fitAllTrigger?: number;
  /** 사용자 현재 위치 (있으면 마커 표시) */
  userLocation?: UserLocation | null;
  /** "내 위치로 이동" 트리거 (값이 바뀌면 flyTo) */
  panToUserTrigger?: number;
}

/**
 * visible 경로 전체의 bounds 로 fitBounds 한다.
 */
function FitBoundsOnRoutes({ routes, trigger }: { routes: RouteState[]; trigger: number }) {
  const map = useMap();

  useEffect(() => {
    if (routes.length === 0) return;
    const bounds = L.latLngBounds([]);
    for (const s of routes) {
      if (!s.visible) continue;
      const [[sLat, sLng], [nLat, eLng]] = s.route.bounds;
      bounds.extend([sLat, sLng]);
      bounds.extend([nLat, eLng]);
    }
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, trigger, routes.length, routes.map((r) => r.id).join(',')]);

  return null;
}

/**
 * 특정 경로 1개의 bounds 로 부드럽게 이동 (활성 경로 변경 시).
 */
function PanToRoute({ route }: { route: RouteState | null }) {
  const map = useMap();
  useEffect(() => {
    if (!route || !route.visible) return;
    const [[sLat, sLng], [nLat, eLng]] = route.route.bounds;
    const bounds = L.latLngBounds([sLat, sLng], [nLat, eLng]);
    map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 0.6 });
  }, [map, route?.id, route?.visible]);
  return null;
}

/** 사용자 위치로 부드럽게 이동 (panToUserTrigger 가 바뀔 때) */
function PanToUser({ location, trigger }: { location: UserLocation | null; trigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (!location) return;
    map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 14), {
      duration: 0.6
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng, trigger]);
  return null;
}

export function MapViewer({
  routes,
  activeRouteId = null,
  highlightRange = null,
  fitAllTrigger = 0,
  userLocation = null,
  panToUserTrigger = 0
}: MapViewerProps) {
  const defaultCenter: [number, number] = [37.5665, 126.978];
  const defaultZoom = 7;

  const visibleRoutes = useMemo(
    () => routes.filter((r) => r.visible),
    [routes]
  );

  const activeRoute = useMemo(
    () => routes.find((r) => r.id === activeRouteId) ?? null,
    [routes, activeRouteId]
  );

  // 공통 하이라이트 구간 → 각 경로별 좌표 슬라이스
  const highlightLines = useMemo(() => {
    if (!highlightRange) return [];
    const { startKm, endKm } = highlightRange;
    const lo = Math.max(0, Math.min(startKm, endKm));
    const hi = Math.max(lo, Math.max(startKm, endKm));
    return visibleRoutes
      .map((state) => {
        const sIdx = findClosestIndex(state.trackPoints, lo);
        const eIdx = findClosestIndex(state.trackPoints, hi);
        if (sIdx === eIdx) return null;
        const positions = state.route.coordinates
          .slice(sIdx, eIdx + 1)
          .map((c) => [c[1], c[0]] as [number, number]);
        if (positions.length < 2) return null;
        return { id: state.id, color: state.color, positions };
      })
      .filter((x): x is { id: string; color: string; positions: [number, number][] } => x !== null);
  }, [visibleRoutes, highlightRange]);

  return (
    <div className="map-shell relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-ink-700">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom
        zoomControl
        attributionControl
        className="h-full w-full"
        style={{ background: '#0F1419' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visibleRoutes.map((state) => (
          <Polyline
            key={state.id}
            positions={state.route.coordinates.map(
              (c) => [c[1], c[0]] as [number, number]
            )}
            pathOptions={{
              color: state.color,
              weight: state.id === activeRouteId ? 5 : 4,
              opacity: state.id === activeRouteId ? 1 : 0.85,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        ))}

        {highlightLines.map((hl) => (
          <Polyline
            key={`hl-${hl.id}`}
            positions={hl.positions}
            pathOptions={{
              color: '#FBBF24',
              weight: 7,
              opacity: 1,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        ))}

        {activeRoute
          ? (() => {
              const startIcon = L.divIcon({
                className: 'route-marker',
                html: `<div class="route-marker-dot" style="background:${activeRoute.color};color:${activeRoute.color}" title="시작"></div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
              });
              const endIcon = L.divIcon({
                className: 'route-marker',
                html: `<div class="route-marker-dot" style="background:${activeRoute.color};color:${activeRoute.color}" title="종료"></div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
              });
              return (
                <>
                  <Marker
                    position={[
                      activeRoute.route.startPoint.lat,
                      activeRoute.route.startPoint.lng
                    ]}
                    icon={startIcon}
                  >
                    <Popup>
                      <div className="font-mono text-xs">
                        <div className="mb-1 font-sans text-sm font-semibold">
                          {activeRoute.name} · 시작
                        </div>
                        <div>lat: {activeRoute.route.startPoint.lat.toFixed(5)}</div>
                        <div>lng: {activeRoute.route.startPoint.lng.toFixed(5)}</div>
                      </div>
                    </Popup>
                  </Marker>
                  <Marker
                    position={[
                      activeRoute.route.endPoint.lat,
                      activeRoute.route.endPoint.lng
                    ]}
                    icon={endIcon}
                  >
                    <Popup>
                      <div className="font-mono text-xs">
                        <div className="mb-1 font-sans text-sm font-semibold">
                          {activeRoute.name} · 종료
                        </div>
                        <div>lat: {activeRoute.route.endPoint.lat.toFixed(5)}</div>
                        <div>lng: {activeRoute.route.endPoint.lng.toFixed(5)}</div>
                      </div>
                    </Popup>
                  </Marker>
                </>
              );
            })()
          : null}

        <FitBoundsOnRoutes routes={routes} trigger={fitAllTrigger} />
        <PanToRoute route={activeRoute} />
        <PanToUser location={userLocation ?? null} trigger={panToUserTrigger} />

        {userLocation ? (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={Math.max(15, userLocation.accuracyM)}
              pathOptions={{
                color: '#22D3EE',
                weight: 1,
                fillColor: '#22D3EE',
                fillOpacity: 0.1
              }}
            />
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={L.divIcon({
                className: 'user-location-marker',
                html:
                  '<div class="user-location-dot"><div class="user-location-pulse"></div><div class="user-location-core"></div></div>',
                iconSize: [22, 22],
                iconAnchor: [11, 11]
              })}
            >
              <Popup>
                <div className="font-mono text-xs">
                  <div className="mb-1 font-sans text-sm font-semibold">
                    현재 위치
                  </div>
                  <div>lat: {userLocation.lat.toFixed(5)}</div>
                  <div>lng: {userLocation.lng.toFixed(5)}</div>
                  <div>±{Math.round(userLocation.accuracyM)}m</div>
                </div>
              </Popup>
            </Marker>
          </>
        ) : null}
      </MapContainer>

      {routes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-900/40 px-4">
          <div className="pointer-events-auto max-w-xs rounded-2xl border border-white/10 bg-ink-800/85 px-6 py-5 text-center backdrop-blur">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6c4 0 4 4 8 4s4-4 8-4" />
                <path d="M3 12c4 0 4 4 8 4s4-4 8-4" />
                <path d="M3 18c4 0 4 4 8 4s4-4 8-4" />
              </svg>
            </div>
            <p className="font-display text-sm font-semibold text-zinc-100">
              GPX 파일을 업로드하면
              <br />
              경로가 지도에 표시됩니다.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              상단의 <span className="text-accent">GPX 파일 선택</span> 버튼을
              눌러 <strong>여러 파일</strong>을 한 번에 비교할 수 있습니다.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function findClosestIndex(
  points: { cumulativeDistanceKm: number }[],
  km: number
): number {
  if (points.length === 0) return 0;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].cumulativeDistanceKm < km) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0) {
    const a = points[lo - 1];
    const b = points[lo];
    if (
      Math.abs(a.cumulativeDistanceKm - km) <
      Math.abs(b.cumulativeDistanceKm - km)
    ) {
      return lo - 1;
    }
  }
  return lo;
}
