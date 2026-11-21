import { useState } from 'react';
import { ArrowRightLeft, MapPin, Navigation, X } from 'lucide-react';
import { formatBearing, GLOBAL_AIRPORTS } from '../sim/airports';
import type { Airport, FlightPlan, PressureUnit } from '../sim/types';
import { formatPressure } from '../sim/units';

interface AirportNavModalProps {
  flightPlan: FlightPlan;
  pressureUnit: PressureUnit;
  onSelectRoute: (departure: Airport, destination: Airport) => void;
  onClose: () => void;
}

function projectLatLon(lat: number, lon: number, width: number, height: number) {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

export function AirportNavModal({
  flightPlan,
  pressureUnit,
  onSelectRoute,
  onClose,
}: AirportNavModalProps) {
  const [depIcao, setDepIcao] = useState(flightPlan.departure.icao);
  const [destIcao, setDestIcao] = useState(flightPlan.destination.icao);
  const [selectingFor, setSelectingFor] = useState<'departure' | 'destination'>('destination');

  const depAirport = GLOBAL_AIRPORTS.find((a) => a.icao === depIcao) || flightPlan.departure;
  const destAirport = GLOBAL_AIRPORTS.find((a) => a.icao === destIcao) || flightPlan.destination;

  const mapW = 760;
  const mapH = 340;
  const depPt = projectLatLon(depAirport.lat, depAirport.lon, mapW, mapH);
  const destPt = projectLatLon(destAirport.lat, destAirport.lon, mapW, mapH);
  const midX = (depPt.x + destPt.x) / 2;
  const midY = Math.min(depPt.y, destPt.y) - Math.min(65, Math.abs(depPt.x - destPt.x) * 0.18);

  const handleMapClick = (airport: Airport) => {
    if (selectingFor === 'departure') {
      if (airport.icao !== destIcao) setDepIcao(airport.icao);
    } else {
      if (airport.icao !== depIcao) setDestIcao(airport.icao);
    }
  };

  const handleApply = () => {
    onSelectRoute(depAirport, destAirport);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Airport Navigation Chart"
      className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-5xl bg-[#0c121d] border border-slate-700/75 rounded-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Navigation className="w-4 h-4 text-sky-400" />
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Global Airport Navigation & Flight Plan
              </h2>
              <p className="text-xs text-slate-400">
                Click any airport pin on the world chart or choose from {GLOBAL_AIRPORTS.length} international airfields
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Airport Navigation"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto aero-scroll flex flex-col gap-4">
          {/* Interactive World Map */}
          <div className="relative bg-[#070b12] border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Map click sets:</span>
                <button
                  type="button"
                  onClick={() => setSelectingFor('departure')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    selectingFor === 'departure'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Departure ({depAirport.icao})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectingFor('destination')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    selectingFor === 'destination'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Destination ({destAirport.icao})
                </button>
              </div>
              <div className="font-mono-num text-slate-300">
                RWY {formatBearing(depAirport.runwayHeadingDeg)}° · QNH{' '}
                {formatPressure(depAirport.qnhHpa, pressureUnit)}
              </div>
            </div>

            <svg viewBox={`0 0 ${mapW} ${mapH}`} className="w-full h-auto block">
              {/* Latitude / Longitude Graticule */}
              <g stroke="#1e293b" strokeWidth="0.8">
                {[0.25, 0.5, 0.75].map((f) => (
                  <line key={`h-${f}`} x1={0} y1={mapH * f} x2={mapW} y2={mapH * f} />
                ))}
                {[0.2, 0.4, 0.6, 0.8].map((f) => (
                  <line key={`v-${f}`} x1={mapW * f} y1={0} x2={mapW * f} y2={mapH} />
                ))}
              </g>

              {/* Simplified Continental Mass Silhouettes */}
              <g fill="#152236" stroke="#283d5e" strokeWidth="1">
                {/* North America */}
                <polygon points="85,45 190,40 245,95 215,135 170,150 130,125 90,95" />
                {/* South America */}
                <polygon points="215,168 275,185 288,245 245,305 225,250" />
                {/* Europe */}
                <polygon points="355,48 440,42 465,88 415,105 360,96" />
                {/* Africa */}
                <polygon points="355,118 445,118 485,175 435,268 395,255 362,178" />
                {/* Asia */}
                <polygon points="448,42 665,45 695,115 620,165 510,152 460,115" />
                {/* Australia */}
                <polygon points="620,215 700,215 712,265 635,272" />
              </g>

              {/* Flight Path Arc */}
              <path
                d={`M ${depPt.x} ${depPt.y} Q ${midX} ${midY} ${destPt.x} ${destPt.y}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.2"
                strokeDasharray="6 4"
              />

              {/* Airport Pins */}
              {GLOBAL_AIRPORTS.map((airport) => {
                const pt = projectLatLon(airport.lat, airport.lon, mapW, mapH);
                const isDep = airport.icao === depIcao;
                const isDest = airport.icao === destIcao;
                const labelOffsets: Record<string, [number, number]> = {
                  KLAX: [-34, 11],
                  KEDW: [7, -4],
                  CYYZ: [-34, -4],
                  KJFK: [8, 8],
                  EGLL: [-34, -3],
                  LFPG: [-32, 11],
                  EDDF: [8, -4],
                  LSZH: [8, 9],
                  LIRF: [8, 11],
                };
                const [ox, oy] = labelOffsets[airport.icao] || [7, 3];
                return (
                  <g
                    key={airport.icao}
                    onClick={() => handleMapClick(airport)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isDep || isDest ? 6.5 : 4}
                      fill={isDep ? '#f59e0b' : isDest ? '#10b981' : '#64748b'}
                      stroke="#090d14"
                      strokeWidth="1.5"
                    />
                    <text
                      x={pt.x + ox}
                      y={pt.y + oy}
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                      fill={isDep ? '#fbbf24' : isDest ? '#34d399' : '#94a3b8'}
                      fontWeight={isDep || isDest ? '700' : '400'}
                    >
                      {airport.icao}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Dropdown Selectors + Swap */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <label
                htmlFor="dep-airport-select"
                className="block text-xs font-medium text-amber-300 mb-1"
              >
                Departure Airport
              </label>
              <select
                id="dep-airport-select"
                value={depIcao}
                onChange={(e) => setDepIcao(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
              >
                {GLOBAL_AIRPORTS.map((a) => (
                  <option key={a.icao} value={a.icao} disabled={a.icao === destIcao}>
                    {a.icao} ({a.iata}) — {a.city}, {a.country} · RWY {formatBearing(a.runwayHeadingDeg)}°
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setDepIcao(destIcao);
                setDestIcao(depIcao);
              }}
              aria-label="Swap departure and destination airports"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 cursor-pointer self-end"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            <div>
              <label
                htmlFor="dest-airport-select"
                className="block text-xs font-medium text-emerald-300 mb-1"
              >
                Destination Airport
              </label>
              <select
                id="dest-airport-select"
                value={destIcao}
                onChange={(e) => setDestIcao(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-400"
              >
                {GLOBAL_AIRPORTS.map((a) => (
                  <option key={a.icao} value={a.icao} disabled={a.icao === depIcao}>
                    {a.icao} ({a.iata}) — {a.city}, {a.country} · Elev {a.elevationM}m
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* METAR & Runway Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/75 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold mb-1">
                <MapPin className="w-3.5 h-3.5" />
                {depAirport.icao} · {depAirport.name}
              </div>
              <div className="text-slate-400 font-mono-num">
                Elev {depAirport.elevationM} m · RWY {formatBearing(depAirport.runwayHeadingDeg)}° ({depAirport.runwayLengthM} m) · Wind {formatBearing(depAirport.windDirDeg)}° at {depAirport.windSpeedKt} kt · QNH {formatPressure(depAirport.qnhHpa, pressureUnit)}
              </div>
            </div>
            <div className="bg-slate-900/75 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold mb-1">
                <MapPin className="w-3.5 h-3.5" />
                {destAirport.icao} · {destAirport.name}
              </div>
              <div className="text-slate-400 font-mono-num">
                Elev {destAirport.elevationM} m · RWY {formatBearing(destAirport.runwayHeadingDeg)}° ({destAirport.runwayLengthM} m) · Wind {formatBearing(destAirport.windDirDeg)}° at {destAirport.windSpeedKt} kt · QNH {formatPressure(destAirport.qnhHpa, pressureUnit)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-3 bg-[#090d14]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg cursor-pointer"
          >
            Set Flight Plan ({depAirport.icao} → {destAirport.icao})
          </button>
        </div>
      </div>
    </div>
  );
}
