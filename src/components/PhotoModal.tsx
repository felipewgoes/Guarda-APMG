import React, { useState } from 'react';
import { X, Clock, Shield, Download, Camera, User, Building2, CheckCircle2 } from 'lucide-react';
import { VehicleEntry } from '../types';
import { BrazilianPlateBadge } from './BrazilianPlateBadge';

interface PhotoModalProps {
  entry: VehicleEntry | null;
  onClose: () => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({ entry, onClose }) => {
  if (!entry) return null;

  // Imagem prioritária é a foto composta pericial (com carimbo e PiP)
  const displayImage = entry.compositePhotoUrl || entry.photoBase64;
  const hasAlternative = !!(entry.compositePhotoUrl && entry.photoBase64);
  const [showRawPhoto, setShowRawPhoto] = useState<boolean>(false);

  const activePhotoSrc = showRawPhoto ? entry.photoBase64 : displayImage;

  const handleDownloadImage = () => {
    if (!activePhotoSrc) return;
    const link = document.createElement('a');
    link.href = activePhotoSrc;
    const isComposite = !showRawPhoto && !!entry.compositePhotoUrl;
    link.download = `apmg_registro_guarda_${isComposite ? 'composto_' : ''}${entry.plate}_${entry.entryDateFormatted.replace(/\//g, '-')}_${entry.entryTimeFormatted.replace(/:/g, '')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const divisionText = entry.division
    ? (entry.division === 'Outra OPM' ? `${entry.otherOpm || 'Outra OPM'}` : `${entry.division} / APMG`)
    : (entry.driverType === 'militar' ? 'APMG' : 'Visitante Civil');

  return (
    <div
      id="photo-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="photo-modal-content"
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-military font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  APMG • EVIDÊNCIA DA GUARDA
                </span>
                <span className="text-[11px] text-slate-400">{divisionText}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 font-mono-military mt-0.5">
                Registro Fotográfico da Placa & Picture-in-Picture
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasAlternative && (
              <button
                type="button"
                onClick={() => setShowRawPhoto(!showRawPhoto)}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>{showRawPhoto ? 'Ver Foto Composta (PiP)' : 'Ver Foto Original'}</span>
              </button>
            )}
            <button
              id="close-photo-modal-btn"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: High Resolution Image */}
        <div className="relative bg-black flex-1 flex items-center justify-center min-h-[340px] overflow-hidden p-2">
          {activePhotoSrc ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={activePhotoSrc}
                alt={`Registro Fotográfico da Placa ${entry.plate}`}
                className="max-h-[62vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
              />

              {/* Tag informativa se for a foto composta com PiP */}
              {!showRawPhoto && entry.compositePhotoUrl && (
                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-emerald-500/40 text-[10px] font-mono-military text-emerald-300 font-bold flex items-center gap-1 shadow">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>COMPOSIÇÃO OFICIAL: CARIMBO + PiP</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center text-slate-500">
              <User className="mx-auto h-12 w-12 text-slate-600 mb-2" />
              <p className="text-sm">Registro sem captura fotográfica em anexo.</p>
            </div>
          )}
        </div>

        {/* Modal Footer with Metadata */}
        <div className="border-t border-slate-800 bg-slate-950 px-4 py-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrazilianPlateBadge plate={entry.plate} format={entry.plateFormat} size="sm" />
              <div className="text-xs">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>{entry.rankOrDoc} {entry.warName || entry.driverName}</span>
                  <span className="text-emerald-400 font-mono">({entry.plate})</span>
                </div>
                <div className="text-slate-400 text-[11px] flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {entry.entryDateFormatted} às {entry.entryTimeFormatted}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-500" />
                    {divisionText}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {activePhotoSrc && (
                <button
                  id="download-photo-btn"
                  onClick={handleDownloadImage}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Baixar Imagem da Evidência</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
