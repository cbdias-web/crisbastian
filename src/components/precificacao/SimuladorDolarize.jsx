import { useState, useEffect } from 'react';
import { Copy, CheckCircle } from 'lucide-react';
import { loadConfig, saveConfig, clamp, fmtBRL, fmtNum } from './usePrecificacaoConfig';
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
  const isAdmin = useIsAdmin();
  const [cfg, setCfg] = useState(loadConfig);

  // Parâmetros admin (inicializados do config)
  const [p1Rate, setP1Rate] = useState(() => loadConfig().dolarize.p1Rate);
  const [p1Mensalidade, setP1Mensalidade] = useState(() => loadConfig().dolarize.p1Mensalidade);
  const [p1AdesaoPerc, setP1AdesaoPerc] = useState(() => loadConfig().dolarize.p1AdesaoPerc);
  const [p1Piso, setP1Piso] = useState(() => loadConfig().dolarize.p1Piso);
  const [p1Teto, setP1Teto] = useState(() => loadConfig().dolarize.p1Teto);
  const [p2Rate, setP2Rate] = useState(() => loadConfig().dolarize.p2Rate);
  const [p2AdesaoPerc, setP2AdesaoPerc] = useState(() => loadConfig().dolarize.p2AdesaoPerc);
  const [p2Piso, setP2Piso] = useState(() => loadConfig().dolarize.p2Piso);
  const [p2Teto, setP2Teto] = useState(() => loadConfig().dolarize.p2Teto);

  // Dados do contrato
  const [faturamento, setFaturamento] = useState(50000);
  const [divida, setDivida] = useState(200000);
  const [cliente, setCliente] = useState('');
  const [entradaPerc, setEntradaPerc] = useState(50);
  const [nParcelas, setNParcelas] = useState(3);
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);

  useEffect(() => {
    const c = loadConfig();
    setCfg(c);
    const d = c.dolarize;
    setP1Rate(d.p1Rate); setP1Mensalidade(d.p1Mensalidade);
    setP1AdesaoPerc(d.p1AdesaoPerc); setP1Piso(d.p1Piso); setP1Teto(d.p1Teto);
    setP2Rate(d.p2Rate); setP2AdesaoPerc(d.p2AdesaoPerc); setP2Piso(d.p2Piso); setP2Teto(d.p2Teto);
  }, []);

  // Cálculos — piso mínimo R$5.000 enforçado
  const p1Adesao = Math.round(clamp(faturamento * p1AdesaoPerc / 100, Math.max(p1Piso, 5000), p1Teto));
  const p2AdesaoBase = Math.round(clamp(faturamento * p2AdesaoPerc / 100, Math.max(p2Piso, 5000), p2Teto));
  const sgRow = cfg.sg.tabelaExito.filter(r => divida >= r.min).sort((a, b) => b.min - a.min)[0];
  const p2Mensalidade = sgRow ? sgRow.mensalidade : p1Mensalidade;

  const p1EntradaR = Math.round(p1Adesao * entradaPerc / 100);
  const p1SaldoR = p1Adesao - p1EntradaR;
  const p1ParcelaR = nParcelas > 0 ? Math.round(p1SaldoR / nParcelas) : 0;
  const p2EntradaR = Math.round(p2AdesaoBase * entradaPerc / 100);
  const p2SaldoR = p2AdesaoBase - p2EntradaR;
  const p2ParcelaR = nParcelas > 0 ? Math.round(p2SaldoR / nParcelas) : 0;

  const d = cfg.dolarize;
  const adminEdited = p1Rate !== d.p1Rate || p1Mensalidade !== d.p1Mensalidade ||
    p1AdesaoPerc !== d.p1AdesaoPerc || p1Piso !== d.p1Piso || p1Teto !== d.p1Teto ||
    p2Rate !== d.p2Rate || p2AdesaoPerc !== d.p2AdesaoPerc;

  function salvarAdmin() {
    const nova = { ...cfg, dolarize: { ...cfg.dolarize, p1Rate, p1Mensalidade, p1AdesaoPerc, p1Piso, p1Teto, p2Rate, p2AdesaoPerc, p2Piso, p2Teto } };
    saveConfig(nova); setCfg(nova); toast.success('Parâmetros Dolarize salvos!');
  }

  function resetarAdmin() {
    const d = cfg.dolarize;
    setP1Rate(d.p1Rate); setP1Mensalidade(d.p1Mensalidade); setP1AdesaoPerc(d.p1AdesaoPerc);
    setP1Piso(d.p1Piso); setP1Teto(d.p1Teto); setP2Rate(d.p2Rate); setP2AdesaoPerc(d.p2AdesaoPerc);
    setP2Piso(d.p2Piso); setP2Teto(d.p2Teto); toast.success('Resetado para o padrão salvo.');
  }

  function gerarTextoP1() {
    const entradaStr = entradaPerc >= 100
      ? `Pagamento a vista: ${fmtBRL(p1Adesao)}`
      : `Entrada (${entradaPerc}%): ${fmtBRL(p1EntradaR)}\nSaldo em ${nParcelas}x de ${fmtBRL(p1ParcelaR)}`;
    return `Proposta Dolarize -- ${cliente || '[Cliente]'}\n---\nProduto: Dolarize\nFaturamento Mensal: ${fmtBRL(faturamento)}\nDivida Total: ${fmtBRL(divida)}\n\nProposta 1 - Padrao\nValor de Adesao: ${fmtBRL(p1Adesao)}\n${entradaStr}\nMensalidade: ${fmtBRL(p1Mensalidade)}/mes\nTaxa Rate: ${fmtNum(p1Rate)}% a.m.\n---\nProposta gerada via Hub de Precificacao - Villela Exchange`;
  }

  function gerarTextoP2() {
    const entradaStr = entradaPerc >= 100
      ? `Pagamento a vista: ${fmtBRL(p2AdesaoBase)}`
      : `Entrada (${entradaPerc}%): ${fmtBRL(p2EntradaR)}\nSaldo em ${nParcelas}x de ${fmtBRL(p2ParcelaR)}`;
    return `Proposta Dolarize -- ${cliente || '[Cliente]'}\n---\nProduto: Dolarize (com Seguro Garantia)\nFaturamento Mensal: ${fmtBRL(faturamento)}\nDivida Total: ${fmtBRL(divida)}\n\nProposta 2 - Com Seguro Garantia\nValor de Adesao: ${fmtBRL(p2AdesaoBase)}\n${entradaStr}\nMensalidade (vinculada ao Seguro): ${fmtBRL(p2Mensalidade)}/mes\nTaxa Rate Alvo: ${fmtNum(p2Rate)}% a.m.\n---\nProposta gerada via Hub de Precificacao - Villela Exchange`;
  }

  async function copiar(texto, setCopied) {
    await navigator.clipboard.writeText(texto);
    setCopied(true); toast.success('Proposta copiada!');
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

      {/* Painel Admin */}
      <AdminParamsPanel isAdmin={isAdmin} edited={adminEdited} onSave={salvarAdmin} onReset={resetarAdmin}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Field label="P1 Taxa Rate (%)">
            <NumInput value={p1Rate} onChange={setP1Rate} step={0.1} />
          </Field>
          <Field label="P1 Mensalidade (R$)">
            <NumInput value={p1Mensalidade} onChange={setP1Mensalidade} prefix="R$" />
          </Field>
          <Field label="P1 % Adesão s/ Fat">
            <NumInput value={p1AdesaoPerc} onChange={setP1AdesaoPerc} step={0.5} />
          </Field>
          <Field label="P1 Piso Mín (R$) ≥5k">
            <NumInput value={p1Piso} onChange={v => setP1Piso(Math.max(v, 5000))} prefix="R$" />
          </Field>
          <Field label="P1 Teto Máx (R$)">
            <NumInput value={p1Teto} onChange={setP1Teto} prefix="R$" />
          </Field>
          <Field label="P2 Taxa Rate (%)">
            <NumInput value={p2Rate} onChange={setP2Rate} step={0.1} />
          </Field>
          <Field label="P2 % Adesão s/ Fat">
            <NumInput value={p2AdesaoPerc} onChange={setP2AdesaoPerc} step={0.5} />
          </Field>
          <Field label="P2 Piso Mín (R$) ≥5k">
            <NumInput value={p2Piso} onChange={v => setP2Piso(Math.max(v, 5000))} prefix="R$" />
          </Field>
          <Field label="P2 Teto Máx (R$)">
            <NumInput value={p2Teto} onChange={setP2Teto} prefix="R$" />
          </Field>
        </div>
        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
          💡 <strong>Lógica inversa:</strong> quanto menor a Taxa Rate oferecida ao cliente, maior deve ser a Adesão para compensar o retorno da operação.
          Piso mínimo de adesão é R$&nbsp;5.000 (enforçado automaticamente).
        </div>
      </AdminParamsPanel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* P1 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 text-sm">Proposta 1 — Padrão</h3>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Sem Seguro</span>
          </div>
          <div className="space-y-3">
            <Field label="Valor de Adesão (R$)">
              <div className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm font-semibold text-gray-700">{fmtBRL(p1Adesao)}</div>
            </Field>
            <Field label="Mensalidade (R$/mês)">
              <div className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm font-semibold text-gray-700">{fmtBRL(p1Mensalidade)}/mês</div>
            </Field>
            <Field label="Taxa Rate (%)">
              <div className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm font-semibold text-gray-700">{fmtNum(p1Rate)}% a.m.</div>
            </Field>
          </div>
        </div>

        {/* P2 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 text-sm">Proposta 2 — Com Seguro Garantia</h3>
            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Com Seguro</span>
          </div>
          <div className="space-y-3">
            <Field label="Valor de Adesão (R$)">
              <div className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm font-semibold text-gray-700">{fmtBRL(p2AdesaoBase)}</div>
            </Field>
            <Field label="Mensalidade (Seguro) (R$/mês)">
              <div className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm font-semibold text-gray-700">{fmtBRL(p2Mensalidade)}/mês</div>
            </Field>
            <Field label="Taxa Rate Alvo (%)">
              <div className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm font-semibold text-gray-700">{fmtNum(p2Rate)}% a.m.</div>
            </Field>
          </div>
        </div>
      </div>

      {/* Formato de Pagamento */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">2. Formato de Pagamento e Proposta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Field label="Nome do Cliente / Empresa">
            <input type="text" value={cliente} onChange={e => setCliente(e.target.value)}
              placeholder="Ex: Empresa XYZ Ltda"
              className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-400" />
          </Field>
          <Field label="Entrada da Adesão (%)">
            <NumInput value={entradaPerc} onChange={setEntradaPerc} step={5} min={0} />
          </Field>
          <Field label="Entrada (R$ - base P1)">
            <div className="w-full border border-gray-100 bg-gray-50 rounded-lg py-2 px-3 text-sm text-gray-600 font-medium">{fmtBRL(p1EntradaR)}</div>
          </Field>
          <Field label="No de Parcelas (saldo)">
            <NumInput value={nParcelas} onChange={setNParcelas} min={1} />
          </Field>
        </div>
        {entradaPerc >= 100 && (
          <p className="text-xs text-blue-600 mb-4 bg-blue-50 rounded-lg px-3 py-2">Entrada 100% — proposta gerada como pagamento à vista.</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <ResultCard label="Adesão P1" value={fmtBRL(p1Adesao)} sub={`Entrada: ${fmtBRL(p1EntradaR)}`} />
          <ResultCard label="Mensalidade P1" value={fmtBRL(p1Mensalidade) + '/mês'} sub={`Rate: ${fmtNum(p1Rate)}%`} />
          <ResultCard label="Adesão P2" value={fmtBRL(p2AdesaoBase)} sub={`Entrada: ${fmtBRL(p2EntradaR)}`} />
          <ResultCard label="Mensalidade P2" value={fmtBRL(p2Mensalidade) + '/mês'} sub={`Rate: ${fmtNum(p2Rate)}%`} />
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => copiar(gerarTextoP1(), setCopied1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition">
            {copied1 ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copiar Proposta 1
          </button>
          <button onClick={() => copiar(gerarTextoP2(), setCopied2)}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition">
            {copied2 ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copiar Proposta 2
          </button>
        </div>
      </div>
    </div>
  );
}