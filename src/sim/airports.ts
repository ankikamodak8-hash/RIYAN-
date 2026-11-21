import type { Airport, FlightPlan } from './types';

export const GLOBAL_AIRPORTS: Airport[] = [
  {
    icao: 'KJFK',
    iata: 'JFK',
    name: 'John F. Kennedy Intl',
    city: 'New York',
    country: 'United States',
    continent: 'North America',
    lat: 40.6413,
    lon: -73.7781,
    elevationM: 4,
    runwayHeadingDeg: 44,
    runwayLengthM: 4423,
    qnhHpa: 1015,
    windSpeedKt: 9,
    windDirDeg: 40,
  },
  {
    icao: 'KLAX',
    iata: 'LAX',
    name: 'Los Angeles Intl',
    city: 'Los Angeles',
    country: 'United States',
    continent: 'North America',
    lat: 33.9416,
    lon: -118.4085,
    elevationM: 38,
    runwayHeadingDeg: 250,
    runwayLengthM: 3685,
    qnhHpa: 1016,
    windSpeedKt: 8,
    windDirDeg: 250,
  },
  {
    icao: 'CYYZ',
    iata: 'YYZ',
    name: 'Toronto Pearson Intl',
    city: 'Toronto',
    country: 'Canada',
    continent: 'North America',
    lat: 43.6777,
    lon: -79.6248,
    elevationM: 173,
    runwayHeadingDeg: 54,
    runwayLengthM: 3389,
    qnhHpa: 1012,
    windSpeedKt: 12,
    windDirDeg: 60,
  },
  {
    icao: 'EGLL',
    iata: 'LHR',
    name: 'London Heathrow',
    city: 'London',
    country: 'United Kingdom',
    continent: 'Europe',
    lat: 51.47,
    lon: -0.4543,
    elevationM: 25,
    runwayHeadingDeg: 271,
    runwayLengthM: 3902,
    qnhHpa: 1009,
    windSpeedKt: 14,
    windDirDeg: 265,
  },
  {
    icao: 'LFPG',
    iata: 'CDG',
    name: 'Paris Charles de Gaulle',
    city: 'Paris',
    country: 'France',
    continent: 'Europe',
    lat: 49.0097,
    lon: 2.5479,
    elevationM: 119,
    runwayHeadingDeg: 86,
    runwayLengthM: 4215,
    qnhHpa: 1013,
    windSpeedKt: 7,
    windDirDeg: 90,
  },
  {
    icao: 'EDDF',
    iata: 'FRA',
    name: 'Frankfurt am Main',
    city: 'Frankfurt',
    country: 'Germany',
    continent: 'Europe',
    lat: 50.0379,
    lon: 8.5622,
    elevationM: 111,
    runwayHeadingDeg: 70,
    runwayLengthM: 4000,
    qnhHpa: 1014,
    windSpeedKt: 10,
    windDirDeg: 75,
  },
  {
    icao: 'ESSA',
    iata: 'ARN',
    name: 'Stockholm Arlanda',
    city: 'Stockholm',
    country: 'Sweden',
    continent: 'Europe',
    lat: 59.6498,
    lon: 17.9238,
    elevationM: 42,
    runwayHeadingDeg: 10,
    runwayLengthM: 3301,
    qnhHpa: 1006,
    windSpeedKt: 11,
    windDirDeg: 15,
  },
  {
    icao: 'LIRF',
    iata: 'FCO',
    name: 'Rome Fiumicino',
    city: 'Rome',
    country: 'Italy',
    continent: 'Europe',
    lat: 41.8003,
    lon: 12.2389,
    elevationM: 5,
    runwayHeadingDeg: 162,
    runwayLengthM: 3900,
    qnhHpa: 1018,
    windSpeedKt: 6,
    windDirDeg: 170,
  },
  {
    icao: 'LSZH',
    iata: 'ZRH',
    name: 'Zurich Airport',
    city: 'Zurich',
    country: 'Switzerland',
    continent: 'Europe',
    lat: 47.4647,
    lon: 8.5492,
    elevationM: 432,
    runwayHeadingDeg: 140,
    runwayLengthM: 3700,
    qnhHpa: 1019,
    windSpeedKt: 5,
    windDirDeg: 135,
  },
  {
    icao: 'LTFM',
    iata: 'IST',
    name: 'Istanbul Airport',
    city: 'Istanbul',
    country: 'Turkey',
    continent: 'Europe',
    lat: 41.2753,
    lon: 28.7519,
    elevationM: 99,
    runwayHeadingDeg: 355,
    runwayLengthM: 4100,
    qnhHpa: 1015,
    windSpeedKt: 10,
    windDirDeg: 10,
  },
  {
    icao: 'OMDB',
    iata: 'DXB',
    name: 'Dubai International',
    city: 'Dubai',
    country: 'UAE',
    continent: 'Middle East',
    lat: 25.2532,
    lon: 55.3657,
    elevationM: 19,
    runwayHeadingDeg: 120,
    runwayLengthM: 4450,
    qnhHpa: 1008,
    windSpeedKt: 11,
    windDirDeg: 125,
  },
  {
    icao: 'VIDP',
    iata: 'DEL',
    name: 'Indira Gandhi Intl',
    city: 'New Delhi',
    country: 'India',
    continent: 'Asia',
    lat: 28.5562,
    lon: 77.1,
    elevationM: 237,
    runwayHeadingDeg: 108,
    runwayLengthM: 4430,
    qnhHpa: 1011,
    windSpeedKt: 7,
    windDirDeg: 105,
  },
  {
    icao: 'WSSS',
    iata: 'SIN',
    name: 'Singapore Changi',
    city: 'Singapore',
    country: 'Singapore',
    continent: 'Asia',
    lat: 1.3644,
    lon: 103.9915,
    elevationM: 7,
    runwayHeadingDeg: 23,
    runwayLengthM: 4000,
    qnhHpa: 1010,
    windSpeedKt: 8,
    windDirDeg: 25,
  },
  {
    icao: 'RKSI',
    iata: 'ICN',
    name: 'Incheon International',
    city: 'Seoul',
    country: 'South Korea',
    continent: 'Asia',
    lat: 37.4602,
    lon: 126.4407,
    elevationM: 7,
    runwayHeadingDeg: 154,
    runwayLengthM: 4000,
    qnhHpa: 1017,
    windSpeedKt: 9,
    windDirDeg: 150,
  },
  {
    icao: 'RJTT',
    iata: 'HND',
    name: 'Tokyo Haneda',
    city: 'Tokyo',
    country: 'Japan',
    continent: 'Asia',
    lat: 35.5494,
    lon: 139.7798,
    elevationM: 11,
    runwayHeadingDeg: 342,
    runwayLengthM: 3360,
    qnhHpa: 1016,
    windSpeedKt: 12,
    windDirDeg: 340,
  },
  {
    icao: 'YSSY',
    iata: 'SYD',
    name: 'Sydney Kingsford Smith',
    city: 'Sydney',
    country: 'Australia',
    continent: 'Oceania',
    lat: -33.9399,
    lon: 151.1753,
    elevationM: 6,
    runwayHeadingDeg: 160,
    runwayLengthM: 3962,
    qnhHpa: 1014,
    windSpeedKt: 11,
    windDirDeg: 165,
  },
  {
    icao: 'SBGR',
    iata: 'GRU',
    name: 'São Paulo Guarulhos',
    city: 'São Paulo',
    country: 'Brazil',
    continent: 'South America',
    lat: -23.4356,
    lon: -46.4731,
    elevationM: 750,
    runwayHeadingDeg: 95,
    runwayLengthM: 3700,
    qnhHpa: 1018,
    windSpeedKt: 8,
    windDirDeg: 90,
  },
  {
    icao: 'FAOR',
    iata: 'JNB',
    name: 'O. R. Tambo Intl',
    city: 'Johannesburg',
    country: 'South Africa',
    continent: 'Africa',
    lat: -26.1367,
    lon: 28.2411,
    elevationM: 1694,
    runwayHeadingDeg: 34,
    runwayLengthM: 4418,
    qnhHpa: 1020,
    windSpeedKt: 9,
    windDirDeg: 30,
  },
  {
    icao: 'HECA',
    iata: 'CAI',
    name: 'Cairo International',
    city: 'Cairo',
    country: 'Egypt',
    continent: 'Africa',
    lat: 30.1219,
    lon: 31.4056,
    elevationM: 116,
    runwayHeadingDeg: 52,
    runwayLengthM: 4000,
    qnhHpa: 1013,
    windSpeedKt: 10,
    windDirDeg: 50,
  },
  {
    icao: 'KEDW',
    iata: 'EDW',
    name: 'Edwards Air Force Base',
    city: 'Mojave',
    country: 'United States',
    continent: 'North America',
    lat: 34.9054,
    lon: -117.8837,
    elevationM: 702,
    runwayHeadingDeg: 40,
    runwayLengthM: 4579,
    qnhHpa: 1015,
    windSpeedKt: 6,
    windDirDeg: 45,
  },
];

