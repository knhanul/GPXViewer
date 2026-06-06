// GPX 파일을 브라우저에서만 파싱하기 위한 유틸.
// FileReader 로 텍스트를 읽고 DOMParser 로 XML 을 파싱한 뒤
// @tmcw/togeojson 의 gpx() 로 GeoJSON 으로 변환한다.

import { gpx as toGeoJSONGpx } from '@tmcw/togeojson';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import { buildRouteMetadata } from './routeUtils';
import type { ParsedRoute } from '../types/gpx';

/**
 * 사용자에게 보여줄 에러 메시지를 정의한다.
 */
export class GpxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GpxParseError';
  }
}

/**
 * FileReader 로 파일을 텍스트로 읽는다.
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new GpxParseError('파일을 텍스트로 읽을 수 없습니다.'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => {
      reject(new GpxParseError('파일 읽기 중 오류가 발생했습니다.'));
    };
    reader.readAsText(file);
  });
}

/**
 * 텍스트를 DOMParser 로 파싱하여 XMLDocument 를 만든다.
 */
function parseXml(text: string): XMLDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');

  // 파싱 에러는 <parsererror> 노드로 노출된다.
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    throw new GpxParseError('GPX 파일의 XML 파싱에 실패했습니다.');
  }
  return doc;
}

/**
 * togeojson 으로 변환된 FeatureCollection 에서
 * LineString (트랙) 좌표만 추출한다.
 *
 * GPX 는 trkpt / rtept 가 포함될 수 있는데, 본 뷰어에서는
 * 첫 번째 유효한 LineString 을 사용한다.
 * 좌표는 GeoJSON 표준 [lng, lat, ele?] 형식을 그대로 보존한다.
 */
function extractLineCoordinates(
  fc: FeatureCollection
): [number, number, number?][] {
  const coordinates: [number, number, number?][] = [];

  for (const feature of fc.features as Feature<LineString>[]) {
    if (!feature || !feature.geometry) continue;
    if (feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates;
      if (Array.isArray(coords) && coords.length > 0) {
        for (const c of coords) {
          if (
            Array.isArray(c) &&
            c.length >= 2 &&
            typeof c[0] === 'number' &&
            typeof c[1] === 'number'
          ) {
            const elev = typeof c[2] === 'number' ? c[2] : undefined;
            coordinates.push([c[0], c[1], elev]);
          }
        }
        if (coordinates.length > 0) {
          return coordinates;
        }
      }
    } else if (feature.geometry.type === 'MultiLineString') {
      const all = feature.geometry.coordinates;
      for (const segment of all) {
        for (const c of segment) {
          if (
            Array.isArray(c) &&
            c.length >= 2 &&
            typeof c[0] === 'number' &&
            typeof c[1] === 'number'
          ) {
            const elev = typeof c[2] === 'number' ? c[2] : undefined;
            coordinates.push([c[0], c[1], elev]);
          }
        }
      }
      if (coordinates.length > 0) {
        return coordinates;
      }
    }
  }
  return coordinates;
}

/**
 * GPX 파일 확장자인지 검사한다.
 */
function isGpxFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith('.gpx')) return true;
  // 일부 브라우저/디바이스는 빈 타입을 반환하기도 한다.
  if (file.type === 'application/gpx+xml') return true;
  return false;
}

/**
 * GPX 파일이 실제로 GPX 형식인지 텍스트로 빠르게 확인한다.
 */
function looksLikeGpxText(text: string): boolean {
  return /<gpx[\s>]/i.test(text);
}

/**
 * 사용자가 업로드한 File 을 ParsedRoute 로 변환한다.
 *
 * 모든 예외는 GpxParseError 로 throw 되며, 호출부에서 한국어 메시지로 변환한다.
 */
export async function parseGpxFile(file: File): Promise<ParsedRoute> {
  if (!isGpxFile(file)) {
    throw new GpxParseError('GPX 파일만 업로드할 수 있습니다.');
  }

  const text = await readFileAsText(file);
  if (!text || text.trim().length === 0) {
    throw new GpxParseError('비어 있는 파일은 파싱할 수 없습니다.');
  }

  if (!looksLikeGpxText(text)) {
    throw new GpxParseError('GPX 파일만 업로드할 수 있습니다.');
  }

  const doc = parseXml(text);
  let fc: FeatureCollection;
  try {
    fc = toGeoJSONGpx(doc) as FeatureCollection;
  } catch (err) {
    console.error('[gpxParser] togeojson 변환 실패:', err);
    throw new GpxParseError('GPX 데이터를 GeoJSON 으로 변환하지 못했습니다.');
  }

  const coordinates = extractLineCoordinates(fc);
  if (coordinates.length === 0) {
    throw new GpxParseError('표시할 경로 데이터가 없습니다.');
  }

  return buildRouteMetadata(file.name, coordinates);
}
