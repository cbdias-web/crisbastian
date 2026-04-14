import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, X, Pencil, Trash2, FileText, ShoppingCart, UserPlus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const TEMPERATURAS = [
  { value: 'Frio', dot: 'bg-blue-500', emoji: '🧊' },
  { value: 'Morno', dot: 'bg-yellow-500', emoji: '🌤️' },
  { value: 'Quente', dot: 'bg-orange-500', emoji: '🔥' },
  { value: 'Fechado', dot: 'bg-emerald-500', emoji: '✅' },
  { value: 'Perdido', dot: 'bg-red-400', emoji: '❌' },
];

const ORIGENS = ['Carteira', 'Lead', 'Indicação', 'Prospecção Ativa', 'Outro'];

const fmtVal = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00';
const fmtDate = (d) => d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—';

const EMPTY = {
  cliente_nome: '', cliente_cpf_cnpj: '', cliente_telefone: '', cliente_id: '',
  produto: '', valor_estimado: '', data_prevista: '', temperatura: 'Frio',
  descricao: '', origem: 'Prospecção Ativa', proximo_contato: '', observacao: '',
  vendedor_id: '', vendedor_nome: '',
  tipo_contato: 'Ligação', resultado_contato: 'Neutro', data_contato: new Date().toISOString().split('T')[0],
};

