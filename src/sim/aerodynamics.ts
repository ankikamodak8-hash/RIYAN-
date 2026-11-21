import type {
  AeroTelemetry,
  AircraftSpec,
  Airport,
  AtmosphereState,
  CustomAirframeDesign,
  FlightControls,
  FlightPlan,
  PhysicsState,
} from './types';
import { computeInitialBearingDeg, getSimDestinationCoords, toRad } from './airports';
import { MS_TO_KMH, MS_TO_KT } from './units';

const GRAVITY = 9.80665; // m/s^2
const R_AIR = 287.058; // J/(kg*K)
const GAMMA_AIR = 1.4;
const SEA_LEVEL_TEMP_K = 288.15; // 15°C
const SEA_LEVEL_PRESSURE_PA = 101325; // Pa
const LAPSE_RATE = 0.0065; // K/m up to 11,000 m
const TROPOPAUSE_ALT_M = 11000;

/**
 * International Standard Atmosphere (ISA) model with local QNH adjustment.
 */
export function computeAtmosphere(altitudeM: number, qnhHpa = 1013.25): AtmosphereState {
  const h = Math.max(0, Math.min(45000, altitudeM));
  const qnhRatio = qnhHpa / 1013.25;

  let temperatureK: number;
  let staticPressurePa: number;

  if (h <= TROPOPAUSE_ALT_M) {
    temperatureK = SEA_LEVEL_TEMP_K - LAPSE_RATE * h;
    staticPressurePa =
      SEA_LEVEL_PRESSURE_PA *
      qnhRatio *
      Math.pow(temperatureK / SEA_LEVEL_TEMP_K, GRAVITY / (R_AIR * LAPSE_RATE));
  } else {
    const tropTemp = SEA_LEVEL_TEMP_K - LAPSE_RATE * TROPOPAUSE_ALT_M;
    const tropPressure =
      SEA_LEVEL_PRESSURE_PA *
      qnhRatio *
      Math.pow(tropTemp / SEA_LEVEL_TEMP_K, GRAVITY / (R_AIR * LAPSE_RATE));
    temperatureK = tropTemp;
    staticPressurePa = tropPressure * Math.exp((-GRAVITY * (h - TROPOPAUSE_ALT_M)) / (R_AIR * tropTemp));
  }

  const airDensityKgM3 = staticPressurePa / (R_AIR * temperatureK);
  const speedOfSoundMS = Math.sqrt(GAMMA_AIR * R_AIR * temperatureK);
  const staticPressureHpa = staticPressurePa / 100;

  // Pressurized military/commercial cockpit schedule: holds ~1013 hPa up to 2,400m,
  // then maintains max 8.3 psi (~572 hPa) differential above ambient.
  const cabinAltEquiv = h <= 2400 ? h : Math.min(2400 + (h - 2400) * 0.22, 7500);
  const cabinPressureHpa = Math.max(
    staticPressureHpa,
    1013.25 * Math.pow(1 - (LAPSE_RATE * cabinAltEquiv) / SEA_LEVEL_TEMP_K, 5.255)
  );

  return {
    altitudeM: h,
    temperatureK,
    temperatureC: temperatureK - 273.15,
    staticPressurePa,
    staticPressureHpa,
    airDensityKgM3,
    speedOfSoundMS,
    cabinPressureHpa,
  };
}

/**
 * Derives aerodynamic coefficients and AircraftSpec from custom designer sliders.
 */
