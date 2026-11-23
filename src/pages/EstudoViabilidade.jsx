import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Landmark, Globe2, Wallet, Plus, Search, Link2, Copy, MessageCircle, Mail, ExternalLink, X, Loader2,
  FlaskConical, User, Building2, Paperclip, Send, RotateCcw, Ban, CheckCircle2, AlertTriangle, ClipboardList,
  Pencil, Trash2, BrainCircuit, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { PRODUTOS_ESTUDO, STATUS_ESTUDO, calcularPendenciasEstudo, checklistDocumentos } from '@/lib/estudoViabilidade';
import ClienteEstudoPicker from '@/components/estudo/ClienteEstudoPicker';
import NdaEstudoCard from '@/components/estudo/NdaEstudoCard';
import DocumentosEstudoCard from '@/components/estudo/DocumentosEstudoCard';
import EditarEstudoModal from '@/components/estudo/EditarEstudoModal';
import { origemPublica } from '@/lib/appUrl';

const AURORA = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)', borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)',
  gold: '#fbbf24', goldDim: 'rgba(251,191,36,0.12)', danger: '#f87171',
};
const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const labelStyle = { color: AURORA.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };
const ICONE = { holding: Landmark, offshore: Globe2, conta_internacional: Wallet };

const ROTULOS = {
  razao_social: 'Razão social', cnpj: 'CNPJ', atividade: 'Atividade / CNAE', data_constituicao: 'Data de constituição',
  regime_tributario: 'Regime tributário', faturamento_anual: 'Faturamento anual', num_funcionarios: 'Funcionários',
  resp_nome: 'Responsável legal', resp_cpf: 'CPF do responsável', resp_cargo: 'Cargo do responsável',
  nome: 'Nome', cpf: 'CPF', data_nascimento: 'Nascimento', profissao: 'Profissão', nacionalidade: 'Nacionalidade',
  estado_civil: 'Estado civil', regime_bens: 'Regime de bens', email: 'E-mail', telefone: 'Telefone', endereco: 'Endereço', cidade: 'Cidade', uf: 'UF',
  objetivos: 'Objetivos', objetivo_outro: 'Outro objetivo', proposito_descricao: 'Propósito', expectativa: 'Expectativa',
  prazo: 'Prazo desejado', preocupacao: 'Principal preocupação', possui_estrutura: 'Possui estrutura', estrutura_descricao: 'Estrutura existente',
  contador: 'Contador', advogado: 'Advogado',
  holding_tipos: 'Tipo de holding', spe_projeto: 'Projeto da SPE', conjuge_nome: 'Cônjuge', herdeiros: 'Herdeiros',
  herdeiros_socios: 'Herdeiros como sócios', possui_testamento: 'Testamento / acordo', imoveis: 'Imóveis', veiculos: 'Veículos',
  participacoes: 'Participações', aplicacoes_valor: 'Aplicações financeiras', patrimonio_total: 'Patrimônio total estimado', outros_bens: 'Outros bens',
  jurisdicoes: 'Jurisdições', valor_remessa: 'Valor a remeter', origem_recursos: 'Origem dos recursos', residencia_fiscal: 'Residência fiscal',
  ativos_exterior: 'Ativos no exterior', ativos_exterior_desc: 'Descrição dos ativos', operacao_comercial: 'Operação comercial', operacao_desc: 'Operação — detalhes',
  conta_vinculada: 'Conta vinculada', residir_exterior: 'Residir no exterior', beneficiarios: 'Beneficiários finais',
  moedas: 'Moedas', deposito_inicial: 'Depósito inicial', volume_mensal: 'Volume mensal', paises: 'Países', uso_escrow: 'Escrow account',
  possui_conta_exterior: 'Conta no exterior', bancos_exterior: 'Contas existentes', titulares: 'Titulares',
  dividas_tributarias: 'Débitos tributários', dividas_valor: 'Valor dos débitos', parcelamento: 'Parcelamento ativo', outras_dividas: 'Outras dívidas',
  processos: 'Processos / execuções', bloqueios: 'Bloqueios de contas', riscos_descricao: 'Descrição dos riscos', ir_em_dia: 'IR em dia',
  informacoes_adicionais: 'Informações adicionais',
};
const GRUPOS = [
  { titulo: 'Identificação', chaves: ['razao_social', 'cnpj', 'atividade', 'data_constituicao', 'regime_tributario', 'faturamento_anual', 'num_funcionarios', 'resp_nome', 'resp_cpf', 'resp_cargo', 'nome', 'cpf', 'data_nascimento', 'profissao', 'nacionalidade', 'estado_civil', 'regime_bens', 'email', 'telefone', 'endereco', 'cidade', 'uf'] },
  { titulo: 'Propósito e expectativas', chaves: ['objetivos', 'objetivo_outro', 'proposito_descricao', 'expectativa', 'prazo', 'preocupacao', 'possui_estrutura', 'estrutura_descricao', 'contador', 'advogado'] },
  { titulo: 'Holding / patrimônio', chaves: ['holding_tipos', 'spe_projeto', 'conjuge_nome', 'herdeiros', 'herdeiros_socios', 'possui_testamento', 'imoveis', 'veiculos', 'participacoes', 'aplicacoes_valor', 'patrimonio_total', 'outros_bens'] },
  { titulo: 'Estrutura internacional', chaves: ['jurisdicoes', 'valor_remessa', 'residencia_fiscal', 'ativos_exterior', 'ativos_exterior_desc', 'operacao_comercial', 'operacao_desc', 'conta_vinculada', 'residir_exterior', 'beneficiarios'] },
  { titulo: 'Conta internacional', chaves: ['moedas', 'deposito_inicial', 'origem_recursos', 'volume_mensal', 'paises', 'uso_escrow', 'possui_conta_exterior', 'bancos_exterior', 'titulares'] },
  { titulo: 'Situação fiscal e riscos', chaves: ['dividas_tributarias', 'dividas_valor', 'parcelamento', 'outras_dividas', 'processos', 'bloqueios', 'riscos_descricao', 'ir_em_dia'] },
  { titulo: 'Observações do cliente', chaves: ['informacoes_adicionais'] },
];
const fmtValor = (v) => {
  if (v === 'sim') return 'Sim'; if (v === 'nao') return 'Não'; if (v === 'avaliar') return 'Quer avaliar'; if (v === 'nao_sei') return 'Não sabe';
  return String(v);
};
const vazio = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const StatusBadge = ({ status }) => {
  const s = STATUS_ESTUDO[status] || STATUS_ESTUDO.rascunho;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: s.cor, background: `${s.cor}1f`, border: `1px solid ${s.cor}55` }}>
      {s.label}
    </span>
  );
};