// ── Componente de busca de cliente com autocomplete ──────────────────────────
function ClienteSearch({ clientes, form, setForm }) {
  const [query, setQuery] = useState(form.cliente_nome || '');
  const [open, setOpen] = useState(false);
  const [novoCliente, setNovoCliente] = useState(false);
  const ref = useRef(null);

  // Só sincroniza quando o form é resetado (cliente_nome vai a '')
  useEffect(() => {
    if (!form.cliente_nome) setQuery('');
  }, [form.cliente_nome]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.length >= 2
    ? clientes.filter(c =>
        c.nome?.toLowerCase().includes(query.toLowerCase()) ||
        (c.cpf_cnpj && c.cpf_cnpj.includes(query))
      ).slice(0, 10)
    : [];

  const selectCliente = (c) => {
    setQuery(c.nome);
    setForm(f => ({
      ...f,
      cliente_nome: c.nome,
      cliente_id: c.id,
      cliente_cpf_cnpj: c.cpf_cnpj || f.cliente_cpf_cnpj,
      cliente_telefone: c.telefone || f.cliente_telefone,
    }));
    setOpen(false);
    setNovoCliente(false);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setForm(f => ({ ...f, cliente_nome: val, cliente_id: '' }));
    setOpen(true);
    setNovoCliente(false);
  };

  const handleNovoCliente = () => {
    setNovoCliente(true);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Busque ou digite o nome do cliente"
          required
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
        />
        {form.cliente_id && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
            <Check className="w-4 h-4" />
          </span>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.slice(0, 8).map(c => (
              <button key={c.id} type="button" onClick={() => selectCliente(c)}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition text-sm border-b border-gray-50 last:border-0">
                <p className="font-medium text-gray-800">{c.nome}</p>
                {c.cpf_cnpj && <p className="text-[10px] text-gray-400">{c.cpf_cnpj}</p>}
              </button>
            ))
          ) : (
            <div className="px-3 py-2.5 text-sm text-gray-400 text-center">
              Nenhum cliente encontrado
            </div>
          )}
          <button type="button" onClick={handleNovoCliente}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition border-t border-gray-100 font-medium">
            <UserPlus className="w-3.5 h-3.5" /> Inserir como novo cliente
          </button>
        </div>
      )}

      {novoCliente && (
        <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center gap-2">
          <UserPlus className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            <strong>"{query}"</strong> será salvo como novo cliente na base ao confirmar.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filtroTemp, setFiltroTemp] = useState('Todos');
  const [filtroVendedor, setFiltroVendedor] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [convertendo, setConvertendo] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: negociosRaw = [] } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => base44.entities.Pipeline.list('-created_date', 500),
    enabled: !!user,
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-pipeline'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: isAdmin,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-pipeline'],
    queryFn: () => base44.entities.Cliente.list('nome', 5000),
    enabled: !!user,
    staleTime: 60000,
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-pipeline'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }, 'nome'),
    enabled: !!user,
  });

  const negocios = negociosRaw.filter(n => {
    if (!isAdmin) return n.vendedor_id === user?.id || n.created_by === user?.email;
    return true;
  });

  const negociosFiltrados = negocios.filter(n => {
    const tempOk = filtroTemp === 'Todos' || n.temperatura === filtroTemp;
    const vendOk = filtroVendedor === 'Todos' || n.vendedor_nome === filtroVendedor;
    const buscaOk = !busca || n.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) || n.produto?.toLowerCase().includes(busca.toLowerCase());
    return tempOk && vendOk && buscaOk;
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let pipeline;
      if (editing) {
        pipeline = await base44.entities.Pipeline.update(editing.id, data);
      } else {
        pipeline = await base44.entities.Pipeline.create(data);
      }
      // Registrar interação no histórico do cliente (se existir cliente vinculado)
      if (data.cliente_id && data.descricao?.trim()) {
        try {
          await base44.entities.InteracaoCliente.create({
            cliente_id: data.cliente_id,
            cliente_nome: data.cliente_nome || '',
            vendedor_id: data.vendedor_id || '',
            vendedor_nome: data.vendedor_nome || '',
            tipo: data.tipo_contato || 'Outro',
            descricao: data.descricao,
            data_interacao: data.data_contato || new Date().toISOString().split('T')[0],
            proximo_contato: data.proximo_contato || '',
            resultado: data.resultado_contato || 'Neutro',
          });
        } catch (e) { /* silently fail */ }
      }
      // Se tem próximo contato, criar entrada na AgendaContato
      if (data.proximo_contato && data.cliente_id && data.vendedor_id) {
        try {
          const agendas = await base44.entities.AgendaContato.filter({ lead_id: data.cliente_id, data_agendada: data.proximo_contato });
          if (agendas.length === 0) {
            await base44.entities.AgendaContato.create({
              lead_id: data.cliente_id,
              lead_nome: data.cliente_nome || '',
              lead_cpf_cnpj: data.cliente_cpf_cnpj || '',
              lead_telefone: data.cliente_telefone || '',
              vendedor_id: data.vendedor_id,
              vendedor_nome: data.vendedor_nome || '',
              data_agendada: data.proximo_contato,
              posicao_dia: 0,
              status: 'pendente',
              resultado: '',
            });
          }
        } catch (e) { /* silently fail */ }
      }
      return pipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pipeline']);
      queryClient.invalidateQueries(['agenda-contatos']);
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
      toast.success(editing ? 'Negócio atualizado!' : 'Negócio adicionado ao pipeline!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pipeline.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['pipeline']); toast.success('Removido do pipeline.'); },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, valor_estimado: parseFloat(form.valor_estimado) || 0 };
    if (!isAdmin && user) {
      data.vendedor_id = user.id;
      data.vendedor_nome = user.nome_tratamento || user.full_name || user.email;
    }
    // Se cliente não existe na base, criar
    if (!data.cliente_id && data.cliente_nome) {
      try {
        const novoC = await base44.entities.Cliente.create({
          nome: data.cliente_nome,
          cpf_cnpj: data.cliente_cpf_cnpj || '',
          telefone: data.cliente_telefone || '',
          vendedor_id: data.vendedor_id || '',
          vendedor_nome: data.vendedor_nome || '',
        });
        data.cliente_id = novoC.id;
        queryClient.invalidateQueries(['clientes-pipeline']);
        toast.success(`Cliente "${data.cliente_nome}" criado na base!`);
      } catch {}
    }
    saveMutation.mutate(data);
  };

  const openEdit = (n) => {
    setEditing(n);
    setForm({ ...EMPTY, ...n, valor_estimado: n.valor_estimado || '' });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  // Converter prospecção em venda e navegar para Vendas
  const converterEmVenda = async (n) => {
    if (!confirm(`Converter "${n.cliente_nome}" em venda? Você será direcionado para a página de Vendas para completar os detalhes.`)) return;
    setConvertendo(n.id);
    try {
      // Cria um rascunho de venda com dados do pipeline
      const vendedorNome = n.vendedor_nome || '';
      const vendedorId = n.vendedor_id || '';
      const novaVenda = await base44.entities.Venda.create({
        produto: n.produto || '',
        assessor_comercial: vendedorNome,
        vendedor_id: vendedorId,
        cliente: n.cliente_nome || '',
        cpf_cnpj: n.cliente_cpf_cnpj || '',
        valor: n.valor_estimado || 0,
        data: new Date().toISOString().split('T')[0],
        observacao: `Originado do Pipeline. ${n.descricao || ''}`.trim(),
      });
      // Marca o pipeline como Fechado
      await base44.entities.Pipeline.update(n.id, { temperatura: 'Fechado' });
      queryClient.invalidateQueries(['pipeline']);
      toast.success('Venda criada! Redirecionando para Vendas...');
      setTimeout(() => navigate('/Vendas'), 1200);
    } catch (err) {
      toast.error('Erro ao converter: ' + err.message);
    }
    setConvertendo(null);
  };

  // KPIs — totais gerais (todos os negócios, sem filtro de gerente/temperatura/busca)
  const totalAtivos = negocios.filter(n => n.temperatura !== 'Perdido').length;
  const valorTotal = negocios.filter(n => n.temperatura !== 'Perdido' && n.temperatura !== 'Fechado').reduce((s, n) => s + (n.valor_estimado || 0), 0);
  const valorFechado = negocios.filter(n => n.temperatura === 'Fechado').reduce((s, n) => s + (n.valor_estimado || 0), 0);
  const totalGeral = negocios.length;
  const vendedoresUnicos = [...new Set(negocios.map(n => n.vendedor_nome).filter(Boolean))];

  // KPIs do gerente selecionado
  const negociosGerente = filtroVendedor !== 'Todos'
    ? negocios.filter(n => n.vendedor_nome === filtroVendedor)
    : null;
  const gerenteAtivos = negociosGerente?.filter(n => n.temperatura !== 'Perdido').length ?? 0;
  const gerenteEmNegociacao = negociosGerente?.filter(n => n.temperatura !== 'Perdido' && n.temperatura !== 'Fechado').reduce((s, n) => s + (n.valor_estimado || 0), 0) ?? 0;
  const gerenteFechados = negociosGerente?.filter(n => n.temperatura === 'Fechado').length ?? 0;
  const gerenteVolumeFechado = negociosGerente?.filter(n => n.temperatura === 'Fechado').reduce((s, n) => s + (n.valor_estimado || 0), 0) ?? 0;

  const gerarRelatorio = () => {
    const dados = negociosFiltrados;
    const totalVal = dados.reduce((s, n) => s + (n.valor_estimado || 0), 0);
    const fechados = dados.filter(n => n.temperatura === 'Fechado');
    const valFechado = fechados.reduce((s, n) => s + (n.valor_estimado || 0), 0);
    const linhas = dados.map(n => `
      <tr>
        <td>${n.cliente_nome || '—'}</td>
        <td>${n.produto || '—'}</td>
        <td>${n.vendedor_nome || '—'}</td>
        <td>${fmtVal(n.valor_estimado)}</td>
        <td>${n.temperatura || '—'}</td>
        <td>${fmtDate(n.data_prevista)}</td>
        <td>${fmtDate(n.proximo_contato)}</td>
        <td>${n.descricao || '—'}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório Pipeline</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#333}.header{background:linear-gradient(135deg,#0f1e35,#1a3150);color:white;padding:20px 24px;border-radius:8px;margin-bottom:20px}.header h1{margin:0;font-size:20px}.header p{margin:4px 0 0;font-size:11px;opacity:.7}.kpis{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;flex:1;min-width:120px}.kpi .val{font-size:18px;font-weight:bold;color:#0f1e35}.kpi .lbl{font-size:10px;color:#64748b;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:11px}thead tr{background:#0f1e35;color:white}th{padding:8px 10px;text-align:left;font-weight:600}td{padding:7px 10px;border-bottom:1px solid #f1f5f9}tr:nth-child(even) td{background:#f8fafc}.footer{margin-top:20px;text-align:center;font-size:10px;color:#94a3b8}@media print{body{padding:10px}}</style>
</head><body>
<div class="header"><h1>Relatório de Pipeline</h1><p>Villela Exchange — Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p></div>
<div class="kpis">
  <div class="kpi"><div class="val">${dados.length}</div><div class="lbl">Negócios</div></div>
  <div class="kpi"><div class="val">${fmtVal(totalVal)}</div><div class="lbl">Em negociação</div></div>
  <div class="kpi"><div class="val">${fechados.length}</div><div class="lbl">Fechados</div></div>
  <div class="kpi"><div class="val">${fmtVal(valFechado)}</div><div class="lbl">Volume fechado</div></div>
</div>
<table><thead><tr><th>Cliente</th><th>Produto</th><th>Gerente</th><th>Valor Est.</th><th>Temperatura</th><th>Prev. Fechamento</th><th>Próx. Contato</th><th>Descrição</th></tr></thead>
<tbody>${linhas}</tbody></table>
<div class="footer">Villela Exchange — Pipeline Comercial</div></body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline Comercial</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie suas prospecções e negociações em andamento</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={gerarRelatorio} className="border-gray-200 text-gray-600 hover:bg-gray-50">
              <FileText className="w-4 h-4 mr-2" /> Relatório PDF
            </Button>
            <Button onClick={openNew} className="bg-[#0f1e35] hover:bg-[#1a3150] text-white">
              <Plus className="w-4 h-4 mr-2" /> Nova Prospecção
            </Button>
          </div>
        </div>

        {/* KPIs — totais gerais */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-teal-50 rounded-2xl p-4 shadow-sm border border-teal-100">
            <p className="text-2xl font-bold text-teal-700">{fmtVal(valorTotal)}</p>
            <p className="text-xs text-teal-600 mt-0.5">Total em negociação</p>
          </div>
          <div className="bg-[#0f1e35] text-white rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold">{totalAtivos}</p>
            <p className="text-xs opacity-70 mt-0.5">Negócios ativos</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-gray-800">{totalGeral}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total de negócios</p>
          </div>
          <div className="bg-teal-50 rounded-2xl p-4 shadow-sm border border-teal-100">
            <p className="text-2xl font-bold text-teal-700">{negocios.filter(n => n.temperatura === 'Fechado').length}</p>
            <p className="text-xs text-teal-600 mt-0.5">Fechados</p>
          </div>
          <div className="bg-teal-50 rounded-2xl p-4 shadow-sm border border-teal-100">
            <p className="text-lg font-bold text-teal-700">{fmtVal(valorFechado)}</p>
            <p className="text-xs text-teal-600 mt-0.5">Volume fechado</p>
          </div>
        </div>

        {/* KPIs do gerente selecionado */}
        {isAdmin && filtroVendedor !== 'Todos' && negociosGerente && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-3">
              📊 Totais de {filtroVendedor}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
                <p className="text-xl font-bold text-indigo-700">{negociosGerente.length}</p>
                <p className="text-[10px] text-indigo-500 mt-0.5">Total negociações</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
                <p className="text-xl font-bold text-indigo-700">{gerenteAtivos}</p>
                <p className="text-[10px] text-indigo-500 mt-0.5">Ativos</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
                <p className="text-sm font-bold text-orange-600">{fmtVal(gerenteEmNegociacao)}</p>
                <p className="text-[10px] text-indigo-500 mt-0.5">Em negociação</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
                <p className="text-sm font-bold text-emerald-600">{fmtVal(gerenteVolumeFechado)}</p>
                <p className="text-[10px] text-indigo-500 mt-0.5">Volume fechado ({gerenteFechados})</p>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar cliente ou produto..."
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] w-48" />
            <div className="flex gap-1.5 flex-wrap">
              {['Todos', ...TEMPERATURAS.map(t => t.value)].map(t => (
                <button key={t} onClick={() => setFiltroTemp(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${filtroTemp === t ? 'bg-[#0f1e35] text-white border-[#0f1e35]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                  {t}
                </button>
              ))}
            </div>
            {isAdmin && (
              <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]">
                <option value="Todos">Todos os gerentes</option>
                {vendedoresUnicos.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            <span className="text-xs text-gray-400 ml-auto">{negociosFiltrados.length} negócio(s)</span>
          </div>
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {TEMPERATURAS.map(temp => {
            const items = negociosFiltrados.filter(n => n.temperatura === temp.value);
            const total = items.reduce((s, n) => s + (n.valor_estimado || 0), 0);
            return (
              <div key={temp.value} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${temp.dot}`} />
                    <span className="text-xs font-semibold text-gray-700">{temp.emoji} {temp.value}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{items.length}</span>
                </div>
                {total > 0 && (
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-[10px] text-gray-500 font-medium">{fmtVal(total)}</p>
                  </div>
                )}
                <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
                  {items.length === 0 && <p className="text-[10px] text-gray-300 text-center py-4">Nenhum negócio</p>}
                  {items.map(n => (
                    <div key={n.id} className="bg-gray-50 rounded-xl p-2.5 hover:bg-blue-50 transition cursor-default group">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-gray-800 leading-tight flex-1">{n.cliente_nome}</p>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                          {/* Converter em venda */}
                          <button
                            onClick={() => converterEmVenda(n)}
                            disabled={convertendo === n.id}
                            title="Converter em venda"
                            className="p-0.5 text-gray-400 hover:text-emerald-600"
                          >
                            {convertendo === n.id
                              ? <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              : <ShoppingCart className="w-3 h-3" />
                            }
                          </button>
                          <button onClick={() => openEdit(n)} title="Editar" className="p-0.5 text-gray-400 hover:text-blue-600">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => { if (confirm('Remover este negócio?')) deleteMutation.mutate(n.id); }} title="Remover" className="p-0.5 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{n.produto}</p>
                      {n.valor_estimado > 0 && <p className="text-[10px] font-bold text-[#1a3150] mt-1">{fmtVal(n.valor_estimado)}</p>}
                      {n.data_prevista && <p className="text-[10px] text-gray-400 mt-0.5">Prev: {fmtDate(n.data_prevista)}</p>}
                      {isAdmin && n.vendedor_nome && <p className="text-[10px] text-blue-500 mt-0.5">{n.vendedor_nome}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-gray-900">{editing ? 'Editar Prospecção' : 'Nova Prospecção'}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {isAdmin && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Gerente / Vendedor</label>
                  <select value={form.vendedor_id} onChange={e => {
                    const v = vendedores.find(x => x.id === e.target.value);
                    setForm(f => ({ ...f, vendedor_id: e.target.value, vendedor_nome: v?.nome || '' }));
                  }} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]">
                    <option value="">Selecione...</option>
                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                  </select>
                </div>
              )}

              {/* Campo cliente com busca */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente / Prospect *</label>
                <ClienteSearch clientes={clientes} form={form} setForm={setForm} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">CPF / CNPJ</label>
                  <input value={form.cliente_cpf_cnpj} onChange={e => setForm(f => ({ ...f, cliente_cpf_cnpj: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Telefone</label>
                  <input value={form.cliente_telefone} onChange={e => setForm(f => ({ ...f, cliente_telefone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Produto *</label>
                  <input value={form.produto} onChange={e => setForm(f => ({ ...f, produto: e.target.value }))}
                    placeholder="Produto em negociação" required list="produtos-list"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
                  <datalist id="produtos-list">
                    {produtos.map(p => <option key={p.id} value={p.nome} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Valor Estimado</label>
                  <input type="number" value={form.valor_estimado} onChange={e => setForm(f => ({ ...f, valor_estimado: e.target.value }))}
                    placeholder="0,00" min="0" step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Temperatura *</label>
                  <select value={form.temperatura} onChange={e => setForm(f => ({ ...f, temperatura: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]">
                    {TEMPERATURAS.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Origem</label>
                  <select value={form.origem} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]">
                    {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Seção Interação — visual igual ao ClienteInteracaoModal */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Registrar Interação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                    <select value={form.tipo_contato} onChange={e => setForm(f => ({ ...f, tipo_contato: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                      {['Ligação','WhatsApp','E-mail','Reunião','Visita','Outro'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Resultado</label>
                    <select value={form.resultado_contato} onChange={e => setForm(f => ({ ...f, resultado_contato: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                      {['Positivo','Neutro','Negativo','Sem resposta'].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Data do contato</label>
                    <input type="date" value={form.data_contato} onChange={e => setForm(f => ({ ...f, data_contato: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Próximo contato <span className="text-indigo-500 font-semibold">(agenda)</span></label>
                    <input type="date" value={form.proximo_contato} disabled={form.resultado_contato === 'Negativo'} onChange={e => setForm(f => ({ ...f, proximo_contato: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150] disabled:opacity-40 disabled:cursor-not-allowed" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Descrição / Próximos Passos</label>
                  <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Descreva o que foi tratado e os próximos passos..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150] resize-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Prev. Fechamento</label>
                  <input type="date" value={form.data_prevista} onChange={e => setForm(f => ({ ...f, data_prevista: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Observações</label>
                  <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                    placeholder="Observações adicionais..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending} className="bg-[#0f1e35] hover:bg-[#1a3150]">
                  {saveMutation.isPending ? 'Salvando...' : editing ? 'Atualizar' : 'Adicionar ao Pipeline'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}