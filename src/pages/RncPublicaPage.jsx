import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  FileCheck2, User, Building2, Upload, CheckCircle2, Circle, Plus, Trash2,
  Loader2, AlertTriangle, CheckCircle, Copy, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

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
const labelStyle = { color: AURORA.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];

export default function RncPublicaPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rnc, setRnc] = useState(null);
  const [pendencias, setPendencias] = useState([]);
  const [form, setForm] = useState({});
  const [socios, setSocios] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [arquivos, setArquivos] = useState({}); // { [docTipo]: { base64, nome, mime } }
  const [arquivosSocios, setArquivosSocios] = useState({}); // { [`${idx}-${campo}`]: {base64,nome,mime} }
  const [uploadingKey, setUploadingKey] = useState(null);
  const fileInputRefs = useRef({});

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return; }
    carregar();
  }, [token]);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('rncPublica', { action: 'buscar', token });
      const data = res?.data;
      if (!data || data.error) { setError(data?.error || 'Link inválido ou expirado.'); setLoading(false); return; }
      setRnc(data.rnc);
      setPendencias(data.pendencias || []);
      setForm({
        nome: data.rnc.nome || '', cpf_cnpj: data.rnc.cpf_cnpj || '', rg_ie: data.rnc.rg_ie || '',
        nascimento_fundacao: data.rnc.nascimento_fundacao || '', nacionalidade: data.rnc.nacionalidade || 'Brasileira',
        profissao_natureza: data.rnc.profissao_natureza || '', estado_civil: data.rnc.estado_civil || '',
        dupla_nacionalidade: data.rnc.dupla_nacionalidade || '', media_salarial: data.rnc.media_salarial || '',
        quantidade_funcionarios: data.rnc.quantidade_funcionarios || '',
        email: data.rnc.email || '', telefone: data.rnc.telefone || '',
        cep: data.rnc.cep || '', endereco: data.rnc.endereco || '', bairro: data.rnc.bairro || '',
        cidade: data.rnc.cidade || '', estado: data.rnc.estado || '', observacoes: data.rnc.observacoes || '',
      });
      setSocios((data.rnc.socios || []).map((s) => ({ nome: s.nome || '', cpf: s.cpf || '', documento_url: !!s.documento_url, documento_nome: s.documento_nome, comprovante_url: !!s.comprovante_url, comprovante_nome: s.comprovante_nome })));
    } catch (e) {
      setError('Não foi possível carregar o formulário.');
    }
    setLoading(false);
  };

  const updateForm = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const updateSocio = (i, field, value) => setSocios(ss => ss.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

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

  const handleSocioDocUpload = async (idx, campo, file) => {
    const key = `${idx}-${campo}`;
    setUploadingKey(key);
    try {
      const base64 = await fileToBase64(file);
      setArquivosSocios(a => ({ ...a, [key]: { base64, nome: file.name, mime: file.type } }));
      toast.success('Arquivo anexado. Clique em Enviar para finalizar.');
    } catch (e) { toast.error('Erro ao ler arquivo.'); }
    setUploadingKey(null);
  };

  const removeDoc = (docTipo) => setArquivos(a => { const c = { ...a }; delete c[docTipo]; return c; });
  const removeSocioDoc = (idx, campo) => setArquivosSocios(a => { const c = { ...a }; delete c[`${idx}-${campo}`]; return c; });

  const addSocio = () => setSocios(ss => [...ss, { nome: '', cpf: '', documento_url: false, comprovante_url: false }]);

  const handleSubmit = async () => {
    setSalvando(true);
    setSalvo(false);
    try {
      const uploads = Object.entries(arquivos).map(([tipo, v]) => ({ tipo, base64: v.base64, nome: v.nome, mime: v.mime }));
      const socio_uploads = Object.entries(arquivosSocios).map(([key, v]) => {
        const [idxStr, campo] = key.split('-');
        return { socio_index: Number(idxStr), campo, base64: v.base64, nome: v.nome, mime: v.mime };
      });
      const socios_dados = socios.map((s, i) => ({ index: i, nome: s.nome, cpf: s.cpf }));

      const dados = { ...form };
      const payload = {
        action: 'salvar', token,
        dados: { ...dados, socios_dados: rnc.tipo_canal === 'PJ' ? socios_dados : undefined },
        uploads, socio_uploads,
      };
      const res = await base44.functions.invoke('rncPublica', payload);
      const data = res?.data;
      if (data?.error) { toast.error(data.error); setSalvando(false); return; }
      setRnc(data.rnc);
      setPendencias(data.pendencias || []);
      setArquivos({});
      setArquivosSocios({});
      setSalvo(true);
      if ((data.pendencias || []).length === 0) {
        toast.success('Formulário concluído! Tudo certo.');
      } else {
        toast.success('Dados salvos! Confira os itens pendentes abaixo.');
      }
    } catch (e) {
      toast.error('Erro ao enviar: ' + e.message);
    }
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

  const isPJ = rnc?.tipo_canal === 'PJ';

  return (
    <div className="min-h-screen py-6 px-4" style={{ background: AURORA.bg }}>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #161b22 0%, #1c2333 100%)', border: `1px solid ${AURORA.border}` }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: AURORA.accentDim }}>
            {isPJ ? <Building2 className="w-6 h-6" style={{ color: AURORA.accent }} /> : <User className="w-6 h-6" style={{ color: AURORA.accent }} />}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: AURORA.accent }}>Villela Exchange</p>
            <h1 className="text-xl font-bold" style={{ color: AURORA.text }}>Abertura de Canal Bancário</h1>
            <p className="text-xs" style={{ color: AURORA.textMuted }}>{isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'} — Formulário RNC</p>
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

        {/* Dados cadastrais */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}>
            <User className="w-4 h-4" /> Dados Cadastrais
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block mb-1" style={labelStyle}>{isPJ ? 'Razão Social *' : 'Nome Completo *'}</label>
              <input value={form.nome || ''} onChange={e => updateForm('nome', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block mb-1" style={labelStyle}>{isPJ ? 'CNPJ' : 'CPF'}</label>
              <input value={form.cpf_cnpj || ''} onChange={e => updateForm('cpf_cnpj', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block mb-1" style={labelStyle}>{isPJ ? 'Inscrição Estadual' : 'RG'}</label>
              <input value={form.rg_ie || ''} onChange={e => updateForm('rg_ie', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block mb-1" style={labelStyle}>{isPJ ? 'Data de Fundação' : 'Data de Nascimento'}</label>
              <input type="date" value={form.nascimento_fundacao || ''} onChange={e => updateForm('nascimento_fundacao', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block mb-1" style={labelStyle}>Nacionalidade</label>
              <input value={form.nacionalidade || ''} onChange={e => updateForm('nacionalidade', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" placeholder="Brasileira" />
            </div>
            {isPJ ? (
              <>
                <div className="col-span-2">
                  <label className="block mb-1" style={labelStyle}>Natureza Jurídica</label>
                  <input value={form.profissao_natureza || ''} onChange={e => updateForm('profissao_natureza', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" placeholder="Ex: Ltda, ME" />
                </div>
                <div>
                  <label className="block mb-1" style={labelStyle}>Quantidade de Funcionários</label>
                  <input type="number" min="0" value={form.quantidade_funcionarios || ''} onChange={e => updateForm('quantidade_funcionarios', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block mb-1" style={labelStyle}>Profissão</label>
                  <input value={form.profissao_natureza || ''} onChange={e => updateForm('profissao_natureza', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block mb-1" style={labelStyle}>Estado Civil</label>
                  <select value={form.estado_civil || ''} onChange={e => updateForm('estado_civil', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none">
                    <option value="">Selecione...</option>
                    {ESTADOS_CIVIS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1" style={labelStyle}>Média Salarial (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.media_salarial || ''} onChange={e => updateForm('media_salarial', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" placeholder="Ex: 5000" />
                </div>
                <div>
                  <label className="block mb-1" style={labelStyle}>Possui dupla nacionalidade?</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateForm('dupla_nacionalidade', 'sim')} className="flex-1 px-3 py-2 text-sm rounded-lg font-semibold transition" style={form.dupla_nacionalidade === 'sim' ? { background: AURORA.accent, color: '#0d1117' } : { ...inputStyle, border: `1px solid ${AURORA.border}` }}>Sim</button>
                    <button type="button" onClick={() => updateForm('dupla_nacionalidade', 'nao')} className="flex-1 px-3 py-2 text-sm rounded-lg font-semibold transition" style={form.dupla_nacionalidade === 'nao' ? { background: AURORA.accent, color: '#0d1117' } : { ...inputStyle, border: `1px solid ${AURORA.border}` }}>Não</button>
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block mb-1" style={labelStyle}>E-mail</label>
              <input value={form.email || ''} onChange={e => updateForm('email', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block mb-1" style={labelStyle}>Telefone / WhatsApp</label>
              <input value={form.telefone || ''} onChange={e => updateForm('telefone', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block mb-1" style={labelStyle}>CEP</label>
              <input value={form.cep || ''} onChange={e => updateForm('cep', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block mb-1" style={labelStyle}>Endereço</label>
              <input value={form.endereco || ''} onChange={e => updateForm('endereco', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" placeholder="Rua, número, complemento" />
            </div>
            <div>
              <label className="block mb-1" style={labelStyle}>Bairro</label>
              <input value={form.bairro || ''} onChange={e => updateForm('bairro', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block mb-1" style={labelStyle}>Cidade</label>
              <input value={form.cidade || ''} onChange={e => updateForm('cidade', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block mb-1" style={labelStyle}>Estado (UF)</label>
              <input value={form.estado || ''} onChange={e => updateForm('estado', e.target.value)} style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" placeholder="RS" />
            </div>
          </div>
        </div>

        {/* Documentos */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}>
            <FileCheck2 className="w-4 h-4" /> Documentação
          </h2>
          <div className="space-y-2">
            {(rnc.documentos || []).map((doc) => {
              const hasNew = !!arquivos[doc.tipo];
              const isReceived = doc.recebido || hasNew;
              return (
                <div key={doc.tipo} className="rounded-lg p-3 flex items-center gap-3" style={{ background: AURORA.surface2, border: `1px solid ${isReceived ? 'rgba(0,212,170,0.3)' : AURORA.border}` }}>
                  {isReceived ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: AURORA.accent }} /> : <Circle className="w-5 h-5 flex-shrink-0" style={{ color: doc.obrigatorio ? AURORA.danger : AURORA.textMuted }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: AURORA.text }}>{doc.descricao}</p>
                    {doc.obrigatorio && !isReceived && <p className="text-[10px]" style={{ color: AURORA.danger }}>Obrigatório</p>}
                    {doc.recebido && doc.nome_arquivo && !hasNew && <p className="text-[10px] truncate" style={{ color: AURORA.accent }}>{doc.nome_arquivo}</p>}
                    {hasNew && <p className="text-[10px] truncate" style={{ color: AURORA.accent }}>{arquivos[doc.tipo].nome} (pronto para envio)</p>}
                  </div>
                  {hasNew ? (
                    <button onClick={() => removeDoc(doc.tipo)} className="p-1.5 rounded-lg" style={{ color: AURORA.danger, background: 'rgba(248,113,113,0.1)' }}><Trash2 className="w-3.5 h-3.5" /></button>
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

        {/* Sócios (PJ) */}
        {isPJ && (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.accent }}>
              <Building2 className="w-4 h-4" /> Sócios e Administradores
            </h2>
            <div className="space-y-3">
              {socios.map((s, i) => (
                <div key={i} className="rounded-lg p-3 space-y-2" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                  <div className="flex items-center gap-2">
                    <input value={s.nome} onChange={e => updateSocio(i, 'nome', e.target.value)} placeholder="Nome do sócio" style={inputStyle} className="flex-1 px-3 py-1.5 text-sm rounded-lg focus:outline-none" />
                    <input value={s.cpf} onChange={e => updateSocio(i, 'cpf', e.target.value)} placeholder="CPF" style={inputStyle} className="w-32 px-3 py-1.5 text-sm rounded-lg focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['documento', 'comprovante'].map(campo => {
                      const key = `${i}-${campo}`;
                      const hasNew = !!arquivosSocios[key];
                      const isReceived = (campo === 'documento' ? s.documento_url : s.comprovante_url) || hasNew;
                      const label = campo === 'documento' ? 'Documento ID c/ foto' : 'Comprovante endereço';
                      return (
                        <div key={campo}>
                          <label className="block mb-1" style={labelStyle}>{label}</label>
                          {isReceived ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: AURORA.accentDim, border: `1px solid ${AURORA.borderActive}` }}>
                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: AURORA.accent }} />
                              <span className="text-[10px] truncate flex-1" style={{ color: AURORA.accent }}>{hasNew ? arquivosSocios[key].nome : (campo === 'documento' ? s.documento_nome : s.comprovante_nome) || 'Anexado'}</span>
                              {hasNew && <button onClick={() => removeSocioDoc(i, campo)} className="p-0.5" style={{ color: AURORA.danger }}><Trash2 className="w-3 h-3" /></button>}
                            </div>
                          ) : (
                            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer" style={{ background: AURORA.accentDim, color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                              {uploadingKey === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                              <span className="text-xs">Anexar</span>
                              <input type="file" className="hidden" onChange={e => e.target.files[0] && handleSocioDocUpload(i, campo, e.target.files[0])} />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button onClick={addSocio} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: AURORA.accentDim, color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                <Plus className="w-3.5 h-3.5" /> Adicionar Sócio
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="sticky bottom-4 rounded-2xl p-4 flex items-center justify-between gap-3" style={{ background: AURORA.surface, border: `1px solid ${AURORA.borderActive}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <p className="text-xs" style={{ color: AURORA.textMuted }}>
            {pendencias.length === 0 ? 'Tudo preenchido!' : `${pendencias.length} pendência(s)`}
          </p>
          <button onClick={handleSubmit} disabled={salvando} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50" style={{ background: AURORA.accent, color: '#0d1117' }}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {salvando ? 'Enviando...' : 'Enviar Formulário'}
          </button>
        </div>

        <p className="text-center text-[10px] pb-4" style={{ color: AURORA.textMuted }}>
          Villela Exchange — Documento confidencial. Seus dados são protegidos e usados apenas para abertura do canal bancário.
        </p>
      </div>
    </div>
  );
}