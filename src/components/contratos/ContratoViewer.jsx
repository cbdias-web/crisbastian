import { useState } from 'react';
import { todayBrasilia } from '@/lib/dateUtils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Printer, CheckCircle2, ShoppingCart, Edit2, Loader2, Link2, Save, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ContratoForm from './ContratoForm';
import FluxoContrato from './FluxoContrato';

const TIPO_COLOR = {
  'CONTA GLOBAL': '#0f1e35',
  'CONTA INTERNACIONAL': '#1a3a6b',
  'DOLARIZE': '#b45309',
};

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', cls: 'bg-gray-100 text-gray-500' },
  gerado: { label: 'PDF Gerado', cls: 'bg-blue-100 text-blue-700' },
  assinado: { label: 'Assinado', cls: 'bg-emerald-100 text-emerald-700' },
  aguardando_pagamento: { label: 'Aguard. Pagamento', cls: 'bg-amber-100 text-amber-700' },
  pago: { label: 'Pago', cls: 'bg-violet-100 text-violet-700' },
  no_pipeline: { label: 'No Pipeline', cls: 'bg-purple-100 text-purple-700' },
};

const STATUS_ORDER = ['rascunho', 'gerado', 'assinado', 'aguardando_pagamento', 'pago', 'no_pipeline'];

