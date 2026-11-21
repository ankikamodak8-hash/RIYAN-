import { useMemo, useState } from 'react';
import { Check, Plane, X } from 'lucide-react';
import { computeAirframeMetrics, deriveCustomAircraftSpec } from '../sim/aerodynamics';
import type {
  AircraftSpec,
  CustomAirframeDesign,
  EngineType,
  RoundelStyle,
  TailConfig,
  WingPlanform,
} from '../sim/types';
import { AircraftPreviewCanvas } from '../three/AircraftPreviewCanvas';
import { RoundelBadge } from './RoundelBadge';

interface AircraftDesignerModalProps {
  initialBase?: AircraftSpec;
  onSaveAircraft: (spec: AircraftSpec) => void;
  onClose: () => void;
}

const ROUNDEL_OPTIONS: { value: RoundelStyle; label: string }[] = [
  { value: 'usaf-star', label: 'USAF Star & Bars' },
  { value: 'bullseye', label: 'RAF Bullseye' },
  { value: 'tricolor-ring', label: 'Tricolor Ring (FR/IN)' },
  { value: 'iron-cross', label: 'Luftwaffe Cross' },
  { value: 'hinomaru', label: 'JASDF Hinomaru' },
  { value: 'three-crowns', label: 'Swedish Three Crowns' },
  { value: 'taegeuk', label: 'ROKAF Taegeuk' },
  { value: 'maple-leaf', label: 'RCAF Maple Leaf' },
  { value: 'southern-star', label: 'Southern Star' },
  { value: 'crescent-star', label: 'Crescent & Star' },
  { value: 'swiss-cross', label: 'Swiss Cross' },
  { value: 'tricolor-fin', label: 'Italian Tricolore' },
];

