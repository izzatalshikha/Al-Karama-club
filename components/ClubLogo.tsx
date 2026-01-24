
import React from 'react';

interface ClubLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

const ClubLogo: React.FC<ClubLogoProps> = ({ size = 100, className = "", showText = false }) => {
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`} 
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 400 500" className="w-full h-full drop-shadow-2xl">
        <defs>
          <linearGradient id="eagleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0033A0" />
            <stop offset="100%" stopColor="#001F3F" />
          </linearGradient>
          <clipPath id="shieldClip">
            <path d="M20,50 C20,20 100,10 200,10 C300,10 380,20 380,50 L380,300 C380,450 200,490 200,490 C200,490 20,450 20,300 Z" />
          </clipPath>
        </defs>
        
        {/* Shield Border & Glow */}
        <path 
          d="M20,50 C20,20 100,10 200,10 C300,10 380,20 380,50 L380,300 C380,450 200,490 200,490 C200,490 20,450 20,300 Z" 
          fill="white" 
          stroke="#001F3F" 
          strokeWidth="8"
        />
        
        {/* Orange Stripes Background */}
        <g clipPath="url(#shieldClip)">
          {[...Array(12)].map((_, i) => (
            <rect 
              key={i} 
              x="0" 
              y={20 + i * 45} 
              width="400" 
              height="22" 
              fill="#FF6B00" 
            />
          ))}
        </g>
        
        {/* The Eagle (Al-Karamah Symbol) */}
        <path 
          d="M200,80 C140,80 80,120 60,180 C55,200 70,220 100,210 C130,200 160,250 140,300 C120,350 150,380 200,380 C250,380 280,350 260,300 C240,250 270,200 300,210 C330,220 345,200 340,180 C320,120 260,80 200,80 Z" 
          fill="url(#eagleGrad)"
          className="animate-pulse"
        />
        
        {/* Eagle Wings Detail */}
        <path d="M100,180 Q150,150 200,180 T300,180" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
        
        {/* Soccer Ball - Centered and Integrated */}
        <g transform="translate(200, 310) scale(0.9)">
          <circle r="65" fill="white" stroke="#001F3F" strokeWidth="4" />
          {/* Hexagons */}
          <path d="M0,-65 L0,-35 M56,-28 L30,-15 M56,28 L30,15 M0,65 L0,35 M-56,28 L-30,15 M-56,-28 L-30,-15" stroke="#001F3F" strokeWidth="3" />
          <path d="M0,-35 L30,-15 L30,15 L0,35 L-30,15 L-30,-15 Z" fill="#001F3F" />
          {/* Outer Connectors */}
          <path d="M30,-15 L65,-15 M30,15 L65,15 M-30,15 L-65,15 M-30,-15 L-65,-15" stroke="#001F3F" strokeWidth="2" />
        </g>

        {/* Bottom Ribbon / Decorative Base */}
        <path 
          d="M50,420 Q200,480 350,420 L370,450 Q200,500 30,450 Z" 
          fill="#001F3F" 
        />
        
        {/* Golden Emblem Mark */}
        <circle cx="200" cy="455" r="15" fill="#FFB800" stroke="white" strokeWidth="2" />
      </svg>
    </div>
  );
};

export default ClubLogo;