export default function ContratoViewer({ contrato: contratoInicial, onBack, onUpdate, isAdmin }) {
  const [contrato, setContrato] = useState(contratoInicial);
  const [editando, setEditando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [enviandoVenda, setEnviandoVenda] = useState(false);
  const [editandoLink, setEditandoLink] = useState(false);
  const [editandoLinkAditivo, setEditandoLinkAditivo] = useState(false);
  const [linkAditivoInput, setLinkAditivoInput] = useState(contrato.link_assinatura_aditivo || '');
  const [salvandoLinkAditivo, setSalvandoLinkAditivo] = useState(false);
  const navigate = useNavigate();
  const [linkInput, setLinkInput] = useState(contrato.link_assinatura || '');
  const [salvandoLink, setSalvandoLink] = useState(false);
  const queryClient = useQueryClient();

  const handleUpdate = (c) => {
    setContrato(c);
    onUpdate(c);
  };

  const salvarLink = async () => {
    setSalvandoLink(true);
    try {
      await base44.entities.Contrato.update(contrato.id, { link_assinatura: linkInput.trim() });
      handleUpdate({ ...contrato, link_assinatura: linkInput.trim() });
      setEditandoLink(false);
      toast.success('Link de assinatura salvo!');
    } catch (err) {
      toast.error('Erro ao salvar link: ' + err.message);
    }
    setSalvandoLink(false);
  };

  const salvarLinkAditivo = async () => {
    setSalvandoLinkAditivo(true);
    try {
      await base44.entities.Contrato.update(contrato.id, { link_assinatura_aditivo: linkAditivoInput.trim() || null });
      handleUpdate({ ...contrato, link_assinatura_aditivo: linkAditivoInput.trim() || null });
      setEditandoLinkAditivo(false);
      toast.success('Link do aditivo salvo!');
    } catch (err) {
      toast.error('Erro ao salvar link: ' + err.message);
    }
    setSalvandoLinkAditivo(false);
  };

  const cor = TIPO_COLOR[contrato.tipo] || '#0f1e35';

  const marcarAssinado = useMutation({
    mutationFn: () => base44.entities.Contrato.update(contrato.id, { status: 'assinado' }),
    onSuccess: (c) => { handleUpdate(c); toast.success('Contrato marcado como assinado!'); },
  });

  // Enviar para Vendas só liberado se pago + comprovante (ou admin)
  const podeEnviarVendas = isAdmin ||
    (STATUS_ORDER.indexOf(contrato.status) >= STATUS_ORDER.indexOf('pago') && !!contrato.comprovante_url);

  const enviarParaVendas = async () => {
    if (!podeEnviarVendas) {
      toast.error('Conclua todas as etapas do contrato antes de enviar para Vendas.');
      return;
    }
    if (!confirm('Criar pré-venda a partir deste contrato e ir para a aba Vendas para finalizar?')) return;
    setEnviandoVenda(true);
    try {
      const c = contrato;
      // Criar venda pré-preenchida com dados do contrato
      const vendaPayload = {
        produto: c.tipo,
        assessor_comercial: c.vendedor_nome || '',
        vendedor_id: c.vendedor_id || '',
        cliente: c.nome || '',
        cpf_cnpj: c.cpf_cnpj || '',
        valor: c.valor_adesao || c.valor_total || 0,
        valor_total_contrato: c.valor_total || 0,
        data: todayBrasilia(),
        forma_pagamento: c.origem_pagamento || '',
        observacao: `Originado do Contrato ${c.tipo}. Comprovante de pagamento anexado.`,
      };
      // Preservar indicadores do contrato
      if (c.indicadores?.length > 0) {
        vendaPayload.indicadores = c.indicadores;
        vendaPayload.espelhamento = c.indicadores[0]?.nome || '';
        vendaPayload.espelhamento_id = c.indicadores[0]?.id || '';
        vendaPayload.percentual_comissao_espelhamento = c.indicadores[0]?.percentual || 0;
      }
      await base44.entities.Venda.create(vendaPayload);
      await base44.entities.Contrato.update(contrato.id, { status: 'no_pipeline' });
      queryClient.invalidateQueries(['contratos']);
      queryClient.invalidateQueries(['vendas']);
      handleUpdate({ ...contrato, status: 'no_pipeline' });
      toast.success('Venda criada! Redirecionando para Vendas...');
      setTimeout(() => navigate('/Vendas'), 1200);
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
    setEnviandoVenda(false);
  };

  const gerarPDF = async () => {
    setGerando(true);
    try {
      const res = await base44.functions.invoke('gerarContratosPDF', { contrato_id: contrato.id });
      const { pdf_base64, filename } = res.data;
      const binary = atob(pdf_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `contrato_${contrato.tipo.replace(/ /g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      if (contrato.status === 'rascunho') {
        await base44.entities.Contrato.update(contrato.id, { status: 'gerado' });
        handleUpdate({ ...contrato, status: 'gerado' });
      }
      queryClient.invalidateQueries(['contratos']);
      toast.success('PDF gerado e baixado!');
    } catch (err) {
      toast.error('Erro ao gerar PDF: ' + err.message);
    }
    setGerando(false);
  };

  if (editando) {
    return (
      <ContratoForm
        tipo={contrato.tipo}
        user={{ id: contrato.vendedor_id, email: contrato.created_by }}
        contratoExistente={contrato}
        onSaved={(c) => { handleUpdate(c); setEditando(false); }}
        onCancel={() => setEditando(false)}
      />
    );
  }

  const stCfg = STATUS_CONFIG[contrato.status] || STATUS_CONFIG.rascunho;
  const fmtVal = (v) => v != null && v > 0 ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;
  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar para Contratos
        </button>

        {/* Header */}
        <div className="rounded-2xl p-5 mb-5 text-white flex items-start justify-between shadow-lg" style={{ background: cor }}>
          <div>
            <p className="text-xs opacity-60 uppercase tracking-widest font-semibold mb-1">{contrato.tipo}</p>
            <h2 className="text-xl font-bold">{contrato.nome}</h2>
            <p className="text-sm opacity-70 mt-0.5">{contrato.cpf_cnpj}</p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${stCfg.cls}`}>{stCfg.label}</span>
        </div>

        {/* Ações rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <button onClick={gerarPDF} disabled={gerando}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-white text-xs font-semibold transition hover:opacity-90 shadow-md disabled:opacity-50"
            style={{ background: cor }}>
            {gerando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
            {gerando ? 'Gerando...' : 'Gerar PDF'}
          </button>
          <button onClick={() => setEditando(true)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition shadow-sm">
            <Edit2 className="w-5 h-5" />
            Editar
          </button>
          <button
            onClick={() => marcarAssinado.mutate()}
            disabled={STATUS_ORDER.indexOf(contrato.status) >= STATUS_ORDER.indexOf('assinado') || marcarAssinado.isPending}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-md disabled:opacity-40">
            <CheckCircle2 className="w-5 h-5" />
            Assinado
          </button>
          <button
            onClick={enviarParaVendas}
            disabled={contrato.status === 'no_pipeline' || enviandoVenda || !podeEnviarVendas}
            title={!podeEnviarVendas ? 'Conclua todas as etapas antes' : 'Criar venda e ir para Vendas'}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-md disabled:opacity-40">
            {enviandoVenda ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
            {enviandoVenda ? 'Enviando...' : 'Enviar para Vendas'}
          </button>
        </div>

        {/* Links de Assinatura (admin) */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/50 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Links de Assinatura Online</p>
          </div>
          <div className="p-5 space-y-4">
            {/* Link Contrato */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                Contrato
                {(isAdmin || !contrato.link_assinatura) && !editandoLink && (
                  <button onClick={() => { setEditandoLink(true); setLinkInput(contrato.link_assinatura || ''); }}
                    className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold flex items-center gap-1 transition normal-case">
                    <Edit2 className="w-2.5 h-2.5" /> {contrato.link_assinatura ? 'Editar' : 'Adicionar link'}
                  </button>
                )}
              </p>
              {editandoLink ? (
                <div className="flex gap-2">
                  <input type="url" value={linkInput} onChange={e => setLinkInput(e.target.value)}
                    placeholder="https://..." autoFocus
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400" />
                  <button onClick={salvarLink} disabled={salvandoLink}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:bg-amber-700 transition disabled:opacity-50">
                    {salvandoLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
                  </button>
                  <button onClick={() => setEditandoLink(false)} className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                </div>
              ) : contrato.link_assinatura ? (
                <div className="flex items-center gap-3">
                  <a href={contrato.link_assinatura} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-sm text-blue-600 hover:text-blue-800 underline truncate flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />{contrato.link_assinatura}
                  </a>
                  <button onClick={() => { navigator.clipboard.writeText(contrato.link_assinatura); toast.success('Link copiado!'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition">
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
              ) : (
                <p className="text-sm text-amber-600 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                  Aguardando administrador adicionar o link de assinatura online.
                </p>
              )}
            </div>

            {/* Link Aditivo */}
            <div className="border-t border-amber-100 pt-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                Aditivo de Contrato <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold normal-case">opcional</span>
                {isAdmin && !editandoLinkAditivo && (
                  <button onClick={() => { setEditandoLinkAditivo(true); setLinkAditivoInput(contrato.link_assinatura_aditivo || ''); }}
                    className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold flex items-center gap-1 transition normal-case">
                    <Edit2 className="w-2.5 h-2.5" /> {contrato.link_assinatura_aditivo ? 'Editar' : 'Adicionar link'}
                  </button>
                )}
              </p>
              {editandoLinkAditivo ? (
                <div className="flex gap-2">
                  <input type="url" value={linkAditivoInput} onChange={e => setLinkAditivoInput(e.target.value)}
                    placeholder="https://..." autoFocus
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400" />
                  <button onClick={salvarLinkAditivo} disabled={salvandoLinkAditivo}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:bg-amber-700 transition disabled:opacity-50">
                    {salvandoLinkAditivo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
                  </button>
                  <button onClick={() => setEditandoLinkAditivo(false)} className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                </div>
              ) : contrato.link_assinatura_aditivo ? (
                <div className="flex items-center gap-3">
                  <a href={contrato.link_assinatura_aditivo} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-sm text-blue-600 hover:text-blue-800 underline truncate flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />{contrato.link_assinatura_aditivo}
                  </a>
                  <button onClick={() => { navigator.clipboard.writeText(contrato.link_assinatura_aditivo); toast.success('Link copiado!'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition">
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Nenhum link de aditivo adicionado</p>
              )}
            </div>
          </div>
        </div>

        {/* Fluxo de etapas */}
        <FluxoContrato contrato={contrato} isAdmin={isAdmin} onUpdate={handleUpdate} />

        {/* Dados do contrato */}
        <div className="space-y-4">
          <Section title="Dados Pessoais">
            <Grid>
              <Item label="Nome" value={contrato.nome} />
              <Item label="CPF / CNPJ" value={contrato.cpf_cnpj} />
              <Item label="Responsável Legal" value={contrato.responsavel_legal} />
              <Item label="CPF Responsável" value={contrato.cpf_responsavel} />
              <Item label="Nascimento" value={fmtDate(contrato.nascimento)} />
              <Item label="Profissão" value={contrato.profissao} />
              <Item label="Estado Civil" value={contrato.estado_civil} />
              <Item label="Nacionalidade" value={contrato.nacionalidade} />
              <Item label="E-mail" value={contrato.email} />
              <Item label="Telefone" value={contrato.telefone} />
            </Grid>
          </Section>

          <Section title="Endereço">
            <Grid>
              <Item label="Endereço" value={contrato.endereco} span />
              <Item label="Bairro" value={contrato.bairro} />
              <Item label="Cidade" value={contrato.cidade} />
              <Item label="Estado" value={contrato.estado} />
              <Item label="CEP" value={contrato.cep} />
            </Grid>
          </Section>

          <Section title="Dados Financeiros">
            <Grid>
              <Item label="Valor Total" value={fmtVal(contrato.valor_total)} highlight />
              <Item label="Valor de Adesão" value={fmtVal(contrato.valor_adesao)} />
              <Item label="Parcela" value={fmtVal(contrato.valor_parcela)} />
              <Item label="Nº Parcelas" value={contrato.num_parcelas ? `${contrato.num_parcelas}x` : null} />
              <Item label="Forma de Pagamento" value={contrato.forma_pagamento} />
              <Item label="1º Pagamento" value={fmtDate(contrato.data_primeiro_pagamento)} />
              <Item label="Dia Vencimento" value={contrato.dia_vencimento ? `Dia ${contrato.dia_vencimento}` : null} />
              <Item label="Prazo" value={contrato.prazo_meses ? `${contrato.prazo_meses} meses` : null} />
              <Item label="Moeda" value={contrato.moeda} />
              <Item label="Cotação" value={contrato.cotacao ? `R$ ${Number(contrato.cotacao).toFixed(4)}` : null} />
              <Item label="Valor em Moeda Estrangeira" value={contrato.valor_em_moeda ? `${contrato.moeda || 'USD'} ${Number(contrato.valor_em_moeda).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null} />
            </Grid>
            {contrato.banco && (
              <Grid>
                <Item label="Banco" value={contrato.banco} />
                <Item label="Agência" value={contrato.agencia} />
                <Item label="Conta" value={contrato.conta} />
              </Grid>
            )}

            {/* Comissões */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Comissões</p>
              <div className="space-y-2">
                {contrato.vendedor_nome && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{contrato.vendedor_nome}</p>
                      <p className="text-[10px] text-gray-400">Vendedor responsável</p>
                    </div>
                  </div>
                )}
                {contrato.indicadores?.map((ind, i) => (
                  <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{ind.nome}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{ind.tipo || 'indicador'}</p>
                    </div>
                    <span className="text-sm font-bold text-amber-700">{ind.percentual}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {contrato.observacoes && (
            <Section title="Observações">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{contrato.observacoes}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>;
}

function Item({ label, value, highlight, span }) {
  if (!value) return null;
  return (
    <div className={span ? 'col-span-2 sm:col-span-3' : ''}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm mt-0.5 ${highlight ? 'text-lg font-bold text-[#1a3150]' : 'text-gray-800 font-medium'}`}>{value}</p>
    </div>
  );
}