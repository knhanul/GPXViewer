import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  Polyline,
  TileLayer,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ParsedRoute } from '../types/gpx';

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
  route: ParsedRoute | null;
}

/**
 * 라우트가 바뀌면 자동으로 fitBounds 한다.
 * MapContainer 의 자식으로 사용되어 useMap 훅에 접근한다.
 */
function FitBoundsOnRoute({ route }: { route: ParsedRoute | null }) {
  const map = useMap();

  useEffect(() => {
    if (!route) return;
    const [[south, west], [north, east]] = route.bounds;
    const bounds = L.latLngBounds(
      [south, west],
      [north, east]
    );
    // 경로가 한 점에 가까울 경우 너무 좁아지지 않도록 padding 과 maxZoom 설정
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 16
    });
  }, [map, route]);

  return null;
}

/**
 * Leaflet 기반 지도 뷰어.
 * - OpenStreetMap 타일 사용 (운영 환경에서는 타일 제공 정책 확인 필요)
 * - 라우트가 있을 때 Polyline, 시작/종료 마커 표시
 * - 라우트 변경 시 자동 fitBounds
 * - 모바일에서 pinch-zoom, tap 활성화
 */
export function MapViewer({ route }: MapViewerProps) {
  // 빈 상태에서는 한국 중심 (서울) 으로 초기 뷰를 잡는다.
  const defaultCenter: [number, number] = [37.5665, 126.978];
  const defaultZoom = 7;

  // polyline 의 positions 는 Leaflet 형식 [lat, lng] 이다.
  const polylinePositions = useMemo<[number, number][]>(() => {
    if (!route) return [];
    return route.coordinates.map(([lng, lat]) => [lat, lng]);
  }, [route]);

  const startIcon = useMemo(
    () =>
      L.divIcon({
        className: 'route-marker',
        html: `<div class="route-marker-dot route-marker-start" title="시작"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      }),
    []
  );

  const endIcon = useMemo(
    () =>
      L.divIcon({
        className: 'route-marker',
        html: `<div class="route-marker-dot route-marker-end" title="종료"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      }),
    []
  );

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
        {/*
          운영 환경에서는 OpenStreetMap 타일 사용 정책(https://operations.osmfoundation.org/policies/tiles/)을
          반드시 확인하고, 상용 서비스에서는 Mapbox/MapTiler/Thunderingforest 등
          공식 제공자 키를 사용해야 한다.
        */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {route ? (
          <>
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: '#F97316',
                weight: 4,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
            <Marker
              position={[route.startPoint.lat, route.startPoint.lng]}
              icon={startIcon}
            >
              <Popup>
                <div className="font-mono text-xs">
                  <div className="mb-1 font-sans text-sm font-semibold">시작점</div>
                  <div>lat: {route.startPoint.lat.toFixed(5)}</div>
                  <div>lng: {route.startPoint.lng.toFixed(5)}</div>
                </div>
              </Popup>
            </Marker>
            <Marker
              position={[route.endPoint.lat, route.endPoint.lng]}
              icon={endIcon}
            >
              <Popup>
                <div className="font-mono text-xs">
                  <div className="mb-1 font-sans text-sm font-semibold">종료점</div>
                  <div>lat: {route.endPoint.lat.toFixed(5)}</div>
                  <div>lng: {route.endPoint.lng.toFixed(5)}</div>
                </div>
              </Popup>
            </Marker>
            <FitBoundsOnRoute route={route} />
          </>
        ) : null}
      </MapContainer>

      {!route ? (
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
              누르거나, 파일을 이 영역에 끌어다 놓아 시작하세요.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