const EARTH_RADIUS_KM = 6371.0;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function computeGreatCircleDistanceKm(a: Airport, b: Airport): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

export function computeInitialBearingDeg(a: Airport, b: Airport): number {
  if (a.icao === b.icao) return a.runwayHeadingDeg;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

export function createFlightPlan(departure: Airport, destination: Airport): FlightPlan {
  const distanceKm = computeGreatCircleDistanceKm(departure, destination);
  const distanceNm = distanceKm * 0.539957;
  const initialBearingDeg = computeInitialBearingDeg(departure, destination);
  return {
    departure,
    destination,
    distanceKm,
    distanceNm,
    initialBearingDeg,
  };
}

/**
 * In the 3D world, departure sits at origin (0, 0, 0).
 * For playability across both short regional hops and transoceanic flights,
 * we place the destination airport along the real great-circle bearing at a
 * navigable simulation range (scaled smoothly from real distance so players can
 * either fly a full tactical approach within minutes or use 4x/16x time warp),
 * while also reporting true real-world great-circle km/NM progress.
 */
export function getSimDestinationCoords(plan: FlightPlan): {
  x: number;
  z: number;
  simDistanceM: number;
  scaleRatio: number;
} {
  const realMeters = Math.max(12000, plan.distanceKm * 1000);
  // Keep 3D destination between 18 km and 48 km in world units so visual approach & landing
  // is achievable in a rewarding flight session while tracking true scaled NM!
  const simDistanceM = Math.min(48000, Math.max(18000, 14000 + plan.distanceKm * 2.8));
  const brngRad = toRad(plan.initialBearingDeg);
  // Heading 0 = -Z (North), +90 = +X (East)
  const x = Math.sin(brngRad) * simDistanceM;
  const z = -Math.cos(brngRad) * simDistanceM;
  return {
    x,
    z,
    simDistanceM,
    scaleRatio: realMeters / simDistanceM,
  };
}

export function formatBearing(deg: number): string {
  const normalized = ((Math.round(deg) % 360) + 360) % 360;
  return normalized.toString().padStart(3, '0');
}
