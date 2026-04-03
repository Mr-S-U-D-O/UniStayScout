import React from 'react';

type IconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

const base = (size = 20, strokeWidth = 1.75): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconSearch = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const IconMapPin = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const IconUser = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconHome = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export const IconBuilding = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
  </svg>
);

export const IconCalendar = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const IconStar = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const IconChevronLeft = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const IconChevronRight = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const IconCheck = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconX = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconArrowRight = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const IconShield = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const IconWifi = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

export const IconCar = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="1" y="3" width="15" height="13" rx="2" />
    <path d="M16 8h4l3 3v5h-4" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

export const IconWalk = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="4" r="1.5" />
    <path d="M9 8l-2 5h3l1 4" />
    <path d="M13 17l1-5 2 3" />
    <path d="M10 12l2 1 3-3" />
  </svg>
);

export const IconBus = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="2" y="3" width="20" height="16" rx="2" />
    <path d="M7 19v2M17 19v2M2 9h20M2 14h20" />
    <circle cx="7" cy="17" r="1" />
    <circle cx="17" cy="17" r="1" />
  </svg>
);

export const IconBed = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M2 4v16" />
    <path d="M2 8h18a2 2 0 0 1 2 2v10" />
    <path d="M2 17h20" />
    <path d="M6 8v9" />
  </svg>
);

export const IconKey = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

export const IconClock = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const IconPhone = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.76h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.29 6.29l.8-.8a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const IconPencil = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <line x1="18" y1="2" x2="22" y2="6" />
    <path d="M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z" />
  </svg>
);

export const IconTrash = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const IconUpload = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

export const IconEye = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconAlertTriangle = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconZap = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const IconLaundry = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="2" y="2" width="20" height="20" rx="2" />
    <circle cx="12" cy="13" r="5" />
    <path d="M8 7h.01M12 7h.01" />
  </svg>
);

export const IconParking = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="2" y="2" width="20" height="20" rx="2" />
    <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
  </svg>
);

export const IconGraduationCap = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

export const IconBriefcase = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

export const IconLogOut = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const IconLayers = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export const IconMessageCircle = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const IconSettings = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const IconTrendingUp = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export const IconFilter = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const IconSend = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// Amenity icon map for use in components
export const AmenityIcon = ({ amenity, ...props }: { amenity: string } & IconProps) => {
  switch (amenity) {
    case 'wifi': return <IconWifi {...props} />;
    case 'security': return <IconShield {...props} />;
    case 'laundry': return <IconLaundry {...props} />;
    case 'parking': return <IconParking {...props} />;
    case 'backup-power': return <IconZap {...props} />;
    default: return <IconCheck {...props} />;
  }
};
