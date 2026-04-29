import React, { useState, useEffect, useRef } from 'react';
import { todayBrasilia, isoNowBrasilia } from '@/lib/dateUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, X, Pencil, Trash2, FileText, ShoppingCart, UserPlus, Check, DollarSign, CalendarClock, LayoutList, Settings, ScrollText } from 'lucide-react';
import ParcelasVincendasModal from '@/components/parcelas/ParcelasVincendasModal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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
  tipo_contato: 'Ligação', resultado_contato: 'Neutro', data_contato: todayBrasilia(),
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
  const [filtroProduto, setFiltroProduto] = useState('Todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [busca, setBusca] = useState('');
  const [convertendo, setConvertendo] = useState(null);
  const [recebenndoParcela, setRecebenndoParcela] = useState(null);
  const [modalReceber, setModalReceber] = useState(null); // parcela a receber
  const [recebimentoForm, setRecebimentoForm] = useState({ data: '', valor: '' });
  const [aba, setAba] = useState('pipeline'); // 'pipeline' | 'parcelas'
  const [showParcelasModal, setShowParcelasModal] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [editandoProduto, setEditandoProduto] = useState(null); // negócio_id que está sendo editado
  const [produtoTemp, setProdutoTemp] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: negociosRaw = [] } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => base44.entities.Pipeline.list('-created_date', 2000),
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

  const { data: parcelasVenda = [] } = useQuery({
    queryKey: ['parcelas-venda-pipeline'],
    queryFn: () => base44.entities.ParcelaVenda.list('-data_vencimento', 1000),
    enabled: !!user,
    staleTime: 30000,
  });

  // Apenas pendentes para KPIs e tabela inline
  const parcelasVendaPendentes = parcelasVenda.filter(p => {
    if (p.status !== 'pendente') return false;
    if (!isAdmin) return true; // não-admin já vê só as suas pela query
    if (filtroVendedor === 'Todos') return true;
    const vend = vendedores.find(v => v.nome === filtroVendedor);
    return vend ? p.vendedor_id === vend.id : p.vendedor_nome?.toLowerCase() === filtroVendedor.toLowerCase();
  });

  // Set de pipeline_ids que são parcelas pendentes
  const parcelaPipelineIds = new Set(parcelasVendaPendentes.map(p => p.pipeline_id).filter(Boolean));

  const negocios = negociosRaw.filter(n => {
    if (!isAdmin) return n.vendedor_id === user?.id || n.created_by === user?.email;
    return true;
  });

  const produtosUnicos = [...new Set(negocios.map(n => n.produto).filter(Boolean))].sort();

  const negociosFiltrados = negocios.filter(n => {
    const tempOk = filtroTemp === 'Todos' || n.temperatura === filtroTemp;
    const vendOk = filtroVendedor === 'Todos' ||
      n.vendedor_nome?.toLowerCase() === filtroVendedor.toLowerCase() ||
      n.vendedor_id === vendedores.find(v => v.nome === filtroVendedor)?.id;
    const prodOk = filtroProduto === 'Todos' || n.produto === filtroProduto;
    const dataOk = (!filtroDataInicio || (n.data_prevista && n.data_prevista >= filtroDataInicio)) &&
                   (!filtroDataFim || (n.data_prevista && n.data_prevista <= filtroDataFim));
    const buscaOk = !busca || n.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) || n.produto?.toLowerCase().includes(busca.toLowerCase());
    return tempOk && vendOk && prodOk && dataOk && buscaOk;
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

  const moveTemperaturaMutation = useMutation({
    mutationFn: ({ id, temperatura }) => base44.entities.Pipeline.update(id, { temperatura }),
    onSuccess: () => {
      queryClient.invalidateQueries(['pipeline']);
    },
  });

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    const novaTemp = destination.droppableId;
    moveTemperaturaMutation.mutate({ id: draggableId, temperatura: novaTemp });
    toast.success(`Movido para "${novaTemp}"`);
  };

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

  const salvarProdutoEditado = async (negocioId, novoProduto) => {
    try {
      await base44.entities.Pipeline.update(negocioId, { produto: novoProduto });
      queryClient.invalidateQueries(['pipeline']);
      setEditandoProduto(null);
      toast.success('Produto atualizado!');
    } catch (err) {
      toast.error('Erro ao atualizar: ' + err.message);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  // Receber parcela de venda parcelada
  const receberParcela = async (n) => {
    if (!confirm(`Confirmar recebimento da parcela de ${fmtVal(n.valor_estimado)} de "${n.cliente_nome}"? Uma venda será criada e ela contará na meta do mês.`)) return;
    setRecebenndoParcela(n.id);
    try {
      // Buscar a ParcelaVenda vinculada a este pipeline
      const parcelas = await base44.entities.ParcelaVenda.filter({ pipeline_id: n.id });
      const parcela = parcelas[0];

      const hoje = todayBrasilia();

      // Criar venda para contar na meta
      const novaVenda = await base44.entities.Venda.create({
        produto: parcela?.produto || n.produto || '',
        assessor_comercial: parcela?.vendedor_nome || n.vendedor_nome || '',
        vendedor_id: parcela?.vendedor_id || n.vendedor_id || '',
        cliente: n.cliente_nome || '',
        cpf_cnpj: n.cliente_cpf_cnpj || parcela?.cliente_cpf_cnpj || '',
        valor: n.valor_estimado || 0,
        data: hoje,
        forma_pagamento: parcela?.forma_pagamento || '',
        percentual_comissao: parcela?.percentual_comissao || 0,
        indicadores: parcela?.indicadores || [],
        observacao: `Parcela recebida — ${n.produto}`,
        num_parcelas: 1,
        valor_total_contrato: n.valor_estimado,
      });

      // Criar comissão do vendedor sobre a parcela
      if ((parcela?.vendedor_id || n.vendedor_id) && parcela?.percentual_comissao) {
        await base44.entities.Comissao.create({
          venda_id: novaVenda.id,
          vendedor_id: parcela.vendedor_id,
          vendedor_nome: parcela.vendedor_nome,
          valor_venda: n.valor_estimado,
          percentual: parcela.percentual_comissao,
          valor_comissao: (n.valor_estimado * parcela.percentual_comissao) / 100,
          data_venda: hoje,
          pago: false,
        });
      }

      // Atualizar ParcelaVenda como recebida
      if (parcela) {
        await base44.entities.ParcelaVenda.update(parcela.id, {
          status: 'recebida',
          data_recebimento: hoje,
          venda_gerada_id: novaVenda.id,
        });
      }

      // Marcar o pipeline como Fechado
      await base44.entities.Pipeline.update(n.id, { temperatura: 'Fechado' });

      queryClient.invalidateQueries(['pipeline']);
      queryClient.invalidateQueries(['vendas']);
      queryClient.invalidateQueries(['comissoes']);
      toast.success('Parcela recebida! Venda registrada e meta atualizada.');
    } catch (err) {
      toast.error('Erro ao registrar recebimento: ' + err.message);
    }
    setRecebenndoParcela(null);
  };

  // Produtos que seguem o fluxo de Contratos (não vão direto para Vendas)
  const PRODUTOS_CONTRATO = ['CONTA GLOBAL', 'CONTA INTERNACIONAL', 'DOLARIZE AQUI'];
  const isProdutoContrato = (produto) => {
    if (!produto) return false;
    const p = produto.toUpperCase();
    return p.includes('CONTA GLOBAL') || p.includes('CONTA INTERNACIONAL') || p.includes('DOLARIZE');
  };

  // Converter prospecção: produtos de contrato → aba Contratos; demais → aba Vendas
  const converterEmVenda = async (n) => {
    const ehContrato = isProdutoContrato(n.produto);

    if (ehContrato) {
      if (!confirm(`"${n.cliente_nome}" negocia um produto que requer contrato (${n.produto}). Um contrato em rascunho será criado e você será direcionado para a aba Contratos.`)) return;
      setConvertendo(n.id);
      try {
        // Buscar dados do cliente para pré-preencher o contrato
        let clienteData = {};
        if (n.cliente_id) {
          try {
            const c = await base44.entities.Cliente.get(n.cliente_id);
            clienteData = {
              nome: c.nome || n.cliente_nome || '',
              cpf_cnpj: c.cpf_cnpj || n.cliente_cpf_cnpj || '',
              telefone: c.telefone || n.cliente_telefone || '',
              email: c.email || '',
              cidade: c.cidade || '',
              estado: c.estado || '',
              cliente_id: c.id,
            };
          } catch {}
        }

        // Criar contrato em rascunho com dados do pipeline
        await base44.entities.Contrato.create({
          tipo: n.produto,
          nome: clienteData.nome || n.cliente_nome || '',
          cpf_cnpj: clienteData.cpf_cnpj || n.cliente_cpf_cnpj || '',
          telefone: clienteData.telefone || n.cliente_telefone || '',
          email: clienteData.email || '',
          cidade: clienteData.cidade || '',
          estado: clienteData.estado || '',
          cliente_id: clienteData.cliente_id || n.cliente_id || '',
          pipeline_id: n.id,
          vendedor_id: n.vendedor_id || '',
          vendedor_nome: n.vendedor_nome || '',
          valor_total: n.valor_estimado || 0,
          valor_adesao: n.valor_estimado || 0,
          data_contrato: todayBrasilia(),
          status: 'rascunho',
          observacoes: n.descricao || '',
        });

        // Marca o pipeline como Fechado
        await base44.entities.Pipeline.update(n.id, { temperatura: 'Fechado' });
        queryClient.invalidateQueries(['pipeline']);
        toast.success('Contrato criado! Redirecionando para Contratos...');
        setTimeout(() => navigate('/Contratos'), 1000);
      } catch (err) {
        toast.error('Erro: ' + err.message);
      }
      setConvertendo(null);
      return;
    }

    // Fluxo normal: criar venda e ir para Vendas
    if (!confirm(`Converter "${n.cliente_nome}" em venda? Você será direcionado para a página de Vendas para completar os detalhes.`)) return;
    setConvertendo(n.id);
    try {
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
      await base44.entities.Pipeline.update(n.id, { temperatura: 'Fechado' });
      queryClient.invalidateQueries(['pipeline']);
      toast.success('Venda criada! Redirecionando para Vendas...');
      setTimeout(() => navigate('/Vendas'), 1200);
    } catch (err) {
      toast.error('Erro ao converter: ' + err.message);
    }
    setConvertendo(null);
  };

  // KPI parcelas pendentes
  const totalParcelasPendentes = parcelasVendaPendentes.length;
  const valorParcelasPendentes = parcelasVendaPendentes.reduce((s, p) => s + (p.valor_parcela || 0), 0);

  // KPIs — totais gerais (todos os negócios, sem filtro de gerente/temperatura/busca)
  const totalAtivos = negocios.filter(n => n.temperatura !== 'Perdido').length;
  const temFiltroPeriodo = !!(filtroDataInicio || filtroDataFim);
  const baseKpiValor = temFiltroPeriodo ? negociosFiltrados : negocios;
  const valorTotal = baseKpiValor.filter(n => n.temperatura !== 'Perdido' && n.temperatura !== 'Fechado').reduce((s, n) => s + (n.valor_estimado || 0), 0);
  const valorFechado = negocios.filter(n => n.temperatura === 'Fechado').reduce((s, n) => s + (n.valor_estimado || 0), 0);
  const totalGeral = negocios.length;
  const vendedoresUnicos = [...new Set(negocios.map(n => n.vendedor_nome).filter(Boolean))];

  // KPIs do gerente selecionado
  const vendedorSelecionado = vendedores.find(v => v.nome === filtroVendedor);
  const negociosGerente = filtroVendedor !== 'Todos'
    ? negocios.filter(n =>
        n.vendedor_nome?.toLowerCase() === filtroVendedor.toLowerCase() ||
        (vendedorSelecionado && n.vendedor_id === vendedorSelecionado.id)
      )
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
            {/* Abas */}
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setAba('pipeline')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition ${aba === 'pipeline' ? 'bg-[#0f1e35] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <LayoutList className="w-4 h-4" /> Pipeline
              </button>
              <button onClick={() => setAba('parcelas')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition relative ${aba === 'parcelas' ? 'bg-[#0f1e35] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <CalendarClock className="w-4 h-4" /> Parcelas Vincendas
                {totalParcelasPendentes > 0 && (
                  <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${aba === 'parcelas' ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'}`}>
                    {totalParcelasPendentes}
                  </span>
                )}
              </button>
            </div>
            <Button variant="outline" onClick={gerarRelatorio} className="border-gray-200 text-gray-600 hover:bg-gray-50">
              <FileText className="w-4 h-4 mr-2" /> Relatório PDF
            </Button>
            <Button onClick={openNew} className="bg-[#0f1e35] hover:bg-[#1a3150] text-white">
              <Plus className="w-4 h-4 mr-2" /> Nova Prospecção
            </Button>
          </div>
        </div>

        {/* KPI Parcelas a Receber */}
        {totalParcelasPendentes > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">💰 Parcelas a Receber</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{fmtVal(valorParcelasPendentes)}</p>
              <p className="text-xs text-amber-600 mt-0.5">{totalParcelasPendentes} parcela(s) pendente(s) no Pipeline</p>
            </div>
            <DollarSign className="w-10 h-10 text-amber-300 flex-shrink-0" />
          </div>
        )}

        {/* KPIs — totais gerais */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-teal-50 rounded-2xl p-4 shadow-sm border border-teal-100">
            <p className="text-2xl font-bold text-teal-700">{fmtVal(valorTotal)}</p>
            <p className="text-xs text-teal-600 mt-0.5">
              Total em negociação{temFiltroPeriodo ? <span className="ml-1 text-[10px] bg-teal-200 text-teal-800 px-1.5 py-0.5 rounded-full font-semibold">período</span> : ''}
            </p>
          </div>
          <div className="bg-teal-50 rounded-2xl p-4 shadow-sm border border-teal-100">
            <p className="text-2xl font-bold text-teal-700">{totalAtivos}</p>
            <p className="text-xs text-teal-600 mt-0.5">Negócios ativos</p>
          </div>
          <div className="bg-teal-50 rounded-2xl p-4 shadow-sm border border-teal-100">
            <p className="text-2xl font-bold text-teal-700">{totalGeral}</p>
            <p className="text-xs text-teal-600 mt-0.5">Total de negócios</p>
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
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-2">
              📊 Totais de {filtroVendedor}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="bg-white rounded-xl p-2.5 border border-indigo-100 text-center">
                <p className="text-lg font-bold text-indigo-700">{negociosGerente.length}</p>
                <p className="text-[10px] text-indigo-500 mt-0.5">Total negociações</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-indigo-100 text-center">
                <p className="text-lg font-bold text-indigo-700">{gerenteAtivos}</p>
                <p className="text-[10px] text-indigo-500 mt-0.5">Ativos</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-indigo-100 text-center">
                <p className="text-sm font-bold text-orange-600">{fmtVal(gerenteEmNegociacao)}</p>
                <p className="text-[10px] text-indigo-500 mt-0.5">Em negociação</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-indigo-100 text-center">
                <p className="text-sm font-bold text-emerald-600">{fmtVal(gerenteVolumeFechado)}</p>
                <p className="text-[10px] text-indigo-500 mt-0.5">Volume fechado ({gerenteFechados})</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-200 text-center">
                <p className="text-sm font-bold text-amber-600">
                  {fmtVal(parcelasVendaPendentes.filter(p => {
                    const vend = vendedores.find(v => v.nome === filtroVendedor);
                    return vend && p.vendedor_id === vend.id;
                  }).reduce((s, p) => s + (p.valor_parcela || 0), 0))}
                </p>
                <p className="text-[10px] text-amber-600 mt-0.5 font-medium">
                  💰 Parcelas a receber ({parcelasVendaPendentes.filter(p => {
                    const vend = vendedores.find(v => v.nome === filtroVendedor);
                    return vend && p.vendedor_id === vend.id;
                  }).length})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          {/* Linha 1: Busca + Temperatura + Gerente */}
          <div className="flex flex-wrap gap-4 items-end">
            {/* Busca */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Buscar</span>
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Cliente ou produto..."
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] w-44" />
            </div>

            {/* Temperatura */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</span>
              <div className="flex gap-1.5 flex-wrap">
                {['Todos', ...TEMPERATURAS.map(t => t.value)].map(t => (
                  <button key={t} onClick={() => setFiltroTemp(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${filtroTemp === t ? 'bg-[#0f1e35] text-white border-[#0f1e35]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Gerente (admin only) */}
            {isAdmin && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Gerente</span>
                <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
                  className={`px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:border-[#1a3150] font-medium ${filtroVendedor !== 'Todos' ? 'border-[#1a3150] bg-[#0f1e35]/5 text-[#0f1e35]' : 'border-gray-200 text-gray-700'}`}>
                  <option value="Todos">Todos os gerentes</option>
                  {vendedores.length > 0
                    ? vendedores.map(v => <option key={v.id} value={v.nome}>{v.nome}</option>)
                    : vendedoresUnicos.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}

            {/* Contador */}
            <div className="ml-auto flex flex-col items-end gap-0.5 pb-0.5">
              <span className="text-xs font-bold text-gray-700">{negociosFiltrados.length} negócio(s)</span>
              {filtroVendedor !== 'Todos' && aba === 'parcelas' && (
                <span className="text-[10px] text-amber-600 font-semibold">{parcelasVendaPendentes.length} parcela(s)</span>
              )}
            </div>
          </div>

          {/* Linha 2: Produto + Período */}
          <div className="flex flex-wrap gap-4 items-end mt-3 pt-3 border-t border-gray-100">
            {/* Produto */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Produto</span>
              <select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)}
                className={`px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:border-[#1a3150] ${filtroProduto !== 'Todos' ? 'border-[#1a3150] bg-[#0f1e35]/5 text-[#0f1e35] font-medium' : 'border-gray-200 text-gray-700'}`}>
                <option value="Todos">Todos os produtos</option>
                {produtosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Período */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Prev. Efetivação</span>
              <div className="flex items-center gap-2">
                <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
                <span className="text-xs text-gray-400 font-medium">até</span>
                <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
              </div>
            </div>

            {/* Limpar filtros secundários */}
            {(filtroDataInicio || filtroDataFim || filtroProduto !== 'Todos' || busca || filtroTemp !== 'Todos' || filtroVendedor !== 'Todos') && (
              <button
                onClick={() => { setFiltroDataInicio(''); setFiltroDataFim(''); setFiltroProduto('Todos'); setBusca(''); setFiltroTemp('Todos'); setFiltroVendedor('Todos'); }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition">
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* ABA PARCELAS VINCENDAS */}
        {aba === 'parcelas' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-amber-500" /> Parcelas Vincendas
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{parcelasVendaPendentes.length} parcela(s) pendente(s) · Total: {fmtVal(valorParcelasPendentes)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowParcelasModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0f1e35] text-white rounded-lg hover:bg-[#1a3150] transition"
                >
                  <Settings className="w-3.5 h-3.5" /> Gerenciar / Editar
                </button>
                <button
                  onClick={async () => {
                    setSincronizando(true);
                    try {
                      const res = await base44.functions.invoke('sincronizarParcelasVendas', {});
                      toast.success(res.data?.message || 'Parcelas sincronizadas!');
                      queryClient.invalidateQueries(['parcelas-venda-pipeline']);
                    } catch (e) {
                      toast.error('Erro ao sincronizar: ' + e.message);
                    }
                    setSincronizando(false);
                  }}
                  disabled={sincronizando}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {sincronizando
                    ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                    : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                  }
                  {sincronizando ? 'Sincronizando...' : 'Atualizar'}
                </button>
              </div>
            </div>
            {parcelasVendaPendentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <CalendarClock className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma parcela vincenda encontrada</p>
                <p className="text-xs mt-1">Parcelas de vendas parceladas aparecem aqui</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left font-semibold">Parcela</th>
                      <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                      <th className="px-4 py-3 text-left font-semibold">Produto</th>
                      <th className="px-4 py-3 text-left font-semibold">Vendedor</th>
                      <th className="px-4 py-3 text-left font-semibold">Vencimento</th>
                      <th className="px-4 py-3 text-right font-semibold">Valor</th>
                      <th className="px-4 py-3 text-center font-semibold">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...parcelasVendaPendentes].sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || '')).map(p => {
                      const vencido = p.data_vencimento && p.data_vencimento < new Date().toISOString().split('T')[0];
                      return (
                        <tr key={p.id} className={`hover:bg-gray-50 transition ${vencido ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1">
                              <span className="text-xs font-bold text-[#1a3150]">{p.numero_parcela}</span>
                              <span className="text-xs text-gray-400">/{p.total_parcelas}</span>
                            </span>
                            {vencido && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">Vencida</span>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{p.cliente_nome || '—'}</p>
                            {p.cliente_cpf_cnpj && <p className="text-[10px] text-gray-400">{p.cliente_cpf_cnpj}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{p.produto || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{p.vendedor_nome || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${vencido ? 'text-red-600' : 'text-gray-700'}`}>
                              {fmtDate(p.data_vencimento)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#1a3150]">{fmtVal(p.valor_parcela)}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setModalReceber(p);
                                setRecebimentoForm({ data: new Date().toISOString().split('T')[0], valor: String(p.valor_parcela || '') });
                              }}
                              disabled={recebenndoParcela === p.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition disabled:opacity-50"
                            >
                              <DollarSign className="w-3 h-3" /> Receber
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Kanban com Drag & Drop */}
        {aba === 'pipeline' && <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {TEMPERATURAS.map(temp => {
              const items = negociosFiltrados.filter(n => n.temperatura === temp.value);
              const total = items.reduce((s, n) => s + (n.valor_estimado || 0), 0);
              return (
                <div key={temp.value} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
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
                  <Droppable droppableId={temp.value}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-2 space-y-2 min-h-24 max-h-96 overflow-y-auto flex-1 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                      >
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-[10px] text-gray-300 text-center py-4">Nenhum negócio</p>
                        )}
                        {items.map((n, index) => {
                          const isParcela = parcelaPipelineIds.has(n.id);
                          return (
                            <Draggable key={n.id} draggableId={n.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`rounded-xl p-2.5 transition group ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-300 rotate-1 opacity-90' : 'hover:bg-blue-50'} ${isParcela ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50'}`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-gray-800 leading-tight">{n.cliente_nome}</p>
                                      {isParcela && <span className="text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">💰 PARCELA</span>}
                                    </div>
                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                                      {isParcela && (
                                        <button
                                          onClick={() => receberParcela(n)}
                                          disabled={recebenndoParcela === n.id}
                                          title="Registrar recebimento da parcela"
                                          className="p-0.5 text-gray-400 hover:text-emerald-600"
                                        >
                                          {recebenndoParcela === n.id
                                            ? <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                            : <DollarSign className="w-3 h-3" />}
                                        </button>
                                      )}
                                      {!isParcela && (
                                       <button
                                         onClick={() => converterEmVenda(n)}
                                         disabled={convertendo === n.id}
                                         title={isProdutoContrato(n.produto) ? 'Ir para Contratos' : 'Converter em venda'}
                                         className={`p-0.5 text-gray-400 ${isProdutoContrato(n.produto) ? 'hover:text-amber-600' : 'hover:text-emerald-600'}`}
                                       >
                                         {convertendo === n.id
                                           ? <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                           : isProdutoContrato(n.produto)
                                             ? <ScrollText className="w-3 h-3" />
                                             : <ShoppingCart className="w-3 h-3" />}
                                       </button>
                                      )}
                                      <button onClick={() => { setEditandoProduto(n.id); setProdutoTemp(n.produto || ''); }} title="Editar produto" className="p-0.5 text-gray-400 hover:text-amber-600">
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => openEdit(n)} title="Editar completo" className="p-0.5 text-gray-400 hover:text-blue-600">
                                        <Settings className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => { if (confirm('Remover este negócio?')) deleteMutation.mutate(n.id); }} title="Remover" className="p-0.5 text-gray-400 hover:text-red-500">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  {editandoProduto === n.id ? (
                                    <div className="mt-1 flex gap-1">
                                      <input
                                        type="text"
                                        value={produtoTemp}
                                        onChange={e => setProdutoTemp(e.target.value)}
                                        list="produtos-list-inline"
                                        placeholder="Produto"
                                        autoFocus
                                        className="flex-1 px-2 py-1 text-[10px] border border-amber-300 rounded-lg focus:outline-none focus:border-amber-600 bg-amber-50"
                                      />
                                      <datalist id="produtos-list-inline">
                                        {produtos.map(p => <option key={p.id} value={p.nome} />)}
                                      </datalist>
                                      <button
                                        onClick={() => salvarProdutoEditado(n.id, produtoTemp)}
                                        className="px-2 py-1 text-[10px] font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={() => setEditandoProduto(null)}
                                        className="px-2 py-1 text-[10px] font-semibold bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-gray-500 mt-0.5">{n.produto}</p>
                                  )}
                                  {n.valor_estimado > 0 && <p className="text-[10px] font-bold text-[#1a3150] mt-1">{fmtVal(n.valor_estimado)}</p>}
                                  {n.data_prevista && <p className={`text-[10px] mt-0.5 ${isParcela ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>Venc: {fmtDate(n.data_prevista)}</p>}
                                  {isAdmin && n.vendedor_nome && <p className="text-[10px] text-blue-500 mt-0.5">{n.vendedor_nome}</p>}
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>}
      </div>

      {/* Modal Receber Parcela */}
      {modalReceber && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Confirmar Recebimento</h3>
              <button onClick={() => setModalReceber(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <p className="font-medium text-gray-800">{modalReceber.cliente_nome}</p>
              <p className="text-gray-500 text-xs">Parcela {modalReceber.numero_parcela}/{modalReceber.total_parcelas} · {modalReceber.produto}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Data de recebimento *</label>
                <input
                  type="date"
                  value={recebimentoForm.data}
                  onChange={e => setRecebimentoForm(f => ({ ...f, data: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Valor recebido *</label>
                <input
                  type="number"
                  step="0.01"
                  value={recebimentoForm.valor}
                  onChange={e => setRecebimentoForm(f => ({ ...f, valor: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModalReceber(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                disabled={!recebimentoForm.data || !recebimentoForm.valor || recebenndoParcela === modalReceber.id}
                onClick={async () => {
                  const p = modalReceber;
                  const dataReceb = recebimentoForm.data;
                  const valorReceb = parseFloat(recebimentoForm.valor) || p.valor_parcela;
                  setRecebenndoParcela(p.id);
                  try {
                    const novaVenda = await base44.entities.Venda.create({
                      produto: p.produto || '',
                      assessor_comercial: p.vendedor_nome || '',
                      vendedor_id: p.vendedor_id || '',
                      cliente: p.cliente_nome || '',
                      cpf_cnpj: p.cliente_cpf_cnpj || '',
                      valor: valorReceb,
                      data: dataReceb,
                      forma_pagamento: p.forma_pagamento || '',
                      percentual_comissao: p.percentual_comissao || 0,
                      indicadores: p.indicadores || [],
                      observacao: `Parcela ${p.numero_parcela}/${p.total_parcelas} recebida`,
                      num_parcelas: 1,
                      valor_total_contrato: valorReceb,
                    });
                    if (p.vendedor_id && p.percentual_comissao) {
                      await base44.entities.Comissao.create({
                        venda_id: novaVenda.id,
                        vendedor_id: p.vendedor_id,
                        vendedor_nome: p.vendedor_nome,
                        valor_venda: valorReceb,
                        percentual: p.percentual_comissao,
                        valor_comissao: (valorReceb * p.percentual_comissao) / 100,
                        data_venda: dataReceb,
                        pago: false,
                      });
                    }
                    await base44.entities.ParcelaVenda.update(p.id, {
                      status: 'recebida',
                      data_recebimento: dataReceb,
                      venda_gerada_id: novaVenda.id,
                    });
                    if (p.pipeline_id) {
                      await base44.entities.Pipeline.update(p.pipeline_id, { temperatura: 'Fechado' });
                    }
                    queryClient.invalidateQueries(['parcelas-venda-pipeline']);
                    queryClient.invalidateQueries(['pipeline']);
                    queryClient.invalidateQueries(['vendas']);
                    queryClient.invalidateQueries(['comissoes']);
                    toast.success('Parcela recebida! Venda registrada.');
                    setModalReceber(null);
                  } catch (err) {
                    toast.error('Erro: ' + err.message);
                  }
                  setRecebenndoParcela(null);
                }}
                className="flex-1 px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {recebenndoParcela === modalReceber.id
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><DollarSign className="w-3.5 h-3.5" /> Confirmar Recebimento</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Parcelas Vincendas */}
      {showParcelasModal && (
        <ParcelasVincendasModal user={user} onClose={() => { setShowParcelasModal(false); queryClient.invalidateQueries(['parcelas-venda-pipeline']); }} />
      )}

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