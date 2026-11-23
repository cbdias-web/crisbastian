import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Landmark, Globe2, Wallet, User, Building2, Target, Briefcase, ShieldAlert, FileCheck2, Send,
  Upload, Loader2, AlertTriangle, CheckCircle2, Circle, Plus, Trash2, ArrowLeft, ArrowRight, Paperclip, Lock, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PRODUTOS_ESTUDO, OBJETIVOS_POR_PRODUTO, TIPOS_HOLDING, JURISDICOES, MOEDAS,
} from '@/lib/estudoViabilidade';

const AURORA = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)', borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)',
  gold: '#fbbf24', goldDim: 'rgba(251,191,36,0.12)', danger: '#f87171',
};
const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const labelStyle = { color: AURORA.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };
const ICONE_PRODUTO = { holding: Landmark, offshore: Globe2, conta_internacional: Wallet };

// ── Componentes de campo (fora do componente pai para não perder foco) ──
const Campo = ({ label, value, onChange, type = 'text', placeholder = '', disabled }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    <input type={type} value={value || ''} disabled={disabled} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none disabled:opacity-60" />
  </div>
);

const Texto = ({ label, value, onChange, placeholder = '', rows = 4, disabled, hint }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    {hint && <p className="text-[11px] mb-1.5" style={{ color: AURORA.textMuted }}>{hint}</p>}
    <textarea value={value || ''} disabled={disabled} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-y disabled:opacity-60" />
  </div>
);

const Opcoes = ({ label, value, onChange, opts, disabled }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    <div className="flex flex-wrap gap-2">
      {opts.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return (
          <button key={v} type="button" disabled={disabled} onClick={() => onChange(value === v ? '' : v)}
            className="px-3 py-1.5 text-xs rounded-lg font-semibold transition disabled:opacity-60"
            style={value === v ? { background: AURORA.accent, color: '#0d1117' } : { ...inputStyle }}>
            {l}
          </button>
        );
      })}
    </div>
  </div>
);

