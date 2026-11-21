import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import {
  computeAeroTelemetry,
  createAirbornePhysicsState,
  createInitialPhysicsState,
  stepFlightPhysics,
} from '../sim/aerodynamics';
import { computeInitialBearingDeg, getSimDestinationCoords, toRad } from '../sim/airports';
import { flightAudio } from '../sim/soundEngine';
import type {
  AeroTelemetry,
  AircraftSpec,
  CameraMode,
  FlightControls,
  FlightPlan,
  FlightStartMode,
  GameState,
  PhysicsState,
} from '../sim/types';
import { buildAircraftModel, type AircraftRig } from './aircraftBuilder';
import { createConfiguredRenderer, detectSoftwareWebGL, scheduleAfterDraw } from './webglUtils';

interface FlightCanvasProps {
  gameState: GameState;
  aircraft: AircraftSpec;
  flightPlan: FlightPlan;
  controlsRef: React.MutableRefObject<FlightControls>;
  cameraMode: CameraMode;
  timeScale: number;
  startMode: FlightStartMode;
  autoLevel: boolean;
  resetCounter: number;
  onTelemetryUpdate: (state: PhysicsState, telemetry: AeroTelemetry) => void;
  onFlightEnd: (state: PhysicsState, telemetry: AeroTelemetry) => void;
}

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _mat4 = new THREE.Matrix4();

function createRunwayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e242c';
  ctx.fillRect(0, 0, 512, 1024);

  // Subtle asphalt grain
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 600; i++) {
    ctx.fillRect((i * 73) % 512, (i * 137) % 1024, 3, 6);
  }

  // Edge stripes
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(26, 0, 10, 1024);
  ctx.fillRect(476, 0, 10, 1024);

  // Clean dashed centerline (tiles seamlessly)
  ctx.fillStyle = '#f8fafc';
  for (let y = 32; y < 1024; y += 128) {
    ctx.fillRect(250, y, 12, 68);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildAirportGroup(
  runwayLengthM: number,
  headingDeg: number,
  isDestination: boolean,
  baseRunwayTex: THREE.CanvasTexture
): THREE.Group {
  const group = new THREE.Group();
  const len = Math.max(2400, Math.min(4600, runwayLengthM));

  // Concrete apron / tarmac slab well above ground y=0 to prevent depth Z-fighting
  const apronGeo = new THREE.BoxGeometry(116, 0.5, len + 280);
  const apronMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.85,
    metalness: 0.08,
  });
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.position.set(0, 0.25, -len * 0.42);
  apron.receiveShadow = true;
  group.add(apron);

  // Runway surface tiled cleanly along length
  const rwyTex = baseRunwayTex.clone();
  rwyTex.needsUpdate = true;
  rwyTex.repeat.set(1, Math.max(8, Math.round(len / 220)));

  const rwyGeo = new THREE.PlaneGeometry(54, len);
  rwyGeo.rotateX(-Math.PI / 2);
  const rwyMat = new THREE.MeshStandardMaterial({
    map: rwyTex,
    roughness: 0.78,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const rwy = new THREE.Mesh(rwyGeo, rwyMat);
  rwy.position.set(0, 0.55, -len * 0.42);
  rwy.receiveShadow = true;
  group.add(rwy);

  // Crisp threshold piano key markings at takeoff end
  const stripeMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
  const stripeGeo = new THREE.PlaneGeometry(3.4, 28);
  stripeGeo.rotateX(-Math.PI / 2);
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(i * 6.2, 0.58, 12);
    group.add(stripe);
  }

  // Control Tower + Hangar buildings alongside tarmac
  const towerMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.65 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    roughness: 0.15,
    metalness: 0.7,
    emissive: '#0284c7',
    emissiveIntensity: 0.35,
  });

  const towerShaft = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.5, 34, 10), towerMat);
  towerShaft.position.set(56, 17, -140);
  const towerCab = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 4.8, 6, 12), glassMat);
  towerCab.position.set(56, 36, -140);
  group.add(towerShaft, towerCab);

  const hangarMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.6, metalness: 0.35 });
  for (let i = 0; i < 2; i++) {
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(38, 14, 46), hangarMat);
    hangar.position.set(-68, 7, -110 - i * 80);
    group.add(hangar);
  }

  // Destination illuminated approach beacon gates
  if (isDestination) {
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#10b981',
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    for (let i = 1; i <= 4; i++) {
      const gate = new THREE.Mesh(new THREE.TorusGeometry(32 + i * 8, 1.4, 8, 32), ringMat);
      gate.position.set(0, 45 * i, 600 * i);
      group.add(gate);
    }
  }

  group.rotation.y = -toRad(headingDeg);
  return group;
}

