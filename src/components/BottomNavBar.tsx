import React from 'react';
import { Camera, Shield, Users, FileSpreadsheet } from 'lucide-react';
import { AppTab } from '../types';

interface BottomNavBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  entriesCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  entriesCount,
}) => {
  const tabs = [
    {
      id: 'leitura_rapida' as AppTab,
      label: 'Leitura Rápida',
      subtitle: 'Aba 1 (Câmera)',
      icon: Camera,
    },
    {
      id: 'cadastro_militar' as AppTab,
      label: 'Cad. Militar',
      subtitle: 'Aba 2 (Efetivo)',
      icon: Shield,
    },
    {
      id: 'cadastro_civil' as AppTab,
      label: 'Cad. Civil',
      subtitle: 'Aba 3 (Visitante)',
      icon: Users,
    },
    {
      id: 'historico_exportacao' as AppTab,
      label: 'Histórico & Excel',
      subtitle: 'Aba 4 (Planilha)',
      icon: FileSpreadsheet,
      badge: entriesCount > 0 ? `${entriesCount}` : undefined,
    },
  ];

  return (
    <nav
      id="bottom-tab-bar"
      aria-label="Navegação Operacional em 4 Abas"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl pb-safe shadow-2xl"
    >
      <div className="max-w-2xl mx-auto px-2 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active Indicator bar */}
              {isActive && (
                <div className="absolute -top-1.5 w-8 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              )}

              {/* Icon Container with Badge */}
              <div className="relative">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {tab.badge && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-mono font-bold text-slate-950">
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Text label */}
              <span className="text-[11px] font-mono-military tracking-tight mt-0.5 leading-tight text-center">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
