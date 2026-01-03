
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
      {/* 
        This is a high-quality SVG reconstruction of the provided Al-Karamah SC logo 
        Shield + Orange Stripes + Blue Eagle + Soccer Ball
      */}
      <svg viewBox="0 0 400 500" className="w-full h-full drop-shadow-md">
        <defs>
          <clipPath id="shieldClip">
            <path d="M20,50 C20,20 100,10 200,10 C300,10 380,20 380,50 L380,300 C380,450 200,490 200,490 C200,490 20,450 20,300 Z" />
          </clipPath>
        </defs>
        
        {/* Shield Background */}
        <path 
          d="M20,50 C20,20 100,10 200,10 C300,10 380,20 380,50 L380,300 C380,450 200,490 200,490 C200,490 20,450 20,300 Z" 
          fill="white" 
          stroke="black" 
          strokeWidth="4"
        />
        
        {/* Orange Stripes */}
        <g clipPath="url(#shieldClip)">
          {[...Array(15)].map((_, i) => (
            <rect 
              key={i} 
              x="0" 
              y={20 + i * 40} 
              width="400" 
              height="20" 
              fill="#FF6B00" 
            />
          ))}
        </g>
        
        {/* Soccer Ball */}
        <g transform="translate(200, 360)">
          <circle r="60" fill="white" stroke="black" strokeWidth="2" />
          <path d="M0,-60 L0,-30 M52,-30 L26,-15 M52,30 L26,15 M0,60 L0,30 M-52,30 L-26,15 M-52,-30 L-26,-15" stroke="black" strokeWidth="2" />
          <path d="M0,-30 L26,-15 L26,15 L0,30 L-26,15 L-26,-15 Z" fill="#333" />
          <path d="M26,-15 L52,-30 M26,15 L52,30 M-26,15 L-52,30 M-26,-15 L-52,-30" stroke="black" strokeWidth="2" />
        </g>

        {/* Blue Eagle Silhouette (Simplified version of the provided image) */}
        <path 
          d="M80,240 C100,200 150,150 200,160 C250,140 330,150 350,220 C320,210 280,210 260,230 C280,240 310,270 290,300 C250,280 220,280 200,300 C180,320 190,340 180,360 C170,330 140,300 100,280 C70,270 60,250 80,240 Z" 
          fill="#0033A0" 
          stroke="#002060" 
          strokeWidth="2"
        />
        <path d="M185,165 C175,160 160,165 155,175 C150,185 155,200 170,205 L185,165 Z" fill="white" /> {/* Eagle Head */}
        <path d="M155,175 L145,185 L155,190 Z" fill="#FFB800" /> {/* Beak */}
        
        {/* Bottom Ribbon */}
        <path 
          d="M20,380 L380,380 L400,450 C400,450 200,495 0,450 Z" 
          fill="#002060" 
        />
        {/* Text Area (Simulated Calligraphy) */}
        <path 
          d="M100,420 Q150,400 200,420 T300,420" 
          stroke="#FFB800" 
          strokeWidth="4" 
          fill="none" 
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default ClubLogo;
