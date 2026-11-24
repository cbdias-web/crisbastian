import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Globe2, Hash, MapPin, Car, FileText, Info } from 'lucide-react';

// Campos do contrato OFFSHORE (modelo nº 000142/2026): numeração, local, jurisdição,
// prazo, escopo e Anexo I — que só é habilitado quando a negociação exigir.

export const OFFSHORE_DEFAULTS = {
  rg: '',
  numero_contrato: '',
  local_assinatura: 'Porto Alegre',
  estrutura_jurisdicao: 'Wyoming, EUA',
  offshore_tipo_entidade: 'Limited Liability Company (LLC)',
  offshore_estrutura_nacional: true,
  offshore_manutencao_meses: 12,
  prazo_implantacao_dias: 90,
  offshore_entrada_forma: 'dinheiro',
  anexo_ativo: false,
  anexo_tipo: 'veiculo',
  anexo_veiculo: {},
  anexo_titulo: '',
  anexo_texto: '',
};

const JURISDICOES = ['Wyoming, EUA', 'Delaware, EUA', 'Flórida, EUA', 'Texas, EUA', 'Nevada, EUA'];

const CAMPOS_VEICULO = [
  ['marca_modelo', 'Marca / Modelo / Versão', 'Ex.: FIAT/TORO FREEDOM AT', 2],
  ['especie_tipo', 'Espécie / Tipo', 'Ex.: ESPECIAL CAMINHONETE'],
  ['carroceria', 'Carroceria', 'Ex.: ABERTA/CABINE DUPLA'],
  ['ano_fabricacao', 'Ano de fabricação', '2018'],
  ['ano_modelo', 'Ano modelo', '2019'],
  ['placa', 'Placa', 'ABC1D23'],
  ['renavam', 'RENAVAM', ''],
  ['chassi', 'Chassi', ''],
  ['motor', 'Nº do motor', ''],
  ['cor', 'Cor predominante', 'PRATA'],
  ['combustivel', 'Combustível', 'ÁLCOOL/GASOLINA'],
  ['potencia', 'Potência / Cilindrada', '139CV/1800'],
  ['crv', 'Número do CRV', ''],
  ['municipio_registro', 'Município de registro (CRLV)', 'Ex.: TABOÃO DA SERRA/SP – Exercício 2026', 2],
];

