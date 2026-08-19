import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, Send, User, Building2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const WATERMARK_IMG = 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/ed94a18f2_generated_image.png';

const PRODUTOS = [
  'CONTA GLOBAL', 'CONTA INTERNACIONAL', 'DOLARIZE', 'ROF',
  'CANAL BANCÁRIO', 'OFFSHORE', 'GARANTIAS', 'HORA TÉCNICA', 'RATING',
];

const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };

function Field({ label, children, required }) {
  return (
    <div>
      <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>
        {label}{required && <span style={{ color: '#f87171' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none";

export default function IndicacaoPublicaPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = window.location.pathname.split('/').pop();
  const navigate = useNavigate();
  const [parceiro, setParceiro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [tipo, setTipo] = useState('PF');
  const [produto, setProduto] = useState('');
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [pf, setPf] = useState({});
  const [pj, setPj] = useState({});

  useEffect(() => {
    base44.functions.invoke('indicacaoParceiroPublica', { action: 'buscar', token })
      .then(res => { setParceiro(res.parceiro); })
      .catch(e => setErro(e.message || 'Link inválido'))
      .finally(() => setLoading(false));
  }, [token]);

  const setField = (setter) => (k) => (e) => setter(prev => ({ ...prev, [k]: e.target.value }));

  const salvar = async () => {
    if (!produto) { toast.error('Selecione o produto'); return; }
    if (tipo === 'PF' && !pf.pf_nome?.trim()) { toast.error('Informe o nome do titular'); return; }
    if (tipo === 'PJ' && !pj.pj_razao_social?.trim()) { toast.error('Informe a razão social'); return; }

    setEnviando(true);
    try {
      const dados = {
        tipo, produto,
        valor_estimado: valor ? Number(valor) : null,
        observacoes: obs,
        ...(tipo === 'PF' ? pf : pj),
      };
      const res = await base44.functions.invoke('indicacaoParceiroPublica', { action: 'salvar', token, dados });
      if (res.success) setSucesso(true);
    } catch (e) {
      toast.error('Erro ao enviar: ' + (e.message || ''));
    }
    setEnviando(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: AURORA.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: AURORA.accent }} />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: AURORA.bg }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: AURORA.text }}>Link inválido</h2>
          <p className="text-sm" style={{ color: AURORA.textMuted }}>{erro}</p>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: AURORA.bg }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: `url("${WATERMARK_IMG}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, rgba(13,17,23,0.55), rgba(13,17,23,0.6))', pointerEvents: 'none' }} />
        <div className="text-center max-w-sm relative" style={{ zIndex: 1 }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,212,170,0.15)' }}>
            <CheckCircle2 className="w-9 h-9" style={{ color: AURORA.accent }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: AURORA.text }}>Indicação enviada!</h2>
          <p className="text-sm mb-5" style={{ color: AURORA.textMuted }}>Obrigado, {parceiro?.nome}. Sua indicação foi recebida e seguirá em nossa esteira comercial.</p>
          <button onClick={() => navigate(`/portal-indicador/${token}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: AURORA.accent, color: '#0d1117' }}>
            <ArrowLeft className="w-4 h-4" /> Voltar ao portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative" style={{ background: AURORA.bg, color: AURORA.text }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: `url("${WATERMARK_IMG}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', opacity: 0.45, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, rgba(13,17,23,0.55) 0%, rgba(13,17,23,0.45) 40%, rgba(13,17,23,0.60) 100%)', pointerEvents: 'none' }} />
      <div className="max-w-2xl mx-auto relative" style={{ zIndex: 1 }}>
        {/* Botão voltar */}
        <button onClick={() => navigate(`/portal-indicador/${token}`)}
          className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition"
          style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao portal
        </button>
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
            <Send className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: AURORA.text }}>Formulário de Indicação</h1>
          <p className="text-sm mt-1" style={{ color: AURORA.textMuted }}>
            Parceiro: <strong style={{ color: AURORA.accent }}>{parceiro?.nome}</strong>
          </p>
          <p className="text-xs mt-1" style={{ color: AURORA.textMuted }}>Preencha os dados do potencial cliente. Você permanecerá vinculado a esta indicação.</p>
        </div>

        <div className="rounded-2xl p-5 md:p-6 space-y-5" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          {/* Tipo */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: AURORA.textMuted }}>Tipo de cliente</p>
            <div className="grid grid-cols-2 gap-2">
              {['PF', 'PJ'].map(t => (
                <button key={t} onClick={() => setTipo(t)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{
                    background: tipo === t ? AURORA.accent : AURORA.surface2,
                    color: tipo === t ? '#0d1117' : AURORA.text,
                    border: `1px solid ${tipo === t ? AURORA.accent : AURORA.border}`,
                  }}>
                  {t === 'PF' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  {t === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </button>
              ))}
            </div>
          </div>

          {/* Produto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Produto de interesse" required>
              <select value={produto} onChange={e => setProduto(e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">Selecione...</option>
                {PRODUTOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Valor estimado de adesão (R$)">
              <input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="Ex: 5000" className={inputCls} style={inputStyle} />
            </Field>
          </div>

          {/* PF */}
          {tipo === 'PF' && (
            <div className="space-y-3 pt-2" style={{ borderTop: `1px solid ${AURORA.border}` }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Dados Pessoa Física</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Nome completo" required><input value={pf.pf_nome || ''} onChange={setField(setPf)('pf_nome')} className={inputCls} style={inputStyle} /></Field>
                <Field label="CPF"><input value={pf.pf_cpf || ''} onChange={setField(setPf)('pf_cpf')} className={inputCls} style={inputStyle} /></Field>
                <Field label="RG"><input value={pf.pf_rg || ''} onChange={setField(setPf)('pf_rg')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Data de nascimento"><input type="date" value={pf.pf_nascimento || ''} onChange={setField(setPf)('pf_nascimento')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Nacionalidade"><input value={pf.pf_nacionalidade || ''} onChange={setField(setPf)('pf_nacionalidade')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Profissão"><input value={pf.pf_profissao || ''} onChange={setField(setPf)('pf_profissao')} className={inputCls} style={inputStyle} /></Field>
                <Field label="E-mail"><input value={pf.pf_email || ''} onChange={setField(setPf)('pf_email')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Telefone"><input value={pf.pf_telefone || ''} onChange={setField(setPf)('pf_telefone')} className={inputCls} style={inputStyle} /></Field>
                <Field label="WhatsApp"><input value={pf.pf_whatsapp || ''} onChange={setField(setPf)('pf_whatsapp')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Renda estimada (R$)"><input type="number" value={pf.pf_renda || ''} onChange={setField(setPf)('pf_renda')} className={inputCls} style={inputStyle} /></Field>
                <Field label="CEP"><input value={pf.pf_cep || ''} onChange={setField(setPf)('pf_cep')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Endereço"><input value={pf.pf_endereco || ''} onChange={setField(setPf)('pf_endereco')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Número"><input value={pf.pf_numero || ''} onChange={setField(setPf)('pf_numero')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Complemento"><input value={pf.pf_complemento || ''} onChange={setField(setPf)('pf_complemento')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Bairro"><input value={pf.pf_bairro || ''} onChange={setField(setPf)('pf_bairro')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Cidade"><input value={pf.pf_cidade || ''} onChange={setField(setPf)('pf_cidade')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Estado (UF)"><input value={pf.pf_estado || ''} onChange={setField(setPf)('pf_estado')} className={inputCls} style={inputStyle} /></Field>
              </div>
            </div>
          )}

          {/* PJ */}
          {tipo === 'PJ' && (
            <div className="space-y-3 pt-2" style={{ borderTop: `1px solid ${AURORA.border}` }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Dados Pessoa Jurídica</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Razão Social" required><input value={pj.pj_razao_social || ''} onChange={setField(setPj)('pj_razao_social')} className={inputCls} style={inputStyle} /></Field>
                <Field label="CNPJ"><input value={pj.pj_cnpj || ''} onChange={setField(setPj)('pj_cnpj')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Nome do responsável"><input value={pj.pj_nome_responsavel || ''} onChange={setField(setPj)('pj_nome_responsavel')} className={inputCls} style={inputStyle} /></Field>
                <Field label="CPF do responsável"><input value={pj.pj_cpf_responsavel || ''} onChange={setField(setPj)('pj_cpf_responsavel')} className={inputCls} style={inputStyle} /></Field>
                <Field label="E-mail"><input value={pj.pj_email || ''} onChange={setField(setPj)('pj_email')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Telefone"><input value={pj.pj_telefone || ''} onChange={setField(setPj)('pj_telefone')} className={inputCls} style={inputStyle} /></Field>
                <Field label="WhatsApp"><input value={pj.pj_whatsapp || ''} onChange={setField(setPj)('pj_whatsapp')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Ramo de atividade"><input value={pj.pj_ramo_atividade || ''} onChange={setField(setPj)('pj_ramo_atividade')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Faturamento estimado (R$)"><input type="number" value={pj.pj_faturamento || ''} onChange={setField(setPj)('pj_faturamento')} className={inputCls} style={inputStyle} /></Field>
                <Field label="CEP"><input value={pj.pj_cep || ''} onChange={setField(setPj)('pj_cep')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Endereço"><input value={pj.pj_endereco || ''} onChange={setField(setPj)('pj_endereco')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Número"><input value={pj.pj_numero || ''} onChange={setField(setPj)('pj_numero')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Complemento"><input value={pj.pj_complemento || ''} onChange={setField(setPj)('pj_complemento')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Bairro"><input value={pj.pj_bairro || ''} onChange={setField(setPj)('pj_bairro')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Cidade"><input value={pj.pj_cidade || ''} onChange={setField(setPj)('pj_cidade')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Estado (UF)"><input value={pj.pj_estado || ''} onChange={setField(setPj)('pj_estado')} className={inputCls} style={inputStyle} /></Field>
              </div>
            </div>
          )}

          {/* Observações */}
          <Field label="Observações sobre o lead">
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Contexto, urgência, pontos de atenção..." className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none" style={inputStyle} />
          </Field>

          <button onClick={salvar} disabled={enviando}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
            {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Enviar Indicação
          </button>
        </div>

        <p className="text-center text-[11px] mt-4" style={{ color: AURORA.textMuted }}>
          Villela Exchange · Sistema de Indicação de Parceiros
        </p>
      </div>
    </div>
  );
}