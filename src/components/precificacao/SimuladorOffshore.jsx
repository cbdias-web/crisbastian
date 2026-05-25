/**
 * Simulador Offshore — baseado em Patrimônio sob Gestão (AUM)
 * P1: Estrutura Simples (conta + gestão básica)
 * P2: Estrutura Completa (holding + gestão + assessoria jurídica)
 */
import { useState, useEffect } from 'react';
import { Copy, CheckCircle, Info, SlidersHorizontal, Save, RotateCcw } from 'lucide-react';
import { loadConfig, saveConfig, fmtBRL, fmtUSD, fmtNum } from './usePrecificacaoConfig';
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

function NumInput({ value, onChange, step = 1, prefix, highlight }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">{prefix}</span>}
      <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} step={step}
        className={`w-full border rounded-lg py-2 text-sm ${prefix ? 'pl-12' : 'pl-3'} pr-3 focus:outline-none bg-white transition
          ${highlight ? 'border-cyan-300 focus:border-cyan-500 bg-cyan-50/40' : 'border-gray-200 focus:border-cyan-400'}`} />
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

const COR = '#0e7490';

export default function SimuladorOffshore() {
  const [cfg, setCfg] = useState(loadConfig);

  // Parâmetros ajustáveis diretamente no simulador
  const [cambio, setCambio] = useState(() => (loadConfig().offshore?.cambio || 5.80));
  const [p1AdesaoUSDManual, setP1AdesaoUSDManual] = useState(null); // null = usa cálculo automático
  const [p2AdesaoUSDManual, setP2AdesaoUSDManual] = useState(null);
  const [showAjustes, setShowAjustes] = useState(false);

  // Dados do contrato
  const [patrimonio, setPatrimonio] = useState(100000);
  const [cliente, setCliente] = useState('');
  const [entradaPerc, setEntradaPerc] = useState(50);
  const [nParcelas, setNParcelas] = useState(3);
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);

  useEffect(() => {
    const c = loadConfig();
    setCfg(c);
    setCambio(c.offshore?.cambio || 5.80);
  }, []);

  const o = cfg.offshore || {};

  // Cálculos automáticos (respeitam o piso mínimo USD 10.000)
  const p1AdesaoCalc = Math.min(Math.max(patrimonio * (o.p1AdesaoPerc || 1.5) / 100, o.p1PisoUSD || 10000), o.p1TetoUSD || 25000);
  const p2AdesaoCalc = Math.min(Math.max(patrimonio * (o.p2AdesaoPerc || 2.5) / 100, o.p2PisoUSD || 10000), o.p2TetoUSD || 50000);

  // Usa manual se definido, senão automático
  const p1AdesaoUSD = p1AdesaoUSDManual !== null ? p1AdesaoUSDManual : p1AdesaoCalc;
  const p2AdesaoUSD = p2AdesaoUSDManual !== null ? p2AdesaoUSDManual : p2AdesaoCalc;

  const p1MensalidadeUSD = Math.max(patrimonio * ((o.p1MensalidadePercAUM || 0.10) / 100), o.p1MensalidadeMinUSD || 300);
  const p1AdesaoBRL = Math.round(p1AdesaoUSD * cambio);
  const p1MensalidadeBRL = Math.round(p1MensalidadeUSD * cambio);
  const p1EntradaBRL = Math.round(p1AdesaoBRL * entradaPerc / 100);
  const p1SaldoBRL = p1AdesaoBRL - p1EntradaBRL;
  const p1ParcelaBRL = nParcelas > 0 ? Math.round(p1SaldoBRL / nParcelas) : 0;
  const p1LTV12 = p1AdesaoBRL + p1MensalidadeBRL * 12;

  const p2MensalidadeUSD = Math.max(patrimonio * ((o.p2MensalidadePercAUM || 0.15) / 100), o.p2MensalidadeMinUSD || 500) + (o.p2TaxaJuridicaUSD || 300);
  const p2AdesaoBRL = Math.round(p2AdesaoUSD * cambio);
  const p2MensalidadeBRL = Math.round(p2MensalidadeUSD * cambio);
  const p2EntradaBRL = Math.round(p2AdesaoBRL * entradaPerc / 100);
  const p2SaldoBRL = p2AdesaoBRL - p2EntradaBRL;
  const p2ParcelaBRL = nParcelas > 0 ? Math.round(p2SaldoBRL / nParcelas) : 0;
  const p2LTV12 = p2AdesaoBRL + p2MensalidadeBRL * 12;

  function resetAjustes() {
    setCambio(o.cambio || 5.80);
    setP1AdesaoUSDManual(null);
    setP2AdesaoUSDManual(null);
    toast.success('Ajustes resetados para o padrão.');
  }

  function salvarComoDefault() {
    const novaCfg = {
      ...cfg,
      offshore: { ...o, cambio, p1PisoUSD: Math.round(p1AdesaoUSD), p2PisoUSD: Math.round(p2AdesaoUSD) },
    };
    saveConfig(novaCfg);
    setCfg(novaCfg);
    toast.success('Câmbio e adesões salvos como padrão!');
  }

  const entradaStr = (adesao, entrada, parcela) => entradaPerc >= 100
    ? `Pagamento à vista: ${fmtBRL(adesao)}`
    : `Entrada (${entradaPerc}%): ${fmtBRL(entrada)}\nSaldo em ${nParcelas}x de ${fmtBRL(parcela)}`;

  function gerarP1() {
    return `PROPOSTA OFFSHORE — ESTRUTURA SIMPLES\nCliente: ${cliente || '[Cliente]'}\n${'─'.repeat(40)}\nPatrimônio sob Gestão: ${fmtUSD(patrimonio)}\nCâmbio Base: 1 USD = ${fmtNum(cambio, 2)} BRL\n\nESTRUTURA:\n• Conta no exterior (jurisdição internacional)\n• Gestão básica de ativos\n• Relatórios mensais de posição\n\nCONDIÇÕES COMERCIAIS:\nAdesão: ${fmtUSD(Math.round(p1AdesaoUSD))} aprox. ${fmtBRL(p1AdesaoBRL)}\n${entradaStr(p1AdesaoBRL, p1EntradaBRL, p1ParcelaBRL)}\nMensalidade (${fmtNum(o.p1MensalidadePercAUM || 0.10, 2)}% AUM): ${fmtUSD(Math.round(p1MensalidadeUSD))} aprox. ${fmtBRL(p1MensalidadeBRL)}/mês\n\nInvestimento Total (12 meses): ${fmtBRL(p1LTV12)}\n${'─'.repeat(40)}\nProposta gerada via Simulador — Villela Exchange`;
  }

  function gerarP2() {
    return `PROPOSTA OFFSHORE — ESTRUTURA COMPLETA\nCliente: ${cliente || '[Cliente]'}\n${'─'.repeat(40)}\nPatrimônio sob Gestão: ${fmtUSD(patrimonio)}\nCâmbio Base: 1 USD = ${fmtNum(cambio, 2)} BRL\n\nESTRUTURA:\n• Holding offshore (Cayman / BVI)\n• Blindagem patrimonial e sucessória\n• Gestão ativa com assessoria dedicada\n• Planejamento tributário internacional\n• Relatórios mensais + reuniões trimestrais\n\nCONDIÇÕES COMERCIAIS:\nAdesão: ${fmtUSD(Math.round(p2AdesaoUSD))} aprox. ${fmtBRL(p2AdesaoBRL)}\n${entradaStr(p2AdesaoBRL, p2EntradaBRL, p2ParcelaBRL)}\nMensalidade (${fmtNum(o.p2MensalidadePercAUM || 0.15, 2)}% AUM + assessoria): ${fmtUSD(Math.round(p2MensalidadeUSD))} aprox. ${fmtBRL(p2MensalidadeBRL)}/mês\n\nInvestimento Total (12 meses): ${fmtBRL(p2LTV12)}\n${'─'.repeat(40)}\nProposta gerada via Simulador — Villela Exchange`;
  }

  async function copiar(texto, setC) {
    await navigator.clipboard.writeText(texto);
    setC(true); toast.success('Proposta copiada!');
    setTimeout(() => setC(false), 2000);
  }

  const ajusteAtivo = p1AdesaoUSDManual !== null || p2AdesaoUSDManual !== null || cambio !== (o.cambio || 5.80);

  return (
    <div className="space-y-5">
      {/* Dados do cliente */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">1. Patrimônio e Cliente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Patrimônio sob Gestão (USD)" hint="Total de ativos que serão alocados na estrutura offshore">
            <NumInput value={patrimonio} onChange={setPatrimonio} prefix="USD" step={10000} />
          </Field>
          <Field label="Cliente / Empresa">
            <ClienteSelector value={cliente} onChange={setCliente} />
          </Field>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Patrimônio (BRL)', value: fmtBRL(patrimonio * cambio) },
            { label: 'Adesão P1 (USD)', value: fmtUSD(Math.round(p1AdesaoUSD)) },
            { label: 'Adesão P2 (USD)', value: fmtUSD(Math.round(p2AdesaoUSD)) },
            { label: 'Câmbio', value: `R$ ${fmtNum(cambio, 2)}` },
          ].map((m, i) => (
            <div key={i} className="bg-cyan-50 rounded-xl px-3 py-2.5 border border-cyan-100">
              <div className="text-[10px] text-cyan-600 font-semibold mb-0.5">{m.label}</div>
              <div className="text-sm font-bold text-cyan-900">{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Painel de Ajustes Admin */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${ajusteAtivo ? 'border-cyan-300' : 'border-gray-200'} bg-white`}>
        <button
          onClick={() => setShowAjustes(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className={`w-4 h-4 ${ajusteAtivo ? 'text-cyan-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-semibold ${ajusteAtivo ? 'text-cyan-700' : 'text-gray-700'}`}>
              Ajustes de Câmbio e Adesão
            </span>
            {ajusteAtivo && (
              <span className="text-[10px] bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-bold">Editado</span>
            )}
          </div>
          <span className="text-xs text-gray-400">{showAjustes ? '▲ Fechar' : '▼ Expandir'}</span>
        </button>

        {showAjustes && (
          <div className="px-5 pb-5 pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-4">Ajuste os valores para esta simulação. Use "Salvar como padrão" para persistir.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <Field label="Câmbio Base (1 USD = R$)" hint="Altera a conversão de todos os valores desta simulação">
                <NumInput value={cambio} onChange={setCambio} step={0.05} highlight />
              </Field>
              <Field label="Adesão P1 — override (USD)" hint="Deixe em 0 para calcular automaticamente">
                <NumInput
                  value={p1AdesaoUSDManual !== null ? p1AdesaoUSDManual : Math.round(p1AdesaoCalc)}
                  onChange={v => setP1AdesaoUSDManual(v > 0 ? v : null)}
                  prefix="US$" step={500}
                  highlight={p1AdesaoUSDManual !== null}
                />
              </Field>
              <Field label="Adesão P2 — override (USD)" hint="Deixe em 0 para calcular automaticamente">
                <NumInput
                  value={p2AdesaoUSDManual !== null ? p2AdesaoUSDManual : Math.round(p2AdesaoCalc)}
                  onChange={v => setP2AdesaoUSDManual(v > 0 ? v : null)}
                  prefix="US$" step={500}
                  highlight={p2AdesaoUSDManual !== null}
                />
              </Field>
            </div>
            <div className="flex gap-3">
              <button onClick={salvarComoDefault}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold transition">
                <Save className="w-3.5 h-3.5" /> Salvar câmbio como padrão
              </button>
              <button onClick={resetAjustes}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold transition">
                <RotateCcw className="w-3.5 h-3.5" /> Resetar ajustes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formato de Pagamento */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">2. Formato de Pagamento</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Entrada da Adesão (%)">
            <NumInput value={entradaPerc} onChange={setEntradaPerc} step={10} min={0} />
          </Field>
          <Field label="No. de Parcelas (saldo)">
            <NumInput value={nParcelas} onChange={setNParcelas} min={1} />
          </Field>
          <Field label="Entrada estimada P1 (BRL)">
            <div className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm font-semibold text-gray-700">
              {fmtBRL(p1EntradaBRL)}
            </div>
          </Field>
        </div>
      </div>

      {/* Cards das propostas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PropostaCard
          titulo="Proposta 1 — Estrutura Simples"
          tag="Conta + Gestão Básica"
          tagColor="bg-cyan-100 text-cyan-700"
          color={COR}
          items={[
            { label: 'Adesão (USD)', value: fmtUSD(Math.round(p1AdesaoUSD)) },
            { label: 'Adesão (BRL aprox.)', value: fmtBRL(p1AdesaoBRL), highlight: true },
            entradaPerc < 100 ? { label: `Entrada ${entradaPerc}%`, value: fmtBRL(p1EntradaBRL) } : null,
            entradaPerc < 100 ? { label: `${nParcelas}x de`, value: fmtBRL(p1ParcelaBRL) } : null,
            { label: 'Mensalidade (USD)', value: fmtUSD(Math.round(p1MensalidadeUSD)) },
            { label: 'Mensalidade (BRL aprox.)', value: fmtBRL(p1MensalidadeBRL), highlight: true },
            { label: 'Investimento total (12m)', value: fmtBRL(p1LTV12) },
          ]}
          onCopiar={() => copiar(gerarP1(), setCopied1)}
          copied={copied1}
        />
        <PropostaCard
          titulo="Proposta 2 — Estrutura Completa"
          tag="Holding + Blindagem + Gestão Ativa"
          tagColor="bg-emerald-100 text-emerald-700"
          color="#047857"
          items={[
            { label: 'Adesão (USD)', value: fmtUSD(Math.round(p2AdesaoUSD)) },
            { label: 'Adesão (BRL aprox.)', value: fmtBRL(p2AdesaoBRL), highlight: true },
            entradaPerc < 100 ? { label: `Entrada ${entradaPerc}%`, value: fmtBRL(p2EntradaBRL) } : null,
            entradaPerc < 100 ? { label: `${nParcelas}x de`, value: fmtBRL(p2ParcelaBRL) } : null,
            { label: 'Mensalidade (USD)', value: fmtUSD(Math.round(p2MensalidadeUSD)) },
            { label: 'Mensalidade (BRL aprox.)', value: fmtBRL(p2MensalidadeBRL), highlight: true },
            { label: 'Investimento total (12m)', value: fmtBRL(p2LTV12) },
          ]}
          onCopiar={() => copiar(gerarP2(), setCopied2)}
          copied={copied2}
        />
      </div>

      <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-4 text-xs text-cyan-700 leading-relaxed">
        <strong>Piso mínimo de adesão: USD 10.000.</strong> Os valores são calculados automaticamente com base no patrimônio. Use o painel de "Ajustes" acima para sobrepor câmbio e adesão para esta simulação — clique em "Salvar câmbio como padrão" para fixar o câmbio.
      </div>
    </div>
  );
}