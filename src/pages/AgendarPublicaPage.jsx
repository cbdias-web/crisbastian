import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, CalendarCheck, Video, Clock } from 'lucide-react';

const A = { bg: '#0d1117', surface: '#161b22', surface2: '#1c2333', border: 'rgba(0,212,170,0.2)', accent: '#00D4AA', text: '#e6edf3', muted: 'rgba(230,237,243,0.6)' };
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

// Página pública: o lead escolhe o horário da reunião com o gerente (Google Calendar + Meet).
export default function AgendarPublicaPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [erro, setErro] = useState('');
  const [dia, setDia] = useState('');
  const [slot, setSlot] = useState(null);
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(null);

  useEffect(() => {
    document.title = 'Agendar reunião — Villela Exchange';
    base44.functions.invoke('agendamentoPublico', { action: 'info', token })
      .then(r => { const d = r?.data || r; if (d?.error) setErro(d.error); else { setInfo(d); if (d.agendado) setOk({ quando: d.quando, meet_link: d.meet_link, gerente: d.gerente }); } })
      .catch(e => setErro(e?.response?.data?.error || 'Link inválido ou expirado.'));
  }, [token]);

  const porDia = useMemo(() => { const m = {}; for (const s of info?.slots || []) (m[s.data] = m[s.data] || []).push(s); return m; }, [info]);
  useEffect(() => { if (!dia && Object.keys(porDia).length) setDia(Object.keys(porDia)[0]); }, [porDia, dia]);

  const confirmar = async () => {
    if (!slot) return;
    setEnviando(true); setErro('');
    try {
      const r = await base44.functions.invoke('agendamentoPublico', { action: 'agendar', token, slot: slot.iso, email: email.trim() });
      const d = r?.data || r; if (d?.error) throw new Error(d.error);
      setOk(d);
    } catch (e) { setErro(e?.response?.data?.error || e.message); }
    setEnviando(false);
  };
  const fmtQuando = (iso) => { const d = new Date(iso); return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }); };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: A.bg, color: A.text }}>
      <div className="w-full max-w-lg rounded-3xl p-6" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
        <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: A.accent }}>Villela Exchange</p>
        {!info && !erro && <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: A.accent }} /></div>}
        {erro && !ok && <p className="text-sm rounded-xl p-3 mb-3" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{erro}</p>}

        {ok && (
          <div className="text-center py-6">
            <CalendarCheck className="w-12 h-12 mx-auto mb-3" style={{ color: '#34d399' }} />
            <h1 className="text-lg font-bold mb-1">Reunião confirmada!</h1>
            <p className="text-sm" style={{ color: A.muted }}>com {ok.gerente}</p>
            {ok.quando && <p className="text-sm font-semibold mt-2 capitalize">{fmtQuando(ok.quando)}</p>}
            {ok.meet_link ? <a href={ok.meet_link} className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: A.accent, color: '#0d1117' }}><Video className="w-4 h-4" /> Link do Google Meet</a>
              : <p className="text-xs mt-3" style={{ color: A.muted }}>O gerente enviará o link da reunião.</p>}
          </div>
        )}

        {info && !ok && !info.agendado && (
          <>
            <h1 className="text-lg font-bold">Olá, {String(info.lead || '').split(' ')[0]}!</h1>
            <p className="text-sm mb-4" style={{ color: A.muted }}>Escolha o melhor horário para conversar com {info.gerente} ({info.duracao_min} min, por vídeo).</p>
            {Object.keys(porDia).length === 0 ? <p className="text-sm" style={{ color: A.muted }}>Não há horários livres nos próximos dias. Responda ao gerente para combinar.</p> : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                  {Object.keys(porDia).map(d => { const w = new Date(`${d}T12:00:00`).getDay(); return (
                    <button key={d} onClick={() => { setDia(d); setSlot(null); }} className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap capitalize" style={{ background: dia === d ? A.accent : A.surface2, color: dia === d ? '#0d1117' : A.text }}>{DIAS[w]} {d.split('-').reverse().slice(0, 2).join('/')}</button>); })}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                  {(porDia[dia] || []).map(s => (
                    <button key={s.iso} onClick={() => setSlot(s)} className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1" style={{ background: slot?.iso === s.iso ? A.accent : A.surface2, color: slot?.iso === s.iso ? '#0d1117' : A.text, border: `1px solid ${A.border}` }}><Clock className="w-3 h-3" />{s.hora}</button>
                  ))}
                </div>
                <label className="text-[11px] block mb-1" style={{ color: A.muted }}>Seu e-mail (opcional — para receber o convite do Google Agenda)</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="voce@empresa.com" className="w-full px-3 py-2.5 rounded-xl text-sm mb-4 focus:outline-none" style={{ background: A.surface2, color: A.text, border: `1px solid ${A.border}` }} />
                <button onClick={confirmar} disabled={!slot || enviando} className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: A.accent, color: '#0d1117' }}>{enviando && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar horário</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
