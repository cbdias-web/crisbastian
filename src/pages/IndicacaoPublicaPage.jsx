import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, Send, User, Building2, ArrowLeft, ArrowRight, Zap, Info } from 'lucide-react';
import { VALOR_MINIMO_INDICACAO } from '@/lib/produtosMinimos';
import { toast } from 'sonner';
import CampoMascara from '@/components/ui/campo-mascara';
import CampoMoeda from '@/components/ui/campo-moeda';
import { consultarCep, consultarCnpj, aplicarDados } from '@/lib/autocomplete';

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
  'CONTA INTERNACIONAL', 'DOLARIZE', 'OFFSHORE', 'RATING', 'SCORE',
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
      .then(res => { const r = res?.data || res; setParceiro(r?.parceiro); })
      .catch(e => setErro(e?.message || 'Link inválido'))
      .finally(() => setLoading(false));
  }, [token]);

  const setField = (setter) => (k) => (e) => setter(prev => ({ ...prev, [k]: e.target.value }));

  // Produtos com valor mínimo: pré-preenchem o campo e impedem valores menores
  const selecionarProduto = (p) => {
    setProduto(p);
    const min = VALOR_MINIMO_INDICACAO[p];
    if (min && (!valor || Number(valor) < min)) setValor(String(min));
  };

  const onChangeValor = (v) => {
    const min = VALOR_MINIMO_INDICACAO[produto];
    if (min && v !== '' && Number(v) < min) {
      setValor(String(min));
      toast.warning(`Valor mínimo para ${produto}: R$ ${min.toLocaleString('pt-BR')}`);
      return;
    }
    setValor(v);
  };

  // Preenchimento automático: CEP → endereço | CNPJ → razão social + endereço
  const completarCep = async (prefixo) => {
    const cep = (prefixo === 'pf' ? pf : pj)[`${prefixo}_cep`];
    const dados = await consultarCep(cep);
    if (dados) {
      aplicarDados(prefixo === 'pf' ? setPf : setPj, `${prefixo}_`, dados);
      toast.success('Endereço preenchido automaticamente');
    } else if (String(cep || '').replace(/\D/g, '').length === 8) {
      toast.error('CEP não encontrado');
    }
  };

  const completarCnpj = async () => {
    const dados = await consultarCnpj(pj.pj_cnpj);
    if (dados) {
      aplicarDados(setPj, 'pj_', dados);
      toast.success('Dados da empresa preenchidos automaticamente');
    } else if (String(pj.pj_cnpj || '').replace(/\D/g, '').length === 14) {
      toast.error('CNPJ não encontrado');
    }
  };

  const salvar = async () => {
    if (!produto) { toast.error('Selecione o produto'); return; }
    const minProduto = VALOR_MINIMO_INDICACAO[produto];
    if (minProduto && Number(valor || 0) < minProduto) { toast.error(`Valor mínimo para ${produto}: R$ ${minProduto.toLocaleString('pt-BR')}`); return; }
    if (tipo === 'PF' && !pf.pf_nome?.trim()) { toast.error('Informe o nome do titular'); return; }
    if (tipo === 'PF' && !(pf.pf_whatsapp || pf.pf_telefone)?.trim()) { toast.error('Informe o WhatsApp/telefone do titular — é obrigatório para direcionar o lead à Central'); return; }
    if (tipo === 'PJ' && !pj.pj_razao_social?.trim()) { toast.error('Informe a razão social'); return; }
    if (tipo === 'PJ' && !(pj.pj_whatsapp || pj.pj_telefone)?.trim()) { toast.error('Informe o WhatsApp/telefone da empresa — é obrigatório para direcionar o lead à Central'); return; }

    setEnviando(true);
    try {
      const dados = {
        tipo, produto,
        valor_estimado: valor ? Number(valor) : null,
        observacoes: obs,
        ...(tipo === 'PF' ? pf : pj),
      };
      const res = await base44.functions.invoke('indicacaoParceiroPublica', { action: 'salvar', token, dados });
      const r = res?.data || res;
      if (r?.success) {
        toast.success('Indicação enviada com sucesso! Obrigado. 🙌');
        setSucesso(true);
      } else if (r?.error) {
        toast.error(r.error);
      }
    } catch (e) {
      toast.error('Erro ao enviar: ' + (e?.message || ''));
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
    return <SucessoIndicacao parceiro={parceiro} token={token} navigate={navigate} />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative" style={{ background: AURORA.bg, color: AURORA.text }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: `url("${WATERMARK_IMG}")`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.45, pointerEvents: 'none' }} />
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
              <select value={produto} onChange={e => selecionarProduto(e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">Selecione...</option>
                {PRODUTOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Valor estimado de adesão (R$)">
              <CampoMoeda asString value={valor} onChange={onChangeValor} className={inputCls} style={inputStyle} />
            </Field>
          </div>

          {produto && VALOR_MINIMO_INDICACAO[produto] && (
            <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.35)' }}>
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#d4af37' }} />
              <p className="text-xs leading-relaxed" style={{ color: AURORA.textMuted }}>
                Valor mínimo para <strong style={{ color: '#d4af37' }}>{produto}</strong>: R$ {VALOR_MINIMO_INDICACAO[produto].toLocaleString('pt-BR')},00. Você pode informar um valor maior — valores diferentes serão tratados pela equipe comercial.
              </p>
            </div>
          )}

          {/* PF */}
          {tipo === 'PF' && (
            <div className="space-y-3 pt-2" style={{ borderTop: `1px solid ${AURORA.border}` }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Dados Pessoa Física</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Nome completo" required><input value={pf.pf_nome || ''} onChange={setField(setPf)('pf_nome')} className={inputCls} style={inputStyle} /></Field>
                <Field label="CPF"><CampoMascara tipo="cpf" value={pf.pf_cpf} onChange={setField(setPf)('pf_cpf')} className={inputCls} style={inputStyle} /></Field>
                <Field label="RG"><input value={pf.pf_rg || ''} onChange={setField(setPf)('pf_rg')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Data de nascimento"><input type="date" value={pf.pf_nascimento || ''} onChange={setField(setPf)('pf_nascimento')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Nacionalidade"><input value={pf.pf_nacionalidade || ''} onChange={setField(setPf)('pf_nacionalidade')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Profissão"><input value={pf.pf_profissao || ''} onChange={setField(setPf)('pf_profissao')} className={inputCls} style={inputStyle} /></Field>
                <Field label="E-mail"><input value={pf.pf_email || ''} onChange={setField(setPf)('pf_email')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Telefone"><CampoMascara tipo="telefone" value={pf.pf_telefone} onChange={setField(setPf)('pf_telefone')} className={inputCls} style={inputStyle} /></Field>
                <Field label="WhatsApp" required><CampoMascara tipo="telefone" value={pf.pf_whatsapp} onChange={setField(setPf)('pf_whatsapp')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Renda estimada (R$)"><CampoMoeda asString value={pf.pf_renda} onChange={v => setPf(prev => ({ ...prev, pf_renda: v }))} className={inputCls} style={inputStyle} /></Field>
                <Field label="CEP"><CampoMascara tipo="cep" value={pf.pf_cep} onChange={setField(setPf)('pf_cep')} onBlur={() => completarCep('pf')} className={inputCls} style={inputStyle} /></Field>
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
                <Field label="CNPJ"><CampoMascara tipo="cnpj" value={pj.pj_cnpj} onChange={setField(setPj)('pj_cnpj')} onBlur={completarCnpj} className={inputCls} style={inputStyle} /></Field>
                <Field label="Nome do responsável"><input value={pj.pj_nome_responsavel || ''} onChange={setField(setPj)('pj_nome_responsavel')} className={inputCls} style={inputStyle} /></Field>
                <Field label="CPF do responsável"><CampoMascara tipo="cpf" value={pj.pj_cpf_responsavel} onChange={setField(setPj)('pj_cpf_responsavel')} className={inputCls} style={inputStyle} /></Field>
                <Field label="E-mail"><input value={pj.pj_email || ''} onChange={setField(setPj)('pj_email')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Telefone"><CampoMascara tipo="telefone" value={pj.pj_telefone} onChange={setField(setPj)('pj_telefone')} className={inputCls} style={inputStyle} /></Field>
                <Field label="WhatsApp" required><CampoMascara tipo="telefone" value={pj.pj_whatsapp} onChange={setField(setPj)('pj_whatsapp')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Ramo de atividade"><input value={pj.pj_ramo_atividade || ''} onChange={setField(setPj)('pj_ramo_atividade')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Faturamento estimado (R$)"><CampoMoeda asString value={pj.pj_faturamento} onChange={v => setPj(prev => ({ ...prev, pj_faturamento: v }))} className={inputCls} style={inputStyle} /></Field>
                <Field label="CEP"><CampoMascara tipo="cep" value={pj.pj_cep} onChange={setField(setPj)('pj_cep')} onBlur={() => completarCep('pj')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Endereço"><input value={pj.pj_endereco || ''} onChange={setField(setPj)('pj_endereco')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Número"><input value={pj.pj_numero || ''} onChange={setField(setPj)('pj_numero')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Complemento"><input value={pj.pj_complemento || ''} onChange={setField(setPj)('pj_complemento')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Bairro"><input value={pj.pj_bairro || ''} onChange={setField(setPj)('pj_bairro')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Cidade"><input value={pj.pj_cidade || ''} onChange={setField(setPj)('pj_cidade')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Estado (UF)"><input value={pj.pj_estado || ''} onChange={setField(setPj)('pj_estado')} className={inputCls} style={inputStyle} /></Field>
              </div>
            </div>
          )}

          {/* Resumo de Vendas */}
          <Field label="Resumo de Vendas">
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

function SucessoIndicacao({ parceiro, token, navigate }) {
  const [segundos, setSegundos] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setSegundos(s => {
        if (s <= 1) {
          clearInterval(timer);
          navigate(`/portal-indicador/${token}`);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate, token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: AURORA.bg }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: `url("${WATERMARK_IMG}")`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.4, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, rgba(13,17,23,0.55), rgba(13,17,23,0.6))', pointerEvents: 'none' }} />
      <div className="max-w-md w-full rounded-3xl overflow-hidden text-center relative" style={{ zIndex: 1, background: AURORA.surface, border: `1px solid ${AURORA.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div className="px-6 pt-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)' }}>
            <CheckCircle2 className="w-9 h-9" style={{ color: AURORA.accent }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: AURORA.text }}>Indicação enviada com sucesso!</h2>
          <p className="text-sm mb-4" style={{ color: AURORA.text }}>
            Muito obrigado, <strong style={{ color: AURORA.accent }}>{parceiro?.nome?.split(' ')[0]}</strong>! 🙌
          </p>
        </div>

        <div className="mx-6 mb-5 rounded-2xl p-4 text-left" style={{ background: 'rgba(0,212,170,0.08)', border: `1px solid ${AURORA.border}` }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold mb-0.5" style={{ color: AURORA.text }}>Lead direcionado à esteira comercial</p>
              <p className="text-xs leading-relaxed" style={{ color: AURORA.textMuted }}>
                Sua indicação foi encaminhada para a nossa esteira comercial e já está com um especialista de vendas. Acompanhe o andamento pelo seu painel.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button onClick={() => navigate(`/portal-indicador/${token}`)}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition"
            style={{ background: AURORA.accent, color: '#0d1117' }}>
            <ArrowRight className="w-4 h-4" /> Ir para meu painel
          </button>
          <p className="text-[11px] mt-3" style={{ color: AURORA.textMuted }}>
            Levando você ao seu painel em <strong style={{ color: AURORA.accent }}>{segundos}s</strong>...
          </p>
        </div>
      </div>
    </div>
  );
}