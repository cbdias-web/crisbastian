import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  X, Globe, User, Building2, FileCheck2, Upload, CheckCircle2, Circle, Plus, Trash2,
  Loader2, FileText, Download, AlertTriangle, ChevronDown, ChevronUp, Copy, Link2
} from 'lucide-react';
import { toast } from 'sonner';
import { isoNowBrasilia } from '@/lib/dateUtils';

const DOC_CONFIG_PF = [
  { tipo: 'passaporte', descricao: 'Passaporte vigente (foto + dados)', obrigatorio: true },
  { tipo: 'comprovante_endereco', descricao: 'Comprovante de endereço (até 90 dias)', obrigatorio: true },
  { tipo: 'irpf', descricao: 'IRPF 2025/2026 ou declaração de isento', obrigatorio: false },
];

const DOC_CONFIG_PJ = [
  { tipo: 'contrato_social', descricao: 'Contrato social / Estatuto e última alteração', obrigatorio: true },
  { tipo: 'passaporte_responsavel', descricao: 'Passaporte do responsável legal', obrigatorio: true },
  { tipo: 'comprovante_endereco_empresa', descricao: 'Comprovante de endereço da empresa (até 90 dias)', obrigatorio: true },
  { tipo: 'dre', descricao: 'DRE (assinado pela empresa + contador)', obrigatorio: false },
  { tipo: 'balanco', descricao: 'Balanço (assinado pela empresa + contador)', obrigatorio: false },
  { tipo: 'faturamento', descricao: 'Faturamento dos últimos 12 meses', obrigatorio: false },
];

function buildDocInicial(tipo) {
  const cfg = tipo === 'PJ' ? DOC_CONFIG_PJ : DOC_CONFIG_PF;
  return cfg.map(d => ({ ...d, recebido: false, url: '', nome_arquivo: '' }));
}

// Reconstrói o checklist correto para o tipo, preservando arquivos já enviados
// (casa por `tipo`). Corrige registros PJ antigos salvos com a lista de PF.
function mergeDocs(tipo, savedDocs) {
  const cfg = tipo === 'PJ' ? DOC_CONFIG_PJ : DOC_CONFIG_PF;
  const saved = Array.isArray(savedDocs) ? savedDocs : [];
  return cfg.map(d => {
    const found = saved.find(s => s.tipo === d.tipo);
    return found
      ? { ...d, recebido: !!found.recebido, url: found.url || '', nome_arquivo: found.nome_arquivo || '' }
      : { ...d, recebido: false, url: '', nome_arquivo: '' };
  });
}

const AURORA = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)', borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)',
  gold: '#fbbf24', goldDim: 'rgba(251,191,36,0.12)', danger: '#f87171',
};
const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const labelStyle = { color: AURORA.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

const ASSINANTE_VAZIO = () => ({
  nome: '', email: '', telefone_residencia: '', telefone_celular: '', telefone_escritorio: '',
  endereco_correspondencia: '', nome_empresa: '', atividade_empresa: '', titulo_posicao: '',
  tipo_emprego: '', salario_anual_usd: '', outra_fonte_renda: '', valor_outra_renda: '',
  explicacao_heranca: '', pais_nascimento: '', dupla_nacionalidade: '',
  pais_segunda_nacionalidade: '', numero_passaporte: '',
  mais_182_dias_eua: '', mais_122_dias_eua_3anos: '', endereco_eua: '',
});

const BANCO_VAZIO = () => ({ nome_banco: '', pais: '', tipo_conta: '' });

// Componentes de formulário — definidos FORA do componente pai para não
// serem recriados a cada render (o que faz o input perder o foco a cada tecla).
const CardSection = ({ title, icon: Icon, children, open, onToggle, badge }) => (
  <div className="rounded-xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
    <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 transition" style={{ background: AURORA.surface2 }}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: AURORA.accent }} />
        <span className="text-sm font-semibold" style={{ color: AURORA.text }}>{title}</span>
        {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: AURORA.accentDim, color: AURORA.accent }}>{badge}</span>}
      </div>
      {open ? <ChevronUp className="w-4 h-4" style={{ color: AURORA.textMuted }} /> : <ChevronDown className="w-4 h-4" style={{ color: AURORA.textMuted }} />}
    </button>
    {open && <div className="p-4">{children}</div>}
  </div>
);

const LI = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
  </div>
);

