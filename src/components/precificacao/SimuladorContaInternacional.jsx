import { useState, useEffect } from 'react';
import { Copy, CheckCircle } from 'lucide-react';
import ClienteSelector from './ClienteSelector';
import { loadConfig, fmtBRL, fmtUSD, fmtNum } from './usePrecificacaoConfig';
import { toast } from 'sonner';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, step = 1, min, prefix }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        className={`w-full border border-gray-200 rounded-lg py-2 text-sm ${prefix ? 'pl-14' : 'pl-3'} pr-3 focus:outline-none focus:border-blue-400`}
      />
    </div>
  );
}

function ResultRow({ label, value, highlight }) {
  return (
    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${highlight ? 'bg-blue-50 font-semibold' : ''}`}>
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

export default function SimuladorContaInternacional() {
  const [cfg, setCfg] = useState(loadConfig);
  const [faturamento, setFaturamento] = useState(30000);
  const [adesaoUSD, setAdesaoUSD] = useState(0);
  const [mensalidadeUSD, setMensalidadeUSD] = useState(0);
  const [cliente, setCliente] = useState('');
  const [entradaPerc, setEntradaPerc] = useState(50);
  const [nParcelas, setNParcelas] = useState(3);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const c = loadConfig();
    setCfg(c);
    const ci = c.ci;
    const adesao = Math.max(faturamento / ci.cambio * ci.adesaoPerc / 100, ci.pisoAdesao);
    setAdesaoUSD(Math.round(adesao));
    setMensalidadeUSD(ci.mensalidadePadrao);
  }, [faturamento]);

  const cambio = cfg.ci.cambio;
  const ltvMeses = cfg.ci.ltvMeses;
  const totalUSD = adesaoUSD + mensalidadeUSD * ltvMeses;
  const totalBRL = totalUSD * cambio;
  const adesaoBRL = adesaoUSD * cambio;
  const mensalidadeBRL = mensalidadeUSD * cambio;
  const entradaUSD = Math.round(adesaoUSD * entradaPerc / 100);
  const saldoUSD = adesaoUSD - entradaUSD;
  const parcelaUSD = nParcelas > 0 ? Math.round(saldoUSD / nParcelas) : 0;

  function gerarTexto() {
    const entradaStr = entradaPerc >= 100
      ? `Pagamento a vista: ${fmtUSD(adesaoUSD)} (aprox. ${fmtBRL(adesaoBRL)})`
      : `Entrada (${entradaPerc}%): ${fmtUSD(entradaUSD)}\nSaldo em ${nParcelas}x de ${fmtUSD(parcelaUSD)}`;
    return `Proposta Conta Internacional -- ${cliente || '[Cliente]'}\n---\nProduto: Conta Internacional\nFaturamento Mensal: ${fmtBRL(faturamento)}\nCambio base: 1 USD = ${fmtNum(cambio, 2)} BRL\n\nCondicoes Comerciais\nAdesao: ${fmtUSD(adesaoUSD)} aprox. ${fmtBRL(adesaoBRL)}\n${entradaStr}\nMensalidade: ${fmtUSD(mensalidadeUSD)}/mes aprox. ${fmtBRL(mensalidadeBRL)}/mes\nTotal do Contrato (${ltvMeses} meses): ${fmtUSD(totalUSD)} aprox. ${fmtBRL(totalBRL)}\n---\nProposta gerada via Hub de Precificacao - Villela Exchange`;
  }

  async function copiar() {
    await navigator.clipboard.writeText(gerarTexto());
    setCopied(true);
    toast.success('Proposta copiada!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">1. Dados do Cliente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Faturamento Mensal (R$)">
            <NumInput value={faturamento} onChange={setFaturamento} prefix="R$" />
          </Field>
          <Field label="Adesao (US$)">
            <NumInput value={adesaoUSD} onChange={setAdesaoUSD} prefix="US$" />
          </Field>
          <Field label="Mensalidade (US$/mes)">
            <NumInput value={mensalidadeUSD} onChange={setMensalidadeUSD} prefix="US$" />
          </Field>
        </div>

        <div className="mt-5 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-2 bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Resumo da Proposta
          </div>
          <div className="p-2 space-y-1">
            <ResultRow label="Adesao" value={`${fmtUSD(adesaoUSD)} aprox. ${fmtBRL(adesaoBRL)}`} />
            <ResultRow label="Mensalidade" value={`${fmtUSD(mensalidadeUSD)} aprox. ${fmtBRL(mensalidadeBRL)}/mes`} />
            <ResultRow label={`Total (${ltvMeses} meses)`} value={`${fmtUSD(totalUSD)} aprox. ${fmtBRL(totalBRL)}`} highlight />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Balanca Financeira baseada em LTV de {ltvMeses} meses. Cambio: 1 USD = {fmtNum(cambio, 2)} BRL
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">2. Formato de Pagamento e Proposta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Field label="Cliente / Empresa">
            <ClienteSelector value={cliente} onChange={setCliente} />
          </Field>
          <Field label="Entrada da Adesao (%)">
            <NumInput value={entradaPerc} onChange={setEntradaPerc} step={5} min={0} />
          </Field>
          <Field label="Entrada (US$)">
            <div className="w-full border border-gray-100 bg-gray-50 rounded-lg py-2 px-3 text-sm text-gray-600 font-medium">
              {fmtUSD(entradaUSD)}
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
        <button
          onClick={copiar}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
        >
          {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          Gerar e Copiar Proposta
        </button>
      </div>
    </div>
  );
}