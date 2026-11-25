import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Plus, Trash2, Loader2, FileText, Eye, ChevronDown, Search, Check, Database } from 'lucide-react';
import { consultarCnpj, consultarCep } from '@/lib/autocomplete';
import { resolverVendedorDoUsuarioLogado } from '@/lib/vendedorContrato';

// Gera o NDA (modelo validado Villela Exchange · Estruturação Internacional) como 1º passo
// da operação Offshore. Sem `estudo`, cria a operação (estudo em rascunho) e gera o NDA nela.

export const dig = (s) => String(s || '').replace(/\D/g, '');
const NATUREZAS = ['sociedade empresária limitada', 'sociedade simples limitada', 'sociedade anônima', 'sociedade limitada unipessoal', 'empresário individual', 'pessoa jurídica de direito privado'];
const ESTADO_CIVIL = ['solteiro(a)', 'casado(a)', 'divorciado(a)', 'viúvo(a)', 'em união estável'];

const parteVazia = (tipo = 'PJ') => ({ tipo, nome: '', nome_fantasia: '', cpf_cnpj: '', natureza: 'sociedade empresária limitada', endereco: '', bairro: '', cidade: '', estado: '', cep: '', representante: '', representante_cargo: 'sócio administrador', representante_tratamento: 'Sr.', nacionalidade: 'brasileiro(a)', estado_civil: '', profissao: '', genero: 'M', sigla: '' });

// Fora do componente: se fosse criado a cada render, os campos perderiam o foco ao digitar.
const LBL = { fontSize: 11, color: '#8E97A8', display: 'flex', flexDirection: 'column', gap: 4 };
function Campo({ label, children, span = 1 }) {
  return <label style={{ ...LBL, gridColumn: `span ${span}` }}>{label}{children}</label>;
}

export const fmtDoc = (s) => {
  const d = dig(s);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return String(s || '').trim();
};
const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Cadastro da base → campos da parte do NDA
const parteDoCliente = (c) => ({
  cliente_id: c.id,
  tipo: c.tipo_pessoa || (dig(c.cpf_cnpj).length === 11 ? 'PF' : 'PJ'),
  nome: c.nome || '', cpf_cnpj: c.cpf_cnpj || '',
  endereco: c.endereco || '', bairro: c.bairro || '', cidade: c.cidade || '', estado: c.estado || '', cep: c.cep || '',
  representante: c.responsavel_legal || '',
  ...(c.nacionalidade ? { nacionalidade: c.nacionalidade } : {}),
  ...(c.estado_civil ? { estado_civil: String(c.estado_civil).toLowerCase() } : {}),
  ...(c.profissao ? { profissao: c.profissao } : {}),
});

// Busca na base de clientes (nome, CPF/CNPJ, e-mail ou telefone)
export function BuscaCliente({ onEscolher, acc, vazioTexto }) {
  const [termo, setTermo] = useState('');
  const [res, setRes] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const q = termo.trim();
    if (q.length < 2) { setRes([]); return; }
    let cancel = false;
    setBusy(true);
    const tm = setTimeout(async () => {
      try {
        const rx = { $regex: escapar(q), $options: 'i' };
        const ors = [{ nome: rx }, { cpf_cnpj: rx }, { email: rx }, { telefone: rx }];
        if (dig(q).length >= 11) ors.push({ cpf_cnpj: fmtDoc(q) }, { cpf_cnpj: dig(q) });
        const r = await base44.entities.Cliente.filter({ $or: ors }, 'nome', 8);
        if (!cancel) setRes(Array.isArray(r) ? r : []);
      } catch { if (!cancel) setRes([]); }
      if (!cancel) setBusy(false);
    }, 350);
    return () => { cancel = true; clearTimeout(tm); };
  }, [termo]);
  return (
    <div className="relative">
      <div className="flex items-center gap-2 h-10 px-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${acc}44` }}>
        <Database className="w-4 h-4" style={{ color: acc }} aria-hidden="true" />
        <input value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar cliente na base (nome, CPF/CNPJ, e-mail)…" aria-label="Buscar cliente na base"
          className="flex-1 bg-transparent outline-none text-sm" style={{ color: '#F4EFE3' }} />
        {busy && <Loader2 className="w-4 h-4 animate-spin" style={{ color: acc }} />}
      </div>
      {termo.trim().length >= 2 && !busy && (
        <div className="absolute z-10 left-0 right-0 mt-1 rounded-xl overflow-hidden" style={{ background: '#162033', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,.5)' }}>
          {res.map(c => (
            <button key={c.id} onClick={() => { onEscolher(c); setTermo(''); setRes([]); }} className="vx-row-hover w-full flex items-center gap-2 px-3 py-2 text-left text-sm" style={{ color: '#F4EFE3' }}>
              <span className="flex-1 truncate">{c.nome}</span>
              {c.cpf_cnpj && <span className="text-[11px]" style={{ color: '#8E97A8' }}>{c.cpf_cnpj}</span>}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: acc + '22', color: acc }}>{c.tipo_pessoa || '—'}</span>
            </button>
          ))}
          {res.length === 0 && <p className="px-3 py-2.5 text-xs" style={{ color: '#8E97A8' }}>{vazioTexto || 'Nenhum cliente encontrado. Preencha abaixo: o cadastro será criado na base ao gerar o NDA.'}</p>}
        </div>
      )}
    </div>
  );
}

