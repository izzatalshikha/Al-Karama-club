
import React from 'react';

interface ClubLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

const ClubLogo: React.FC<ClubLogoProps> = ({ size = 100, className = "" }) => {
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`} 
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 500 500" className="w-full h-full drop-shadow-2xl overflow-visible">
        <defs>
          <radialGradient id="ballGrad" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f0f4f8" />
            <stop offset="100%" stopColor="#d1d9e6" />
          </radialGradient>
          
          <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF8C00" />
            <stop offset="100%" stopColor="#FF4500" />
          </linearGradient>

          <filter id="shadow-ball" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
            <feOffset dx="4" dy="8" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* الحلقة الخارجية الزخرفية */}
        <circle cx="250" cy="250" r="240" fill="none" stroke="#FF6B00" strokeWidth="2" strokeDasharray="15 10" opacity="0.4" />
        <circle cx="250" cy="250" r="225" fill="none" stroke="#001F3F" strokeWidth="12" opacity="0.1" />

        {/* جسم الكرة الأساسي */}
        <circle cx="250" cy="250" r="200" fill="url(#ballGrad)" filter="url(#shadow-ball)" stroke="#001F3F" strokeWidth="4" />

        {/* خطوط الكرة والدرزات (الخماسيات والسداسيات) */}
        <g fill="#001F3F" stroke="#001F3F" strokeWidth="2">
          {/* المركز - شكل خماسي */}
          <path d="M250,180 L310,225 L285,300 L215,300 L190,225 Z" fill="#001F3F" />
          
          {/* الوصلات العلوية */}
          <path d="M250,180 L250,50" fill="none" strokeWidth="4" strokeLinecap="round" />
          <path d="M310,225 L410,160" fill="none" strokeWidth="4" strokeLinecap="round" />
          <path d="M190,225 L90,160" fill="none" strokeWidth="4" strokeLinecap="round" />
          
          {/* الوصلات السفلية */}
          <path d="M285,300 L370,400" fill="none" strokeWidth="4" strokeLinecap="round" />
          <path d="M215,300 L130,400" fill="none" strokeWidth="4" strokeLinecap="round" />

          {/* أشكال محيطية لإعطاء العمق (البرتقالي) */}
          <path d="M140,80 L200,110 L160,170 L80,140 Z" fill="url(#orangeGrad)" opacity="0.9" />
          <path d="M360,80 L420,140 L340,170 L300,110 Z" fill="url(#orangeGrad)" opacity="0.9" />
          <path d="M250,350 L310,410 L250,470 L190,410 Z" fill="url(#orangeGrad)" opacity="0.9" />
        </g>

        {/* لمعة كروية إضافية */}
        <ellipse cx="180" cy="150" rx="40" ry="20" fill="white" opacity="0.4" transform="rotate(-30, 180, 150)" />
        
        {/* إطار دائري نهائي لتعزيز الاحترافية */}
        <circle cx="250" cy="250" r="202" fill="none" stroke="#001F3F" strokeWidth="2" />
      </svg>
    </div>
  );
};

export default ClubLogo;
