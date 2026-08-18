import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Globe, User, Building2, FileCheck2, Upload, CheckCircle2, Circle, Plus, Trash2,
  Loader2, AlertTriangle, CheckCircle, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)', borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)',
  gold: '#fbbf24', goldDim: 'rgba(251,191,36,0.12)', danger: '#f87171',
};
const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const labelStyle = { color: AURORA.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

const ASSINANTE_VAZIO = () => ({
  nome: '', email: '', telefone_residencia: '', telefone_celular: '', telefone_escritorio: '',
  endereco_correspondencia: '', nome_empresa: '', atividade_empresa: '', titulo_posicao: '',
  tipo_emprego: '', salario_anual_usd: '', outra_fonte_renda: '', valor_outra_renda: '',
  explicacao_heranca: '', pais_nascimento: '', dupla_nacionalidade: '',
  pais_segunda_nacionalidade: '', numero_passaporte: '',
  mais_182_dias_eua: '', mais_122_dias_eua_3anos: '', endereco_eua: '',
});

// Componentes de formulário — definidos FORA do componente pai para não
// serem recriados a cada render (o que faz o input perder o foco a cada tecla).
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

export default function ContaInternacionalPublicaPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rnc, setRnc] = useState(null);
  const [pendencias, setPendencias] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [arquivos, setArquivos] = useState({});
  const [uploadingKey, setUploadingKey] = useState(null);
  const [abas, setAbas] = useState('s1');

  // Seção 1
  const [s1, setS1] = useState({
    secao1_tipo_conta: '', secao1_proposito: '',
    secao1_deposito_remetente: '', secao1_deposito_banco: '', secao1_deposito_valor: '',
    secao1_origem_fundos: '', secao1_assinatura_tipo: '', secao1_talao_cheques: '',
    secao1_cartao_debito: '', secao1_email: '', secao1_telefone_escritorio1: '',
    secao1_telefone_escritorio2: '', secao1_celular: '', secao1_endereco_correspondencia: '',
    secao1_pj_razao_social: '', secao1_pj_linha_negocios: '', secao1_pj_num_empregados: '',
    secao1_pj_produtos_servicos: '', secao1_pj_pais_operacao: '', secao1_pj_receita_bruta: '',
    secao1_pj_prospeccao_receita: '',
  });
  const [assinantesNomes, setAssinantesNomes] = useState(['']);
  const [bancosExistentes, setBancosExistentes] = useState([{ nome_banco: '', pais: '', tipo_conta: '' }]);
  const [clientesPJ, setClientesPJ] = useState([{ nome: '', pais: '' }]);
  const [fornecedoresPJ, setFornecedoresPJ] = useState([{ nome: '', pais: '' }]);
  const [acionistasPJ, setAcionistasPJ] = useState([{ nome: '', percentual: '' }]);

  // Seção 2
  const [assinantes, setAssinantes] = useState([ASSINANTE_VAZIO()]);

  // Seção 3
  const [s3, setS3] = useState({ secao3_nome: '', secao3_cpf: '', secao3_nascimento: '', secao3_nacionalidade: 'Brasileira', secao3_email: '', secao3_telefone: '' });
  const [beneficiarios, setBeneficiarios] = useState([{ nome_completo: '', data_nascimento: '', parentesco: '' }]);

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return; }
    carregar();
  }, [token]);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('contaInternacionalPublica', { action: 'buscar', token });
      const data = res?.data;
      if (!data || data.error) { setError(data?.error || 'Link inválido ou expirado.'); setLoading(false); return; }
      const r = data.rnc;
      setRnc(r);
      setPendencias(data.pendencias || []);
      setS1({
        secao1_tipo_conta: r.secao1_tipo_conta || '', secao1_proposito: r.secao1_proposito || '',
        secao1_deposito_remetente: r.secao1_deposito_remetente || '', secao1_deposito_banco: r.secao1_deposito_banco || '',
        secao1_deposito_valor: r.secao1_deposito_valor || '', secao1_origem_fundos: r.secao1_origem_fundos || '',
        secao1_assinatura_tipo: r.secao1_assinatura_tipo || '', secao1_talao_cheques: r.secao1_talao_cheques || '',
        secao1_cartao_debito: r.secao1_cartao_debito || '', secao1_email: r.secao1_email || '',
        secao1_telefone_escritorio1: r.secao1_telefone_escritorio1 || '', secao1_telefone_escritorio2: r.secao1_telefone_escritorio2 || '',
        secao1_celular: r.secao1_celular || '', secao1_endereco_correspondencia: r.secao1_endereco_correspondencia || '',
        secao1_pj_razao_social: r.secao1_pj_razao_social || '', secao1_pj_linha_negocios: r.secao1_pj_linha_negocios || '',
        secao1_pj_num_empregados: r.secao1_pj_num_empregados || '', secao1_pj_produtos_servicos: r.secao1_pj_produtos_servicos || '',
        secao1_pj_pais_operacao: r.secao1_pj_pais_operacao || '', secao1_pj_receita_bruta: r.secao1_pj_receita_bruta || '',
        secao1_pj_prospeccao_receita: r.secao1_pj_prospeccao_receita || '',
      });
      setAssinantesNomes(r.secao1_assinantes?.length > 0 ? r.secao1_assinantes : ['']);
      setBancosExistentes(r.secao1_bancos_existentes?.length > 0 ? r.secao1_bancos_existentes : [{ nome_banco: '', pais: '', tipo_conta: '' }]);
      setClientesPJ(r.secao1_pj_clientes?.length > 0 ? r.secao1_pj_clientes : [{ nome: '', pais: '' }]);
      setFornecedoresPJ(r.secao1_pj_fornecedores?.length > 0 ? r.secao1_pj_fornecedores : [{ nome: '', pais: '' }]);
      setAcionistasPJ(r.secao1_pj_acionistas?.length > 0 ? r.secao1_pj_acionistas.map((a) => ({ ...a, percentual: a.percentual ?? '' })) : [{ nome: '', percentual: '' }]);
      setAssinantes(r.secao2_assinantes?.length > 0 ? r.secao2_assinantes : [ASSINANTE_VAZIO()]);
      setS3({ secao3_nome: r.secao3_nome || '', secao3_cpf: r.secao3_cpf || '', secao3_nascimento: r.secao3_nascimento || '', secao3_nacionalidade: r.secao3_nacionalidade || 'Brasileira', secao3_email: r.secao3_email || '', secao3_telefone: r.secao3_telefone || '' });
      setBeneficiarios(r.secao3_beneficiarios?.length > 0 ? r.secao3_beneficiarios : [{ nome_completo: '', data_nascimento: '', parentesco: '' }]);
    } catch (e) { setError('Não foi possível carregar o formulário.'); }
    setLoading(false);
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleDocUpload = async (docTipo, file) => {
    setUploadingKey(docTipo);
    try {
      const base64 = await fileToBase64(file);
      setArquivos(a => ({ ...a, [docTipo]: { base64, nome: file.name, mime: file.type } }));
      toast.success('Arquivo anexado. Clique em Enviar para finalizar.');
    } catch (e) { toast.error('Erro ao ler arquivo.'); }
    setUploadingKey(null);
  };

  const handleSubmit = async () => {
    setSalvando(true); setSalvo(false);
    try {
      const uploads = Object.entries(arquivos).map(([tipo, v]) => ({ tipo, base64: v.base64, nome: v.nome, mime: v.mime }));
      const dados = {
        ...s1,
        secao1_assinantes: assinantesNomes.filter(Boolean),
        secao1_bancos_existentes: bancosExistentes.filter(b => b.nome_banco),
        secao1_pj_clientes: clientesPJ.filter(c => c.nome),
        secao1_pj_fornecedores: fornecedoresPJ.filter(f => f.nome),
        secao1_pj_acionistas: acionistasPJ.filter(a => a.nome).map(a => ({ ...a, percentual: a.percentual ? Number(a.percentual) : null })),
        secao2_assinantes: assinantes,
        ...s3,
        secao3_beneficiarios: beneficiarios.filter(b => b.nome_completo),
      };
      const res = await base44.functions.invoke('contaInternacionalPublica', { action: 'salvar', token, dados, uploads });
      const data = res?.data;
      if (data?.error) { toast.error(data.error); setSalvando(false); return; }
      setRnc(data.rnc);
      setPendencias(data.pendencias || []);
      setArquivos({});
      setSalvo(true);
      if ((data.pendencias || []).length === 0) {
        toast.success('Formulário concluído! Tudo certo.');
      } else {
        toast.success('Dados salvos! Confira os itens pendentes abaixo.');
      }
    } catch (e) { toast.error('Erro ao enviar: ' + e.message); }
    setSalvando(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: AURORA.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: AURORA.accent }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: AURORA.bg }}>
        <div className="max-w-md text-center rounded-2xl p-8" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: AURORA.danger }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: AURORA.text }}>Link inválido</h1>
          <p className="text-sm" style={{ color: AURORA.textMuted }}>{error}</p>
          <p className="text-xs mt-4" style={{ color: AURORA.textMuted }}>Entre em contato com seu consultor Villela Exchange.</p>
        </div>
      </div>
    );
  }

  const isPJ = rnc?.tipo_conta === 'PJ';

  const TABS = [
    { id: 's1', label: 'Seção 1 — Conta PJ' },
    { id: 's2', label: 'Seção 2 — Empresa/Sócio' },
    ...(!isPJ ? [{ id: 's3', label: 'Seção 3 — Pessoa Física' }] : []),
    { id: 'docs', label: 'Documentos' },
  ];

  return (
    <div className="min-h-screen py-6 px-4" style={{ background: AURORA.bg }}>
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #161b22 0%, #1c2333 100%)', border: `1px solid ${AURORA.border}` }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: AURORA.accentDim }}>
            <Globe className="w-6 h-6" style={{ color: AURORA.accent }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: AURORA.accent }}>Villela Exchange</p>
            <h1 className="text-xl font-bold" style={{ color: AURORA.text }}>Abertura de Conta Internacional</h1>
            <p className="text-xs" style={{ color: AURORA.textMuted }}>{isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'} — Formulário de Cadastro</p>
          </div>
        </div>

        {/* Pendências */}
        {pendencias.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: AURORA.goldDim, border: '1px solid rgba(251,191,36,0.25)' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" style={{ color: AURORA.gold }} />
              <span className="text-sm font-bold" style={{ color: AURORA.gold }}>{pendencias.length} item(ns) pendente(s)</span>
            </div>
            <ul className="space-y-1">
              {pendencias.map((p, i) => (
                <li key={i} className="text-xs flex items-center gap-2" style={{ color: 'rgba(251,191,36,0.85)' }}>
                  <Circle className="w-2 h-2" /> {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {salvo && pendencias.length === 0 && (
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle className="w-5 h-5" style={{ color: '#34d399' }} />
            <p className="text-sm font-semibold" style={{ color: '#34d399' }}>Formulário concluído! Todos os dados e documentos foram recebidos.</p>
          </div>
        )}

        {/* Abas */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setAbas(t.id)}
              className="px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition"
              style={abas === t.id
                ? { background: AURORA.accent, color: '#0d1117' }
                : { background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* SEÇÃO 1 */}
        {abas === 's1' && (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}>
              <Globe className="w-4 h-4" /> Informações da Conta
            </h2>
            {isPJ && <LI label="Nome Completo da Empresa *" value={s1.secao1_pj_razao_social} onChange={v => setS1(f => ({ ...f, secao1_pj_razao_social: v }))} />}
            <RadioBtns label="Tipo de Conta" value={s1.secao1_tipo_conta}
              onChange={v => setS1(f => ({ ...f, secao1_tipo_conta: v }))}
              opts={isPJ ? [{ value: 'Conta Corrente', label: 'Conta Corrente' }, { value: 'Poupanca', label: 'Poupança' }]
                : [{ value: 'Conta Corrente', label: 'Conta Corrente' }, { value: 'Poupanca', label: 'Poupança' }, { value: 'Money Market', label: 'Money Market' }, { value: 'CD', label: 'CD' }]}
            />
            <div>
              <label className="block mb-1" style={labelStyle}>Propósito da conta nos EUA</label>
              <textarea value={s1.secao1_proposito} onChange={e => setS1(f => ({ ...f, secao1_proposito: e.target.value }))}
                rows={3} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
                style={inputStyle} placeholder="Como a conta será usada, débitos e créditos..." />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <LI label="Remetente do Depósito" value={s1.secao1_deposito_remetente} onChange={v => setS1(f => ({ ...f, secao1_deposito_remetente: v }))} />
              <LI label="Banco Remetente" value={s1.secao1_deposito_banco} onChange={v => setS1(f => ({ ...f, secao1_deposito_banco: v }))} />
              <LI label="Valor (USD)" value={s1.secao1_deposito_valor} onChange={v => setS1(f => ({ ...f, secao1_deposito_valor: v }))} />
            </div>
            <LI label="Origem dos Fundos" value={s1.secao1_origem_fundos} onChange={v => setS1(f => ({ ...f, secao1_origem_fundos: v }))} placeholder="Poupança, salário, herança..." />
            <div className="grid grid-cols-2 gap-3">
              <LI label="E-mail *" value={s1.secao1_email} onChange={v => setS1(f => ({ ...f, secao1_email: v }))} />
              <LI label="Celular" value={s1.secao1_celular} onChange={v => setS1(f => ({ ...f, secao1_celular: v }))} />
            </div>
            <LI label="Endereço para Correspondências" value={s1.secao1_endereco_correspondencia} onChange={v => setS1(f => ({ ...f, secao1_endereco_correspondencia: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <RadioBtns label="Tipo de Assinatura" value={s1.secao1_assinatura_tipo}
                onChange={v => setS1(f => ({ ...f, secao1_assinatura_tipo: v }))}
                opts={[{ value: 'Conjunta', label: 'Conjunta' }, { value: 'Individual', label: 'Individual' }]} />
              <RadioBtns label="Cartão de Débito?" value={s1.secao1_cartao_debito}
                onChange={v => setS1(f => ({ ...f, secao1_cartao_debito: v }))}
                opts={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]} />
            </div>

            {isPJ && (
              <>
                <div className="h-px" style={{ background: AURORA.border }} />
                <p className="text-xs font-bold" style={{ color: AURORA.accent }}>Informações Empresariais</p>
                <div>
                  <label className="block mb-1" style={labelStyle}>Linha de Negócios</label>
                  <textarea value={s1.secao1_pj_linha_negocios} onChange={e => setS1(f => ({ ...f, secao1_pj_linha_negocios: e.target.value }))}
                    rows={2} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <LI label="País de Operação" value={s1.secao1_pj_pais_operacao} onChange={v => setS1(f => ({ ...f, secao1_pj_pais_operacao: v }))} />
                  <LI label="Receita Bruta Último Ano USD" value={s1.secao1_pj_receita_bruta} onChange={v => setS1(f => ({ ...f, secao1_pj_receita_bruta: v }))} />
                </div>
              </>
            )}
          </div>
        )}

        {/* SEÇÃO 2 — ASSINANTES */}
        {abas === 's2' && (
          <div className="space-y-4">
            {assinantes.map((a, i) => {
              const update = (field, val) => setAssinantes(ss => ss.map((x, j) => j === i ? { ...x, [field]: val } : x));
              return (
                <div key={i} className="rounded-2xl p-5 space-y-3" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}>
                      <User className="w-4 h-4" /> Assinante {i + 1}
                    </h2>
                    {assinantes.length > 1 && (
                      <button onClick={() => setAssinantes(ss => ss.filter((_, j) => j !== i))}
                        className="p-1.5 rounded-lg" style={{ color: AURORA.danger, background: 'rgba(248,113,113,0.1)' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><LI label="Nome Completo *" value={a.nome} onChange={v => update('nome', v)} /></div>
                    <LI label="E-mail *" value={a.email} onChange={v => update('email', v)} />
                    <LI label="Celular" value={a.telefone_celular} onChange={v => update('telefone_celular', v)} />
                    <LI label="Nome da Empresa" value={a.nome_empresa} onChange={v => update('nome_empresa', v)} />
                    <LI label="Atividade da Empresa" value={a.atividade_empresa} onChange={v => update('atividade_empresa', v)} />
                    <div className="col-span-2">
                      <LI label="Título/Posição na Empresa" value={a.titulo_posicao} onChange={v => update('titulo_posicao', v)} />
                    </div>
                    <LI label="Salário Anual (USD) *" value={a.salario_anual_usd} onChange={v => update('salario_anual_usd', v)} placeholder="Ex: 50000" />
                    <LI label="Outra Fonte de Renda" value={a.outra_fonte_renda} onChange={v => update('outra_fonte_renda', v)} />
                    <LI label="País de Nascimento *" value={a.pais_nascimento} onChange={v => update('pais_nascimento', v)} />
                    <RadioBtns label="Dupla Nacionalidade?" value={a.dupla_nacionalidade} onChange={v => update('dupla_nacionalidade', v)}
                      opts={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]} />
                    {a.dupla_nacionalidade === 'sim' && (
                      <>
                        <LI label="País da 2ª Nacionalidade" value={a.pais_segunda_nacionalidade} onChange={v => update('pais_segunda_nacionalidade', v)} />
                        <LI label="Nº Passaporte" value={a.numero_passaporte} onChange={v => update('numero_passaporte', v)} />
                      </>
                    )}
                    <RadioBtns label="+182 dias nos EUA (último ano)?" value={a.mais_182_dias_eua} onChange={v => update('mais_182_dias_eua', v)}
                      opts={[{ value: 'sim', label: 'Sim (W9)' }, { value: 'nao', label: 'Não' }]} />
                    <RadioBtns label="Média +122 dias EUA (3 anos)?" value={a.mais_122_dias_eua_3anos} onChange={v => update('mais_122_dias_eua_3anos', v)}
                      opts={[{ value: 'sim', label: 'Sim (W9)' }, { value: 'nao', label: 'Não' }]} />
                    {(a.mais_182_dias_eua === 'sim' || a.mais_122_dias_eua_3anos === 'sim') && (
                      <div className="col-span-2"><LI label="Endereço nos EUA" value={a.endereco_eua} onChange={v => update('endereco_eua', v)} /></div>
                    )}
                  </div>
                </div>
              );
            })}
            <button onClick={() => setAssinantes(ss => [...ss, ASSINANTE_VAZIO()])}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold w-full justify-center"
              style={{ background: AURORA.accentDim, color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
              <Plus className="w-4 h-4" /> Adicionar Assinante Autorizado
            </button>
          </div>
        )}

        {/* SEÇÃO 3 — TITULAR PF */}
        {abas === 's3' && !isPJ && (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}>
              <User className="w-4 h-4" /> Dados do Titular (Conta Pessoal)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><LI label="Nome Completo *" value={s3.secao3_nome} onChange={v => setS3(f => ({ ...f, secao3_nome: v }))} /></div>
              <LI label="CPF" value={s3.secao3_cpf} onChange={v => setS3(f => ({ ...f, secao3_cpf: v }))} />
              <LI label="Data de Nascimento" type="date" value={s3.secao3_nascimento} onChange={v => setS3(f => ({ ...f, secao3_nascimento: v }))} />
              <LI label="Nacionalidade" value={s3.secao3_nacionalidade} onChange={v => setS3(f => ({ ...f, secao3_nacionalidade: v }))} />
              <LI label="E-mail" value={s3.secao3_email} onChange={v => setS3(f => ({ ...f, secao3_email: v }))} />
              <div className="col-span-2"><LI label="Telefone" value={s3.secao3_telefone} onChange={v => setS3(f => ({ ...f, secao3_telefone: v }))} /></div>
            </div>
            <p className="text-xs font-bold pt-2" style={{ color: AURORA.accent }}>Beneficiários (em caso de falecimento)</p>
            {beneficiarios.map((b, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-center">
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
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
              <Plus className="w-3 h-3" /> Adicionar Beneficiário
            </button>
          </div>
        )}

        {/* DOCUMENTOS */}
        {abas === 'docs' && (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}>
              <FileCheck2 className="w-4 h-4" /> Documentação
            </h2>
            <div className="space-y-2">
              {(rnc.documentos || []).map((doc) => {
                const hasNew = !!arquivos[doc.tipo];
                const isReceived = doc.recebido || hasNew;
                return (
                  <div key={doc.tipo} className="rounded-lg p-3 flex items-center gap-3"
                    style={{ background: AURORA.surface2, border: `1px solid ${isReceived ? 'rgba(0,212,170,0.3)' : AURORA.border}` }}>
                    {isReceived ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: AURORA.accent }} /> : <Circle className="w-5 h-5 flex-shrink-0" style={{ color: doc.obrigatorio ? AURORA.danger : AURORA.textMuted }} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: AURORA.text }}>{doc.descricao}</p>
                      {doc.obrigatorio && !isReceived && <p className="text-[10px]" style={{ color: AURORA.danger }}>Obrigatório</p>}
                      {doc.recebido && doc.nome_arquivo && !hasNew && <p className="text-[10px] truncate" style={{ color: AURORA.accent }}>{doc.nome_arquivo}</p>}
                      {hasNew && <p className="text-[10px] truncate" style={{ color: AURORA.accent }}>{arquivos[doc.tipo].nome} (pronto para envio)</p>}
                    </div>
                    {hasNew ? (
                      <button onClick={() => setArquivos(a => { const c = { ...a }; delete c[doc.tipo]; return c; })}
                        className="p-1.5 rounded-lg" style={{ color: AURORA.danger, background: 'rgba(248,113,113,0.1)' }}><Trash2 className="w-3.5 h-3.5" /></button>
                    ) : (
                      <label className="cursor-pointer p-1.5 rounded-lg flex items-center" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                        {uploadingKey === doc.tipo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <input type="file" className="hidden" onChange={e => e.target.files[0] && handleDocUpload(doc.tipo, e.target.files[0])} />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="sticky bottom-4 rounded-2xl p-4 flex items-center justify-between gap-3"
          style={{ background: AURORA.surface, border: `1px solid ${AURORA.borderActive}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <p className="text-xs" style={{ color: AURORA.textMuted }}>
            {pendencias.length === 0 ? '✓ Tudo preenchido!' : `${pendencias.length} pendência(s)`}
          </p>
          <button onClick={handleSubmit} disabled={salvando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
            style={{ background: AURORA.accent, color: '#0d1117' }}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {salvando ? 'Enviando...' : 'Enviar Formulário'}
          </button>
        </div>

        <p className="text-center text-[10px] pb-4" style={{ color: AURORA.textMuted }}>
          Villela Exchange — Documento confidencial. Seus dados são protegidos e usados apenas para abertura da conta internacional.
        </p>
      </div>
    </div>
  );
}