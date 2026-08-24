import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Phone, MessageSquare, Mail, Video, MapPin, PhoneMissed, Calendar, Clock, History, Loader2 } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(255,255,255,0.08)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const tipoIcon = (tipo) => {
  switch ((tipo || '').toLowerCase()) {
    case 'ligação': case 'ligacao': return Phone;
    case 'whatsapp': return MessageSquare;
    case 'e-mail': case 'email': return Mail;
    case 'reunião': case 'reuniao': return Video;
    case 'visita': return MapPin;
    default: return Phone;
  }
};

const resultadoColor = (r) => {
  switch (r) {
    case 'Positivo': return '#34d399';
    case 'Neutro': return '#fbbf24';
    case 'Negativo': return '#f87171';
    case 'Sem resposta': return '#8b96a3';
    default: return AURORA.textMuted;
  }
};

const fmtData = (d) => {
  if (!d) return '';
  try {
    const hasTime = d.includes('T');
    const dt = new Date(hasTime ? d : d + 'T00:00:00');
    return dt.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: hasTime ? '2-digit' : undefined, minute: hasTime ? '2-digit' : undefined,
    });
  } catch { return d; }
};

export default function HistoricoInteracoes({ fila }) {
  const [interacoes, setInteracoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const clienteId = fila.cliente_id || fila.ref_id;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    base44.entities.InteracaoCliente.filter({ cliente_id: clienteId }, '-created_date', 50)
      .then(list => { if (alive) setInteracoes(list || []); })
      .catch(() => { if (alive) setInteracoes([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [clienteId, fila.updated_date]);

  const itens = [];
  for (const it of interacoes) {
    itens.push({
      key: 'int-' + it.id,
      tipo: it.tipo,
      descricao: it.descricao,
      resultado: it.resultado,
      data: it.data_interacao || it.created_date,
      dataRaw: it.created_date || it.data_interacao,
      vendedor: it.vendedor_nome,
      agendada: it.status === 'agendada',
      proximo: it.proximo_contato,
    });
  }
  for (let i = 0; i < (fila.historico || []).length; i++) {
    const h = fila.historico[i];
    itens.push({
      key: 'hist-' + i + '-' + (h.data || ''),
      tipo: h.status === 'atendeu' ? 'Ligação' : 'Tentativa',
      descricao: h.observacao || (h.status === 'atendeu' ? 'Atendeu' : 'Não atendeu'),
      resultado: h.status === 'atendeu' ? 'Positivo' : 'Sem resposta',
      data: h.data,
      dataRaw: h.data,
      vendedor: fila.vendedor_nome,
      naoAtendeu: h.status === 'nao_atendeu',
    });
  }
  itens.sort((a, b) => new Date(b.dataRaw || 0).getTime() - new Date(a.dataRaw || 0).getTime());

  return (
    <div className="w-full rounded-2xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4" style={{ color: AURORA.accent }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Histórico de Interações</p>
        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent }}>{itens.length}</span>
      </div>
      {loading ? (
        <div className="py-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>
      ) : itens.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: AURORA.textMuted }}>Nenhuma interação registrada ainda.</p>
      ) : (
        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
          {itens.map(it => {
            const Icon = it.naoAtendeu ? PhoneMissed : tipoIcon(it.tipo);
            const cor = it.naoAtendeu ? '#f87171' : resultadoColor(it.resultado);
            return (
              <div key={it.key} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${AURORA.border}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3 h-3 flex-shrink-0" style={{ color: cor }} />
                  <span className="text-[11px] font-semibold" style={{ color: AURORA.text }}>{it.tipo}</span>
                  {it.agendada && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>Agendada</span>}
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-auto" style={{ background: `${cor}22`, color: cor }}>{it.resultado}</span>
                </div>
                {it.descricao && <p className="text-[11px] mb-1" style={{ color: AURORA.text }}>{it.descricao}</p>}
                <div className="flex items-center gap-3 text-[10px] flex-wrap" style={{ color: AURORA.textMuted }}>
                  {it.data && <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{fmtData(it.data)}</span>}
                  {it.vendedor && <span>· {it.vendedor.split(' ')[0]}</span>}
                  {it.proximo && <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />Próx: {fmtData(it.proximo)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}