import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Globe2, User, Building2, FileCheck2, Upload, CheckCircle2, Circle, Plus, Trash2,
  Loader2, AlertTriangle, CheckCircle, ArrowRight, ShieldCheck, Users
} from 'lucide-react';
import { toast } from 'sonner';
import CampoMascara from '@/components/ui/campo-mascara';
import { FAIXAS_MOVIMENTACAO, ESTADOS_CIVIS, docsConfig } from '@/lib/offshoreForm';

const AURORA = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)', borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)',
  gold: '#fbbf24', goldDim: 'rgba(251,191,36,0.12)', danger: '#f87171',
};
const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const labelStyle = { color: AURORA.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

// Definidos fora do componente para o input não perder o foco a cada tecla.
const LI = ({ label, value, onChange, type = 'text', placeholder = '', mascara }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    {mascara ? (
      <CampoMascara tipo={mascara} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
    ) : (
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
    )}
  </div>
);
const Area = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" style={inputStyle} />
  </div>
);
const Sel = ({ label, value, onChange, options }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    <select value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none">
      <option value="">Selecione...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
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
const Check = ({ checked, onChange, children }) => (
  <button type="button" onClick={() => onChange(!checked)} className="w-full flex items-start gap-3 text-left rounded-lg p-3"
    style={{ background: AURORA.surface2, border: `1px solid ${checked ? AURORA.borderActive : AURORA.border}` }}>
    <span className="w-4 h-4 mt-0.5 rounded flex items-center justify-center flex-shrink-0"
      style={{ background: checked ? AURORA.accent : 'transparent', border: `1px solid ${checked ? AURORA.accent : AURORA.textMuted}` }}>
      {checked && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#0d1117" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
    </span>
    <span className="text-xs leading-relaxed" style={{ color: AURORA.text }}>{children}</span>
  </button>
);

const CAMPOS = [
  'contratante_nome', 'contratante_cpf', 'contratante_rg', 'contratante_nascimento', 'contratante_nacionalidade',
  'contratante_estado_civil', 'contratante_profissao', 'contratante_passaporte', 'contratante_email', 'contratante_telefone',
  'contratante_cep', 'contratante_endereco', 'contratante_bairro', 'contratante_cidade', 'contratante_estado',
  'llc_nome_opcao1', 'llc_nome_opcao2', 'llc_nome_opcao3', 'llc_atividade', 'llc_proposito',
  'llc_tipo_membros', 'llc_gestor', 'llc_gestor_nome', 'socio_pj', 'socio_pj_razao_social', 'socio_pj_cnpj',
  'perfil_movimentacao_prevista', 'perfil_paises', 'perfil_pep', 'perfil_pep_detalhe',
];
const MEMBRO_VAZIO = () => ({ nome: '', documento: '', tipo: 'PF', percentual: '' });

export default function OffshorePublicaPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rnc, setRnc] = useState(null);
  const [pendencias, setPendencias] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [arquivos, setArquivos] = useState({});
  const [aba, setAba] = useState('contratante');
  const [f, setF] = useState({});
  const [membros, setMembros] = useState([MEMBRO_VAZIO(), MEMBRO_VAZIO()]);
  const [decl, setDecl] = useState({ declaracao_veracidade: false, autorizacao_lgpd: false });

  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return; }
    carregar();
  }, [token]);

  const aplicar = (r) => {
    setRnc(r);
    const base = Object.fromEntries(CAMPOS.map(k => [k, r[k] ?? '']));
    if (!base.contratante_nome) base.contratante_nome = r.cliente_nome || '';
    if (!base.contratante_nacionalidade) base.contratante_nacionalidade = 'Brasileira';
    setF(base);
    setMembros(r.llc_membros?.length > 0 ? r.llc_membros.map(m => ({ ...MEMBRO_VAZIO(), ...m, percentual: m.percentual ?? '' })) : [MEMBRO_VAZIO(), MEMBRO_VAZIO()]);
    setDecl({ declaracao_veracidade: !!r.declaracao_veracidade, autorizacao_lgpd: !!r.autorizacao_lgpd });
    if (r.status === 'concluido') setEnviado(true);
  };

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('offshorePublica', { action: 'buscar', token });
      const data = res?.data;
      if (!data || data.error) { setError(data?.error || 'Link inválido ou expirado.'); setLoading(false); return; }
      aplicar(data.rnc);
      setPendencias(data.pendencias || []);
    } catch (e) { setError('Não foi possível carregar o formulário.'); }
    setLoading(false);
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleDocUpload = async (tipo, file) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande (máx. 10MB).'); return; }
    try {
      const base64 = await fileToBase64(file);
      setArquivos(a => ({ ...a, [tipo]: { base64, nome: file.name, mime: file.type } }));
      toast.success('Arquivo anexado. Clique em Enviar para finalizar.');
    } catch { toast.error('Erro ao ler arquivo.'); }
  };

  const handleSubmit = async () => {
    setSalvando(true); setSalvo(false);
    try {
      const dados = {
        ...f,
        llc_membros: f.llc_tipo_membros === 'multi'
          ? membros.filter(m => m.nome).map(m => ({ ...m, percentual: m.percentual !== '' && m.percentual != null ? Number(m.percentual) : null }))
          : [],
        ...decl,
      };
      const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Tempo esgotado no envio. Verifique sua internet e tente novamente.')), ms))]);
      const res = await withTimeout(base44.functions.invoke('offshorePublica', { action: 'salvar', token, dados, uploads: [] }), 45000);
      let data = res?.data;
      if (data?.error) { toast.error(data.error); setSalvando(false); return; }
      const falhos = [];
      const uploads = Object.entries(arquivos).map(([tipo, v]) => ({ tipo, ...v }));
      for (const up of uploads) {
        const r = await withTimeout(base44.functions.invoke('offshorePublica', { action: 'salvar', token, dados: {}, uploads: [up] }), 90000);
        if (r?.data?.uploads_falhos?.length) falhos.push(...r.data.uploads_falhos);
        if (r?.data?.rnc) data = r.data;
      }
      aplicar(data.rnc);
      setPendencias(data.pendencias || []);
      setArquivos({});
      setSalvo(true);
      if (falhos.length > 0) toast.error('Falha no envio de: ' + falhos.join(', ') + '. Tente reenviar na aba Documentos.');
      else if ((data.pendencias || []).length === 0) toast.success('Formulário concluído! Tudo certo.');
      else toast.success('Dados salvos! Confira os itens pendentes acima.');
    } catch (e) { toast.error('Erro ao enviar: ' + e.message); }
    setSalvando(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: AURORA.bg }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: AURORA.accent }} /></div>;
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

  const nomeSaudacao = (rnc?.cliente_nome || f.contratante_nome || '').trim();
  const isMulti = f.llc_tipo_membros === 'multi';
  const somaPct = membros.reduce((s, m) => s + (Number(m.percentual) || 0), 0);
  // Checklist acompanha as respostas atuais (antes mesmo de salvar)
  const docsAtuais = docsConfig(f).map(d => {
    const salvoDoc = (rnc.documentos || []).find(x => x.tipo === d.tipo);
    return { ...d, recebido: !!salvoDoc?.recebido, nome_arquivo: salvoDoc?.nome_arquivo || '' };
  });
  const concluido = (salvo || enviado) && pendencias.length === 0;

  const TABS = [
    { id: 'contratante', label: '1 — Contratante' },
    { id: 'llc', label: '2 — Dados da LLC' },
    { id: 'perfil', label: '3 — Perfil' },
    { id: 'docs', label: '4 — Documentos' },
    { id: 'decl', label: '5 — Declarações' },
  ];
  const card = { background: AURORA.surface, border: `1px solid ${AURORA.border}` };

  return (
    <div className="min-h-screen py-6 px-4" style={{ background: AURORA.bg }}>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #161b22 0%, #1c2333 60%, #16213e 100%)', border: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: AURORA.accentDim }}>
              <Globe2 className="w-6 h-6" style={{ color: AURORA.accent }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: AURORA.accent }}>Villela Exchange · Estrutura Internacional</p>
              <h1 className="text-xl font-bold" style={{ color: AURORA.text }}>Constituição da sua LLC</h1>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>Dados e documentos para o registro da empresa</p>
            </div>
          </div>
          <p className="text-xs mt-4 leading-relaxed" style={{ color: AURORA.textMuted }}>
            {nomeSaudacao && !/^\s*ol[aá]\b/i.test(rnc.mensagem_cliente || '') ? <>Olá, <strong style={{ color: AURORA.text }}>{nomeSaudacao}</strong>. </> : null}
            {rnc.mensagem_cliente}
            {rnc.responsavel_nome ? <><br /><span style={{ color: AURORA.accent }}>{rnc.responsavel_nome} · Villela Exchange</span></> : null}
          </p>
        </div>

        {pendencias.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: AURORA.goldDim, border: '1px solid rgba(251,191,36,0.25)' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" style={{ color: AURORA.gold }} />
              <span className="text-sm font-bold" style={{ color: AURORA.gold }}>{pendencias.length} item(ns) pendente(s)</span>
            </div>
            <ul className="space-y-1">
              {pendencias.map((p, i) => <li key={i} className="text-xs flex items-center gap-2" style={{ color: 'rgba(251,191,36,0.85)' }}><Circle className="w-2 h-2" /> {p}</li>)}
            </ul>
          </div>
        )}
        {concluido && (
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle className="w-5 h-5" style={{ color: '#34d399' }} />
            <p className="text-sm font-semibold" style={{ color: '#34d399' }}>Formulário concluído! Todos os dados e documentos foram recebidos.</p>
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setAba(t.id)} className="px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition"
              style={aba === t.id ? { background: AURORA.accent, color: '#0d1117' } : { background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }}>
              {t.label}
            </button>
          ))}
        </div>

        {aba === 'contratante' && (
          <div className="rounded-2xl p-5 space-y-4" style={card}>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}><User className="w-4 h-4" /> Dados do Contratante</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><LI label="Nome completo *" value={f.contratante_nome} onChange={set('contratante_nome')} /></div>
              <LI label="CPF *" mascara="cpf" value={f.contratante_cpf} onChange={set('contratante_cpf')} />
              <LI label="RG / CNH" value={f.contratante_rg} onChange={set('contratante_rg')} />
              <LI label="Data de nascimento *" type="date" value={f.contratante_nascimento} onChange={set('contratante_nascimento')} />
              <LI label="Nacionalidade *" value={f.contratante_nacionalidade} onChange={set('contratante_nacionalidade')} />
              <Sel label="Estado civil" value={f.contratante_estado_civil} onChange={set('contratante_estado_civil')} options={ESTADOS_CIVIS} />
              <LI label="Profissão" value={f.contratante_profissao} onChange={set('contratante_profissao')} />
              <LI label="Nº do passaporte" value={f.contratante_passaporte} onChange={set('contratante_passaporte')} />
              <LI label="E-mail *" type="email" value={f.contratante_email} onChange={set('contratante_email')} />
              <LI label="Telefone *" mascara="telefone" value={f.contratante_telefone} onChange={set('contratante_telefone')} />
              <LI label="CEP" mascara="cep" value={f.contratante_cep} onChange={set('contratante_cep')} />
              <div className="col-span-2"><LI label="Endereço (rua, nº, complemento) *" value={f.contratante_endereco} onChange={set('contratante_endereco')} /></div>
              <LI label="Bairro" value={f.contratante_bairro} onChange={set('contratante_bairro')} />
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2"><LI label="Cidade *" value={f.contratante_cidade} onChange={set('contratante_cidade')} /></div>
                <LI label="UF" value={f.contratante_estado} onChange={set('contratante_estado')} />
              </div>
            </div>
          </div>
        )}

        {aba === 'llc' && (
          <div className="rounded-2xl p-5 space-y-4" style={card}>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}><Building2 className="w-4 h-4" /> Dados da LLC</h2>
            <p className="text-xs" style={{ color: AURORA.textMuted }}>Indique as opções de nome em ordem de preferência. Se a primeira não estiver disponível no registro, usamos a seguinte.</p>
            <LI label="Nome — 1ª opção *" value={f.llc_nome_opcao1} onChange={set('llc_nome_opcao1')} placeholder="Ex.: Alfa Holdings LLC" />
            <LI label="Nome — 2ª opção *" value={f.llc_nome_opcao2} onChange={set('llc_nome_opcao2')} />
            <LI label="Nome — 3ª opção" value={f.llc_nome_opcao3} onChange={set('llc_nome_opcao3')} />
            <Area label="Atividade da empresa *" value={f.llc_atividade} onChange={set('llc_atividade')} placeholder="O que a empresa vai fazer (consultoria, participações, comércio exterior...)" />
            <Area label="Propósito da estrutura *" value={f.llc_proposito} onChange={set('llc_proposito')} placeholder="Proteção patrimonial, recebimentos do exterior, investimentos..." />

            <div className="h-px" style={{ background: AURORA.border }} />
            <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: AURORA.accent }}><Users className="w-3.5 h-3.5" /> Sócios</p>
            <RadioBtns label="A LLC terá *" value={f.llc_tipo_membros} onChange={set('llc_tipo_membros')}
              opts={[{ value: 'single', label: 'Um único sócio (eu)' }, { value: 'multi', label: 'Vários sócios' }]} />
            {f.llc_tipo_membros === 'single' && <p className="text-xs" style={{ color: AURORA.textMuted }}>Você será o único sócio, com 100% de participação.</p>}
            {isMulti && (
              <div className="space-y-2">
                {membros.map((m, i) => {
                  const up = (k, v) => setMembros(ms => ms.map((x, j) => j === i ? { ...x, [k]: v } : x));
                  return (
                    <div key={i} className="rounded-lg p-3 space-y-2" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: AURORA.accent }}>Sócio {i + 1}</span>
                        {membros.length > 2 && <button onClick={() => setMembros(ms => ms.filter((_, j) => j !== i))} style={{ color: AURORA.danger }}><Trash2 className="w-4 h-4" /></button>}
                      </div>
                      <input value={m.nome} onChange={e => up('nome', e.target.value)} placeholder="Nome completo / razão social" style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
                      <div className="grid grid-cols-3 gap-2">
                        <select value={m.tipo || 'PF'} onChange={e => up('tipo', e.target.value)} style={inputStyle} className="px-2 py-2 text-sm rounded-lg focus:outline-none">
                          <option value="PF">Pessoa física</option><option value="PJ">Empresa</option>
                        </select>
                        <input value={m.documento} onChange={e => up('documento', e.target.value)} placeholder="CPF / CNPJ / Passaporte" style={inputStyle} className="px-3 py-2 text-sm rounded-lg focus:outline-none" />
                        <input value={m.percentual} inputMode="decimal" onChange={e => up('percentual', e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))} placeholder="% participação" style={inputStyle} className="px-3 py-2 text-sm rounded-lg focus:outline-none" />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between">
                  <button onClick={() => setMembros(ms => [...ms, MEMBRO_VAZIO()])} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                    <Plus className="w-3 h-3" /> Adicionar sócio
                  </button>
                  <span className="text-xs font-bold" style={{ color: Math.abs(somaPct - 100) < 0.01 ? '#34d399' : AURORA.gold }}>Total: {somaPct}% {Math.abs(somaPct - 100) < 0.01 ? '' : '(deve somar 100%)'}</span>
                </div>
              </div>
            )}
            <RadioBtns label="Alguma empresa será sócia da LLC? *" value={f.socio_pj} onChange={set('socio_pj')} opts={[{ value: 'nao', label: 'Não' }, { value: 'sim', label: 'Sim' }]} />
            {f.socio_pj === 'sim' && (
              <div className="grid grid-cols-2 gap-3">
                <LI label="Razão social *" value={f.socio_pj_razao_social} onChange={set('socio_pj_razao_social')} />
                <LI label="CNPJ *" mascara="cnpj" value={f.socio_pj_cnpj} onChange={set('socio_pj_cnpj')} />
              </div>
            )}

            <div className="h-px" style={{ background: AURORA.border }} />
            <RadioBtns label="Quem será o gestor (manager) da LLC? *" value={f.llc_gestor} onChange={set('llc_gestor')}
              opts={[{ value: 'contratante', label: 'Eu mesmo' }, { value: 'outro', label: 'Outra pessoa' }]} />
            {f.llc_gestor === 'outro' && <LI label="Nome do gestor *" value={f.llc_gestor_nome} onChange={set('llc_gestor_nome')} />}
          </div>
        )}

        {aba === 'perfil' && (
          <div className="rounded-2xl p-5 space-y-4" style={card}>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}><Globe2 className="w-4 h-4" /> Perfil da Operação</h2>
            <Sel label="Movimentação anual prevista *" value={f.perfil_movimentacao_prevista} onChange={set('perfil_movimentacao_prevista')} options={FAIXAS_MOVIMENTACAO} />
            <LI label="Países com que a empresa vai operar *" value={f.perfil_paises} onChange={set('perfil_paises')} placeholder="Ex.: EUA, Brasil, Portugal" />
            <RadioBtns label="Você é pessoa politicamente exposta (PEP)? *" value={f.perfil_pep} onChange={set('perfil_pep')} opts={[{ value: 'nao', label: 'Não' }, { value: 'sim', label: 'Sim' }]} />
            <p className="text-[11px]" style={{ color: AURORA.textMuted }}>PEP: quem exerce ou exerceu, nos últimos 5 anos, cargo público relevante — ou é familiar/estreito colaborador de quem exerce.</p>
            {f.perfil_pep === 'sim' && <LI label="Cargo / vínculo" value={f.perfil_pep_detalhe} onChange={set('perfil_pep_detalhe')} />}
          </div>
        )}

        {aba === 'docs' && (
          <div className="rounded-2xl p-5 space-y-3" style={card}>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}><FileCheck2 className="w-4 h-4" /> Documentos</h2>
            <p className="text-[11px]" style={{ color: AURORA.textMuted }}>Envie arquivos em PDF ou foto legível (máx. 10MB cada).</p>
            {docsAtuais.map(doc => {
              const novo = arquivos[doc.tipo];
              const ok = doc.recebido || !!novo;
              return (
                <div key={doc.tipo} className="rounded-lg p-3 flex items-center gap-3" style={{ background: AURORA.surface2, border: `1px solid ${ok ? 'rgba(0,212,170,0.3)' : AURORA.border}` }}>
                  {ok ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: AURORA.accent }} /> : <Circle className="w-5 h-5 flex-shrink-0" style={{ color: doc.obrigatorio ? AURORA.danger : AURORA.textMuted }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: AURORA.text }}>{doc.descricao}</p>
                    {doc.obrigatorio && !ok && <p className="text-[10px]" style={{ color: AURORA.danger }}>Obrigatório</p>}
                    {!doc.obrigatorio && !ok && <p className="text-[10px]" style={{ color: AURORA.textMuted }}>Opcional</p>}
                    {doc.recebido && !novo && doc.nome_arquivo && <p className="text-[10px] truncate" style={{ color: AURORA.accent }}>{doc.nome_arquivo}</p>}
                    {novo && <p className="text-[10px] truncate" style={{ color: AURORA.accent }}>{novo.nome} (pronto para envio)</p>}
                  </div>
                  {novo ? (
                    <button onClick={() => setArquivos(a => { const c = { ...a }; delete c[doc.tipo]; return c; })} className="p-1.5 rounded-lg" style={{ color: AURORA.danger, background: 'rgba(248,113,113,0.1)' }}><Trash2 className="w-3.5 h-3.5" /></button>
                  ) : (
                    <label className="cursor-pointer p-1.5 rounded-lg flex items-center" style={{ background: AURORA.accentDim, color: AURORA.accent }} title={doc.recebido ? 'Substituir arquivo' : 'Anexar'}>
                      <Upload className="w-3.5 h-3.5" />
                      <input type="file" className="hidden" onChange={e => e.target.files[0] && handleDocUpload(doc.tipo, e.target.files[0])} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {aba === 'decl' && (
          <div className="rounded-2xl p-5 space-y-3" style={card}>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}><ShieldCheck className="w-4 h-4" /> Declarações</h2>
            <Check checked={decl.declaracao_veracidade} onChange={v => setDecl(d => ({ ...d, declaracao_veracidade: v }))}>
              Declaro que as informações e os documentos fornecidos são verdadeiros e estou ciente de que serão utilizados para a constituição e o registro da LLC.
            </Check>
            <Check checked={decl.autorizacao_lgpd} onChange={v => setDecl(d => ({ ...d, autorizacao_lgpd: v }))}>
              Autorizo a Villela Exchange a tratar meus dados pessoais para a constituição da empresa e o cumprimento de obrigações legais e regulatórias, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018).
            </Check>
          </div>
        )}

        <div className="sticky bottom-4 rounded-2xl p-4 flex items-center justify-between gap-3"
          style={{ background: AURORA.surface, border: `1px solid ${AURORA.borderActive}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <p className="text-xs" style={{ color: AURORA.textMuted }}>
            {concluido ? 'Formulário enviado com sucesso.' : 'Seu progresso fica salvo a cada envio.'}
          </p>
          {concluido && !salvando && Object.keys(arquivos).length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent, border: `1px solid ${AURORA.borderActive}` }}>
              <CheckCircle2 className="w-4 h-4" /> ENVIADO
            </div>
          ) : (
            <button onClick={handleSubmit} disabled={salvando} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50" style={{ background: AURORA.accent, color: '#0d1117' }}>
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {salvando ? 'Enviando...' : 'Enviar Formulário'}
            </button>
          )}
        </div>

        <p className="text-center text-[10px] pb-4" style={{ color: AURORA.textMuted }}>
          Villela Exchange — Documento confidencial. Seus dados são protegidos e usados apenas para a constituição da sua empresa.
        </p>
      </div>
    </div>
  );
}
