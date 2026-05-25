/**
 * Simulador Canal Bancário — baseado em volume de operações cambiais e número de contas
 */
import { useState, useEffect } from 'react';
import { Copy, CheckCircle, Info } from 'lucide-react';
import { loadConfig, saveConfig, fmtBRL, fmtNum } from './usePrecificacaoConfig';
import AdminParamsPanel from './AdminParamsPanel';
import useIsAdmin from '@/hooks/useIsAdmin';
import ClienteSelector from './ClienteSelector';
import { toast } from 'sonner';

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <label className="block text-xs font-semibold text-gray-600">{label}</label>
        {hint && <span title={hint}><Info className="w-3 h-3 text-gray-400 cursor-help" /></span>}
      </div>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, step = 1, min, prefix }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">{prefix}</span>}
      <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} step={step} min={min}
        className={`w-full border border-gray-200 rounded-lg py-2 text-sm ${prefix ? 'pl-10' : 'pl-3'} pr-3 focus:outline-none focus:border-violet-400 bg-white`} />
    </div>
  );
}

function MetricaBadge({ label, value, color }) {
  return (
    <div className="rounded-xl px-3 py-2.5 border" style={{ background: `${color}12`, borderColor: `${color}30` }}>
      <div className="text-[10px] font-semibold mb-0.5" style={{ color }}>{label}</div>
      <div className="text-sm font-bold text-gray-900">{value}</div>
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
        {items.filter(Boolean).map((item, i) => (
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

const COR = '#6d28d9';
const TIPOS_CONTA = ['Conta Corrente (USD)', 'Conta Poupança (USD)', 'Conta Empresarial', 'Multi-moeda'];

export default function SimuladorCanalBancario() {
  const isAdmin = useIsAdmin();
  const [cfg, setCfg] = useState(loadConfig);

  // Parâmetros admin
  const initCB = () => loadConfig().canalBancario;
  const [p1AdesaoPorConta, setP1AdesaoPorConta] = useState(() => initCB().p1AdesaoPorConta);
  const [p1TetoAdesao, setP1TetoAdesao] = useState(() => initCB().p1TetoAdesao);
  const [p1MensalidadePorConta, setP1MensalidadePorConta] = useState(() => initCB().p1MensalidadePorConta);
  const [p1PercVolume, setP1PercVolume] = useState(() => initCB().p1PercVolume);
  const [p1TetoMensalidade, setP1TetoMensalidade] = useState(() => initCB().p1TetoMensalidade);
  const [p2AdesaoPorConta, setP2AdesaoPorConta] = useState(() => initCB().p2AdesaoPorConta);
  const [p2SetupFixo, setP2SetupFixo] = useState(() => initCB().p2SetupFixo);
  const [p2TetoAdesao, setP2TetoAdesao] = useState(() => initCB().p2TetoAdesao);
  const [p2MensalidadePorConta, setP2MensalidadePorConta] = useState(() => initCB().p2MensalidadePorConta);
  const [p2PercVolume, setP2PercVolume] = useState(() => initCB().p2PercVolume);
  const [p2TetoMensalidade, setP2TetoMensalidade] = useState(() => initCB().p2TetoMensalidade);

  // Dados operacionais
  const [volumeMensal, setVolumeMensal] = useState(200000);
  const [nContas, setNContas] = useState(1);
  const [tipoConta, setTipoConta] = useState('Conta Corrente (USD)');
  const [cliente, setCliente] = useState('');
  const [entradaPerc, setEntradaPerc] = useState(50);
  const [nParcelas, setNParcelas] = useState(3);
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);

  useEffect(() => {
    const c = loadConfig(); setCfg(c); const cb = c.canalBancario;
    setP1AdesaoPorConta(cb.p1AdesaoPorConta); setP1TetoAdesao(cb.p1TetoAdesao);
    setP1MensalidadePorConta(cb.p1MensalidadePorConta); setP1PercVolume(cb.p1PercVolume); setP1TetoMensalidade(cb.p1TetoMensalidade);
    setP2AdesaoPorConta(cb.p2AdesaoPorConta); setP2SetupFixo(cb.p2SetupFixo); setP2TetoAdesao(cb.p2TetoAdesao);
    setP2MensalidadePorConta(cb.p2MensalidadePorConta); setP2PercVolume(cb.p2PercVolume); setP2TetoMensalidade(cb.p2TetoMensalidade);
  }, []);

  // Cálculos usando parâmetros admin
  const p1Adesao = Math.round(Math.min(p1AdesaoPorConta * nContas, p1TetoAdesao));
  const p1Mensalidade = Math.round(Math.min(p1MensalidadePorConta * nContas + volumeMensal * p1PercVolume, p1TetoMensalidade));
  const p1Entrada = Math.round(p1Adesao * entradaPerc / 100);
  const p1Saldo = p1Adesao - p1Entrada;
  const p1Parcela = nParcelas > 0 ? Math.round(p1Saldo / nParcelas) : 0;
  const p1LTV12 = p1Adesao + p1Mensalidade * 12;

  const p2Adesao = Math.round(Math.min(p2AdesaoPorConta * nContas + p2SetupFixo, p2TetoAdesao));
  const p2Mensalidade = Math.round(Math.min(p2MensalidadePorConta * nContas + volumeMensal * p2PercVolume, p2TetoMensalidade));
  const p2Entrada = Math.round(p2Adesao * entradaPerc / 100);
  const p2Saldo = p2Adesao - p2Entrada;
  const p2Parcela = nParcelas > 0 ? Math.round(p2Saldo / nParcelas) : 0;
  const p2LTV12 = p2Adesao + p2Mensalidade * 12;

  const economiaAnual = Math.round(volumeMensal * (0.025 - 0.007) * 12);

  const cb = cfg.canalBancario;
  const adminEdited = p1AdesaoPorConta !== cb.p1AdesaoPorConta || p1TetoAdesao !== cb.p1TetoAdesao ||
    p1MensalidadePorConta !== cb.p1MensalidadePorConta || p1PercVolume !== cb.p1PercVolume ||
    p2AdesaoPorConta !== cb.p2AdesaoPorConta || p2TetoAdesao !== cb.p2TetoAdesao;

  function salvarAdmin() {
    const novaCB = { p1AdesaoPorConta, p1TetoAdesao, p1MensalidadePorConta, p1PercVolume, p1TetoMensalidade, p2AdesaoPorConta, p2SetupFixo, p2TetoAdesao, p2MensalidadePorConta, p2PercVolume, p2TetoMensalidade };
    const nova = { ...cfg, canalBancario: novaCB };
    saveConfig(nova); setCfg(nova); toast.success('Parâmetros Canal Bancário salvos!');
  }

  function resetarAdmin() {
    const cb = cfg.canalBancario;
    setP1AdesaoPorConta(cb.p1AdesaoPorConta); setP1TetoAdesao(cb.p1TetoAdesao);
    setP1MensalidadePorConta(cb.p1MensalidadePorConta); setP1PercVolume(cb.p1PercVolume); setP1TetoMensalidade(cb.p1TetoMensalidade);
    setP2AdesaoPorConta(cb.p2AdesaoPorConta); setP2SetupFixo(cb.p2SetupFixo); setP2TetoAdesao(cb.p2TetoAdesao);
    setP2MensalidadePorConta(cb.p2MensalidadePorConta); setP2PercVolume(cb.p2PercVolume); setP2TetoMensalidade(cb.p2TetoMensalidade);
    toast.success('Resetado para o padrão salvo.');
  }

  const entradaStr = (adesao, entrada, parcela) => entradaPerc >= 100
    ? `Pagamento à vista: ${fmtBRL(adesao)}`
    : `Entrada (${entradaPerc}%): ${fmtBRL(entrada)}\nSaldo em ${nParcelas}x de ${fmtBRL(parcela)}`;

  function gerarP1() {
    return `PROPOSTA CANAL BANCÁRIO — PADRÃO\nCliente: ${cliente || '[Cliente]'}\n${'─'.repeat(40)}\nVolume Mensal: ${fmtBRL(volumeMensal)}\nNo. Contas: ${nContas} | Tipo: ${tipoConta}\n\nCONDIÇÕES:\nAdesão: ${fmtBRL(p1Adesao)}\n${entradaStr(p1Adesao, p1Entrada, p1Parcela)}\nMensalidade: ${fmtBRL(p1Mensalidade)}/mês\nTotal (12m): ${fmtBRL(p1LTV12)}\nEconomia estimada: ${fmtBRL(economiaAnual)}/ano\n${'─'.repeat(40)}\nVillela Exchange`;
  }

  function gerarP2() {
    return `PROPOSTA CANAL BANCÁRIO — DEDICADO\nCliente: ${cliente || '[Cliente]'}\n${'─'.repeat(40)}\nVolume Mensal: ${fmtBRL(volumeMensal)}\nNo. Contas: ${nContas} | Tipo: ${tipoConta}\n\nCONDIÇÕES:\nAdesão (incl. setup): ${fmtBRL(p2Adesao)}\n${entradaStr(p2Adesao, p2Entrada, p2Parcela)}\nMensalidade: ${fmtBRL(p2Mensalidade)}/mês\nTotal (12m): ${fmtBRL(p2LTV12)}\nEconomia estimada: ${fmtBRL(economiaAnual)}/ano\n${'─'.repeat(40)}\nVillela Exchange`;
  }

  async function copiar(texto, setC) {
    await navigator.clipboard.writeText(texto); setC(true); toast.success('Proposta copiada!');
    setTimeout(() => setC(false), 2000);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">1. Perfil Operacional</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Volume Mensal de Operações (R$)" hint="Total de câmbio e remessas por mês">
            <NumInput value={volumeMensal} onChange={setVolumeMensal} prefix="R$" step={10000} />
          </Field>
          <Field label="Número de Contas">
            <NumInput value={nContas} onChange={setNContas} min={1} step={1} />
          </Field>
          <Field label="Tipo de Conta">
            <select value={tipoConta} onChange={e => setTipoConta(e.target.value)}
              className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-violet-400 bg-white">
              {TIPOS_CONTA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Cliente / Empresa">
            <ClienteSelector value={cliente} onChange={setCliente} />
          </Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <MetricaBadge label="Economia Estimada/ano" value={fmtBRL(economiaAnual)} color={COR} />
          <MetricaBadge label="Adesão P1" value={fmtBRL(p1Adesao)} color="#0369a1" />
          <MetricaBadge label="Adesão P2" value={fmtBRL(p2Adesao)} color="#047857" />
          <MetricaBadge label="ROI P1 (12m)" value={`${fmtNum((economiaAnual / Math.max(p1LTV12, 1) - 1) * 100, 1)}%`} color="#b45309" />
        </div>
      </div>

      {/* Painel Admin */}
      <AdminParamsPanel isAdmin={isAdmin} edited={adminEdited} onSave={salvarAdmin} onReset={resetarAdmin}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Field label="P1 Adesão/conta (R$)">
            <NumInput value={p1AdesaoPorConta} onChange={setP1AdesaoPorConta} prefix="R$" />
          </Field>
          <Field label="P1 Teto Adesão (R$)">
            <NumInput value={p1TetoAdesao} onChange={setP1TetoAdesao} prefix="R$" />
          </Field>
          <Field label="P1 Mensalidade/conta (R$)">
            <NumInput value={p1MensalidadePorConta} onChange={setP1MensalidadePorConta} prefix="R$" />
          </Field>
          <Field label="P1 % Volume">
            <NumInput value={p1PercVolume * 100} onChange={v => setP1PercVolume(v / 100)} step={0.05} />
          </Field>
          <Field label="P1 Teto Mensalidade (R$)">
            <NumInput value={p1TetoMensalidade} onChange={setP1TetoMensalidade} prefix="R$" />
          </Field>
          <Field label="P2 Adesão/conta (R$)">
            <NumInput value={p2AdesaoPorConta} onChange={setP2AdesaoPorConta} prefix="R$" />
          </Field>
          <Field label="P2 Setup Fixo (R$)">
            <NumInput value={p2SetupFixo} onChange={setP2SetupFixo} prefix="R$" />
          </Field>
          <Field label="P2 Teto Adesão (R$)">
            <NumInput value={p2TetoAdesao} onChange={setP2TetoAdesao} prefix="R$" />
          </Field>
          <Field label="P2 % Volume">
            <NumInput value={p2PercVolume * 100} onChange={v => setP2PercVolume(v / 100)} step={0.05} />
          </Field>
          <Field label="P2 Teto Mensalidade (R$)">
            <NumInput value={p2TetoMensalidade} onChange={setP2TetoMensalidade} prefix="R$" />
          </Field>
        </div>
      </AdminParamsPanel>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">2. Formato de Pagamento</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Entrada da Adesão (%)">
            <NumInput value={entradaPerc} onChange={setEntradaPerc} step={10} min={0} />
          </Field>
          <Field label="No. de Parcelas (saldo)">
            <NumInput value={nParcelas} onChange={setNParcelas} min={1} />
          </Field>
          <Field label="Entrada estimada P1">
            <div className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm font-semibold text-gray-700">{fmtBRL(p1Entrada)}</div>
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PropostaCard titulo="Proposta 1 — Canal Padrão" tag="Conta + Câmbio Reduzido"
          tagColor="bg-violet-100 text-violet-700" color={COR}
          items={[
            { label: 'Adesão', value: fmtBRL(p1Adesao), highlight: true },
            entradaPerc < 100 ? { label: `Entrada ${entradaPerc}%`, value: fmtBRL(p1Entrada) } : { label: 'À vista', value: fmtBRL(p1Adesao) },
            entradaPerc < 100 ? { label: `${nParcelas}x de`, value: fmtBRL(p1Parcela) } : null,
            { label: 'Mensalidade', value: fmtBRL(p1Mensalidade) + '/mês', highlight: true },
            { label: 'Total (12 meses)', value: fmtBRL(p1LTV12) },
            { label: 'Economia anual estimada', value: fmtBRL(economiaAnual) },
          ]}
          onCopiar={() => copiar(gerarP1(), setCopied1)} copied={copied1}
        />
        <PropostaCard titulo="Proposta 2 — Canal Dedicado" tag="Estrutura Completa + Mesa Exclusiva"
          tagColor="bg-emerald-100 text-emerald-700" color="#047857"
          items={[
            { label: 'Adesão (incl. setup)', value: fmtBRL(p2Adesao), highlight: true },
            entradaPerc < 100 ? { label: `Entrada ${entradaPerc}%`, value: fmtBRL(p2Entrada) } : { label: 'À vista', value: fmtBRL(p2Adesao) },
            entradaPerc < 100 ? { label: `${nParcelas}x de`, value: fmtBRL(p2Parcela) } : null,
            { label: 'Mensalidade', value: fmtBRL(p2Mensalidade) + '/mês', highlight: true },
            { label: 'Total (12 meses)', value: fmtBRL(p2LTV12) },
            { label: 'Economia anual estimada', value: fmtBRL(economiaAnual) },
          ]}
          onCopiar={() => copiar(gerarP2(), setCopied2)} copied={copied2}
        />
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-xs text-violet-700 leading-relaxed">
        <strong>Base de cálculo:</strong> Adesão = R$&nbsp;{fmtNum(p1AdesaoPorConta)}/conta (teto R$&nbsp;{fmtNum(p1TetoAdesao)}).
        Mensalidade = R$&nbsp;{fmtNum(p1MensalidadePorConta)}/conta + {fmtNum(p1PercVolume * 100, 2)}% do volume (cap R$&nbsp;{fmtNum(p1TetoMensalidade)}).
        Economia estimada: spread convencional (~2.5%) vs. Villela (~0.7%).
      </div>
    </div>
  );
}