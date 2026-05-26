import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { loadConfig, saveConfig } from './usePrecificacaoConfig';
import { toast } from 'sonner';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, step = 1, prefix }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        className={`w-full border border-gray-200 rounded-lg py-2 text-sm ${prefix ? 'pl-10' : 'pl-3'} pr-3 focus:outline-none focus:border-blue-400`}
      />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-4 text-sm">{title}</h3>
      {children}
    </div>
  );
}

export default function ConfigPrecificacao() {
  const [cfg, setCfg] = useState(loadConfig);

  useEffect(() => {
    setCfg(loadConfig());
  }, []);

  function set(path, val) {
    const parts = path.split('.');
    setCfg(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = val;
      return next;
    });
  }

  function addRow(table) {
    setCfg(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (table === 'principal') {
        next.sg.tabelaPrincipal.push({ min: 0, investPerc: 8, txManutencao: 800 });
      } else {
        next.sg.tabelaExito.push({ min: 0, mensalidade: 500 });
      }
      return next;
    });
  }

  function removeRow(table, idx) {
    setCfg(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (table === 'principal') {
        next.sg.tabelaPrincipal.splice(idx, 1);
      } else {
        next.sg.tabelaExito.splice(idx, 1);
      }
      return next;
    });
  }

  function updateRow(table, idx, field, val) {
    setCfg(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (table === 'principal') {
        next.sg.tabelaPrincipal[idx][field] = val;
      } else {
        next.sg.tabelaExito[idx][field] = val;
      }
      return next;
    });
  }

  function updateDestino(idx, field, val) {
    setCfg(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.destinos[idx][field] = field === 'nome' ? val : (val === '' ? null : parseFloat(val) || 0);
      return next;
    });
  }

  function addDestino() {
    setCfg(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.destinos.push({ nome: 'Nova Jurisdição', p1AdesaoUSD: 3000, p2AdesaoUSD: 5000, manutencaoAnualUSD: 1500 });
      return next;
    });
  }

  function removeDestino(idx) {
    setCfg(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.destinos.splice(idx, 1);
      return next;
    });
  }

  function salvar() {
    saveConfig(cfg);
    toast.success('Configuracoes salvas!');
  }

  return (
    <div className="space-y-5">
      <Section title="Parametros da Conta Internacional">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Field label="Mensalidade Padrao (US$)">
            <NumInput value={cfg.ci.mensalidadePadrao} onChange={v => set('ci.mensalidadePadrao', v)} prefix="US$" />
          </Field>
          <Field label="Piso Minimo Adesao (US$)">
            <NumInput value={cfg.ci.pisoAdesao} onChange={v => set('ci.pisoAdesao', v)} prefix="US$" />
          </Field>
          <Field label="LTV Simulacao (meses)">
            <NumInput value={cfg.ci.ltvMeses} onChange={v => set('ci.ltvMeses', v)} />
          </Field>
          <Field label="Cambio Base (1 USD = X BRL)">
            <NumInput value={cfg.ci.cambio} onChange={v => set('ci.cambio', v)} step={0.01} />
          </Field>
          <Field label="% Adesao s/ Faturamento">
            <NumInput value={cfg.ci.adesaoPerc} onChange={v => set('ci.adesaoPerc', v)} step={0.5} />
          </Field>
        </div>
      </Section>

      <Section title="Parametros Dolarize - Proposta 1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Field label="Mensalidade Estatica (R$)">
            <NumInput value={cfg.dolarize.p1Mensalidade} onChange={v => set('dolarize.p1Mensalidade', v)} prefix="R$" />
          </Field>
          <Field label="Taxa Rate Padrao (%)">
            <NumInput value={cfg.dolarize.p1Rate} onChange={v => set('dolarize.p1Rate', v)} step={0.1} />
          </Field>
          <Field label="% Adesao s/ Fat">
            <NumInput value={cfg.dolarize.p1AdesaoPerc} onChange={v => set('dolarize.p1AdesaoPerc', v)} step={0.5} />
          </Field>
          <Field label="Piso Minimo Adesao (R$)">
            <NumInput value={cfg.dolarize.p1Piso} onChange={v => set('dolarize.p1Piso', v)} prefix="R$" />
          </Field>
          <Field label="Teto Maximo Adesao (R$)">
            <NumInput value={cfg.dolarize.p1Teto} onChange={v => set('dolarize.p1Teto', v)} prefix="R$" />
          </Field>
        </div>
      </Section>

      <Section title="Parametros Dolarize - Proposta 2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Field label="Taxa Rate Alvo (%)"><NumInput value={cfg.dolarize.p2Rate} onChange={v => set('dolarize.p2Rate', v)} step={0.1} /></Field>
          <Field label="% Adesao s/ Fat"><NumInput value={cfg.dolarize.p2AdesaoPerc} onChange={v => set('dolarize.p2AdesaoPerc', v)} step={0.5} /></Field>
          <Field label="Ciclo LTV p/ Compensacao"><NumInput value={cfg.dolarize.p2CicloLTV} onChange={v => set('dolarize.p2CicloLTV', v)} /></Field>
          <Field label="Piso Minimo Adesao (R$)"><NumInput value={cfg.dolarize.p2Piso} onChange={v => set('dolarize.p2Piso', v)} prefix="R$" /></Field>
          <Field label="Teto Maximo Adesao (R$)"><NumInput value={cfg.dolarize.p2Teto} onChange={v => set('dolarize.p2Teto', v)} prefix="R$" /></Field>
        </div>
      </Section>

      <Section title="Parametros Offshore">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Field label="Cambio (1 USD = R$)">
            <NumInput value={cfg.offshore?.cambio || 5.80} onChange={v => set('offshore.cambio', v)} step={0.01} />
          </Field>
          <Field label="P1 % Adesao s/ Patrimonio">
            <NumInput value={cfg.offshore?.p1AdesaoPerc || 1.5} onChange={v => set('offshore.p1AdesaoPerc', v)} step={0.1} />
          </Field>
          <Field label="P1 Piso Adesao (USD)">
            <NumInput value={cfg.offshore?.p1PisoUSD || 3000} onChange={v => set('offshore.p1PisoUSD', v)} prefix="US$" />
          </Field>
          <Field label="P1 Teto Adesao (USD)">
            <NumInput value={cfg.offshore?.p1TetoUSD || 25000} onChange={v => set('offshore.p1TetoUSD', v)} prefix="US$" />
          </Field>
          <Field label="P1 Mensalidade % AUM/mes">
            <NumInput value={cfg.offshore?.p1MensalidadePercAUM || 0.10} onChange={v => set('offshore.p1MensalidadePercAUM', v)} step={0.01} />
          </Field>
          <Field label="P1 Mensalidade Minima (USD)">
            <NumInput value={cfg.offshore?.p1MensalidadeMinUSD || 300} onChange={v => set('offshore.p1MensalidadeMinUSD', v)} prefix="US$" />
          </Field>
          <Field label="P2 % Adesao s/ Patrimonio">
            <NumInput value={cfg.offshore?.p2AdesaoPerc || 2.5} onChange={v => set('offshore.p2AdesaoPerc', v)} step={0.1} />
          </Field>
          <Field label="P2 Piso Adesao (USD)">
            <NumInput value={cfg.offshore?.p2PisoUSD || 5000} onChange={v => set('offshore.p2PisoUSD', v)} prefix="US$" />
          </Field>
          <Field label="P2 Teto Adesao (USD)">
            <NumInput value={cfg.offshore?.p2TetoUSD || 50000} onChange={v => set('offshore.p2TetoUSD', v)} prefix="US$" />
          </Field>
          <Field label="P2 Mensalidade % AUM/mes">
            <NumInput value={cfg.offshore?.p2MensalidadePercAUM || 0.15} onChange={v => set('offshore.p2MensalidadePercAUM', v)} step={0.01} />
          </Field>
          <Field label="P2 Mensalidade Minima (USD)">
            <NumInput value={cfg.offshore?.p2MensalidadeMinUSD || 500} onChange={v => set('offshore.p2MensalidadeMinUSD', v)} prefix="US$" />
          </Field>
          <Field label="P2 Taxa Juridica Fixa (USD/mes)">
            <NumInput value={cfg.offshore?.p2TaxaJuridicaUSD || 300} onChange={v => set('offshore.p2TaxaJuridicaUSD', v)} prefix="US$" />
          </Field>
        </div>
      </Section>

      <Section title="Parametros Canal Bancario - Proposta 1 (Padrao)">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Field label="Adesao por Conta (R$)"><NumInput value={cfg.canalBancario.p1AdesaoPorConta} onChange={v => set('canalBancario.p1AdesaoPorConta', v)} prefix="R$" /></Field>
          <Field label="Teto Adesao (R$)"><NumInput value={cfg.canalBancario.p1TetoAdesao} onChange={v => set('canalBancario.p1TetoAdesao', v)} prefix="R$" /></Field>
          <Field label="Mensalidade por Conta (R$)"><NumInput value={cfg.canalBancario.p1MensalidadePorConta} onChange={v => set('canalBancario.p1MensalidadePorConta', v)} prefix="R$" /></Field>
          <Field label="% Volume (ex: 0.3 = 0.3%)"><NumInput value={cfg.canalBancario.p1PercVolume * 100} onChange={v => set('canalBancario.p1PercVolume', v / 100)} step={0.05} /></Field>
          <Field label="Teto Mensalidade (R$)"><NumInput value={cfg.canalBancario.p1TetoMensalidade} onChange={v => set('canalBancario.p1TetoMensalidade', v)} prefix="R$" /></Field>
        </div>
      </Section>

      <Section title="Parametros Canal Bancario - Proposta 2 (Dedicado)">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Field label="Adesao por Conta (R$)"><NumInput value={cfg.canalBancario.p2AdesaoPorConta} onChange={v => set('canalBancario.p2AdesaoPorConta', v)} prefix="R$" /></Field>
          <Field label="Setup Fixo (R$)"><NumInput value={cfg.canalBancario.p2SetupFixo} onChange={v => set('canalBancario.p2SetupFixo', v)} prefix="R$" /></Field>
          <Field label="Teto Adesao (R$)"><NumInput value={cfg.canalBancario.p2TetoAdesao} onChange={v => set('canalBancario.p2TetoAdesao', v)} prefix="R$" /></Field>
          <Field label="Mensalidade por Conta (R$)"><NumInput value={cfg.canalBancario.p2MensalidadePorConta} onChange={v => set('canalBancario.p2MensalidadePorConta', v)} prefix="R$" /></Field>
          <Field label="% Volume (ex: 0.5 = 0.5%)"><NumInput value={cfg.canalBancario.p2PercVolume * 100} onChange={v => set('canalBancario.p2PercVolume', v / 100)} step={0.05} /></Field>
          <Field label="Teto Mensalidade (R$)"><NumInput value={cfg.canalBancario.p2TetoMensalidade} onChange={v => set('canalBancario.p2TetoMensalidade', v)} prefix="R$" /></Field>
        </div>
      </Section>

      <Section title="Parametros do Seguro Garantia">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Field label="Duracao padrao (meses)">
            <NumInput value={cfg.sg.duracao} onChange={v => set('sg.duracao', v)} />
          </Field>
          <Field label="Parcelas pagas (No Exito)">
            <NumInput value={cfg.sg.parcelasPagas} onChange={v => set('sg.parcelasPagas', v)} />
          </Field>
          <Field label="Piso Mensalidade No Exito (R$)">
            <NumInput value={cfg.sg.pisoMensalidadeExito} onChange={v => set('sg.pisoMensalidadeExito', v)} prefix="R$" />
          </Field>
          <Field label="Piso % Aceitacao Minimo">
            <NumInput value={cfg.sg.pisoAceitacaoPerc} onChange={v => set('sg.pisoAceitacaoPerc', v)} step={0.5} />
          </Field>
        </div>

        {/* Tabela Principal */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tabela Principal &mdash; Investimento e Tx. Manutencao</span>
            <button onClick={() => addRow('principal')} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-3.5 h-3.5" /> Adicionar faixa
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Divida maior ou igual a (R$)</th>
                  <th className="px-3 py-2 text-left">Investimento (%)</th>
                  <th className="px-3 py-2 text-left">Tx. Manutencao (R$/mes)</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cfg.sg.tabelaPrincipal.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <input type="number" value={row.min} onChange={e => updateRow('principal', i, 'min', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-blue-400" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={row.investPerc} onChange={e => updateRow('principal', i, 'investPerc', parseFloat(e.target.value) || 0)} step="0.1"
                        className="w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-blue-400" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={row.txManutencao} onChange={e => updateRow('principal', i, 'txManutencao', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-blue-400" />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeRow('principal', i)} className="text-red-400 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela No Exito */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tabela No Exito &mdash; Mensalidade Padrao</span>
            <button onClick={() => addRow('exito')} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-3.5 h-3.5" /> Adicionar faixa
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Divida maior ou igual a (R$)</th>
                  <th className="px-3 py-2 text-left">Mensalidade (R$/mes)</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cfg.sg.tabelaExito.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <input type="number" value={row.min} onChange={e => updateRow('exito', i, 'min', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-blue-400" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={row.mensalidade} onChange={e => updateRow('exito', i, 'mensalidade', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-blue-400" />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeRow('exito', i)} className="text-red-400 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="Jurisdições / Destinos Offshore">
        <p className="text-xs text-gray-500 mb-3">Defina os custos de constituição (P1 e P2) e manutenção anual por jurisdição. Use <strong>null</strong> (campo vazio) para deixar o cálculo automático por AUM.</p>
        <div className="overflow-x-auto rounded-xl border border-gray-200 mb-3">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Jurisdição / Destino</th>
                <th className="px-3 py-2 text-left">Constituição P1 (US$)</th>
                <th className="px-3 py-2 text-left">Constituição P2 (US$)</th>
                <th className="px-3 py-2 text-left">Manutenção/ano (US$)</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(cfg.destinos || []).map((d, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <input type="text" value={d.nome} onChange={e => updateDestino(i, 'nome', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-blue-400" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={d.p1AdesaoUSD ?? ''} placeholder="automático"
                      onChange={e => updateDestino(i, 'p1AdesaoUSD', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-blue-400" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={d.p2AdesaoUSD ?? ''} placeholder="automático"
                      onChange={e => updateDestino(i, 'p2AdesaoUSD', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-blue-400" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={d.manutencaoAnualUSD ?? 0}
                      onChange={e => updateDestino(i, 'manutencaoAnualUSD', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-blue-400" />
                  </td>
                  <td className="px-3 py-2">
                    {i > 0 && (
                      <button onClick={() => removeDestino(i)} className="text-red-400 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addDestino} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
          <Plus className="w-3.5 h-3.5" /> Adicionar jurisdição
        </button>
      </Section>

      <button
        onClick={salvar}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
      >
        <Save className="w-4 h-4" />
        Salvar Todos os Parametros
      </button>
    </div>
  );
}