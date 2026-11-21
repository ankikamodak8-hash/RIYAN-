import * as THREE from 'three';
import type { AircraftSpec, RoundelStyle } from '../sim/types';

export interface AircraftRig {
  root: THREE.Group;
  gearGroup: THREE.Group;
  propellerGroup: THREE.Group | null;
  afterburners: THREE.Mesh[];
  leftFlap: THREE.Mesh;
  rightFlap: THREE.Mesh;
  dispose: () => void;
}

function drawRoundelToCanvas(style: RoundelStyle, accent: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const cx = 128;
  const cy = 128;

  const drawStar = (rOuter: number, rInner: number, color: string) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  switch (style) {
    case 'usaf-star': {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(14, 98, 228, 60);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 114, 228, 28);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(14, 123, 228, 10);
      ctx.beginPath();
      ctx.arc(cx, cy, 56, 0, Math.PI * 2);
      ctx.fillStyle = '#1e3a8a';
      ctx.fill();
      drawStar(48, 19, '#ffffff');
      break;
    }
    case 'bullseye': {
      ctx.beginPath();
      ctx.arc(cx, cy, 106, 0, Math.PI * 2);
      ctx.fillStyle = '#1d4ed8';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 72, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      break;
    }
    case 'tricolor-ring': {
      ctx.beginPath();
      ctx.arc(cx, cy, 106, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 72, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fillStyle = '#16a34a';
      ctx.fill();
      break;
    }
    case 'tricolor-fin': {
      ctx.beginPath();
      ctx.arc(cx, cy, 106, 0, Math.PI * 2);
      ctx.fillStyle = '#16a34a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 72, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      break;
    }
    case 'iron-cross': {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(46, 36);
      ctx.quadraticCurveTo(128, 72, 210, 36);
      ctx.quadraticCurveTo(184, 128, 210, 220);
      ctx.quadraticCurveTo(128, 184, 46, 220);
      ctx.quadraticCurveTo(72, 128, 46, 36);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(64, 52);
      ctx.quadraticCurveTo(128, 84, 192, 52);
      ctx.quadraticCurveTo(170, 128, 192, 204);
      ctx.quadraticCurveTo(128, 172, 64, 204);
      ctx.quadraticCurveTo(86, 128, 64, 52);
      ctx.fill();
      break;
    }
    case 'hinomaru': {
      ctx.beginPath();
      ctx.arc(cx, cy, 102, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 74, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      break;
    }
    case 'three-crowns': {
      ctx.beginPath();
      ctx.arc(cx, cy, 104, 0, Math.PI * 2);
      ctx.fillStyle = '#1d4ed8';
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#facc15';
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      for (const [ox, oy] of [
        [0, -34],
        [-34, 28],
        [34, 28],
      ]) {
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'taegeuk': {
      ctx.beginPath();
      ctx.arc(cx, cy, 104, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 78, Math.PI, 0);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 78, 0, Math.PI);
      ctx.fillStyle = '#2563eb';
      ctx.fill();
      break;
    }
    case 'maple-leaf': {
      ctx.beginPath();
      ctx.arc(cx, cy, 104, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 18;
      ctx.strokeStyle = '#dc2626';
      ctx.stroke();
      drawStar(58, 26, '#dc2626');
      break;
    }
    case 'southern-star': {
      ctx.beginPath();
      ctx.arc(cx, cy, 104, 0, Math.PI * 2);
      ctx.fillStyle = '#166534';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 74, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      drawStar(56, 22, '#1d4ed8');
      break;
    }
    case 'crescent-star': {
      ctx.beginPath();
      ctx.arc(cx, cy, 104, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - 10, cy, 56, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 8, cy, 44, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      drawStar(28, 12, '#ffffff');
      break;
    }
    case 'swiss-cross': {
      ctx.beginPath();
      ctx.arc(cx, cy, 104, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 18, cy - 64, 36, 128);
      ctx.fillRect(cx - 64, cy - 18, 128, 36);
      break;
    }
    default: {
      ctx.beginPath();
      ctx.arc(cx, cy, 96, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }
  }
  return canvas;
}

/**
 * Builds a composite 8-12 part procedural THREE.Group aircraft model
 * oriented with Nose along -Z, Tail along +Z, Up along +Y, Wingspan along X.
 */
export function buildAircraftModel(
  spec: AircraftSpec,
  maxAnisotropy = 4
): AircraftRig {
  const root = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Scale normalized to visual meters (1 unit = 1 meter)
  const len = Math.max(10, spec.lengthM);
  const halfLen = len * 0.5;
  const span = Math.max(7, spec.wingspanM);
  const halfSpan = span * 0.5;

  // Materials with deliberate roughness/metalness contrast (>= 0.25 delta)
  const primaryMat = track(
    new THREE.MeshStandardMaterial({
      color: spec.livery.primary,
      roughness: 0.48,
      metalness: 0.35,
    })
  );
  const secondaryMat = track(
    new THREE.MeshStandardMaterial({
      color: spec.livery.secondary,
      roughness: 0.68,
      metalness: 0.22,
    })
  );
  const accentMat = track(
    new THREE.MeshStandardMaterial({
      color: spec.livery.accent,
      roughness: 0.38,
      metalness: 0.45,
    })
  );
  const radomeMat = track(
    new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.82,
      metalness: 0.1,
    })
  );
  const metalMat = track(
    new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.22,
      metalness: 0.9,
    })
  );
  const canopyMat = track(
    new THREE.MeshPhysicalMaterial({
      color: spec.livery.canopyTint,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.72,
    })
  );
  const tireMat = track(
    new THREE.MeshStandardMaterial({
      color: '#111827',
      roughness: 0.88,
      metalness: 0.05,
    })
  );

  // 1. Sculpted Fuselage (LatheGeometry rotated to align along Z axis)
  const fusePoints: THREE.Vector2[] = [
    new THREE.Vector2(0.01, -halfLen * 0.88),
    new THREE.Vector2(0.32, -halfLen * 0.65),
    new THREE.Vector2(0.68, -halfLen * 0.32),
    new THREE.Vector2(0.84, 0),
    new THREE.Vector2(0.82, halfLen * 0.42),
    new THREE.Vector2(0.62, halfLen * 0.78),
    new THREE.Vector2(0.38, halfLen * 0.96),
    new THREE.Vector2(0.01, halfLen * 0.96),
  ];
  const fuseGeo = track(new THREE.LatheGeometry(fusePoints, 20));
  fuseGeo.rotateX(Math.PI / 2); // Y -> +Z
  fuseGeo.scale(1.08, 0.86, 1); // Slightly wider sleek lifting-body fuselage
  const fuselage = new THREE.Mesh(fuseGeo, primaryMat);
  fuselage.castShadow = true;
  fuselage.receiveShadow = true;
  root.add(fuselage);

  // 2. Nose Radome Cone (dark composite tip)
  const noseGeo = track(new THREE.ConeGeometry(0.34, halfLen * 0.34, 18));
  noseGeo.rotateX(-Math.PI / 2);
  const noseMesh = new THREE.Mesh(noseGeo, radomeMat);
  noseMesh.position.set(0, -0.04, -halfLen * 0.98);
  noseMesh.castShadow = true;
  root.add(noseMesh);

  // 3. Cockpit Canopy + Spine Fairing
  const canopyGeo = track(new THREE.CapsuleGeometry(0.42, 2.2, 8, 16));
  canopyGeo.rotateX(Math.PI / 2);
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
  canopyMesh.position.set(0, 0.58, -halfLen * 0.38);
  canopyMesh.scale.set(0.9, 0.85, 1.15);
  root.add(canopyMesh);

  const spineGeo = track(new THREE.BoxGeometry(0.56, 0.36, halfLen * 0.78));
  const spineMesh = new THREE.Mesh(spineGeo, secondaryMat);
  spineMesh.position.set(0, 0.6, halfLen * 0.16);
  root.add(spineMesh);

  // 4. Main Wings (ExtrudeGeometry shaped by wingPlanform & wingAreaM2)
  const avgChord = Math.max(1.4, Math.min(5.2, spec.wingAreaM2 / span));
  const rootChord = avgChord * 1.45;
  const tipChord = spec.wingPlanform === 'delta' ? avgChord * 0.25 : avgChord * 0.55;

  let sweepOffsetZ = 0;
  if (spec.wingPlanform === 'swept') sweepOffsetZ = halfSpan * 0.45;
  else if (spec.wingPlanform === 'delta') sweepOffsetZ = halfSpan * 0.75;
  else if (spec.wingPlanform === 'forward-swept') sweepOffsetZ = -halfSpan * 0.38;
  else sweepOffsetZ = halfSpan * 0.08;

  const buildHalfWing = (side: 1 | -1) => {
    const shape = new THREE.Shape();
    // Shape in X (spanwise) and Y (becomes -Z forward after rotateX(-PI/2))
    shape.moveTo(0.65 * side, rootChord * 0.55);
    shape.lineTo(halfSpan * side, rootChord * 0.55 - sweepOffsetZ);
    shape.lineTo(halfSpan * side, rootChord * 0.55 - sweepOffsetZ - tipChord);
    shape.lineTo(0.65 * side, -rootChord * 0.45);
    shape.closePath();

    const geo = track(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.12,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.05,
        bevelSegments: 2,
      })
    );
    geo.rotateX(-Math.PI / 2);
    const wing = new THREE.Mesh(geo, primaryMat);
    wing.position.set(0, 0.05, 0.6);
    wing.castShadow = true;
    wing.receiveShadow = true;
    return wing;
  };

  const rightWing = buildHalfWing(1);
  const leftWing = buildHalfWing(-1);
  root.add(rightWing, leftWing);

  // 5. Animated Flaps / Ailerons + Wingtip Nav Lights
  const flapGeo = track(new THREE.BoxGeometry(halfSpan * 0.42, 0.06, 0.42));
  const leftFlap = new THREE.Mesh(flapGeo, accentMat);
  leftFlap.position.set(-halfSpan * 0.48, 0.06, 1.3 + sweepOffsetZ * 0.35);
  const rightFlap = new THREE.Mesh(flapGeo, accentMat);
  rightFlap.position.set(halfSpan * 0.48, 0.06, 1.3 + sweepOffsetZ * 0.35);
  root.add(leftFlap, rightFlap);

  const navGeo = track(new THREE.SphereGeometry(0.11, 10, 10));
  const portLightMat = track(
    new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 1.8 })
  );
  const stbdLightMat = track(
    new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 1.8 })
  );
  const portTip = new THREE.Mesh(navGeo, portLightMat);
  portTip.position.set(-halfSpan, 0.08, 0.6 + sweepOffsetZ - rootChord * 0.25);
  const stbdTip = new THREE.Mesh(navGeo, stbdLightMat);
  stbdTip.position.set(halfSpan, 0.08, 0.6 + sweepOffsetZ - rootChord * 0.25);
  root.add(portTip, stbdTip);

  // 6. Wing Roundel Decals (CanvasTexture with SRGBColorSpace & polygonOffset)
  const roundelCanvas = drawRoundelToCanvas(spec.roundel, spec.livery.accent);
  const roundelTex = track(new THREE.CanvasTexture(roundelCanvas));
  roundelTex.colorSpace = THREE.SRGBColorSpace;
  roundelTex.anisotropy = maxAnisotropy;
  const decalMat = track(
    new THREE.MeshStandardMaterial({
      map: roundelTex,
      transparent: true,
      roughness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const decalSize = Math.min(1.65, halfSpan * 0.36);
  const decalGeo = track(new THREE.PlaneGeometry(decalSize, decalSize));
  decalGeo.rotateX(-Math.PI / 2);

  const leftDecal = new THREE.Mesh(decalGeo, decalMat);
  leftDecal.position.set(-halfSpan * 0.56, 0.22, 0.5 + sweepOffsetZ * 0.45);
  const rightDecal = new THREE.Mesh(decalGeo, decalMat);
  rightDecal.position.set(halfSpan * 0.56, 0.22, 0.5 + sweepOffsetZ * 0.45);
  root.add(leftDecal, rightDecal);

  // 7. Tail Stabilizers (Conventional, T-Tail, V-Tail, Twin-Tail)
  const tailZ = halfLen * 0.78;
  const makeFinGeo = (height: number, chord: number) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(chord * 0.85, height);
    s.lineTo(chord * 1.2, height);
    s.lineTo(chord, 0);
    s.closePath();
    const g = track(
      new THREE.ExtrudeGeometry(s, {
        depth: 0.08,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 1,
      })
    );
    g.rotateY(-Math.PI / 2);
    return g;
  };

  const makeStabGeo = (stabSpan: number) => {
    const g = track(new THREE.BoxGeometry(stabSpan, 0.08, 1.35));
    return g;
  };

  if (spec.tailConfig === 'twin-tail') {
    const finGeo = makeFinGeo(2.2, 2.0);
    const finL = new THREE.Mesh(finGeo, secondaryMat);
    finL.position.set(-0.72, 0.35, tailZ - 1.1);
    finL.rotation.z = 0.26;
    const finR = new THREE.Mesh(finGeo, secondaryMat);
    finR.position.set(0.72, 0.35, tailZ - 1.1);
    finR.rotation.z = -0.26;
    const hStab = new THREE.Mesh(makeStabGeo(span * 0.46), secondaryMat);
    hStab.position.set(0, 0.12, tailZ);
    root.add(finL, finR, hStab);
  } else if (spec.tailConfig === 'v-tail') {
    const finGeo = makeFinGeo(2.3, 1.8);
    const finL = new THREE.Mesh(finGeo, secondaryMat);
    finL.position.set(-0.32, 0.35, tailZ - 1.0);
    finL.rotation.z = 0.68;
    const finR = new THREE.Mesh(finGeo, secondaryMat);
    finR.position.set(0.32, 0.35, tailZ - 1.0);
    finR.rotation.z = -0.68;
    root.add(finL, finR);
  } else if (spec.tailConfig === 't-tail') {
    const finGeo = makeFinGeo(2.5, 2.1);
    const fin = new THREE.Mesh(finGeo, secondaryMat);
    fin.position.set(0.04, 0.35, tailZ - 1.2);
    const hStab = new THREE.Mesh(makeStabGeo(span * 0.42), accentMat);
    hStab.position.set(0, 2.82, tailZ + 0.45);
    root.add(fin, hStab);
  } else {
    // Conventional
    const finGeo = makeFinGeo(2.4, 2.1);
    const fin = new THREE.Mesh(finGeo, secondaryMat);
    fin.position.set(0.04, 0.35, tailZ - 1.2);
    const hStab = new THREE.Mesh(makeStabGeo(span * 0.46), secondaryMat);
    hStab.position.set(0, 0.12, tailZ);
    root.add(fin, hStab);
  }

  // Canards for Delta airframes (Eurofighter / Rafale / Gripen style)
  if (spec.wingPlanform === 'delta') {
    const canardGeo = track(new THREE.BoxGeometry(2.8, 0.06, 0.75));
    const canard = new THREE.Mesh(canardGeo, accentMat);
    canard.position.set(0, 0.18, -halfLen * 0.38);
    root.add(canard);
  }

  // 8. Propulsion: Jet Nacelles + Exhaust + Afterburners OR Turboprop Spinner & Blades
  const afterburners: THREE.Mesh[] = [];
  let propellerGroup: THREE.Group | null = null;

  if (spec.engineType === 'turboprop') {
    propellerGroup = new THREE.Group();
    propellerGroup.position.set(0, -0.02, -halfLen * 1.12);
    const spinnerGeo = track(new THREE.ConeGeometry(0.28, 0.65, 16));
    spinnerGeo.rotateX(-Math.PI / 2);
    const spinner = new THREE.Mesh(spinnerGeo, metalMat);
    propellerGroup.add(spinner);

    const bladeGeo = track(new THREE.BoxGeometry(0.14, 2.5, 0.04));
    const blade1 = new THREE.Mesh(bladeGeo, radomeMat);
    const blade2 = new THREE.Mesh(bladeGeo, radomeMat);
    blade2.rotation.z = Math.PI / 2;
    propellerGroup.add(blade1, blade2);
    root.add(propellerGroup);
  } else {
    const nozzleGeo = track(new THREE.CylinderGeometry(0.36, 0.46, 1.15, 16));
    nozzleGeo.rotateX(Math.PI / 2);
    const abGeo = track(new THREE.ConeGeometry(0.32, 2.8, 14));
    abGeo.rotateX(Math.PI / 2);
    const abMat = track(
      new THREE.MeshBasicMaterial({
        color: '#f97316',
        transparent: true,
        opacity: 0.85,
      })
    );

    const offsets = spec.engineCount === 2 ? [-0.52, 0.52] : [0];
    for (const ox of offsets) {
      const nozzle = new THREE.Mesh(nozzleGeo, metalMat);
      nozzle.position.set(ox, -0.02, halfLen * 0.94);
      root.add(nozzle);

      const ab = new THREE.Mesh(abGeo, abMat);
      ab.position.set(ox, -0.02, halfLen * 1.04 + 1.1);
      ab.visible = false;
      root.add(ab);
      afterburners.push(ab);
    }
  }

  // 9. Retractable Tricycle Landing Gear
  const gearGroup = new THREE.Group();
  const strutGeo = track(new THREE.CylinderGeometry(0.06, 0.06, 0.95, 8));
  const wheelGeo = track(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 14));
  wheelGeo.rotateZ(Math.PI / 2);

  const gearPositions: [number, number, number][] = [
    [0, -0.78, -halfLen * 0.55],
    [-1.45, -0.78, 0.95],
    [1.45, -0.78, 0.95],
  ];
  for (const [gx, gy, gz] of gearPositions) {
    const strut = new THREE.Mesh(strutGeo, metalMat);
    strut.position.set(gx, gy + 0.28, gz);
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(gx, gy - 0.18, gz);
    gearGroup.add(strut, wheel);
  }
  root.add(gearGroup);

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
  };

  return {
    root,
    gearGroup,
    propellerGroup,
    afterburners,
    leftFlap,
    rightFlap,
    dispose,
  };
}
