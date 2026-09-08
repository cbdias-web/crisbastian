import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const AURORA = {
  accent: '#00D4AA',
  text: '#e6edf3',
  surface: '#1c2333',
  border: 'rgba(0,212,170,0.25)',
};

/**
 * Barra fixa no rodapé que aparece para todos os usuários quando uma nova
 * versão do app é publicada. Ao clicar em "Atualizar agora", a página é recarregada.
 */
export default function BarraNovaVersao() {
  const [novaVersao, setNovaVersao] = useState(null);
  const [dispensada, setDispensada] = useState(false);

  // ID da última versão conhecida — nunca reexibimos o mesmo registro
  const vistaIdRef = useRef(null);
  const VISTO_KEY = 'versao_app_vista_id';
  const marcarVista = (id) => {
    vistaIdRef.current = id;
    try { localStorage.setItem(VISTO_KEY, id); } catch (e) {}
  };

  useEffect(() => {
    let ativo = true;

    // Linha de base: a versão mais recente que já estava publicada quando a
    // página carregou é a versão que este código já é — nunca avisa sobre ela.
    // (Comparação por ID, imune a fuso horário/relógio local.)
    base44.entities.VersaoApp.list('-created_date', 1)
      .then((lista) => {
        if (ativo && lista.length > 0 && vistaIdRef.current === null) {
          vistaIdRef.current = lista[0].id;
        }
      })
      .catch(() => {});

    // Tempo real: avisa APENAS sobre registros criados depois do carregamento
    const unsub = base44.entities.VersaoApp.subscribe((event) => {
      if (!ativo || event?.type !== 'create' || !event.data?.id) return;
      if (vistaIdRef.current === null) {
        // Baseline ainda não carregou: assume como versão atual (evita falso aviso)
        vistaIdRef.current = event.data.id;
        return;
      }
      if (event.data.id === vistaIdRef.current) return;
      try {
        if (localStorage.getItem(VISTO_KEY) === event.data.id) return;
      } catch (e) {}
      vistaIdRef.current = event.data.id;
      setNovaVersao(event.data);
    });

    return () => {
      ativo = false;
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  return (
    <AnimatePresence>
      {novaVersao && !dispensada && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="fixed bottom-0 left-0 right-0 z-[90]"
          style={{
            background: 'linear-gradient(135deg, #0d1117 0%, #123a33 55%, #16213e 100%)',
            borderTop: `1px solid ${AURORA.accent}`,
            boxShadow: '0 -8px 32px rgba(0,212,170,0.25)',
          }}
        >
          <div className="max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,212,170,0.15)', border: `1px solid ${AURORA.border}` }}>
              <Sparkles className="w-4 h-4" style={{ color: AURORA.accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: AURORA.text }}>
                Nova versão disponível!
              </p>
              <p className="text-xs truncate" style={{ color: 'rgba(230,237,243,0.6)' }}>
                {novaVersao.mensagem || 'Atualize a página para receber as melhorias mais recentes.'}
              </p>
            </div>
            <button
              onClick={() => { marcarVista(novaVersao.id); window.location.reload(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition hover:brightness-110 flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${AURORA.accent}, #0099cc)`, color: '#fff' }}>
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar agora
            </button>
            <button
              onClick={() => { marcarVista(novaVersao.id); setDispensada(true); }}
              className="p-2 rounded-lg flex-shrink-0 transition"
              style={{ color: 'rgba(230,237,243,0.5)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,212,170,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              aria-label="Dispensar aviso">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}