export function AircraftDesignerModal({
  initialBase,
  onSaveAircraft,
  onClose,
}: AircraftDesignerModalProps) {
  const [design, setDesign] = useState<CustomAirframeDesign>({
    name: initialBase?.isCustom ? initialBase.name : 'AeroForge X-10',
    country: initialBase?.country || 'Custom Squadron',
    airforce: initialBase?.airforce || 'Experimental Flight Test Wing',
    roundel: initialBase?.roundel || 'usaf-star',
    livery: initialBase?.livery || {
      primary: '#64748b',
      secondary: '#1e293b',
      accent: '#f59e0b',
      canopyTint: '#7dd3fc',
    },
    wingPlanform: initialBase?.wingPlanform || 'swept',
    tailConfig: initialBase?.tailConfig || 'twin-tail',
    engineType: initialBase?.engineType || 'afterburning-jet',
    engineCount: initialBase?.engineCount || 2,
    wingspanM: initialBase?.wingspanM || 12.5,
    wingAreaM2: initialBase?.wingAreaM2 || 44,
    emptyMassKg: initialBase?.emptyMassKg || 11500,
    maxFuelKg: initialBase?.maxFuelKg || 5200,
    thrustRatingKN: initialBase
      ? Math.round(initialBase.maxThrustKN / initialBase.engineCount)
      : 105,
  });

  const liveSpec = useMemo(() => deriveCustomAircraftSpec(design), [design]);
  const metrics = useMemo(() => computeAirframeMetrics(liveSpec), [liveSpec]);

  const handleSave = () => {
    onSaveAircraft(liveSpec);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Custom Aircraft Designer Studio"
      className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-6xl bg-[#0c121d] border border-slate-700/80 rounded-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RoundelBadge style={design.roundel} size={28} />
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Custom Aircraft Designer Studio
              </h2>
              <p className="text-xs text-slate-400">
                Modify planform geometry, propulsion, mass, and livery — aerodynamic coefficients update in real time
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Aircraft Designer"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* Left 3D Turntable + Aerodynamics Card */}
          <div className="lg:col-span-6 p-4 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col gap-3">
            <div className="flex-1 min-h-[260px] relative">
              <AircraftPreviewCanvas spec={liveSpec} />
              <div className="absolute bottom-3 left-3 bg-[#090d14]/88 border border-slate-700/60 px-2.5 py-1 rounded text-[11px] text-slate-300 pointer-events-none">
                Drag to orbit · Scroll to zoom
              </div>
            </div>

            {/* Real-time Calculated Aerodynamics Strip */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-center">
              <div>
                <div className="text-[10px] text-slate-400">Aspect Ratio</div>
                <div className="font-mono-num text-xs font-semibold text-sky-300">
                  {metrics.aspectRatio.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Wing Load</div>
                <div className="font-mono-num text-xs font-semibold text-slate-100">
                  {Math.round(metrics.wingLoadingKgM2)} kg/m²
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">T/W Ratio</div>
                <div className="font-mono-num text-xs font-semibold text-amber-300">
                  {metrics.thrustToWeight.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Stall V_S1</div>
                <div className="font-mono-num text-xs font-semibold text-slate-100">
                  {Math.round(metrics.stallSpeedKt)} kt
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Max L/D</div>
                <div className="font-mono-num text-xs font-semibold text-emerald-300">
                  {metrics.maxLOverD.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Max Mach</div>
                <div className="font-mono-num text-xs font-semibold text-slate-100">
                  M {liveSpec.maxMach.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Right Configuration Controls */}
          <div className="lg:col-span-6 p-5 overflow-y-auto aero-scroll flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="custom-name" className="block text-xs text-slate-400 mb-1">
                  Aircraft Name
                </label>
                <input
                  id="custom-name"
                  type="text"
                  value={design.name}
                  onChange={(e) => setDesign((d) => ({ ...d, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label htmlFor="custom-roundel" className="block text-xs text-slate-400 mb-1">
                  Airforce Insignia / Roundel
                </label>
                <select
                  id="custom-roundel"
                  value={design.roundel}
                  onChange={(e) =>
                    setDesign((d) => ({ ...d, roundel: e.target.value as RoundelStyle }))
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                >
                  {ROUNDEL_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Wing Planform */}
            <div>
              <div className="text-xs text-slate-400 mb-1.5">Wing Planform</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['swept', 'delta', 'straight', 'forward-swept'] as WingPlanform[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDesign((d) => ({ ...d, wingPlanform: p }))}
                    className={`px-2 py-2 text-xs font-medium rounded-lg border capitalize cursor-pointer ${
                      design.wingPlanform === p
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {p.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Tail & Engine Config */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Tail Configuration</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['conventional', 'twin-tail', 't-tail', 'v-tail'] as TailConfig[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDesign((d) => ({ ...d, tailConfig: t }))}
                      className={`px-2 py-1.5 text-xs font-medium rounded-lg border capitalize cursor-pointer ${
                        design.tailConfig === t
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1.5">Propulsion Type & Count</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['afterburning-jet', 'AB Jet'],
                      ['turbofan', 'Turbofan'],
                      ['turboprop', 'Turboprop'],
                      ['ramjet', 'Ramjet'],
                    ] as [EngineType, string][]
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDesign((d) => ({ ...d, engineType: val }))}
                      className={`px-2 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                        design.engineType === val
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-400">Engines:</span>
                  {([1, 2] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setDesign((d) => ({ ...d, engineCount: cnt }))}
                      className={`px-3 py-1 text-xs rounded border cursor-pointer ${
                        design.engineCount === cnt
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      {cnt}×
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dimension & Propulsion Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Wingspan (b)</span>
                  <span className="font-mono-num text-slate-200">{design.wingspanM.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min={7}
                  max={22}
                  step={0.5}
                  value={design.wingspanM}
                  aria-label="Wingspan in meters"
                  onChange={(e) => setDesign((d) => ({ ...d, wingspanM: Number(e.target.value) }))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Wing Area (S)</span>
                  <span className="font-mono-num text-slate-200">{design.wingAreaM2} m²</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={90}
                  step={1}
                  value={design.wingAreaM2}
                  aria-label="Wing area in square meters"
                  onChange={(e) => setDesign((d) => ({ ...d, wingAreaM2: Number(e.target.value) }))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Thrust per Engine</span>
                  <span className="font-mono-num text-slate-200">{design.thrustRatingKN} kN</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={220}
                  step={5}
                  value={design.thrustRatingKN}
                  aria-label="Thrust per engine in kilonewtons"
                  onChange={(e) =>
                    setDesign((d) => ({ ...d, thrustRatingKN: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Empty Mass</span>
                  <span className="font-mono-num text-slate-200">
                    {design.emptyMassKg.toLocaleString()} kg
                  </span>
                </div>
                <input
                  type="range"
                  min={2800}
                  max={24000}
                  step={200}
                  value={design.emptyMassKg}
                  aria-label="Empty mass in kilograms"
                  onChange={(e) => setDesign((d) => ({ ...d, emptyMassKg: Number(e.target.value) }))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Fuel Capacity</span>
                  <span className="font-mono-num text-slate-200">
                    {design.maxFuelKg.toLocaleString()} kg
                  </span>
                </div>
                <input
                  type="range"
                  min={600}
                  max={12000}
                  step={200}
                  value={design.maxFuelKg}
                  aria-label="Fuel capacity in kilograms"
                  onChange={(e) => setDesign((d) => ({ ...d, maxFuelKg: Number(e.target.value) }))}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Paint Colors */}
              <div className="flex items-center gap-3">
                <label className="flex flex-col items-center gap-1 text-[11px] text-slate-400">
                  Hull
                  <input
                    type="color"
                    value={design.livery.primary}
                    onChange={(e) =>
                      setDesign((d) => ({
                        ...d,
                        livery: { ...d.livery, primary: e.target.value },
                      }))
                    }
                    className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                </label>
                <label className="flex flex-col items-center gap-1 text-[11px] text-slate-400">
                  Tail
                  <input
                    type="color"
                    value={design.livery.secondary}
                    onChange={(e) =>
                      setDesign((d) => ({
                        ...d,
                        livery: { ...d.livery, secondary: e.target.value },
                      }))
                    }
                    className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                </label>
                <label className="flex flex-col items-center gap-1 text-[11px] text-slate-400">
                  Trim
                  <input
                    type="color"
                    value={design.livery.accent}
                    onChange={(e) =>
                      setDesign((d) => ({
                        ...d,
                        livery: { ...d.livery, accent: e.target.value },
                      }))
                    }
                    className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-4 bg-[#090d14]">
          <div className="text-xs text-slate-400 font-mono-num">
            Total Thrust: {liveSpec.maxThrustKN} kN · Clean C_D0: {liveSpec.cd0.toFixed(3)} · C_Lmax: {liveSpec.clMax.toFixed(2)}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Save &amp; Select Airframe
              <Plane className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
