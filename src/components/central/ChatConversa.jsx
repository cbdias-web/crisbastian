import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Phone, Sparkles, X, AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

// Horário comercial: seg-sex 08-18 Brasília
function isHorarioComercial() {
  const now = new Date();
  const h = now.getUTCHours() - 3;
  const d = now.getUTCDay();
  return d >= 1 && d <= 5 && h >= 8 && h < 18;
}

function minutosAguardando(conversa) {
  const msgs = conversa.mensagens || [];
  const ultima = msgs[msgs.length - 1];
  if (!ultima || ultima.tipo !== 'recebida') return 0;
  return Math.round((Date.now() - new Date(ultima.timestamp)) / 60000);
}

export default function ChatConversa({ conversa, onClose, onUpdate, isAdmin }) {
  const [mensagens, setMensagens] = useState(conversa.mensagens || []);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [minEspera, setMinEspera] = useState(minutosAguardando(conversa));
  const bottomRef = useRef(null);

  useEffect(() => {
    setMensagens(conversa.mensagens || []);
    setMinEspera(minutosAguardando(conversa));
  }, [conversa.mensagens, conversa.id]);

  useEffect(() => {
    const unsub = base44.entities.ConversaWhatsapp.subscribe((event) => {
      if (event.id === conversa.id && event.data) {
        setMensagens(event.data.mensagens || []);
        setMinEspera(minutosAguardando(event.data));
        onUpdate(event.data);
      }
    });
    return unsub;
  }, [conversa.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  useEffect(() => {
    if (conversa.nao_lidas > 0) {
      base44.entities.ConversaWhatsapp.update(conversa.id, { nao_lidas: 0 });
    }
  }, [conversa.id]);

  // Atualizar timer a cada 60s
  useEffect(() => {
    const t = setInterval(() => setMinEspera(minutosAguardando(conversa)), 60000);
    return () => clearInterval(t);
  }, [conversa]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await base44.functions.invoke('enviarMensagemWhatsapp', {
        conversa_id: conversa.id,
        texto: texto.trim(),
      });
      setTexto('');
      // Atualizar ultima_resposta_gerente_em
      await base44.entities.ConversaWhatsapp.update(conversa.id, {
        ultima_resposta_gerente_em: new Date().toISOString(),
        alerta_sem_resposta: false,
      });
    } catch (err) {
      toast.error('Erro ao enviar: ' + err.message);
    }
    setEnviando(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  const foraHorario = !isHorarioComercial();
  const podeInteragirAdmin = isAdmin && minEspera >= 5;

  return (
    <div className="flex flex-col h-full" style={{ background: AURORA.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
            {conversa.lead_nome?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: AURORA.text }}>{conversa.lead_nome}</p>
            <p className="text-[11px] flex items-center gap-1.5" style={{ color: AURORA.textMuted }}>
              📱 {conversa.telefone}
              {conversa.vendedor_nome && <span style={{ color: 'rgba(230,237,243,0.35)' }}>· {conversa.vendedor_nome}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {minEspera > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: minEspera >= 30 ? 'rgba(239,68,68,0.2)' : minEspera >= 5 ? 'rgba(251,191,36,0.2)' : 'rgba(0,212,170,0.1)', color: minEspera >= 30 ? '#f87171' : minEspera >= 5 ? '#fbbf24' : AURORA.accent }}>
              <Clock className="w-3 h-3" /> {minEspera} min
            </span>
          )}
          {conversa.produto_interesse && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold hidden sm:inline" style={{ background: 'rgba(0,212,170,0.15)', color: AURORA.accent }}>
              {conversa.produto_interesse}
            </span>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: AURORA.textMuted }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {conversa.alerta_sem_resposta && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fbbf24' }} />
          <p className="text-[11px] font-semibold" style={{ color: '#fbbf24' }}>
            ⚠️ Lead aguardando há {minEspera} min sem resposta! {podeInteragirAdmin ? 'Admin pode intervir abaixo.' : 'Responda o quanto antes.'}
          </p>
        </div>
      )}

      {foraHorario && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'rgba(100,100,100,0.15)', border: '1px solid rgba(100,100,100,0.3)' }}>
          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
          <p className="text-[11px]" style={{ color: '#9ca3af' }}>
            🕐 Fora do horário comercial (seg-sex 08h–18h). As mensagens serão respondidas ao reiniciar o expediente.
          </p>
        </div>
      )}

      {/* Histórico de migrações */}
      {conversa.migracoes?.length > 0 && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-[10px] font-bold mb-1 flex items-center gap-1" style={{ color: '#f87171' }}>
            <ArrowRight className="w-3 h-3" /> Histórico de migrações
          </p>
          {conversa.migracoes.map((m, i) => (
            <p key={i} className="text-[10px]" style={{ color: 'rgba(230,237,243,0.5)' }}>
              {m.de_nome} → {m.para_nome} · {new Date(m.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          ))}
        </div>
      )}

      {/* Contexto IA */}
      {conversa.observacao_ia && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-xl flex items-start gap-2" style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)' }}>
          <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: AURORA.accent }} />
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(230,237,243,0.75)' }}>
            <span className="font-bold" style={{ color: AURORA.accent }}>IA: </span>{conversa.observacao_ia}
          </p>
        </div>
      )}

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {mensagens.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="w-8 h-8 mx-auto mb-2" style={{ color: AURORA.textMuted }} />
            <p className="text-sm" style={{ color: AURORA.textMuted }}>Nenhuma mensagem ainda.</p>
          </div>
        ) : (
          mensagens.map((msg, i) => {
            const isSistema = msg.tipo === 'sistema';
            const isEnviada = msg.tipo === 'enviada';
            if (isSistema) {
              return (
                <div key={i} className="flex justify-center">
                  <div className="px-3 py-1.5 rounded-full text-[11px] max-w-[90%] text-center" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}>
                    {msg.texto}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className={`flex ${isEnviada ? 'justify-end' : 'justify-start'}`}>
                {!isEnviada && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 text-[10px] font-bold" style={{ background: '#1c2333', color: AURORA.textMuted }}>
                    {msg.de?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="max-w-[75%]">
                  <div className="px-3 py-2 rounded-2xl text-sm leading-relaxed"
                    style={isEnviada
                      ? { background: 'linear-gradient(135deg, #00D4AA, #00a88a)', color: '#0d1117' }
                      : { background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
                    {msg.texto}
                  </div>
                  <p className="text-[10px] mt-0.5 px-1" style={{ color: AURORA.textMuted, textAlign: isEnviada ? 'right' : 'left' }}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input — admin pode enviar sempre; gerente só em horário comercial ou se há alerta */}
      <div className="px-3 pb-3 pt-2" style={{ borderTop: `1px solid ${AURORA.border}` }}>
        {isAdmin && podeInteragirAdmin && conversa.alerta_sem_resposta && (
          <p className="text-[10px] mb-2 text-center font-semibold" style={{ color: '#fbbf24' }}>
            👤 Admin: intervenção disponível — lead aguardando há {minEspera} min
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={foraHorario && !isAdmin ? 'Fora do horário comercial — respostas serão enviadas quando o expediente reiniciar...' : 'Digite sua mensagem... (Enter para enviar)'}
            rows={2}
            className="flex-1 px-3 py-2 rounded-xl text-sm resize-none focus:outline-none"
            style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}
          />
          <button onClick={enviar} disabled={enviando || !texto.trim()}
            className="flex items-center justify-center w-10 h-10 self-end rounded-xl transition disabled:opacity-40"
            style={{ background: AURORA.accent, color: '#0d1117' }}>
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}