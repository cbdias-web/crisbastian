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
  const carregadoEm = useRef(Date.now());
  const [novaVersao, setNovaVersao] = useState(null);
  const [dispensada, setDispensada] = useState(false);

  // Marca a versão como vista (atualizada/dispensada) para nunca reexibi-la
  const VISTO_KEY = 'versao_app_vista_id';
  const marcarVista = (id) => {
    try { localStorage.setItem(VISTO_KEY, id); } catch (e) {}
  };

  useEffect(() => {
    let ativo = true;

    const verificar = (versao) => {
      if (!versao || !ativo) return;
      // Versão já vista/atualizada por este usuário → não mostrar novamente
      try {
        if (localStorage.getItem(VISTO_KEY) === versao.id) return;
      } catch (e) {}
      const criadaEm = versao.created_date ? new Date(versao.created_date).getTime() : 0;
      // Só avisa se a versão foi publicada DEPOIS de a página atual ter sido carregada
      if (criadaEm > carregadoEm.current) setNovaVersao(versao);
    };

    // Checagem inicial (cobertura caso a publicação aconteça antes do subscribe conectar)
    base44.entities.VersaoApp.list('-created_date', 1)
      .then((lista) => { if (lista.length > 0) verificar(lista[0]); })
      .catch(() => {});

    // Tempo real: nova publicação dispara o aviso na hora
    const unsub = base44.entities.VersaoApp.subscribe((event) => {
      if (event?.type === 'create' && event.data) verificar(event.data);
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