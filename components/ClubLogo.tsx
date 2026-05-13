
import React from 'react';

interface ClubLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

const ClubLogo: React.FC<ClubLogoProps> = ({ size = 100, className = "" }) => {
  return (
    <div 
      className={`relative flex items-center justify-center ${className} bg-white rounded-xl overflow-hidden shadow-sm`} 
      style={{ width: size, height: size }}
    >
      <img 
        src="https://rbrkrntnjmwgtspmhbau.supabase.co/storage/v1/object/public/courts/LOGO.jpeg" 
        alt="Club Logo"
        className="w-full h-full object-contain p-1"
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default ClubLogo;