const lbl = 'text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5';
const inp = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0e7490]/20 focus:border-[#0e7490] transition-all bg-white hover:border-gray-300 placeholder:text-gray-300';

const Opcao = ({ ativo, onClick, titulo, desc }) => (
  <button type="button" onClick={onClick}
    className={`text-left rounded-xl border-2 px-4 py-3 transition ${ativo ? 'border-[#0e7490] bg-cyan-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
    <p className={`text-sm font-bold ${ativo ? 'text-[#0e7490]' : 'text-gray-700'}`}>{titulo}</p>
    {desc && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{desc}</p>}
  </button>
);

function proximoNumero(lista, ano) {
  let max = 0;
  for (const n of lista) {
    const m = String(n || '').match(/^(\d+)\/(\d{4})$/);
    if (m && Number(m[2]) === ano) max = Math.max(max, Number(m[1]));
  }
  return `${String(max + 1).padStart(6, '0')}/${ano}`;
}

export default function ContratoOffshoreEstrutura({ form, setForm }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setVeic = (k, v) => setForm(f => ({ ...f, anexo_veiculo: { ...(f.anexo_veiculo || {}), [k]: v } }));
  const ano = Number(String(form.data_contrato || new Date().toISOString()).slice(0, 4));

  const { data: sugerido } = useQuery({
    queryKey: ['proximo-numero-offshore', ano],
    queryFn: async () => {
      const r = await base44.entities.Contrato.filter({ numero_contrato: { $regex: `/${ano}$` } }, '-created_date', 2000);
      return proximoNumero(r.map(x => x.numero_contrato), ano);
    },
    staleTime: 30 * 1000,
  });

  const dacao = form.offshore_entrada_forma === 'dacao_veiculo';
  const anexoAtivo = dacao || !!form.anexo_ativo;
  const temEntrada = parseInt(form.num_parcelas) > 0 && parseFloat(form.valor_adesao) > 0;
  const v = form.anexo_veiculo || {};
  const jurisdicaoLivre = form.estrutura_jurisdicao && !JURISDICOES.includes(form.estrutura_jurisdicao);

  const escolherEntrada = (forma) => setForm(f => ({
    ...f,
    offshore_entrada_forma: forma,
    ...(forma === 'dacao_veiculo' ? { anexo_ativo: true, anexo_tipo: 'veiculo' } : (f.anexo_tipo === 'veiculo' ? { anexo_ativo: false } : {})),
  }));

  return (
    <div className="space-y-6">
      {/* Identificação do instrumento */}
      <section>
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-[#0e7490]" /> Identificação do contrato</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Nº do contrato</label>
            <input value={form.numero_contrato || ''} onChange={e => set('numero_contrato', e.target.value)}
              placeholder={sugerido ? `Automático: ${sugerido}` : 'Automático'} className={inp} />
            <p className="text-[10px] text-gray-400 mt-1">Deixe em branco: o número é gerado ao criar o PDF.</p>
          </div>
          <div>
            <label className={lbl}>Local da assinatura</label>
            <input value={form.local_assinatura || ''} onChange={e => set('local_assinatura', e.target.value)} placeholder="Porto Alegre" className={inp} />
          </div>
          <div>
            <label className={lbl}>Data do contrato</label>
            <input type="date" value={form.data_contrato || ''} onChange={e => set('data_contrato', e.target.value)} className={inp} />
          </div>
        </div>
      </section>

      {/* Estrutura */}
      <section>
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-[#0e7490]" /> Estrutura a ser constituída</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Local da estrutura (jurisdição)</label>
            <select value={jurisdicaoLivre ? '__outra' : (form.estrutura_jurisdicao || '')}
              onChange={e => set('estrutura_jurisdicao', e.target.value === '__outra' ? ' ' : e.target.value)}
              className={inp + ' cursor-pointer'}>
              {JURISDICOES.map(j => <option key={j} value={j}>{j}</option>)}
              <option value="__outra">Outro estado dos EUA…</option>
            </select>
            {jurisdicaoLivre && (
              <input value={form.estrutura_jurisdicao.trim()} onChange={e => set('estrutura_jurisdicao', e.target.value ? `${e.target.value.replace(/,?\s*EUA$/i, '')}, EUA` : ' ')}
                placeholder="Nome do estado" className={inp + ' mt-2'} />
            )}
          </div>
          <div>
            <label className={lbl}>Tipo de entidade</label>
            <input value={form.offshore_tipo_entidade || ''} onChange={e => set('offshore_tipo_entidade', e.target.value)} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Prazo de entrega (dias)</label>
              <input type="number" min="1" value={form.prazo_implantacao_dias ?? ''} onChange={e => set('prazo_implantacao_dias', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Manutenção (meses)</label>
              <input type="number" min="1" value={form.offshore_manutencao_meses ?? ''} onChange={e => set('offshore_manutencao_meses', e.target.value)} className={inp} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Opcao ativo={form.offshore_estrutura_nacional !== false} onClick={() => set('offshore_estrutura_nacional', true)}
            titulo="EUA + estrutura nacional no Brasil" desc="Inclui filial/representação no Brasil, conta em BRL e tradução juramentada (modelo completo)." />
          <Opcao ativo={form.offshore_estrutura_nacional === false} onClick={() => set('offshore_estrutura_nacional', false)}
            titulo="Somente estrutura nos EUA" desc="Remove do contrato as cláusulas da estrutura nacional." />
        </div>
      </section>

      {/* Entrada */}
      <section>
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#0e7490]" /> Como será paga a entrada</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Opcao ativo={!dacao} onClick={() => escolherEntrada('dinheiro')} titulo="Em dinheiro"
            desc={`PIX/transferência — ${form.forma_pagamento || 'forma definida na aba Financeiro'}.`} />
          <Opcao ativo={dacao} onClick={() => escolherEntrada('dacao_veiculo')} titulo="Dação em pagamento de veículo"
            desc="Gera automaticamente o Anexo I – Termo de Dação em Pagamento de Veículo." />
        </div>
        {dacao && !temEntrada && parseInt(form.num_parcelas) > 0 && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 flex gap-1.5">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> Informe na aba Financeiro o <b>Valor de Entrada</b> — é o valor atribuído ao veículo.
          </p>
        )}
      </section>

      {/* Anexo */}
      <section className="border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 rounded-t-xl">
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#0e7490]" /> Anexo I</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Use apenas quando a negociação exigir (dação de bem, condição especial etc.).</p>
          </div>
          <label className={`flex items-center gap-2 text-xs font-semibold ${dacao ? 'text-gray-400' : 'text-gray-700 cursor-pointer'}`}>
            <input type="checkbox" checked={anexoAtivo} disabled={dacao}
              onChange={e => setForm(f => ({ ...f, anexo_ativo: e.target.checked, anexo_tipo: e.target.checked ? (f.anexo_tipo || 'personalizado') : f.anexo_tipo }))}
              className="w-4 h-4 rounded border-gray-300 text-[#0e7490] focus:ring-[#0e7490]" />
            {dacao ? 'Obrigatório (dação)' : 'Incluir anexo'}
          </label>
        </div>

        {anexoAtivo && (
          <div className="p-4 space-y-4">
            {!dacao && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Opcao ativo={form.anexo_tipo === 'personalizado'} onClick={() => set('anexo_tipo', 'personalizado')}
                  titulo="Anexo personalizado" desc="Título e texto livres, com assinatura das partes." />
                <Opcao ativo={form.anexo_tipo === 'veiculo'} onClick={() => escolherEntrada('dacao_veiculo')}
                  titulo="Dação de veículo" desc="Muda a entrada para dação e usa o termo padrão." />
              </div>
            )}

            {(dacao || form.anexo_tipo === 'veiculo') ? (
              <>
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> Dados conforme o CRLV. O veículo é transferido à adquirente indicada (Villela Brasil Consultoria – Filial).</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {CAMPOS_VEICULO.map(([k, l, ph, span]) => (
                    <div key={k} className={span === 2 ? 'sm:col-span-2' : ''}>
                      <label className={lbl}>{l}</label>
                      <input value={v[k] || ''} onChange={e => setVeic(k, e.target.value)} placeholder={ph} className={inp} />
                    </div>
                  ))}
                  <div>
                    <label className={lbl}>Entrega (dias úteis)</label>
                    <input type="number" min="1" value={v.prazo_entrega_dias ?? 5} onChange={e => setVeic('prazo_entrega_dias', e.target.value)} className={inp} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className={lbl}>Título do anexo</label>
                  <input value={form.anexo_titulo || ''} onChange={e => set('anexo_titulo', e.target.value)} placeholder="Ex.: Condições Específicas de Pagamento" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Texto do anexo</label>
                  <textarea value={form.anexo_texto || ''} onChange={e => set('anexo_texto', e.target.value)} rows={8}
                    placeholder="Escreva as condições do anexo. Separe os parágrafos com uma linha em branco."
                    className={inp + ' resize-y'} />
                  <p className="text-[10px] text-gray-400 mt-1">O anexo só entra no contrato se tiver texto.</p>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