const Campo = ({ label, value, onChange, placeholder = '', type = 'text' }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
  </div>
);

const Modal = ({ onClose, children, largo }) => (
  <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
    <div className={`w-full ${largo ? 'max-w-4xl' : 'max-w-lg'} rounded-2xl my-6`} style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

function linkCompleto(estudo) {
  if (!estudo?.link_token) return '';
  // Endereço público padronizado (ver src/lib/appUrl.js)
  return `${origemPublica()}/estudo-viabilidade/${estudo.link_token}`;
}
function mensagemWhatsapp(estudo) {
  const p = PRODUTOS_ESTUDO[estudo.produto];
  return `Olá${estudo.cliente_nome ? ', ' + estudo.cliente_nome.split(' ')[0] : ''}! Aqui é da Villela Exchange.\n\nPara iniciarmos o *${p?.titulo || 'Estudo de Viabilidade'}*, preencha o formulário abaixo com o propósito, suas expectativas e os documentos solicitados. Seu progresso fica salvo e você pode concluir em mais de uma etapa:\n\n${linkCompleto(estudo)}\n\nQualquer dúvida, estou à disposição.`;
}

function PainelCompartilhar({ estudo }) {
  const link = linkCompleto(estudo);
  const tel = (estudo.cliente_telefone || '').replace(/\D/g, '');
  const telWa = tel ? (tel.length <= 11 ? '55' + tel : tel) : '';
  const p = PRODUTOS_ESTUDO[estudo.produto];
  if (!link) return null;
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: AURORA.accentDim, border: `1px solid ${AURORA.borderActive}` }}>
      <p className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: AURORA.accent }}><Link2 className="w-3.5 h-3.5" /> Link do formulário do cliente</p>
      <div className="flex gap-2">
        <input readOnly value={link} style={inputStyle} className="flex-1 px-2 py-1.5 text-[11px] rounded-md" onFocus={e => e.target.select()} />
        <button onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado'); }} className="px-2.5 rounded-md" style={{ background: AURORA.accent, color: '#0d1117' }} title="Copiar"><Copy className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`https://wa.me/${telWa}?text=${encodeURIComponent(mensagemWhatsapp(estudo))}`} target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#25D366', color: '#0d1117' }}>
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </a>
        <a href={`mailto:${estudo.cliente_email || ''}?subject=${encodeURIComponent((p?.titulo || 'Estudo de Viabilidade') + ' — Villela Exchange')}&body=${encodeURIComponent(mensagemWhatsapp(estudo).replace(/\*/g, ''))}`}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ ...inputStyle }}>
          <Mail className="w-3.5 h-3.5" /> E-mail
        </a>
        <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ ...inputStyle }}>
          <ExternalLink className="w-3.5 h-3.5" /> Abrir formulário
        </a>
      </div>
    </div>
  );
}