export function deriveCustomAircraftSpec(design: CustomAirframeDesign): AircraftSpec {
  const aspectRatio = (design.wingspanM * design.wingspanM) / Math.max(10, design.wingAreaM2);

  let cd0Base = 0.02;
  let clMaxBase = 1.55;
  let maxMachBase = 1.8;

  switch (design.wingPlanform) {
    case 'delta':
      cd0Base = 0.018;
      clMaxBase = 1.52;
      maxMachBase = 2.15;
      break;
    case 'swept':
      cd0Base = 0.0195;
      clMaxBase = 1.62;
      maxMachBase = 1.85;
      break;
    case 'forward-swept':
      cd0Base = 0.021;
      clMaxBase = 1.76;
      maxMachBase = 1.65;
      break;
    case 'straight':
      cd0Base = 0.0235;
      clMaxBase = 1.88;
      maxMachBase = 0.85;
      break;
  }

  let tsfc = 0.022;
  let afterburnerRatio = 1.45;
  let engineMaxMach = maxMachBase;
  let ceiling = 17500;

  switch (design.engineType) {
    case 'afterburning-jet':
      tsfc = 0.023;
      afterburnerRatio = 1.48;
      break;
    case 'turbofan':
      tsfc = 0.015;
      afterburnerRatio = 1.0;
      engineMaxMach = Math.min(maxMachBase, 0.98);
      ceiling = 14000;
      break;
    case 'turboprop':
      tsfc = 0.012;
      afterburnerRatio = 1.0;
      engineMaxMach = Math.min(maxMachBase, 0.58);
      ceiling = 10500;
      break;
    case 'ramjet':
      tsfc = 0.031;
      afterburnerRatio = 1.6;
      engineMaxMach = Math.max(maxMachBase, 2.8);
      ceiling = 24000;
      break;
  }

  const tailDragAdjust =
    design.tailConfig === 'v-tail' ? -0.001 : design.tailConfig === 'twin-tail' ? 0.0012 : 0;

  const totalThrustKN = design.thrustRatingKN * design.engineCount;
  const aspectBonusCl = Math.min(0.18, Math.max(-0.1, (aspectRatio - 3.5) * 0.02));

  return {
    id: `custom-${design.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'prototype'}`,
    name: design.name || 'Custom Prototype X-1',
    designation: 'X-PROTO',
    country: design.country,
    countryCode: 'CUSTOM',
    airforce: design.airforce,
    role: 'Custom Engineered Airframe',
    roundel: design.roundel,
    livery: design.livery,
    isCustom: true,
    wingPlanform: design.wingPlanform,
    tailConfig: design.tailConfig,
    engineType: design.engineType,
    engineCount: design.engineCount,
    wingspanM: design.wingspanM,
    wingAreaM2: design.wingAreaM2,
    lengthM: Math.max(11, Math.min(24, design.wingspanM * 1.15)),
    emptyMassKg: design.emptyMassKg,
    maxFuelKg: design.maxFuelKg,
    maxThrustKN: totalThrustKN,
    afterburnerRatio,
    tsfcKgPerKNS: tsfc,
    cd0: Math.max(0.014, cd0Base + tailDragAdjust),
    clMax: Number((clMaxBase + aspectBonusCl).toFixed(2)),
    maxMach: engineMaxMach,
    serviceCeilingM: ceiling,
  };
}

export function computeAirframeMetrics(spec: AircraftSpec) {
  const aspectRatio = (spec.wingspanM * spec.wingspanM) / spec.wingAreaM2;
  const oswaldE = spec.wingPlanform === 'straight' ? 0.82 : spec.wingPlanform === 'delta' ? 0.68 : 0.76;
  const maxTakeoffWeightKg = spec.emptyMassKg + spec.maxFuelKg;
  const wingLoadingKgM2 = maxTakeoffWeightKg / spec.wingAreaM2;
  const thrustToWeight = (spec.maxThrustKN * 1000) / (maxTakeoffWeightKg * GRAVITY);
  const stallSpeedMS = Math.sqrt((2 * maxTakeoffWeightKg * GRAVITY) / (1.225 * spec.wingAreaM2 * spec.clMax));
  const stallSpeedKt = stallSpeedMS * MS_TO_KT;
  const maxLOverD = 1 / (2 * Math.sqrt(spec.cd0 / (Math.PI * oswaldE * aspectRatio)));

  return {
    aspectRatio,
    oswaldE,
    maxTakeoffWeightKg,
    wingLoadingKgM2,
    thrustToWeight,
    stallSpeedKt,
    maxLOverD,
  };
}

