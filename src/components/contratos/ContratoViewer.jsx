import { useState } from 'react';
import { todayBrasilia } from '@/lib/dateUtils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Printer, CheckCircle2, ShoppingCart, Edit2, Loader2, Link2, Save, Copy, ExternalLink, Upload, FileUp, X, Trash2, UserCog, RefreshCw, ChevronDown, ScrollText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ContratoForm from './ContratoForm';
import FluxoContrato from './FluxoContrato';
import BoletosParcelas from './BoletosParcelas';

const TIPO_COLOR = {
  'CONTA GLOBAL': '#0f1e35',
  'CONTA INTERNACIONAL': '#1a3a6b',
  'DOLARIZE': '#b45309',
  'ROF': '#047857',
  'CANAL BANCÁRIO': '#6d28d9',
  'OFFSHORE': '#0e7490',
  'GARANTIAS': '#be123c',
  'HORA TÉCNICA': '#0f766e',
};

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', cls: 'bg-gray-500/25 text-gray-200' },
  gerado: { label: 'PDF Gerado', cls: 'bg-blue-500/25 text-blue-200' },
  assinado: { label: 'Assinado', cls: 'bg-emerald-500/25 text-emerald-200' },
  aguardando_pagamento: { label: 'Aguard. Pagamento', cls: 'bg-amber-500/25 text-amber-200' },
  pago: { label: 'Pago', cls: 'bg-violet-500/25 text-violet-200' },
  no_pipeline: { label: 'No Pipeline', cls: 'bg-purple-500/25 text-purple-200' },
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
  const [uploadandoPDF, setUploadandoPDF] = useState(false);
  const [editandoGerente, setEditandoGerente] = useState(false);
  const [gerenteInput, setGerenteInput] = useState({ id: contrato.vendedor_id || '', nome: contrato.vendedor_nome || '' });
  const [salvandoGerente, setSalvandoGerente] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const queryClient = useQueryClient();

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-ativos'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: isAdmin && editandoGerente,
  });

  const alterarStatus = async (novoStatus) => {
    if (!confirm(`Alterar status para "${STATUS_CONFIG[novoStatus]?.label}"?`)) return;
    setAlterandoStatus(true);
    setStatusDropdownOpen(false);
    try {
      await base44.entities.Contrato.update(contrato.id, { status: novoStatus });
      handleUpdate({ ...contrato, status: novoStatus });
      queryClient.invalidateQueries(['contratos']);
      toast.success(`Status alterado para "${STATUS_CONFIG[novoStatus]?.label}"!`);
    } catch (err) {
      toast.error('Erro ao alterar status: ' + err.message);
    }
    setAlterandoStatus(false);
  };

  const salvarGerente = async () => {
    if (!gerenteInput.id) { return; }
    setSalvandoGerente(true);
    try {
      await base44.entities.Contrato.update(contrato.id, { vendedor_id: gerenteInput.id, vendedor_nome: gerenteInput.nome });
      handleUpdate({ ...contrato, vendedor_id: gerenteInput.id, vendedor_nome: gerenteInput.nome });
      setEditandoGerente(false);
      toast.success('Gerente atualizado!');
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message);
    }
    setSalvandoGerente(false);
  };

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
      if (linkInput.trim()) notificar('link_assinatura_adicionado', 'gerente');
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

  const notificar = async (evento, destinatarios) => {
    try {
      await base44.functions.invoke('notificarStatusContrato', {
        contrato_id: contrato.id,
        evento,
        destinatarios,
      });
    } catch (e) {
      console.warn('Notificação falhou (não crítico):', e.message);
    }
  };

  const uploadPDFExterno = async (file, substituindo = false) => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Por favor, selecione um arquivo PDF.');
      return;
    }
    if (substituindo && !confirm('Substituir o PDF atual por este novo arquivo? O arquivo anterior será removido.')) {
      return;
    }
    setUploadandoPDF(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const novoStatus = contrato.status === 'rascunho' ? 'gerado' : contrato.status;
      await base44.entities.Contrato.update(contrato.id, { pdf_url: file_url, status: novoStatus });
      handleUpdate({ ...contrato, pdf_url: file_url, status: novoStatus });
      queryClient.invalidateQueries(['contratos']);
      toast.success('PDF enviado com sucesso! O status foi atualizado para "PDF Gerado".');
      notificar('pdf_anexado', 'admins');
    } catch (err) {
      toast.error('Erro ao enviar PDF: ' + err.message);
    }
    setUploadandoPDF(false);
  };

  const excluirPDF = async () => {
    if (!confirm('Excluir o PDF anexado? Esta ação não pode ser desfeita.')) return;
    try {
      await base44.entities.Contrato.update(contrato.id, { pdf_url: null });
      handleUpdate({ ...contrato, pdf_url: null });
      queryClient.invalidateQueries(['contratos']);
      toast.success('PDF removido.');
    } catch (err) {
      toast.error('Erro ao remover PDF: ' + err.message);
    }
  };

  const cor = TIPO_COLOR[contrato.tipo] || '#0f1e35';

  const marcarAssinado = useMutation({
    mutationFn: () => base44.entities.Contrato.update(contrato.id, { status: 'assinado' }),
    onSuccess: (c) => {
      handleUpdate(c);
      toast.success('Contrato marcado como assinado!');
      notificar('contrato_assinado', 'admins');
    },
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
      notificar('no_pipeline', 'todos');
      toast.success('Venda criada! Redirecionando para Vendas...');
      setTimeout(() => navigate('/Vendas'), 1200);
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
    setEnviandoVenda(false);
  };

  // Campos obrigatórios para geração do PDF
  const CAMPOS_OBRIGATORIOS_PDF = [
    { campo: 'nome', label: 'Nome Completo' },
    { campo: 'cpf_cnpj', label: 'CPF / CNPJ' },
    { campo: 'nascimento', label: 'Data de Nascimento' },
    { campo: 'nacionalidade', label: 'Nacionalidade' },
    { campo: 'profissao', label: 'Profissão' },
    { campo: 'estado_civil', label: 'Estado Civil' },
    { campo: 'email', label: 'E-mail' },
    { campo: 'telefone', label: 'Telefone' },
    { campo: 'cep', label: 'CEP' },
    { campo: 'endereco', label: 'Endereço' },
    { campo: 'bairro', label: 'Bairro' },
    { campo: 'cidade', label: 'Cidade' },
    { campo: 'estado', label: 'Estado (UF)' },
    { campo: 'valor_total', label: 'Valor Total' },
    { campo: 'forma_pagamento', label: 'Forma de Pagamento' },
    { campo: 'data_contrato', label: 'Data do Contrato' },
  ];

  const camposFaltando = CAMPOS_OBRIGATORIOS_PDF.filter(c => !contrato[c.campo] || String(contrato[c.campo]).trim() === '');

  const gerarPDF = async () => {
    if (camposFaltando.length > 0) {
      toast.error(`Preencha os campos obrigatórios antes de gerar o PDF: ${camposFaltando.map(c => c.label).join(', ')}`, { duration: 6000 });
      return;
    }
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
        notificar('pdf_gerado', 'admins');
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
    <div className="min-h-screen p-4 md:p-6" style={{ background: '#0d1117' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm transition" style={{ color: 'rgba(230,237,243,0.6)' }}>
            <ArrowLeft className="w-4 h-4" /> Voltar para Contratos
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)' }}>
            <ScrollText className="w-3.5 h-3.5" style={{ color: '#00D4AA' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#00D4AA' }}>Contratos</span>
          </div>
        </div>

        {/* Header */}
        <div className="rounded-2xl p-5 mb-5 text-white shadow-lg" style={{ background: cor }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs opacity-60 uppercase tracking-widest font-semibold mb-1">{contrato.tipo}</p>
              <h2 className="text-xl font-bold">{contrato.nome}</h2>
              <p className="text-sm opacity-70 mt-0.5">{contrato.cpf_cnpj}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${stCfg.cls}`}>{stCfg.label}</span>
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setStatusDropdownOpen(p => !p)}
                    disabled={alterandoStatus}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-[10px] font-semibold rounded-xl transition">
                    {alterandoStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Alterar status
                    <ChevronDown className={`w-3 h-3 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {statusDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => alterarStatus(key)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 transition ${contrato.status === key ? 'font-bold text-[#1a3150] bg-blue-50' : 'text-gray-700'}`}>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.cls.includes('gray') ? 'bg-gray-400' : cfg.cls.includes('blue') ? 'bg-blue-500' : cfg.cls.includes('emerald') ? 'bg-emerald-500' : cfg.cls.includes('amber') ? 'bg-amber-500' : cfg.cls.includes('violet') ? 'bg-violet-500' : 'bg-purple-500'}`} />
                          {cfg.label}
                          {contrato.status === key && <span className="ml-auto text-[9px] text-[#1a3150]">atual</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Gerente */}
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] opacity-50 uppercase tracking-wider font-semibold">Gerente responsável</p>
                <p className="text-sm font-semibold opacity-90 mt-0.5">{contrato.vendedor_nome || <span className="italic opacity-50">Não informado</span>}</p>
              </div>
              {isAdmin && !editandoGerente && (
                <button onClick={() => { setEditandoGerente(true); setGerenteInput({ id: contrato.vendedor_id || '', nome: contrato.vendedor_nome || '' }); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition">
                  <UserCog className="w-3.5 h-3.5" /> Alterar gerente
                </button>
              )}
            </div>
            {editandoGerente && isAdmin && (
              <div className="flex gap-2 mt-2">
                <select
                  value={gerenteInput.id}
                  onChange={e => { const v = vendedores.find(x => x.id === e.target.value); if (v) setGerenteInput({ id: v.id, nome: v.nome }); }}
                  className="flex-1 px-3 py-2 text-sm border-0 rounded-xl focus:outline-none text-gray-800">
                  <option value="">Selecione o gerente...</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
                <button onClick={salvarGerente} disabled={salvandoGerente || !gerenteInput.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white text-gray-800 text-xs font-semibold rounded-xl hover:bg-gray-100 transition disabled:opacity-50">
                  {salvandoGerente ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
                </button>
                <button onClick={() => setEditandoGerente(false)} className="px-3 py-2 text-xs text-white/70 hover:text-white rounded-xl">Cancelar</button>
              </div>
            )}
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="flex flex-col gap-1">
            <button onClick={gerarPDF} disabled={gerando}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-white text-xs font-semibold transition hover:opacity-90 shadow-md disabled:opacity-50"
              style={{ background: cor, opacity: camposFaltando.length > 0 ? 0.6 : 1 }}
              title={camposFaltando.length > 0 ? `Faltam: ${camposFaltando.map(c => c.label).join(', ')}` : 'Gerar PDF'}>
              {gerando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
              {gerando ? 'Gerando...' : 'Gerar PDF'}
            </button>
            {camposFaltando.length > 0 && (
              <p className="text-[9px] text-red-500 font-semibold text-center leading-tight">
                {camposFaltando.length} campo{camposFaltando.length > 1 ? 's' : ''} incompleto{camposFaltando.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button onClick={() => setEditando(true)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold transition shadow-sm"
            style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.2)', color: 'rgba(230,237,243,0.85)' }}>
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

        {/* Upload de PDF externo */}
        <div className="rounded-2xl shadow-sm overflow-hidden mb-5" style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.15)' }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(0,212,170,0.12)', background: '#1c2333' }}>
            <FileUp className="w-4 h-4" style={{ color: 'rgba(230,237,243,0.6)' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.6)' }}>Arquivo do Contrato (PDF)</p>
          </div>
          <div className="p-5">
            {contrato.pdf_url ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)' }}>
                  <FileUp className="w-4 h-4 flex-shrink-0" style={{ color: '#00D4AA' }} />
                  <a href={contrato.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm underline truncate" style={{ color: '#00D4AA' }}>
                    Visualizar PDF do contrato
                  </a>
                </div>
                <button onClick={excluirPDF}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer transition"
                  style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
                <label className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer transition ${uploadandoPDF ? 'opacity-50 pointer-events-none' : ''}`}
                  style={{ border: '1px solid rgba(0,212,170,0.2)', color: 'rgba(230,237,243,0.7)', background: '#1c2333' }}>
                  {uploadandoPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Substituir
                  <input type="file" accept="application/pdf" className="hidden" onChange={e => e.target.files?.[0] && uploadPDFExterno(e.target.files[0], true)} />
                </label>
              </div>
            ) : (
              <label
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 cursor-pointer transition group ${uploadandoPDF ? 'opacity-50 pointer-events-none' : ''}`}
                style={{ borderColor: 'rgba(0,212,170,0.25)' }}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); const file = e.dataTransfer.files?.[0]; if (file) uploadPDFExterno(file, false); }}
              >
                {uploadandoPDF ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#00D4AA' }} /> : <Upload className="w-5 h-5" style={{ color: '#00D4AA' }} />}
                <span className="text-xs font-medium" style={{ color: 'rgba(230,237,243,0.6)' }}>Clique ou arraste um PDF para anexar</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={e => e.target.files?.[0] && uploadPDFExterno(e.target.files[0])} />
              </label>
            )}
          </div>
        </div>

        {/* Links de Assinatura (admin) */}
        <div className="rounded-2xl shadow-sm overflow-hidden mb-5" style={{ background: '#161b22', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.1)' }}>
            <Link2 className="w-4 h-4" style={{ color: '#fbbf24' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#fbbf24' }}>Links de Assinatura Online</p>
          </div>
          <div className="p-5 space-y-4">
            {/* Link Contrato */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between" style={{ color: 'rgba(230,237,243,0.5)' }}>
                Contrato
                {(isAdmin || !contrato.link_assinatura) && !editandoLink && (
                  <button onClick={() => { setEditandoLink(true); setLinkInput(contrato.link_assinatura || ''); }}
                    className="text-[10px] font-semibold flex items-center gap-1 transition normal-case" style={{ color: '#fbbf24' }}>
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition"
                    style={{ background: '#1c2333', color: 'rgba(230,237,243,0.8)', border: '1px solid rgba(0,212,170,0.2)' }}>
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
              ) : (
                <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#fbbf24' }}>
                  <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: '#fbbf24' }} />
                  Aguardando administrador adicionar o link de assinatura online.
                </p>
              )}
            </div>

            {/* Link Aditivo */}
            <div className="pt-4" style={{ borderTop: '1px solid rgba(245,158,11,0.2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between" style={{ color: 'rgba(230,237,243,0.5)' }}>
                Aditivo de Contrato <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold normal-case" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>opcional</span>
                {isAdmin && !editandoLinkAditivo && (
                  <button onClick={() => { setEditandoLinkAditivo(true); setLinkAditivoInput(contrato.link_assinatura_aditivo || ''); }}
                    className="text-[10px] font-semibold flex items-center gap-1 transition normal-case" style={{ color: '#fbbf24' }}>
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition"
                    style={{ background: '#1c2333', color: 'rgba(230,237,243,0.8)', border: '1px solid rgba(0,212,170,0.2)' }}>
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: 'rgba(230,237,243,0.4)' }}>Nenhum link de aditivo adicionado</p>
              )}
            </div>
          </div>
        </div>

        {/* Boletos das parcelas vincendas */}
        <BoletosParcelas contrato={contrato} onUpdate={handleUpdate} />

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
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                Vendedor & Indicadores
                {isAdmin && !editandoGerente && (
                  <button onClick={() => { setEditandoGerente(true); setGerenteInput({ id: contrato.vendedor_id || '', nome: contrato.vendedor_nome || '' }); }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 normal-case transition">
                    <UserCog className="w-3 h-3" /> Alterar gerente
                  </button>
                )}
              </p>
              {editandoGerente && isAdmin && (
                <div className="flex gap-2 mb-3">
                  <select
                    value={gerenteInput.id}
                    onChange={e => {
                      const v = vendedores.find(x => x.id === e.target.value);
                      if (v) setGerenteInput({ id: v.id, nome: v.nome });
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400">
                    <option value="">Selecione o gerente...</option>
                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                  </select>
                  <button onClick={salvarGerente} disabled={salvandoGerente || !gerenteInput.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
                    {salvandoGerente ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
                  </button>
                  <button onClick={() => setEditandoGerente(false)} className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#e6edf3' }}>{contrato.vendedor_nome || <span className="italic font-normal" style={{ color: 'rgba(230,237,243,0.4)' }}>Não informado</span>}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(230,237,243,0.4)' }}>Vendedor responsável</p>
                  </div>
                </div>
                {contrato.indicadores?.length > 0 ? contrato.indicadores.map((ind, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#e6edf3' }}>{ind.nome}</p>
                      <p className="text-[10px] capitalize" style={{ color: 'rgba(230,237,243,0.4)' }}>{ind.tipo || 'indicador'}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>{ind.percentual}%</span>
                  </div>
                )) : (
                  <div className="px-4 py-2.5 rounded-xl" style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.12)' }}>
                    <p className="text-xs italic" style={{ color: 'rgba(230,237,243,0.4)' }}>Nenhum indicador/espelhamento cadastrado</p>
                  </div>
                )}
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
    <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.15)' }}>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(0,212,170,0.12)', background: '#1c2333' }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>{title}</p>
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
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.4)' }}>{label}</p>
      <p className="text-sm mt-0.5 font-medium" style={{ color: highlight ? '#00D4AA' : '#e6edf3', fontSize: highlight ? '1.125rem' : undefined, fontWeight: highlight ? 700 : 500 }}>{value}</p>
    </div>
  );
}