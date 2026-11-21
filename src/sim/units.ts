import type {
  AltitudeUnit,
  FuelFlowUnit,
  PressureUnit,
  SpeedUnit,
  ThrustUnit,
} from './types';

// Conversion constants
const NEWTON_TO_LBF = 0.224808943;
const NEWTON_TO_KGF = 0.101971621;
const HPA_TO_INHG = 0.029529983;
const HPA_TO_PSI = 0.014503774;
const JET_FUEL_DENSITY_KG_PER_L = 0.804; // Jet-A1 standard density at 15°C
const LITER_TO_US_GAL = 0.264172052;
const KG_TO_LB = 2.20462262;
const MS_TO_KT = 1.94384449;
const MS_TO_KMH = 3.6;
const M_TO_FT = 3.2808399;

export function convertThrust(newtons: number, unit: ThrustUnit): number {
  switch (unit) {
    case 'kN':
      return newtons / 1000;
    case 'lbf':
      return newtons * NEWTON_TO_LBF;
    case 'kgf':
      return newtons * NEWTON_TO_KGF;
  }
}

export function formatThrust(newtons: number, unit: ThrustUnit): string {
  const val = convertThrust(newtons, unit);
  if (unit === 'kN') return `${val.toFixed(1)} kN`;
  return `${Math.round(val).toLocaleString()} ${unit}`;
}

export function convertPressure(hpa: number, unit: PressureUnit): number {
  switch (unit) {
    case 'hPa':
      return hpa;
    case 'kPa':
      return hpa * 0.1;
    case 'inHg':
      return hpa * HPA_TO_INHG;
    case 'psi':
      return hpa * HPA_TO_PSI;
  }
}

export function formatPressure(hpa: number, unit: PressureUnit): string {
  const val = convertPressure(hpa, unit);
  if (unit === 'inHg' || unit === 'psi') return `${val.toFixed(2)} ${unit}`;
  if (unit === 'kPa') return `${val.toFixed(1)} kPa`;
  return `${Math.round(val)} hPa`;
}

export function convertFuelFlow(kgPerSec: number, unit: FuelFlowUnit): number {
  switch (unit) {
    case 'kg/s':
      return kgPerSec;
    case 'lb/hr':
      return kgPerSec * KG_TO_LB * 3600;
    case 'L/min':
      return (kgPerSec / JET_FUEL_DENSITY_KG_PER_L) * 60;
    case 'gal/hr':
      return (kgPerSec / JET_FUEL_DENSITY_KG_PER_L) * LITER_TO_US_GAL * 3600;
  }
}

export function formatFuelFlow(kgPerSec: number, unit: FuelFlowUnit): string {
  const val = convertFuelFlow(kgPerSec, unit);
  if (unit === 'kg/s') return `${val.toFixed(2)} kg/s`;
  if (unit === 'L/min') return `${val.toFixed(1)} L/min`;
  return `${Math.round(val).toLocaleString()} ${unit}`;
}

export function convertSpeed(tasMS: number, iasKt: number, mach: number, unit: SpeedUnit): number {
  switch (unit) {
    case 'kt':
      return iasKt;
    case 'km/h':
      return tasMS * MS_TO_KMH;
    case 'mach':
      return mach;
  }
}

export function formatSpeed(tasMS: number, iasKt: number, mach: number, unit: SpeedUnit): string {
  if (unit === 'mach') return `M ${mach.toFixed(2)}`;
  if (unit === 'km/h') return `${Math.round(tasMS * MS_TO_KMH)} km/h`;
  return `${Math.round(iasKt)} kt`;
}

export function convertAltitude(meters: number, unit: AltitudeUnit): number {
  return unit === 'ft' ? meters * M_TO_FT : meters;
}

export function formatAltitude(meters: number, unit: AltitudeUnit): string {
  const val = convertAltitude(meters, unit);
  return `${Math.round(val).toLocaleString()} ${unit}`;
}

export interface AeroUnitGuideEntry {
  id: string;
  name: string;
  symbol: string;
  units: string;
  formula: string;
  explanation: string;
}