export function createInitialPhysicsState(departure: Airport, aircraft: AircraftSpec): PhysicsState {
  const headingRad = toRad(departure.runwayHeadingDeg);
  return {
    x: 0,
    y: 1.25, // Gear height above runway
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    pitchRad: 0,
    rollRad: 0,
    headingRad,
    pitchRate: 0,
    rollRate: 0,
    yawRate: 0,
    actualThrottle: 0,
    fuelKg: aircraft.maxFuelKg,
    fuelUsedKg: 0,
    onGround: true,
    crashed: false,
    landedSafely: false,
    elapsedTimeS: 0,
    distanceFlownKm: 0,
    maxAltitudeM: departure.elevationM,
    maxMachReached: 0,
    touchdownVsiMS: null,
    outcomeReason: null,
  };
}

export function createAirbornePhysicsState(
  departure: Airport,
  aircraft: AircraftSpec,
  flightPlan: FlightPlan
): PhysicsState {
  const headingDeg =
    departure.icao === flightPlan.destination.icao
      ? departure.runwayHeadingDeg
      : computeInitialBearingDeg(departure, flightPlan.destination);
  const headingRad = toRad(headingDeg);
  const metrics = computeAirframeMetrics(aircraft);
  const stallMS = metrics.stallSpeedKt / MS_TO_KT;
  const cruiseSpeedMS = Math.max(95, Math.min(260, stallMS * 1.95));
  const altM = 950;

  return {
    x: Math.sin(headingRad) * 600,
    y: altM,
    z: -Math.cos(headingRad) * 600,
    vx: Math.sin(headingRad) * cruiseSpeedMS,
    vy: 0,
    vz: -Math.cos(headingRad) * cruiseSpeedMS,
    pitchRad: 0.035,
    rollRad: 0,
    headingRad,
    pitchRate: 0,
    rollRate: 0,
    yawRate: 0,
    actualThrottle: 0.75,
    fuelKg: aircraft.maxFuelKg,
    fuelUsedKg: 0,
    onGround: false,
    crashed: false,
    landedSafely: false,
    elapsedTimeS: 0,
    distanceFlownKm: 0,
    maxAltitudeM: departure.elevationM + altM,
    maxMachReached: cruiseSpeedMS / 336,
    touchdownVsiMS: null,
    outcomeReason: null,
  };
}

function getBodyAxes(headingRad: number, pitchRad: number, rollRad: number) {
  const ch = Math.cos(headingRad);
  const sh = Math.sin(headingRad);
  const cp = Math.cos(pitchRad);
  const sp = Math.sin(pitchRad);
  const cr = Math.cos(rollRad);
  const sr = Math.sin(rollRad);

  const fwdX = cp * sh;
  const fwdY = sp;
  const fwdZ = -cp * ch;

  const upX = sr * ch - cr * sp * sh;
  const upY = cr * cp;
  const upZ = sr * sh + cr * sp * ch;

  // Right = fwd x up
  const rightX = fwdY * upZ - fwdZ * upY;
  const rightY = fwdZ * upX - fwdX * upZ;
  const rightZ = fwdX * upY - fwdY * upX;

  return { fwdX, fwdY, fwdZ, upX, upY, upZ, rightX, rightY, rightZ };
}

