import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Download, Mail, Send, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

export default function PreRelatorioModal({ pessoa, role, dataInicio, dataFim, onClose }) {
  const [vendas, setVendas] = useState([]);
  const [comissoes, setComissoes] = useState([]);
  const [bonus, setBonus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailManual, setEmailManual] = useState(pessoa.email || '');

  const isVendedorRole = role === 'vendedor';

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [todasVendas, todasComissoes, todasComissoesEsp] = await Promise.all([
        base44.entities.Venda.list('-data', 2000),
        base44.entities.Comissao.list(),
        base44.entities.ComissaoEspelhamento.list()
      ]);

      const vendasPeriodo = todasVendas.filter(v =>
        (!dataInicio || v.data >= dataInicio) && (!dataFim || v.data <= dataFim)
      );

      let vendasPessoa;
      if (isVendedorRole) {
        vendasPessoa = vendasPeriodo.filter(v => v.vendedor_id === pessoa.id || v.assessor_comercial === pessoa.nome);
      } else {
        vendasPessoa = vendasPeriodo.filter(v =>
          v.indicadores?.some(i => i.id === pessoa.id) ||
          v.espelhamento_id === pessoa.id ||
          v.espelhamento === pessoa.nome
        );
      }

      let comissoesPessoa = [];
      if (isVendedorRole) {
        comissoesPessoa = todasComissoes.filter(c =>
          c.vendedor_id === pessoa.id && c.tipo !== 'bonus' && vendasPessoa.some(v => v.id === c.venda_id)
        );
        const bonusPeriodo = todasComissoes.filter(c => {
          if (c.tipo === 'bonus' && c.vendedor_id === pessoa.id && c.mes_referencia) {
            const mesRef = c.mes_referencia + '-01';
            return (!dataInicio || mesRef >= dataInicio) && (!dataFim || mesRef <= dataFim);
          }
          return false;
        });
        const bonusPorMes = {};
        bonusPeriodo.forEach(b => {
          if (!bonusPorMes[b.mes_referencia]) bonusPorMes[b.mes_referencia] = { mes_referencia: b.mes_referencia, valor_total: 0, pago: b.pago };
          bonusPorMes[b.mes_referencia].valor_total += parseFloat(b.valor_comissao) || 0;
          if (!b.pago) bonusPorMes[b.mes_referencia].pago = false;
        });
        setBonus(Object.values(bonusPorMes));
      } else {
        const comissoesEsp = todasComissoesEsp.filter(c =>
          c.vendedor_id === pessoa.id && vendasPessoa.some(v => v.id === c.venda_id)
        );
        const comissoesVend = todasComissoes.filter(c =>
          c.vendedor_id === pessoa.id && c.tipo !== 'bonus' && vendasPessoa.some(v => v.id === c.venda_id)
        );
        const vendasComEsp = new Set(comissoesEsp.map(c => c.venda_id));
        const comissoesVendExtras = comissoesVend.filter(c => !vendasComEsp.has(c.venda_id));
        comissoesPessoa = [...comissoesEsp, ...comissoesVendExtras];
        setBonus([]);
      }

      setVendas(vendasPessoa);
      setComissoes(comissoesPessoa);
    } catch (e) {
      toast.error('Erro ao carregar dados: ' + e.message);
    }
    setLoading(false);
  };

  const totalVendas = vendas.length;
  const valorVendido = vendas.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
  const totalComissaoVendas = comissoes.reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
  const totalBonus = bonus.reduce((s, b) => s + (parseFloat(b.valor_total) || 0), 0);
  const totalComissao = totalComissaoVendas + totalBonus;
  const comissaoPaga = comissoes.filter(c => c.pago).reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0)
    + bonus.filter(b => b.pago).reduce((s, b) => s + (parseFloat(b.valor_total) || 0), 0);
  const comissaoPendente = totalComissao - comissaoPaga;

  const porProduto = useMemo(() => {
    const grupos = {};
    vendas.forEach(v => {
      const prod = v.produto || 'Sem produto';
      if (!grupos[prod]) grupos[prod] = { qtd: 0, valor: 0, comissao: 0 };
      grupos[prod].qtd++;
      grupos[prod].valor += parseFloat(v.valor) || 0;
      const comissao = comissoes.find(c => c.venda_id === v.id);
      if (comissao) grupos[prod].comissao += parseFloat(comissao.valor_comissao) || 0;
    });
    return Object.entries(grupos).sort((a, b) => b[1].valor - a[1].valor);
  }, [vendas, comissoes]);

  const handleGerarPDF = async () => {
    setGerandoPDF(true);
    try {
      const payload = isVendedorRole
        ? { vendedores_ids: [pessoa.id], indicadores_ids: [], dataInicio, dataFim }
        : { vendedores_ids: [], indicadores_ids: [pessoa.id], dataInicio, dataFim };
      const response = await base44.functions.invoke('gerarRelatorioComissoes', payload);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${pessoa.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório PDF gerado!');
    } catch (e) {
      toast.error('Erro ao gerar PDF: ' + (e.response?.data?.error || e.message));
    }
    setGerandoPDF(false);
  };

  const handleEnviarEmail = async () => {
    const email = (pessoa.email || emailManual || '').trim();
    if (!email || !email.includes('@')) {
      toast.error('Informe um e-mail válido');
      return;
    }
    setEnviandoEmail(true);
    try {
      await base44.functions.invoke('enviarRelatorioPorEmail', {
        tipo: isVendedorRole ? 'vendedor' : 'indicador',
        vendedor_id: pessoa.id,
        vendedor_nome: pessoa.nome,
        vendedor_email: email,
        dataInicio,
        dataFim
      });
      toast.success(`Relatório enviado para ${email}`);
    } catch (e) {
      toast.error('Erro ao enviar: ' + (e.response?.data?.error || e.message));
    }
    setEnviandoEmail(false);
  };

  const semDados = vendas.length === 0 && bonus.length === 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.18)' }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(0,212,170,0.15)', background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 60%, #16213e 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
              {pessoa.nome?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: '#e6edf3' }}>{pessoa.nome}</h3>
              <p className="text-xs" style={{ color: 'rgba(230,237,243,0.55)' }}>
                {role === 'vendedor' ? 'Vendedor' : 'Indicador'} · {fmtDate(dataInicio)} a {fmtDate(dataFim)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition hover:bg-white/10" style={{ color: 'rgba(230,237,243,0.55)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00D4AA' }} />
          </div>
        ) : semDados ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <TrendingUp className="w-10 h-10 mb-3" style={{ color: 'rgba(0,212,170,0.3)' }} />
            <p className="text-sm font-medium" style={{ color: '#8b96a3' }}>Nenhuma venda ou comissão no período selecionado</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(0,212,170,0.15)' }}>
              {[
                { label: 'Total Vendas', value: String(totalVendas), color: '#e6edf3' },
                { label: 'Valor Vendido', value: fmt(valorVendido), color: '#e6edf3' },
                { label: 'Comissão Total', value: fmt(totalComissao), color: '#00D4AA' },
                { label: 'Pendente', value: fmt(comissaoPendente), color: '#fbbf24' },
              ].map(k => (
                <div key={k.label} className="rounded-xl p-3" style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.1)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#8b96a3' }}>{k.label}</p>
                  <p className="text-lg font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Product breakdown */}
            {porProduto.length > 0 && (
              <div className="px-6 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(0,212,170,0.1)' }}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#00D4AA' }}>Por Produto</h4>
                <div className="space-y-1">
                  {porProduto.map(([prod, dados]) => (
                    <div key={prod} className="flex items-center justify-between p-2 rounded-lg" style={{ background: '#1c2333' }}>
                      <span className="text-sm font-medium" style={{ color: '#e6edf3' }}>{prod}</span>
                      <div className="flex gap-4 text-xs">
                        <span style={{ color: '#8b96a3' }}>{dados.qtd}x</span>
                        <span style={{ color: '#e6edf3', minWidth: '100px', textAlign: 'right' }}>{fmt(dados.valor)}</span>
                        <span style={{ color: '#00D4AA', minWidth: '100px', textAlign: 'right' }}>{fmt(dados.comissao)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed vendas table */}
            <div className="flex-1 overflow-auto px-6 pb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 mt-3" style={{ color: '#00D4AA' }}>Detalhamento por Venda</h4>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: '#0d1117' }}>
                    {['Cliente', 'Produto', 'Data', 'Valor', '% Com.', 'Comissão', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8b96a3' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendas.map(v => {
                    const comissao = comissoes.find(c => c.venda_id === v.id);
                    return (
                      <tr key={v.id} className="hover:bg-white/5 transition" style={{ borderBottom: '1px solid rgba(0,212,170,0.08)' }}>
                        <td className="px-3 py-2" style={{ color: '#e6edf3' }}>{v.cliente || '—'}</td>
                        <td className="px-3 py-2" style={{ color: '#adbac7' }}>{v.produto || '—'}</td>
                        <td className="px-3 py-2" style={{ color: '#8b96a3' }}>{fmtDate(v.data)}</td>
                        <td className="px-3 py-2 font-semibold" style={{ color: '#e6edf3' }}>{fmt(v.valor)}</td>
                        <td className="px-3 py-2" style={{ color: '#8b96a3' }}>{comissao ? (comissao.percentual || 0).toFixed(1) + '%' : '—'}</td>
                        <td className="px-3 py-2 font-semibold" style={{ color: '#00D4AA' }}>{comissao ? fmt(comissao.valor_comissao) : '—'}</td>
                        <td className="px-3 py-2">
                          {comissao ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{
                              background: comissao.pago ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                              color: comissao.pago ? '#34d399' : '#fbbf24'
                            }}>{comissao.pago ? 'Pago' : 'Pendente'}</span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {bonus.map((b, idx) => (
                    <tr key={`bonus-${idx}`} className="hover:bg-white/5 transition" style={{ borderBottom: '1px solid rgba(0,212,170,0.08)' }}>
                      <td className="px-3 py-2" style={{ color: '#e6edf3' }} colSpan={3}>Bônus por Meta — {b.mes_referencia}</td>
                      <td className="px-3 py-2" style={{ color: '#8b96a3' }}>—</td>
                      <td className="px-3 py-2" style={{ color: '#8b96a3' }}>—</td>
                      <td className="px-3 py-2 font-semibold" style={{ color: '#00D4AA' }}>{fmt(b.valor_total)}</td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{
                          background: b.pago ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                          color: b.pago ? '#34d399' : '#fbbf24'
                        }}>{b.pago ? 'Pago' : 'Pendente'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer with actions */}
            <div className="px-6 py-4 flex flex-wrap items-center gap-3 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(0,212,170,0.15)', background: '#0d1117' }}>
              <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#8b96a3' }} />
                <input
                  type="email"
                  value={emailManual}
                  onChange={e => setEmailManual(e.target.value)}
                  placeholder={pessoa.email ? pessoa.email : "Digite o e-mail para envio"}
                  className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.2)', color: '#e6edf3' }}
                />
              </div>
              <button onClick={handleEnviarEmail} disabled={enviandoEmail || semDados}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition disabled:opacity-50"
                style={{ background: 'rgba(59,130,249,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,249,0.3)' }}>
                {enviandoEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar por E-mail
              </button>
              <button onClick={handleGerarPDF} disabled={gerandoPDF || semDados}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
                {gerandoPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Gerar PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}