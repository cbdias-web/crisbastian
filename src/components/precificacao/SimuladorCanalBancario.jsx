/**
 * Simulador Canal Bancário — baseado em volume de operações cambiais e número de contas
 * P1: Canal Padrão (conta + operações cambiais básicas)
 * P2: Canal Dedicado (assessoria + estrutura completa de câmbio)
 */
import { useState } from 'react';
import { Copy, CheckCircle, Info } from 'lucide-react';
import { loadConfig, fmtBRL, fmtNum } from './usePrecificacaoConfig';
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
    <div className={`rounded-xl px-3 py-2.5 border`} style={{ background: `${color}12`, borderColor: `${color}30` }}>
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

const COR = '#6d28d9';
const TIPOS_CONTA = ['Conta Corrente (USD)', 'Conta Poupança (USD)', 'Conta Empresarial', 'Multi-moeda'];

export default function SimuladorCanalBancario() {
  const [volumeMensal, setVolumeMensal] = useState(200000);
  const [nContas, setNContas] = useState(1);
  const [tipoConta, setTipoConta] = useState('Conta Corrente (USD)');
  const [cliente, setCliente] = useState('');
  const [entradaPerc, setEntradaPerc] = useState(50);
  const [nParcelas, setNParcelas] = useState(3);
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);

  // P1 — Canal Padrão
  // Adesão: R$ 1.500 por conta (piso R$1.500, teto R$6.000)
  // Mensalidade: R$ 800/conta + 0.30% sobre volume mensal (cap R$4.000)
  const p1AdesaoBase = Math.min(1500 * nContas, 6000);
  const p1MensalidadeBase = Math.min(800 * nContas + volumeMensal * 0.003, 4000);
  const p1Adesao = Math.round(p1AdesaoBase);
  const p1Mensalidade = Math.round(p1MensalidadeBase);
  const p1Entrada = Math.round(p1Adesao * entradaPerc / 100);
  const p1Saldo = p1Adesao - p1Entrada;
  const p1Parcela = nParcelas > 0 ? Math.round(p1Saldo / nParcelas) : 0;
  const p1LTV12 = p1Adesao + p1Mensalidade * 12;

  // P2 — Canal Dedicado
  // Adesão: R$ 3.000 por conta (piso R$3.000, teto R$15.000) + setup estrutura
  // Mensalidade: R$ 1.500/conta + 0.50% sobre volume (cap R$8.000) + assessoria dedicada
  const p2AdesaoBase = Math.min(3000 * nContas + 2000, 15000); // +2000 setup
  const p2MensalidadeBase = Math.min(1500 * nContas + volumeMensal * 0.005, 8000);
  const p2Adesao = Math.round(p2AdesaoBase);
  const p2Mensalidade = Math.round(p2MensalidadeBase);
  const p2Entrada = Math.round(p2Adesao * entradaPerc / 100);
  const p2Saldo = p2Adesao - p2Entrada;
  const p2Parcela = nParcelas > 0 ? Math.round(p2Saldo / nParcelas) : 0;
  const p2LTV12 = p2Adesao + p2Mensalidade * 12;

  // Economia estimada para o cliente vs spread bancário convencional (~2.5% vs 0.7%)
  const economiaAnual = Math.round(volumeMensal * (0.025 - 0.007) * 12);

  const entradaStr = (adesao, entrada, parcela) => entradaPerc >= 100
    ? `Pagamento à vista: ${fmtBRL(adesao)}`
    : `Entrada (${entradaPerc}%): ${fmtBRL(entrada)}\nSaldo em ${nParcelas}x de ${fmtBRL(parcela)}`;

  function gerarP1() {
    return `PROPOSTA CANAL BANCÁRIO — PADRÃO\nCliente: ${cliente || '[Cliente]'}\n${'─'.repeat(40)}\nVolume Mensal de Operações: ${fmtBRL(volumeMensal)}\nNúmero de Contas: ${nContas}\nTipo de Conta: ${tipoConta}\n\nESTRUTURA:\n• Abertura de conta no exterior\n• Acesso a câmbio com spread reduzido (~0.7%)\n• Transferências SWIFT e remessas internacionais\n• Suporte operacional padrão\n\nCONDIÇÕES COMERCIAIS:\nAdesão: ${fmtBRL(p1Adesao)}\n${entradaStr(p1Adesao, p1Entrada, p1Parcela)}\nMensalidade: ${fmtBRL(p1Mensalidade)}/mês\n\nInvestimento Total (12 meses): ${fmtBRL(p1LTV12)}\nEconomia Estimada vs. Banco Convencional: ${fmtBRL(economiaAnual)}/ano\n\nROI estimado: ${p1LTV12 > 0 ? fmtNum((economiaAnual / p1LTV12 - 1) * 100, 1) : '—'}% em 12 meses\n${'─'.repeat(40)}\nProposta gerada via Simulador — Villela Exchange`;
  }

  function gerarP2() {
    return `PROPOSTA CANAL BANCÁRIO — DEDICADO\nCliente: ${cliente || '[Cliente]'}\n${'─'.repeat(40)}\nVolume Mensal de Operações: ${fmtBRL(volumeMensal)}\nNúmero de Contas: ${nContas}\nTipo de Conta: ${tipoConta}\n\nESTRUTURA:\n• Abertura de múltiplas contas com estrutura dedicada\n• Câmbio com spread preferencial (negociado por volume)\n• Mesa de câmbio exclusiva com gestor dedicado\n• Compliance e relatórios regulatórios\n• Integração com sistema de pagamentos internacionais\n• Reuniões mensais de performance\n\nCONDIÇÕES COMERCIAIS:\nAdesão: ${fmtBRL(p2Adesao)} (inclui setup da estrutura)\n${entradaStr(p2Adesao, p2Entrada, p2Parcela)}\nMensalidade: ${fmtBRL(p2Mensalidade)}/mês\n\nInvestimento Total (12 meses): ${fmtBRL(p2LTV12)}\nEconomia Estimada vs. Banco Convencional: ${fmtBRL(economiaAnual)}/ano\n\nROI estimado: ${p2LTV12 > 0 ? fmtNum((economiaAnual / p2LTV12 - 1) * 100, 1) : '—'}% em 12 meses\n${'─'.repeat(40)}\nProposta gerada via Simulador — Villela Exchange`;
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

        {/* Métricas chave */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <MetricaBadge label="Economia Estimada/ano" value={fmtBRL(economiaAnual)} color={COR} />
          <MetricaBadge label="Adesão P1" value={fmtBRL(p1Adesao)} color="#0369a1" />
          <MetricaBadge label="Adesão P2" value={fmtBRL(p2Adesao)} color="#047857" />
          <MetricaBadge label="ROI P1 (12m)" value={`${fmtNum((economiaAnual / Math.max(p1LTV12, 1) - 1) * 100, 1)}%`} color="#b45309" />
        </div>
      </div>

      {/* Formato de pagamento */}
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
            <div className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm font-semibold text-gray-700">
              {fmtBRL(p1Entrada)}
            </div>
          </Field>
        </div>
      </div>

      {/* Propostas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PropostaCard
          titulo="Proposta 1 — Canal Padrão"
          tag="Conta + Câmbio Reduzido"
          tagColor="bg-violet-100 text-violet-700"
          color={COR}
          items={[
            { label: 'Adesão', value: fmtBRL(p1Adesao), highlight: true },
            entradaPerc < 100 ? { label: `Entrada ${entradaPerc}%`, value: fmtBRL(p1Entrada) } : { label: 'À vista', value: fmtBRL(p1Adesao) },
            entradaPerc < 100 ? { label: `${nParcelas}x de`, value: fmtBRL(p1Parcela) } : null,
            { label: 'Mensalidade', value: fmtBRL(p1Mensalidade) + '/mês', highlight: true },
            { label: 'Total (12 meses)', value: fmtBRL(p1LTV12) },
            { label: 'Economia anual estimada', value: fmtBRL(economiaAnual) },
          ].filter(Boolean)}
          onCopiar={() => copiar(gerarP1(), setCopied1)}
          copied={copied1}
        />
        <PropostaCard
          titulo="Proposta 2 — Canal Dedicado"
          tag="Estrutura Completa + Mesa Exclusiva"
          tagColor="bg-emerald-100 text-emerald-700"
          color="#047857"
          items={[
            { label: 'Adesão (incl. setup)', value: fmtBRL(p2Adesao), highlight: true },
            entradaPerc < 100 ? { label: `Entrada ${entradaPerc}%`, value: fmtBRL(p2Entrada) } : { label: 'À vista', value: fmtBRL(p2Adesao) },
            entradaPerc < 100 ? { label: `${nParcelas}x de`, value: fmtBRL(p2Parcela) } : null,
            { label: 'Mensalidade', value: fmtBRL(p2Mensalidade) + '/mês', highlight: true },
            { label: 'Total (12 meses)', value: fmtBRL(p2LTV12) },
            { label: 'Economia anual estimada', value: fmtBRL(economiaAnual) },
          ].filter(Boolean)}
          onCopiar={() => copiar(gerarP2(), setCopied2)}
          copied={copied2}
        />
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-xs text-violet-700 leading-relaxed">
        <strong>Base de cálculo:</strong> P1 = R$1.500/conta (piso R$1.500 / teto R$6K) + 0.30% do volume mensal (cap R$4K/mês). P2 = R$3.000/conta + setup R$2.000 + 0.50% do volume (cap R$8K/mês).
        Economia estimada: diferença de spread bancário convencional (~2.5%) vs. canal Villela (~0.7%).
      </div>
    </div>
  );
}