import { BookOpen, X } from 'lucide-react';
import type { AeroTelemetry, AircraftSpec, UnitPreferences } from '../sim/types';
import {
  AERODYNAMIC_UNITS_CATALOG,
  formatFuelFlow,
  formatPressure,
  formatThrust,
} from '../sim/units';

interface AeroGuideModalProps {
  aircraft: AircraftSpec;
  telemetry: AeroTelemetry | null;
  units: UnitPreferences;
  onClose: () => void;
}

export function AeroGuideModal({ aircraft, telemetry, units, onClose }: AeroGuideModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aerodynamics Units and Flight Guide"
      className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-4xl bg-[#0c121d] border border-slate-700/80 rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Aerodynamics Units &amp; Flight Physics Manual
              </h2>
              <p className="text-xs text-slate-400">
                Active Airframe: {aircraft.name} · Wing Area S = {aircraft.wingAreaM2.toFixed(1)} m² · Max Thrust = {aircraft.maxThrustKN} kN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Aerodynamics Guide"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto aero-scroll flex flex-col gap-4">
          {/* Live Telemetry Snapshot if available */}
          {telemetry && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-900/85 border border-slate-800 rounded-lg p-3">
              <div>
                <div className="text-[11px] text-slate-400">Live Thrust</div>
                <div className="font-mono-num text-sm font-semibold text-amber-300">
                  {formatThrust(telemetry.thrustN, units.thrust)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Static Pressure</div>
                <div className="font-mono-num text-sm font-semibold text-sky-300">
                  {formatPressure(telemetry.atmosphere.staticPressureHpa, units.pressure)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Dynamic q</div>
                <div className="font-mono-num text-sm font-semibold text-slate-100">
                  {Math.round(telemetry.dynamicPressurePa).toLocaleString()} Pa
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Air Density ρ</div>
                <div className="font-mono-num text-sm font-semibold text-slate-100">
                  {telemetry.atmosphere.airDensityKgM3.toFixed(3)} kg/m³
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Fuel Flow</div>
                <div className="font-mono-num text-sm font-semibold text-emerald-300">
                  {formatFuelFlow(telemetry.fuelFlowKgS, units.fuelFlow)}
                </div>
              </div>
            </div>
          )}

          {/* Aerodynamic Units Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AERODYNAMIC_UNITS_CATALOG.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/70 border border-slate-800 rounded-lg p-3.5 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-100">{item.name}</h3>
                  <span className="font-mono-num text-xs font-semibold text-amber-300">
                    {item.symbol}
                  </span>
                </div>
                <div className="text-[11px] text-sky-300 font-mono-num">{item.units}</div>
                <div className="text-xs font-mono-num bg-[#070b12] border border-slate-800/80 px-2.5 py-1.5 rounded text-emerald-300">
                  {item.formula}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.explanation}</p>
              </div>
            ))}
          </div>

          {/* Flight Training Syllabus */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4">
            <h3 className="font-display text-sm font-semibold text-white mb-2">
              5-Phase Flight Guidance Syllabus
            </h3>
            <ol className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs text-slate-300">
              <li className="bg-[#090d14] border border-slate-800 p-2.5 rounded">
                <div className="font-semibold text-amber-300 mb-1">1. Takeoff Roll</div>
                Advance throttle to 90–100%. Use Flaps [F] for higher C_L and shorter runway roll.
              </li>
              <li className="bg-[#090d14] border border-slate-800 p-2.5 rounded">
                <div className="font-semibold text-amber-300 mb-1">2. Rotation (V_R)</div>
                Above stall margin, pull back [S/↓] to +10° pitch until Lift exceeds Weight.
              </li>
              <li className="bg-[#090d14] border border-slate-800 p-2.5 rounded">
                <div className="font-semibold text-amber-300 mb-1">3. Clean Climb</div>
                Retract Gear [G] and Flaps [F] to cut parasitic drag C_D and maximize climb rate.
              </li>
              <li className="bg-[#090d14] border border-slate-800 p-2.5 rounded">
                <div className="font-semibold text-amber-300 mb-1">4. Nav &amp; Fuel</div>
                Bank [A/D] onto destination bearing. Stay under 85% throttle to avoid 2.1× AB fuel burn.
              </li>
              <li className="bg-[#090d14] border border-slate-800 p-2.5 rounded">
                <div className="font-semibold text-amber-300 mb-1">5. Approach &amp; Flare</div>
                Extend Gear [G] and Flaps [F], reduce thrust, and flare nose up before touchdown.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
