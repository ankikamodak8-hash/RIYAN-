import { useCallback, useEffect, useRef, useState } from 'react';
import { AeroGuideModal } from './components/AeroGuideModal';
import { AircraftDesignerModal } from './components/AircraftDesignerModal';
import { AirportNavModal } from './components/AirportNavModal';
import { FlightHUD } from './components/FlightHUD';
import { FlightSummaryModal } from './components/FlightSummaryModal';
import { HangarOverlay } from './components/HangarOverlay';
import { AIRFORCE_AIRCRAFT } from './sim/airforces';
import { GLOBAL_AIRPORTS, createFlightPlan } from './sim/airports';
import {
  computeAeroTelemetry,
  createAirbornePhysicsState,
  createInitialPhysicsState,
} from './sim/aerodynamics';
import { flightAudio } from './sim/soundEngine';
import type {
  AeroTelemetry,
  AircraftSpec,
  Airport,
  CameraMode,
  FlightControls,
  FlightPlan,
  FlightStartMode,
  GameState,
  PhysicsState,
  UnitPreferences,
} from './sim/types';
import { DEFAULT_UNIT_PREFS } from './sim/units';
import { FlightCanvas } from './three/FlightCanvas';

const CAMERA_ORDER: CameraMode[] = ['chase', 'cockpit', 'flyby', 'orbit'];

