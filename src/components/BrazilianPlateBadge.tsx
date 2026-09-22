import React from 'react';
import { PlateFormat } from '../types';

interface BrazilianPlateBadgeProps {
  plate: string;
  format?: PlateFormat;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrazilianPlateBadge: React.FC<BrazilianPlateBadgeProps> = ({
  plate,
  format = 'mercosul',
  size = 'md',
  className = '',
}) => {
  const cleanPlate = (plate || '').toUpperCase().trim();
  const isMilitar = cleanPlate.startsWith('EB') || cleanPlate.startsWith('FAB') || cleanPlate.startsWith('MB') || format === 'outro';
  const isAntiga = format === 'antiga' || (/^[A-Z]{3}[0-9]{4}$/.test(cleanPlate.replace('-', '')));

  // Size configurations
  const sizeStyles = {
    sm: {
      container: 'h-8 px-2 py-0.5 text-xs rounded border',
      header: 'text-[7px] py-0 px-1',
      text: 'text-sm font-bold tracking-wider',
      flag: 'w-2.5 h-1.5',
    },
    md: {
      container: 'h-11 px-3 py-1 text-sm rounded-md border-2 shadow-sm',
      header: 'text-[9px] py-0.5 px-2 font-semibold',
      text: 'text-lg font-bold tracking-widest',
      flag: 'w-3.5 h-2',
    },
    lg: {
      container: 'h-14 px-4 py-1 text-base rounded-lg border-2 shadow-md',
      header: 'text-[11px] py-0.5 px-3 font-semibold',
      text: 'text-2xl font-black tracking-widest',
      flag: 'w-5 h-3',
    },
  }[size];

  // Military Plate Styling (Exército Brasileiro / Forças Armadas)
  if (isMilitar) {
    return (
      <div
        id={`plate-militar-${cleanPlate}`}
        className={`inline-flex flex-col items-center justify-center bg-emerald-950 border-emerald-500/80 text-emerald-100 font-plate select-all ${sizeStyles.container} ${className}`}
        style={{ minWidth: size === 'lg' ? '180px' : size === 'md' ? '135px' : '100px' }}
      >
        <div className="flex items-center gap-1 text-[9px] text-emerald-400 uppercase tracking-wider font-mono-military">
          <span>★</span>
          <span>VIATURA MILITAR</span>
          <span>★</span>
        </div>
        <span className={`font-mono-military font-bold text-amber-300 ${sizeStyles.text}`}>
          {cleanPlate || '------'}
        </span>
      </div>
    );
  }

  // Old Brazilian Plate Styling (Cinza com targeta)
  if (isAntiga) {
    const formattedOld = cleanPlate.length === 7 && !cleanPlate.includes('-')
      ? `${cleanPlate.slice(0, 3)}-${cleanPlate.slice(3)}`
      : cleanPlate;

    return (
      <div
        id={`plate-antiga-${cleanPlate}`}
        className={`inline-flex flex-col items-center justify-center bg-zinc-300 border-zinc-500 text-zinc-900 font-plate select-all ${sizeStyles.container} ${className}`}
        style={{ minWidth: size === 'lg' ? '180px' : size === 'md' ? '135px' : '100px' }}
      >
        <div className="text-[8px] tracking-tight text-zinc-700 font-mono font-medium -mb-0.5">
          BR - REGISTRO
        </div>
        <span className={`text-zinc-950 font-bold ${sizeStyles.text}`}>
          {formattedOld || '--- ----'}
        </span>
      </div>
    );
  }

  // Standard Mercosul Plate
  return (
    <div
      id={`plate-mercosul-${cleanPlate}`}
      className={`inline-flex flex-col items-stretch overflow-hidden bg-white border-zinc-400 text-zinc-900 font-plate rounded shadow-sm select-all ${className}`}
      style={{ minWidth: size === 'lg' ? '180px' : size === 'md' ? '135px' : '100px' }}
    >
      {/* Mercosul Blue Top Ribbon */}
      <div className={`bg-blue-700 text-white flex items-center justify-between font-sans ${sizeStyles.header}`}>
        <div className="flex items-center gap-0.5">
          <span className="text-[8px] font-mono leading-none">★</span>
          <span className="text-[7px] tracking-tighter opacity-80">MERCOSUL</span>
        </div>
        <span className="font-bold tracking-widest leading-none">BRASIL</span>
        <div className="flex items-center">
          {/* Brazil Flag mini indicator */}
          <div className="w-2.5 h-1.5 bg-emerald-600 relative flex items-center justify-center rounded-[1px] overflow-hidden">
            <div className="w-1.5 h-1 bg-yellow-400 rotate-45 flex items-center justify-center">
              <div className="w-0.5 h-0.5 bg-blue-700 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Plate Number */}
      <div className="bg-white flex items-center justify-center px-2 py-0.5">
        <span className={`text-zinc-950 font-black tracking-widest ${sizeStyles.text}`}>
          {cleanPlate || '--- ----'}
        </span>
      </div>
    </div>
  );
};