const RadioBtns = ({ label, value, onChange, opts }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    <div className="flex flex-wrap gap-2">
      {opts.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className="px-3 py-1.5 text-xs rounded-lg font-semibold transition"
          style={value === o.value ? { background: AURORA.accent, color: '#0d1117' } : { ...inputStyle, border: `1px solid ${AURORA.border}` }}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

export default function RncContaInternacionalModal({ contrato, user, onClose, rncId }) {
  const queryClient = useQueryClient();
  const [rncExistente, setRncExistente] = useState(null);
  const [tipoConta, setTipoConta] = useState('PF');
  const [documentos, setDocumentos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [gerandoLink, setGerandoLink] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [linkRnc, setLinkRnc] = useState('');

  // Seções abertas
  const [s1Open, setS1Open] = useState(true);
  const [s2Open, setS2Open] = useState(true);
  const [s3Open, setS3Open] = useState(true);
  const [sDocsOpen, setSDocsOpen] = useState(true);
  const [sObsOpen, setSObsOpen] = useState(false);

  // Seção 1 — Conta
  const [s1, setS1] = useState({
    secao1_tipo_conta: '', secao1_proposito: '',
    secao1_deposito_remetente: '', secao1_deposito_banco: '', secao1_deposito_valor: '',
    secao1_origem_fundos: '', secao1_assinatura_tipo: '', secao1_talao_cheques: '',
    secao1_cartao_debito: '', secao1_email: '', secao1_telefone_escritorio1: '',
    secao1_telefone_escritorio2: '', secao1_celular: '', secao1_endereco_correspondencia: '',
    // PJ
    secao1_pj_razao_social: '', secao1_pj_linha_negocios: '', secao1_pj_num_empregados: '',
    secao1_pj_produtos_servicos: '', secao1_pj_pais_operacao: '', secao1_pj_receita_bruta: '',
    secao1_pj_prospeccao_receita: '',
    secao1_pj_cnpj: '',
  });
  const [assinantesNomes, setAssinantesNomes] = useState(['']);
  const [bancosExistentes, setBancosExistentes] = useState([BANCO_VAZIO()]);
  const [clientesPJ, setClientesPJ] = useState([{ nome: '', pais: '' }]);
  const [fornecedoresPJ, setFornecedoresPJ] = useState([{ nome: '', pais: '' }]);
  const [acionistasPJ, setAcionistasPJ] = useState([{ nome: '', percentual: '' }]);

  // Seção 2 — Assinantes
  const [assinantes, setAssinantes] = useState([ASSINANTE_VAZIO()]);

  // Seção 3 — PF Titular
  const [s3, setS3] = useState({
    secao3_nome: '', secao3_cpf: '', secao3_nascimento: '',
    secao3_nacionalidade: 'Brasileira', secao3_email: '', secao3_telefone: '',
    secao3_passaporte: '',
  });
  const [beneficiarios, setBeneficiarios] = useState([{ nome_completo: '', data_nascimento: '', parentesco: '' }]);

  const [observacoes, setObservacoes] = useState('');

  const aplicar = (rnc) => {
    setRncExistente(rnc);
    setTipoConta(rnc.tipo_conta || 'PF');
    setS1({
      secao1_tipo_conta: rnc.secao1_tipo_conta || '', secao1_proposito: rnc.secao1_proposito || '',
      secao1_deposito_remetente: rnc.secao1_deposito_remetente || '', secao1_deposito_banco: rnc.secao1_deposito_banco || '',
      secao1_deposito_valor: rnc.secao1_deposito_valor || '', secao1_origem_fundos: rnc.secao1_origem_fundos || '',
      secao1_assinatura_tipo: rnc.secao1_assinatura_tipo || '', secao1_talao_cheques: rnc.secao1_talao_cheques || '',
      secao1_cartao_debito: rnc.secao1_cartao_debito || '', secao1_email: rnc.secao1_email || '',
      secao1_telefone_escritorio1: rnc.secao1_telefone_escritorio1 || '', secao1_telefone_escritorio2: rnc.secao1_telefone_escritorio2 || '',
      secao1_celular: rnc.secao1_celular || '', secao1_endereco_correspondencia: rnc.secao1_endereco_correspondencia || '',
      secao1_pj_razao_social: rnc.secao1_pj_razao_social || '', secao1_pj_cnpj: rnc.secao1_pj_cnpj || '', secao1_pj_linha_negocios: rnc.secao1_pj_linha_negocios || '',
      secao1_pj_num_empregados: rnc.secao1_pj_num_empregados || '', secao1_pj_produtos_servicos: rnc.secao1_pj_produtos_servicos || '',
      secao1_pj_pais_operacao: rnc.secao1_pj_pais_operacao || '', secao1_pj_receita_bruta: rnc.secao1_pj_receita_bruta || '',
      secao1_pj_prospeccao_receita: rnc.secao1_pj_prospeccao_receita || '',
    });
    setAssinantesNomes(rnc.secao1_assinantes?.length > 0 ? rnc.secao1_assinantes : ['']);
    setBancosExistentes(rnc.secao1_bancos_existentes?.length > 0 ? rnc.secao1_bancos_existentes : [BANCO_VAZIO()]);
    setClientesPJ(rnc.secao1_pj_clientes?.length > 0 ? rnc.secao1_pj_clientes : [{ nome: '', pais: '' }]);
    setFornecedoresPJ(rnc.secao1_pj_fornecedores?.length > 0 ? rnc.secao1_pj_fornecedores : [{ nome: '', pais: '' }]);
    setAcionistasPJ(rnc.secao1_pj_acionistas?.length > 0 ? rnc.secao1_pj_acionistas : [{ nome: '', percentual: '' }]);
    setAssinantes(rnc.secao2_assinantes?.length > 0 ? rnc.secao2_assinantes : [ASSINANTE_VAZIO()]);
    setS3({
      secao3_nome: rnc.secao3_nome || '', secao3_cpf: rnc.secao3_cpf || '',
      secao3_nascimento: rnc.secao3_nascimento || '', secao3_nacionalidade: rnc.secao3_nacionalidade || 'Brasileira',
      secao3_email: rnc.secao3_email || '', secao3_telefone: rnc.secao3_telefone || '',
      secao3_passaporte: rnc.secao3_passaporte || '',
    });
    setBeneficiarios(rnc.secao3_beneficiarios?.length > 0 ? rnc.secao3_beneficiarios : [{ nome_completo: '', data_nascimento: '', parentesco: '' }]);
    setDocumentos(mergeDocs(rnc.tipo_conta || 'PF', rnc.documentos));
    setObservacoes(rnc.observacoes || '');
    if (rnc.link_token) setLinkRnc(window.location.origin + '/conta-internacional-publica/' + rnc.link_token);
  };

  useEffect(() => {
    if (rncId) {
      base44.entities.RncContaInternacional.get(rncId).then(aplicar).catch(() => {});
      return;
    }
    if (!contrato?.id) return;
    base44.entities.RncContaInternacional.filter({ contrato_id: contrato.id })
      .then(rncs => {
        if (rncs.length > 0) {
          aplicar(rncs[0]);
        } else {
          setS1(f => ({ ...f, secao1_email: contrato.email || '', secao1_celular: contrato.telefone || '', secao1_pj_razao_social: contrato.nome || '' }));
          setS3(f => ({ ...f, secao3_nome: contrato.nome || '', secao3_cpf: contrato.cpf_cnpj || '', secao3_email: contrato.email || '', secao3_nascimento: contrato.nascimento || '' }));
          setDocumentos(buildDocInicial('PF'));
        }
      }).catch(() => {});
  }, [contrato?.id, rncId]);

  useEffect(() => {
    setDocumentos(prev => mergeDocs(tipoConta, prev));
  }, [tipoConta]);

  const coletarDados = () => ({
    contrato_id: rncExistente?.contrato_id || contrato?.id || '',
    tipo_conta: tipoConta,
    ...s1,
    secao1_assinantes: assinantesNomes.filter(Boolean),
    secao1_bancos_existentes: bancosExistentes.filter(b => b.nome_banco),
    secao1_pj_clientes: clientesPJ.filter(c => c.nome),
    secao1_pj_fornecedores: fornecedoresPJ.filter(f => f.nome),
    secao1_pj_acionistas: acionistasPJ.filter(a => a.nome).map(a => ({ ...a, percentual: a.percentual ? Number(a.percentual) : null })),
    secao2_assinantes: assinantes,
    ...s3,
    secao3_beneficiarios: beneficiarios.filter(b => b.nome_completo),
    documentos,
    observacoes,
    preenchido_por: user?.nome_tratamento || user?.full_name || user?.email || '',
    data_preenchimento: isoNowBrasilia(),
  });

  const handleUploadDoc = async (index, file) => {
    setUploadingDoc(index);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDocumentos(docs => docs.map((d, i) => i === index ? { ...d, recebido: true, url: file_url, nome_arquivo: file.name } : d));
      toast.success('Documento anexado!');
    } catch (e) { toast.error('Erro no upload: ' + e.message); }
    setUploadingDoc(null);
  };

  const handleRemoveDoc = (index) => {
    setDocumentos(docs => docs.map((d, i) => i === index ? { ...d, recebido: false, url: '', nome_arquivo: '' } : d));
  };

  const handleSalvar = async (status = 'rascunho') => {
    setSalvando(true);
    try {
      const dados = { ...coletarDados(), status };
      if (rncExistente) {
        await base44.entities.RncContaInternacional.update(rncExistente.id, dados);
        setRncExistente({ ...rncExistente, ...dados });
      } else {
        const created = await base44.entities.RncContaInternacional.create(dados);
        setRncExistente(created);
      }
      queryClient.invalidateQueries(['rnc-conta-internacional']);
      toast.success(status === 'concluido' ? 'Formulário concluído!' : 'Salvo como rascunho.');
    } catch (e) { toast.error('Erro ao salvar: ' + e.message); }
    setSalvando(false);
  };

  const handleGerarPdf = async () => {
    setGerandoPdf(true);
    try {
      let id = rncExistente?.id;
      const dados = { ...coletarDados(), status: id && rncExistente?.status === 'concluido' ? 'concluido' : 'rascunho' };
      if (id) {
        await base44.entities.RncContaInternacional.update(id, dados);
      } else {
        const created = await base44.entities.RncContaInternacional.create(dados);
        id = created.id;
        setRncExistente(created);
      }
      const res = await base44.functions.invoke('gerarContaInternacionalPDF', { rnc_id: id });
      if (res?.data?.pdf_base64) {
        const byteChars = atob(res.data.pdf_base64);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = res.data.filename || 'Conta_Internacional.pdf'; a.click();
        URL.revokeObjectURL(url);
        try {
          const file = new File([blob], res.data.filename, { type: 'application/pdf' });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          await base44.entities.RncContaInternacional.update(id, { pdf_url: file_url, pdf_nome: res.data.filename, status: 'concluido' });
          setRncExistente(prev => ({ ...prev, pdf_url: file_url, pdf_nome: res.data.filename, status: 'concluido' }));
        } catch {}
        toast.success('PDF gerado e baixado!');
      } else { toast.error('Erro ao gerar PDF.'); }
    } catch (e) { toast.error('Erro: ' + e.message); }
    setGerandoPdf(false);
  };

  const handleGerarLink = async () => {
    setSalvando(true);
    let id = rncExistente?.id;
    try {
      const dados = { ...coletarDados(), status: rncExistente?.status === 'concluido' ? 'concluido' : 'rascunho' };
      if (id) {
        await base44.entities.RncContaInternacional.update(id, dados);
      } else {
        const created = await base44.entities.RncContaInternacional.create(dados);
        id = created.id;
        setRncExistente(created);
      }
    } catch (e) { toast.error('Erro ao salvar: ' + e.message); setSalvando(false); return; }
    setSalvando(false);
    setGerandoLink(true);
    try {
      const res = await base44.functions.invoke('gerarLinkContaInternacional', { rnc_id: id });
      if (res?.data?.link) {
        const fullUrl = window.location.origin + res.data.link;
        setLinkRnc(fullUrl);
        navigator.clipboard?.writeText(fullUrl).catch(() => {});
        toast.success('Link gerado e copiado!');
      } else { toast.error('Erro ao gerar link.'); }
    } catch (e) { toast.error('Erro: ' + e.message); }
    setGerandoLink(false);
  };

  const isPJ = tipoConta === 'PJ';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-3xl max-h-[calc(100vh-140px)] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: AURORA.bg, border: `1px solid ${AURORA.borderActive}` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${AURORA.surface} 0%, ${AURORA.surface2} 100%)`, borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,249,0.15)' }}>
              <Globe className="w-5 h-5" style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: AURORA.text }}>Conta Internacional</h2>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>
                {rncExistente ? `Rascunho salvo · ${s1.secao1_pj_razao_social || s3.secao3_nome || contrato?.nome || ''}` : `Contrato: ${contrato?.nome || '—'}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition hover:bg-white/10">
            <X className="w-5 h-5" style={{ color: AURORA.textMuted }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Tipo PF / PJ */}
          <div className="grid grid-cols-2 gap-3">
            {['PF','PJ'].map(t => (
              <button key={t} onClick={() => setTipoConta(t)}
                className="rounded-xl p-4 transition border-2"
                style={tipoConta === t
                  ? { background: 'rgba(0,212,170,0.12)', borderColor: AURORA.accent }
                  : { background: AURORA.surface, borderColor: AURORA.border }}>
                <div className="flex items-center gap-2 mb-1">
                  {t === 'PF' ? <User className="w-4 h-4" style={{ color: tipoConta === t ? AURORA.accent : AURORA.textMuted }} /> : <Building2 className="w-4 h-4" style={{ color: tipoConta === t ? AURORA.accent : AURORA.textMuted }} />}
                  <span className="text-sm font-bold" style={{ color: AURORA.text }}>{t === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</span>
                </div>
                <p className="text-[10px]" style={{ color: AURORA.textMuted }}>{t === 'PF' ? 'Conta pessoal' : 'Conta empresarial'}</p>
              </button>
            ))}
          </div>

          {/* SEÇÃO 1 — INFORMAÇÕES DA CONTA */}
          <CardSection title="Seção 1 — Informações da Conta" icon={Globe} open={s1Open} onToggle={() => setS1Open(p => !p)}>
            <div className="space-y-3">
              {isPJ && (
                <>
                  <LI label="Nome Completo da Empresa *" value={s1.secao1_pj_razao_social} onChange={v => setS1(f => ({ ...f, secao1_pj_razao_social: v }))} />
                  <LI label="CNPJ/EIN" value={s1.secao1_pj_cnpj} onChange={v => setS1(f => ({ ...f, secao1_pj_cnpj: v }))} />
                </>
              )}
              <RadioBtns label="Tipo de Conta"
                value={s1.secao1_tipo_conta}
                onChange={v => setS1(f => ({ ...f, secao1_tipo_conta: v }))}
                opts={isPJ
                  ? [{ value: 'Conta Corrente', label: 'Conta Corrente' }, { value: 'Poupanca', label: 'Poupança' }]
                  : [{ value: 'Conta Corrente', label: 'Conta Corrente' }, { value: 'Poupanca', label: 'Poupança' }, { value: 'Money Market', label: 'Money Market' }, { value: 'CD', label: 'CD' }]
                }
              />
              <div>
                <label className="block mb-1" style={labelStyle}>Propósito da conta nos EUA</label>
                <textarea value={s1.secao1_proposito} onChange={e => setS1(f => ({ ...f, secao1_proposito: e.target.value }))}
                  rows={3} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
                  style={inputStyle} placeholder="Como a conta será usada, débitos e créditos..." />
              </div>

              <p className="text-xs font-bold pt-2" style={{ color: AURORA.accent }}>Depósito Inicial</p>
              <div className="grid grid-cols-3 gap-2">
                <LI label="Nome do Remetente" value={s1.secao1_deposito_remetente} onChange={v => setS1(f => ({ ...f, secao1_deposito_remetente: v }))} />
                <LI label="Nome do Banco" value={s1.secao1_deposito_banco} onChange={v => setS1(f => ({ ...f, secao1_deposito_banco: v }))} />
                <LI label="Valor (USD)" value={s1.secao1_deposito_valor} onChange={v => setS1(f => ({ ...f, secao1_deposito_valor: v }))} />
              </div>
              <div>
                <label className="block mb-1" style={labelStyle}>Origem dos fundos</label>
                <input value={s1.secao1_origem_fundos} onChange={e => setS1(f => ({ ...f, secao1_origem_fundos: e.target.value }))}
                  style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" placeholder="Poupança, salário, herança..." />
              </div>

              <p className="text-xs font-bold pt-2" style={{ color: AURORA.accent }}>Bancos existentes do titular</p>
              {bancosExistentes.map((b, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end">
                  <input value={b.nome_banco} onChange={e => setBancosExistentes(bs => bs.map((x, j) => j === i ? { ...x, nome_banco: e.target.value } : x))}
                    placeholder="Nome do Banco" style={inputStyle} className="px-3 py-2 text-sm rounded-lg focus:outline-none" />
                  <input value={b.pais} onChange={e => setBancosExistentes(bs => bs.map((x, j) => j === i ? { ...x, pais: e.target.value } : x))}
                    placeholder="País" style={inputStyle} className="px-3 py-2 text-sm rounded-lg focus:outline-none" />
                  <div className="flex gap-2">
                    <input value={b.tipo_conta} onChange={e => setBancosExistentes(bs => bs.map((x, j) => j === i ? { ...x, tipo_conta: e.target.value } : x))}
                      placeholder="Tipo" style={inputStyle} className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                    {bancosExistentes.length > 1 && (
                      <button onClick={() => setBancosExistentes(bs => bs.filter((_, j) => j !== i))} style={{ color: AURORA.danger }}><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={() => setBancosExistentes(bs => [...bs, BANCO_VAZIO()])}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                <Plus className="w-3 h-3" /> Adicionar Banco
              </button>

              <p className="text-xs font-bold pt-2" style={{ color: AURORA.accent }}>Assinantes da Conta</p>
              {assinantesNomes.map((nome, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={nome} onChange={e => setAssinantesNomes(ns => ns.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`Assinante ${i + 1}`} style={inputStyle} className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                  {assinantesNomes.length > 1 && (
                    <button onClick={() => setAssinantesNomes(ns => ns.filter((_, j) => j !== i))} style={{ color: AURORA.danger }}><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
              <button onClick={() => setAssinantesNomes(ns => [...ns, ''])}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                <Plus className="w-3 h-3" /> Adicionar Assinante
              </button>

              <div className="grid grid-cols-2 gap-3">
                <RadioBtns label="Tipo de Assinatura" value={s1.secao1_assinatura_tipo}
                  onChange={v => setS1(f => ({ ...f, secao1_assinatura_tipo: v }))}
                  opts={[{ value: 'Conjunta', label: 'Conjunta' }, { value: 'Individual', label: 'Individual' }]} />
                <RadioBtns label="Talão de Cheques?" value={s1.secao1_talao_cheques}
                  onChange={v => setS1(f => ({ ...f, secao1_talao_cheques: v }))}
                  opts={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]} />
                <RadioBtns label="Cartão de Débito?" value={s1.secao1_cartao_debito}
                  onChange={v => setS1(f => ({ ...f, secao1_cartao_debito: v }))}
                  opts={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]} />
              </div>

              <p className="text-xs font-bold pt-2" style={{ color: AURORA.accent }}>Contato</p>
              <div className="grid grid-cols-2 gap-3">
                <LI label="E-mail" value={s1.secao1_email} onChange={v => setS1(f => ({ ...f, secao1_email: v }))} />
                <LI label="Celular" value={s1.secao1_celular} onChange={v => setS1(f => ({ ...f, secao1_celular: v }))} />
                <LI label="Telefone Escritório 1" value={s1.secao1_telefone_escritorio1} onChange={v => setS1(f => ({ ...f, secao1_telefone_escritorio1: v }))} />
                <LI label="Telefone Escritório 2" value={s1.secao1_telefone_escritorio2} onChange={v => setS1(f => ({ ...f, secao1_telefone_escritorio2: v }))} />
                <div className="col-span-2">
                  <LI label="Endereço para Correspondências (se diferente do legal)" value={s1.secao1_endereco_correspondencia} onChange={v => setS1(f => ({ ...f, secao1_endereco_correspondencia: v }))} />
                </div>
              </div>

              {isPJ && (
                <>
                  <p className="text-xs font-bold pt-3" style={{ color: AURORA.accent }}>Informações da Empresa (PJ)</p>
                  <div>
                    <label className="block mb-1" style={labelStyle}>Linha de Negócios da Empresa</label>
                    <textarea value={s1.secao1_pj_linha_negocios} onChange={e => setS1(f => ({ ...f, secao1_pj_linha_negocios: e.target.value }))}
                      rows={2} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" style={inputStyle} placeholder="O que a empresa vende/faz..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1" style={labelStyle}>Nº de Empregados</label>
                      <select value={s1.secao1_pj_num_empregados} onChange={e => setS1(f => ({ ...f, secao1_pj_num_empregados: e.target.value }))}
                        style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none">
                        <option value="">Selecione...</option>
                        {['1-5','5-10','10-20','50','50-100','100-200','>200'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <LI label="País de Operação" value={s1.secao1_pj_pais_operacao} onChange={v => setS1(f => ({ ...f, secao1_pj_pais_operacao: v }))} />
                    <LI label="Receita Bruta Último Ano (USD)" value={s1.secao1_pj_receita_bruta} onChange={v => setS1(f => ({ ...f, secao1_pj_receita_bruta: v }))} placeholder="Ex: 500000" />
                    <LI label="Prospecção Receita (empresa nova) USD" value={s1.secao1_pj_prospeccao_receita} onChange={v => setS1(f => ({ ...f, secao1_pj_prospeccao_receita: v }))} placeholder="Ex: 100000" />
                  </div>
                  <div>
                    <label className="block mb-1" style={labelStyle}>Produtos e Serviços</label>
                    <textarea value={s1.secao1_pj_produtos_servicos} onChange={e => setS1(f => ({ ...f, secao1_pj_produtos_servicos: e.target.value }))}
                      rows={2} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" style={inputStyle} />
                  </div>

                  <p className="text-xs font-bold pt-2" style={{ color: AURORA.accent }}>Clientes que pagarão pela conta nos EUA</p>
                  {clientesPJ.map((c, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={c.nome} onChange={e => setClientesPJ(cs => cs.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))}
                        placeholder="Nome do Cliente" style={inputStyle} className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                      <input value={c.pais} onChange={e => setClientesPJ(cs => cs.map((x, j) => j === i ? { ...x, pais: e.target.value } : x))}
                        placeholder="País" style={inputStyle} className="w-28 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                      {clientesPJ.length > 1 && <button onClick={() => setClientesPJ(cs => cs.filter((_, j) => j !== i))} style={{ color: AURORA.danger }}><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                  <button onClick={() => setClientesPJ(cs => [...cs, { nome: '', pais: '' }])}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                    <Plus className="w-3 h-3" /> Adicionar Cliente
                  </button>

                  <p className="text-xs font-bold pt-2" style={{ color: AURORA.accent }}>Fornecedores que serão pagos pela conta</p>
                  {fornecedoresPJ.map((f, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={f.nome} onChange={e => setFornecedoresPJ(fs => fs.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))}
                        placeholder="Nome do Fornecedor" style={inputStyle} className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                      <input value={f.pais} onChange={e => setFornecedoresPJ(fs => fs.map((x, j) => j === i ? { ...x, pais: e.target.value } : x))}
                        placeholder="País" style={inputStyle} className="w-28 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                      {fornecedoresPJ.length > 1 && <button onClick={() => setFornecedoresPJ(fs => fs.filter((_, j) => j !== i))} style={{ color: AURORA.danger }}><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                  <button onClick={() => setFornecedoresPJ(fs => [...fs, { nome: '', pais: '' }])}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                    <Plus className="w-3 h-3" /> Adicionar Fornecedor
                  </button>

                  <p className="text-xs font-bold pt-2" style={{ color: AURORA.accent }}>Acionistas e Participação</p>
                  {acionistasPJ.map((a, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={a.nome} onChange={e => setAcionistasPJ(as => as.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))}
                        placeholder="Nome do Acionista" style={inputStyle} className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                      <input value={a.percentual} onChange={e => setAcionistasPJ(as => as.map((x, j) => j === i ? { ...x, percentual: e.target.value } : x))}
                        placeholder="%" style={inputStyle} className="w-20 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                      {acionistasPJ.length > 1 && <button onClick={() => setAcionistasPJ(as => as.filter((_, j) => j !== i))} style={{ color: AURORA.danger }}><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                  <button onClick={() => setAcionistasPJ(as => [...as, { nome: '', percentual: '' }])}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                    <Plus className="w-3 h-3" /> Adicionar Acionista
                  </button>
                </>
              )}
            </div>
          </CardSection>

          {/* SEÇÃO 2 — ASSINANTES AUTORIZADOS */}
          <CardSection title="Seção 2 — Assinantes Autorizados" icon={User} open={s2Open} onToggle={() => setS2Open(p => !p)} badge={`${assinantes.length} assinante(s)`}>
            <div className="space-y-4">
              {assinantes.map((a, i) => {
                const update = (field, val) => setAssinantes(ss => ss.map((x, j) => j === i ? { ...x, [field]: val } : x));
                return (
                  <div key={i} className="rounded-lg p-4 space-y-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: AURORA.accent }}>Assinante {i + 1}</span>
                      {assinantes.length > 1 && (
                        <button onClick={() => setAssinantes(ss => ss.filter((_, j) => j !== i))}
                          className="p-1 rounded" style={{ color: AURORA.danger }}><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><LI label="Nome Completo *" value={a.nome} onChange={v => update('nome', v)} /></div>
                      <LI label="E-mail *" value={a.email} onChange={v => update('email', v)} />
                      <LI label="Telefone Celular" value={a.telefone_celular} onChange={v => update('telefone_celular', v)} />
                      <LI label="Telefone Residência" value={a.telefone_residencia} onChange={v => update('telefone_residencia', v)} />
                      <LI label="Telefone Escritório" value={a.telefone_escritorio} onChange={v => update('telefone_escritorio', v)} />
                      <div className="col-span-2"><LI label="Endereço de Correspondência" value={a.endereco_correspondencia} onChange={v => update('endereco_correspondencia', v)} /></div>
                      <LI label="Nome da Empresa" value={a.nome_empresa} onChange={v => update('nome_empresa', v)} />
                      <LI label="Atividade da Empresa" value={a.atividade_empresa} onChange={v => update('atividade_empresa', v)} />
                      <LI label="Título/Posição na Empresa" value={a.titulo_posicao} onChange={v => update('titulo_posicao', v)} />
                      <RadioBtns label="Tipo de Emprego" value={a.tipo_emprego} onChange={v => update('tipo_emprego', v)}
                        opts={[{ value: 'Empregado', label: 'Empregado' }, { value: 'Acionista', label: 'Acionista' }, { value: 'Aposentado', label: 'Aposentado' }]} />
                      <LI label="Salário Anual (USD) *" value={a.salario_anual_usd} onChange={v => update('salario_anual_usd', v)} placeholder="Ex: 50000" />
                      <LI label="Outra Fonte de Renda" value={a.outra_fonte_renda} onChange={v => update('outra_fonte_renda', v)} />
                      <LI label="Valor Outra Renda (USD)" value={a.valor_outra_renda} onChange={v => update('valor_outra_renda', v)} />
                      <div className="col-span-2"><LI label="Explicação de Herança (se aplicável)" value={a.explicacao_heranca} onChange={v => update('explicacao_heranca', v)} /></div>
                      <LI label="País de Nascimento *" value={a.pais_nascimento} onChange={v => update('pais_nascimento', v)} />
                      <LI label="Nº do Passaporte" value={a.numero_passaporte} onChange={v => update('numero_passaporte', v)} />
                      <RadioBtns label="Possui dupla nacionalidade?" value={a.dupla_nacionalidade} onChange={v => update('dupla_nacionalidade', v)}
                        opts={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]} />
                      {a.dupla_nacionalidade === 'sim' && (
                        <LI label="País da 2ª Nacionalidade" value={a.pais_segunda_nacionalidade} onChange={v => update('pais_segunda_nacionalidade', v)} />
                      )}
                      <RadioBtns label="Ficou +182 dias nos EUA (último ano)?" value={a.mais_182_dias_eua} onChange={v => update('mais_182_dias_eua', v)}
                        opts={[{ value: 'sim', label: 'Sim (W9)' }, { value: 'nao', label: 'Não' }]} />
                      <RadioBtns label="Média +122 dias/ano nos EUA (3 anos)?" value={a.mais_122_dias_eua_3anos} onChange={v => update('mais_122_dias_eua_3anos', v)}
                        opts={[{ value: 'sim', label: 'Sim (W9)' }, { value: 'nao', label: 'Não' }]} />
                      {(a.mais_182_dias_eua === 'sim' || a.mais_122_dias_eua_3anos === 'sim') && (
                        <div className="col-span-2"><LI label="Endereço/Telefone nos EUA" value={a.endereco_eua} onChange={v => update('endereco_eua', v)} /></div>
                      )}
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setAssinantes(ss => [...ss, ASSINANTE_VAZIO()])}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ background: AURORA.accentDim, color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                <Plus className="w-3.5 h-3.5" /> Adicionar Assinante Autorizado
              </button>
            </div>
          </CardSection>

          {/* SEÇÃO 3 — PF: Titular + Beneficiários */}
          {!isPJ && (
            <CardSection title="Seção 3 — Titular e Beneficiários" icon={User} open={s3Open} onToggle={() => setS3Open(p => !p)}>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><LI label="Nome Completo *" value={s3.secao3_nome} onChange={v => setS3(f => ({ ...f, secao3_nome: v }))} /></div>
                <LI label="CPF" value={s3.secao3_cpf} onChange={v => setS3(f => ({ ...f, secao3_cpf: v }))} />
                <LI label="Data de Nascimento" type="date" value={s3.secao3_nascimento} onChange={v => setS3(f => ({ ...f, secao3_nascimento: v }))} />
                <LI label="Nacionalidade" value={s3.secao3_nacionalidade} onChange={v => setS3(f => ({ ...f, secao3_nacionalidade: v }))} />
                <LI label="E-mail" value={s3.secao3_email} onChange={v => setS3(f => ({ ...f, secao3_email: v }))} />
                <div className="col-span-2"><LI label="Telefone" value={s3.secao3_telefone} onChange={v => setS3(f => ({ ...f, secao3_telefone: v }))} /></div>
                <LI label="Nº Passaporte" value={s3.secao3_passaporte} onChange={v => setS3(f => ({ ...f, secao3_passaporte: v }))} />
              </div>
              <p className="text-xs font-bold mt-4 mb-2" style={{ color: AURORA.accent }}>Beneficiários da Conta (em caso de falecimento)</p>
              {beneficiarios.map((b, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
                  <input value={b.nome_completo} onChange={e => setBeneficiarios(bs => bs.map((x, j) => j === i ? { ...x, nome_completo: e.target.value } : x))}
                    placeholder="Nome completo" style={inputStyle} className="px-3 py-2 text-sm rounded-lg focus:outline-none" />
                  <input type="date" value={b.data_nascimento} onChange={e => setBeneficiarios(bs => bs.map((x, j) => j === i ? { ...x, data_nascimento: e.target.value } : x))}
                    style={inputStyle} className="px-3 py-2 text-sm rounded-lg focus:outline-none" />
                  <div className="flex gap-2">
                    <input value={b.parentesco} onChange={e => setBeneficiarios(bs => bs.map((x, j) => j === i ? { ...x, parentesco: e.target.value } : x))}
                      placeholder="Parentesco" style={inputStyle} className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                    {beneficiarios.length > 1 && <button onClick={() => setBeneficiarios(bs => bs.filter((_, j) => j !== i))} style={{ color: AURORA.danger }}><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
              ))}
              <button onClick={() => setBeneficiarios(bs => [...bs, { nome_completo: '', data_nascimento: '', parentesco: '' }])}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg mt-1" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                <Plus className="w-3 h-3" /> Adicionar Beneficiário
              </button>
            </CardSection>
          )}

          {/* DOCUMENTAÇÃO */}
          <CardSection title="Documentação Necessária" icon={FileText} open={sDocsOpen} onToggle={() => setSDocsOpen(p => !p)}
            badge={`${documentos.filter(d => d.recebido).length}/${documentos.length}`}>
            <div className="space-y-2">
              {documentos.map((doc, i) => (
                <div key={doc.tipo} className="rounded-lg p-3 flex items-center gap-3"
                  style={{ background: AURORA.surface2, border: `1px solid ${doc.recebido ? 'rgba(0,212,170,0.3)' : AURORA.border}` }}>
                  {doc.recebido ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: AURORA.accent }} /> : <Circle className="w-5 h-5 flex-shrink-0" style={{ color: doc.obrigatorio ? AURORA.danger : AURORA.textMuted }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: AURORA.text }}>{doc.descricao}</p>
                    {doc.recebido && doc.nome_arquivo && <p className="text-[10px] truncate" style={{ color: AURORA.accent }}>{doc.nome_arquivo}</p>}
                  </div>
                  {doc.recebido ? (
                    <button onClick={() => handleRemoveDoc(i)} className="p-1.5 rounded-lg" style={{ color: AURORA.danger, background: 'rgba(248,113,113,0.1)' }}><Trash2 className="w-3.5 h-3.5" /></button>
                  ) : (
                    <label className="cursor-pointer p-1.5 rounded-lg flex items-center" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                      {uploadingDoc === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <input type="file" className="hidden" onChange={e => e.target.files[0] && handleUploadDoc(i, e.target.files[0])} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </CardSection>

          {/* OBSERVAÇÕES */}
          <CardSection title="Observações" icon={FileText} open={sObsOpen} onToggle={() => setSObsOpen(p => !p)}>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
              rows={3} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
              style={inputStyle} placeholder="Observações adicionais..." />
          </CardSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 flex-shrink-0"
          style={{ background: AURORA.surface, borderTop: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {rncExistente?.pdf_url && (
              <a href={rncExistente.pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{ background: 'rgba(59,130,249,0.15)', border: '1px solid rgba(59,130,249,0.3)', color: '#60a5fa' }}>
                <Download className="w-3.5 h-3.5" /> Ver PDF
              </a>
            )}
            <button onClick={handleGerarLink} disabled={gerandoLink || salvando}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0 disabled:opacity-50"
              style={{ background: 'rgba(59,130,249,0.15)', border: '1px solid rgba(59,130,249,0.3)', color: '#60a5fa' }}>
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Salvar Rascunho
            </button>
            <button onClick={handleGerarPdf} disabled={gerandoPdf || salvando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
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