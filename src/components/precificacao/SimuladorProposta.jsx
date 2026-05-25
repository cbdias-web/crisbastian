/**
 * Simulador genérico para produtos do tipo Dolarize, Offshore e Canal Bancário.
 * Recebe configKey ('dolarize') e productName.
 */
import { useState, useEffect } from 'react';
import { Copy, CheckCircle, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { loadConfig, clamp, fmtBRL, fmtNum } from './usePrecificacaoConfig';
import ClienteSelector from './ClienteSelector';
import { toast } from 'sonner';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, prefix, step = 1, min }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
      <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} step={step} min={min}
        className={`w-full border border-gray-200 rounded-lg py-2 text-sm ${prefix ? 'pl-10' : 'pl-3'} pr-3 focus:outline-none focus:border-amber-400 bg-white`} />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function PropostaCard({ titulo, tag, tagColor, items, onCopiar, copied, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100" style={{ background: `${color}08` }}>
        <h3 className="font-bold text-gray-900 text-sm">{titulo}</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${tagColor}`}>{tag}</span>
      </div>
      <div className="p-5 space-y-2">
        {items.map((item, i) => item && (
          <div key={i} className={`flex justify-between items-center py-2 px-3 rounded-lg ${item.highlight ? 'bg-gray-50 border border-gray-100' : ''}`}>
            <span className="text-xs text-gray-500">{item.label}</span>
            <span className={`text-sm font-bold ${item.highlight ? 'text-gray-900' : 'text-gray-700'}`}>{item.value}</span>
          </div>
        ))}
      </div>
      <div className="px-5 pb-5">
        <button onClick={onCopiar}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition text-white"
          style={{ background: color }}>
          {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado!' : 'Copiar Proposta'}
        </button>
      </div>
    </div>
  );
}

export default function SimuladorProposta({ configKey, productName }) {
  const [cfg, setCfg] = useState(loadConfig);
  const [faturamento, setFaturamento] = useState(50000);
  const [divida, setDivida] = useState(200000);
  const [p1Adesao, setP1Adesao] = useState(0);
  const [p1Mensalidade, setP1Mensalidade] = useState(0);
  const [p1Rate, setP1Rate] = useState(0);
  const [p2Adesao, setP2Adesao] = useState(0);
  const [p2Mensalidade, setP2Mensalidade] = useState(0);
  const [p2Rate, setP2Rate] = useState(0);
  const [cliente, setCliente] = useState('');
  const [entradaPerc, setEntradaPerc] = useState(50);
  const [nParcelas, setNParcelas] = useState(3);
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);

  useEffect(() => { setCfg(loadConfig()); }, []);

  useEffect(() => {
    const d = cfg[configKey];
    if (!d) return;
    setP1Adesao(Math.round(clamp(faturamento * d.p1AdesaoPerc / 100, d.p1Piso, d.p1Teto)));
    setP1Mensalidade(d.p1Mensalidade);
    setP1Rate(d.p1Rate);
  }, [faturamento, cfg, configKey]);

  useEffect(() => {
    const d = cfg[configKey];
    if (!d) return;
    const sgRow = cfg.sg.tabelaExito.filter(r => divida >= r.min).sort((a, b) => b.min - a.min)[0];
    setP2Adesao(Math.round(clamp(faturamento * d.p2AdesaoPerc / 100, d.p2Piso, d.p2Teto)));
    setP2Mensalidade(Math.round(sgRow ? sgRow.mensalidade : d.p1Mensalidade));
    setP2Rate(d.p2Rate);
  }, [faturamento, divida, cfg, configKey]);

  const p1Entrada = Math.round(p1Adesao * entradaPerc / 100);
  const p1Parcela = nParcelas > 0 ? Math.round((p1Adesao - p1Entrada) / nParcelas) : 0;
  const p2Entrada = Math.round(p2Adesao * entradaPerc / 100);
  const p2Parcela = nParcelas > 0 ? Math.round((p2Adesao - p2Entrada) / nParcelas) : 0;
  const p1LTV12 = p1Adesao + p1Mensalidade * 12;
  const p2LTV12 = p2Adesao + p2Mensalidade * 12;
  const reducaoMensal = Math.round(divida * (p1Rate / 100) * 0.6);

  const entradaStr = (adesao, entrada, parcela) => entradaPerc >= 100
    ? `Pagamento à vista: ${fmtBRL(adesao)}`
    : `Entrada (${entradaPerc}%): ${fmtBRL(entrada)}\nSaldo em ${nParcelas}x de ${fmtBRL(parcela)}`;

  function gerarTextoP1() {
    return `PROPOSTA ${productName.toUpperCase()} — PADRÃO\nCliente: ${cliente || '[Cliente]'}\n${'─'.repeat(40)}\nFaturamento Mensal: ${fmtBRL(faturamento)}\nDívida Total: ${fmtBRL(divida)}\n\nProposta 1 — Sem Seguro Garantia\nAdesão: ${fmtBRL(p1Adesao)}\n${entradaStr(p1Adesao, p1Entrada, p1Parcela)}\nMensalidade: ${fmtBRL(p1Mensalidade)}/mês\nTaxa Rate: ${fmtNum(p1Rate)}% a.m.\n\nInvestimento Total (12 meses): ${fmtBRL(p1LTV12)}\n${'─'.repeat(40)}\nProposta gerada via Simulador — Villela Exchange`;
  }

  function gerarTextoP2() {
    return `PROPOSTA ${productName.toUpperCase()} — COM SEGURO GARANTIA\nCliente: ${cliente || '[Cliente]'}\n${'─'.repeat(40)}\nFaturamento Mensal: ${fmtBRL(faturamento)}\nDívida Total: ${fmtBRL(divida)}\n\nProposta 2 — Com Seguro Garantia\nAdesão: ${fmtBRL(p2Adesao)}\n${entradaStr(p2Adesao, p2Entrada, p2Parcela)}\nMensalidade (vinculada ao Seguro): ${fmtBRL(p2Mensalidade)}/mês\nTaxa Rate Alvo: ${fmtNum(p2Rate)}% a.m.\n\nInvestimento Total (12 meses): ${fmtBRL(p2LTV12)}\n${'─'.repeat(40)}\nProposta gerada via Simulador — Villela Exchange`;
  }

  async function copiar(texto, setC) {
    await navigator.clipboard.writeText(texto);
    setC(true); toast.success('Proposta copiada!');
    setTimeout(() => setC(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Dados */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">1. Dados do Contrato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Faturamento Mensal (R$)">
            <NumInput value={faturamento} onChange={setFaturamento} prefix="R$" />
          </Field>
          <Field label="Dívida Total (R$)">
            <NumInput value={divida} onChange={setDivida} prefix="R$" />
          </Field>
          <Field label="Cliente / Empresa">
            <ClienteSelector value={cliente} onChange={setCliente} />
          </Field>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard icon={Wallet} label="Adesão P1" value={fmtBRL(p1Adesao)} sub={`Entrada: ${fmtBRL(p1Entrada)}`} color="#b45309" />
        <MetricCard icon={Calendar} label="Mensalidade P1" value={fmtBRL(p1Mensalidade) + '/mês'} sub={`Rate: ${fmtNum(p1Rate)}%`} color="#b45309" />
        <MetricCard icon={Wallet} label="Adesão P2" value={fmtBRL(p2Adesao)} sub={`Entrada: ${fmtBRL(p2Entrada)}`} color="#047857" />
        <MetricCard icon={TrendingDown} label="Redução mensal estimada" value={fmtBRL(reducaoMensal)} sub="vs. juros atuais" color="#1a3a6b" />
      </div>

      {/* Ajuste das propostas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-sm text-gray-900">Proposta 1 — Padrão</h3>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Sem Seguro</span>
          </div>
          <Field label="Valor de Adesão (R$)"><NumInput value={p1Adesao} onChange={setP1Adesao} prefix="R$" /></Field>
          <Field label="Mensalidade (R$/mês)"><NumInput value={p1Mensalidade} onChange={setP1Mensalidade} prefix="R$" /></Field>
          <Field label="Taxa Rate (%)"><NumInput value={p1Rate} onChange={setP1Rate} step={0.1} /></Field>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-sm text-gray-900">Proposta 2 — Com Seguro Garantia</h3>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Com Seguro</span>
          </div>
          <Field label="Valor de Adesão (R$)"><NumInput value={p2Adesao} onChange={setP2Adesao} prefix="R$" /></Field>
          <Field label="Mensalidade vinculada ao Seguro (R$/mês)"><NumInput value={p2Mensalidade} onChange={setP2Mensalidade} prefix="R$" /></Field>
          <Field label="Taxa Rate Alvo (%)"><NumInput value={p2Rate} onChange={setP2Rate} step={0.1} /></Field>
        </div>
      </div>

      {/* Formato e propostas */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">2. Formato de Pagamento</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <Field label="Entrada da Adesão (%)">
            <NumInput value={entradaPerc} onChange={setEntradaPerc} step={5} min={0} />
          </Field>
          <Field label="No. de Parcelas (saldo)">
            <NumInput value={nParcelas} onChange={setNParcelas} min={1} />
          </Field>
          <Field label="Entrada estimada P1 (R$)">
            <div className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm font-semibold text-gray-700">{fmtBRL(p1Entrada)}</div>
          </Field>
        </div>
        {entradaPerc >= 100 && (
          <p className="text-xs text-blue-600 mb-4 bg-blue-50 rounded-lg px-3 py-2">Entrada 100% — proposta gerada como pagamento à vista.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PropostaCard titulo="Proposta 1 — Padrão" tag="Sem Seguro Garantia" tagColor="bg-amber-100 text-amber-700" color="#b45309"
            items={[
              { label: 'Adesão', value: fmtBRL(p1Adesao), highlight: true },
              entradaPerc < 100 ? { label: `Entrada ${entradaPerc}%`, value: fmtBRL(p1Entrada) } : null,
              entradaPerc < 100 ? { label: `${nParcelas}x de`, value: fmtBRL(p1Parcela) } : null,
              { label: 'Mensalidade', value: fmtBRL(p1Mensalidade) + '/mês', highlight: true },
              { label: 'Total (12 meses)', value: fmtBRL(p1LTV12) },
            ].filter(Boolean)}
            onCopiar={() => copiar(gerarTextoP1(), setCopied1)} copied={copied1} />
          <PropostaCard titulo="Proposta 2 — Com Seguro" tag="Com Seguro Garantia" tagColor="bg-emerald-100 text-emerald-700" color="#047857"
            items={[
              { label: 'Adesão', value: fmtBRL(p2Adesao), highlight: true },
              entradaPerc < 100 ? { label: `Entrada ${entradaPerc}%`, value: fmtBRL(p2Entrada) } : null,
              entradaPerc < 100 ? { label: `${nParcelas}x de`, value: fmtBRL(p2Parcela) } : null,
              { label: 'Mensalidade', value: fmtBRL(p2Mensalidade) + '/mês', highlight: true },
              { label: 'Total (12 meses)', value: fmtBRL(p2LTV12) },
            ].filter(Boolean)}
            onCopiar={() => copiar(gerarTextoP2(), setCopied2)} copied={copied2} />
        </div>
      </div>
    </div>
  );
}