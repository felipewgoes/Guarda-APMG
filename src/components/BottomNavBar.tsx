import React from 'react';
import { Camera, UserPlus, FileSpreadsheet, Menu, Shield } from 'lucide-react';
import { ActiveModule } from './NavigationDrawer';

interface BottomNavBarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  onOpenDrawer: () => void;
  entriesCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeModule,
  onSelectModule,
  onOpenDrawer,
  entriesCount,
}) => {
  const modules = [
    {
      id: 'modulo_portaria' as ActiveModule,
      label: 'Mód. 1: Portaria',
      subtitle: 'Acesso',
      icon: Camera,
    },
    {
      id: 'modulo_cadastro' as ActiveModule,
      label: 'Mód. 2: Cadastro',
      subtitle: 'Efetivo/Civil',
      icon: UserPlus,
    },
    {
      id: 'modulo_gestao' as ActiveModule,
      label: 'Mód. 3: Gestão',
      subtitle: 'Livro & PDF',
      icon: FileSpreadsheet,
      badge: entriesCount > 0 ? `${entriesCount}` : undefined,
    },
  ];

  return (
    <nav
      id="bottom-tab-bar"
      aria-label="Navegação em 3 Módulos Principais"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-[#1B365D] backdrop-blur-xl pb-safe shadow-2xl"
    >
      <div className="max-w-2xl mx-auto px-2 py-1.5 flex items-center justify-around">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule === mod.id;

          return (
            <button
              key={mod.id}
              id={`tab-btn-${mod.id}`}
              type="button"
              onClick={() => onSelectModule(mod.id)}
              className={`flex-1 relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer ${
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

                {mod.badge && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-mono font-bold text-slate-950">
                    {mod.badge}
                  </span>
                )}
              </div>

              {/* Text label */}
              <span className="text-[10px] sm:text-[11px] font-mono-military tracking-tight mt-0.5 leading-tight text-center">
                {mod.label}
              </span>
            </button>
          );
        })}

        {/* Botão de Menu Lateral / Gaveta */}
        <button
          type="button"
          id="bottom-menu-drawer-btn"
          onClick={onOpenDrawer}
          className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer active:scale-95"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
            <Menu className="w-4 h-4" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono-military tracking-tight mt-0.5 text-slate-400">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
};