function ValorResposta({ v }) {
  if (Array.isArray(v)) {
    if (v.length > 0 && typeof v[0] === 'object') {
      const cols = Array.from(new Set(v.flatMap(o => Object.keys(o || {}))));
      return (
        <div className="overflow-x-auto">
          <table className="text-[11px] w-full">
            <thead><tr>{cols.map(c => <th key={c} className="text-left pr-3 pb-1 font-semibold" style={{ color: AURORA.textMuted }}>{c.replace(/_/g, ' ')}</th>)}</tr></thead>
            <tbody>{v.map((o, i) => <tr key={i}>{cols.map(c => <td key={c} className="pr-3 py-0.5" style={{ color: AURORA.text }}>{o?.[c] || '—'}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    }
    return <span>{v.join(' · ')}</span>;
  }
  return <span className="whitespace-pre-wrap">{fmtValor(v)}</span>;
}

export default function EstudoViabilidade() {
  const loc = useLocation();
  const [user, setUser] = useState(null);
  const [estudos, setEstudos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [produtoSel, setProdutoSel] = useState(null);
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [novoAberto, setNovoAberto] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const carregar = async () => {
    setLoading(true);
    try {
      const lista = await base44.entities.EstudoViabilidade.list('-created_date', 500);
      setEstudos(lista || []);
    } catch (e) { toast.error('Erro ao carregar estudos: ' + e.message); }
    setLoading(false);
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    carregar();
  }, []);

  // Atualização em tempo real: quando o cliente preenche ou envia o formulário,
  // o status muda na tela sem precisar recarregar a página.
  useEffect(() => {
    const unsub = base44.entities.EstudoViabilidade.subscribe((event) => {
      if (event.type === 'delete') {
        setEstudos(l => l.filter(x => x.id !== event.id));
        setDetalhe(d => (d && d.id === event.id ? null : d));
        return;
      }
      const novo = event.data;
      if (!novo?.id) return;
      setEstudos(l => (l.some(x => x.id === novo.id) ? l.map(x => (x.id === novo.id ? { ...x, ...novo } : x)) : [novo, ...l]));
      setDetalhe(d => (d && d.id === novo.id ? { ...d, ...novo } : d));
    });
    return unsub;
  }, []);

  // Vindo da Análise Técnica (?estudo=ID): abre o estudo de origem já no detalhe,
  // para manter o fluxo estudo → análise como uma coisa só.
  const abertoPorParam = useRef(false);
  useEffect(() => {
    if (abertoPorParam.current) return;
    const alvo = new URLSearchParams(loc.search).get('estudo');
    if (!alvo || !estudos.length) return;
    const e = estudos.find(x => x.id === alvo);
    if (e) { setDetalhe(e); abertoPorParam.current = true; }
  }, [estudos, loc.search]);

  const contagem = useMemo(() => {
    const c = { holding: 0, offshore: 0, conta_internacional: 0 };
    estudos.forEach(e => { if (c[e.produto] !== undefined && e.status !== 'cancelado') c[e.produto]++; });
    return c;
  }, [estudos]);

  const filtrados = useMemo(() => estudos.filter(e => {
    if (produtoSel && e.produto !== produtoSel) return false;
    // "Recebido" inclui os estudos que o cliente já devolveu (faltando só a declaração final)
    if (statusFiltro === 'recebido') {
      if (e.status !== 'recebido' && !e.cliente_devolveu_em) return false;
    } else if (statusFiltro !== 'todos' && e.status !== statusFiltro) return false;
    if (busca) {
      const q = busca.toLowerCase();
      const alvo = `${e.cliente_nome || ''} ${e.cliente_documento || ''} ${e.cliente_email || ''} ${e.responsavel_nome || ''}`.toLowerCase();
      if (!alvo.includes(q)) return false;
    }
    return true;
  }), [estudos, produtoSel, statusFiltro, busca]);

  const atualizar = async (estudo, dados, msg) => {
    try {
      await base44.entities.EstudoViabilidade.update(estudo.id, dados);
      const novo = { ...estudo, ...dados };
      setEstudos(l => l.map(x => x.id === estudo.id ? novo : x));
      setDetalhe(d => d && d.id === estudo.id ? novo : d);
      if (msg) toast.success(msg);
    } catch (e) { toast.error('Erro: ' + e.message); }
  };

  const produtoAtual = produtoSel ? PRODUTOS_ESTUDO[produtoSel] : null;

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ color: AURORA.text }}>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: AURORA.accent }}>Comercial · Estudos técnicos</p>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="w-6 h-6" style={{ color: AURORA.accent }} />
            {produtoAtual ? produtoAtual.titulo : 'Estudo de Viabilidade'}
          </h1>
          <p className="text-xs mt-1" style={{ color: AURORA.textMuted }}>
            Envie o formulário ao cliente, receba propósito, expectativas e documentos e encaminhe para a Análise Técnica.
          </p>
        </div>
        <button onClick={() => setNovoAberto(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: AURORA.accent, color: '#0d1117' }}>
          <Plus className="w-4 h-4" /> {produtoAtual ? `Iniciar Estudo — ${produtoAtual.nome}` : 'Iniciar Estudo'}
        </button>
      </div>

      {/* Produtos */}
      <div className="grid md:grid-cols-3 gap-3">
        {Object.values(PRODUTOS_ESTUDO).map(p => {
          const Icon = ICONE[p.id];
          const ativo = produtoSel === p.id;
          return (
            <button key={p.id} onClick={() => setProdutoSel(ativo ? null : p.id)}
              className="text-left rounded-2xl p-4 transition"
              style={{ background: ativo ? 'linear-gradient(135deg, rgba(0,212,170,0.16), #1c2333)' : AURORA.surface, border: `1px solid ${ativo ? AURORA.accent : AURORA.border}` }}>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: AURORA.accentDim }}>
                  <Icon className="w-5 h-5" style={{ color: AURORA.accent }} />
                </div>
                <span className="text-2xl font-bold" style={{ color: ativo ? AURORA.accent : AURORA.text }}>{contagem[p.id]}</span>
              </div>
              <p className="text-base font-bold mt-3">{p.nome}</p>
              <p className="text-[11px] mt-1 leading-snug" style={{ color: AURORA.textMuted }}>{p.descricao}</p>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: AURORA.textMuted }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente, CPF/CNPJ, consultor..."
            style={inputStyle} className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none" />
        </div>
        {['todos', ...Object.keys(STATUS_ESTUDO)].map(s => (
          <button key={s} onClick={() => setStatusFiltro(s)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
            style={statusFiltro === s ? { background: AURORA.accent, color: '#0d1117' } : { background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }}>
            {s === 'todos' ? 'Todos' : STATUS_ESTUDO[s].label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: AURORA.accent }} /></div>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList className="w-10 h-10 mx-auto mb-2" style={{ color: AURORA.textMuted }} />
            <p className="text-sm" style={{ color: AURORA.textMuted }}>Nenhum estudo {produtoAtual ? `de ${produtoAtual.nome} ` : ''}encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${AURORA.border}` }}>
                  {['Cliente', 'Produto', 'Tipo', 'Status', 'Docs', 'Consultor', 'Atualizado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: AURORA.textMuted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(e => {
                  const Icon = ICONE[e.produto] || Landmark;
                  return (
                    <tr key={e.id} onClick={() => setDetalhe(e)} className="cursor-pointer transition hover:bg-white/[0.03]" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{e.cliente_nome || '—'}</p>
                        <p className="text-[11px]" style={{ color: AURORA.textMuted }}>{e.cliente_documento || e.cliente_email || ''}</p>
                      </td>
                      <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-xs"><Icon className="w-3.5 h-3.5" style={{ color: AURORA.accent }} />{PRODUTOS_ESTUDO[e.produto]?.nome}</span></td>
                      <td className="px-4 py-3 text-xs">{e.tipo_cliente}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={e.status} />
                        {e.cliente_devolveu_em && !['recebido', 'em_analise_tecnica', 'concluido'].includes(e.status) && (
                          <p className="text-[10px] font-semibold mt-1" style={{ color: AURORA.gold }}>Devolvido pelo cliente</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">{(e.documentos || []).length}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: AURORA.textMuted }}>{e.responsavel_nome || e.responsavel_email || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: AURORA.textMuted }}>{fmtData(e.updated_date || e.created_date)}</td>
                      <td className="px-4 py-3 text-right">
                        {e.link_token && (
                          <button onClick={ev => { ev.stopPropagation(); navigator.clipboard.writeText(linkCompleto(e)); toast.success('Link copiado'); }}
                            className="p-1.5 rounded-md" style={{ color: AURORA.accent }} title="Copiar link"><Copy className="w-3.5 h-3.5" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {novoAberto && (
        <NovoEstudoModal produtoInicial={produtoSel} user={user} onClose={() => setNovoAberto(false)}
          onCriado={(e) => { setEstudos(l => [e, ...l]); }} />
      )}
      {detalhe && (
        <DetalheEstudoModal estudo={detalhe} user={user} isAdmin={isAdmin} onClose={() => setDetalhe(null)} onAtualizar={atualizar}
          onExcluido={async (e) => {
            try {
              await base44.entities.EstudoViabilidade.delete(e.id);
            } catch (err) {
              // Registro já removido (ex.: exclusão repetida ou em outra aba): segue limpando a tela
              if (!/not found/i.test(err?.message || '')) {
                toast.error('Erro ao excluir: ' + (err?.message || 'tente novamente'));
                return;
              }
            }
            setEstudos(l => l.filter(x => x.id !== e.id));
            setDetalhe(null);
            toast.success('Estudo excluído');
          }} />
      )}
    </div>
  );
}

function NovoEstudoModal({ produtoInicial, user, onClose, onCriado }) {
  const [form, setForm] = useState({ produto: produtoInicial || '', tipo_cliente: 'PF', cliente_id: '', cliente_nome: '', cliente_documento: '', cliente_email: '', cliente_telefone: '', observacoes_internas: '' });
  const [salvando, setSalvando] = useState(false);
  const [criado, setCriado] = useState(null);
  const [nda, setNda] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  // Travas de segurança: impedem que um clique duplo crie dois estudos (dois "processos")
  const criandoRef = useRef(false);
  const estudoRef = useRef(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // NDA enviado: preenche a identificação do cliente com os dados do documento
  const aplicarNda = (info) => {
    setNda(info);
    const d = info?.dados;
    if (!d) return;
    setForm(f => ({
      ...f,
      cliente_id: info.cliente?.id || '',
      cliente_nome: d.nome || f.cliente_nome,
      cliente_documento: d.cpf_cnpj || f.cliente_documento,
      cliente_email: d.email || f.cliente_email,
      cliente_telefone: d.telefone || f.cliente_telefone,
      tipo_cliente: d.tipo_pessoa || f.tipo_cliente,
    }));
  };

  const criar = async () => {
    if (criandoRef.current || criado) return;
    if (!form.produto) return toast.error('Selecione o produto do estudo.');
    if (!form.cliente_nome.trim()) return toast.error('Informe o nome do cliente.');
    criandoRef.current = true;
    setSalvando(true);
    try {
      // Se o estudo já foi criado nesta mesma janela (ex.: falhou só a geração do link),
      // reaproveita o registro em vez de criar um segundo estudo/processo.
      if (estudoRef.current) {
        const res = await base44.functions.invoke('gerarLinkEstudoViabilidade', { estudo_id: estudoRef.current.id });
        if (res?.data?.error) throw new Error(res.data.error);
        const final = { ...estudoRef.current, link_token: res.data.token, status: 'enviado_cliente', data_envio_cliente: new Date().toISOString() };
        setCriado(final);
        onCriado(final);
        toast.success('Estudo criado. Envie o link ao cliente.');
        return;
      }
      const d = nda?.dados || null;
      // O estudo NÃO cria cadastro na base de clientes/leads: os dados do cliente
      // ficam dentro do próprio estudo e o cadastro só nasce na conversão
      // (contrato/venda) ou quando o cliente já existe e é selecionado acima.
      const clienteId = form.cliente_id || '';

      const nomeResp = user?.nome_tratamento || user?.full_name || user?.email;
      const respostasIniciais = form.tipo_cliente === 'PJ'
        ? {
            razao_social: form.cliente_nome, cnpj: form.cliente_documento, email: form.cliente_email, telefone: form.cliente_telefone,
            ...(d ? { endereco: d.endereco, cidade: d.cidade, uf: d.estado, resp_nome: d.responsavel_legal, resp_cpf: d.cpf_responsavel } : {}),
          }
        : {
            nome: form.cliente_nome, cpf: form.cliente_documento, email: form.cliente_email, telefone: form.cliente_telefone,
            ...(d ? { data_nascimento: d.nascimento, profissao: d.profissao, nacionalidade: d.nacionalidade, endereco: d.endereco, cidade: d.cidade, uf: d.estado } : {}),
          };
      const e = await base44.entities.EstudoViabilidade.create({
        ...form, cliente_id: clienteId, status: 'rascunho', respostas: respostasIniciais, documentos,
        responsavel_email: user?.email, responsavel_nome: nomeResp,
        nda_url: nda?.url || '', nda_nome: nda?.nome || '', nda_dados: d || undefined,
      });
      estudoRef.current = e;
      const res = await base44.functions.invoke('gerarLinkEstudoViabilidade', { estudo_id: e.id });
      if (res?.data?.error) throw new Error(res.data.error);
      const final = { ...e, link_token: res.data.token, status: 'enviado_cliente', data_envio_cliente: new Date().toISOString() };
      setCriado(final);
      onCriado(final);
      toast.success('Estudo criado. Envie o link ao cliente.');
    } catch (err) { toast.error('Erro ao criar: ' + err.message); }
    finally { criandoRef.current = false; setSalvando(false); }
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{form.produto ? PRODUTOS_ESTUDO[form.produto].titulo : 'Novo Estudo de Viabilidade'}</h2>
          <button onClick={onClose} style={{ color: AURORA.textMuted }}><X className="w-5 h-5" /></button>
        </div>
        {criado ? (
          <>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#34d399' }}><CheckCircle2 className="w-4 h-4" /> Estudo criado para {criado.cliente_nome}.</div>
            <PainelCompartilhar estudo={criado} />
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-bold" style={{ background: AURORA.accent, color: '#0d1117' }}>Concluir</button>
          </>
        ) : (
          <>
            <div>
              <label className="block mb-1.5" style={labelStyle}>Produto</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(PRODUTOS_ESTUDO).map(p => {
                  const Icon = ICONE[p.id];
                  const on = form.produto === p.id;
                  return (
                    <button key={p.id} onClick={() => set('produto', p.id)} className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold"
                      style={{ background: on ? AURORA.accentDim : AURORA.surface2, border: `1px solid ${on ? AURORA.accent : AURORA.border}`, color: on ? AURORA.accent : AURORA.text }}>
                      <Icon className="w-5 h-5" /> {p.nome}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block mb-1.5" style={labelStyle}>Natureza do cliente</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: 'PF', l: 'Pessoa Física', I: User }, { v: 'PJ', l: 'Pessoa Jurídica', I: Building2 }].map(o => (
                  <button key={o.v} onClick={() => set('tipo_cliente', o.v)} className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold"
                    style={form.tipo_cliente === o.v ? { background: AURORA.accent, color: '#0d1117' } : inputStyle}>
                    <o.I className="w-3.5 h-3.5" /> {o.l}
                  </button>
                ))}
              </div>
            </div>
            <NdaEstudoCard onAlterar={aplicarNda} />
            <DocumentosEstudoCard produto={form.produto} tipoCliente={form.tipo_cliente} documentos={documentos} onChange={setDocumentos} />
            <ClienteEstudoPicker onSelecionar={(c) => setForm(f => ({
              ...f,
              cliente_id: c.id || '',
              cliente_nome: c.nome || '',
              cliente_documento: c.cpf_cnpj || '',
              cliente_email: c.email || '',
              cliente_telefone: c.telefone || '',
              tipo_cliente: c.tipo_pessoa === 'PF' ? 'PF' : (c.tipo_pessoa === 'PJ' ? 'PJ' : f.tipo_cliente),
            }))} />
            <Campo label={form.tipo_cliente === 'PJ' ? 'Razão social *' : 'Nome do cliente *'} value={form.cliente_nome} onChange={v => set('cliente_nome', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Campo label={form.tipo_cliente === 'PJ' ? 'CNPJ' : 'CPF'} value={form.cliente_documento} onChange={v => set('cliente_documento', v)} />
              <Campo label="WhatsApp" value={form.cliente_telefone} onChange={v => set('cliente_telefone', v)} placeholder="(51) 99999-9999" />
            </div>
            <Campo label="E-mail" type="email" value={form.cliente_email} onChange={v => set('cliente_email', v)} />
            <div>
              <label className="block mb-1" style={labelStyle}>Observações internas (não aparecem para o cliente)</label>
              <textarea value={form.observacoes_internas} onChange={e => set('observacoes_internas', e.target.value)} rows={2}
                style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" />
            </div>
            <button onClick={criar} disabled={salvando} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: AURORA.accent, color: '#0d1117' }}>
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Criar e gerar link do formulário
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function DetalheEstudoModal({ estudo, isAdmin, onClose, onAtualizar, onExcluido }) {
  const nav = useNavigate();
  const [obs, setObs] = useState(estudo.observacoes_internas || '');
  const [gerando, setGerando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const excluir = async () => {
    if (excluindo) return;
    if (!confirm('Excluir definitivamente este estudo? Esta ação não pode ser desfeita.')) return;
    setExcluindo(true);
    try { await onExcluido(estudo); } catch { /* tratado no pai */ } finally { setExcluindo(false); }
  };
  const p = PRODUTOS_ESTUDO[estudo.produto];
  const Icon = ICONE[estudo.produto] || Landmark;
  const r = estudo.respostas || {};
  const pend = calcularPendenciasEstudo(estudo);
  const checklist = checklistDocumentos(estudo.produto, estudo.tipo_cliente);
  const docs = estudo.documentos || [];

  const abrirNda = async () => {
    try {
      const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: estudo.nda_url, expires_in: 300 });
      const url = res?.signed_url || res?.data?.signed_url;
      if (!url) throw new Error('sem link');
      window.open(url, '_blank', 'noopener');
    } catch { toast.error('Não foi possível abrir o NDA.'); }
  };

  const gerarLink = async () => {
    if (gerando) return;
    setGerando(true);
    try {
      const res = await base44.functions.invoke('gerarLinkEstudoViabilidade', { estudo_id: estudo.id });
      if (res?.data?.error) throw new Error(res.data.error);
      await onAtualizar(estudo, { link_token: res.data.token, status: estudo.status === 'rascunho' ? 'enviado_cliente' : estudo.status }, 'Link gerado');
    } catch (e) { toast.error(e.message); }
    finally { setGerando(false); }
  };

  const enviarAnalise = async () => {
    if (pend.length > 0 && !confirm(`Há ${pend.length} pendência(s) no formulário. Enviar para Análise Técnica mesmo assim?`)) return;
    await onAtualizar(estudo, { status: 'em_analise_tecnica', data_envio_analise: new Date().toISOString(), observacoes_internas: obs }, 'Enviado para Análise Técnica');
    nav(`/AnaliseTecnica?estudo=${estudo.id}`);
  };

  return (
    <Modal onClose={onClose} largo>
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: AURORA.accentDim }}><Icon className="w-5 h-5" style={{ color: AURORA.accent }} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: AURORA.accent }}>{p?.titulo}</p>
              <h2 className="text-lg font-bold">{estudo.cliente_nome}</h2>
              <div className="flex items-center gap-2 mt-0.5"><StatusBadge status={estudo.status} /><span className="text-[11px]" style={{ color: AURORA.textMuted }}>{estudo.tipo_cliente === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'} · {estudo.responsavel_nome || estudo.responsavel_email}</span></div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: AURORA.textMuted }}><X className="w-5 h-5" /></button>
        </div>

        {/* Linha do tempo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          {[['Enviado ao cliente', estudo.data_envio_cliente], ['Último acesso do cliente', estudo.link_ultimo_acesso_em], ['Recebido', estudo.data_recebimento], ['Enviado à análise', estudo.data_envio_analise]].map(([l, d]) => (
            <div key={l} className="rounded-lg p-2" style={{ background: AURORA.surface2 }}>
              <p style={{ color: AURORA.textMuted }}>{l}</p><p className="font-semibold">{fmtData(d)}</p>
            </div>
          ))}
        </div>

        {estudo.link_token ? <PainelCompartilhar estudo={estudo} /> : (
          <button onClick={gerarLink} disabled={gerando} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: AURORA.accent, color: '#0d1117' }}>
            {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />} Gerar link do formulário
          </button>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button onClick={() => setEditando(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
              <Pencil className="w-3.5 h-3.5" /> Editar estudo
            </button>
          )}
          {isAdmin && (
            <button onClick={excluir} disabled={excluindo} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-60" style={{ ...inputStyle, color: AURORA.danger }}>
              {excluindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Excluir
            </button>
          )}
          {['enviado_cliente', 'em_preenchimento'].includes(estudo.status) && (
            <button onClick={() => onAtualizar(estudo, { status: 'recebido', data_recebimento: new Date().toISOString() }, 'Estudo marcado como recebido')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: '#34d399', color: '#0d1117' }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como recebido
            </button>
          )}
          {estudo.status === 'recebido' && (
            <button onClick={enviarAnalise} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: '#a78bfa', color: '#0d1117' }}>
              <Send className="w-3.5 h-3.5" /> Enviar para Análise Técnica
            </button>
          )}
          {(['em_analise_tecnica', 'concluido'].includes(estudo.status) || estudo.proposta_atual_id) && (
            <button onClick={() => nav(`/AnaliseTecnica?estudo=${estudo.id}`)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: AURORA.accent, color: '#0d1117' }}>
              <BrainCircuit className="w-3.5 h-3.5" /> Abrir Análise Técnica{estudo.proposta_versao ? ` (v${estudo.proposta_versao})` : ''}
            </button>
          )}
          {['recebido', 'em_analise_tecnica'].includes(estudo.status) && (
            <button onClick={() => onAtualizar(estudo, { status: 'em_preenchimento' }, 'Formulário reaberto para o cliente')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold" style={inputStyle}>
              <RotateCcw className="w-3.5 h-3.5" /> Reabrir para o cliente
            </button>
          )}
          {isAdmin && estudo.status === 'em_analise_tecnica' && (
            <button onClick={() => onAtualizar(estudo, { status: 'concluido' }, 'Estudo concluído')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold" style={inputStyle}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como concluído
            </button>
          )}
          {estudo.status !== 'cancelado' && estudo.status !== 'concluido' && (
            <button onClick={() => confirm('Cancelar este estudo? O link do cliente deixará de funcionar.') && onAtualizar(estudo, { status: 'cancelado' }, 'Estudo cancelado')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold" style={{ ...inputStyle, color: AURORA.danger }}>
              <Ban className="w-3.5 h-3.5" /> Cancelar
            </button>
          )}
        </div>

        {pend.length > 0 && estudo.status !== 'rascunho' && (
          <div className="rounded-xl p-3" style={{ background: AURORA.goldDim, border: '1px solid rgba(251,191,36,0.25)' }}>
            <p className="text-xs font-bold flex items-center gap-1.5 mb-1" style={{ color: AURORA.gold }}><AlertTriangle className="w-3.5 h-3.5" /> {pend.length} pendência(s) no formulário</p>
            <p className="text-[11px]" style={{ color: 'rgba(251,191,36,0.85)' }}>{pend.join(' · ')}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Respostas */}
          <div className="lg:col-span-2 space-y-3">
            {GRUPOS.map(g => {
              const itens = g.chaves.filter(k => !vazio(r[k]));
              if (itens.length === 0) return null;
              return (
                <div key={g.titulo} className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                  <p className="text-xs font-bold mb-2" style={{ color: AURORA.accent }}>{g.titulo}</p>
                  <dl className="space-y-1.5">
                    {itens.map(k => (
                      <div key={k} className="grid grid-cols-3 gap-2 text-xs">
                        <dt style={{ color: AURORA.textMuted }}>{ROTULOS[k] || k}</dt>
                        <dd className="col-span-2"><ValorResposta v={r[k]} /></dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
            {Object.keys(r).length <= 4 && (
              <p className="text-xs" style={{ color: AURORA.textMuted }}>O cliente ainda não preencheu o formulário.</p>
            )}
            {estudo.preenchido_por_nome && (
              <p className="text-[11px]" style={{ color: AURORA.textMuted }}>Preenchido por {estudo.preenchido_por_nome} · Aceite LGPD: {estudo.aceite_lgpd ? 'sim' : 'não'}</p>
            )}
          </div>

          {/* Documentos + observações */}
          <div className="space-y-3">
            <div className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
              <p className="text-xs font-bold mb-2" style={{ color: AURORA.accent }}>Documentos ({docs.length})</p>
              {estudo.nda_url && (
                <button type="button" onClick={abrirNda}
                  className="w-full flex items-center gap-1.5 mb-2 px-2 py-1.5 rounded-lg text-[11px] font-semibold"
                  style={{ background: AURORA.accentDim, color: AURORA.accent }} title="Abrir NDA enviado na abertura do estudo">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">NDA · {estudo.nda_nome || 'documento base'}</span>
                </button>
              )}
              <ul className="space-y-2">
                {checklist.map(c => {
                  const fs = docs.filter(d => d.tipo === c.tipo);
                  return (
                    <li key={c.tipo} className="text-[11px]">
                      <p className="flex items-start gap-1.5" style={{ color: fs.length ? AURORA.text : AURORA.textMuted }}>
                        {fs.length ? <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#34d399' }} /> : <span className="w-3 h-3 mt-0.5 flex-shrink-0 rounded-full border" style={{ borderColor: c.obrigatorio ? AURORA.danger : AURORA.textMuted }} />}
                        {c.descricao}
                      </p>
                      {fs.map(f => (
                        <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 pl-4 truncate hover:underline" style={{ color: AURORA.accent }}>
                          <Paperclip className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{f.nome_arquivo}</span>
                        </a>
                      ))}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3">
                <DocumentosEstudoCard produto={estudo.produto} tipoCliente={estudo.tipo_cliente} documentos={docs}
                  onChange={(next) => onAtualizar(estudo, { documentos: next }, 'Documentos anexados')} />
              </div>
            </div>
            {estudo.parecer_tecnico && (
              <div className="rounded-xl p-4 space-y-1" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <p className="text-xs font-bold" style={{ color: AURORA.accent }}>Parecer técnico</p>
                <p className="text-[11px] whitespace-pre-wrap" style={{ color: AURORA.text }}>{estudo.parecer_tecnico}</p>
              </div>
            )}
            <div className="rounded-xl p-4 space-y-2" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
              <p className="text-xs font-bold" style={{ color: AURORA.accent }}>Observações internas</p>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={4} style={{ ...inputStyle, background: AURORA.surface }} className="w-full px-2 py-1.5 text-xs rounded-md focus:outline-none resize-y" />
              <button onClick={() => onAtualizar(estudo, { observacoes_internas: obs }, 'Observações salvas')} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: AURORA.accentDim, color: AURORA.accent }}>Salvar</button>
            </div>
          </div>
        </div>
      </div>

      {editando && (
        <EditarEstudoModal estudo={estudo} onClose={() => setEditando(false)}
          onSalvar={async (dados) => { await onAtualizar(estudo, dados, 'Estudo atualizado'); setEditando(false); }} />
      )}
    </Modal>
  );
}