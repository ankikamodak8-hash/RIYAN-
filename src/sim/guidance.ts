import type {
  AeroTelemetry,
  AircraftSpec,
  FlightControls,
  FlightPlan,
  GuidanceAdvice,
  PhysicsState,
} from './types';
import { formatBearing } from './airports';

export function evaluateFlightGuidance(
  state: PhysicsState,
  telemetry: AeroTelemetry,
  controls: FlightControls,
  aircraft: AircraftSpec,
  flightPlan: FlightPlan
): GuidanceAdvice {
  const rotationSpeedKt = Math.round(telemetry.stallSpeedKt * 1.15);
  const targetHeadingStr = formatBearing(telemetry.bearingToDestDeg);
  const headingDiff = ((telemetry.bearingToDestDeg - telemetry.headingDeg + 540) % 360) - 180;
  const turnCue =
    Math.abs(headingDiff) < 8
      ? 'On course'
      : headingDiff > 0
        ? `Bank right ${Math.round(headingDiff)}° (D)`
        : `Bank left ${Math.round(Math.abs(headingDiff))}° (A)`;

  const checklist = [
    { label: `Throttle > 80% (${Math.round(controls.throttle * 100)}%)`, done: controls.throttle >= 0.8 || !state.onGround },
    { label: `Rotate ≥ ${rotationSpeedKt} kt`, done: !state.onGround && state.maxAltitudeM > flightPlan.departure.elevationM + 15 },
    { label: 'Retract Gear [G] airborne', done: !state.onGround && !controls.gearDown },
    { label: `Intercept ${flightPlan.destination.icao} HDG ${targetHeadingStr}°`, done: Math.abs(headingDiff) < 18 && !state.onGround },
    { label: `Approach & Land at ${flightPlan.destination.icao}`, done: state.landedSafely },
  ];

  if (state.landedSafely) {
    return {
      phase: 'landed',
      phaseLabel: 'Mission Complete',
      headline: `Touchdown at ${flightPlan.destination.icao}`,
      instruction: 'Engage airbrakes [B] and reduce throttle to 0% to roll out to a full stop.',
      severity: 'info',
      checklist,
    };
  }

  if (telemetry.stallWarning) {
    return {
      phase: 'stall-recovery',
      phaseLabel: 'Stall Recovery',
      headline: `Critical AoA ${telemetry.aoaDeg.toFixed(1)}° — Airflow Separating!`,
      instruction: `Lower nose immediately (W / ↑) to reduce Angle of Attack below 14°, apply full thrust (Shift), and build airspeed above ${Math.round(telemetry.stallSpeedKt * 1.2)} kt.`,
      severity: 'warning',
      checklist,
    };
  }

  if (state.fuelKg < aircraft.maxFuelKg * 0.12) {
    return {
      phase: 'low-fuel',
      phaseLabel: 'Low Fuel Advisory',
      headline: `Fuel Reserve ${Math.round((state.fuelKg / aircraft.maxFuelKg) * 100)}%`,
      instruction: `Throttle back below 85% to disengage afterburner (halves TSFC burn) and cruise at peak L/D (${telemetry.liftToDrag.toFixed(1)}) toward ${flightPlan.destination.icao}.`,
      severity: 'warning',
      checklist,
    };
  }

  if (state.onGround) {
    if (telemetry.iasKt < 25 && controls.throttle < 0.5) {
      return {
        phase: 'preflight',
        phaseLabel: '01 · Runway Ready',
        headline: `Cleared for Takeoff — ${flightPlan.departure.icao} RWY ${formatBearing(flightPlan.departure.runwayHeadingDeg)}`,
        instruction: `Advance throttle (Shift or Throttle Slider) to 90–100%. Optionally press [F] for takeoff flaps (+C_L) to shorten your runway roll.`,
        severity: 'action',
        checklist,
      };
    }
    if (telemetry.iasKt < rotationSpeedKt) {
      return {
        phase: 'takeoff-roll',
        phaseLabel: '02 · Takeoff Roll',
        headline: `Accelerating — ${Math.round(telemetry.iasKt)} / ${rotationSpeedKt} kt V_R`,
        instruction: `Hold wings level as dynamic pressure q builds (${Math.round(telemetry.dynamicPressurePa)} Pa). At ${rotationSpeedKt} kt, pitch up gently (S / ↓) to 10°–12°.`,
        severity: 'action',
        checklist,
      };
    }
    return {
      phase: 'takeoff-roll',
      phaseLabel: '02 · Rotate Now',
      headline: `V_R Reached (${Math.round(telemetry.iasKt)} kt) — Pull Back`,
      instruction: 'Hold [S] or [↓] gently to raise nose to +12° pitch. Lift L will exceed aircraft weight W and lift you off the runway.',
      severity: 'action',
      checklist,
    };
  }

  if (telemetry.altitudeAglM < 450 && (controls.gearDown || controls.flapsLevel > 0)) {
    return {
      phase: 'climb',
      phaseLabel: '03 · Initial Climb',
      headline: 'Positive Climb Rate — Clean Up Airframe',
      instruction: `Press [G] to retract landing gear and [F] until flaps are 0 to eliminate parasitic drag (C_D). Maintain 10°–15° climb pitch.`,
      severity: 'action',
      checklist,
    };
  }

  if (telemetry.distanceToDestNm < 6) {
    return {
      phase: 'approach',
      phaseLabel: '05 · Final Approach',
      headline: `${flightPlan.destination.icao} Ahead (${telemetry.distanceToDestNm.toFixed(1)} NM)`,
      instruction: `Extend gear [G] and landing flaps [F] twice. Reduce throttle to 30–45%, hold speed ~${Math.round(telemetry.stallSpeedKt * 1.3)} kt, and flare gently above runway.`,
      severity: 'action',
      checklist,
    };
  }

  return {
    phase: 'cruise',
    phaseLabel: '04 · Enroute Navigation',
    headline: `${flightPlan.destination.icao} Bearing ${targetHeadingStr}° · ${turnCue}`,
    instruction: `Fly heading ${targetHeadingStr}° (${telemetry.distanceToDestNm.toFixed(1)} NM remaining). Monitor static pressure (${Math.round(telemetry.atmosphere.staticPressureHpa)} hPa) and L/D (${telemetry.liftToDrag.toFixed(1)}). Use [1x/4x/16x] warp for long legs.`,
    severity: 'info',
    checklist,
  };
}
