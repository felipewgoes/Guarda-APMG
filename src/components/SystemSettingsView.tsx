import React, { useState } from 'react';
import { Settings, Shield, Camera, HardDrive, Smartphone, CheckCircle, RefreshCw, Trash2, Sliders, Volume2, Bell } from 'lucide-react';

interface SystemSettingsViewProps {
  currentSentry: string;
  currentPost: string;
  onChangeSentry: (sentry: string, post: string) => void;
  onOpenPermissionsModal: () => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  currentSentry,
  currentPost,
  onChangeSentry,
  onOpenPermissionsModal,
}) => {
  const [sentry, setSentry] = useState(currentSentry);
  const [post, setPost] = useState(currentPost);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeSentry(sentry.trim() || currentSentry, post.trim() || currentPost);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetData = () => {
    if (confirm('ATENÇÃO: Deseja redefinir os registros locais de teste e restaurar a base padrão da APMG?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Verificação de Permissões Nativas */}
      <div className="p-4 rounded-xl border border-blue-500/30 bg-[#0F1E36]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950 border border-blue-600/40 text-blue-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Permissões Nativas do Celular</span>
              <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1 rounded font-mono">
                HARDWARE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Verifique o status do sensor de Câmera, Armazenamento para relatórios e Hora de Rede.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPermissionsModal}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow cursor-pointer self-start sm:self-center"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Verificar Permissões</span>
        </button>
      </div>

      {/* 2. Escala e Posto de Serviço */}
      <form onSubmit={handleSave} className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Configuração da Escala da Guarda</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">
              POSTO DE SERVIÇO ATUAL
            </label>
            <input
              type="text"
              value={post}
              onChange={(e) => setPost(e.target.value)}
              placeholder="Ex: Portão Principal (Guarda das Armas)"
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">
              SENTINELA / OPERADOR RESPONSÁVEL
            </label>
            <input
              type="text"
              value={sentry}
              onChange={(e) => setSentry(e.target.value)}
              placeholder="Ex: Cb. Moreira / Sd. Rocha"
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          {savedSuccess ? (
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              <CheckCircle className="w-4 h-4" /> Alterações salvas com sucesso!
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono">
              Registrado localmente e sincronizado com os carimbos periciais.
            </span>
          )}

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all cursor-pointer"
          >
            Salvar Escala
          </button>
        </div>
      </form>

      {/* 3. Manutenção e Reset de Cache */}
      <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-300">Banco de Dados Local</div>
          <p className="text-[10px] text-slate-500">
            Limpar cache e restaurar dados iniciais padrão da APMG (em caso de testes operacionais).
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-800/60 bg-red-950/30 hover:bg-red-900/40 text-red-300 text-xs font-bold transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Restaurar Base</span>
        </button>
      </div>
    </div>
  );
};
