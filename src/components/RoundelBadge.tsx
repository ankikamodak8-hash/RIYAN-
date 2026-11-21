import type { RoundelStyle } from '../sim/types';

interface RoundelBadgeProps {
  style: RoundelStyle;
  size?: number;
  className?: string;
}

export function RoundelBadge({ style, size = 28, className = '' }: RoundelBadgeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {style === 'usaf-star' && (
        <g>
          <rect x="4" y="24" width="56" height="16" fill="#1e3a8a" rx="2" />
          <rect x="4" y="28" width="56" height="8" fill="#ffffff" />
          <rect x="4" y="30.5" width="56" height="3" fill="#dc2626" />
          <circle cx="32" cy="32" r="16" fill="#1e3a8a" stroke="#ffffff" strokeWidth="2" />
          <polygon
            points="32,19 35.5,28 45,28 37.5,33.5 40.5,43 32,37 23.5,43 26.5,33.5 19,28 28.5,28"
            fill="#ffffff"
          />
        </g>
      )}
      {style === 'bullseye' && (
        <g>
          <circle cx="32" cy="32" r="28" fill="#1d4ed8" />
          <circle cx="32" cy="32" r="19" fill="#ffffff" />
          <circle cx="32" cy="32" r="10" fill="#dc2626" />
        </g>
      )}
      {style === 'tricolor-ring' && (
        <g>
          <circle cx="32" cy="32" r="28" fill="#ea580c" />
          <circle cx="32" cy="32" r="19" fill="#ffffff" />
          <circle cx="32" cy="32" r="10" fill="#16a34a" />
        </g>
      )}
      {style === 'tricolor-fin' && (
        <g>
          <circle cx="32" cy="32" r="28" fill="#16a34a" />
          <circle cx="32" cy="32" r="19" fill="#ffffff" />
          <circle cx="32" cy="32" r="10" fill="#dc2626" />
        </g>
      )}
      {style === 'iron-cross' && (
        <g>
          <path
            d="M12 10 Q32 20 52 10 Q44 32 52 54 Q32 44 12 54 Q20 32 12 10 Z"
            fill="#ffffff"
          />
          <path
            d="M16 14 Q32 23 48 14 Q41 32 48 50 Q32 41 16 50 Q23 32 16 14 Z"
            fill="#111827"
          />
        </g>
      )}
      {style === 'hinomaru' && (
        <g>
          <circle cx="32" cy="32" r="28" fill="#ffffff" />
          <circle cx="32" cy="32" r="19" fill="#dc2626" />
        </g>
      )}
      {style === 'three-crowns' && (
        <g>
          <circle cx="32" cy="32" r="27" fill="#1d4ed8" stroke="#facc15" strokeWidth="3" />
          <circle cx="32" cy="21" r="6" fill="#facc15" />
          <circle cx="22" cy="39" r="6" fill="#facc15" />
          <circle cx="42" cy="39" r="6" fill="#facc15" />
        </g>
      )}
      {style === 'taegeuk' && (
        <g>
          <circle cx="32" cy="32" r="28" fill="#ffffff" />
          <path d="M12 32 A20 20 0 0 1 52 32 Z" fill="#dc2626" />
          <path d="M12 32 A20 20 0 0 0 52 32 Z" fill="#2563eb" />
        </g>
      )}
      {style === 'maple-leaf' && (
        <g>
          <circle cx="32" cy="32" r="26" fill="#ffffff" stroke="#dc2626" strokeWidth="6" />
          <polygon
            points="32,16 36,26 45,25 39,33 42,43 32,38 22,43 25,33 19,25 28,26"
            fill="#dc2626"
          />
        </g>
      )}
      {style === 'southern-star' && (
        <g>
          <circle cx="32" cy="32" r="28" fill="#166534" />
          <circle cx="32" cy="32" r="19" fill="#facc15" />
          <polygon
            points="32,18 35,27 45,27 37,33 40,42 32,37 24,42 27,33 19,27 29,27"
            fill="#1d4ed8"
          />
        </g>
      )}
      {style === 'crescent-star' && (
        <g>
          <circle cx="32" cy="32" r="28" fill="#dc2626" />
          <circle cx="29" cy="32" r="15" fill="#ffffff" />
          <circle cx="34" cy="32" r="12" fill="#dc2626" />
          <polygon
            points="43,25 45,30 50,30 46,33 47,38 43,35 39,38 40,33 36,30 41,30"
            fill="#ffffff"
          />
        </g>
      )}
      {style === 'swiss-cross' && (
        <g>
          <circle cx="32" cy="32" r="28" fill="#dc2626" />
          <rect x="27" y="14" width="10" height="36" fill="#ffffff" rx="1" />
          <rect x="14" y="27" width="36" height="10" fill="#ffffff" rx="1" />
        </g>
      )}
    </svg>
  );
}
