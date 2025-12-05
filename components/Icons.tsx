
import React from 'react';

// Wrapper for consistency
const IconWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className || "w-6 h-6"}
  >
    {children}
  </svg>
);

export const LayoutGrid = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </IconWrapper>
);

export const LinkIcon = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </IconWrapper>
);

export const ShoppingBag = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </IconWrapper>
);

export const Calendar = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </IconWrapper>
);

export const BarChart = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="16" />
  </IconWrapper>
);

export const Palette = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </IconWrapper>
);

export const QrCode = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <rect width="5" height="5" x="3" y="3" rx="1" />
    <rect width="5" height="5" x="16" y="3" rx="1" />
    <rect width="5" height="5" x="3" y="16" rx="1" />
    <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
    <path d="M21 21v.01" />
    <path d="M12 7v3a2 2 0 0 1-2 2H7" />
    <path d="M3 12h.01" />
    <path d="M12 3h.01" />
    <path d="M12 16v.01" />
    <path d="M16 12h1" />
    <path d="M21 12v.01" />
    <path d="M12 21v-1" />
  </IconWrapper>
);

export const ExternalLink = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </IconWrapper>
);

export const Sparkles = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </IconWrapper>
);

export const Trash2 = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </IconWrapper>
);

export const Plus = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </IconWrapper>
);

export const Minus = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
      <path d="M5 12h14" />
    </IconWrapper>
);

export const Check = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <polyline points="20 6 9 17 4 12" />
  </IconWrapper>
);

export const ArrowRight = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </IconWrapper>
);

export const X = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </IconWrapper>
);

export const Image = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </IconWrapper>
);

export const ChevronRight = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <path d="m9 18 6-6-6-6" />
    </IconWrapper>
);

export const ChevronLeft = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <path d="m15 18-6-6 6-6" />
    </IconWrapper>
);

export const MapPin = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </IconWrapper>
);

export const Truck = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <path d="M10 17h4V5H2v12h3" />
        <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
        <path d="M14 17h1" />
        <circle cx="7.5" cy="17.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
    </IconWrapper>
);

export const Smartphone = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="M12 18h.01" />
    </IconWrapper>
);

export const CreditCard = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
    </IconWrapper>
);

export const Lock = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </IconWrapper>
);

export const ClipboardList = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M12 11h4" />
        <path d="M12 16h4" />
        <path d="M8 11h.01" />
        <path d="M8 16h.01" />
    </IconWrapper>
);

export const Search = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
    </IconWrapper>
);

export const Instagram = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </IconWrapper>
);

export const WhatsApp = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
        <path d="M9 10a.5.5 0 0 0 1 1h4a.5.5 0 0 0 1-1v-1" />
    </IconWrapper>
);

export const Mail = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </IconWrapper>
);

export const Globe = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" x2="22" y1="12" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" />
    </IconWrapper>
);

export const Star = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </IconWrapper>
);

export const Bell = ({ className }: { className?: string }) => (
    <IconWrapper className={className}>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </IconWrapper>
);

export const Users = ({ className }: { className?: string }) => (
  <IconWrapper className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </IconWrapper>
);