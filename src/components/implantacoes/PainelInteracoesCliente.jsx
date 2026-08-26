import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Phone, MessageSquare, Mail, Video, MapPin, PhoneMissed, Calendar, Clock,
  History, Loader2, Plus, Send, X,
} from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.1)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  warning: '#fbbf24',
  green: '#34d399',
  danger: '#f87171',
  purple: '#a78bfa',
};

const TIPOS = ['Ligação', 'WhatsApp', 'E-mail', 'Reunião', 'Visita', 'Outro'];
const RESULTADOS = ['Positivo', 'Neutro', 'Negativo', 'Sem resposta'];

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

/**
 * Painel reutilizável de interações com o cliente/lead.
 * Resolve o vínculo por cliente_id; quando ausente, procura por cpf_cnpj
 * (e fallback por nome) para que o histórico acompanhe o cliente em
 * toda a jornada — Implantações, Fila de Contatos, Dash Parceiro, etc.
 *
 * Props:
 *  - clienteId, clienteNome, cpfCnpj: dados do vínculo
 *  - vendedorId, vendedorNome: autor da interação (defaults ao user logado)
 *  - user: usuário logado (base44.auth.me())
 *  - onVincularClienteId(id): callback opcional para persistir o cliente_id
 *    resolvido na entidade pai (ex.: Implantacao.cliente_id)
 *  - title: título do painel (default "Interações com o Cliente")
 *  - compact: layout mais denso
 */
