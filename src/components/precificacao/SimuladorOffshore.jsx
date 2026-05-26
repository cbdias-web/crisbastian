/**
 * Simulador Offshore — baseado em Patrimônio sob Gestão (AUM)
 * P1: Estrutura Simples (conta + gestão básica)
 * P2: Estrutura Completa (holding + gestão + assessoria jurídica)
 */
import { useState, useEffect } from 'react';
import CriarPropostaModal from './CriarPropostaModal';
import { Info, SlidersHorizontal, Save, RotateCcw, FileText } from 'lucide-react';
import { loadConfig, saveConfig, fmtBRL, fmtUSD, fmtNum } from './usePrecificacaoConfig';
import CambioWidget from './CambioWidget';
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

function PropostaCard({ titulo, tag, tagColor, items, color }) {
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
    </div>
  );
}

const COR = '#0e7490';

export default function SimuladorOffshore() {
  const [cfg, setCfg] = useState(loadConfig);
  const destinos = cfg.destinos || [];
  const [destino, setDestino] = useState(() => (loadConfig().destinos || [])[0] || { nome: 'Sem destino específico', p1AdesaoUSD: null, p2AdesaoUSD: null, manutencaoAnualUSD: 0 });

  // Parâmetros ajustáveis diretamente no simulador
  const [cambio, setCambio] = useState(() => (loadConfig().offshore?.cambio || 5.80));
  const [p1AdesaoUSDManual, setP1AdesaoUSDManual] = useState(null);
  const [p2AdesaoUSDManual, setP2AdesaoUSDManual] = useState(null);
  const [showAjustes, setShowAjustes] = useState(false);

  // Dados do contrato
  const [patrimonio, setPatrimonio] = useState(100000);
  const [cliente, setCliente] = useState('');
  const [entradaPerc, setEntradaPerc] = useState(50);
  const [nParcelas, setNParcelas] = useState(3);
  const [showProposta, setShowProposta] = useState(false);

  useEffect(() => {
    const c = loadConfig();
    setCfg(c);
    setDestino((c.destinos || [])[0] || { nome: 'Sem destino específico', p1AdesaoUSD: null, p2AdesaoUSD: null, manutencaoAnualUSD: 0 });
    setCambio(c.offshore?.cambio || 5.80);
  }, []);

  // Quando muda o destino, limpa overrides manuais
  useEffect(() => {
    setP1AdesaoUSDManual(null);
    setP2AdesaoUSDManual(null);
  }, [destino]);

  const o = cfg.offshore || {};

  // Cálculos automáticos baseados em AUM
  const p1AdesaoCalc = Math.min(Math.max(patrimonio * (o.p1AdesaoPerc || 1.5) / 100, o.p1PisoUSD || 10000), o.p1TetoUSD || 25000);
  const p2AdesaoCalc = Math.min(Math.max(patrimonio * (o.p2AdesaoPerc || 2.5) / 100, o.p2PisoUSD || 10000), o.p2TetoUSD || 50000);

  // Prioridade: manual > destino > automático
  const p1AdesaoBase = destino.p1AdesaoUSD !== null ? destino.p1AdesaoUSD : p1AdesaoCalc;
  const p2AdesaoBase = destino.p2AdesaoUSD !== null ? destino.p2AdesaoUSD : p2AdesaoCalc;
  const p1AdesaoUSD = p1AdesaoUSDManual !== null ? p1AdesaoUSDManual : p1AdesaoBase;
  const p2AdesaoUSD = p2AdesaoUSDManual !== null ? p2AdesaoUSDManual : p2AdesaoBase;

  const manutencaoMensalUSD = destino.manutencaoAnualUSD / 12;
  const p1MensalidadeUSD = Math.max(patrimonio * ((o.p1MensalidadePercAUM || 0.10) / 100), o.p1MensalidadeMinUSD || 300) + manutencaoMensalUSD;
  const p1AdesaoBRL = Math.round(p1AdesaoUSD * cambio);
  const p1MensalidadeBRL = Math.round(p1MensalidadeUSD * cambio);
  const p1EntradaBRL = Math.round(p1AdesaoBRL * entradaPerc / 100);
  const p1SaldoBRL = p1AdesaoBRL - p1EntradaBRL;
  const p1ParcelaBRL = nParcelas > 0 ? Math.round(p1SaldoBRL / nParcelas) : 0;
  const p1LTV12 = p1AdesaoBRL + p1MensalidadeBRL * 12;

  const p2MensalidadeUSD = Math.max(patrimonio * ((o.p2MensalidadePercAUM || 0.15) / 100), o.p2MensalidadeMinUSD || 500) + (o.p2TaxaJuridicaUSD || 300) + manutencaoMensalUSD;
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

  const ajusteAtivo = p1AdesaoUSDManual !== null || p2AdesaoUSDManual !== null || cambio !== (o.cambio || 5.80);

  const destinoLabel = destino.p1AdesaoUSD !== null ? destino.nome : 'A Definir';

  return (
    <div className="space-y-5">
      {/* Dados do cliente */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">1. Patrimônio, Cliente e Destino</h2>
          <CambioWidget value={cambio} onChange={setCambio} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Patrimônio sob Gestão (USD)" hint="Total de ativos que serão alocados na estrutura offshore">
            <NumInput value={patrimonio} onChange={setPatrimonio} prefix="USD" step={10000} />
          </Field>
          <Field label="Cliente / Empresa">
            <ClienteSelector value={cliente} onChange={setCliente} />
          </Field>
          <Field label="Destino / Jurisdição">
            <select
              value={destino.nome}
              onChange={e => setDestino(destinos.find(d => d.nome === e.target.value) || destinos[0])}
              className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-400 bg-white"
            >
              {destinos.map(d => (
                <option key={d.nome} value={d.nome}>
                  {d.nome}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {destino.p1AdesaoUSD !== null && (
          <div className="mt-3 bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-xs text-cyan-800">
            <strong>{destino.nome}</strong> — Constituição P1: {fmtUSD(destino.p1AdesaoUSD)} | Constituição P2: {fmtUSD(destino.p2AdesaoUSD)} | Manutenção: {fmtUSD(destino.manutencaoAnualUSD)}/ano ({fmtUSD(Math.round(manutencaoMensalUSD))}/mês)
          </div>
        )}

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
              <Field label="Adesão P1 — override (USD)" hint="Deixe em 0 para usar o destino/automático">
                <NumInput
                  value={p1AdesaoUSDManual !== null ? p1AdesaoUSDManual : Math.round(p1AdesaoBase)}
                  onChange={v => setP1AdesaoUSDManual(v > 0 ? v : null)}
                  prefix="US$" step={500}
                  highlight={p1AdesaoUSDManual !== null}
                />
              </Field>
              <Field label="Adesão P2 — override (USD)" hint="Deixe em 0 para usar o destino/automático">
                <NumInput
                  value={p2AdesaoUSDManual !== null ? p2AdesaoUSDManual : Math.round(p2AdesaoBase)}
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
          tag={destino.p1AdesaoUSD !== null ? destino.nome : 'Conta + Gestão Básica'}
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
        />
        <PropostaCard
          titulo="Proposta 2 — Estrutura Completa"
          tag={destino.p2AdesaoUSD !== null ? `${destino.nome} — Estrutura Completa` : 'Holding + Blindagem + Gestão Ativa'}
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
        />
      </div>

      <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-4 text-xs text-cyan-700 leading-relaxed">
        {destino.p1AdesaoUSD !== null
          ? <><strong>Destino: {destino.nome}.</strong> Custos de constituição e manutenção incluídos nos valores.</>
          : <><strong>Piso mínimo de adesão: USD 10.000.</strong> Selecione um destino para pré-configurar os custos de constituição.</>
        }
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowProposta(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#0a1f35] hover:bg-[#1a3150] text-yellow-400 border border-yellow-400/30 rounded-xl text-sm font-semibold transition">
          <FileText className="w-4 h-4" />
          Criar Proposta PDF
        </button>
      </div>

      {showProposta && (
        <CriarPropostaModal
          produto="Offshore"
          cliente={cliente}
          onClose={() => setShowProposta(false)}
          propostas={[
            { titulo: 'Proposta 1 — Estrutura Simples', tag: destinoLabel, items: [
              destino.p1AdesaoUSD !== null ? { label: 'Jurisdicao / Destino', value: destino.nome } : null,
              { label: 'Patrimonio sob Gestao (AUM)', value: fmtUSD(patrimonio) + ' aprox. ' + fmtBRL(patrimonio * cambio) },
              { label: 'Cambio Base', value: '1 USD = R$ ' + fmtNum(cambio, 2) },
              { label: 'Adesao (Constituicao)', value: fmtUSD(Math.round(p1AdesaoUSD)) + ' aprox. ' + fmtBRL(p1AdesaoBRL), highlight: true },
              entradaPerc < 100 ? { label: 'Entrada (' + entradaPerc + '%)', value: fmtBRL(p1EntradaBRL) } : { label: 'Pagamento', value: 'A vista' },
              entradaPerc < 100 ? { label: nParcelas + 'x de', value: fmtBRL(p1ParcelaBRL) } : null,
              { label: 'Mensalidade (gestao + manutencao)', value: fmtUSD(Math.round(p1MensalidadeUSD)) + ' aprox. ' + fmtBRL(p1MensalidadeBRL), highlight: true },
              { label: 'Investimento Total (12 meses)', value: fmtBRL(p1LTV12) },
            ].filter(Boolean)},
            { titulo: 'Proposta 2 — Estrutura Completa', tag: destino.p2AdesaoUSD !== null ? destino.nome : 'Holding + Blindagem + Gestao Ativa', items: [
              destino.p2AdesaoUSD !== null ? { label: 'Jurisdicao / Destino', value: destino.nome } : null,
              { label: 'Patrimonio sob Gestao (AUM)', value: fmtUSD(patrimonio) + ' aprox. ' + fmtBRL(patrimonio * cambio) },
              { label: 'Cambio Base', value: '1 USD = R$ ' + fmtNum(cambio, 2) },
              { label: 'Adesao (Constituicao Holding)', value: fmtUSD(Math.round(p2AdesaoUSD)) + ' aprox. ' + fmtBRL(p2AdesaoBRL), highlight: true },
              entradaPerc < 100 ? { label: 'Entrada (' + entradaPerc + '%)', value: fmtBRL(p2EntradaBRL) } : { label: 'Pagamento', value: 'A vista' },
              entradaPerc < 100 ? { label: nParcelas + 'x de', value: fmtBRL(p2ParcelaBRL) } : null,
              { label: 'Mensalidade (gestao + assessoria + manutencao)', value: fmtUSD(Math.round(p2MensalidadeUSD)) + ' aprox. ' + fmtBRL(p2MensalidadeBRL), highlight: true },
              { label: 'Investimento Total (12 meses)', value: fmtBRL(p2LTV12) },
            ].filter(Boolean)},
          ]}
        />
      )}
    </div>
  );
}