const Multipla = ({ label, value, onChange, opts, disabled }) => {
  const sel = Array.isArray(value) ? value : [];
  const toggle = (o) => onChange(sel.includes(o) ? sel.filter(x => x !== o) : [...sel, o]);
  return (
    <div>
      <label className="block mb-1.5" style={labelStyle}>{label}</label>
      <div className="grid sm:grid-cols-2 gap-2">
        {opts.map(o => {
          const on = sel.includes(o);
          return (
            <button key={o} type="button" disabled={disabled} onClick={() => toggle(o)}
              className="flex items-start gap-2 text-left px-3 py-2 rounded-lg text-xs transition disabled:opacity-60"
              style={{ background: on ? AURORA.accentDim : AURORA.surface2, border: `1px solid ${on ? AURORA.borderActive : AURORA.border}`, color: AURORA.text }}>
              {on ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: AURORA.accent }} /> : <Circle className="w-4 h-4 flex-shrink-0" style={{ color: AURORA.textMuted }} />}
              <span>{o}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Lista = ({ label, items, onChange, fields, addLabel, disabled }) => {
  const lista = Array.isArray(items) && items.length > 0 ? items : [];
  const novo = () => Object.fromEntries(fields.map(f => [f.k, '']));
  return (
    <div>
      <label className="block mb-1.5" style={labelStyle}>{label}</label>
      <div className="space-y-2">
        {lista.map((it, i) => (
          <div key={i} className="rounded-lg p-3 relative" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
            <div className={`grid gap-2 ${fields.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              {fields.map(f => (
                f.opts ? (
                  <div key={f.k}>
                    <label className="block mb-1 text-[10px]" style={{ color: AURORA.textMuted }}>{f.label}</label>
                    <select value={it[f.k] || ''} disabled={disabled}
                      onChange={e => onChange(lista.map((x, j) => j === i ? { ...x, [f.k]: e.target.value } : x))}
                      style={{ ...inputStyle, background: AURORA.surface }} className="w-full px-2 py-1.5 text-xs rounded-md focus:outline-none">
                      <option value="">—</option>
                      {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ) : (
                  <div key={f.k}>
                    <label className="block mb-1 text-[10px]" style={{ color: AURORA.textMuted }}>{f.label}</label>
                    <input value={it[f.k] || ''} disabled={disabled} placeholder={f.placeholder || ''}
                      onChange={e => onChange(lista.map((x, j) => j === i ? { ...x, [f.k]: e.target.value } : x))}
                      style={{ ...inputStyle, background: AURORA.surface }} className="w-full px-2 py-1.5 text-xs rounded-md focus:outline-none" />
                  </div>
                )
              ))}
            </div>
            {!disabled && (
              <button type="button" onClick={() => onChange(lista.filter((_, j) => j !== i))}
                className="absolute top-2 right-2" style={{ color: AURORA.danger }} title="Remover">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button type="button" onClick={() => onChange([...lista, novo()])}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
            <Plus className="w-3 h-3" /> {addLabel}
          </button>
        )}
      </div>
    </div>
  );
};

const Secao = ({ icon: Icon, titulo, descricao, children }) => (
  <div className="rounded-2xl p-5 space-y-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
    <div>
      <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}>
        <Icon className="w-4 h-4" /> {titulo}
      </h2>
      {descricao && <p className="text-xs mt-1" style={{ color: AURORA.textMuted }}>{descricao}</p>}
    </div>
    {children}
  </div>
);

const Divisor = ({ titulo }) => (
  <div className="pt-1">
    <div className="h-px mb-3" style={{ background: AURORA.border }} />
    <p className="text-xs font-bold" style={{ color: AURORA.accent }}>{titulo}</p>
  </div>
);

const SIM_NAO = [{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }];
const SIM_NAO_AVALIAR = [{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }, { value: 'avaliar', label: 'Quero avaliar' }];
const SIM_NAO_NAOSEI = [{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }, { value: 'nao_sei', label: 'Não sei' }];
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const withTimeout = (p, ms) => Promise.race([
  p, new Promise((_, rej) => setTimeout(() => rej(new Error('Tempo esgotado. Verifique sua conexão e tente novamente.')), ms)),
]);

export default function EstudoViabilidadePublicaPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [estudo, setEstudo] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [pendencias, setPendencias] = useState([]);
  const [r, setR] = useState({});
  const [aceite, setAceite] = useState(false);
  const [preenchidoPor, setPreenchidoPor] = useState('');
  const [passo, setPasso] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [arrastandoTipo, setArrastandoTipo] = useState(null);
  const [arrastandoAuto, setArrastandoAuto] = useState(false);
  const [enviandoAuto, setEnviandoAuto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const topoRef = useRef(null);

  const set = (k, v) => setR(prev => ({ ...prev, [k]: v }));

  const aplicar = (data) => {
    setEstudo(data.estudo);
    setChecklist(data.checklist || []);
    setPendencias(data.pendencias || []);
    if (data.estudo?.bloqueado) setEnviado(true);
  };

  useEffect(() => {
    (async () => {
      if (!token) { setErro('Link inválido.'); setLoading(false); return; }
      try {
        const res = await base44.functions.invoke('estudoViabilidadePublico', { action: 'buscar', token });
        const data = res?.data;
        if (!data || data.error) throw new Error(data?.error || 'Link inválido ou expirado.');
        aplicar(data);
        setR(data.estudo.respostas || {});
        setAceite(!!data.estudo.aceite_lgpd);
        setPreenchidoPor(data.estudo.preenchido_por_nome || '');
      } catch (e) {
        setErro(e?.response?.data?.error || e.message || 'Não foi possível carregar o formulário.');
      }
      setLoading(false);
    })();
  }, [token]);

  const salvar = async (silencioso = false) => {
    if (estudo?.bloqueado) return true;
    setSalvando(true);
    try {
      const res = await withTimeout(base44.functions.invoke('estudoViabilidadePublico', {
        action: 'salvar', token, respostas: r, aceite_lgpd: aceite, preenchido_por_nome: preenchidoPor,
      }), 45000);
      if (res?.data?.error) throw new Error(res.data.error);
      aplicar(res.data);
      if (!silencioso) toast.success('Progresso salvo. Você pode continuar depois pelo mesmo link.');
      setSalvando(false);
      return true;
    } catch (e) {
      toast.error('Não foi possível salvar: ' + (e?.response?.data?.error || e.message));
      setSalvando(false);
      return false;
    }
  };

  const irPara = async (n) => {
    await salvar(true);
    setPasso(n);
    topoRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const upload = async (tipo, files) => {
    const lista = Array.from(files || []);
    if (lista.length === 0) return;
    setUploading(tipo);
    for (const file of lista) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: arquivo acima de 10MB.`); continue; }
      try {
        const base64 = await fileToBase64(file);
        const res = await withTimeout(base44.functions.invoke('estudoViabilidadePublico', {
          action: 'upload', token, tipo, base64, nome: file.name, mime: file.type,
        }), 90000);
        if (res?.data?.error) throw new Error(res.data.error);
        aplicar(res.data);
        toast.success(`${file.name} anexado.`);
      } catch (e) {
        toast.error(`Falha ao anexar ${file.name}: ` + (e?.response?.data?.error || e.message));
      }
    }
    setUploading(null);
  };

  // Soltar vários arquivos na área de upload: a IA identifica o item de cada um.
  const uploadAuto = async (files) => {
    const lista = Array.from(files || []);
    if (lista.length === 0 || enviandoAuto) return;
    setEnviandoAuto(true);
    for (const file of lista) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: arquivo acima de 10MB.`); continue; }
      try {
        const base64 = await fileToBase64(file);
        const res = await withTimeout(base44.functions.invoke('estudoViabilidadePublico', {
          action: 'upload_auto', token, base64, nome: file.name, mime: file.type,
        }), 120000);
        if (res?.data?.error) throw new Error(res.data.error);
        aplicar(res.data);
        toast.success(`${file.name} → ${res.data.descricao_identificada || 'Outros documentos'}`);
      } catch (e) {
        toast.error(`Falha ao anexar ${file.name}: ` + (e?.response?.data?.error || e.message));
      }
    }
    setEnviandoAuto(false);
  };

  const remover = async (url) => {
    try {
      const res = await base44.functions.invoke('estudoViabilidadePublico', { action: 'remover_documento', token, url });
      if (res?.data?.error) throw new Error(res.data.error);
      aplicar(res.data);
    } catch (e) { toast.error('Não foi possível remover: ' + e.message); }
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      const res = await withTimeout(base44.functions.invoke('estudoViabilidadePublico', {
        action: 'enviar', token, respostas: r, aceite_lgpd: aceite, preenchido_por_nome: preenchidoPor,
      }), 45000);
      if (res?.data?.error) throw new Error(res.data.error);
      aplicar(res.data);
      if (res.data.enviado) {
        setEnviado(true);
        toast.success('Formulário enviado com sucesso!');
        topoRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        toast.error('Ainda há itens pendentes. Confira a lista abaixo.');
      }
    } catch (e) {
      toast.error('Erro ao enviar: ' + (e?.response?.data?.error || e.message));
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
        <div className="max-w-md text-center rounded-2xl p-8" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: AURORA.danger }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: AURORA.text }}>Não foi possível abrir o formulário</h1>
          <p className="text-sm" style={{ color: AURORA.textMuted }}>{erro}</p>
          <p className="text-xs mt-4" style={{ color: AURORA.textMuted }}>Entre em contato com seu consultor Villela Exchange.</p>
        </div>
      </div>
    );
  }

  const produto = PRODUTOS_ESTUDO[estudo.produto] || PRODUTOS_ESTUDO.holding;
  const IconeProduto = ICONE_PRODUTO[estudo.produto] || Landmark;
  const isPJ = estudo.tipo_cliente === 'PJ';
  const docs = estudo.documentos || [];

  const PASSOS = [
    { id: 'ident', label: 'Identificação', icon: isPJ ? Building2 : User },
    { id: 'proposito', label: 'Propósito e expectativas', icon: Target },
    { id: 'produto', label: estudo.produto === 'holding' ? 'Patrimônio' : estudo.produto === 'offshore' ? 'Estrutura internacional' : 'Conta e fluxo', icon: Briefcase },
    { id: 'fiscal', label: 'Situação fiscal e riscos', icon: ShieldAlert },
    { id: 'docs', label: 'Documentos', icon: FileCheck2 },
    { id: 'envio', label: 'Revisão e envio', icon: Send },
  ];

  return (
    <div className="min-h-screen py-6 px-4" style={{ background: AURORA.bg }} ref={topoRef}>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Cabeçalho */}
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #161b22 0%, #1c2333 60%, #16213e 100%)', border: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: AURORA.accentDim }}>
              <IconeProduto className="w-6 h-6" style={{ color: AURORA.accent }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: AURORA.accent }}>Villela Exchange · RNC</p>
              <h1 className="text-xl font-bold leading-tight" style={{ color: AURORA.text }}>{produto.titulo}</h1>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>{produto.subtitulo} · {isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'}</p>
            </div>
          </div>
          {!enviado && (
            <p className="text-xs mt-4 leading-relaxed" style={{ color: AURORA.textMuted }}>
              {estudo.cliente_nome ? <>Olá, <strong style={{ color: AURORA.text }}>{estudo.cliente_nome}</strong>. </> : null}
              As informações e documentos deste formulário são a base do estudo técnico que nossa equipe fará para desenhar a estrutura ideal para você.
              Quanto mais detalhes, mais preciso o estudo. Seu progresso fica salvo e você pode voltar pelo mesmo link.
            </p>
          )}
        </div>

        {enviado ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: AURORA.surface, border: '1px solid rgba(16,185,129,0.35)' }}>
            <CheckCircle2 className="w-14 h-14 mx-auto mb-3" style={{ color: '#34d399' }} />
            <h2 className="text-lg font-bold mb-1" style={{ color: AURORA.text }}>Formulário recebido!</h2>
            <p className="text-sm" style={{ color: AURORA.textMuted }}>
              Obrigado. Suas informações seguem agora para a análise técnica da Villela Exchange.
              {estudo.responsavel_nome ? ` Seu consultor, ${estudo.responsavel_nome},` : ' Seu consultor'} entrará em contato com os próximos passos.
            </p>
            <p className="text-xs mt-4 flex items-center justify-center gap-1.5" style={{ color: AURORA.textMuted }}>
              <Lock className="w-3 h-3" /> O formulário está bloqueado para edição. Para alterações, fale com seu consultor.
            </p>
          </div>
        ) : (
          <>
            {/* Stepper */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {PASSOS.map((p, i) => {
                const Icon = p.icon;
                const ativo = passo === i;
                return (
                  <button key={p.id} onClick={() => irPara(i)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition"
                    style={ativo ? { background: AURORA.accent, color: '#0d1117' } : { background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }}>
                    <Icon className="w-3.5 h-3.5" /> {i + 1}. {p.label}
                  </button>
                );
              })}
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: AURORA.surface2 }}>
              <div className="h-full transition-all" style={{ width: `${((passo + 1) / PASSOS.length) * 100}%`, background: AURORA.accent }} />
            </div>

            {/* 1 — Identificação */}
            {passo === 0 && (
              <Secao icon={isPJ ? Building2 : User} titulo={isPJ ? 'Identificação da empresa' : 'Identificação'} descricao="Dados de quem será o titular/beneficiário da estrutura.">
                {isPJ ? (
                  <>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Campo label="Razão social *" value={r.razao_social} onChange={v => set('razao_social', v)} />
                      <Campo label="CNPJ *" value={r.cnpj} onChange={v => set('cnpj', v)} />
                      <Campo label="Atividade principal / CNAE" value={r.atividade} onChange={v => set('atividade', v)} />
                      <Campo label="Data de constituição" type="date" value={r.data_constituicao} onChange={v => set('data_constituicao', v)} />
                    </div>
                    <Opcoes label="Regime tributário" value={r.regime_tributario} onChange={v => set('regime_tributario', v)}
                      opts={['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'Não sei']} />
                    <Opcoes label="Faturamento anual" value={r.faturamento_anual} onChange={v => set('faturamento_anual', v)}
                      opts={['Até R$ 4,8 mi', 'R$ 4,8 mi a 20 mi', 'R$ 20 mi a 78 mi', 'R$ 78 mi a 300 mi', 'Acima de R$ 300 mi']} />
                    <Opcoes label="Nº de funcionários" value={r.num_funcionarios} onChange={v => set('num_funcionarios', v)}
                      opts={['1-10', '11-50', '51-200', '201-500', '+500']} />
                    <Divisor titulo="Responsável legal" />
                    <div className="grid sm:grid-cols-3 gap-3">
                      <Campo label="Nome *" value={r.resp_nome} onChange={v => set('resp_nome', v)} />
                      <Campo label="CPF" value={r.resp_cpf} onChange={v => set('resp_cpf', v)} />
                      <Campo label="Cargo" value={r.resp_cargo} onChange={v => set('resp_cargo', v)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Campo label="Nome completo *" value={r.nome} onChange={v => set('nome', v)} />
                      <Campo label="CPF *" value={r.cpf} onChange={v => set('cpf', v)} />
                      <Campo label="Data de nascimento" type="date" value={r.data_nascimento} onChange={v => set('data_nascimento', v)} />
                      <Campo label="Profissão / ocupação" value={r.profissao} onChange={v => set('profissao', v)} />
                      <Campo label="Nacionalidade" value={r.nacionalidade} onChange={v => set('nacionalidade', v)} placeholder="Brasileira" />
                    </div>
                    <Opcoes label="Estado civil" value={r.estado_civil} onChange={v => set('estado_civil', v)}
                      opts={['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)']} />
                    {['Casado(a)', 'União estável'].includes(r.estado_civil) && (
                      <Opcoes label="Regime de bens" value={r.regime_bens} onChange={v => set('regime_bens', v)}
                        opts={['Comunhão parcial', 'Comunhão universal', 'Separação total', 'Participação final nos aquestos', 'Não sei']} />
                    )}
                  </>
                )}
                <Divisor titulo="Contato e endereço" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Campo label="E-mail *" type="email" value={r.email} onChange={v => set('email', v)} />
                  <Campo label="Telefone / WhatsApp *" value={r.telefone} onChange={v => set('telefone', v)} />
                </div>
                <Campo label="Endereço" value={r.endereco} onChange={v => set('endereco', v)} placeholder="Rua, número, complemento, bairro" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2"><Campo label="Cidade" value={r.cidade} onChange={v => set('cidade', v)} /></div>
                  <div>
                    <label className="block mb-1" style={labelStyle}>UF</label>
                    <select value={r.uf || ''} onChange={e => set('uf', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none">
                      <option value="">—</option>
                      {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </Secao>
            )}

            {/* 2 — Propósito */}
            {passo === 1 && (
              <Secao icon={Target} titulo="Propósito e expectativas" descricao="Conte com suas palavras o que motiva a busca por esta estrutura e o que espera alcançar.">
                <Multipla label="Objetivos (selecione todos que se aplicam) *" value={r.objetivos} onChange={v => set('objetivos', v)} opts={OBJETIVOS_POR_PRODUTO[estudo.produto] || []} />
                <Campo label="Outro objetivo" value={r.objetivo_outro} onChange={v => set('objetivo_outro', v)} />
                <Texto label="Descrição do propósito *" value={r.proposito_descricao} onChange={v => set('proposito_descricao', v)} rows={5}
                  hint="Qual é o contexto? O que aconteceu ou está para acontecer que levou você a buscar esta solução?"
                  placeholder="Ex.: Tenho imóveis alugados e quero organizar a sucessão para meus filhos, reduzindo custos de inventário e impostos sobre aluguéis..." />
                <Texto label="Expectativa de resultado *" value={r.expectativa} onChange={v => set('expectativa', v)} rows={4}
                  hint="Como você enxerga o cenário ideal depois que a estrutura estiver pronta?" />
                <Opcoes label="Prazo desejado para implantação" value={r.prazo} onChange={v => set('prazo', v)}
                  opts={['Imediato', 'Até 30 dias', 'Até 90 dias', 'Até 6 meses', 'Sem urgência']} />
                <Texto label="Principal preocupação ou receio" value={r.preocupacao} onChange={v => set('preocupacao', v)} rows={3} />
                <Opcoes label="Já possui alguma estrutura (holding, offshore, conta no exterior)?" value={r.possui_estrutura} onChange={v => set('possui_estrutura', v)} opts={SIM_NAO} />
                {r.possui_estrutura === 'sim' && (
                  <Texto label="Descreva a estrutura existente" value={r.estrutura_descricao} onChange={v => set('estrutura_descricao', v)} rows={3} />
                )}
                <Divisor titulo="Assessores atuais (opcional)" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Campo label="Contador / escritório contábil" value={r.contador} onChange={v => set('contador', v)} placeholder="Nome e contato" />
                  <Campo label="Advogado / assessor jurídico" value={r.advogado} onChange={v => set('advogado', v)} placeholder="Nome e contato" />
                </div>
              </Secao>
            )}

            {/* 3 — Específico do produto */}
            {passo === 2 && estudo.produto === 'holding' && (
              <Secao icon={Briefcase} titulo="Patrimônio e estrutura da holding" descricao="Valores aproximados são suficientes nesta etapa.">
                <Multipla label="Tipo de holding de interesse *" value={r.holding_tipos} onChange={v => set('holding_tipos', v)} opts={TIPOS_HOLDING} />
                {(r.holding_tipos || []).some(t => t.startsWith('SPE')) && (
                  <Texto label="Projeto da SPE" value={r.spe_projeto} onChange={v => set('spe_projeto', v)} rows={3}
                    hint="Objeto do empreendimento, valor estimado, parceiros/investidores envolvidos e prazo." />
                )}
                <Divisor titulo="Família e sucessão" />
                {!isPJ && ['Casado(a)', 'União estável'].includes(r.estado_civil) && (
                  <Campo label="Nome do cônjuge / companheiro(a)" value={r.conjuge_nome} onChange={v => set('conjuge_nome', v)} />
                )}
                <Lista label="Herdeiros / sucessores" items={r.herdeiros} onChange={v => set('herdeiros', v)} addLabel="Adicionar herdeiro"
                  fields={[{ k: 'nome', label: 'Nome' }, { k: 'parentesco', label: 'Parentesco' }, { k: 'idade', label: 'Idade' }]} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Opcoes label="Deseja incluir herdeiros como sócios?" value={r.herdeiros_socios} onChange={v => set('herdeiros_socios', v)} opts={SIM_NAO_AVALIAR} />
                  <Opcoes label="Possui testamento ou acordo de sócios?" value={r.possui_testamento} onChange={v => set('possui_testamento', v)} opts={SIM_NAO} />
                </div>
                <Divisor titulo="Bens a integrar a holding" />
                <Lista label="Imóveis" items={r.imoveis} onChange={v => set('imoveis', v)} addLabel="Adicionar imóvel"
                  fields={[
                    { k: 'descricao', label: 'Descrição', placeholder: 'Apto, sala, terreno...' },
                    { k: 'cidade_uf', label: 'Cidade/UF' },
                    { k: 'matricula', label: 'Matrícula' },
                    { k: 'valor_estimado', label: 'Valor de mercado (R$)' },
                    { k: 'valor_ir', label: 'Valor declarado no IR (R$)' },
                    { k: 'situacao', label: 'Situação', opts: ['Quitado', 'Financiado', 'Alienado / garantia'] },
                    { k: 'gera_renda', label: 'Gera aluguel?', opts: ['Sim', 'Não'] },
                    { k: 'renda_mensal', label: 'Aluguel mensal (R$)' },
                  ]} />
                <Lista label="Veículos" items={r.veiculos} onChange={v => set('veiculos', v)} addLabel="Adicionar veículo"
                  fields={[{ k: 'descricao', label: 'Marca/modelo' }, { k: 'placa', label: 'Placa' }, { k: 'ano', label: 'Ano' }, { k: 'valor', label: 'Valor (R$)' }, { k: 'situacao', label: 'Situação', opts: ['Quitado', 'Financiado'] }]} />
                <Lista label="Participações societárias" items={r.participacoes} onChange={v => set('participacoes', v)} addLabel="Adicionar empresa"
                  fields={[{ k: 'empresa', label: 'Empresa' }, { k: 'cnpj', label: 'CNPJ' }, { k: 'percentual', label: '% participação' }]} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Campo label="Aplicações financeiras (valor aprox. R$)" value={r.aplicacoes_valor} onChange={v => set('aplicacoes_valor', v)} />
                  <Campo label="Patrimônio total estimado (R$)" value={r.patrimonio_total} onChange={v => set('patrimonio_total', v)} />
                </div>
                <Texto label="Outros bens e direitos" value={r.outros_bens} onChange={v => set('outros_bens', v)} rows={2} placeholder="Embarcações, aeronaves, marcas, recebíveis, rural..." />
              </Secao>
            )}

            {passo === 2 && estudo.produto === 'offshore' && (
              <Secao icon={Globe2} titulo="Estrutura internacional" descricao="Ajude-nos a entender o uso pretendido para escolher a jurisdição e o veículo adequados.">
                <Multipla label="Jurisdições de interesse *" value={r.jurisdicoes} onChange={v => set('jurisdicoes', v)} opts={JURISDICOES} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Campo label="Valor estimado a remeter / aportar" value={r.valor_remessa} onChange={v => set('valor_remessa', v)} placeholder="Ex.: USD 500 mil" />
                  <Campo label="Origem dos recursos" value={r.origem_recursos} onChange={v => set('origem_recursos', v)} placeholder="Lucros, venda de bens, herança..." />
                </div>
                <Opcoes label="Residência fiscal" value={r.residencia_fiscal} onChange={v => set('residencia_fiscal', v)} opts={['Brasil', 'Exterior', 'Brasil e exterior']} />
                <Opcoes label="Já possui ativos no exterior?" value={r.ativos_exterior} onChange={v => set('ativos_exterior', v)} opts={SIM_NAO} />
                {r.ativos_exterior === 'sim' && <Texto label="Descreva os ativos no exterior" value={r.ativos_exterior_desc} onChange={v => set('ativos_exterior_desc', v)} rows={3} />}
                <Opcoes label="A estrutura terá operação comercial (faturar/pagar)?" value={r.operacao_comercial} onChange={v => set('operacao_comercial', v)} opts={SIM_NAO_AVALIAR} />
                {r.operacao_comercial === 'sim' && <Texto label="Clientes, fornecedores e países envolvidos" value={r.operacao_desc} onChange={v => set('operacao_desc', v)} rows={3} />}
                <div className="grid sm:grid-cols-2 gap-3">
                  <Opcoes label="Necessita conta bancária vinculada?" value={r.conta_vinculada} onChange={v => set('conta_vinculada', v)} opts={SIM_NAO_AVALIAR} />
                  <Opcoes label="Pretende residir no exterior?" value={r.residir_exterior} onChange={v => set('residir_exterior', v)} opts={SIM_NAO_AVALIAR} />
                </div>
                <Lista label="Beneficiários finais / sócios da estrutura" items={r.beneficiarios} onChange={v => set('beneficiarios', v)} addLabel="Adicionar beneficiário"
                  fields={[{ k: 'nome', label: 'Nome' }, { k: 'documento', label: 'CPF / passaporte' }, { k: 'percentual', label: '% participação' }]} />
              </Secao>
            )}

            {passo === 2 && estudo.produto === 'conta_internacional' && (
              <Secao icon={Wallet} titulo="Conta internacional e fluxo de recursos" descricao="Informações para dimensionar a conta global, canais e escrow.">
                <Multipla label="Moedas de interesse *" value={r.moedas} onChange={v => set('moedas', v)} opts={MOEDAS} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Campo label="Depósito inicial previsto" value={r.deposito_inicial} onChange={v => set('deposito_inicial', v)} placeholder="Ex.: USD 50 mil" />
                  <Campo label="Origem dos recursos" value={r.origem_recursos} onChange={v => set('origem_recursos', v)} />
                </div>
                <Opcoes label="Volume mensal estimado de movimentação" value={r.volume_mensal} onChange={v => set('volume_mensal', v)}
                  opts={['Até USD 10 mil', 'USD 10 a 50 mil', 'USD 50 a 250 mil', 'USD 250 mil a 1 mi', 'Acima de USD 1 mi']} />
                <Campo label="Países com que se relaciona (clientes, fornecedores, investimentos)" value={r.paises} onChange={v => set('paises', v)} />
                <Opcoes label="Tem interesse em escrow account (custódia para mitigar bloqueios e penhoras)?" value={r.uso_escrow} onChange={v => set('uso_escrow', v)} opts={SIM_NAO_AVALIAR} />
                <Opcoes label="Já possui conta no exterior?" value={r.possui_conta_exterior} onChange={v => set('possui_conta_exterior', v)} opts={SIM_NAO} />
                {r.possui_conta_exterior === 'sim' && (
                  <Lista label="Contas existentes" items={r.bancos_exterior} onChange={v => set('bancos_exterior', v)} addLabel="Adicionar conta"
                    fields={[{ k: 'banco', label: 'Banco / instituição' }, { k: 'pais', label: 'País' }, { k: 'moeda', label: 'Moeda' }]} />
                )}
                <Lista label="Titulares / assinantes previstos" items={r.titulares} onChange={v => set('titulares', v)} addLabel="Adicionar titular"
                  fields={[{ k: 'nome', label: 'Nome' }, { k: 'documento', label: 'CPF / passaporte' }, { k: 'papel', label: 'Papel', opts: ['Titular', 'Assinante', 'Beneficiário'] }]} />
              </Secao>
            )}

            {/* 4 — Fiscal e riscos */}
            {passo === 3 && (
              <Secao icon={ShieldAlert} titulo="Situação fiscal e riscos" descricao="Informações tratadas com sigilo. Elas definem a viabilidade e a forma segura de estruturar.">
                <Opcoes label="Possui débitos tributários (federais, estaduais ou municipais)?" value={r.dividas_tributarias} onChange={v => set('dividas_tributarias', v)} opts={SIM_NAO_NAOSEI} />
                {r.dividas_tributarias === 'sim' && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Campo label="Valor aproximado (R$)" value={r.dividas_valor} onChange={v => set('dividas_valor', v)} />
                    <Opcoes label="Há parcelamento ativo?" value={r.parcelamento} onChange={v => set('parcelamento', v)} opts={SIM_NAO} />
                  </div>
                )}
                <Opcoes label="Possui outras dívidas relevantes (bancárias, fornecedores)?" value={r.outras_dividas} onChange={v => set('outras_dividas', v)} opts={SIM_NAO} />
                <Opcoes label="Existem processos judiciais, execuções ou penhoras em andamento?" value={r.processos} onChange={v => set('processos', v)} opts={SIM_NAO_NAOSEI} />
                <Opcoes label="Já sofreu bloqueio de contas (Sisbajud/BacenJud)?" value={r.bloqueios} onChange={v => set('bloqueios', v)} opts={SIM_NAO} />
                {(r.dividas_tributarias === 'sim' || r.outras_dividas === 'sim' || r.processos === 'sim' || r.bloqueios === 'sim') && (
                  <Texto label="Descreva a situação" value={r.riscos_descricao} onChange={v => set('riscos_descricao', v)} rows={4}
                    hint="Credores, valores, fase dos processos e o que já foi feito." />
                )}
                <Opcoes label="Declarações de IR em dia?" value={r.ir_em_dia} onChange={v => set('ir_em_dia', v)} opts={SIM_NAO_NAOSEI} />
              </Secao>
            )}

            {/* 5 — Documentos */}
            {passo === 4 && (
              <Secao icon={FileCheck2} titulo="Documentos" descricao="Arraste os arquivos para a área abaixo (ou sobre o item correspondente) e a IA identifica cada documento. PDF, imagem ou planilha, até 10MB por arquivo. Itens com * são obrigatórios; os recomendados agilizam o estudo.">
                <div
                  onDragOver={e => { e.preventDefault(); setArrastandoAuto(true); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setArrastandoAuto(false); }}
                  onDrop={e => { e.preventDefault(); setArrastandoAuto(false); uploadAuto(e.dataTransfer?.files); }}
                  onClick={() => document.getElementById('estudo-docs-auto')?.click()}
                  className="rounded-xl px-5 py-6 text-center cursor-pointer transition"
                  style={{
                    background: arrastandoAuto ? AURORA.accentDim : 'rgba(0,212,170,0.05)',
                    border: `2px dashed ${arrastandoAuto ? AURORA.accent : AURORA.borderActive}`,
                  }}>
                  <input id="estudo-docs-auto" type="file" className="hidden" multiple disabled={enviandoAuto}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.xls,.xlsx,.csv,.doc,.docx"
                    onChange={e => { uploadAuto(e.target.files); e.target.value = ''; }} />
                  {enviandoAuto
                    ? <Loader2 className="w-7 h-7 mx-auto mb-2 animate-spin" style={{ color: AURORA.accent }} />
                    : <Upload className="w-7 h-7 mx-auto mb-2" style={{ color: AURORA.accent }} />}
                  <p className="text-sm font-bold" style={{ color: AURORA.text }}>
                    {enviandoAuto ? 'Enviando e identificando os arquivos…' : 'Arraste os documentos aqui'}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: AURORA.textMuted }}>
                    Pode soltar vários de uma vez — a IA identifica o item de cada arquivo. Ou clique para escolher do computador ou celular.
                  </p>
                </div>
                <div className="space-y-2">
                  {checklist.map(d => {
                    const enviados = docs.filter(x => x.tipo === d.tipo);
                    const ok = enviados.length > 0;
                    const alvo = arrastandoTipo === d.tipo;
                    return (
                      <div key={d.tipo} className="rounded-lg p-3 transition"
                        onDragOver={e => { if (uploading) return; e.preventDefault(); setArrastandoTipo(d.tipo); }}
                        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setArrastandoTipo(null); }}
                        onDrop={e => { e.preventDefault(); setArrastandoTipo(null); if (!uploading) upload(d.tipo, e.dataTransfer?.files); }}
                        style={{
                          background: alvo ? AURORA.accentDim : AURORA.surface2,
                          border: `1px ${alvo ? 'dashed' : 'solid'} ${alvo ? AURORA.accent : (ok ? 'rgba(16,185,129,0.35)' : AURORA.border)}`,
                        }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            {ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#34d399' }} /> : <Circle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: AURORA.textMuted }} />}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold" style={{ color: AURORA.text }}>
                                {d.descricao}{d.obrigatorio && <span style={{ color: AURORA.danger }}> *</span>}
                              </p>
                              {d.recomendado && !d.obrigatorio && <span className="text-[10px] font-semibold" style={{ color: AURORA.gold }}>Recomendado</span>}
                            </div>
                          </div>
                          <label className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer flex-shrink-0"
                            style={{ background: AURORA.accentDim, color: AURORA.accent, opacity: uploading ? 0.6 : 1 }}>
                            {uploading === d.tipo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            {ok && !d.multiplo ? 'Substituir' : 'Anexar'}
                            <input type="file" className="hidden" multiple={!!d.multiplo} disabled={!!uploading}
                              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.xls,.xlsx,.csv,.doc,.docx"
                              onChange={e => { upload(d.tipo, e.target.files); e.target.value = ''; }} />
                          </label>
                        </div>
                        {enviados.length > 0 && (
                          <ul className="mt-2 space-y-1 pl-6">
                            {enviados.map(f => (
                              <li key={f.url} className="flex items-center justify-between gap-2 text-[11px]" style={{ color: AURORA.textMuted }}>
                                <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate hover:underline">
                                  <Paperclip className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{f.nome_arquivo}</span>
                                </a>
                                {f.origem === 'equipe' ? (
                                  <span className="text-[10px] flex-shrink-0" style={{ color: '#34d399' }}>enviado pela equipe</span>
                                ) : (
                                  <button onClick={() => remover(f.url)} style={{ color: AURORA.danger }} title="Remover"><Trash2 className="w-3 h-3" /></button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Secao>
            )}

            {/* 6 — Revisão e envio */}
            {passo === 5 && (
              <Secao icon={Send} titulo="Revisão e envio" descricao="Após o envio, o formulário segue para a análise técnica e fica bloqueado para edição.">
                <Texto label="Informações adicionais" value={r.informacoes_adicionais} onChange={v => set('informacoes_adicionais', v)} rows={3}
                  placeholder="Algo mais que devemos considerar no estudo?" />
                <Campo label="Nome de quem preencheu *" value={preenchidoPor} onChange={setPreenchidoPor} />
                <button type="button" onClick={() => setAceite(a => !a)} className="flex items-start gap-2 text-left text-xs p-3 rounded-lg w-full"
                  style={{ background: aceite ? AURORA.accentDim : AURORA.surface2, border: `1px solid ${aceite ? AURORA.borderActive : AURORA.border}`, color: AURORA.text }}>
                  {aceite ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: AURORA.accent }} /> : <Circle className="w-4 h-4 flex-shrink-0" style={{ color: AURORA.textMuted }} />}
                  <span>
                    Declaro que as informações prestadas são verdadeiras e autorizo a RNC (Villela Exchange) a tratar estes dados e documentos
                    exclusivamente para elaboração do estudo de viabilidade e da proposta de estruturação, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018). *
                  </span>
                </button>

                {pendencias.length > 0 ? (
                  <div className="rounded-xl p-4" style={{ background: AURORA.goldDim, border: '1px solid rgba(251,191,36,0.25)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" style={{ color: AURORA.gold }} />
                      <span className="text-sm font-bold" style={{ color: AURORA.gold }}>{pendencias.length} item(ns) pendente(s) para envio</span>
                    </div>
                    <ul className="space-y-1">
                      {pendencias.map((p, i) => (
                        <li key={i} className="text-xs flex items-center gap-2" style={{ color: 'rgba(251,191,36,0.85)' }}><Circle className="w-2 h-2" /> {p}</li>
                      ))}
                    </ul>
                    <p className="text-[11px] mt-2" style={{ color: AURORA.textMuted }}>Os itens de declaração são atualizados ao clicar em Enviar.</p>
                  </div>
                ) : (
                  <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: '#34d399' }} />
                    <p className="text-xs font-semibold" style={{ color: '#34d399' }}>Tudo pronto para envio.</p>
                  </div>
                )}

                <button onClick={enviar} disabled={enviando || !!uploading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition disabled:opacity-60"
                  style={{ background: AURORA.accent, color: '#0d1117' }}>
                  {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {enviando ? 'Enviando...' : 'Enviar para a Villela Exchange'}
                </button>
              </Secao>
            )}

            {/* Navegação */}
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => irPara(Math.max(0, passo - 1))} disabled={passo === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
                style={{ background: AURORA.surface, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
              <button onClick={() => salvar(false)} disabled={salvando}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }}>
                {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar progresso
              </button>
              {passo < PASSOS.length - 1 && (
                <button onClick={() => irPara(passo + 1)} disabled={salvando}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold"
                  style={{ background: AURORA.accent, color: '#0d1117' }}>
                  Continuar <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}

        <p className="text-center text-[10px] pb-4" style={{ color: AURORA.textMuted }}>
          Villela Exchange · RNC — Grupo Villela · Ambiente seguro. Seus dados são tratados conforme a LGPD.
        </p>
      </div>
    </div>
  );
}