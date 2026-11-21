import { useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  ChevronDown,
  ChevronUp,
  Compass,
  Crosshair,
  Pause,
  PlaneTakeoff,
  RotateCcw,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { formatBearing } from '../sim/airports';
import { evaluateFlightGuidance } from '../sim/guidance';
import type {
  AeroTelemetry,
  AircraftSpec,
  AltitudeUnit,
  CameraMode,
  FlightControls,
  FlightPlan,
  FlightStartMode,
  FuelFlowUnit,
  PhysicsState,
  PressureUnit,
  SpeedUnit,
  ThrustUnit,
  UnitPreferences,
} from '../sim/types';
import {
  formatAltitude,
  formatFuelFlow,
  formatPressure,
  formatSpeed,
  formatThrust,
} from '../sim/units';
import { RoundelBadge } from './RoundelBadge';

interface FlightHUDProps {
  aircraft: AircraftSpec;
  flightPlan: FlightPlan;
  physicsState: PhysicsState;
  telemetry: AeroTelemetry;
  controls: FlightControls;
  units: UnitPreferences;
  cameraMode: CameraMode;
  timeScale: number;
  muted: boolean;
  guideCollapsed: boolean;
  autoLevel: boolean;
  mouseSteer: boolean;
  invertPitch: boolean;
  onThrottleChange: (value: number) => void;
  onStickInput: (patch: Partial<Pick<FlightControls, 'pitchInput' | 'rollInput' | 'yawInput'>>) => void;
  onToggleAutoLevel: () => void;
  onToggleMouseSteer: () => void;
  onToggleInvertPitch: () => void;
  onRelaunchMode: (mode: FlightStartMode) => void;
  onToggleGear: () => void;
  onCycleFlaps: () => void;
  onToggleBrake: () => void;
  onCycleCamera: () => void;
  onChangeTimeScale: (scale: number) => void;
  onChangeUnits: (patch: Partial<UnitPreferences>) => void;
  onToggleMute: () => void;
  onToggleGuide: () => void;
  onPause: () => void;
  onOpenNav: () => void;
  onOpenDesigner: () => void;
  onOpenAeroGuide: () => void;
}

export function FlightHUD({
  aircraft,
  flightPlan,
  physicsState,
  telemetry,
  controls,
  units,
  cameraMode,
  timeScale,
  muted,
  guideCollapsed,
  autoLevel,
  mouseSteer,
  invertPitch,
  onThrottleChange,
  onStickInput,
  onToggleAutoLevel,
  onToggleMouseSteer,
  onToggleInvertPitch,
  onRelaunchMode,
  onToggleGear,
  onCycleFlaps,
  onToggleBrake,
  onCycleCamera,
  onChangeTimeScale,
  onChangeUnits,
  onToggleMute,
  onToggleGuide,
  onPause,
  onOpenNav,
  onOpenDesigner,
  onOpenAeroGuide,
}: FlightHUDProps) {
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const yokeRef = useRef<HTMLDivElement | null>(null);
  const yokeDraggingRef = useRef(false);

  const updateYokeFromPointer = (clientX: number, clientY: number) => {
    const el = yokeRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width - 0.5) * 2));
    const ny = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height - 0.5) * 2));
    const pitch = invertPitch ? -ny : ny;
    onStickInput({ rollInput: nx, pitchInput: pitch });
  };

  const guidance = evaluateFlightGuidance(
    physicsState,
    telemetry,
    controls,
    aircraft,
    flightPlan
  );

  const fuelPct = Math.max(0, Math.min(100, (physicsState.fuelKg / aircraft.maxFuelKg) * 100));
  const headingDiff = ((telemetry.bearingToDestDeg - telemetry.headingDeg + 540) % 360) - 180;
  const navBugOffsetPx = Math.max(-90, Math.min(90, headingDiff * 2));

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 lg:p-4">
      {/* Center Collimated Avionics SVG Reticle (non-blocking) */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <svg
          width="340"
          height="260"
          viewBox="-170 -130 340 260"
          className="opacity-85 overflow-visible"
          aria-hidden="true"
        >
          {/* Heading Tape at Top of HUD */}
          <g transform="translate(0, -104)">
            <rect x="-42" y="-23" width="84" height="19" rx="3" fill="rgba(9,13,20,0.78)" stroke="#34d399" strokeWidth="0.8" />
            <line x1="-80" y1="0" x2="80" y2="0" stroke="#34d399" strokeWidth="1.4" opacity="0.85" />
            <polygon points="0,4 -4,11 4,11" fill="#34d399" />
            {/* Destination Bearing Bug */}
            <polygon
              points={`${navBugOffsetPx},-2 ${navBugOffsetPx - 5},-9 ${navBugOffsetPx + 5},-9`}
              fill="#fbbf24"
            />
            <text
              x="0"
              y="-10"
              textAnchor="middle"
              fill="#ecfdf5"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
            >
              HDG {formatBearing(telemetry.headingDeg)}°
            </text>
          </g>

          {/* Rotating Artificial Horizon Pitch Ladder */}
          <g transform={`rotate(${-telemetry.rollDeg}) translate(0, ${Math.max(-55, Math.min(55, telemetry.pitchDeg * 2.2))})`}>
            <line x1="-64" y1="0" x2="-18" y2="0" stroke="#34d399" strokeWidth="1.5" />
            <line x1="18" y1="0" x2="64" y2="0" stroke="#34d399" strokeWidth="1.5" />
            <line x1="-36" y1="-22" x2="-14" y2="-22" stroke="#34d399" strokeWidth="1" opacity="0.75" />
            <line x1="14" y1="-22" x2="36" y2="-22" stroke="#34d399" strokeWidth="1" opacity="0.75" />
            <line
              x1="-36"
              y1="22"
              x2="-14"
              y2="22"
              stroke="#34d399"
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.75"
            />
            <line
              x1="14"
              y1="22"
              x2="36"
              y2="22"
              stroke="#34d399"
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.75"
            />
          </g>

          {/* Fixed Aircraft Waterline Symbol */}
          <path
            d="M -14 0 L -5 0 L 0 5 L 5 0 L 14 0"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.8"
          />

          {/* Left Airspeed Bracket */}
          <g transform="translate(-112, 0)">
            <rect
              x="-54"
              y="-14"
              width="62"
              height="28"
              rx="3"
              fill="rgba(9,13,20,0.78)"
              stroke="#34d399"
              strokeWidth="1"
            />
            <text
              x="-23"
              y="4"
              textAnchor="middle"
              fill="#ecfdf5"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
            >
              {formatSpeed(telemetry.tasMS, telemetry.iasKt, telemetry.mach, units.speed)}
            </text>
            <rect x="-46" y="16" width="46" height="15" rx="2" fill="rgba(9,13,20,0.72)" />
            <text
              x="-23"
              y="27"
              textAnchor="middle"
              fill="#6ee7b7"
              fontSize="9.5"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              M {telemetry.mach.toFixed(2)}
            </text>
          </g>

          {/* Right Altitude & VSI Bracket */}
          <g transform="translate(112, 0)">
            <rect
              x="-8"
              y="-14"
              width="68"
              height="28"
              rx="3"
              fill="rgba(9,13,20,0.78)"
              stroke="#34d399"
              strokeWidth="1"
            />
            <text
              x="26"
              y="4"
              textAnchor="middle"
              fill="#ecfdf5"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
            >
              {formatAltitude(telemetry.atmosphere.altitudeM, units.altitude)}
            </text>
            <rect x="0" y="16" width="52" height="15" rx="2" fill="rgba(9,13,20,0.72)" />
            <text
              x="26"
              y="27"
              textAnchor="middle"
              fill="#6ee7b7"
              fontSize="9.5"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              {telemetry.verticalSpeedMS >= 0 ? '+' : ''}
              {telemetry.verticalSpeedMS.toFixed(1)} m/s
            </text>
          </g>

          {/* Stall or Overspeed HUD Alert */}
          {(telemetry.stallWarning || telemetry.overspeedWarning) && (
            <text
              x="0"
              y="62"
              textAnchor="middle"
              fill="#f87171"
              stroke="rgba(9,13,20,0.92)"
              strokeWidth="4"
              style={{ paintOrder: 'stroke' }}
              fontSize="12"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
            >
              {telemetry.stallWarning ? 'STALL · LOWER NOSE' : 'OVERSPEED · REDUCE THRUST'}
            </text>
          )}
        </svg>
      </div>

      {/* TOP ROW: Nav Info + Utility Actions */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left Flight & Route Summary */}
        <div className="pointer-events-auto bg-[#090d14]/88 border border-slate-700/65 rounded-lg px-3.5 py-2.5 flex items-center gap-3.5">
          <RoundelBadge style={aircraft.roundel} size={28} />
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span>{aircraft.name}</span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-300 font-normal">{aircraft.country}</span>
            </div>
            <div className="font-mono-num text-[11px] text-slate-300">
              {flightPlan.departure.icao} → {flightPlan.destination.icao} · BRG{' '}
              {formatBearing(telemetry.bearingToDestDeg)}° ·{' '}
              {telemetry.distanceToDestNm.toFixed(1)} NM
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 border-l border-slate-800 pl-3">
            <span className="text-[10px] text-slate-400 mr-1">Warp</span>
            {[1, 4, 16].map((w) => (
              <button
                key={w}
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onChangeTimeScale(w);
                }}
                className={`px-2 py-1 text-[11px] font-mono-num rounded cursor-pointer ${
                  timeScale === w
                    ? 'bg-sky-400 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {w}×
              </button>
            ))}
          </div>
        </div>

        {/* Top-Right Compact Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#090d14]/88 border border-slate-700/65 rounded-lg p-1.5">
          <button
            type="button"
            data-testid="hud-respawn-airborne"
            onClick={(e) => {
              e.currentTarget.blur();
              onRelaunchMode('airborne');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-slate-800 rounded cursor-pointer whitespace-nowrap shrink-0"
          >
            <PlaneTakeoff className="w-3.5 h-3.5" />
            Airborne
          </button>
          <button
            type="button"
            data-testid="hud-respawn-runway"
            onClick={(e) => {
              e.currentTarget.blur();
              onRelaunchMode('runway');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Runway
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenNav();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-sky-300 hover:bg-slate-800 rounded cursor-pointer whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            Airports
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenDesigner();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-slate-800 rounded cursor-pointer whitespace-nowrap shrink-0"
          >
            <Wrench className="w-3.5 h-3.5" />
            Designer
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenAeroGuide();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            Aero Units
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Unmute audio [M]' : 'Mute audio [M]'}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause simulation [P]"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOTTOM ROW: Left Propulsion/Fuel, Center Flight Guide, Right Pressure/Aero */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-end justify-between gap-3">
        {/* Bottom-Left: Thrust, Throttle & Fuel Flow Unit Manager */}
        <div className="pointer-events-auto w-full xl:w-[325px] bg-[#090d14]/90 border border-slate-700/65 rounded-xl p-3 flex flex-col gap-2.5">
          {/* Throttle Slider + Presets */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">
                Throttle {telemetry.afterburnerActive ? '· AFTERBURNER' : ''}
              </span>
              <span className="font-mono-num font-bold text-amber-300">
                {Math.round(controls.throttle * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(controls.throttle * 100)}
              aria-label="Engine Throttle Percentage"
              onChange={(e) => onThrottleChange(Number(e.target.value) / 100)}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="grid grid-cols-4 gap-1 mt-1">
              {[
                [0, 'Idle'],
                [0.5, '50%'],
                [0.82, 'MIL'],
                [1.0, 'MAX AB'],
              ].map(([val, lbl]) => (
                <button
                  key={String(lbl)}
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onThrottleChange(Number(val));
                  }}
                  className="py-0.5 text-[10px] font-mono-num bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Thrust & Fuel Flow with Unit Switchers */}
          <div className="grid grid-cols-2 gap-2.5 border-t border-slate-800 pt-2">
            <div>
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[10px] text-slate-400">Thrust</span>
                <select
                  aria-label="Thrust unit"
                  value={units.thrust}
                  onChange={(e) => onChangeUnits({ thrust: e.target.value as ThrustUnit })}
                  className="text-[10px] bg-slate-800 text-amber-300 rounded px-1 py-0.5 border border-slate-700 cursor-pointer"
                >
                  <option value="kN">kN</option>
                  <option value="lbf">lbf</option>
                  <option value="kgf">kgf</option>
                </select>
              </div>
              <div className="font-mono-num text-sm font-bold text-white">
                {formatThrust(telemetry.thrustN, units.thrust)}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[10px] text-slate-400">Fuel Flow</span>
                <select
                  aria-label="Fuel flow unit"
                  value={units.fuelFlow}
                  onChange={(e) => onChangeUnits({ fuelFlow: e.target.value as FuelFlowUnit })}
                  className="text-[10px] bg-slate-800 text-emerald-300 rounded px-1 py-0.5 border border-slate-700 cursor-pointer"
                >
                  <option value="kg/s">kg/s</option>
                  <option value="lb/hr">lb/hr</option>
                  <option value="L/min">L/min</option>
                  <option value="gal/hr">gal/hr</option>
                </select>
              </div>
              <div className="font-mono-num text-sm font-bold text-white">
                {formatFuelFlow(telemetry.fuelFlowKgS, units.fuelFlow)}
              </div>
            </div>
          </div>

          {/* Fuel Tank Bar + Tactile Flight Surface Switches */}
          <div>
            <div className="flex justify-between text-[11px] font-mono-num text-slate-300 mb-1">
              <span>Fuel: {Math.round(physicsState.fuelKg).toLocaleString()} kg</span>
              <span>{Math.round(fuelPct)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  fuelPct < 15 ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${fuelPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleGear();
              }}
              className={`py-1.5 text-[11px] font-mono-num rounded border cursor-pointer ${
                controls.gearDown
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              Gear [G]
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleFlaps();
              }}
              className={`py-1.5 text-[11px] font-mono-num rounded border cursor-pointer ${
                controls.flapsLevel > 0
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              Flap {controls.flapsLevel}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleBrake();
              }}
              className={`py-1.5 text-[11px] font-mono-num rounded border cursor-pointer ${
                controls.airbrake
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              Brk [B]
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleCamera();
              }}
              className="py-1.5 text-[11px] font-mono-num rounded border bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center gap-1 cursor-pointer"
            >
              <Camera className="w-3 h-3" />
              {cameraMode}
            </button>
          </div>
        </div>

        {/* Bottom-Center: Collapsible Flight Instructor Guidance Dock */}
        <div className="pointer-events-auto flex-1 max-w-[460px] mx-auto w-full bg-[#090d14]/92 border border-slate-700/70 rounded-xl overflow-hidden">
          <div className="px-3.5 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`text-[11px] font-semibold whitespace-nowrap ${
                  guidance.severity === 'warning'
                    ? 'text-rose-400'
                    : guidance.severity === 'action'
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                }`}
              >
                {guidance.phaseLabel}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-medium text-slate-100 truncate">
                {guidance.headline}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setChecklistExpanded((v) => !v)}
                className="px-2 py-0.5 text-[10px] text-slate-300 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer"
              >
                {checklistExpanded ? 'Hide Steps' : 'Steps'}
              </button>
              <button
                type="button"
                onClick={onToggleGuide}
                aria-label={guideCollapsed ? 'Expand Flight Guide [H]' : 'Collapse Flight Guide [H]'}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                {guideCollapsed ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {!guideCollapsed && (
            <div className="px-3.5 py-2.5 flex flex-col gap-2">
              <p className="text-xs text-slate-300 leading-relaxed">{guidance.instruction}</p>
              {checklistExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 border-t border-slate-800">
                  {guidance.checklist.map((step) => (
                    <div
                      key={step.label}
                      className={`text-[11px] font-mono-num ${
                        step.done ? 'text-emerald-400 line-through' : 'text-slate-300'
                      }`}
                    >
                      {step.done ? '[✓]' : '[ ]'} {step.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom-Right Column: Flight Stick Pad + Pressure & Aerodynamics Telemetry */}
        <div className="flex flex-col gap-2.5 w-full xl:w-[356px] items-stretch">
          {/* Interactive Flight Stick & Assist Panel */}
          <div className="pointer-events-auto bg-[#090d14]/90 border border-slate-700/65 rounded-xl p-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                Flight Stick &amp; Yoke
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="toggle-autolevel"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleAutoLevel();
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-mono-num rounded border cursor-pointer whitespace-nowrap ${
                    autoLevel
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  Level [L]
                </button>
                <button
                  type="button"
                  data-testid="toggle-mousesteer"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleMouseSteer();
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-mono-num rounded border cursor-pointer whitespace-nowrap ${
                    mouseSteer
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  Mouse [V]
                </button>
                <button
                  type="button"
                  data-testid="toggle-invertpitch"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleInvertPitch();
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-mono-num rounded border cursor-pointer whitespace-nowrap ${
                    invertPitch
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  Inv [I]
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* 2D Drag Flight Yoke */}
              <div
                ref={yokeRef}
                data-testid="virtual-yoke"
                role="slider"
                aria-label="Virtual Flight Stick — Drag to pitch and roll"
                aria-valuetext={`Pitch ${Math.round(controls.pitchInput * 100)}%, Roll ${Math.round(controls.rollInput * 100)}%`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  yokeDraggingRef.current = true;
                  updateYokeFromPointer(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!yokeDraggingRef.current) return;
                  updateYokeFromPointer(e.clientX, e.clientY);
                }}
                onPointerUp={(e) => {
                  yokeDraggingRef.current = false;
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                  onStickInput({ pitchInput: 0, rollInput: 0 });
                }}
                onPointerCancel={() => {
                  yokeDraggingRef.current = false;
                  onStickInput({ pitchInput: 0, rollInput: 0 });
                }}
                className="relative w-[82px] h-[82px] shrink-0 rounded-lg bg-slate-900/95 border border-slate-700/80 select-none touch-none cursor-crosshair overflow-hidden"
              >
                <div className="absolute inset-x-0 top-1/2 h-px bg-slate-700/60 pointer-events-none" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-slate-700/60 pointer-events-none" />
                <div
                  className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-amber-400 border-2 border-slate-950 shadow pointer-events-none"
                  style={{
                    left: `${50 + controls.rollInput * 38}%`,
                    top: `${50 + (invertPitch ? -controls.pitchInput : controls.pitchInput) * 38}%`,
                  }}
                />
              </div>

              {/* Tactile Hold Control Buttons */}
              <div className="flex-1 grid grid-cols-3 gap-1 select-none">
                <button
                  type="button"
                  data-testid="btn-yaw-left"
                  onPointerDown={() => onStickInput({ yawInput: -1 })}
                  onPointerUp={() => onStickInput({ yawInput: 0 })}
                  onPointerLeave={() => onStickInput({ yawInput: 0 })}
                  onPointerCancel={() => onStickInput({ yawInput: 0 })}
                  className="py-1.5 text-[10px] font-mono-num bg-slate-900 hover:bg-slate-800 active:bg-sky-500/30 border border-slate-700/80 text-slate-200 rounded cursor-pointer touch-none"
                >
                  Yaw ◀
                </button>
                <button
                  type="button"
                  data-testid="btn-pitch-up"
                  onPointerDown={() => onStickInput({ pitchInput: 1 })}
                  onPointerUp={() => onStickInput({ pitchInput: 0 })}
                  onPointerLeave={() => onStickInput({ pitchInput: 0 })}
                  onPointerCancel={() => onStickInput({ pitchInput: 0 })}
                  className="py-1.5 text-[10px] font-mono-num bg-slate-900 hover:bg-slate-800 active:bg-amber-500/30 border border-slate-700/80 text-amber-200 rounded cursor-pointer touch-none"
                >
                  ▲ Nose Up
                </button>
                <button
                  type="button"
                  data-testid="btn-yaw-right"
                  onPointerDown={() => onStickInput({ yawInput: 1 })}
                  onPointerUp={() => onStickInput({ yawInput: 0 })}
                  onPointerLeave={() => onStickInput({ yawInput: 0 })}
                  onPointerCancel={() => onStickInput({ yawInput: 0 })}
                  className="py-1.5 text-[10px] font-mono-num bg-slate-900 hover:bg-slate-800 active:bg-sky-500/30 border border-slate-700/80 text-slate-200 rounded cursor-pointer touch-none"
                >
                  Yaw ▶
                </button>

                <button
                  type="button"
                  data-testid="btn-roll-left"
                  onPointerDown={() => onStickInput({ rollInput: -1 })}
                  onPointerUp={() => onStickInput({ rollInput: 0 })}
                  onPointerLeave={() => onStickInput({ rollInput: 0 })}
                  onPointerCancel={() => onStickInput({ rollInput: 0 })}
                  className="py-1.5 text-[10px] font-mono-num bg-slate-900 hover:bg-slate-800 active:bg-emerald-500/30 border border-slate-700/80 text-emerald-200 rounded cursor-pointer touch-none"
                >
                  ◀ Roll L
                </button>
                <button
                  type="button"
                  data-testid="btn-pitch-down"
                  onPointerDown={() => onStickInput({ pitchInput: -1 })}
                  onPointerUp={() => onStickInput({ pitchInput: 0 })}
                  onPointerLeave={() => onStickInput({ pitchInput: 0 })}
                  onPointerCancel={() => onStickInput({ pitchInput: 0 })}
                  className="py-1.5 text-[10px] font-mono-num bg-slate-900 hover:bg-slate-800 active:bg-amber-500/30 border border-slate-700/80 text-amber-200 rounded cursor-pointer touch-none"
                >
                  ▼ Nose Dn
                </button>
                <button
                  type="button"
                  data-testid="btn-roll-right"
                  onPointerDown={() => onStickInput({ rollInput: 1 })}
                  onPointerUp={() => onStickInput({ rollInput: 0 })}
                  onPointerLeave={() => onStickInput({ rollInput: 0 })}
                  onPointerCancel={() => onStickInput({ rollInput: 0 })}
                  className="py-1.5 text-[10px] font-mono-num bg-slate-900 hover:bg-slate-800 active:bg-emerald-500/30 border border-slate-700/80 text-emerald-200 rounded cursor-pointer touch-none"
                >
                  Roll R ▶
                </button>
              </div>
            </div>
          </div>

          {/* Aerodynamics & Pressure Telemetry */}
          <div className="pointer-events-auto w-full bg-[#090d14]/90 border border-slate-700/65 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
                Aerodynamics &amp; Pressure
              </span>
              <div className="flex items-center gap-1">
                <select
                  aria-label="Pressure unit"
                  value={units.pressure}
                  onChange={(e) => onChangeUnits({ pressure: e.target.value as PressureUnit })}
                  className="text-[10px] bg-slate-800 text-sky-300 rounded px-1.5 py-0.5 border border-slate-700 cursor-pointer"
                >
                  <option value="hPa">hPa</option>
                  <option value="inHg">inHg</option>
                  <option value="kPa">kPa</option>
                  <option value="psi">psi</option>
                </select>
                <select
                  aria-label="Airspeed unit"
                  value={units.speed}
                  onChange={(e) => onChangeUnits({ speed: e.target.value as SpeedUnit })}
                  className="text-[10px] bg-slate-800 text-slate-200 rounded px-1.5 py-0.5 border border-slate-700 cursor-pointer"
                >
                  <option value="kt">kt</option>
                  <option value="km/h">km/h</option>
                  <option value="mach">Mach</option>
                </select>
                <select
                  aria-label="Altitude unit"
                  value={units.altitude}
                  onChange={(e) => onChangeUnits({ altitude: e.target.value as AltitudeUnit })}
                  className="text-[10px] bg-slate-800 text-slate-200 rounded px-1.5 py-0.5 border border-slate-700 cursor-pointer"
                >
                  <option value="ft">ft</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono-num">
              <div className="bg-slate-900/75 border border-slate-800/80 rounded p-2">
                <div className="text-[10px] text-slate-400">Static P_s</div>
                <div className="font-semibold text-sky-300 whitespace-nowrap">
                  {formatPressure(telemetry.atmosphere.staticPressureHpa, units.pressure)}
                </div>
              </div>
              <div className="bg-slate-900/75 border border-slate-800/80 rounded p-2">
                <div className="text-[10px] text-slate-400">Dynamic q</div>
                <div className="font-semibold text-slate-100 whitespace-nowrap">
                  {formatPressure(telemetry.dynamicPressurePa / 100, units.pressure)}
                </div>
              </div>
              <div className="bg-slate-900/75 border border-slate-800/80 rounded p-2">
                <div className="text-[10px] text-slate-400">Density ρ</div>
                <div className="font-semibold text-slate-100 whitespace-nowrap">
                  {telemetry.atmosphere.airDensityKgM3.toFixed(3)} kg/m³
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center font-mono-num border-t border-slate-800 pt-2">
              <div>
                <div className="text-[10px] text-slate-400">Lift (L)</div>
                <div className="text-xs font-semibold text-emerald-300">
                  {(telemetry.liftN / 1000).toFixed(1)} kN
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Drag (D)</div>
                <div className="text-xs font-semibold text-rose-300">
                  {(telemetry.dragN / 1000).toFixed(1)} kN
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">L/D · AoA</div>
                <div className="text-xs font-semibold text-slate-100">
                  {telemetry.liftToDrag.toFixed(1)} · {telemetry.aoaDeg.toFixed(1)}°
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Load G</div>
                <div className="text-xs font-semibold text-amber-300">
                  {telemetry.loadFactorG.toFixed(2)} G
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
