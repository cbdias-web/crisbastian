import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, CheckCircle, XCircle, TrendingUp, Loader2, Eye, Clock, Send, AlertCircle, Search, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { fmtBRL } from './usePrecificacaoConfig';
import useIsAdmin from '@/hooks/useIsAdmin';

const STATUS_CONFIG = {
  rascunho:      { label: 'Rascunho',       color: 'bg-gray-100 text-gray-600',   icon: FileText },
  enviada:       { label: 'Enviada',         color: 'bg-blue-100 text-blue-700',   icon: Send },
  em_negociacao: { label: 'Em Negociacao',   color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  aceita:        { label: 'Aceita',          color: 'bg-green-100 text-green-700', icon: CheckCircle },
  recusada:      { label: 'Recusada',        color: 'bg-red-100 text-red-700',     icon: XCircle },
};

const PRODUTOS_CORES = {
  'Dolarize': '#b45309', 'Offshore': '#0e7490', 'Canal Bancario': '#6d28d9',
  'Conta Internacional': '#1a3a6b', 'Seguro Garantia': '#be123c',
};

const TODOS_PRODUTOS = ['Dolarize', 'Offshore', 'Canal Bancario', 'Conta Internacional', 'Seguro Garantia'];

function Badge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.rascunho;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

/* ── Modal de edição (somente admin) ───────────────────────────────────── */
function EditarModal({ proposta, vendedores, onSave, onClose }) {
  const [form, setForm] = useState({
    vendedor_id:   proposta.vendedor_id   || '',
    vendedor_nome: proposta.vendedor_nome || '',
    status:        proposta.status        || 'rascunho',
    observacoes:   proposta.observacoes   || '',
    validade_dias: proposta.validade_dias || 15,
  });
  const [saving, setSaving] = useState(false);

  function setVendedor(id) {
    const v = vendedores.find(v => v.id === id);
    setForm(f => ({ ...f, vendedor_id: id, vendedor_nome: v?.nome || '' }));
  }

  async function salvar() {
    setSaving(true);
    await onSave(proposta.id, form);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Editar Proposta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Consultor / Gerente</label>
            <select value={form.vendedor_id} onChange={e => setVendedor(e.target.value)}
              className="w-full border border-gray-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-400">
              <option value="">— Selecionar —</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-400">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observacoes</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3}
              className="w-full border border-gray-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-400 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition">
              Cancelar
            </button>
            <button onClick={salvar} disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Modal de detalhe ──────────────────────────────────────────────────── */
function DetalheModal({ proposta, onClose, onAceitar, onStatus }) {
  const [aceitando, setAceitando] = useState(false);

  async function aceitar() {
    setAceitando(true);
    await onAceitar(proposta);
    setAceitando(false);
    onClose();
  }

  const vencida = proposta.data_validade && new Date(proposta.data_validade) < new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="font-bold text-gray-900">Proposta — {proposta.produto}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">{proposta.cliente_nome}</p>
              {proposta.cpf_cnpj && <p className="text-xs text-gray-400">{proposta.cpf_cnpj}</p>}
            </div>
            <Badge status={proposta.status} />
          </div>

          {vencida && proposta.status !== 'aceita' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Proposta vencida em {new Date(proposta.data_validade).toLocaleDateString('pt-BR')}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-400">Consultor</p>
              <p className="font-semibold text-gray-800">{proposta.vendedor_nome || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-400">Validade</p>
              <p className="font-semibold text-gray-800">{proposta.data_validade ? new Date(proposta.data_validade).toLocaleDateString('pt-BR') : '—'}</p>
            </div>
            {proposta.valor_estimado > 0 && (
              <div className="bg-blue-50 rounded-xl p-3 col-span-2">
                <p className="text-blue-500">Valor Estimado</p>
                <p className="font-bold text-blue-800 text-base">{fmtBRL(proposta.valor_estimado)}</p>
              </div>
            )}
          </div>

          {(proposta.propostas || []).map((p, i) => (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 text-xs font-bold text-gray-700">{p.titulo}</div>
              <div className="divide-y divide-gray-100">
                {(p.items || []).filter(Boolean).map((item, j) => (
                  <div key={j} className={`flex justify-between px-3 py-1.5 text-xs ${item.highlight ? 'bg-blue-50 font-semibold' : ''}`}>
                    <span className="text-gray-500">{item.label}</span>
                    <span className="text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {proposta.observacoes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
              <strong>Obs:</strong> {proposta.observacoes}
            </div>
          )}

          <div className="space-y-2">
            {proposta.status !== 'aceita' && proposta.status !== 'recusada' && (
              <div className="flex gap-2">
                {proposta.status === 'rascunho' && (
                  <button onClick={() => onStatus(proposta.id, 'enviada')}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition">
                    Marcar como Enviada
                  </button>
                )}
                {proposta.status === 'enviada' && (
                  <button onClick={() => onStatus(proposta.id, 'em_negociacao')}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition">
                    Em Negociacao
                  </button>
                )}
                <button onClick={() => onStatus(proposta.id, 'recusada')}
                  className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition">
                  Recusada
                </button>
              </div>
            )}

            {proposta.status !== 'aceita' && !proposta.pipeline_id && (
              <button onClick={aceitar} disabled={aceitando}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-60">
                {aceitando ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                {aceitando ? 'Criando no Pipeline...' : 'Proposta Aceita - Enviar ao Pipeline'}
              </button>
            )}

            {proposta.pipeline_id && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Negociacao criada no Pipeline com sucesso.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────────────────── */
export default function PropostasGeradas() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();

  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroProduto, setFiltroProduto] = useState('todos');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState(null);
  const [editando, setEditando] = useState(null);

  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ['propostas-precificacao'],
    queryFn: () => base44.entities.PropostaPrecificacao.list('-created_date', 200),
    refetchInterval: 30000,
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-ativos'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PropostaPrecificacao.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propostas-precificacao'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PropostaPrecificacao.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propostas-precificacao'] }),
  });

  async function handleAceitar(proposta) {
    const pipeline = await base44.entities.Pipeline.create({
      cliente_nome: proposta.cliente_nome,
      cliente_id: proposta.cliente_id || '',
      produto: proposta.produto,
      valor_estimado: proposta.valor_estimado || 0,
      temperatura: 'Quente',
      origem: 'Carteira',
      vendedor_id: proposta.vendedor_id || '',
      vendedor_nome: proposta.vendedor_nome || '',
      descricao: `Proposta aceita via Simulador de Precificacao.\nProduto: ${proposta.produto}\nGerada em: ${new Date(proposta.created_date).toLocaleDateString('pt-BR')}`,
    });
    await base44.entities.PropostaPrecificacao.update(proposta.id, { status: 'aceita', pipeline_id: pipeline.id });
    qc.invalidateQueries({ queryKey: ['propostas-precificacao'] });
    toast.success('Negociacao criada no Pipeline!');
  }

  async function handleStatus(id, status) {
    await updateMutation.mutateAsync({ id, data: { status } });
    toast.success('Status atualizado!');
    setSelecionada(prev => prev ? { ...prev, status } : null);
  }

  async function handleSalvarEdicao(id, form) {
    await updateMutation.mutateAsync({ id, data: form });
    toast.success('Proposta atualizada!');
  }

  async function handleExcluir(id) {
    if (!confirm('Excluir esta proposta? Esta acao nao pode ser desfeita.')) return;
    await deleteMutation.mutateAsync(id);
    toast.success('Proposta excluida.');
  }

  // Extrai lista de vendedores únicos das propostas para o filtro
  const vendedoresNasPropostas = [...new Set(propostas.map(p => p.vendedor_nome).filter(Boolean))].sort();

  // Filtragem
  const filtradas = propostas.filter(p => {
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false;
    if (filtroProduto !== 'todos' && p.produto !== filtroProduto) return false;
    if (filtroVendedor && p.vendedor_nome !== filtroVendedor) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return (
        (p.cliente_nome || '').toLowerCase().includes(q) ||
        (p.cpf_cnpj || '').toLowerCase().includes(q) ||
        (p.vendedor_nome || '').toLowerCase().includes(q) ||
        (p.produto || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    todos: propostas.length,
    rascunho: propostas.filter(p => p.status === 'rascunho').length,
    enviada: propostas.filter(p => p.status === 'enviada').length,
    em_negociacao: propostas.filter(p => p.status === 'em_negociacao').length,
    aceita: propostas.filter(p => p.status === 'aceita').length,
    recusada: propostas.filter(p => p.status === 'recusada').length,
  };

  return (
    <div className="space-y-4">

      {/* Filtros de status */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'todos', label: 'Todas' },
          { key: 'rascunho', label: 'Rascunho' },
          { key: 'enviada', label: 'Enviadas' },
          { key: 'em_negociacao', label: 'Em Negociacao' },
          { key: 'aceita', label: 'Aceitas' },
          { key: 'recusada', label: 'Recusadas' },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltroStatus(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              filtroStatus === f.key ? 'bg-[#0a1f35] text-white border-[#0a1f35]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {f.label}
            {counts[f.key] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filtroStatus === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Barra de busca e filtros adicionais */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por cliente, CPF/CNPJ, consultor ou produto..."
            className="w-full border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)}
          className="border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-400 bg-white min-w-[160px]">
          <option value="todos">Todos os produtos</option>
          {TODOS_PRODUTOS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
          className="border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-400 bg-white min-w-[180px]">
          <option value="">Todos os gerentes</option>
          {vendedoresNasPropostas.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {(busca || filtroProduto !== 'todos' || filtroVendedor) && (
          <button onClick={() => { setBusca(''); setFiltroProduto('todos'); setFiltroVendedor(''); }}
            className="flex items-center gap-1 px-3 py-2.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl bg-white transition">
            <X className="w-3.5 h-3.5" /> Limpar
          </button>
        )}
      </div>

      {/* Contador de resultados */}
      {filtradas.length !== propostas.length && (
        <p className="text-xs text-gray-400">{filtradas.length} proposta{filtradas.length !== 1 ? 's' : ''} encontrada{filtradas.length !== 1 ? 's' : ''}</p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma proposta encontrada</p>
          <p className="text-xs text-gray-400 mt-1">Ajuste os filtros ou gere propostas usando os simuladores.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtradas.map(p => {
            const cor = PRODUTOS_CORES[p.produto] || '#1a3a6b';
            const vencida = p.data_validade && new Date(p.data_validade) < new Date() && p.status !== 'aceita';
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
                <div className="h-1.5" style={{ background: cor }} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{p.produto}</p>
                      <p className="font-bold text-gray-900 text-sm mt-0.5 leading-tight truncate">{p.cliente_nome}</p>
                      {p.vendedor_nome && (
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{p.vendedor_nome}</p>
                      )}
                    </div>
                    <Badge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span>{new Date(p.created_date).toLocaleDateString('pt-BR')}</span>
                    {p.valor_estimado > 0 && <span className="font-semibold text-gray-700">{fmtBRL(p.valor_estimado)}</span>}
                  </div>
                  {vencida && (
                    <div className="text-[10px] text-red-500 font-semibold mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Vencida em {new Date(p.data_validade).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setSelecionada(p)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition border border-gray-100">
                      <Eye className="w-3.5 h-3.5" /> Detalhes
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => setEditando(p)} title="Editar"
                          className="flex items-center justify-center w-9 h-9 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-100 transition">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleExcluir(p.id)} title="Excluir"
                          className="flex items-center justify-center w-9 h-9 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl border border-red-100 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selecionada && (
        <DetalheModal
          proposta={selecionada}
          onClose={() => setSelecionada(null)}
          onAceitar={handleAceitar}
          onStatus={handleStatus}
        />
      )}

      {editando && isAdmin && (
        <EditarModal
          proposta={editando}
          vendedores={vendedores}
          onSave={handleSalvarEdicao}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}