import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Megaphone, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ComunicadoModal({ comunicado, user, onClose }) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirmar = async () => {
    setConfirming(true);
    try {
      await base44.entities.ComunicadoLeitura.create({
        comunicado_id: comunicado.id,
        user_id: user.id,
        user_email: user.email,
        lido_em: new Date().toISOString()
      });
    } catch (e) {
      // silently ignore
    }
    setConfirming(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'linear-gradient(90deg, #0f1e35 0%, #1a3150 100%)' }}>
          <div className="p-2 bg-white/15 rounded-xl">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-blue-300/70 uppercase tracking-widest font-medium">Comunicado</p>
            <h3 className="text-base font-bold text-white truncate">{comunicado.titulo}</h3>
          </div>
        </div>

        {/* Corpo */}
        <div className="p-6">
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {comunicado.mensagem}
          </div>
          <p className="text-[10px] text-gray-400 mt-4">
            Publicado em {new Date(comunicado.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleConfirmar}
            disabled={confirming}
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg, #0f1e35 0%, #1a3150 100%)' }}
          >
            {confirming ? 'Registrando...' : 'Li e entendi'}
          </button>
        </div>
      </div>
    </div>
  );
}