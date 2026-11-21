import test from 'node:test';
import assert from 'node:assert/strict';
import { AIRFORCE_AIRCRAFT } from './airforces';
import {
  GLOBAL_AIRPORTS,
  computeGreatCircleDistanceKm,
  computeInitialBearingDeg,
  createFlightPlan,
} from './airports';
import {
  computeAtmosphere,
  createAirbornePhysicsState,
  createInitialPhysicsState,
  deriveCustomAircraftSpec,
  stepFlightPhysics,
} from './aerodynamics';
import { evaluateFlightGuidance } from './guidance';
import { convertFuelFlow, convertPressure, convertThrust } from './units';
import type { FlightControls } from './types';

test('ISA atmosphere pressure and density decrease realistically with altitude', () => {
  const seaLevel = computeAtmosphere(0, 1013.25);
  const cruise = computeAtmosphere(10000, 1013.25);

  assert.ok(Math.abs(seaLevel.staticPressureHpa - 1013.25) < 0.1);
  assert.ok(Math.abs(seaLevel.airDensityKgM3 - 1.225) < 0.01);
  assert.ok(cruise.staticPressureHpa < 300 && cruise.staticPressureHpa > 230);
  assert.ok(cruise.airDensityKgM3 < 0.45 && cruise.airDensityKgM3 > 0.38);
  assert.ok(cruise.speedOfSoundMS < seaLevel.speedOfSoundMS);
});

test('Aerodynamic unit conversions for thrust, pressure, and fuel flow are exact', () => {
  // 100 kN -> 22,480.89 lbf, 10,197.16 kgf
  assert.equal(Math.round(convertThrust(100000, 'kN')), 100);
  assert.equal(Math.round(convertThrust(100000, 'lbf')), 22481);
  assert.equal(Math.round(convertThrust(100000, 'kgf')), 10197);

  // 1013.25 hPa -> 29.92 inHg, 14.70 psi, 101.325 kPa
  assert.ok(Math.abs(convertPressure(1013.25, 'inHg') - 29.92) < 0.02);
  assert.ok(Math.abs(convertPressure(1013.25, 'psi') - 14.7) < 0.02);
  assert.ok(Math.abs(convertPressure(1013.25, 'kPa') - 101.325) < 0.01);

  // 1 kg/s fuel flow -> ~7936.6 lb/hr, ~74.63 L/min
  assert.ok(Math.abs(convertFuelFlow(1, 'lb/hr') - 7936.6) < 2);
  assert.ok(Math.abs(convertFuelFlow(1, 'L/min') - 74.63) < 0.2);
});

test('Global airport great-circle distance and bearing calculation (KJFK -> EGLL)', () => {
  const jfk = GLOBAL_AIRPORTS.find((a) => a.icao === 'KJFK')!;
  const lhr = GLOBAL_AIRPORTS.find((a) => a.icao === 'EGLL')!;
  const distKm = computeGreatCircleDistanceKm(jfk, lhr);
  const bearing = computeInitialBearingDeg(jfk, lhr);

  // Real JFK to Heathrow distance is ~5540 km, initial heading ~51°
  assert.ok(distKm > 5450 && distKm < 5620, `Expected ~5540km, got ${distKm}`);
  assert.ok(bearing > 45 && bearing < 60, `Expected ~51deg, got ${bearing}`);
});

test('Custom aircraft designer derives valid aerodynamic spec', () => {
  const custom = deriveCustomAircraftSpec({
    name: 'Valkyrie X-9',
    country: 'Custom',
    airforce: 'Skunkworks Division',
    roundel: 'usaf-star',
    livery: { primary: '#334155', secondary: '#0f172a', accent: '#f59e0b', canopyTint: '#38bdf8' },
    wingPlanform: 'delta',
    tailConfig: 'v-tail',
    engineType: 'ramjet',
    engineCount: 2,
    wingspanM: 14,
    wingAreaM2: 60,
    emptyMassKg: 14000,
    maxFuelKg: 7000,
    thrustRatingKN: 180,
  });

  assert.equal(custom.maxThrustKN, 360);
  assert.ok(custom.maxMach >= 2.8);
  assert.ok(custom.cd0 < 0.02);
});

test('Flight physics takeoff roll accelerates, generates lift, consumes fuel, and survives idle', () => {
  const f22 = AIRFORCE_AIRCRAFT[0];
  const jfk = GLOBAL_AIRPORTS[0];
  const lhr = GLOBAL_AIRPORTS[3];
  const plan = createFlightPlan(jfk, lhr);

  // 1. Idle survival test (first 3 seconds with zero throttle)
  let state = createInitialPhysicsState(jfk, f22);
  const idleControls: FlightControls = {
    throttle: 0,
    pitchInput: 0,
    rollInput: 0,
    yawInput: 0,
    gearDown: true,
    flapsLevel: 0,
    airbrake: false,
  };
  for (let i = 0; i < 60; i++) {
    const res = stepFlightPhysics(state, idleControls, f22, plan, 0.05);
    state = res.state;
  }
  assert.equal(state.crashed, false);
  assert.equal(state.onGround, true);

  // 2. Full throttle takeoff + pitch rotation lifts off and burns fuel
  const takeoffControls: FlightControls = {
    throttle: 1.0,
    pitchInput: 0,
    rollInput: 0,
    yawInput: 0,
    gearDown: true,
    flapsLevel: 1,
    airbrake: false,
  };

  let lastTel = null;
  let peakLiftN = 0;
  for (let i = 0; i < 200; i++) {
    // Rotate gently for 1.5s after 5s takeoff roll, then release stick to climb
    const ctrl =
      i >= 100 && i < 130 ? { ...takeoffControls, pitchInput: 0.45 } : takeoffControls;
    const res = stepFlightPhysics(state, ctrl, f22, plan, 0.05);
    state = res.state;
    lastTel = res.telemetry;
    if (lastTel.liftN > peakLiftN) peakLiftN = lastTel.liftN;
  }

  assert.ok(state.fuelUsedKg > 10, 'Should consume fuel during takeoff roll');
  assert.ok(state.fuelKg < f22.maxFuelKg);
  assert.equal(state.onGround, false, 'Aircraft should lift off after rotation');
  assert.ok(state.y > 5, 'Altitude should climb after liftoff');
  assert.ok(lastTel && peakLiftN > lastTel.totalMassKg * 9.8, 'Peak lift should exceed aircraft weight during liftoff');

  const guidance = evaluateFlightGuidance(state, lastTel!, takeoffControls, f22, plan);
  assert.equal(guidance.phase, 'climb');
});

test('Airborne launch state spawns cleanly in stable flight and sustains altitude', () => {
  const rafale = AIRFORCE_AIRCRAFT[3];
  const jfk = GLOBAL_AIRPORTS[0];
  const lhr = GLOBAL_AIRPORTS[3];
  const plan = createFlightPlan(jfk, lhr);

  let state = createAirbornePhysicsState(jfk, rafale, plan);
  assert.equal(state.onGround, false);
  assert.ok(state.y > 500);

  const cruiseControls: FlightControls = {
    throttle: 0.78,
    pitchInput: 0,
    rollInput: 0,
    yawInput: 0,
    gearDown: false,
    flapsLevel: 0,
    airbrake: false,
  };

  for (let i = 0; i < 100; i++) {
    const res = stepFlightPhysics(state, cruiseControls, rafale, plan, 0.05);
    state = res.state;
  }
  assert.equal(state.crashed, false);
  assert.equal(state.onGround, false);
  assert.ok(state.y > 400, 'Should maintain airborne flight without crashing');
});
