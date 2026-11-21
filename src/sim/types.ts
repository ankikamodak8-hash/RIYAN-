export type ThrustUnit = 'kN' | 'lbf' | 'kgf';
export type PressureUnit = 'hPa' | 'inHg' | 'kPa' | 'psi';
export type FuelFlowUnit = 'kg/s' | 'lb/hr' | 'L/min' | 'gal/hr';
export type SpeedUnit = 'kt' | 'km/h' | 'mach';
export type AltitudeUnit = 'ft' | 'm';

export interface UnitPreferences {
  thrust: ThrustUnit;
  pressure: PressureUnit;
  fuelFlow: FuelFlowUnit;
  speed: SpeedUnit;
  altitude: AltitudeUnit;
}

export type WingPlanform = 'swept' | 'delta' | 'straight' | 'forward-swept';
export type TailConfig = 'conventional' | 't-tail' | 'v-tail' | 'twin-tail';
export type EngineType = 'afterburning-jet' | 'turbofan' | 'turboprop' | 'ramjet';

export type RoundelStyle =
  | 'usaf-star'
  | 'bullseye'
  | 'tricolor-fin'
  | 'iron-cross'
  | 'hinomaru'
  | 'tricolor-ring'
  | 'three-crowns'
  | 'taegeuk'
  | 'maple-leaf'
  | 'southern-star'
  | 'crescent-star'
  | 'swiss-cross';

export interface LiveryColors {
  primary: string;
  secondary: string;
  accent: string;
  canopyTint: string;
}

export interface AircraftSpec {
  id: string;
  name: string;
  designation: string;
  country: string;
  countryCode: string;
  airforce: string;
  role: string;
  roundel: RoundelStyle;
  livery: LiveryColors;
  isCustom?: boolean;
  // Geometry & aerodynamics
  wingPlanform: WingPlanform;
  tailConfig: TailConfig;
  engineType: EngineType;
  engineCount: 1 | 2;
  wingspanM: number;       // b (meters)
  wingAreaM2: number;      // S (m^2)
  lengthM: number;         // fuselage length (m)
  emptyMassKg: number;     // kg
  maxFuelKg: number;       // kg
  maxThrustKN: number;     // dry + afterburner total kN
  afterburnerRatio: number;// 1.0 for non-AB, ~1.45 for AB jet
  tsfcKgPerKNS: number;    // thrust-specific fuel consumption kg/(kN*s)
  cd0: number;             // zero-lift parasitic drag coefficient
  clMax: number;           // max clean lift coefficient
  maxMach: number;
  serviceCeilingM: number;
}

export interface CustomAirframeDesign {
  name: string;
  country: string;
  airforce: string;
  roundel: RoundelStyle;
  livery: LiveryColors;
  wingPlanform: WingPlanform;
  tailConfig: TailConfig;
  engineType: EngineType;
  engineCount: 1 | 2;
  wingspanM: number;
  wingAreaM2: number;
  emptyMassKg: number;
  maxFuelKg: number;
  thrustRatingKN: number;
}

export interface Airport {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  continent: 'North America' | 'Europe' | 'Asia' | 'Middle East' | 'Oceania' | 'South America' | 'Africa';
  lat: number;
  lon: number;
  elevationM: number;
  runwayHeadingDeg: number;
  runwayLengthM: number;
  qnhHpa: number;
  windSpeedKt: number;
  windDirDeg: number;
}

export interface FlightPlan {
  departure: Airport;
  destination: Airport;
  distanceKm: number;
  distanceNm: number;
  initialBearingDeg: number;
}

export interface AtmosphereState {
  altitudeM: number;
  temperatureK: number;
  temperatureC: number;
  staticPressurePa: number;
  staticPressureHpa: number;
  airDensityKgM3: number;
  speedOfSoundMS: number;
  cabinPressureHpa: number;
}

export interface FlightControls {
  throttle: number; // 0..1
  pitchInput: number; // -1..1 (pull back = +1)
  rollInput: number; // -1..1 (right = +1)
  yawInput: number; // -1..1 (right = +1)
  gearDown: boolean;
  flapsLevel: 0 | 1 | 2; // 0=up, 1=takeoff, 2=landing
  airbrake: boolean;
}

export interface PhysicsState {
  // Position in local world coordinates (meters): X east, Y altitude up, Z south (-Z north)
  x: number;
  y: number;
  z: number;
  // Velocity vector in world space (m/s)
  vx: number;
  vy: number;
  vz: number;
  // Orientation in radians
  pitchRad: number;
  rollRad: number;
  headingRad: number; // 0 = North (-Z), +PI/2 = East (+X)
  // Rates (rad/s)
  pitchRate: number;
  rollRate: number;
  yawRate: number;
  // Engine & Fuel
  actualThrottle: number; // smoothed 0..1
  fuelKg: number;
  fuelUsedKg: number;
  onGround: boolean;
  crashed: boolean;
  landedSafely: boolean;
  // Stats
  elapsedTimeS: number;
  distanceFlownKm: number;
  maxAltitudeM: number;
  maxMachReached: number;
  touchdownVsiMS: number | null;
  outcomeReason: string | null;
}

export interface AeroTelemetry {
  tasMS: number;
  iasMS: number;
  iasKt: number;
  tasKmh: number;
  mach: number;
  verticalSpeedMS: number;
  verticalSpeedFpm: number;
  aoaDeg: number;
  dynamicPressurePa: number;
  liftN: number;
  dragN: number;
  thrustN: number;
  liftToDrag: number;
  loadFactorG: number;
  fuelFlowKgS: number;
  enduranceSec: number;
  stallSpeedKt: number;
  stallWarning: boolean;
  overspeedWarning: boolean;
  afterburnerActive: boolean;
  totalMassKg: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  altitudeAglM: number;
  bearingToDestDeg: number;
  distanceToDestKm: number;
  distanceToDestNm: number;
  atmosphere: AtmosphereState;
}

export type FlightPhase =
  | 'preflight'
  | 'takeoff-roll'
  | 'climb'
  | 'cruise'
  | 'approach'
  | 'landed'
  | 'stall-recovery'
  | 'low-fuel';

export interface GuidanceAdvice {
  phase: FlightPhase;
  phaseLabel: string;
  headline: string;
  instruction: string;
  severity: 'info' | 'action' | 'warning';
  checklist: { label: string; done: boolean }[];
}

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';
export type CameraMode = 'chase' | 'cockpit' | 'orbit' | 'flyby';
export type FlightStartMode = 'runway' | 'airborne';