// Garante cada parte na base de clientes: vincula o cadastro existente (pelo CPF/CNPJ) ou cria um novo.
// Em cadastros existentes, só completa campos vazios (nunca sobrescreve dados da base).
async function salvarPartesNaBase(partes, { email, telefone }) {
  let vend = null;
  try { vend = await resolverVendedorDoUsuarioLogado(); } catch { /* sem vínculo */ }
  const out = [];
  for (const [i, p] of partes.entries()) {
    const docF = fmtDoc(p.cpf_cnpj);
    const dados = {
      tipo_pessoa: p.tipo, nome: p.nome.trim(), cpf_cnpj: docF,
      endereco: p.endereco, bairro: p.bairro, cidade: p.cidade, estado: p.estado, cep: p.cep,
      ...(p.tipo === 'PJ' ? { responsavel_legal: p.representante } : { nacionalidade: p.nacionalidade, estado_civil: p.estado_civil, profissao: p.profissao }),
      ...(i === 0 ? { email, telefone } : {}),
    };
    let c = null;
    if (p.cliente_id) c = await base44.entities.Cliente.get(p.cliente_id).catch(() => null);
    if (!c && dig(p.cpf_cnpj)) {
      const r = await base44.entities.Cliente.filter({ $or: [{ cpf_cnpj: docF }, { cpf_cnpj: dig(p.cpf_cnpj) }] }, '-created_date', 1).catch(() => []);
      c = r?.[0] || null;
    }
    if (c) {
      const faltando = {};
      Object.entries(dados).forEach(([k, v]) => { if (v && !String(c[k] ?? '').trim()) faltando[k] = v; });
      if (Object.keys(faltando).length) await base44.entities.Cliente.update(c.id, faltando).catch(() => {});
    } else {
      const limpo = Object.fromEntries(Object.entries(dados).filter(([, v]) => v));
      c = await base44.entities.Cliente.create({
        ...limpo,
        origem: 'nativo',
        responsavel_origem: 'Produtos estruturados · Offshore',
        observacao: 'Cadastro criado na abertura da operação Offshore (NDA).',
        ...(vend?.id && vend.ativo !== false ? { vendedor_id: vend.id, vendedor_nome: vend.nome } : {}),
      });
    }
    out.push({ ...p, cliente_id: c.id });
  }
  return out;
}

function baixarBase64(b64, nome) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  return { url, baixar: () => { const a = document.createElement('a'); a.href = url; a.download = nome; a.click(); } };
}

