import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  X, Building2, User, FileCheck2, Upload, CheckCircle2, Circle, Plus, Trash2,
  Loader2, FileText, Download, AlertTriangle, ChevronDown, ChevronUp, Copy, Link2
} from 'lucide-react';
import { toast } from 'sonner';
import { todayBrasilia, isoNowBrasilia } from '@/lib/dateUtils';

const DOC_CONFIG = {
  PF: [
    { tipo: 'identificacao', descricao: 'Documento de identificação com foto (RG/CNH, expedição superior a 2009)', obrigatorio: true, condicional: false },
    { tipo: 'comprovante_endereco', descricao: 'Comprovante de endereço (até 90 dias)', obrigatorio: true, condicional: false },
    { tipo: 'irpf', descricao: 'IRPF 2025/2026', obrigatorio: false, condicional: true },
    { tipo: 'recibo_irpf', descricao: 'Recibo de Entrega do IRPF', obrigatorio: false, condicional: true },
  ],
  PJ: [
    { tipo: 'contrato_social', descricao: 'Contrato social e última alteração consolidada', obrigatorio: true, condicional: false },
    { tipo: 'dre', descricao: 'DRE (assinado pela empresa + contador)', obrigatorio: false, condicional: true },
    { tipo: 'balanco', descricao: 'Balanço 2025 (assinado pela empresa + contador)', obrigatorio: false, condicional: true },
    { tipo: 'faturamento', descricao: 'Faturamento dos últimos 12 meses (assinado pela empresa + contador)', obrigatorio: false, condicional: true },
  ],
};

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];

function buildDocInicial(tipoCanal, operarAcima270k) {
  return DOC_CONFIG[tipoCanal].map(d => ({
    tipo: d.tipo,
    descricao: d.descricao,
    obrigatorio: d.obrigatorio || (d.condicional && operarAcima270k),
    recebido: false,
    url: '',
    nome_arquivo: '',
    condicional: d.condicional,
  }));
}

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  gold: '#fbbf24',
  goldDim: 'rgba(251,191,36,0.12)',
  danger: '#f87171',
};

