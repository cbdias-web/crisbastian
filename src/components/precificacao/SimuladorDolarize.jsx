import { useState, useEffect } from 'react';
import { Copy, CheckCircle } from 'lucide-react';
import { loadConfig, clamp, fmtBRL, fmtNum } from './usePrecificacaoConfig';
import { toast } from 'sonner';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, prefix, step = 1, min }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        className={`w-full border border-gray-200 rounded-lg py-2 text-sm ${prefix ? 'pl-10' : 'pl-3'} pr-3 focus:outline-none focus:border-blue-400`}
      />
    </div>
  );
}

function ResultCard({ label, value, sub }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function SimuladorDolarize() {
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

  useEffect(() => {
    setCfg(loadConfig());
  }, []);

  useEffect(() => {
    const d = cfg.dolarize;
    const adesao = clamp(faturamento * d.p1AdesaoPerc / 100, d.p1Piso, d.p1Teto);
    setP1Adesao(Math.round(adesao));
    setP1Mensalidade(d.p1Mensalidade);
    setP1Rate(d.p1Rate);
  }, [faturamento, cfg]);

  useEffect(() => {
    const d = cfg.dolarize;
    const sgRow = cfg.sg.tabelaExito.filter(r => divida >= r.min).sort((a, b) => b.min - a.min)[0];
    const mens = sgRow ? sgRow.mensalidade : d.p1Mensalidade;
    const adesao = clamp(faturamento * d.p2AdesaoPerc / 100, d.p2Piso, d.p2Teto);
    setP2Adesao(Math.round(adesao));
    setP2Mensalidade(Math.round(mens));
    setP2Rate(d.p2Rate);
  }, [faturamento, divida, cfg]);

  const p1EntradaR = Math.round(p1Adesao * entradaPerc / 100);
  const p1SaldoR = p1Adesao - p1EntradaR;
  const p1ParcelaR = nParcelas > 0 ? Math.round(p1SaldoR / nParcelas) : 0;
  const p2EntradaR = Math.round(p2Adesao * entradaPerc / 100);
  const p2SaldoR = p2Adesao - p2EntradaR;
  const p2ParcelaR = nParcelas > 0 ? Math.round(p2SaldoR / nParcelas) : 0;

  function gerarTextoP1() {
    const entradaStr = entradaPerc >= 100
      ? `Pagamento a vista: ${fmtBRL(p1Adesao)}`
      : `Entrada (${entradaPerc}%): ${fmtBRL(p1EntradaR)}\nSaldo em ${nParcelas}x de ${fmtBRL(p1ParcelaR)}`;
    return `Proposta Dolarize -- ${cliente || '[Cliente]'}\n---\nProduto: Dolarize\nFaturamento Mensal: ${fmtBRL(faturamento)}\nDivida Total: ${fmtBRL(divida)}\n\nProposta 1 - Padrao\nValor de Adesao: ${fmtBRL(p1Adesao)}\n${entradaStr}\nMensalidade: ${fmtBRL(p1Mensalidade)}/mes\nTaxa Rate: ${fmtNum(p1Rate)}% a.m.\n---\nProposta gerada via Hub de Precificacao - Villela Exchange`;
  }

  function gerarTextoP2() {
    const entradaStr = entradaPerc >= 100
      ? `Pagamento a vista: ${fmtBRL(p2Adesao)}`
      : `Entrada (${entradaPerc}%): ${fmtBRL(p2EntradaR)}\nSaldo em ${nParcelas}x de ${fmtBRL(p2ParcelaR)}`;
    return `Proposta Dolarize -- ${cliente || '[Cliente]'}\n---\nProduto: Dolarize (com Seguro Garantia)\nFaturamento Mensal: ${fmtBRL(faturamento)}\nDivida Total: ${fmtBRL(divida)}\n\nProposta 2 - Com Seguro Garantia\nValor de Adesao: ${fmtBRL(p2Adesao)}\n${entradaStr}\nMensalidade (vinculada ao Seguro): ${fmtBRL(p2Mensalidade)}/mes\nTaxa Rate Alvo: ${fmtNum(p2Rate)}% a.m.\n---\nProposta gerada via Hub de Precificacao - Villela Exchange`;
  }

  async function copiar(texto, setCopied) {
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    toast.success('Proposta copiada!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">1. Dados do Contrato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Faturamento Mensal (R$)">
            <NumInput value={faturamento} onChange={setFaturamento} prefix="R$" />
          </Field>
          <Field label="Divida Total (R$)">
            <NumInput value={divida} onChange={setDivida} prefix="R$" />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* P1 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 text-sm">Proposta 1 &mdash; Padrao</h3>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Sem Seguro</span>
          </div>
          <div className="space-y-3">
            <Field label="Valor de Adesao (R$)">
              <NumInput value={p1Adesao} onChange={setP1Adesao} prefix="R$" />
            </Field>
            <Field label="Mensalidade (R$/mes)">
              <NumInput value={p1Mensalidade} onChange={setP1Mensalidade} prefix="R$" />
            </Field>
            <Field label="Taxa Rate (%)">
              <NumInput value={p1Rate} onChange={setP1Rate} step={0.1} />
            </Field>
          </div>
        </div>

        {/* P2 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 text-sm">Proposta 2 &mdash; Com Seguro Garantia</h3>
            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Com Seguro</span>
          </div>
          <div className="space-y-3">
            <Field label="Valor de Adesao (R$)">
              <NumInput value={p2Adesao} onChange={setP2Adesao} prefix="R$" />
            </Field>
            <Field label="Mensalidade vinculada ao Seguro (R$/mes)">
              <NumInput value={p2Mensalidade} onChange={setP2Mensalidade} prefix="R$" />
            </Field>
            <Field label="Taxa Rate Alvo (%)">
              <NumInput value={p2Rate} onChange={setP2Rate} step={0.1} />
            </Field>
          </div>
        </div>
      </div>

      {/* Formato de Pagamento */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">2. Formato de Pagamento e Proposta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Field label="Nome do Cliente / Empresa">
            <input
              type="text"
              value={cliente}
              onChange={e => setCliente(e.target.value)}
              placeholder="Ex: Empresa XYZ Ltda"
              className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-400"
            />
          </Field>
          <Field label="Entrada da Adesao (%)">
            <NumInput value={entradaPerc} onChange={setEntradaPerc} step={5} min={0} />
          </Field>
          <Field label="Entrada (R$ - base P1)">
            <div className="w-full border border-gray-100 bg-gray-50 rounded-lg py-2 px-3 text-sm text-gray-600 font-medium">
              {fmtBRL(p1EntradaR)}
            </div>
          </Field>
          <Field label="No de Parcelas (saldo)">
            <NumInput value={nParcelas} onChange={setNParcelas} min={1} />
          </Field>
        </div>

        {entradaPerc >= 100 && (
          <p className="text-xs text-blue-600 mb-4 bg-blue-50 rounded-lg px-3 py-2">
            Entrada 100% &mdash; proposta gerada como pagamento a vista.
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <ResultCard label="Adesao P1" value={fmtBRL(p1Adesao)} sub={`Entrada: ${fmtBRL(p1EntradaR)}`} />
          <ResultCard label="Mensalidade P1" value={fmtBRL(p1Mensalidade) + '/mes'} sub={`Rate: ${fmtNum(p1Rate)}%`} />
          <ResultCard label="Adesao P2" value={fmtBRL(p2Adesao)} sub={`Entrada: ${fmtBRL(p2EntradaR)}`} />
          <ResultCard label="Mensalidade P2" value={fmtBRL(p2Mensalidade) + '/mes'} sub={`Rate: ${fmtNum(p2Rate)}%`} />
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => copiar(gerarTextoP1(), setCopied1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
          >
            {copied1 ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copiar Proposta 1
          </button>
          <button
            onClick={() => copiar(gerarTextoP2(), setCopied2)}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition"
          >
            {copied2 ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copiar Proposta 2
          </button>
        </div>
      </div>
    </div>
  );
}