export function computeAeroTelemetry(
  state: PhysicsState,
  aircraft: AircraftSpec,
  flightPlan: FlightPlan,
  controls: FlightControls
): AeroTelemetry {
  const absAltM = Math.max(0, flightPlan.departure.elevationM + state.y - 1.25);
  const atmosphere = computeAtmosphere(absAltM, flightPlan.departure.qnhHpa);

  const tasMS = Math.hypot(state.vx, state.vy, state.vz);
  const dynamicPressurePa = 0.5 * atmosphere.airDensityKgM3 * tasMS * tasMS;
  const iasMS = Math.sqrt((2 * dynamicPressurePa) / 1.225);
  const iasKt = iasMS * MS_TO_KT;
  const tasKmh = tasMS * MS_TO_KMH;
  const mach = tasMS / atmosphere.speedOfSoundMS;

  const axes = getBodyAxes(state.headingRad, state.pitchRad, state.rollRad);
  const vFwd = state.vx * axes.fwdX + state.vy * axes.fwdY + state.vz * axes.fwdZ;
  const vUp = state.vx * axes.upX + state.vy * axes.upY + state.vz * axes.upZ;

  const rawAoaRad = tasMS > 4 ? Math.atan2(-vUp, Math.max(2, vFwd)) : 0;
  const aoaDeg = (rawAoaRad * 180) / Math.PI;

  const flapClBonus = controls.flapsLevel * 0.22;
  const agl = Math.max(0, state.y - 1.25);
  const groundEffectMult =
    agl < aircraft.wingspanM ? 1 + 0.18 * (1 - agl / aircraft.wingspanM) : 1.0;
  const clSlope = 2 * Math.PI * 0.85; // ~5.34 /rad
  const critAoaRad = (17 * Math.PI) / 180;
  let cl = (0.14 + flapClBonus + clSlope * rawAoaRad) * groundEffectMult;
  const effClMax = (aircraft.clMax + flapClBonus * 1.4) * groundEffectMult;
  if (Math.abs(rawAoaRad) > critAoaRad) {
    // Post-stall lift drop-off
    const excess = Math.abs(rawAoaRad) - critAoaRad;
    cl = Math.sign(cl) * Math.max(0.25, effClMax * Math.exp(-excess * 3.2));
  } else {
    cl = Math.max(-effClMax * 0.6, Math.min(effClMax, cl));
  }

  const aspectRatio = (aircraft.wingspanM * aircraft.wingspanM) / aircraft.wingAreaM2;
  const oswaldE = aircraft.wingPlanform === 'straight' ? 0.82 : 0.74;
  const inducedCd = (cl * cl) / (Math.PI * oswaldE * aspectRatio);
  const gearCd = controls.gearDown ? 0.022 : 0;
  const flapCd = controls.flapsLevel * 0.018;
  const airbrakeCd = controls.airbrake ? 0.065 : 0;
  const waveCd = mach > 0.88 ? Math.pow(mach - 0.88, 2) * 0.14 : 0;
  const totalCd = aircraft.cd0 + inducedCd + gearCd + flapCd + airbrakeCd + waveCd;

  const liftN = dynamicPressurePa * aircraft.wingAreaM2 * cl;
  const dragN = dynamicPressurePa * aircraft.wingAreaM2 * totalCd;

  const densityRatio = Math.pow(atmosphere.airDensityKgM3 / 1.225, 0.72);
  const hasFuel = state.fuelKg > 0.5;
  const afterburnerActive =
    hasFuel && aircraft.afterburnerRatio > 1.05 && state.actualThrottle > 0.85;
  const dryMaxN = (aircraft.maxThrustKN * 1000) / aircraft.afterburnerRatio;
  let throttleThrustN = 0;
  if (hasFuel) {
    if (state.actualThrottle <= 0.85) {
      throttleThrustN = dryMaxN * (state.actualThrottle / 0.85);
    } else {
      const abFrac = (state.actualThrottle - 0.85) / 0.15;
      throttleThrustN = dryMaxN + (aircraft.maxThrustKN * 1000 - dryMaxN) * abFrac;
    }
  }
  const thrustN = throttleThrustN * densityRatio;

  const abSfcMultiplier = afterburnerActive ? 2.15 : 1.0;
  const fuelFlowKgS = hasFuel ? (thrustN / 1000) * aircraft.tsfcKgPerKNS * abSfcMultiplier : 0;
  const enduranceSec = fuelFlowKgS > 0.001 ? state.fuelKg / fuelFlowKgS : 99999;

  const totalMassKg = aircraft.emptyMassKg + state.fuelKg;
  const loadFactorG = liftN / (totalMassKg * GRAVITY);
  const liftToDrag = dragN > 10 ? liftN / dragN : 0;

  const stallSpeedMS = Math.sqrt((2 * totalMassKg * GRAVITY) / (1.225 * aircraft.wingAreaM2 * effClMax));
  const stallSpeedKt = stallSpeedMS * MS_TO_KT;
  const stallWarning = !state.onGround && (Math.abs(aoaDeg) > 15.5 || (iasKt < stallSpeedKt * 1.08 && tasMS > 12));
  const overspeedWarning = mach > aircraft.maxMach * 1.04;

  const destCoords = getSimDestinationCoords(flightPlan);
  const dx = destCoords.x - state.x;
  const dz = destCoords.z - state.z;
  const simDistM = Math.hypot(dx, dz);
  const bearingToDestDeg = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
  const distanceToDestKm = (simDistM * destCoords.scaleRatio) / 1000;
  const distanceToDestNm = distanceToDestKm * 0.539957;

  const headingDeg = ((state.headingRad * 180) / Math.PI + 360) % 360;
  const pitchDeg = (state.pitchRad * 180) / Math.PI;
  const rollDeg = (state.rollRad * 180) / Math.PI;

  return {
    tasMS,
    iasMS,
    iasKt,
    tasKmh,
    mach,
    verticalSpeedMS: state.vy,
    verticalSpeedFpm: state.vy * 196.8504,
    aoaDeg,
    dynamicPressurePa,
    liftN,
    dragN,
    thrustN,
    liftToDrag,
    loadFactorG,
    fuelFlowKgS,
    enduranceSec,
    stallSpeedKt,
    stallWarning,
    overspeedWarning,
    afterburnerActive,
    totalMassKg,
    headingDeg,
    pitchDeg,
    rollDeg,
    altitudeAglM: Math.max(0, state.y - 1.25),
    bearingToDestDeg:
      flightPlan.departure.icao === flightPlan.destination.icao
        ? computeInitialBearingDeg(flightPlan.departure, flightPlan.destination)
        : bearingToDestDeg,
    distanceToDestKm,
    distanceToDestNm,
    atmosphere,
  };
}

