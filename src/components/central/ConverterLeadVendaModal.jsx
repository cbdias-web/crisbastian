import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Loader2, CheckCircle2, DollarSign, FileText, UserCheck, Package, User, AlertTriangle } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  danger: '#f87171',
  purple: '#a78bfa',
  green: '#34d399',
};

const today = () => new Date().toISOString().split('T')[0];

export default function ConverterLeadVendaModal({ conversa, onClose, onConcluido }) {
  const [valor, setValor] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [data, setData] = useState(today());
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const produto = conversa.produto_interesse || '';
  const temIndicador = !!(conversa.origem && conversa.origem.startsWith('Indicação · '));
  const nomeIndicador = temIndicador ? conversa.origem.replace('Indicação · ', '').trim() : '';

  const podeConverter = produto && cpfCnpj.trim();

  const handleConverter = async () => {
    if (!produto) { toast.error('Lead sem produto de interesse. Classifique o lead primeiro.'); return; }
    if (!cpfCnpj.trim()) { toast.error('Informe o CPF/CNPJ do cliente'); return; }
    setSalvando(true);
    try {
      const res = await base44.functions.invoke('converterLeadVenda', {
        conversa_id: conversa.id,
        valor: valor ? Number(valor.toString().replace(',', '.')) : 0,
        cpf_cnpj: cpfCnpj.trim(),
        data,
      });
      const data2 = res.data || res;
      if (data2.error) { toast.error(data2.error); setSalvando(false); return; }
      setResultado({
        cliente_id: data2.cliente_id,
        contrato_id: data2.contrato_id,
        venda_id: data2.venda_id,
        indicador: data2.indicador,
      });
      toast.success('Lead convertido em Cliente, Contrato e Venda!');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Erro ao converter';
      toast.error(msg);
    }
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.15)' }}>
              <DollarSign className="w-4 h-4" style={{ color: AURORA.green }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: AURORA.text }}>Converter Lead em Venda</p>
              <p className="text-[11px]" style={{ color: AURORA.textMuted }}>{conversa.lead_nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
        </div>

        {resultado ? (
          /* ─── Sucesso ─── */
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: AURORA.green }} />
            </div>
            <h3 className="text-base font-bold mb-2" style={{ color: AURORA.text }}>Conversão concluída!</h3>
            <p className="text-sm mb-4" style={{ color: AURORA.textMuted }}>
              O lead foi transformado em cliente, contrato e venda — respeitando o produto de origem e o indicador como espelhamento.
            </p>
            <div className="grid grid-cols-1 gap-2 text-left mb-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <UserCheck className="w-4 h-4" style={{ color: AURORA.green }} />
                <span className="text-xs" style={{ color: AURORA.text }}>Cliente criado</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <FileText className="w-4 h-4" style={{ color: AURORA.purple }} />
                <span className="text-xs" style={{ color: AURORA.text }}>Contrato criado (produto: {produto})</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <DollarSign className="w-4 h-4" style={{ color: AURORA.accent }} />
                <span className="text-xs" style={{ color: AURORA.text }}>Venda registrada</span>
              </div>
              {resultado.indicador && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)' }}>
                  <User className="w-4 h-4" style={{ color: AURORA.purple }} />
                  <span className="text-xs" style={{ color: AURORA.purple }}>Indicador {resultado.indicador.nome} ({resultado.indicador.percentual}%) no espelhamento</span>
                </div>
              )}
            </div>
            <button onClick={() => { onConcluido?.(); onClose?.(); }}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: AURORA.accent, color: '#0d1117' }}>
              Concluir
            </button>
          </div>
        ) : (
          /* ─── Formulário ─── */
          <div className="p-5 space-y-3">
            {/* Resumo do lead */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <p className="text-[10px] uppercase tracking-wider mb-0.5 flex items-center gap-1" style={{ color: AURORA.textMuted }}><Package className="w-3 h-3" /> Produto de origem</p>
                <p className="text-sm font-bold" style={{ color: AURORA.accent }}>{produto || '—'}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <p className="text-[10px] uppercase tracking-wider mb-0.5 flex items-center gap-1" style={{ color: AURORA.textMuted }}><User className="w-3 h-3" /> Gerente</p>
                <p className="text-sm font-semibold truncate" style={{ color: AURORA.text }}>{conversa.vendedor_nome || '—'}</p>
              </div>
            </div>

            {/* Indicador detectado */}
            <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: temIndicador ? 'rgba(167,139,250,0.08)' : AURORA.surface2, border: `1px solid ${temIndicador ? 'rgba(167,139,250,0.25)' : AURORA.border}` }}>
              {temIndicador ? (
                <>
                  <User className="w-4 h-4" style={{ color: AURORA.purple }} />
                  <p className="text-xs" style={{ color: AURORA.purple }}>
                    Indicador detectado: <strong>{nomeIndicador}</strong> — será incluído no espelhamento da venda e do contrato.
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" style={{ color: AURORA.textMuted }} />
                  <p className="text-xs" style={{ color: AURORA.textMuted }}>
                    Sem indicador vinculado (origem não é indicação). Venda/contrato serão criados sem espelhamento.
                  </p>
                </>
              )}
            </div>

            {/* Campos */}
            <div>
              <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>CPF / CNPJ do cliente *</label>
              <input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="Somente dígitos"
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Valor da venda (R$)</label>
                <input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" min="0" step="0.01"
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Data</label>
                <input type="date" value={data} onChange={e => setData(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
              </div>
            </div>

            <p className="text-[11px] leading-relaxed" style={{ color: AURORA.textMuted }}>
              Esta ação cria <strong style={{ color: AURORA.green }}>Cliente</strong>, <strong style={{ color: AURORA.purple }}>Contrato</strong> (rascunho, tipo = {produto || '—'}) e <strong style={{ color: AURORA.accent }}>Venda</strong>, e marca o lead como convertido.
            </p>

            <div className="flex gap-2 pt-1">
              <button onClick={handleConverter} disabled={salvando || !podeConverter}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-40"
                style={{ background: AURORA.green, color: '#0d1117' }}>
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                {salvando ? 'Convertendo...' : 'Converter em Venda'}
              </button>
              <button onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}