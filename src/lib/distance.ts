import type { NavNode, NavigationMapConfig } from '../types/navigation';

const EARTH_RADIUS_METERS = 6371008.8;

export function euclideanDistance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function haversineDistance(a: [number, number], b: [number, number]): number {
  const lon1 = toRadians(a[0]);
  const lat1 = toRadians(a[1]);
  const lon2 = toRadians(b[0]);
  const lat2 = toRadians(b[1]);
  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function measureCoordinateDistance(
  a: [number, number],
  b: [number, number],
  config?: NavigationMapConfig
): number {
  if (config?.mode === 'geo') {
    return haversineDistance(a, b);
  }

  return euclideanDistance(a, b) * (config?.image?.metersPerPixel ?? 1);
}

export function measureNodeDistance(
  from: NavNode,
  to: NavNode,
  config?: NavigationMapConfig
): number {
  return measureCoordinateDistance(from.coord, to.coord, config);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