/**
 * Advances the aircraft 6-DOF flight physics by dt seconds.
 */
export function stepFlightPhysics(
  prev: PhysicsState,
  controls: FlightControls,
  aircraft: AircraftSpec,
  flightPlan: FlightPlan,
  dtRaw: number
): { state: PhysicsState; telemetry: AeroTelemetry } {
  const dt = Math.min(0.05, Math.max(0.001, dtRaw));
  if (prev.crashed || prev.landedSafely) {
    return {
      state: prev,
      telemetry: computeAeroTelemetry(prev, aircraft, flightPlan, controls),
    };
  }

  const next: PhysicsState = { ...prev };
  next.elapsedTimeS += dt;

  // Smooth engine spool-up / spool-down
  const targetThrottle = next.fuelKg > 0.5 ? controls.throttle : 0;
  next.actualThrottle += (targetThrottle - next.actualThrottle) * (1 - Math.exp(-3.2 * dt));

  // Compute current aerodynamic forces
  const tel = computeAeroTelemetry(next, aircraft, flightPlan, controls);
  const totalMassKg = tel.totalMassKg;

  // Burn fuel
  const burned = Math.min(next.fuelKg, tel.fuelFlowKgS * dt);
  next.fuelKg = Math.max(0, next.fuelKg - burned);
  next.fuelUsedKg += burned;

  const axes = getBodyAxes(next.headingRad, next.pitchRad, next.rollRad);
  const tas = tel.tasMS;

  // Control authority scales with dynamic pressure (minimum nosewheel authority on ground)
  const qFactor = Math.min(1.15, Math.max(0.15, tel.dynamicPressurePa / 4200));
  const groundSteerFactor = next.onGround ? Math.min(1, tas / 18) : 0;

  if (next.onGround) {
    // Ground roll: allow pitch up rotation above ~55% stall speed
    const targetPitchRate =
      controls.pitchInput > 0 && tel.iasKt > tel.stallSpeedKt * 0.65
        ? controls.pitchInput * 0.45
        : -next.pitchRad * 4.0;
    next.pitchRate += (targetPitchRate - next.pitchRate) * (1 - Math.exp(-8 * dt));
    next.pitchRad = Math.max(-0.04, Math.min(0.32, next.pitchRad + next.pitchRate * dt));
    // Keep wings level on ground
    next.rollRad += (0 - next.rollRad) * (1 - Math.exp(-10 * dt));
    next.rollRate = 0;
    // Nosewheel steering
    next.yawRate = controls.yawInput * 0.45 * groundSteerFactor;
    next.headingRad += next.yawRate * dt;
  } else {
    // Airborne rotational dynamics
    const maxRollRate = aircraft.wingPlanform === 'delta' ? 2.6 : 2.1;
    const maxPitchRate = 1.15;
    const maxYawRate = 0.55;

    const targetRollRate = controls.rollInput * maxRollRate * qFactor;
    const targetPitchRate = controls.pitchInput * maxPitchRate * qFactor;

    // Gentle weathercock alignment & coordinated bank-to-turn yaw
    const bankTurnYaw = Math.sin(next.rollRad) * (GRAVITY / Math.max(45, tas)) * 0.95;
    const targetYawRate = controls.yawInput * maxYawRate * qFactor + bankTurnYaw;

    // Auto-level tendency when controls released
    const pitchStabilize = Math.abs(controls.pitchInput) < 0.05 ? -tel.aoaDeg * 0.008 : 0;

    next.rollRate += (targetRollRate - next.rollRate) * (1 - Math.exp(-9 * dt));
    next.pitchRate += (targetPitchRate + pitchStabilize - next.pitchRate) * (1 - Math.exp(-7 * dt));
    next.yawRate += (targetYawRate - next.yawRate) * (1 - Math.exp(-6 * dt));

    next.rollRad += next.rollRate * dt;
    // Wrap roll within -PI..PI
    if (next.rollRad > Math.PI) next.rollRad -= Math.PI * 2;
    if (next.rollRad < -Math.PI) next.rollRad += Math.PI * 2;

    next.pitchRad = Math.max(-1.35, Math.min(1.35, next.pitchRad + next.pitchRate * dt));
    next.headingRad = (next.headingRad + next.yawRate * dt + Math.PI * 2) % (Math.PI * 2);
  }

  // Recompute body axes after orientation update
  const updatedAxes = getBodyAxes(next.headingRad, next.pitchRad, next.rollRad);

  // Forces in world coordinates (N)
  // 1. Thrust along aircraft forward
  let fx = updatedAxes.fwdX * tel.thrustN;
  let fy = updatedAxes.fwdY * tel.thrustN;
  let fz = updatedAxes.fwdZ * tel.thrustN;

  // 2. Gravity
  fy -= totalMassKg * GRAVITY;

  // 3. Lift along aircraft up (or perpendicular to airspeed tilted by roll)
  fx += updatedAxes.upX * tel.liftN;
  fy += updatedAxes.upY * tel.liftN;
  fz += updatedAxes.upZ * tel.liftN;

  // 4. Drag opposite velocity vector
  if (tas > 0.1) {
    const invV = 1 / tas;
    fx -= next.vx * invV * tel.dragN;
    fy -= next.vy * invV * tel.dragN;
    fz -= next.vz * invV * tel.dragN;

    // Lateral fuselage sideforce damping (prevents endless sideways skid)
    const vSide = next.vx * updatedAxes.rightX + next.vy * updatedAxes.rightY + next.vz * updatedAxes.rightZ;
    const sideDampForce = -vSide * (next.onGround ? 18 : 2.8) * totalMassKg;
    fx += updatedAxes.rightX * sideDampForce;
    fy += updatedAxes.rightY * sideDampForce;
    fz += updatedAxes.rightZ * sideDampForce;
  }

  // 5. Ground normal & rolling/braking friction
  const groundGearY = controls.gearDown ? 1.25 : 0.6;
  if (next.onGround) {
    if (fy < 0) {
      // Normal force cancels downward net force
      fy = 0;
    }
    const weightRemaining = Math.max(0, totalMassKg * GRAVITY - tel.liftN);
    const brakeCoeff = controls.airbrake || controls.throttle < 0.05 ? 0.14 : 0.018;
    const rollingFriction = weightRemaining * brakeCoeff;
    const horizSpeed = Math.hypot(next.vx, next.vz);
    if (horizSpeed > 0.2) {
      fx -= (next.vx / horizSpeed) * rollingFriction;
      fz -= (next.vz / horizSpeed) * rollingFriction;
    }
  }

  // Integrate acceleration -> velocity -> position
  const ax = fx / totalMassKg;
  const ay = fy / totalMassKg;
  const az = fz / totalMassKg;

  next.vx += ax * dt;
  next.vy += ay * dt;
  next.vz += az * dt;

  // Prevent tiny backward creep on brakes
  if (next.onGround && controls.throttle < 0.02 && Math.hypot(next.vx, next.vz) < 0.5) {
    next.vx *= 0.8;
    next.vz *= 0.8;
  }

  const prevX = next.x;
  const prevZ = next.z;
  next.x += next.vx * dt;
  next.y += next.vy * dt;
  next.z += next.vz * dt;

  const destCoords = getSimDestinationCoords(flightPlan);
  const stepDistKm = (Math.hypot(next.x - prevX, next.z - prevZ) * destCoords.scaleRatio) / 1000;
  next.distanceFlownKm += stepDistKm;

  const absAltM = Math.max(0, flightPlan.departure.elevationM + next.y - 1.25);
  if (absAltM > next.maxAltitudeM) next.maxAltitudeM = absAltM;
  if (tel.mach > next.maxMachReached) next.maxMachReached = tel.mach;

  // Ground transition & touchdown detection
  if (next.y <= groundGearY) {
    const impactVsi = next.vy;
    next.y = groundGearY;
    if (!next.onGround && next.elapsedTimeS > 2) {
      // Just touched down from flight
      next.touchdownVsiMS = impactVsi;
      if (!controls.gearDown) {
        next.crashed = true;
        next.outcomeReason = 'Gear-up belly impact! Extend landing gear [G] before touchdown.';
      } else if (impactVsi < -9.5 || Math.abs(next.rollRad) > 0.42) {
        next.crashed = true;
        next.outcomeReason = `Hard impact (${impactVsi.toFixed(1)} m/s sink rate). Flare gently before touchdown.`;
      } else {
        // Check if near destination or departure airport
        const distToDestM = Math.hypot(destCoords.x - next.x, destCoords.z - next.z);
        const distToDepM = Math.hypot(next.x, next.z);
        if (distToDestM < 3200) {
          next.landedSafely = true;
          next.outcomeReason = `Arrived safely at ${flightPlan.destination.name} (${flightPlan.destination.icao})!`;
        } else if (distToDepM > 4000) {
          // Off-runway emergency landing or field touchdown
          next.onGround = true;
        }
      }
    }
    next.onGround = true;
    if (next.vy < 0) next.vy = 0;
  } else if (next.y > groundGearY + 0.5 && next.vy > 0.35) {
    next.onGround = false;
  }

  // Fuel exhaustion emergency check if speed drops near zero mid-air or crashes
  const finalTelemetry = computeAeroTelemetry(next, aircraft, flightPlan, controls);
  return { state: next, telemetry: finalTelemetry };
}
