import React from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionCardProps {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'blue' | 'amber' | 'red' | 'gold';
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const AccordionCard: React.FC<AccordionCardProps> = ({
  id,
  title,
  subtitle,
  badge,
  badgeColor = 'emerald',
  icon,
  isOpen,
  onToggle,
  children,
  headerAction,
}) => {
  const badgeClasses = {
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    blue: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    red: 'bg-red-950/80 text-red-300 border-red-500/40',
    gold: 'bg-amber-900/60 text-amber-200 border-amber-400/50',
  }[badgeColor];

  return (
    <div
      id={`accordion-${id}`}
      className="rounded-2xl border border-slate-800 bg-slate-900/95 overflow-hidden shadow-xl transition-all duration-200 mb-4"
    >
      {/* Botão de Toque Amplo do Cabeçalho (compatível com luvas operacionais) */}
      <div
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-[#12233f] cursor-pointer hover:bg-slate-800/80 transition-colors select-none text-left min-h-[58px]"
        role="button"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          {/* Ícone com moldura militar */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-slate-700/80 text-emerald-400 shadow-md">
            {icon}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide truncate font-mono-military">
                {title}
              </h3>
              {badge && (
                <span
                  className={`rounded-md border px-2 py-0.5 text-[9px] font-bold font-mono tracking-wider ${badgeClasses}`}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerAction && <div onClick={(e) => e.stopPropagation()}>{headerAction}</div>}

          {/* Seta discreta de recolhimento / expansão */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-all shadow-sm"
            aria-label={isOpen ? 'Minimizar painel' : 'Expandir painel'}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 text-slate-300 ${
                isOpen ? 'rotate-180 text-emerald-400' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Conteúdo Expansível */}
      {isOpen && (
        <div className="p-3.5 sm:p-5 border-t border-slate-800/80 bg-slate-900/60 animate-in fade-in-50 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};
