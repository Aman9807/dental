import React from 'react'
import Image from 'next/image'

interface DentalLogoProps {
  className?: string
  iconOnly?: boolean
  size?: number
}

export default function DentalLogo({ className = '', iconOnly = true, size = 36 }: DentalLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div 
        className="relative flex items-center justify-center rounded-2xl overflow-hidden shadow-md shadow-cyan-500/20 group cursor-pointer border border-cyan-200/80 bg-white transition-all duration-300 hover:scale-105 shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.png"
          alt="Dental Clinic Logo Mark"
          width={256}
          height={256}
          unoptimized
          style={{ imageRendering: 'crisp-edges' }}
          className="object-contain w-full h-full p-0.5 rounded-2xl transition-transform duration-300 group-hover:scale-110"
          priority
        />
      </div>

      {!iconOnly && (
        <div className="flex flex-col">
          <span className="text-lg font-serif font-semibold tracking-tight text-slate-900 leading-tight">
            Dental Clinic
          </span>
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-500">
            Network
          </span>
        </div>
      )}
    </div>
  )
}