export default function PainelInteracoesCliente({
  clienteId, clienteNome, cpfCnpj,
  vendedorId, vendedorNome, user,
  onVincularClienteId, title = 'Interações com o Cliente', compact = false,
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    tipo: 'Ligação',
    descricao: '',
    resultado: 'Positivo',
    data_interacao: new Date().toISOString().split('T')[0],
    proximo_contato: '',
  });

  // Resolve o cliente_id efetivo: usa o passado ou procura por cpf_cnpj / nome.
  const { data: resolved, isLoading: loadingResolve } = useQuery({
    queryKey: ['resolve-cliente-id', clienteId || 'none', cpfCnpj || 'none', clienteNome || 'none'],
    queryFn: async () => {
      if (clienteId) return { cliente_id: clienteId, nome: clienteNome };
      // Procura por CPF/CNPJ
      if (cpfCnpj) {
        try {
          const cs = await base44.entities.Cliente.filter({ cpf_cnpj: cpfCnpj });
          if (cs.length > 0) {
            return { cliente_id: cs[0].id, nome: cs[0].nome || clienteNome };
          }
        } catch {}
      }
      // Fallback por nome (interações registradas antes da conversão em Cliente)
      return { cliente_id: null, nome: clienteNome };
    },
    staleTime: 60_000,
  });

  const resolvedId = resolved?.cliente_id || null;
  const resolvedNome = resolved?.nome || clienteNome;

  // Persiste o cliente_id resolvido na entidade pai (uma única vez)
  useEffect(() => {
    if (resolvedId && onVincularClienteId && resolvedId !== clienteId) {
      onVincularClienteId(resolvedId);
    }
  }, [resolvedId, clienteId, onVincularClienteId]);

  const { data: interacoes = [], isLoading } = useQuery({
    queryKey: ['interacoes-cliente', resolvedId || 'none', resolvedNome || 'none'],
    queryFn: async () => {
      let list = [];
      if (resolvedId) {
        try { list = await base44.entities.InteracaoCliente.filter({ cliente_id: resolvedId }, '-data_interacao', 60); } catch {}
      }
      // Fallback por nome (pré-conversão)
      if (resolvedNome && resolvedNome.trim().length >= 3) {
        try {
          const porNome = await base44.entities.InteracaoCliente.filter({ cliente_nome: resolvedNome.trim() }, '-data_interacao', 60);
          const seen = new Set(list.map(i => i.id));
          for (const it of porNome) if (!seen.has(it.id)) { list.push(it); seen.add(it.id); }
          list.sort((a, b) => new Date(b.data_interacao || b.created_date || 0) - new Date(a.data_interacao || a.created_date || 0));
        } catch {}
      }
      return list;
    },
    enabled: !loadingResolve,
    staleTime: 30_000,
  });

  const registrar = async () => {
    if (!form.descricao.trim()) { toast.error('Descreva a interação.'); return; }
    if (!form.data_interacao) { toast.error('Informe a data da interação.'); return; }
    setSalvando(true);
    try {
      const vid = vendedorId || '';
      const vnome = vendedorNome || user?.full_name || user?.email || 'Sistema';
      const payload = {
        cliente_id: resolvedId || ('nomatch:' + (resolvedNome || cpfCnpj || '')),
        cliente_nome: resolvedNome || '',
        vendedor_id: vid,
        vendedor_nome: vnome,
        tipo: form.tipo,
        descricao: form.descricao.trim(),
        resultado: form.resultado,
        data_interacao: form.data_interacao,
        proximo_contato: form.proximo_contato || null,
        status: form.proximo_contato ? 'agendada' : 'realizada',
      };
      await base44.entities.InteracaoCliente.create(payload);
      queryClient.invalidateQueries({ queryKey: ['interacoes-cliente'] });
      queryClient.invalidateQueries({ queryKey: ['detalhe-jornada-indicacao'] });
      setForm({
        tipo: 'Ligação', descricao: '', resultado: 'Positivo',
        data_interacao: new Date().toISOString().split('T')[0], proximo_contato: '',
      });
      setShowForm(false);
      toast.success('Interação registrada!');
    } catch (e) {
      toast.error('Erro ao registrar: ' + (e?.message || e));
    }
    setSalvando(false);
  };

  return (
    <div className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <History className="w-3.5 h-3.5" style={{ color: AURORA.accent }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>{title}</p>
        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: AURORA.accentDim, color: AURORA.accent }}>{interacoes.length}</span>
        <button onClick={() => setShowForm(p => !p)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition"
          style={{ background: showForm ? AURORA.surface : AURORA.accentDim, color: showForm ? AURORA.textMuted : AURORA.accent, border: `1px solid ${AURORA.border}` }}>
          {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />} {showForm ? 'Fechar' : 'Registrar'}
        </button>
      </div>

      {/* Formulário de nova interação */}
      {showForm && (
        <div className="rounded-lg p-3 mb-3 space-y-2" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: AURORA.textMuted }}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full text-xs px-2 py-1.5 rounded-lg focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: AURORA.textMuted }}>Resultado</label>
              <select value={form.resultado} onChange={e => setForm(f => ({ ...f, resultado: e.target.value }))}
                className="w-full text-xs px-2 py-1.5 rounded-lg focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                {RESULTADOS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: AURORA.textMuted }}>Data</label>
              <input type="date" value={form.data_interacao} onChange={e => setForm(f => ({ ...f, data_interacao: e.target.value }))}
                className="w-full text-xs px-2 py-1.5 rounded-lg focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: AURORA.textMuted }}>Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Descreva o contato / atualização..." rows={2}
              className="w-full text-xs px-2 py-1.5 rounded-lg focus:outline-none resize-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: AURORA.textMuted }}>Próximo contato (opcional)</label>
              <input type="date" value={form.proximo_contato} onChange={e => setForm(f => ({ ...f, proximo_contato: e.target.value }))}
                className="w-full text-xs px-2 py-1.5 rounded-lg focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            </div>
            <div className="flex items-end">
              <button onClick={registrar} disabled={salvando}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#00D4AA,#0066cc)', color: '#fff' }}>
                {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Salvar Interação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de interações */}
      {isLoading ? (
        <div className="py-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>
      ) : interacoes.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: AURORA.textMuted }}>Nenhuma interação registrada ainda.</p>
      ) : (
        <div className={`space-y-2 ${compact ? 'max-h-[200px]' : 'max-h-[300px]'} overflow-y-auto pr-1`}>
          {interacoes.map(it => {
            const Icon = tipoIcon(it.tipo);
            const cor = resultadoColor(it.resultado);
            const agendada = it.status === 'agendada';
            return (
              <div key={it.id} className="rounded-lg p-2.5" style={{ background: 'rgba(0,212,170,0.03)', border: `1px solid ${AURORA.border}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3 h-3 flex-shrink-0" style={{ color: cor }} />
                  <span className="text-[11px] font-semibold" style={{ color: AURORA.text }}>{it.tipo}</span>
                  {agendada && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>Agendada</span>}
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-auto" style={{ background: `${cor}22`, color: cor }}>{it.resultado || '—'}</span>
                </div>
                {it.descricao && <p className="text-[11px] mb-1" style={{ color: AURORA.text }}>{it.descricao}</p>}
                <div className="flex items-center gap-3 text-[10px] flex-wrap" style={{ color: AURORA.textMuted }}>
                  {it.data_interacao && <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{fmtData(it.data_interacao)}</span>}
                  {it.vendedor_nome && <span>· {it.vendedor_nome.split(' ')[0]}</span>}
                  {it.proximo_contato && <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />Próx: {fmtData(it.proximo_contato)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}