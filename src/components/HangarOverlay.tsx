import { useMemo, useState } from 'react';
import { Compass, Plane, Ruler, Search, Wrench } from 'lucide-react';
import { formatBearing } from '../sim/airports';
import type { AircraftSpec, FlightPlan, FlightStartMode } from '../sim/types';
import { RoundelBadge } from './RoundelBadge';

interface HangarOverlayProps {
  fleet: AircraftSpec[];
  selectedAircraft: AircraftSpec;
  flightPlan: FlightPlan;
  startMode: FlightStartMode;
  onChangeStartMode: (mode: FlightStartMode) => void;
  onSelectAircraft: (spec: AircraftSpec) => void;
  onOpenDesigner: () => void;
  onOpenAirportNav: () => void;
  onOpenAeroGuide: () => void;
  onLaunchFlight: () => void;
}

export function HangarOverlay({
  fleet,
  selectedAircraft,
  flightPlan,
  startMode,
  onChangeStartMode,
  onSelectAircraft,
  onOpenDesigner,
  onOpenAirportNav,
  onOpenAeroGuide,
  onLaunchFlight,
}: HangarOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFleet = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return fleet;
    return fleet.filter(
      (a) =>
        a.country.toLowerCase().includes(q) ||
        a.airforce.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
    );
  }, [fleet, searchQuery]);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-5 lg:p-7">
      {/* Top Title Emblem + Secondary Manual Action */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto flex items-center gap-3.5 bg-[#090d14]/88 border border-slate-700/60 px-4 py-3 rounded-lg">
          <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
            <polygon points="20,3 35,31 20,24 5,31" fill="#f59e0b" />
            <polygon points="20,9 29,28 20,23 11,28" fill="#090d14" />
            <circle cx="20" cy="20" r="2.5" fill="#38bdf8" />
          </svg>
          <div>
            <h1 className="font-display text-xl lg:text-2xl font-bold tracking-wide text-slate-50 leading-none">
              AEROFORGE GLOBAL
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              World Air Force Flight Simulator · Airframe Studio · Aerodynamics Trainer
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenAeroGuide}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#090d14]/88 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Ruler className="w-3.5 h-3.5 text-amber-400" />
            Aerodynamics & Units Guide
          </button>
        </div>
      </div>

      {/* Main Asymmetric Split: Left Fleet & Mission Panel, Right 65% Clear 3D Showcase */}
      <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between gap-6 my-auto">
        <section
          aria-label="Country and Air Force Squadron Selection"
          className="pointer-events-auto w-full max-w-[440px] bg-[#090d14]/90 border border-slate-700/65 rounded-xl p-4 flex flex-col gap-3.5 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                01. Select Country & Air Force Aircraft
              </h2>
              <p className="text-xs text-slate-400">
                {fleet.length} global airframes ready · Or engineer your own
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenDesigner}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              Design Plane
            </button>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by country, air force, or aircraft..."
              aria-label="Filter aircraft by country, air force, or model"
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-900/90 border border-slate-700/70 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Fleet Roster Scroll List */}
          <div className="aero-scroll max-h-[240px] overflow-y-auto pr-1 flex flex-col gap-1.5">
            {filteredFleet.map((plane) => {
              const active = plane.id === selectedAircraft.id;
              return (
                <button
                  key={plane.id}
                  type="button"
                  onClick={() => onSelectAircraft(plane)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                    active
                      ? 'bg-slate-800/95 border-amber-400/80 text-white'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <RoundelBadge style={plane.roundel} size={26} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {plane.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {plane.country} · {plane.airforce}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono-num">
                    <div className="text-xs font-semibold text-amber-300">
                      {plane.maxThrustKN} kN
                    </div>
                    <div className="text-[11px] text-slate-400">
                      M {plane.maxMach.toFixed(1)}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredFleet.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-6">
                No airframes match &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>

          {/* Selected Aircraft Quick Spec Readout */}
          <div className="border-t border-slate-800 pt-3 grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[10px] text-slate-400">Max Thrust</div>
              <div className="font-mono-num text-xs font-semibold text-slate-100">
                {selectedAircraft.maxThrustKN} kN
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Wing Area</div>
              <div className="font-mono-num text-xs font-semibold text-slate-100">
                {selectedAircraft.wingAreaM2.toFixed(1)} m²
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Fuel Cap</div>
              <div className="font-mono-num text-xs font-semibold text-slate-100">
                {selectedAircraft.maxFuelKg.toLocaleString()} kg
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Ceiling</div>
              <div className="font-mono-num text-xs font-semibold text-slate-100">
                {Math.round(selectedAircraft.serviceCeilingM / 1000)} km
              </div>
            </div>
          </div>

          {/* Global Airport Flight Plan Strip */}
          <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">Global Flight Route</div>
              <div className="text-xs font-semibold text-slate-100 truncate font-mono-num">
                {flightPlan.departure.icao} ({flightPlan.departure.city}) →{' '}
                {flightPlan.destination.icao} ({flightPlan.destination.city})
              </div>
              <div className="text-[11px] text-slate-400 font-mono-num">
                HDG {formatBearing(flightPlan.initialBearingDeg)}° ·{' '}
                {Math.round(flightPlan.distanceNm).toLocaleString()} NM · QNH{' '}
                {flightPlan.departure.qnhHpa} hPa
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAirportNav}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              Airports
            </button>
          </div>

          {/* Launch Mode Selector */}
          <div className="border-t border-slate-800 pt-2.5">
            <div className="text-[11px] text-slate-400 mb-1.5">Launch Mode</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                data-testid="mode-airborne"
                onClick={() => onChangeStartMode('airborne')}
                className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                  startMode === 'airborne'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-slate-900/80 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Airborne (3,100 ft)
              </button>
              <button
                type="button"
                data-testid="mode-runway"
                onClick={() => onChangeStartMode('runway')}
                className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                  startMode === 'runway'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-slate-900/80 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Runway Takeoff
              </button>
            </div>
          </div>

          {/* Primary Launch CTA */}
          <button
            type="button"
            data-start="true"
            onClick={onLaunchFlight}
            className="w-full py-3 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wide rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg whitespace-nowrap cursor-pointer"
          >
            <Plane className="w-4 h-4 shrink-0" />
            {startMode === 'airborne'
              ? `Fly Now — Airborne (${flightPlan.departure.icao})`
              : `Takeoff from ${flightPlan.departure.icao} Runway`}
          </button>
        </section>

        {/* Right Showcase Caption (non-obstructing) */}
        <div className="hidden lg:block pointer-events-none text-right bg-[#090d14]/75 border border-slate-700/50 px-4 py-3 rounded-lg">
          <div className="text-xs text-amber-300 font-medium">{selectedAircraft.airforce}</div>
          <div className="font-display text-lg font-bold text-white">
            {selectedAircraft.name}
          </div>
          <div className="text-xs text-slate-400">{selectedAircraft.role}</div>
        </div>
      </div>

      {/* Bottom Clean Control Hint Line */}
      <div className="pointer-events-none text-center text-xs text-slate-300/85 font-mono-num">
        W/S Pitch · A/D Roll · Q/E Yaw · Shift/Ctrl Throttle · V Mouse Steer · L Auto-Level · G Gear · F Flaps · C Camera
      </div>
    </div>
  );
}