export function FlightCanvas({
  gameState,
  aircraft,
  flightPlan,
  controlsRef,
  cameraMode,
  timeScale,
  startMode,
  autoLevel,
  resetCounter,
  onTelemetryUpdate,
  onFlightEnd,
}: FlightCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    gameState,
    aircraft,
    flightPlan,
    cameraMode,
    timeScale,
    startMode,
    autoLevel,
    onTelemetryUpdate,
    onFlightEnd,
  });
  stateRef.current = {
    gameState,
    aircraft,
    flightPlan,
    cameraMode,
    timeScale,
    startMode,
    autoLevel,
    onTelemetryUpdate,
    onFlightEnd,
  };

  const simActionsRef = useRef<{
    rebuildAircraft: (spec: AircraftSpec) => void;
    rebuildRoute: (plan: FlightPlan, spec: AircraftSpec, mode: FlightStartMode) => void;
    resetFlight: (plan: FlightPlan, spec: AircraftSpec, mode: FlightStartMode) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = createConfiguredRenderer(container, isSoftwareGl);

    const scene = new THREE.Scene();
    const fogColor = new THREE.Color('#8cb6dc');
    scene.background = fogColor;
    scene.fog = new THREE.FogExp2('#8cb6dc', 0.000048);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Procedural Sky.js
    const sky = new Sky();
    sky.scale.setScalar(180000);
    scene.add(sky);
    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 4.2;
    skyUniforms['rayleigh'].value = 1.65;
    skyUniforms['mieCoefficient'].value = 0.004;
    skyUniforms['mieDirectionalG'].value = 0.82;
    const sunVec = new THREE.Vector3();
    sunVec.setFromSphericalCoords(1, THREE.MathUtils.degToRad(62), THREE.MathUtils.degToRad(145));
    skyUniforms['sunPosition'].value.copy(sunVec);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(58, width / height, 1.5, 90000);
    camera.position.set(18, 6.5, 18);
    camera.lookAt(0, 1.8, 0);

    // Lighting: Warm sunlight key + cool sky/ground HemisphereLight
    const hemiLight = new THREE.HemisphereLight('#bae6fd', '#3f6212', 0.9);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fff6e5', 2.3);
    sunLight.position.set(160, 260, 120);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.left = -45;
      sunLight.shadow.camera.right = 45;
      sunLight.shadow.camera.top = 45;
      sunLight.shadow.camera.bottom = -45;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Expansive Ground Plane
    const groundGeo = new THREE.PlaneGeometry(160000, 160000);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#34533e',
      roughness: 0.92,
      metalness: 0.04,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Sloped mountain ridges far outside the airport perimeter (radius 4400..46000m)
    const patchGeo = new THREE.ConeGeometry(1, 1, 7);
    const patchMat = new THREE.MeshStandardMaterial({
      color: '#3f6246',
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true,
    });
    const patchCount = 160;
    const terrainPatches = new THREE.InstancedMesh(patchGeo, patchMat, patchCount);
    const dummy = new THREE.Object3D();
    const patchColor = new THREE.Color();
    for (let i = 0; i < patchCount; i++) {
      const angle = (i * 2.39996) % (Math.PI * 2);
      const radius = 4400 + ((i * 7919) % 42000);
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;
      const h = 120 + ((i * 313) % 420);
      const w = 900 + ((i * 977) % 2200);
      dummy.position.set(px, h * 0.45 - 5, pz);
      dummy.scale.set(w, h, w * 0.85);
      dummy.rotation.y = (i * 0.7) % Math.PI;
      dummy.updateMatrix();
      terrainPatches.setMatrixAt(i, dummy.matrix);
      patchColor.setHSL(0.28 + (i % 5) * 0.015, 0.22, 0.24 + (i % 4) * 0.04);
      terrainPatches.setColorAt(i, patchColor);
    }
    terrainPatches.instanceMatrix.needsUpdate = true;
    if (terrainPatches.instanceColor) terrainPatches.instanceColor.needsUpdate = true;
    terrainPatches.computeBoundingSphere();
    scene.add(terrainPatches);

    // Volumetric Cloud Deck via InstancedMesh (lightweight, high-altitude depth cue)
    const cloudGeo = new THREE.DodecahedronGeometry(1, 1);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.86,
    });
    const cloudCount = 120;
    const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, cloudCount);
    for (let i = 0; i < cloudCount; i++) {
      const angle = (i * 1.91) % (Math.PI * 2);
      const dist = 1600 + ((i * 4219) % 44000);
      const cy = 950 + ((i * 541) % 3400);
      dummy.position.set(Math.cos(angle) * dist, cy, Math.sin(angle) * dist);
      dummy.scale.set(320 + (i % 5) * 140, 75 + (i % 3) * 35, 240 + (i % 4) * 110);
      dummy.rotation.y = i * 0.4;
      dummy.updateMatrix();
      clouds.setMatrixAt(i, dummy.matrix);
    }
    clouds.instanceMatrix.needsUpdate = true;
    clouds.computeBoundingSphere();
    scene.add(clouds);

    // Pooled Zero-GC Contrail / Wingtip Vortex Particles
    const TRAIL_POOL_SIZE = 90;
    const trailGeo = new THREE.SphereGeometry(0.45, 6, 6);
    const trailMat = new THREE.MeshBasicMaterial({
      color: '#f1f5f9',
      transparent: true,
      opacity: 0.5,
    });
    const trailMesh = new THREE.InstancedMesh(trailGeo, trailMat, TRAIL_POOL_SIZE);
    trailMesh.frustumCulled = false;
    const trailPositions = new Float32Array(TRAIL_POOL_SIZE * 3);
    const trailAges = new Float32Array(TRAIL_POOL_SIZE);
    trailAges.fill(99);
    let trailCursor = 0;
    let trailEmitTimer = 0;
    scene.add(trailMesh);

    const runwayTex = createRunwayTexture();
    runwayTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    let depAirportGroup: THREE.Group | null = null;
    let destAirportGroup: THREE.Group | null = null;
    let skyGatesGroup: THREE.Group | null = null;
    let aircraftRig: AircraftRig | null = null;

    const skyGateGeo = new THREE.TorusGeometry(68, 3.6, 8, 32);
    const skyGateMat = new THREE.MeshBasicMaterial({
      color: '#0284c7',
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });

    // Ground contact shadow disc
    const contactShadowGeo = new THREE.CircleGeometry(7, 24);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: '#020617',
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.position.y = 0.2;
    scene.add(contactShadow);

    let physicsState: PhysicsState =
      stateRef.current.startMode === 'airborne'
        ? createAirbornePhysicsState(
            stateRef.current.flightPlan.departure,
            stateRef.current.aircraft,
            stateRef.current.flightPlan
          )
        : createInitialPhysicsState(
            stateRef.current.flightPlan.departure,
            stateRef.current.aircraft
          );
    let currentGearAngle = stateRef.current.startMode === 'airborne' ? 0 : 1; // 1 = extended, 0 = retracted
    let hudEmitTimer = 0;
    let endNotified = false;
    let snapCameraNextTick = true;

    const rebuildAirports = (plan: FlightPlan) => {
      if (depAirportGroup) scene.remove(depAirportGroup);
      if (destAirportGroup) scene.remove(destAirportGroup);
      if (skyGatesGroup) scene.remove(skyGatesGroup);

      depAirportGroup = buildAirportGroup(
        plan.departure.runwayLengthM,
        plan.departure.runwayHeadingDeg,
        false,
        runwayTex
      );
      scene.add(depAirportGroup);

      const destCoords = getSimDestinationCoords(plan);
      destAirportGroup = buildAirportGroup(
        plan.destination.runwayLengthM,
        plan.destination.runwayHeadingDeg,
        true,
        runwayTex
      );
      destAirportGroup.position.set(destCoords.x, 0, destCoords.z);
      scene.add(destAirportGroup);

      // Visual sky corridor gates along departure -> destination vector
      skyGatesGroup = new THREE.Group();
      const gateBearingDeg =
        plan.departure.icao === plan.destination.icao
          ? plan.departure.runwayHeadingDeg
          : computeInitialBearingDeg(plan.departure, plan.destination);
      const gateBearingRad = toRad(gateBearingDeg);
      const gateDirX = Math.sin(gateBearingRad);
      const gateDirZ = -Math.cos(gateBearingRad);
      for (let i = 1; i <= 8; i++) {
        const ring = new THREE.Mesh(skyGateGeo, skyGateMat);
        const dist = 1400 + i * 1650;
        const alt = 920 + Math.sin(i * 0.7) * 140;
        ring.position.set(gateDirX * dist, alt, gateDirZ * dist);
        ring.rotation.y = -gateBearingRad;
        skyGatesGroup.add(ring);
      }
      scene.add(skyGatesGroup);
    };

    const rebuildAircraft = (spec: AircraftSpec) => {
      if (aircraftRig) {
        scene.remove(aircraftRig.root);
        aircraftRig.dispose();
      }
      aircraftRig = buildAircraftModel(spec, renderer.capabilities.getMaxAnisotropy());
      scene.add(aircraftRig.root);
    };

    const resetFlight = (plan: FlightPlan, spec: AircraftSpec, mode: FlightStartMode) => {
      physicsState =
        mode === 'airborne'
          ? createAirbornePhysicsState(plan.departure, spec, plan)
          : createInitialPhysicsState(plan.departure, spec);
      currentGearAngle = mode === 'airborne' ? 0 : 1;
      endNotified = false;
      snapCameraNextTick = true;
      trailAges.fill(99);
      const initTel = computeAeroTelemetry(physicsState, spec, plan, controlsRef.current);
      stateRef.current.onTelemetryUpdate(physicsState, initTel);
    };

    simActionsRef.current = {
      rebuildAircraft,
      rebuildRoute: (plan, spec, mode) => {
        rebuildAirports(plan);
        resetFlight(plan, spec, mode);
      },
      resetFlight,
    };

    rebuildAirports(stateRef.current.flightPlan);
    rebuildAircraft(stateRef.current.aircraft);
    resetFlight(stateRef.current.flightPlan, stateRef.current.aircraft, stateRef.current.startMode);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let lastTime = performance.now();
    let frameId = 0;
    let disposed = false;
    let showcaseAngle = 0.65;
    let prevMode: GameState | null = null;

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      const {
        gameState: gState,
        aircraft: spec,
        flightPlan: plan,
        cameraMode: camMode,
        timeScale: warp,
        autoLevel: wingsAutoLevel,
        onTelemetryUpdate: emitHud,
        onFlightEnd: emitEnd,
      } = stateRef.current;
      const controls = controlsRef.current;
      const snapCam = prevMode !== gState || snapCameraNextTick;
      prevMode = gState;
      snapCameraNextTick = false;

      // Advance simulation if playing
      if (gState === 'playing' && !physicsState.crashed && !physicsState.landedSafely) {
        const subSteps = warp >= 8 ? 4 : warp >= 4 ? 2 : 1;
        const simDt = (dt * warp) / subSteps;
        let lastTel: AeroTelemetry | null = null;
        for (let s = 0; s < subSteps; s++) {
          let effectiveControls = controls;
          if (wingsAutoLevel && !physicsState.onGround && Math.abs(controls.rollInput) < 0.05) {
            const rollAssist = Math.max(
              -0.75,
              Math.min(0.75, -physicsState.rollRad * 1.35 - physicsState.rollRate * 0.4)
            );
            effectiveControls = { ...controls, rollInput: rollAssist };
          }
          const res = stepFlightPhysics(physicsState, effectiveControls, spec, plan, simDt);
          physicsState = res.state;
          lastTel = res.telemetry;
        }
        if (lastTel) {
          flightAudio.update(
            physicsState.actualThrottle,
            lastTel.afterburnerActive,
            spec.engineType === 'turboprop',
            lastTel.stallWarning,
            true
          );

          hudEmitTimer += dt;
          if (hudEmitTimer >= 0.09) {
            hudEmitTimer = 0;
            emitHud(physicsState, lastTel);
          }

          if ((physicsState.crashed || physicsState.landedSafely) && !endNotified) {
            endNotified = true;
            emitHud(physicsState, lastTel);
            emitEnd(physicsState, lastTel);
          }

          // Emit contrail / exhaust particles at high speed or afterburner
          trailEmitTimer += dt;
          if ((lastTel.tasMS > 75 || lastTel.afterburnerActive) && trailEmitTimer > 0.04) {
            trailEmitTimer = 0;
            const idx = trailCursor * 3;
            trailPositions[idx] = physicsState.x;
            trailPositions[idx + 1] = physicsState.y;
            trailPositions[idx + 2] = physicsState.z;
            trailAges[trailCursor] = 0;
            trailCursor = (trailCursor + 1) % TRAIL_POOL_SIZE;
          }
        }
      } else {
        flightAudio.update(0, false, false, false, false);
      }

      // Sync aircraft 3D mesh transforms & animated parts
      if (aircraftRig) {
        aircraftRig.root.position.set(physicsState.x, physicsState.y, physicsState.z);
        _euler.set(physicsState.pitchRad, -physicsState.headingRad, -physicsState.rollRad, 'YXZ');
        aircraftRig.root.quaternion.setFromEuler(_euler);

        // Gear retraction smooth damp
        const targetGear = controls.gearDown ? 1 : 0;
        currentGearAngle += (targetGear - currentGearAngle) * (1 - Math.exp(-6 * dt));
        aircraftRig.gearGroup.visible = currentGearAngle > 0.05;
        aircraftRig.gearGroup.scale.set(1, Math.max(0.01, currentGearAngle), 1);

        // Flap deflection
        const flapAngle = controls.flapsLevel * 0.25 + controls.pitchInput * 0.15;
        aircraftRig.leftFlap.rotation.x = flapAngle + controls.rollInput * 0.15;
        aircraftRig.rightFlap.rotation.x = flapAngle - controls.rollInput * 0.15;

        // Spinning propeller or afterburner plume
        if (aircraftRig.propellerGroup) {
          const propSpeed = gState === 'title' ? 14 : 18 + physicsState.actualThrottle * 48;
          aircraftRig.propellerGroup.rotation.z += propSpeed * dt;
        }
        for (const ab of aircraftRig.afterburners) {
          const showAb =
            gState === 'playing' &&
            physicsState.actualThrottle > 0.85 &&
            physicsState.fuelKg > 0.5;
          ab.visible = showAb;
          if (showAb) {
            const flicker = 0.88 + Math.sin(now * 0.045) * 0.14;
            ab.scale.set(1, 1, flicker * (0.7 + physicsState.actualThrottle * 0.5));
          }
        }
      }

      // Update contact shadow disc beneath plane
      const agl = Math.max(0, physicsState.y - 1.25);
      contactShadow.visible = agl < 45;
      if (contactShadow.visible) {
        contactShadow.position.set(physicsState.x, 0.6, physicsState.z);
        const s = 1 + agl * 0.08;
        contactShadow.scale.set(s, 1, s);
        contactShadowMat.opacity = Math.max(0.05, 0.42 - agl * 0.01);
      }

      // Update pooled contrail particles
      for (let i = 0; i < TRAIL_POOL_SIZE; i++) {
        if (trailAges[i] < 3.5) {
          trailAges[i] += dt;
          const life = 1 - trailAges[i] / 3.5;
          const idx = i * 3;
          _vecA.set(trailPositions[idx], trailPositions[idx + 1], trailPositions[idx + 2]);
          const sc = Math.max(0.01, (1.4 - life * 0.7) * 1.4);
          _vecB.set(sc, sc, sc);
          _quat.identity();
          _mat4.compose(_vecA, _quat, _vecB);
        } else {
          _vecA.set(0, -500, 0);
          _vecB.set(0.001, 0.001, 0.001);
          _quat.identity();
          _mat4.compose(_vecA, _quat, _vecB);
        }
        trailMesh.setMatrixAt(i, _mat4);
      }
      trailMesh.instanceMatrix.needsUpdate = true;

      // Update directional sunlight shadow frustum around aircraft
      sunLight.position.set(physicsState.x + 160, physicsState.y + 240, physicsState.z + 120);
      sunLight.target.position.set(physicsState.x, physicsState.y, physicsState.z);
      sunLight.target.updateMatrixWorld();

      // Camera Choreography (snap immediately on first frame / mode transition)
      if (gState === 'title') {
        showcaseAngle += dt * 0.22;
        const radius = Math.max(18, spec.wingspanM * 1.65);
        _vecA.set(
          physicsState.x + Math.cos(showcaseAngle) * radius,
          physicsState.y + 5.0,
          physicsState.z + Math.sin(showcaseAngle) * radius
        );
        if (snapCam) camera.position.copy(_vecA);
        else camera.position.lerp(_vecA, 1 - Math.exp(-5 * dt));
        camera.up.set(0, 1, 0);
        camera.lookAt(physicsState.x, physicsState.y + 0.6, physicsState.z);
      } else {
        _euler.set(physicsState.pitchRad, -physicsState.headingRad, -physicsState.rollRad, 'YXZ');
        _quat.setFromEuler(_euler);

        if (camMode === 'cockpit') {
          _vecA.set(0, 1.35, -2.1).applyQuaternion(_quat).add(
            _vecB.set(physicsState.x, physicsState.y, physicsState.z)
          );
          _vecC.set(0, 1.25, -45).applyQuaternion(_quat).add(
            _vecB.set(physicsState.x, physicsState.y, physicsState.z)
          );
          camera.position.copy(_vecA);
          camera.up.set(0, 1, 0).applyQuaternion(_quat);
          camera.lookAt(_vecC);
        } else if (camMode === 'orbit') {
          showcaseAngle += dt * 0.4;
          _vecA.set(
            physicsState.x + Math.cos(showcaseAngle) * 24,
            physicsState.y + 7,
            physicsState.z + Math.sin(showcaseAngle) * 24
          );
          camera.up.set(0, 1, 0);
          if (snapCam) camera.position.copy(_vecA);
          else camera.position.lerp(_vecA, 1 - Math.exp(-6 * dt));
          camera.lookAt(physicsState.x, physicsState.y, physicsState.z);
        } else if (camMode === 'flyby') {
          _vecA.set(16, 4.5, -18).applyQuaternion(_quat).add(
            _vecB.set(physicsState.x, physicsState.y, physicsState.z)
          );
          camera.up.set(0, 1, 0);
          if (snapCam) camera.position.copy(_vecA);
          else camera.position.lerp(_vecA, 1 - Math.exp(-4.5 * dt));
          camera.lookAt(physicsState.x, physicsState.y, physicsState.z);
        } else {
          // Chase Cam
          const distBack = Math.max(19, spec.lengthM * 1.35);
          _vecA.set(0, 4.4, distBack).applyQuaternion(_quat).add(
            _vecB.set(physicsState.x, physicsState.y, physicsState.z)
          );
          if (_vecA.y < 1.8) _vecA.y = 1.8;
          camera.up.set(0, 1, 0);
          if (snapCam) camera.position.copy(_vecA);
          else camera.position.lerp(_vecA, 1 - Math.exp(-7.5 * dt));

          _vecC.set(0, 1.1, -24).applyQuaternion(_quat).add(
            _vecB.set(physicsState.x, physicsState.y, physicsState.z)
          );
          camera.lookAt(_vecC);
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        scheduleAfterDraw(renderer, tick, (id) => {
          frameId = id;
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    const onResize = () => {
      if (disposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      if (aircraftRig) aircraftRig.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      patchGeo.dispose();
      patchMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      trailGeo.dispose();
      trailMat.dispose();
      contactShadowGeo.dispose();
      contactShadowMat.dispose();
      skyGateGeo.dispose();
      skyGateMat.dispose();
      runwayTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    simActionsRef.current?.rebuildAircraft(aircraft);
  }, [aircraft]);

  useEffect(() => {
    simActionsRef.current?.rebuildRoute(flightPlan, aircraft, startMode);
  }, [flightPlan, resetCounter, startMode]);

  return (
    <div
      ref={mountRef}
      data-testid="flight-world-canvas"
      className="fixed inset-0 w-full h-full bg-[#090d14]"
    />
  );
}
