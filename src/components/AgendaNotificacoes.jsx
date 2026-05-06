import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const NOTIFICADAS_KEY = 'agenda_notificadas_v1';
const INTERVALO_MS = 60 * 1000; // verifica a cada 1 minuto

function getNotificadas() {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFICADAS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function salvarNotificadas(set) {
  // Mantém apenas as dos últimos 2 dias para não crescer infinitamente
  const arr = [...set].slice(-200);
  localStorage.setItem(NOTIFICADAS_KEY, JSON.stringify(arr));
}

export default function AgendaNotificacoes({ vendedorId }) {
  const vendedorIdRef = useRef(vendedorId);
  vendedorIdRef.current = vendedorId;

  useEffect(() => {
    if (!vendedorId) return;

    // Solicita permissão de notificação do navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const verificar = async () => {
      const vId = vendedorIdRef.current;
      if (!vId) return;

      const agora = new Date();
      const hojeStr = agora.toISOString().split('T')[0];

      let agendas = [];
      try {
        agendas = await base44.entities.AgendaContato.filter({
          vendedor_id: vId,
          data_agendada: hojeStr,
          status: 'pendente',
        });
      } catch {
        return;
      }

      const agendasComHorario = agendas.filter(a => a.horario);
      if (agendasComHorario.length === 0) return;

      const notificadas = getNotificadas();
      let mudou = false;

      for (const agenda of agendasComHorario) {
        const [hh, mm] = agenda.horario.split(':').map(Number);
        const horarioCompromisso = new Date(agora);
        horarioCompromisso.setHours(hh, mm, 0, 0);

        const diffMs = horarioCompromisso - agora;
        const diffMin = diffMs / 60000;

        // Janela: entre 14 e 16 minutos antes (para pegar a verificação do minuto)
        if (diffMin >= 14 && diffMin <= 16) {
          const chave = `${agenda.id}-${hojeStr}`;
          if (!notificadas.has(chave)) {
            notificadas.add(chave);
            mudou = true;

            const msg = `⏰ ${agenda.lead_nome} às ${agenda.horario}`;

            // Toast na tela
            toast(msg, {
              description: 'Compromisso em 15 minutos',
              duration: 10000,
              icon: '📅',
            });

            // Notificação do navegador (se permitida)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Lembrete de Compromisso — Villela Exchange', {
                body: `${agenda.lead_nome} — ${agenda.horario}\nEm 15 minutos`,
                icon: '/favicon.ico',
              });
            }
          }
        }
      }

      if (mudou) salvarNotificadas(notificadas);
    };

    // Verifica imediatamente e depois a cada minuto
    verificar();
    const interval = setInterval(verificar, INTERVALO_MS);
    return () => clearInterval(interval);
  }, [vendedorId]);

  return null; // Componente invisível
}