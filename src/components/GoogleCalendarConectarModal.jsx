import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Calendar, CheckCircle2 } from 'lucide-react';

const CONNECTOR_ID = '69fb9176f017da4e4ddd9ff8';
const STORAGE_KEY = 'google_calendar_conectado_v1';

// Exporta função utilitária para abrir o modal manualmente
export function abrirModalGoogleCalendar() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('abrir-google-calendar-modal'));
}

export default function GoogleCalendarConectarModal() {
  const [show, setShow] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const handleAbrir = () => setShow(true);
    window.addEventListener('abrir-google-calendar-modal', handleAbrir);
    return () => window.removeEventListener('abrir-google-calendar-modal', handleAbrir);
  }, []);

  useEffect(() => {
    // Só verifica se ainda não foi marcado como conectado nesta sessão
    const jaConectado = localStorage.getItem(STORAGE_KEY);
    if (jaConectado) return;

    // Verifica se o usuário já está conectado tentando chamar a função
    base44.functions.invoke('criarMeetAgenda', { __check_only: true })
      .then(() => {
        // Conseguiu → já conectado
        localStorage.setItem(STORAGE_KEY, '1');
      })
      .catch((e) => {
        const msg = e?.response?.data?.error || e?.message || '';
        // Se o erro é de conexão, mostra o modal
        if (msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('no active') || msg.toLowerCase().includes('not connected')) {
          setShow(true);
        } else {
          // Qualquer outro erro significa que a conexão existe (ex: parâmetros faltando)
          localStorage.setItem(STORAGE_KEY, '1');
        }
      });
  }, []);

  const handleConectar = async () => {
    setConectando(true);
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank', 'width=600,height=700');
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        setConectando(false);
        setConectado(true);
        localStorage.setItem(STORAGE_KEY, '1');
        setTimeout(() => setShow(false), 2000);
      }
    }, 500);
  };

  const handlePularPorAgora = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center" style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 100%)' }}>
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Calendar className="w-7 h-7 text-[#1a73e8]" />
          </div>
          <h2 className="text-lg font-bold text-white">Vincule seu Google Calendar</h2>
          <p className="text-blue-200 text-xs mt-1">Para receber notificações e criar reuniões Meet</p>
        </div>

        <div className="p-6 space-y-4">
          {conectado ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-sm font-semibold text-gray-800">Google Calendar vinculado com sucesso!</p>
              <p className="text-xs text-gray-500 text-center">Você receberá notificações dos seus compromissos.</p>
              <button
                onClick={() => setShow(false)}
                className="mt-2 px-5 py-2 bg-[#0f1e35] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3150] transition"
              >
                Fechar
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {[
                  '🔔 Receba notificações 15 min antes dos compromissos',
                  '📅 Eventos criados automaticamente no seu Google Calendar',
                  '🎥 Gere links Google Meet com um clique',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConectar}
                disabled={conectando}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold rounded-xl transition shadow-md"
              >
                {conectando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/></svg>
                )}
                {conectando ? 'Aguardando autorização...' : 'Conectar com Google'}
              </button>

              <button
                onClick={handlePularPorAgora}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition"
              >
                Pular por agora (não recomendado)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}