const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const labelStyle = { color: AURORA.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

export default function RncCanalBancarioModal({ contrato, user, onClose, rncId }) {
  const queryClient = useQueryClient();
  const [rncExistente, setRncExistente] = useState(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteVinculado, setClienteVinculado] = useState(null);
  const [tipoCanal, setTipoCanal] = useState('PF');
  const [operarAcima270k, setOperarAcima270k] = useState(false);
  const [form, setForm] = useState({
    nome: '', cpf_cnpj: '', rg_ie: '', nascimento_fundacao: '', nacionalidade: 'Brasileira',
    profissao_natureza: '', estado_civil: '', dupla_nacionalidade: '', media_salarial: '', quantidade_funcionarios: '',
    email: '', telefone: '',
    cep: '', endereco: '', bairro: '', cidade: '', estado: '', observacoes: '',
  });
  const [linkRnc, setLinkRnc] = useState('');
  const [gerandoLink, setGerandoLink] = useState(false);
  const [documentos, setDocumentos] = useState([]);
  const [socios, setSocios] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [uploadingSocio, setUploadingSocio] = useState(null);
  const [secaoDadosOpen, setSecaoDadosOpen] = useState(true);
  const [secaoDocsOpen, setSecaoDocsOpen] = useState(true);
  const [secaoSociosOpen, setSecaoSociosOpen] = useState(true);
  const [secaoObsOpen, setSecaoObsOpen] = useState(true);

  const aplicarRnc = (rnc) => {
    setRncExistente(rnc);
    setTipoCanal(rnc.tipo_canal || 'PF');
    setOperarAcima270k(rnc.operar_acima_270k || false);
    setForm({
      nome: rnc.nome || '', cpf_cnpj: rnc.cpf_cnpj || '', rg_ie: rnc.rg_ie || '',
      nascimento_fundacao: rnc.nascimento_fundacao || '', nacionalidade: rnc.nacionalidade || '',
      profissao_natureza: rnc.profissao_natureza || '', estado_civil: rnc.estado_civil || '',
      dupla_nacionalidade: rnc.dupla_nacionalidade || '', media_salarial: rnc.media_salarial || '', quantidade_funcionarios: rnc.quantidade_funcionarios || '',
      email: rnc.email || '', telefone: rnc.telefone || '',
      cep: rnc.cep || '', endereco: rnc.endereco || '', bairro: rnc.bairro || '',
      cidade: rnc.cidade || '', estado: rnc.estado || '', observacoes: rnc.observacoes || '',
    });
    setDocumentos(rnc.documentos || []);
    setSocios(rnc.socios || []);
    if (rnc.link_token) setLinkRnc(window.location.origin + '/rnc-publica/' + rnc.link_token);
  };

  useEffect(() => {
    if (rncId) {
      base44.entities.RncCanalBancario.get(rncId).then(aplicarRnc).catch(() => {});
      return;
    }
    if (!contrato?.id) return;
    base44.entities.RncCanalBancario.filter({ contrato_id: contrato.id })
      .then(rncs => {
        if (rncs.length > 0) {
          aplicarRnc(rncs[0]);
        } else {
          setForm(f => ({
            ...f,
            nome: contrato.nome || '',
            cpf_cnpj: contrato.cpf_cnpj || '',
            email: contrato.email || '',
            telefone: contrato.telefone || '',
            cep: contrato.cep || '',
            endereco: contrato.endereco || '',
            bairro: contrato.bairro || '',
            cidade: contrato.cidade || '',
            estado: contrato.estado || '',
            nacionalidade: contrato.nacionalidade || 'Brasileira',
            profissao_natureza: contrato.profissao || '',
            estado_civil: contrato.estado_civil || '',
            nascimento_fundacao: contrato.nascimento || '',
          }));
          setDocumentos(buildDocInicial('PF', false));
        }
      })
      .catch(() => {});
  }, [contrato?.id, rncId]);

  useEffect(() => {
    if (rncExistente) return;
    setDocumentos(buildDocInicial(tipoCanal, operarAcima270k));
    if (tipoCanal === 'PJ' && socios.length === 0) {
      setSocios([{ nome: '', cpf: '', documento_url: '', documento_nome: '', comprovante_url: '', comprovante_nome: '' }]);
    }
    if (tipoCanal === 'PF') setSocios([]);
  }, [tipoCanal, operarAcima270k]);

  const docRecebidoCount = documentos.filter(d => d.recebido).length;
  const allObrigatoriosRecebidos = documentos.filter(d => d.obrigatorio).every(d => d.recebido);

  const buscarCliente = async (termo) => {
    setBuscaCliente(termo);
    if (!termo || termo.length < 3) { setResultadosBusca([]); return; }
    setBuscandoCliente(true);
    try {
      const todos = await base44.entities.Cliente.list('-created_date', 50);
      const tLower = termo.toLowerCase();
      const tDigits = termo.replace(/\D/g, '');
      setResultadosBusca(todos.filter(c =>
        c.nome?.toLowerCase().includes(tLower) ||
        (tDigits && c.cpf_cnpj?.replace(/\D/g, '').includes(tDigits))
      ).slice(0, 8));
    } catch (e) {}
    setBuscandoCliente(false);
  };

  const selecionarCliente = (cliente) => {
    setClienteVinculado(cliente);
    setForm(f => ({
      ...f,
      nome: cliente.nome || '', cpf_cnpj: cliente.cpf_cnpj || '',
      email: cliente.email || '', telefone: cliente.telefone || '',
      cidade: cliente.cidade || '', estado: cliente.estado || '',
    }));
    setBuscaCliente(cliente.nome || '');
    setResultadosBusca([]);
  };

  const sincronizarCliente = async () => {
    if (!form.cpf_cnpj?.trim() || !form.nome?.trim()) return;
    try {
      const existentes = await base44.entities.Cliente.filter({ cpf_cnpj: form.cpf_cnpj });
      const dadosCliente = {
        nome: form.nome, email: form.email, telefone: form.telefone,
        cidade: form.cidade, estado: form.estado,
      };
      if (existentes.length > 0) {
        await base44.entities.Cliente.update(existentes[0].id, dadosCliente);
        toast.success('Cadastro do cliente atualizado!');
      } else {
        await base44.entities.Cliente.create({ ...dadosCliente, cpf_cnpj: form.cpf_cnpj, origem: 'nativo' });
        toast.success('Cliente cadastrado no sistema!');
      }
    } catch (e) {}
  };

  const handleUploadDoc = async (index, file) => {
    setUploadingDoc(index);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDocumentos(docs => docs.map((d, i) => i === index ? { ...d, recebido: true, url: file_url, nome_arquivo: file.name } : d));
      toast.success('Documento anexado!');
    } catch (e) {
      toast.error('Erro no upload: ' + e.message);
    }
    setUploadingDoc(null);
  };

  const handleRemoveDoc = (index) => {
    setDocumentos(docs => docs.map((d, i) => i === index ? { ...d, recebido: false, url: '', nome_arquivo: '' } : d));
  };

  const handleUploadSocio = async (socioIndex, field, file) => {
    setUploadingSocio(`${socioIndex}-${field}`);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSocios(ss => ss.map((s, i) => i === socioIndex ? {
        ...s,
        [field === 'documento' ? 'documento_url' : 'comprovante_url']: file_url,
        [field === 'documento' ? 'documento_nome' : 'comprovante_nome']: file.name,
      } : s));
      toast.success('Documento anexado!');
    } catch (e) {
      toast.error('Erro no upload: ' + e.message);
    }
    setUploadingSocio(null);
  };

  const handleSocioChange = (index, field, value) => {
    setSocios(ss => ss.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const clearSocioDoc = (index, field) => {
    setSocios(ss => ss.map((s, i) => i === index ? {
      ...s,
      [field === 'documento' ? 'documento_url' : 'comprovante_url']: '',
      [field === 'documento' ? 'documento_nome' : 'comprovante_nome']: '',
    } : s));
  };

  const addSocio = () => {
    setSocios(ss => [...ss, { nome: '', cpf: '', documento_url: '', documento_nome: '', comprovante_url: '', comprovante_nome: '' }]);
  };

  const removeSocio = (index) => {
    setSocios(ss => ss.filter((_, i) => i !== index));
  };

  const coletarDados = () => ({
    contrato_id: rncExistente?.contrato_id || contrato?.id || '',
    tipo_canal: tipoCanal,
    operar_acima_270k: operarAcima270k,
    ...form,
    nome: form.nome?.trim() || 'Formulário RNC',
    media_salarial: form.media_salarial ? Number(String(form.media_salarial).replace(/[^\d.,]/g, '').replace(',', '.')) : null,
    quantidade_funcionarios: form.quantidade_funcionarios ? Number(form.quantidade_funcionarios) : null,
    documentos,
    socios: tipoCanal === 'PJ' ? socios : [],
    preenchido_por: user?.nome_tratamento || user?.full_name || user?.email || '',
    data_preenchimento: isoNowBrasilia(),
  });

  const handleSalvar = async (status = 'rascunho') => {
    if (!allObrigatoriosRecebidos && status === 'concluido') {
      toast.error('Documentos obrigatórios pendentes. Marque todos como recebidos antes de concluir.');
      return;
    }
    setSalvando(true);
    try {
      const dados = { ...coletarDados(), status };
      if (rncExistente) {
        await base44.entities.RncCanalBancario.update(rncExistente.id, dados);
        setRncExistente({ ...rncExistente, ...dados });
      } else {
        const created = await base44.entities.RncCanalBancario.create(dados);
        setRncExistente(created);
      }
      queryClient.invalidateQueries(['rnc-canal-bancario']);
      await sincronizarCliente();
      toast.success(status === 'concluido' ? 'RNC concluída e salva!' : 'RNC salva como rascunho.');
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message);
    }
    setSalvando(false);
  };

  const handleGerarPdf = async () => {
    setGerandoPdf(true);
    try {
      let rncId = rncExistente?.id;
      if (!rncId) {
        const dados = { ...coletarDados(), status: 'rascunho' };
        const created = await base44.entities.RncCanalBancario.create(dados);
        rncId = created.id;
        setRncExistente(created);
      } else {
        // Sempre atualizar antes de gerar — o usuário pode ter alterado tipo/fichas sem salvar
        const dados = { ...coletarDados(), status: rncExistente.status === 'concluido' ? 'concluido' : 'rascunho' };
        await base44.entities.RncCanalBancario.update(rncId, dados);
        setRncExistente(prev => ({ ...prev, ...dados }));
      }
      const res = await base44.functions.invoke('gerarRncCanalBancarioPDF', { rnc_id: rncId });
      if (res?.data?.pdf_base64) {
        const byteChars = atob(res.data.pdf_base64);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.data.filename || `RNC_Canal_Bancario_${(form.nome || '').replace(/\s/g, '_')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        const file = new File([blob], res.data.filename, { type: 'application/pdf' });
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          await base44.entities.RncCanalBancario.update(rncId, { pdf_url: file_url, pdf_nome: res.data.filename, status: 'concluido' });
          setRncExistente(prev => ({ ...prev, pdf_url: file_url, pdf_nome: res.data.filename, status: 'concluido' }));
        } catch {}
        toast.success('PDF gerado e baixado!');
      } else {
        toast.error('Erro ao gerar PDF.');
      }
    } catch (e) {
      toast.error('Erro: ' + e.message);
    }
    setGerandoPdf(false);
  };

  const updateForm = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleGerarLink = async () => {
    setSalvando(true);
    let rncId = rncExistente?.id;
    try {
      const dados = { ...coletarDados(), status: rncExistente?.status === 'concluido' ? 'concluido' : 'rascunho' };
      if (rncId) {
        // Sempre atualizar antes de gerar — o usuário pode ter alterado tipo/fichas sem salvar
        await base44.entities.RncCanalBancario.update(rncId, dados);
        setRncExistente(prev => ({ ...prev, ...dados }));
      } else {
        const created = await base44.entities.RncCanalBancario.create(dados);
        rncId = created.id;
        setRncExistente(created);
      }
    } catch (e) { toast.error('Erro ao salvar: ' + e.message); setSalvando(false); return; }
    setSalvando(false);
    setGerandoLink(true);
    try {
      const res = await base44.functions.invoke('gerarLinkRnc', { rnc_id: rncId });
      if (res?.data?.link) {
        const fullUrl = window.location.origin + res.data.link;
        setLinkRnc(fullUrl);
        navigator.clipboard?.writeText(fullUrl).catch(() => {});
        toast.success('Link gerado e copiado para a área de transferência!');
      } else {
        toast.error('Erro ao gerar link.');
      }
    } catch (e) { toast.error('Erro: ' + e.message); }
    setGerandoLink(false);
  };

  const CardSection = ({ title, icon: Icon, children, open, onToggle, badge }) => (
    <div className="rounded-xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 transition"
        style={{ background: AURORA.surface2 }}>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: AURORA.accent }} />
          <span className="text-sm font-semibold" style={{ color: AURORA.text }}>{title}</span>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: AURORA.textMuted }} /> : <ChevronDown className="w-4 h-4" style={{ color: AURORA.textMuted }} />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );

  const LabeledInput = ({ label, field, ...props }) => (
    <div>
      <label className="block mb-1" style={labelStyle}>{label}</label>
      <input value={form[field]} onChange={e => updateForm(field, e.target.value)} style={inputStyle}
        className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" {...props} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-3xl max-h-[calc(100vh-140px)] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: AURORA.bg, border: `1px solid ${AURORA.borderActive}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${AURORA.surface} 0%, ${AURORA.surface2} 100%)`, borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(109,40,217,0.2)' }}>
              <FileCheck2 className="w-5 h-5" style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: AURORA.text }}>RNC — Canal Bancário</h2>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>
                {rncExistente
                  ? `Rascunho salvo · ${form.nome || contrato?.nome || ''}`
                  : contrato?.id
                    ? `Contrato: ${contrato?.nome || '—'}`
                    : 'Formulário independente — preencha os dados do cliente'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition hover:bg-white/10">
            <X className="w-5 h-5" style={{ color: AURORA.textMuted }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Buscar cliente (apenas standalone) */}
          {!contrato?.id && (
            <div className="rounded-xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
              <label className="block mb-2" style={labelStyle}>Buscar cliente existente (opcional)</label>
              <div className="relative">
                <input value={buscaCliente} onChange={e => buscarCliente(e.target.value)}
                  placeholder="Digite nome ou CPF/CNPJ para preencher automaticamente..."
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none pr-10"
                  style={inputStyle} />
                {buscandoCliente && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: AURORA.accent }} />}
              </div>
              {clienteVinculado && (
                <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: AURORA.accent }}>
                  <CheckCircle2 className="w-3 h-3" /> Cliente vinculado: {clienteVinculado.nome}
                </p>
              )}
              {resultadosBusca.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {resultadosBusca.map(c => (
                    <button key={c.id} onClick={() => selecionarCliente(c)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs transition"
                      style={{ background: AURORA.surface2, color: AURORA.text }}
                      onMouseEnter={e => e.currentTarget.style.background = AURORA.accentDim}
                      onMouseLeave={e => e.currentTarget.style.background = AURORA.surface2}>
                      <span className="font-semibold">{c.nome}</span>
                      <span className="ml-2" style={{ color: AURORA.textMuted }}>{c.cpf_cnpj}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tipo de canal */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTipoCanal('PF')}
              className="rounded-xl p-4 transition border-2"
              style={tipoCanal === 'PF'
                ? { background: 'rgba(0,212,170,0.12)', borderColor: AURORA.accent }
                : { background: AURORA.surface, borderColor: AURORA.border }}>
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4" style={{ color: tipoCanal === 'PF' ? AURORA.accent : AURORA.textMuted }} />
                <span className="text-sm font-bold" style={{ color: AURORA.text }}>Pessoa Física</span>
              </div>
              <p className="text-[10px]" style={{ color: AURORA.textMuted }}>Canal bancário individual</p>
            </button>
            <button onClick={() => setTipoCanal('PJ')}
              className="rounded-xl p-4 transition border-2"
              style={tipoCanal === 'PJ'
                ? { background: 'rgba(0,212,170,0.12)', borderColor: AURORA.accent }
                : { background: AURORA.surface, borderColor: AURORA.border }}>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4" style={{ color: tipoCanal === 'PJ' ? AURORA.accent : AURORA.textMuted }} />
                <span className="text-sm font-bold" style={{ color: AURORA.text }}>Pessoa Jurídica</span>
              </div>
              <p className="text-[10px]" style={{ color: AURORA.textMuted }}>Canal bancário empresarial</p>
            </button>
          </div>

          {/* Flag 270k */}
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: AURORA.goldDim, border: `1px solid rgba(251,191,36,0.25)` }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: AURORA.gold }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: AURORA.gold }}>Operar valores superiores a R$ 270.000,00 / 12 meses?</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(251,191,36,0.7)' }}>
                {tipoCanal === 'PF' ? 'Será necessário IRPF 2025/2026 + Recibo de Entrega.' : 'Será necessário DRE, Balanço 2025 e Faturamento dos últimos 12 meses.'}
              </p>
            </div>
            <button onClick={() => setOperarAcima270k(p => !p)}
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0"
              style={operarAcima270k
                ? { background: AURORA.gold, color: '#1c2333' }
                : { background: 'transparent', border: `1px solid ${AURORA.gold}`, color: AURORA.gold }}>
              {operarAcima270k ? 'SIM' : 'NÃO'}
            </button>
          </div>

          {/* Dados cadastrais */}
          <CardSection title="Dados Cadastrais" icon={User}
            open={secaoDadosOpen} onToggle={() => setSecaoDadosOpen(p => !p)}>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <LabeledInput label={tipoCanal === 'PF' ? 'Nome Completo *' : 'Razão Social *'} field="nome" placeholder="Nome completo" />
              </div>
              <LabeledInput label={tipoCanal === 'PF' ? 'CPF' : 'CNPJ'} field="cpf_cnpj" placeholder="000.000.000-00" />
              <LabeledInput label={tipoCanal === 'PF' ? 'RG' : 'Inscrição Estadual'} field="rg_ie" placeholder="Documento" />
              <LabeledInput
                label={tipoCanal === 'PF' ? 'Data de Nascimento' : 'Data de Fundação'}
                field="nascimento_fundacao" type="date" />
              <LabeledInput label="Nacionalidade" field="nacionalidade" placeholder="Brasileira" />
              {tipoCanal === 'PF' ? (
                <>
                  <LabeledInput label="Profissão" field="profissao_natureza" placeholder="Profissão" />
                  <div>
                    <label className="block mb-1" style={labelStyle}>Estado Civil</label>
                    <select value={form.estado_civil} onChange={e => updateForm('estado_civil', e.target.value)}
                      style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none">
                      <option value="">Selecione...</option>
                      {ESTADOS_CIVIS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <LabeledInput label="Média Salarial (R$)" field="media_salarial" type="number" placeholder="Ex: 5000" />
                  <div>
                    <label className="block mb-1" style={labelStyle}>Possui dupla nacionalidade?</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => updateForm('dupla_nacionalidade', 'sim')}
                        className="flex-1 px-3 py-2 text-sm rounded-lg font-semibold transition"
                        style={form.dupla_nacionalidade === 'sim' ? { background: AURORA.accent, color: '#0d1117' } : { ...inputStyle }}>
                        Sim
                      </button>
                      <button type="button" onClick={() => updateForm('dupla_nacionalidade', 'nao')}
                        className="flex-1 px-3 py-2 text-sm rounded-lg font-semibold transition"
                        style={form.dupla_nacionalidade === 'nao' ? { background: AURORA.accent, color: '#0d1117' } : { ...inputStyle }}>
                        Não
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-2">
                    <LabeledInput label="Natureza Jurídica" field="profissao_natureza" placeholder="Ex: Ltda, ME" />
                  </div>
                  <LabeledInput label="Quantidade de Funcionários" field="quantidade_funcionarios" type="number" placeholder="Ex: 10" />
                </>
              )}
              <LabeledInput label="E-mail" field="email" placeholder="email@exemplo.com" />
              <LabeledInput label="Telefone / WhatsApp" field="telefone" placeholder="(00) 00000-0000" />
              <LabeledInput label="CEP" field="cep" placeholder="00000-000" />
              <div className="col-span-2">
                <LabeledInput label="Endereço" field="endereco" placeholder="Rua, número, complemento" />
              </div>
              <LabeledInput label="Bairro" field="bairro" placeholder="Bairro" />
              <LabeledInput label="Cidade" field="cidade" placeholder="Cidade" />
              <LabeledInput label="Estado (UF)" field="estado" placeholder="RS" />
            </div>
          </CardSection>

          {/* Documentos */}
          <CardSection title="Documentação Necessária" icon={FileText}
            open={secaoDocsOpen} onToggle={() => setSecaoDocsOpen(p => !p)}
            badge={`${docRecebidoCount}/${documentos.length}`}>
            <div className="space-y-2">
              {documentos.map((doc, i) => (
                <div key={doc.tipo} className="rounded-lg p-3 flex items-center gap-3"
                  style={{ background: AURORA.surface2, border: `1px solid ${doc.recebido ? 'rgba(0,212,170,0.3)' : AURORA.border}` }}>
                  {doc.recebido ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: AURORA.accent }} />
                  ) : (
                    <Circle className="w-5 h-5 flex-shrink-0" style={{ color: doc.obrigatorio ? AURORA.danger : AURORA.textMuted }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: AURORA.text }}>{doc.descricao}</p>
                    {doc.condicional && !operarAcima270k && (
                      <p className="text-[10px]" style={{ color: AURORA.textMuted }}>Apenas se operar acima de R$ 270k</p>
                    )}
                    {doc.recebido && doc.nome_arquivo && (
                      <p className="text-[10px] truncate" style={{ color: AURORA.accent }}>{doc.nome_arquivo}</p>
                    )}
                  </div>
                  {doc.recebido ? (
                    <button onClick={() => handleRemoveDoc(i)}
                      className="p-1.5 rounded-lg transition" style={{ color: AURORA.danger, background: 'rgba(248,113,113,0.1)' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <label className="cursor-pointer p-1.5 rounded-lg transition flex items-center"
                      style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                      {uploadingDoc === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <input type="file" className="hidden" onChange={e => e.target.files[0] && handleUploadDoc(i, e.target.files[0])} />
                    </label>
                  )}
                </div>
              ))}
              {!allObrigatoriosRecebidos && (
                <p className="text-[10px] flex items-center gap-1.5 mt-1" style={{ color: AURORA.danger }}>
                  <AlertTriangle className="w-3 h-3" /> Documentos obrigatórios pendentes
                </p>
              )}
            </div>
          </CardSection>

          {/* Sócios (PJ) */}
          {tipoCanal === 'PJ' && (
            <CardSection title="Sócios e Administradores" icon={Building2}
              open={secaoSociosOpen} onToggle={() => setSecaoSociosOpen(p => !p)}
              badge={`${socios.length} sócio(s)`}>
              <div className="space-y-3">
                {socios.map((socio, i) => (
                  <div key={i} className="rounded-lg p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <input value={socio.nome} onChange={e => handleSocioChange(i, 'nome', e.target.value)}
                        placeholder="Nome do sócio/administrador"
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg focus:outline-none"
                        style={inputStyle} />
                      <input value={socio.cpf} onChange={e => handleSocioChange(i, 'cpf', e.target.value)}
                        placeholder="CPF" className="w-36 px-3 py-1.5 text-sm rounded-lg focus:outline-none"
                        style={inputStyle} />
                      {socios.length > 1 && (
                        <button onClick={() => removeSocio(i)} className="p-1.5 rounded-lg transition"
                          style={{ color: AURORA.danger, background: 'rgba(248,113,113,0.1)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1" style={labelStyle}>{'Documento ID c/ foto (exp. > 2009)'}</label>
                        {socio.documento_url ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] truncate flex-1" style={{ color: AURORA.accent }}>{socio.documento_nome}</span>
                            <button onClick={() => clearSocioDoc(i, 'documento')}
                              className="p-1 rounded" style={{ color: AURORA.danger }}><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition"
                            style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                            {uploadingSocio === `${i}-documento` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            <span className="text-xs">Anexar</span>
                            <input type="file" className="hidden" onChange={e => e.target.files[0] && handleUploadSocio(i, 'documento', e.target.files[0])} />
                          </label>
                        )}
                      </div>
                      <div>
                        <label className="block mb-1" style={labelStyle}>Comprovante endereço (até 90 dias)</label>
                        {socio.comprovante_url ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] truncate flex-1" style={{ color: AURORA.accent }}>{socio.comprovante_nome}</span>
                            <button onClick={() => clearSocioDoc(i, 'comprovante')}
                              className="p-1 rounded" style={{ color: AURORA.danger }}><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition"
                            style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                            {uploadingSocio === `${i}-comprovante` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            <span className="text-xs">Anexar</span>
                            <input type="file" className="hidden" onChange={e => e.target.files[0] && handleUploadSocio(i, 'comprovante', e.target.files[0])} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addSocio}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition"
                  style={{ background: AURORA.accentDim, color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar Sócio / Administrador
                </button>
              </div>
            </CardSection>
          )}

          {/* Observações */}
          <CardSection title="Observações" icon={FileText} open={secaoObsOpen} onToggle={() => setSecaoObsOpen(p => !p)}>
            <textarea value={form.observacoes} onChange={e => updateForm('observacoes', e.target.value)}
              placeholder="Observações adicionais sobre a abertura do canal bancário..."
              rows={3} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
              style={inputStyle} />
          </CardSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 flex-shrink-0"
          style={{ background: AURORA.surface, borderTop: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {rncExistente?.pdf_url && (
              <a href={rncExistente.pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition flex-shrink-0"
                style={{ background: 'rgba(59,130,249,0.15)', border: '1px solid rgba(59,130,249,0.3)', color: '#60a5fa' }}>
                <Download className="w-3.5 h-3.5" /> Ver PDF gerado
              </a>
            )}
            <button onClick={handleGerarLink} disabled={gerandoLink || salvando}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition flex-shrink-0"
              style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#a78bfa' }}>
              {gerandoLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Gerar Link p/ Cliente
            </button>
            {linkRnc && (
              <div className="flex items-center gap-1.5 min-w-0 flex-1 px-2 py-1 rounded-lg" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <span className="text-[10px] truncate flex-1" style={{ color: AURORA.accent }}>{linkRnc}</span>
                <button onClick={() => { navigator.clipboard?.writeText(linkRnc); toast.success('Link copiado!'); }}
                  className="p-1 rounded flex-shrink-0" style={{ color: AURORA.accent }}>
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleSalvar('rascunho')} disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Salvar Rascunho
            </button>
            <button onClick={handleGerarPdf} disabled={gerandoPdf || salvando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
              style={{ background: AURORA.accent, color: '#0d1117' }}>
              {gerandoPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />}
              Gerar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}