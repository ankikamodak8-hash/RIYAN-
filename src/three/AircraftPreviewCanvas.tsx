import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { AircraftSpec } from '../sim/types';
import { buildAircraftModel, type AircraftRig } from './aircraftBuilder';
import { createConfiguredRenderer, detectSoftwareWebGL, scheduleAfterDraw } from './webglUtils';

interface AircraftPreviewCanvasProps {
  spec: AircraftSpec;
}

export function AircraftPreviewCanvas({ spec }: AircraftPreviewCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const specRef = useRef<AircraftSpec>(spec);
  specRef.current = spec;

  const rebuildRef = useRef<((nextSpec: AircraftSpec) => void) | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = createConfiguredRenderer(container, isSoftwareGl);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    scene.fog = new THREE.FogExp2('#0f172a', 0.014);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 360;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 200);
    camera.position.set(16, 7.5, 16);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.autoRotate = false;
    controls.minDistance = 8;
    controls.maxDistance = 36;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 0.8, 0);

    // Three-point studio lighting
    const hemi = new THREE.HemisphereLight('#93c5fd', '#1e293b', 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#fff4e0', 2.2);
    keyLight.position.set(14, 22, 12);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 0.9);
    rimLight.position.set(-14, 6, -14);
    scene.add(rimLight);

    // Hangar turntable floor + grid ring
    const floorGeo = new THREE.CircleGeometry(28, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#172030',
      roughness: 0.72,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    scene.add(floor);

    const ringGeo = new THREE.RingGeometry(8.8, 9.1, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.38 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.02;
    scene.add(ring);

    const shadowGeo = new THREE.CircleGeometry(6.5, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#020617',
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.position.y = 0.015;
    scene.add(contactShadow);

    let currentRig: AircraftRig | null = null;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        controls.update();
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };
        if (isSoftwareGl) {
          scheduleAfterDraw(renderer, done, (id) => {
            frameId = id;
          });
        } else {
          done();
        }
      });
    };

    const loadModel = (nextSpec: AircraftSpec) => {
      if (currentRig) {
        scene.remove(currentRig.root);
        currentRig.dispose();
      }
      currentRig = buildAircraftModel(nextSpec, maxAniso);
      currentRig.root.position.set(0, 1.25, 0);
      scene.add(currentRig.root);
      requestRender();
    };

    rebuildRef.current = loadModel;
    loadModel(specRef.current);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onChange = () => requestRender();
    controls.addEventListener('change', onChange);

    const resizeObserver = new ResizeObserver(() => {
      if (disposed) return;
      const w = container.clientWidth || 520;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', onChange);
      controls.dispose();
      if (currentRig) currentRig.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    rebuildRef.current?.(spec);
  }, [spec]);

  return (
    <div
      ref={mountRef}
      data-testid="designer-preview-canvas"
      className="w-full h-full min-h-[260px] rounded-lg overflow-hidden bg-[#0f172a]"
      aria-label="Interactive 3D aircraft design preview"
    />
  );
}