export const AERODYNAMIC_UNITS_CATALOG: AeroUnitGuideEntry[] = [
  {
    id: 'thrust',
    name: 'Engine Thrust',
    symbol: 'T',
    units: 'kN (kilonewton) · lbf (pound-force) · kgf (kilogram-force)',
    formula: 'T_net = ṁ_air · (V_exit − V_flight) + (P_exit − P_0) · A_exit',
    explanation:
      'Propulsive force pushing the aircraft forward. 1 kN = 1,000 N ≈ 224.8 lbf ≈ 102.0 kgf. High-altitude thin air reduces air mass flow, so net thrust decreases with altitude unless augmented by afterburner.',
  },
  {
    id: 'lift',
    name: 'Aerodynamic Lift',
    symbol: 'L',
    units: 'N (Newton) · kN (kilonewton)',
    formula: 'L = ½ · ρ · V² · S · C_L(α)',
    explanation:
      'Upward force generated perpendicular to airflow over the wing area (S). Lift scales with air density (ρ), airspeed squared (V²), and Lift Coefficient (C_L), which rises with Angle of Attack (α) until stall.',
  },
  {
    id: 'drag',
    name: 'Total Drag & L/D Ratio',
    symbol: 'D',
    units: 'N · kN · Dimensionless L/D',
    formula: 'D = ½ · ρ · V² · S · (C_D0 + C_L² / (π · e · AR))',
    explanation:
      'Combines parasitic form drag (C_D0), induced drag from lift generation, gear/flap drag, and transonic wave drag. Lift-to-Drag ratio (L/D) measures aerodynamic glide & cruise efficiency.',
  },
  {
    id: 'pressure',
    name: 'Static & Dynamic Pressure',
    symbol: 'P_s / q',
    units: 'hPa (mbar) · inHg · kPa · psi',
    formula: 'q = ½ · ρ · V²  |  P(h) = P₀ · (1 − L·h / T₀)^(5.255)',
    explanation:
      'Static barometric pressure (P_s) drops from 1013.25 hPa (29.92 inHg / 14.70 psi) at sea level as altitude rises. Dynamic pressure (q) measures airflow kinetic energy used for Indicated Airspeed (IAS) and control authority.',
  },
  {
    id: 'density',
    name: 'Air Density & Speed of Sound',
    symbol: 'ρ / a',
    units: 'kg/m³ · m/s · Mach (M = V / a)',
    formula: 'ρ = P / (R · T)  |  a = √(γ · R · T)',
    explanation:
      'Standard sea-level density is 1.225 kg/m³. Thinner air at 10,000 m (~0.41 kg/m³) lowers drag for fast cruise, while colder upper air lowers the speed of sound (340 m/s at sea level down to 295 m/s in the tropopause).',
  },
  {
    id: 'fuel',
    name: 'Specific Fuel Consumption & Flow',
    symbol: 'ṁ_f / TSFC',
    units: 'kg/s · lb/hr · L/min · gal/hr',
    formula: 'ṁ_f = TSFC · T_actual',
    explanation:
      'Thrust-Specific Fuel Consumption (TSFC) links fuel burn directly to thrust produced. Engaging afterburner increases thrust ~45% but more than doubles fuel flow rate. Burning fuel lightens the aircraft in flight.',
  },
  {
    id: 'load',
    name: 'Angle of Attack & Load Factor',
    symbol: 'α / G',
    units: 'degrees (°) · G-force (L / W)',
    formula: 'n_z = L / (m · g)',
    explanation:
      'Angle of Attack (α) is the angle between the wing chord and oncoming airflow. Exceeding critical α (~16°–22°) causes airflow separation (aerodynamic stall). Load factor (G) measures lift relative to aircraft weight.',
  },
];

export const DEFAULT_UNIT_PREFS = {
  thrust: 'kN' as ThrustUnit,
  pressure: 'hPa' as PressureUnit,
  fuelFlow: 'kg/s' as FuelFlowUnit,
  speed: 'kt' as SpeedUnit,
  altitude: 'ft' as AltitudeUnit,
};

export { MS_TO_KT, MS_TO_KMH, M_TO_FT };
