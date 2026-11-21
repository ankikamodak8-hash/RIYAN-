import { Play, RotateCcw, Home } from 'lucide-react';
import type { AeroTelemetry, AircraftSpec, FlightPlan, GameState, PhysicsState } from '../sim/types';

interface FlightSummaryModalProps {
  gameState: GameState;
  aircraft: AircraftSpec;
  flightPlan: FlightPlan;
  physicsState: PhysicsState;
  telemetry: AeroTelemetry | null;
  onResume: () => void;
  onRestart: () => void;
  onReturnHangar: () => void;
}

export function FlightSummaryModal({
  gameState,
  aircraft,
  flightPlan,
  physicsState,
  onResume,
  onRestart,
  onReturnHangar,
}: FlightSummaryModalProps) {
  if (gameState !== 'paused' && gameState !== 'gameover') return null;

  const isPaused = gameState === 'paused';
  const title = isPaused
    ? 'Flight Paused'
    : physicsState.landedSafely
      ? 'Arrival Confirmed'
      : 'Flight Terminated';

  const subtitle = isPaused
    ? `${aircraft.name} · ${flightPlan.departure.icao} → ${flightPlan.destination.icao}`
    : physicsState.outcomeReason || 'Flight session ended.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-30 bg-black/70 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-[#0c121d] border border-slate-700/80 rounded-xl p-6 flex flex-col gap-5 shadow-2xl">
        <div>
          <div
            className={`text-xs font-semibold mb-1 ${
              isPaused
                ? 'text-sky-400'
                : physicsState.landedSafely
                  ? 'text-emerald-400'
                  : 'text-rose-400'
            }`}
          >
            {isPaused ? 'Simulation Paused' : physicsState.landedSafely ? 'Safe Landing' : 'Flight Alert'}
          </div>
          <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-300 mt-1">{subtitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 bg-slate-900/85 border border-slate-800 rounded-lg p-3 text-center">
          <div>
            <div className="text-[11px] text-slate-400">Max Alt</div>
            <div className="font-mono-num text-sm font-semibold text-white">
              {Math.round(physicsState.maxAltitudeM).toLocaleString()} m
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Peak Mach</div>
            <div className="font-mono-num text-sm font-semibold text-amber-300">
              M {physicsState.maxMachReached.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Fuel Used</div>
            <div className="font-mono-num text-sm font-semibold text-sky-300">
              {Math.round(physicsState.fuelUsedKg).toLocaleString()} kg
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isPaused && (
            <button
              type="button"
              onClick={onResume}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Resume Flight
            </button>
          )}
          <button
            type="button"
            data-start={!isPaused ? 'true' : undefined}
            onClick={onRestart}
            className={`w-full py-2.5 px-4 font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer ${
              isPaused
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart from {flightPlan.departure.icao}
          </button>
          <button
            type="button"
            onClick={onReturnHangar}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            Return to Airforce Hangar
          </button>
        </div>
      </div>
    </div>
  );
}
