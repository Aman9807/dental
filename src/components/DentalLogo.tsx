import React from 'react'

interface DentalLogoProps {
  className?: string
  iconOnly?: boolean
  size?: number
}

export default function DentalLogo({ className = '', iconOnly = true, size = 36 }: DentalLogoProps) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      {/* 3D Glassmorphic Stylized Tooth Logo Mark */}
      <div 
        className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 p-0.5 shadow-md shadow-cyan-500/20 group cursor-pointer"
        style={{ width: size, height: size }}
      >
        <div className="w-full h-full bg-white/90 backdrop-blur-md rounded-[14px] flex items-center justify-center p-1.5 transition-all duration-300 group-hover:bg-white/80">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-full h-full drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
          >
            {/* Gradient definition */}
            <defs>
              <linearGradient id="dentalGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0891b2" />
                <stop offset="50%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {/* Stylized Tooth Outer Boundary */}
            <path
              d="M12 2C8.5 2 6 4.5 6 8C6 11 7 13.5 8 16C8.8 18 9.5 21 11 21C11.8 21 12 18.5 12 17.5C12 18.5 12.2 21 13 21C14.5 21 15.2 18 16 16C17 13.5 18 11 18 8C18 4.5 15.5 2 12 2Z"
              fill="url(#dentalGrad)"
            />

            {/* Internal Sparkle / Shield highlight */}
            <path
              d="M12 5.5V11.5M9 8.5H15"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