export default function NdaGeradorModal({ estudo, produto = 'offshore', t, onClose, onGerado }) {
  const [partes, setPartes] = useState(() => {
    if (estudo?.nda_partes?.length) return estudo.nda_partes.map(p => ({ ...parteVazia(p.tipo), ...p }));
    if (estudo) {
      const d = estudo.nda_dados || {};
      const tipo = estudo.tipo_cliente || (dig(estudo.cliente_documento).length === 11 ? 'PF' : 'PJ');
      return [{ ...parteVazia(tipo), cliente_id: estudo.cliente_id || '', nome: estudo.cliente_nome || d.nome || '', cpf_cnpj: estudo.cliente_documento || d.cpf_cnpj || '', endereco: d.endereco || '', bairro: d.bairro || '', cidade: d.cidade || '', estado: d.estado || '', cep: d.cep || '', representante: d.responsavel_legal || '' }];
    }
    return [parteVazia('PJ')];
  });
  const [cfg, setCfg] = useState(() => ({ multa: 30000, vigencia_meses: 24, sigilo_anos: 5, nao_evasao_meses: 24, foro: 'Porto Alegre/RS', local: 'Porto Alegre/RS', data: '', ...(estudo?.nda_config || {}) }));
  const [email, setEmail] = useState(estudo?.cliente_email || '');
  const [telefone, setTelefone] = useState(estudo?.cliente_telefone || '');
  const [verCond, setVerCond] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [previa, setPrevia] = useState(false);
  const [buscando, setBuscando] = useState(null);

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const set = (i, patch) => setPartes(l => l.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const buscarCnpj = async (i) => {
    const p = partes[i];
    if (dig(p.cpf_cnpj).length !== 14) return;
    setBuscando(i);
    const d = await consultarCnpj(p.cpf_cnpj).catch(() => null);
    setBuscando(null);
    if (!d) { toast.error('CNPJ não encontrado na base pública.'); return; }
    const end = [d.endereco, d.numero, d.complemento].filter(Boolean).join(', ');
    set(i, {
      nome: p.nome || d.razao_social, endereco: p.endereco || end, bairro: p.bairro || d.bairro,
      cidade: p.cidade || d.cidade, estado: p.estado || d.estado, cep: p.cep || d.cep,
    });
    toast.success('Dados da empresa preenchidos.');
  };
  const buscarCep = async (i) => {
    const p = partes[i];
    if (dig(p.cep).length !== 8) return;
    const d = await consultarCep(p.cep).catch(() => null);
    if (d) set(i, { endereco: p.endereco || d.logradouro, bairro: p.bairro || d.bairro, cidade: p.cidade || d.cidade, estado: p.estado || d.estado });
  };

  const validar = () => {
    for (const [i, p] of partes.entries()) {
      const n = i + 1;
      if (!p.nome.trim()) return `Parte ${n}: informe o nome / razão social.`;
      const d = dig(p.cpf_cnpj);
      if (p.tipo === 'PJ' && d.length !== 14) return `Parte ${n}: CNPJ inválido.`;
      if (p.tipo === 'PF' && d.length !== 11) return `Parte ${n}: CPF inválido.`;
      if (!p.endereco.trim() || !p.cidade.trim() || !p.estado.trim()) return `Parte ${n}: complete o endereço (logradouro, cidade e UF).`;
    }
    return null;
  };

  const preVisualizar = async () => {
    const erro = validar();
    if (erro) { toast.error(erro); return; }
    setPrevia(true);
    try {
      const r = await base44.functions.invoke('gerarNDA', { partes, config: cfg, salvar: false });
      const d = r?.data || r;
      if (!d?.pdf_base64) throw new Error(d?.error || 'Falha ao gerar a prévia.');
      window.open(baixarBase64(d.pdf_base64, d.filename).url, '_blank', 'noopener');
    } catch (e) { toast.error(e.message); }
    setPrevia(false);
  };

  const gerar = async () => {
    const erro = validar();
    if (erro) { toast.error(erro); return; }
    setGerando(true);
    try {
      // 1) Clientes na base (vincula ou cadastra)
      const partesBase = await salvarPartesNaBase(partes, { email: email.trim(), telefone: telefone.trim() });
      setPartes(partesBase);
      let alvo = estudo;
      const p0 = partesBase[0];
      if (!alvo) {
        const me = await base44.auth.me();
        let respNome = me?.nome_tratamento || me?.full_name || me?.email;
        try { const v = await resolverVendedorDoUsuarioLogado(); if (v?.nome && v.ativo !== false) respNome = v.nome; } catch { /* mantém */ }
        alvo = await base44.entities.EstudoViabilidade.create({
          produto, tipo_cliente: p0.tipo, cliente_id: p0.cliente_id, cliente_nome: p0.nome.trim(), cliente_documento: p0.cpf_cnpj,
          cliente_email: email.trim(), cliente_telefone: telefone.trim(),
          responsavel_email: me?.email || '', responsavel_nome: respNome,
          status: 'rascunho', respostas: {}, documentos: [],
          observacoes_internas: partesBase.length > 1 ? `Cliente composto por: ${partesBase.map(p => p.nome).join('; ')}` : '',
        });
      } else if (!alvo.cliente_id && p0.cliente_id) {
        await base44.entities.EstudoViabilidade.update(alvo.id, { cliente_id: p0.cliente_id }).catch(() => {});
      }
      const r = await base44.functions.invoke('gerarNDA', { estudo_id: alvo.id, partes: partesBase, config: cfg });
      const d = r?.data || r;
      if (!d?.pdf_base64) throw new Error(d?.error || 'Falha ao gerar o NDA.');
      baixarBase64(d.pdf_base64, d.filename).baixar();
      toast.success('NDA gerado, salvo na operação e baixado.');
      onGerado?.(alvo.id);
    } catch (e) { toast.error(e.message); }
    setGerando(false);
  };

  const acc = t?.acc || '#C9A962';
  const inp = { height: 38, padding: '0 12px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EFE3', fontSize: 13, width: '100%' };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Gerar NDA"
      style={{ background: 'rgba(3,6,10,0.7)', backdropFilter: 'blur(4px)' }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vx-suspensa w-full max-w-[860px] max-h-[92vh] flex flex-col rounded-3xl overflow-hidden" style={{ background: '#101826', border: `1px solid ${acc}55`, boxShadow: '0 40px 100px rgba(0,0,0,.7)' }}>
        <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: acc + '22', border: `1.5px solid ${acc}` }}><FileText className="w-5 h-5" style={{ color: acc }} /></span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold" style={{ color: '#F4EFE3' }}>{estudo ? 'Gerar NDA da operação' : 'Nova operação Offshore · 1º passo: NDA'}</h2>
            <p className="text-xs" style={{ color: '#8E97A8' }}>Acordo de Confidencialidade · Estruturação Internacional — modelo validado da Villela Exchange</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="vx-btn vx-btn-ghost vx-icon-btn"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {partes.map((p, i) => (
            <section key={i} className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold flex-1" style={{ color: '#F4EFE3' }}>{partes.length > 1 ? `Cliente — parte ${i + 1}` : 'Cliente'}</span>
                <div className="flex gap-1 p-1 rounded-full" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {['PJ', 'PF'].map(tp => (
                    <button key={tp} onClick={() => set(i, { tipo: tp })} className="vx-btn h-7 px-3 text-xs"
                      style={p.tipo === tp ? { background: acc, color: '#1A1508', border: 0 } : { background: 'transparent', color: '#B8C0CC', border: 0, fontWeight: 500 }}>
                      {tp === 'PJ' ? 'Empresa' : 'Pessoa física'}
                    </button>
                  ))}
                </div>
                {partes.length > 1 && (
                  <button onClick={() => setPartes(l => l.filter((_, j) => j !== i))} aria-label={`Remover parte ${i + 1}`} className="vx-btn vx-btn-ghost vx-icon-btn" style={{ width: 32, height: 32 }}><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              {p.cliente_id ? (
                <div className="flex items-center gap-2 px-3 h-10 rounded-xl text-sm" style={{ background: acc + '14', border: `1px solid ${acc}55`, color: '#F4EFE3' }}>
                  <Check className="w-4 h-4" style={{ color: acc }} />
                  <span className="flex-1 truncate">Vinculado ao cadastro da base{p.nome ? `: ${p.nome}` : ''}</span>
                  <button onClick={() => set(i, { cliente_id: '' })} className="text-xs" style={{ color: '#8E97A8' }}>Desvincular</button>
                </div>
              ) : (
                <BuscaCliente acc={acc} onEscolher={(c) => {
                  set(i, parteDoCliente(c));
                  if (i === 0) { if (c.email && !email) setEmail(c.email); if (c.telefone && !telefone) setTelefone(c.telefone); }
                  toast.success('Dados do cliente carregados da base. Confira e complete o que faltar.');
                }} />
              )}
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
                <Campo label={p.tipo === 'PJ' ? 'CNPJ' : 'CPF'} span={2}>
                  <span className="flex gap-1.5">
                    <input style={inp} value={p.cpf_cnpj} onChange={e => set(i, { cpf_cnpj: e.target.value })} onBlur={() => p.tipo === 'PJ' && buscarCnpj(i)} placeholder={p.tipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'} />
                    {p.tipo === 'PJ' && <button onClick={() => buscarCnpj(i)} className="vx-btn vx-btn-soft vx-icon-btn" style={{ width: 38, height: 38 }} aria-label="Buscar CNPJ">{buscando === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}</button>}
                  </span>
                </Campo>
                <Campo label={p.tipo === 'PJ' ? 'Razão social' : 'Nome completo'} span={4}><input style={inp} value={p.nome} onChange={e => set(i, { nome: e.target.value })} /></Campo>
                {p.tipo === 'PJ' ? (
                  <>
                    <Campo label="Nome fantasia (opcional)" span={2}><input style={inp} value={p.nome_fantasia} onChange={e => set(i, { nome_fantasia: e.target.value })} /></Campo>
                    <Campo label="Natureza jurídica" span={4}>
                      <select style={inp} value={p.natureza} onChange={e => set(i, { natureza: e.target.value })}>{NATUREZAS.map(nn => <option key={nn} value={nn}>{nn}</option>)}</select>
                    </Campo>
                    <Campo label="Representante legal" span={3}><input style={inp} value={p.representante} onChange={e => set(i, { representante: e.target.value })} /></Campo>
                    <Campo label="Cargo" span={2}><input style={inp} value={p.representante_cargo} onChange={e => set(i, { representante_cargo: e.target.value })} /></Campo>
                    <Campo label="Tratamento"><select style={inp} value={p.representante_tratamento} onChange={e => set(i, { representante_tratamento: e.target.value })}><option>Sr.</option><option>Sra.</option></select></Campo>
                  </>
                ) : (
                  <>
                    <Campo label="Nacionalidade" span={2}><input style={inp} value={p.nacionalidade} onChange={e => set(i, { nacionalidade: e.target.value })} /></Campo>
                    <Campo label="Estado civil" span={2}><select style={inp} value={p.estado_civil} onChange={e => set(i, { estado_civil: e.target.value })}><option value="">—</option>{ESTADO_CIVIL.map(x => <option key={x} value={x}>{x}</option>)}</select></Campo>
                    <Campo label="Gênero (concordância)" span={2}><select style={inp} value={p.genero} onChange={e => set(i, { genero: e.target.value })}><option value="M">Masculino</option><option value="F">Feminino</option></select></Campo>
                    <Campo label="Profissão" span={6}><input style={inp} value={p.profissao} onChange={e => set(i, { profissao: e.target.value })} /></Campo>
                  </>
                )}
                <Campo label="CEP"><input style={inp} value={p.cep} onChange={e => set(i, { cep: e.target.value })} onBlur={() => buscarCep(i)} /></Campo>
                <Campo label="Endereço (logradouro, nº, complemento)" span={5}><input style={inp} value={p.endereco} onChange={e => set(i, { endereco: e.target.value })} /></Campo>
                <Campo label="Bairro" span={2}><input style={inp} value={p.bairro} onChange={e => set(i, { bairro: e.target.value })} /></Campo>
                <Campo label="Cidade" span={3}><input style={inp} value={p.cidade} onChange={e => set(i, { cidade: e.target.value })} /></Campo>
                <Campo label="UF"><input style={inp} maxLength={2} value={p.estado} onChange={e => set(i, { estado: e.target.value.toUpperCase() })} /></Campo>
                {partes.length > 1 && (
                  <Campo label="Como esta parte é chamada no texto (ex.: EDP)" span={6}><input style={inp} value={p.sigla} onChange={e => set(i, { sigla: e.target.value })} placeholder="Se vazio, usa o nome fantasia ou a 1ª palavra do nome" /></Campo>
                )}
              </div>
            </section>
          ))}

          <button onClick={() => setPartes(l => [...l, parteVazia('PJ')])} className="vx-btn vx-btn-soft h-9 px-4 text-xs self-start" style={{ '--vx-txt': acc }}>
            <Plus className="w-3.5 h-3.5" /> Adicionar outra empresa ou pessoa ao CLIENTE
          </button>

          {!estudo && (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <Campo label="E-mail do cliente (para o link do estudo)"><input style={inp} value={email} onChange={e => setEmail(e.target.value)} /></Campo>
              <Campo label="Telefone / WhatsApp"><input style={inp} value={telefone} onChange={e => setTelefone(e.target.value)} /></Campo>
            </div>
          )}

          <section className="rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => setVerCond(v => !v)} className="w-full flex items-center gap-2 px-4 py-3 text-sm" style={{ color: '#C8D0DC' }} aria-expanded={verCond}>
              <span className="flex-1 text-left">Condições do acordo <span style={{ color: '#8E97A8' }}>· multa R$ {Number(cfg.multa || 0).toLocaleString('pt-BR')} · {cfg.vigencia_meses} meses · sigilo {cfg.sigilo_anos} anos · foro {cfg.foro}</span></span>
              <ChevronDown className="w-4 h-4" style={{ transform: verCond ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>
            {verCond && (
              <div className="grid gap-3 px-4 pb-4" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                <Campo label="Multa por infração (R$)"><input style={inp} type="number" value={cfg.multa} onChange={e => setCfg(c => ({ ...c, multa: Number(e.target.value) }))} /></Campo>
                <Campo label="Vigência (meses)"><input style={inp} type="number" value={cfg.vigencia_meses} onChange={e => setCfg(c => ({ ...c, vigencia_meses: Number(e.target.value) }))} /></Campo>
                <Campo label="Sigilo após término (anos)"><input style={inp} type="number" value={cfg.sigilo_anos} onChange={e => setCfg(c => ({ ...c, sigilo_anos: Number(e.target.value) }))} /></Campo>
                <Campo label="Não evasão (meses)"><input style={inp} type="number" value={cfg.nao_evasao_meses} onChange={e => setCfg(c => ({ ...c, nao_evasao_meses: Number(e.target.value) }))} /></Campo>
                <Campo label="Foro"><input style={inp} value={cfg.foro} onChange={e => setCfg(c => ({ ...c, foro: e.target.value }))} /></Campo>
                <Campo label="Local da assinatura"><input style={inp} value={cfg.local} onChange={e => setCfg(c => ({ ...c, local: e.target.value }))} /></Campo>
                <Campo label="Data (vazio = em branco)" span={2}><input style={inp} type="date" value={cfg.data} onChange={e => setCfg(c => ({ ...c, data: e.target.value }))} /></Campo>
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="text-xs flex-1" style={{ color: '#8E97A8' }}>Clientes novos entram na base. O PDF fica salvo na operação (acesso restrito) e é baixado para envio ao cliente.</span>
          <button onClick={preVisualizar} disabled={previa || gerando} className="vx-btn vx-btn-ghost h-10 px-4 text-sm">{previa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Pré-visualizar</button>
          <button onClick={gerar} disabled={gerando} className="vx-btn vx-btn-primary h-10 px-5 text-sm">{gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} {estudo ? 'Gerar NDA' : 'Gerar NDA e abrir operação'}</button>
        </div>
      </div>
    </div>
  );
}
