import { useState, useEffect } from 'react';
import { Copy, CheckCircle, FileText } from 'lucide-react';
import CriarPropostaModal from './CriarPropostaModal';
import ClienteSelector from './ClienteSelector';
import { loadConfig, saveConfig, findTableRow, fmtBRL, fmtNum } from './usePrecificacaoConfig';
import AdminParamsPanel from './AdminParamsPanel';
import useIsAdmin from '@/hooks/useIsAdmin';
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
      <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} step={step} min={min}
        className={`w-full border border-gray-200 rounded-lg py-2 text-sm ${prefix ? 'pl-10' : 'pl-3'} pr-3 focus:outline-none focus:border-blue-400`} />
    </div>
  );
}

function ResultCard({ label, value, sub, color = 'gray' }) {
  const colors = { gray: 'bg-gray-50 border-gray-100', blue: 'bg-blue-50 border-blue-100', green: 'bg-green-50 border-green-100' };
  return (
    <div className={`rounded-xl p-3 border ${colors[color]}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-base font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function SimuladorSeguroGarantia() {
  const isAdmin = useIsAdmin();
  const [cfg, setCfg] = useState(loadConfig);

  // Parâmetros admin
  const [duracao, setDuracao] = useState(() => loadConfig().sg.duracao);
  const [parcelasPagas, setParcelasPagas] = useState(() => loadConfig().sg.parcelasPagas);
  const [pisoMensalidadeExito, setPisoMensalidadeExito] = useState(() => loadConfig().sg.pisoMensalidadeExito);
  const [pisoAceitacaoPerc, setPisoAceitacaoPerc] = useState(() => loadConfig().sg.pisoAceitacaoPerc);

  const [divida, setDivida] = useState(200000);
  const [garantia, setGarantia] = useState(200000);
  const [modalidade, setModalidade] = useState('ambos');
  const [cliente, setCliente] = useState('');
  const [entradaPercP, setEntradaPercP] = useState(50);
  const [nParcelasP, setNParcelasP] = useState(6);
  const [mensalidadeExito, setMensalidadeExito] = useState(0);
  const [adicionalExitoPerc, setAdicionalExitoPerc] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [copiedP, setCopiedP] = useState(false);
  const [copiedE, setCopiedE] = useState(false);
  const [showProposta, setShowProposta] = useState(false);

  useEffect(() => {
    const c = loadConfig(); setCfg(c);
    setDuracao(c.sg.duracao); setParcelasPagas(c.sg.parcelasPagas);
    setPisoMensalidadeExito(c.sg.pisoMensalidadeExito); setPisoAceitacaoPerc(c.sg.pisoAceitacaoPerc);
  }, []);

  useEffect(() => { calcular(); }, [divida, garantia, cfg, entradaPercP, nParcelasP, mensalidadeExito, adicionalExitoPerc, duracao, parcelasPagas, pisoMensalidadeExito, pisoAceitacaoPerc]);

  function calcular() {
    const sg = cfg.sg;
    const rowP = findTableRow(sg.tabelaPrincipal, divida);
    const investPerc = rowP ? rowP.investPerc : 8;
    const txManutencao = rowP ? rowP.txManutencao : 800;
    const investimentoR = divida * investPerc / 100;
    const entradaR = Math.round(investimentoR * entradaPercP / 100);
    const saldoR = investimentoR - entradaR;
    const parcelaR = nParcelasP > 0 ? saldoR / nParcelasP : 0;
    const totalComManu = investimentoR + txManutencao * duracao;

    const rowE = findTableRow(sg.tabelaExito, divida);
    const mens = mensalidadeExito > 0 ? mensalidadeExito : (rowE ? rowE.mensalidade : pisoMensalidadeExito);
    const adicPerc = adicionalExitoPerc > 0 ? adicionalExitoPerc : pisoAceitacaoPerc;
    const adicR = divida * adicPerc / 100;
    const totalExito = mens * parcelasPagas + adicR;
    const reprDivida = divida > 0 ? (mens * 12 / divida * 100) : 0;

    if (mensalidadeExito === 0) setMensalidadeExito(Math.round(mens));
    if (adicionalExitoPerc === 0) setAdicionalExitoPerc(adicPerc);

    setResultado({ investPerc, txManutencao, investimentoR, entradaR, saldoR, parcelaR, totalComManu, mensalidadeExito: Math.round(mens), adicPerc, adicR, totalExito, reprDivida });
  }

  const sg = cfg.sg;
  const adminEdited = duracao !== sg.duracao || parcelasPagas !== sg.parcelasPagas ||
    pisoMensalidadeExito !== sg.pisoMensalidadeExito || pisoAceitacaoPerc !== sg.pisoAceitacaoPerc;

  function salvarAdmin() {
    const nova = { ...cfg, sg: { ...sg, duracao, parcelasPagas, pisoMensalidadeExito, pisoAceitacaoPerc } };
    saveConfig(nova); setCfg(nova); toast.success('Parâmetros Seguro Garantia salvos!');
  }

  function resetarAdmin() {
    setDuracao(sg.duracao); setParcelasPagas(sg.parcelasPagas);
    setPisoMensalidadeExito(sg.pisoMensalidadeExito); setPisoAceitacaoPerc(sg.pisoAceitacaoPerc);
    toast.success('Resetado para o padrão salvo.');
  }

  function gerarTextoP() {
    if (!resultado) return '';
    const { investimentoR, entradaR, parcelaR, txManutencao, totalComManu, investPerc } = resultado;
    const entradaStr = entradaPercP >= 100
      ? `Pagamento à vista: ${fmtBRL(investimentoR)}`
      : `Entrada (${entradaPercP}%): ${fmtBRL(entradaR)}\nSaldo em ${nParcelasP}x de ${fmtBRL(parcelaR)}`;
    return `📋 Proposta Seguro Garantia — ${cliente || '[Cliente]'}\n──────────────────────────────\nProduto: Seguro Garantia — Modelo Principal\nValor da Dívida: ${fmtBRL(divida)}\nValor da Garantia: ${fmtBRL(garantia)}\nDuração: ${duracao} meses\n\n📌 Condições\nInvestimento (${fmtNum(investPerc, 1)}%): ${fmtBRL(investimentoR)}\n${entradaStr}\nTx. Manutenção: ${fmtBRL(txManutencao)}/mês\nTotal c/ Tx. Manutenção: ${fmtBRL(totalComManu)}\n──────────────────────────────\nProposta gerada via Hub de Precificação — Villela Exchange`;
  }

  function gerarTextoE() {
    if (!resultado) return '';
    const { mensalidadeExito: mens, adicPerc, adicR, totalExito } = resultado;
    return `📋 Proposta Seguro Garantia — ${cliente || '[Cliente]'}\n──────────────────────────────\nProduto: Seguro Garantia — Modelo No Êxito\nValor da Dívida: ${fmtBRL(divida)}\nValor da Garantia: ${fmtBRL(garantia)}\n\n✅ Condições No Êxito\nMensalidade: ${fmtBRL(mens)}/mês\nParcelas simuladas: ${parcelasPagas}x\nAdicional na Aceitação (${fmtNum(adicPerc, 1)}%): ${fmtBRL(adicR)}\nTotal máximo estimado: ${fmtBRL(totalExito)}\n──────────────────────────────\nProposta gerada via Hub de Precificação — Villela Exchange`;
  }

  async function copiarP() {
    await navigator.clipboard.writeText(gerarTextoP());
    setCopiedP(true); toast.success('Proposta Principal copiada!');
    setTimeout(() => setCopiedP(false), 2000);
  }

  async function copiarE() {
    await navigator.clipboard.writeText(gerarTextoE());
    setCopiedE(true); toast.success('Proposta No Êxito copiada!');
    setTimeout(() => setCopiedE(false), 2000);
  }

  const showPrincipal = modalidade === 'principal' || modalidade === 'ambos';
  const showExito = modalidade === 'exito' || modalidade === 'ambos';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">1. Dados do Contrato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Field label="Valor da Dívida (R$)">
            <NumInput value={divida} onChange={setDivida} prefix="R$" />
          </Field>
          <Field label="Valor da Garantia (R$)">
            <NumInput value={garantia} onChange={setGarantia} prefix="R$" />
          </Field>
          <Field label="Duração do Contrato">
            <div className="w-full border border-gray-100 bg-gray-50 rounded-lg py-2 px-3 text-sm text-gray-600 font-medium">
              {duracao} meses
            </div>
          </Field>
        </div>
        <Field label="Modalidade">
          <div className="flex gap-2 mt-1">
            {[{ id: 'principal', label: '📌 Principal' }, { id: 'exito', label: '✅ No Êxito' }, { id: 'ambos', label: 'Ambos' }].map(m => (
              <button key={m.id} onClick={() => setModalidade(m.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${modalidade === m.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Painel Admin */}
      <AdminParamsPanel isAdmin={isAdmin} edited={adminEdited} onSave={salvarAdmin} onReset={resetarAdmin}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Duração (meses)">
            <NumInput value={duracao} onChange={setDuracao} min={1} />
          </Field>
          <Field label="Parcelas No Êxito">
            <NumInput value={parcelasPagas} onChange={setParcelasPagas} min={1} />
          </Field>
          <Field label="Piso Mensalidade Êxito (R$)">
            <NumInput value={pisoMensalidadeExito} onChange={setPisoMensalidadeExito} prefix="R$" />
          </Field>
          <Field label="Piso % Adicional Aceitação">
            <NumInput value={pisoAceitacaoPerc} onChange={setPisoAceitacaoPerc} step={0.5} />
          </Field>
        </div>
        <p className="text-xs text-gray-400 mt-2">Para editar as tabelas de faixas por valor de dívida, acesse a aba Parâmetros.</p>
      </AdminParamsPanel>

      <div className={`grid gap-4 ${showPrincipal && showExito ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {showPrincipal && resultado && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <span className="text-base">📌</span> Modelo: Principal
            </h3>
            <div className="space-y-3 mb-4">
              <Field label="Entrada (%)">
                <NumInput value={entradaPercP} onChange={setEntradaPercP} step={5} min={0} />
              </Field>
              <Field label="Nº de Parcelas (saldo)">
                <NumInput value={nParcelasP} onChange={setNParcelasP} min={1} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <ResultCard label={`Investimento (${fmtNum(resultado.investPerc, 1)}%)`} value={fmtBRL(resultado.investimentoR)} color="blue" />
              <ResultCard label="Tx. Manutenção/mês" value={fmtBRL(resultado.txManutencao)} />
              <ResultCard label="Entrada" value={fmtBRL(resultado.entradaR)} />
              <ResultCard label="Saldo em Parcelas" value={`${nParcelasP}x ${fmtBRL(resultado.parcelaR)}`} />
              <ResultCard label="Total c/ Tx. Manutenção" value={fmtBRL(resultado.totalComManu)} color="blue" />
            </div>
            <button onClick={copiarP} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition">
              {copiedP ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copiar Proposta Principal
            </button>
          </div>
        )}

        {showExito && resultado && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <span className="text-base">✅</span> Modelo: No Êxito
            </h3>
            <div className="space-y-3 mb-4">
              <Field label="Mensalidade (R$)">
                <NumInput value={mensalidadeExito} onChange={setMensalidadeExito} prefix="R$" />
              </Field>
              <Field label="Adicional na Aceitação (%)">
                <NumInput value={adicionalExitoPerc} onChange={setAdicionalExitoPerc} step={0.5} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <ResultCard label="Mensalidade" value={fmtBRL(resultado.mensalidadeExito) + '/mês'} color="green" />
              <ResultCard label={`Invest. máx. (${parcelasPagas} meses)`} value={fmtBRL(resultado.mensalidadeExito * parcelasPagas)} />
              <ResultCard label="Represent. dívida a.a." value={fmtNum(resultado.reprDivida, 2) + '%'} />
              <ResultCard label={`Adicional Aceitação (${fmtNum(resultado.adicPerc, 1)}%)`} value={fmtBRL(resultado.adicR)} />
              <ResultCard label="Total do Êxito (R$)" value={fmtBRL(resultado.totalExito)} color="green" />
            </div>
            <button onClick={copiarE} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition">
              {copiedE ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copiar Proposta No Êxito
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">2. Geração de Proposta</h2>
        <Field label="Cliente / Empresa">
          <ClienteSelector value={cliente} onChange={setCliente} />
        </Field>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setShowProposta(true)} disabled={!resultado}
            className="flex items-center gap-2 px-6 py-3 bg-[#0a1f35] hover:bg-[#1a3150] text-yellow-400 border border-yellow-400/30 rounded-xl text-sm font-semibold transition disabled:opacity-50">
            <FileText className="w-4 h-4" />
            Criar Proposta PDF
          </button>
        </div>
      </div>

      {showProposta && resultado && (
        <CriarPropostaModal
          produto="Seguro Garantia"
          cliente={cliente}
          onClose={() => setShowProposta(false)}
          propostas={[
            showPrincipal ? { titulo: 'Modelo Principal', tag: 'Investimento ' + fmtNum(resultado.investPerc, 1) + '%', items: [
              { label: 'Valor da Divida', value: fmtBRL(divida) },
              { label: 'Valor da Garantia', value: fmtBRL(garantia) },
              { label: 'Duracao do Contrato', value: duracao + ' meses' },
              { label: 'Investimento (' + fmtNum(resultado.investPerc, 1) + '%)', value: fmtBRL(resultado.investimentoR), highlight: true },
              entradaPercP < 100 ? { label: 'Entrada (' + entradaPercP + '%)', value: fmtBRL(resultado.entradaR) } : { label: 'Pagamento', value: 'A vista' },
              entradaPercP < 100 ? { label: nParcelasP + 'x de', value: fmtBRL(resultado.parcelaR) } : null,
              { label: 'Tx. Manutencao/mes', value: fmtBRL(resultado.txManutencao), highlight: true },
              { label: 'Total c/ Tx. Manutencao', value: fmtBRL(resultado.totalComManu) },
            ]} : null,
            showExito ? { titulo: 'Modelo No Exito', tag: 'Mensalidade pos-aprovacao', items: [
              { label: 'Valor da Divida', value: fmtBRL(divida) },
              { label: 'Mensalidade', value: fmtBRL(resultado.mensalidadeExito) + '/mes', highlight: true },
              { label: 'Parcelas simuladas', value: parcelasPagas + 'x' },
              { label: 'Adicional na Aceitacao (' + fmtNum(resultado.adicPerc, 1) + '%)', value: fmtBRL(resultado.adicR) },
              { label: 'Total maximo estimado', value: fmtBRL(resultado.totalExito), highlight: true },
            ]} : null,
          ].filter(Boolean)}
        />
      )}
    </div>
  );
}