export default function App() {
  const [fleet, setFleet] = useState<AircraftSpec[]>(AIRFORCE_AIRCRAFT);
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftSpec>(AIRFORCE_AIRCRAFT[0]);
  const [flightPlan, setFlightPlan] = useState<FlightPlan>(() =>
    createFlightPlan(GLOBAL_AIRPORTS[0], GLOBAL_AIRPORTS[3])
  );

  const [startMode, setStartMode] = useState<FlightStartMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('start') === 'runway') return 'runway';
    }
    return 'airborne';
  });

  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'playing';
    }
    return 'title';
  });

  const [units, setUnits] = useState<UnitPreferences>(DEFAULT_UNIT_PREFS);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [timeScale, setTimeScale] = useState<number>(1);
  const [muted, setMuted] = useState<boolean>(false);
  const [guideCollapsed, setGuideCollapsed] = useState<boolean>(false);
  const [autoLevel, setAutoLevel] = useState<boolean>(true);
  const [mouseSteer, setMouseSteer] = useState<boolean>(false);
  const [invertPitch, setInvertPitch] = useState<boolean>(false);
  const [resetCounter, setResetCounter] = useState<number>(0);

  // Modals
  const [showDesigner, setShowDesigner] = useState(false);
  const [showAirportNav, setShowAirportNav] = useState(false);
  const [showAeroGuide, setShowAeroGuide] = useState(false);

  const controlsRef = useRef<FlightControls>({
    throttle: startMode === 'airborne' ? 0.78 : 0,
    pitchInput: 0,
    rollInput: 0,
    yawInput: 0,
    gearDown: startMode === 'runway',
    flapsLevel: 0,
    airbrake: false,
  });

  const [controlsSnapshot, setControlsSnapshot] = useState<FlightControls>(controlsRef.current);
  const [physicsState, setPhysicsState] = useState<PhysicsState>(() =>
    startMode === 'airborne'
      ? createAirbornePhysicsState(flightPlan.departure, selectedAircraft, flightPlan)
      : createInitialPhysicsState(flightPlan.departure, selectedAircraft)
  );
  const onGroundRef = useRef<boolean>(startMode === 'runway');
  onGroundRef.current = physicsState.onGround;
  const invertPitchRef = useRef<boolean>(invertPitch);
  invertPitchRef.current = invertPitch;
  const mouseSteerRef = useRef<boolean>(mouseSteer);
  mouseSteerRef.current = mouseSteer;

  const [telemetry, setTelemetry] = useState<AeroTelemetry>(() =>
    computeAeroTelemetry(
      startMode === 'airborne'
        ? createAirbornePhysicsState(flightPlan.departure, selectedAircraft, flightPlan)
        : createInitialPhysicsState(flightPlan.departure, selectedAircraft),
      selectedAircraft,
      flightPlan,
      controlsRef.current
    )
  );

  // Keep body data-state synchronized
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const syncControls = useCallback(() => {
    setControlsSnapshot({ ...controlsRef.current });
  }, []);

  const resetControlsAndFlight = useCallback(
    (overrideMode?: FlightStartMode) => {
      const mode = overrideMode ?? startMode;
      controlsRef.current = {
        throttle: mode === 'airborne' ? 0.78 : 0,
        pitchInput: 0,
        rollInput: 0,
        yawInput: 0,
        gearDown: mode === 'runway',
        flapsLevel: 0,
        airbrake: false,
      };
      syncControls();
      setTimeScale(1);
      setResetCounter((c) => c + 1);
    },
    [startMode, syncControls]
  );

  const launchFlight = useCallback(
    (overrideMode?: FlightStartMode) => {
      flightAudio.init();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      if (overrideMode) setStartMode(overrideMode);
      resetControlsAndFlight(overrideMode);
      setGameState('playing');
    },
    [resetControlsAndFlight]
  );

  const handleSelectRoute = useCallback(
    (departure: Airport, destination: Airport) => {
      const nextPlan = createFlightPlan(departure, destination);
      setFlightPlan(nextPlan);
      resetControlsAndFlight();
    },
    [resetControlsAndFlight]
  );

  const handleSaveCustomAircraft = useCallback(
    (spec: AircraftSpec) => {
      setFleet((prev) => {
        const filtered = prev.filter((p) => p.id !== spec.id);
        return [spec, ...filtered];
      });
      setSelectedAircraft(spec);
      resetControlsAndFlight();
    },
    [resetControlsAndFlight]
  );

  // Keyboard flight controls & shortcuts + smooth held throttle + optional mouse steering
  useEffect(() => {
    const held = new Set<string>();

    const updateStickFromHeld = () => {
      let pitch = 0;
      let roll = 0;
      let yaw = 0;
      const pitchSign = invertPitchRef.current ? -1 : 1;
      if (held.has('KeyS') || held.has('ArrowDown')) pitch += 1 * pitchSign;
      if (held.has('KeyW') || held.has('ArrowUp')) pitch -= 1 * pitchSign;
      if (held.has('KeyD') || held.has('ArrowRight')) roll += 1;
      if (held.has('KeyA') || held.has('ArrowLeft')) roll -= 1;
      if (held.has('KeyE')) yaw += 1;
      if (held.has('KeyQ')) yaw -= 1;

      controlsRef.current.pitchInput = pitch;
      controlsRef.current.rollInput = roll;
      controlsRef.current.yawInput = yaw;
      syncControls();
    };

    const throttleInterval = window.setInterval(() => {
      if (gameState !== 'playing') return;
      const up = held.has('ShiftLeft') || held.has('ShiftRight') || held.has('Equal');
      const down = held.has('ControlLeft') || held.has('ControlRight') || held.has('Minus');
      if (up && !down) {
        controlsRef.current.throttle = Math.min(1, controlsRef.current.throttle + 0.025);
        syncControls();
      } else if (down && !up) {
        controlsRef.current.throttle = Math.max(0, controlsRef.current.throttle - 0.025);
        syncControls();
      }
    }, 45);

    const onMouseMove = (e: MouseEvent) => {
      if (gameState !== 'playing' || !mouseSteerRef.current) return;
      if (showDesigner || showAirportNav || showAeroGuide) return;
      const hw = window.innerWidth / 2;
      const hh = window.innerHeight / 2;
      if (hw <= 0 || hh <= 0) return;
      const rawX = (e.clientX - hw) / (hw * 0.65);
      const rawY = (e.clientY - hh) / (hh * 0.65);
      const deadzone = (v: number) => {
        const clamped = Math.max(-1, Math.min(1, v));
        return Math.abs(clamped) < 0.08 ? 0 : clamped;
      };
      const roll = deadzone(rawX);
      const ny = deadzone(rawY);
      const pitch = invertPitchRef.current ? -ny : ny;
      controlsRef.current.rollInput = roll;
      controlsRef.current.pitchInput = pitch;
      syncControls();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (gameState === 'title' && !showDesigner && !showAirportNav && !showAeroGuide) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          launchFlight();
          return;
        }
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (showDesigner || showAirportNav || showAeroGuide) {
          setShowDesigner(false);
          setShowAirportNav(false);
          setShowAeroGuide(false);
          return;
        }
        if (gameState === 'playing') {
          setGameState('paused');
          return;
        }
        if (gameState === 'paused') {
          setGameState('playing');
          return;
        }
      }

      if (gameState !== 'playing') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      held.add(e.code);
      updateStickFromHeld();

      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'Equal') && !e.repeat) {
        controlsRef.current.throttle = Math.min(1, controlsRef.current.throttle + 0.05);
        syncControls();
      } else if ((e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'Minus') && !e.repeat) {
        controlsRef.current.throttle = Math.max(0, controlsRef.current.throttle - 0.05);
        syncControls();
      } else if (e.code === 'KeyG' && !e.repeat) {
        if (!onGroundRef.current || !controlsRef.current.gearDown) {
          controlsRef.current.gearDown = !controlsRef.current.gearDown;
          syncControls();
        }
      } else if (e.code === 'KeyF' && !e.repeat) {
        controlsRef.current.flapsLevel = ((controlsRef.current.flapsLevel + 1) % 3) as 0 | 1 | 2;
        syncControls();
      } else if (e.code === 'KeyB' && !e.repeat) {
        controlsRef.current.airbrake = !controlsRef.current.airbrake;
        syncControls();
      } else if (e.code === 'KeyC' && !e.repeat) {
        setCameraMode((prev) => CAMERA_ORDER[(CAMERA_ORDER.indexOf(prev) + 1) % CAMERA_ORDER.length]);
      } else if (e.code === 'KeyL' && !e.repeat) {
        setAutoLevel((v) => !v);
      } else if (e.code === 'KeyV' && !e.repeat) {
        setMouseSteer((v) => {
          if (v) {
            controlsRef.current.pitchInput = 0;
            controlsRef.current.rollInput = 0;
            syncControls();
          }
          return !v;
        });
      } else if (e.code === 'KeyI' && !e.repeat) {
        setInvertPitch((v) => !v);
      } else if (e.code === 'KeyM' && !e.repeat) {
        setMuted((m) => {
          flightAudio.setMuted(!m);
          return !m;
        });
      } else if (e.code === 'KeyH' && !e.repeat) {
        setGuideCollapsed((c) => !c);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      held.delete(e.code);
      updateStickFromHeld();
    };

    const clearAll = () => {
      held.clear();
      updateStickFromHeld();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('blur', clearAll);
    document.addEventListener('visibilitychange', clearAll);
    return () => {
      clearInterval(throttleInterval);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('blur', clearAll);
      document.removeEventListener('visibilitychange', clearAll);
    };
  }, [gameState, launchFlight, showAeroGuide, showAirportNav, showDesigner, syncControls]);

  const handleTelemetryUpdate = useCallback((state: PhysicsState, tel: AeroTelemetry) => {
    setPhysicsState(state);
    setTelemetry(tel);
  }, []);

  const handleFlightEnd = useCallback((state: PhysicsState, tel: AeroTelemetry) => {
    setPhysicsState(state);
    setTelemetry(tel);
    setGameState('gameover');
  }, []);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#090d14]">
      <FlightCanvas
        gameState={gameState}
        aircraft={selectedAircraft}
        flightPlan={flightPlan}
        controlsRef={controlsRef}
        cameraMode={cameraMode}
        timeScale={timeScale}
        startMode={startMode}
        autoLevel={autoLevel}
        resetCounter={resetCounter}
        onTelemetryUpdate={handleTelemetryUpdate}
        onFlightEnd={handleFlightEnd}
      />

      {gameState === 'title' && (
        <HangarOverlay
          fleet={fleet}
          selectedAircraft={selectedAircraft}
          flightPlan={flightPlan}
          startMode={startMode}
          onChangeStartMode={(mode) => {
            setStartMode(mode);
            resetControlsAndFlight(mode);
          }}
          onSelectAircraft={(spec) => {
            setSelectedAircraft(spec);
            resetControlsAndFlight();
          }}
          onOpenDesigner={() => setShowDesigner(true)}
          onOpenAirportNav={() => setShowAirportNav(true)}
          onOpenAeroGuide={() => setShowAeroGuide(true)}
          onLaunchFlight={() => launchFlight()}
        />
      )}

      {(gameState === 'playing' || gameState === 'paused') && (
        <FlightHUD
          aircraft={selectedAircraft}
          flightPlan={flightPlan}
          physicsState={physicsState}
          telemetry={telemetry}
          controls={controlsSnapshot}
          units={units}
          cameraMode={cameraMode}
          timeScale={timeScale}
          muted={muted}
          guideCollapsed={guideCollapsed}
          autoLevel={autoLevel}
          mouseSteer={mouseSteer}
          invertPitch={invertPitch}
          onThrottleChange={(val) => {
            flightAudio.init();
            controlsRef.current.throttle = val;
            syncControls();
          }}
          onStickInput={(patch) => {
            flightAudio.init();
            if (patch.pitchInput !== undefined) controlsRef.current.pitchInput = patch.pitchInput;
            if (patch.rollInput !== undefined) controlsRef.current.rollInput = patch.rollInput;
            if (patch.yawInput !== undefined) controlsRef.current.yawInput = patch.yawInput;
            syncControls();
          }}
          onToggleAutoLevel={() => setAutoLevel((v) => !v)}
          onToggleMouseSteer={() =>
            setMouseSteer((v) => {
              if (v) {
                controlsRef.current.pitchInput = 0;
                controlsRef.current.rollInput = 0;
                syncControls();
              }
              return !v;
            })
          }
          onToggleInvertPitch={() => setInvertPitch((v) => !v)}
          onRelaunchMode={(mode) => launchFlight(mode)}
          onToggleGear={() => {
            if (!onGroundRef.current || !controlsRef.current.gearDown) {
              controlsRef.current.gearDown = !controlsRef.current.gearDown;
              syncControls();
            }
          }}
          onCycleFlaps={() => {
            controlsRef.current.flapsLevel = ((controlsRef.current.flapsLevel + 1) % 3) as 0 | 1 | 2;
            syncControls();
          }}
          onToggleBrake={() => {
            controlsRef.current.airbrake = !controlsRef.current.airbrake;
            syncControls();
          }}
          onCycleCamera={() =>
            setCameraMode((prev) => CAMERA_ORDER[(CAMERA_ORDER.indexOf(prev) + 1) % CAMERA_ORDER.length])
          }
          onChangeTimeScale={setTimeScale}
          onChangeUnits={(patch) => setUnits((u) => ({ ...u, ...patch }))}
          onToggleMute={() => {
            flightAudio.init();
            setMuted((m) => {
              flightAudio.setMuted(!m);
              return !m;
            });
          }}
          onToggleGuide={() => setGuideCollapsed((c) => !c)}
          onPause={() => setGameState('paused')}
          onOpenNav={() => setShowAirportNav(true)}
          onOpenDesigner={() => setShowDesigner(true)}
          onOpenAeroGuide={() => setShowAeroGuide(true)}
        />
      )}

      <FlightSummaryModal
        gameState={gameState}
        aircraft={selectedAircraft}
        flightPlan={flightPlan}
        physicsState={physicsState}
        telemetry={telemetry}
        onResume={() => setGameState('playing')}
        onRestart={() => launchFlight()}
        onReturnHangar={() => {
          resetControlsAndFlight();
          setGameState('title');
        }}
      />

      {showDesigner && (
        <AircraftDesignerModal
          initialBase={selectedAircraft}
          onSaveAircraft={handleSaveCustomAircraft}
          onClose={() => setShowDesigner(false)}
        />
      )}

      {showAirportNav && (
        <AirportNavModal
          flightPlan={flightPlan}
          pressureUnit={units.pressure}
          onSelectRoute={handleSelectRoute}
          onClose={() => setShowAirportNav(false)}
        />
      )}

      {showAeroGuide && (
        <AeroGuideModal
          aircraft={selectedAircraft}
          telemetry={gameState === 'title' ? null : telemetry}
          units={units}
          onClose={() => setShowAeroGuide(false)}
        />
      )}
    </main>
  );
}
