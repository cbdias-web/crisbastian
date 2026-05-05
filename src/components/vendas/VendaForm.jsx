import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { X, Save, Plus, Trash2, AlertTriangle, Search, UserPlus, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";

const formasPagamento = [
  "DÉBITO EM CONTA", "CARTÃO DE CRÉDITO", "BOLETO", "PIX", "TRANSFERÊNCIA", "DINHEIRO"
];

export default function VendaForm({ venda, onSave, onCancel, isLoading, isAdmin }) {
  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list('nome', 500),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }, 'nome'),
  });

  const { data: espelhamentos = [] } = useQuery({
    queryKey: ['espelhamentos'],
    queryFn: () => base44.entities.Espelhamento.filter({ ativo: true }, 'nome'),
  });

  const indicadoresDisponiveis = [
    ...vendedores.filter(v => v.ativo !== false).map(v => ({ id: v.id, nome: v.nome, tipo: 'vendedor', percentual_comissao: v.percentual_comissao || 10 })),
    ...espelhamentos.map(e => ({ id: e.id, nome: e.nome, tipo: 'indicador', percentual_comissao: e.percentual_comissao || 10 }))
  ].sort((a, b) => a.nome.localeCompare(b.nome));

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome'),
  });

  const [clienteSearch, setClienteSearch] = useState(venda?.cliente || '');
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', cpf_cnpj: '', email: '', telefone: '', cidade: '', estado: '', observacao: '' });
  const [criandoCliente, setCriandoCliente] = useState(false);
  const clienteRef = useRef(null);
  const produtoRef = useRef(null);
  const vendedorRef = useRef(null);
  const [produtoOpen, setProdutoOpen] = useState(false);
  const [vendedorOpen, setVendedorOpen] = useState(false);

  const [selectedProdutos, setSelectedProdutos] = useState(() => {
    if (!venda?.produto) return [];
    return venda.produto.split(',').map(p => p.trim()).filter(Boolean);
  });

  const [selectedVendedores, setSelectedVendedores] = useState(() => {
    if (!venda?.vendedor_id) return [];
    if (venda.vendedores_ids?.length > 0) return venda.vendedores_ids;
    if (venda.vendedor_id) return [{ id: venda.vendedor_id, nome: venda.assessor_comercial || '', percentual_comissao: venda.percentual_comissao ?? 0 }];
    return [];
  });

  useEffect(() => {
    const handler = (e) => {
      if (clienteRef.current && !clienteRef.current.contains(e.target)) setClienteDropdown(false);
      if (produtoRef.current && !produtoRef.current.contains(e.target)) setProdutoOpen(false);
      if (vendedorRef.current && !vendedorRef.current.contains(e.target)) setVendedorOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.cpf_cnpj?.includes(clienteSearch)
  ).slice(0, 8);

  const selecionarCliente = (c) => {
    setFormData(f => ({ ...f, cliente: c.nome, cpf_cnpj: c.cpf_cnpj || f.cpf_cnpj }));
    setClienteSearch(c.nome);
    setClienteDropdown(false);
  };

  const handleCriarCliente = async () => {
    if (!novoCliente.nome.trim()) return;
    setCriandoCliente(true);
    const novo = await base44.entities.Cliente.create({
      ...novoCliente,
      nome: novoCliente.nome.trim(),
      vendedor_id: formData.vendedor_id || '',
      vendedor_nome: formData.assessor_comercial || ''
    });
    setFormData(f => ({ ...f, cliente: novo.nome, cpf_cnpj: novo.cpf_cnpj || f.cpf_cnpj }));
    setClienteSearch(novo.nome);
    setNovoCliente({ nome: '', cpf_cnpj: '', email: '', telefone: '', cidade: '', estado: '', observacao: '' });
    setShowNovoClienteModal(false);
    setClienteDropdown(false);
    setCriandoCliente(false);
  };

  const hoje = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState(venda || {
    produto: '', assessor_comercial: '', time: '', valor: '', data: hoje,
    forma_pagamento: '', parcelamento: '', cpf_cnpj: '', cliente: '',
    bitrix: '', observacao: '', vendedor_id: '', percentual_comissao: 10,
  });

  // ── FINANCEIRO ─────────────────────────────────────────────────────────────
  const numParcelasInicial = venda?.num_parcelas || 1;
  const [numParcelas, setNumParcelas] = useState(numParcelasInicial);
  // semParcelas = true significa "pagamento total na entrada" (à vista), false = tem parcelas do saldo
  const [semParcelas, setSemParcelas] = useState(!venda?.id || (venda?.num_parcelas || 0) <= 0);

  // Valor total do contrato
  const [valorTotalContrato, setValorTotalContrato] = useState(
    venda?.valor_total_contrato ? String(venda.valor_total_contrato) :
    venda?.valor ? String(venda.valor) : ''
  );

  // Valor de entrada (= total quando à vista, ou entrada real quando parcelado)
  const [valorEntradaCustom, setValorEntradaCustom] = useState(
    venda?.valor ? String(venda.valor) : ''
  );

  const valorTotal = parseFloat(valorTotalContrato) || 0;
  const valorEntrada = parseFloat(valorEntradaCustom) || 0;
  const valorRestante = Math.max(0, valorTotal - valorEntrada);

  // Mantém formData.valor sempre igual à entrada
  useEffect(() => {
    setFormData(f => ({ ...f, valor: valorEntradaCustom }));
  }, [valorEntradaCustom]);

  // ── PARCELAS ────────────────────────────────────────────────────────────────
  const [parcelasEditaveis, setParcelasEditaveis] = useState([]);
  const parcelasCarregadasRef = useRef(false);
  const prevNumParcelasRef = useRef(numParcelasInicial);

  // Carrega parcelas do banco (apenas 1x, ao abrir edição)
  useEffect(() => {
    if (parcelasCarregadasRef.current) return;
    parcelasCarregadasRef.current = true;

    if (venda?.id && numParcelasInicial > 1) {
      base44.entities.ParcelaVenda.filter({ venda_id: venda.id })
        .then(parcelas => {
          const ordenadas = parcelas
            .sort((a, b) => a.numero_parcela - b.numero_parcela);
          if (ordenadas.length > 0) {
            // Monta array com numParcelasInicial slots, preenchendo do banco ou gerando fallback
            const restante = Math.max(0, (venda.valor_total_contrato || venda.valor || 0) - (venda.valor || 0));
            const valorPadrao = restante > 0 ? restante / numParcelasInicial : 0;
            const dataBase = venda.data ? new Date(venda.data + 'T00:00:00') : new Date();
            const result = Array.from({ length: numParcelasInicial }, (_, i) => {
              const existente = ordenadas.find(p => p.numero_parcela === i + 1);
              if (existente) {
                return { numero: existente.numero_parcela, vencimento: existente.data_vencimento, valor: existente.valor_parcela };
              }
              const dt = new Date(dataBase);
              dt.setMonth(dt.getMonth() + i + 1);
              return { numero: i + 1, vencimento: dt.toISOString().split('T')[0], valor: valorPadrao };
            });
            setParcelasEditaveis(result);
          } else {
            // Sem parcelas no banco: gera com base nos valores atuais
            const restante = Math.max(0, (venda.valor_total_contrato || venda.valor || 0) - (venda.valor || 0));
            setParcelasEditaveis(gerarParcelasNovas(numParcelasInicial, restante, venda.data));
          }
        })
        .catch(() => {});
    } else if (!venda?.id && numParcelasInicial > 1) {
      // Nova venda com parcelas pré-selecionadas
      const restante = Math.max(0, (parseFloat(valorTotalContrato) || 0) - (parseFloat(valorEntradaCustom) || 0));
      setParcelasEditaveis(gerarParcelasNovas(numParcelasInicial, restante, formData.data));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const gerarParcelasNovas = (n, restante, dataRef) => {
    const dataBase = dataRef ? new Date(dataRef + 'T00:00:00') : (formData.data ? new Date(formData.data + 'T00:00:00') : new Date());
    const valorParcela = restante > 0 ? restante / n : 0;
    return Array.from({ length: n }, (_, i) => {
      const dt = new Date(dataBase);
      dt.setMonth(dt.getMonth() + i + 1);
      return {
        numero: i + 1,
        vencimento: dt.toISOString().split('T')[0],
        valor: valorParcela,
      };
    });
  };

  // Reage à mudança do número de parcelas pelo usuário
  useEffect(() => {
    const numMudou = prevNumParcelasRef.current !== numParcelas;
    prevNumParcelasRef.current = numParcelas;
    if (!numMudou) return;

    if (semParcelas || numParcelas <= 0) {
      setParcelasEditaveis([]);
      return;
    }
    const restante = Math.max(0, (parseFloat(valorTotalContrato) || 0) - (parseFloat(valorEntradaCustom) || 0));
    setParcelasEditaveis(gerarParcelasNovas(numParcelas, restante, formData.data));
  }, [numParcelas, semParcelas]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateVencimentoParcela = (idx, novaData) => {
    setParcelasEditaveis(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], vencimento: novaData };
      return updated;
    });
  };

  const updateValorParcela = (idx, novoValor) => {
    setParcelasEditaveis(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], valor: parseFloat(novoValor) || 0 };
      return updated;
    });
  };

  // ── INDICADORES ─────────────────────────────────────────────────────────────
  const [indicadores, setIndicadores] = useState(() => {
    if (venda?.indicadores?.length > 0) {
      return venda.indicadores.map(ind => ({
        id: ind.id || '',
        nome: ind.nome || '',
        percentual: ind.percentual || 10,
        tipo: ind.tipo || 'indicador'
      }));
    }
    if (venda?.espelhamento_id) {
      return [{ id: venda.espelhamento_id, nome: venda.espelhamento || '', percentual: venda.percentual_comissao_espelhamento || 10, tipo: 'indicador' }];
    }
    return [];
  });

  const [showNovoIndicadorModal, setShowNovoIndicadorModal] = useState(false);
  const [showNovoVendedorEspModal, setShowNovoVendedorEspModal] = useState(false);
  const [novoIndicadorForm, setNovoIndicadorForm] = useState({ nome: '', email: '', telefone: '', percentual_comissao: 10 });
  const [novoVendedorForm, setNovoVendedorForm] = useState({ nome: '', email: '', time: '', percentual_comissao: 10 });
  const [criandoIndicador, setCriandoIndicador] = useState(false);
  const [indicadorEmEdicao, setIndicadorEmEdicao] = useState(null);

  const totalPctIndicadores = indicadores.reduce((s, i) => s + (parseFloat(i.percentual) || 0), 0);
  const limiteExcedido = totalPctIndicadores > 50;
  const requerAutorizacao = !isAdmin && totalPctIndicadores > 30 && totalPctIndicadores <= 50;

  const toggleProduto = (nomeProduto) => {
    setSelectedProdutos(prev =>
      prev.includes(nomeProduto) ? prev.filter(p => p !== nomeProduto) : [...prev, nomeProduto]
    );
  };

  const toggleVendedor = (vendedor) => {
    setSelectedVendedores(prev => {
      const exists = prev.find(v => v.id === vendedor.id);
      // Seleção única: clicar no mesmo desmarca; clicar em outro substitui
      if (exists) return [];
      return [{ id: vendedor.id, nome: vendedor.nome, percentual_comissao: vendedor.percentual_comissao || 10 }];
    });
    // Atualiza o percentual de comissão automaticamente ao trocar vendedor
    setFormData(f => ({ ...f, percentual_comissao: vendedor.percentual_comissao ?? 0 }));
  };

  const addIndicador = () => {
    setIndicadores(prev => [...prev, { id: '', nome: '', percentual: 10, tipo: 'indicador' }]);
  };

  const handleCriarNovoIndicador = async () => {
    if (!novoIndicadorForm.nome.trim()) return;
    setCriandoIndicador(true);
    const novo = await base44.entities.Espelhamento.create({ ...novoIndicadorForm, ativo: true });
    if (indicadorEmEdicao !== null) {
      setIndicadores(prev => prev.map((ind, i) =>
        i === indicadorEmEdicao ? { id: novo.id, nome: novo.nome, percentual: novo.percentual_comissao || 10, tipo: 'indicador' } : ind
      ));
    }
    setNovoIndicadorForm({ nome: '', email: '', telefone: '', percentual_comissao: 10 });
    setShowNovoIndicadorModal(false);
    setIndicadorEmEdicao(null);
    setCriandoIndicador(false);
    toast.success('Indicador cadastrado!');
  };

  const handleCriarNovoVendedorEsp = async () => {
    if (!novoVendedorForm.nome.trim()) return;
    setCriandoIndicador(true);
    const novo = await base44.entities.Vendedor.create({ ...novoVendedorForm, ativo: true });
    if (indicadorEmEdicao !== null) {
      setIndicadores(prev => prev.map((ind, i) =>
        i === indicadorEmEdicao ? { id: novo.id, nome: novo.nome, percentual: novo.percentual_comissao || 10, tipo: 'vendedor' } : ind
      ));
    }
    setNovoVendedorForm({ nome: '', email: '', time: '', percentual_comissao: 10 });
    setShowNovoVendedorEspModal(false);
    setIndicadorEmEdicao(null);
    setCriandoIndicador(false);
    toast.success('Vendedor cadastrado!');
  };

  const removeIndicador = (idx) => setIndicadores(prev => prev.filter((_, i) => i !== idx));

  const updateIndicadorTipo = (idx, tipo) => {
    setIndicadores(prev => prev.map((ind, i) => i === idx ? { id: '', nome: '', percentual: 10, tipo } : ind));
  };

  const updateIndicadorEsp = (idx, selectedId) => {
    if (selectedId === '__novo_indicador__') {
      setIndicadorEmEdicao(idx);
      setNovoIndicadorForm({ nome: '', email: '', telefone: '', percentual_comissao: 10 });
      setShowNovoIndicadorModal(true);
      return;
    }
    if (selectedId === '__novo_vendedor__') {
      setIndicadorEmEdicao(idx);
      setNovoVendedorForm({ nome: '', email: '', time: '', percentual_comissao: 10 });
      setShowNovoVendedorEspModal(true);
      return;
    }
    const selected = indicadoresDisponiveis.find(item => item.id === selectedId);
    setIndicadores(prev => prev.map((ind, i) =>
      i === idx ? { id: selectedId, nome: selected?.nome || '', percentual: ind.percentual || selected?.percentual_comissao || 10, tipo: selected?.tipo || 'indicador' } : ind
    ));
  };

  const updateIndicadorPct = (idx, pct) => {
    setIndicadores(prev => prev.map((ind, i) => i === idx ? { ...ind, percentual: parseFloat(pct) || 0 } : ind));
  };

  // ── SUBMIT ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (limiteExcedido) return;
    if (selectedProdutos.length === 0) { toast.error('Selecione ao menos um produto'); return; }
    if (selectedVendedores.length === 0) { toast.error('Selecione ao menos um vendedor'); return; }

    const primaryVendedor = selectedVendedores[0];
    const entradaFinal = parseFloat(valorEntradaCustom) || 0;
    const totalFinal = parseFloat(valorTotalContrato) || entradaFinal;

    const temParcelas = !semParcelas && numParcelas > 0;
    if (temParcelas) {
      if (totalFinal <= 0) { toast.error('Informe o valor total do contrato.'); return; }
      if (entradaFinal >= totalFinal) { toast.error('O valor de entrada deve ser menor que o total do contrato.'); return; }
    }

    // Calcula parcelas no momento do submit com valores finais
    const restanteFinal = Math.max(0, totalFinal - entradaFinal);
    let parcelasFinais = [];
    if (temParcelas && restanteFinal > 0) {
      const valorPorParcela = restanteFinal / numParcelas;
      parcelasFinais = Array.from({ length: numParcelas }, (_, i) => {
        const editada = parcelasEditaveis[i];
        if (editada) {
          return { numero: i + 1, vencimento: editada.vencimento, valor: editada.valor || valorPorParcela };
        }
        // Fallback para parcelas sem dados editáveis
        const dataBase = formData.data ? new Date(formData.data + 'T00:00:00') : new Date();
        dataBase.setMonth(dataBase.getMonth() + i + 1);
        return { numero: i + 1, vencimento: dataBase.toISOString().split('T')[0], valor: valorPorParcela };
      });
    }

    const dataToSave = {
      ...formData,
      produto: selectedProdutos.join(', '),
      assessor_comercial: selectedVendedores.map(v => v.nome).join(', '),
      vendedor_id: primaryVendedor.id,
      percentual_comissao: formData.percentual_comissao !== '' && formData.percentual_comissao !== null && formData.percentual_comissao !== undefined ? parseFloat(formData.percentual_comissao) : (primaryVendedor.percentual_comissao ?? 0),
      vendedores_ids: selectedVendedores,
      valor: entradaFinal,
      valor_total_contrato: totalFinal,
      num_parcelas: semParcelas ? 0 : numParcelas,
      indicadores,
      espelhamento: indicadores[0]?.nome || '',
      espelhamento_id: indicadores[0]?.id || '',
      percentual_comissao_espelhamento: indicadores[0]?.percentual || 0,
      _parcelasPreview: parcelasFinais,
    };

    console.log('[VendaForm] Submit — parcelas geradas:', parcelasFinais.length, parcelasFinais);

    if (requerAutorizacao) {
      try {
        await base44.functions.invoke('notificarAutorizacaoEspelhamento', {
          vendedor_nome: dataToSave.assessor_comercial,
          cliente: formData.cliente,
          valor: formData.valor,
          total_espelhamento: totalPctIndicadores,
          indicadores: indicadores.map(i => ({ nome: i.nome, percentual: i.percentual })),
          data_venda: formData.data
        });
      } catch (error) {
        console.error('Erro ao notificar administrador:', error);
      }
    }

    onSave(dataToSave);
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <>
      <CardHeader>
        <CardTitle>{venda ? 'Editar Venda' : 'Nova Venda'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Produto */}
            <div ref={produtoRef}>
              <Label>Produto * {selectedProdutos.length > 0 && <span className="text-xs font-normal text-gray-400">({selectedProdutos.length} selecionado{selectedProdutos.length > 1 ? 's' : ''})</span>}</Label>
              <div className="relative">
                <button type="button" onClick={() => setProdutoOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-input rounded-md text-sm bg-background hover:bg-gray-50 transition text-left">
                  <span className={selectedProdutos.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                    {selectedProdutos.length === 0 ? 'Selecione o(s) produto(s)' : selectedProdutos.join(', ')}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${produtoOpen ? 'rotate-180' : ''}`} />
                </button>
                {produtoOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {produtos.map(p => (
                      <button key={p.id} type="button" onClick={() => toggleProduto(p.nome)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedProdutos.includes(p.nome) ? 'bg-[#1a3150] border-[#1a3150]' : 'border-gray-300'}`}>
                          {selectedProdutos.includes(p.nome) && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className="text-gray-800">{p.nome}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Vendedor */}
            <div ref={vendedorRef}>
              <Label>Vendedor *</Label>
              <div className="relative">
                <button type="button" onClick={() => setVendedorOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-input rounded-md text-sm bg-background hover:bg-gray-50 transition text-left">
                  <span className={selectedVendedores.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                    {selectedVendedores.length === 0 ? 'Selecione o vendedor' : selectedVendedores[0].nome}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${vendedorOpen ? 'rotate-180' : ''}`} />
                </button>
                {vendedorOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {vendedores.map(v => {
                      const isSelected = !!selectedVendedores.find(sv => sv.id === v.id);
                      return (
                        <button key={v.id} type="button" onClick={() => { toggleVendedor(v); setVendedorOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition">
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-[#1a3150]' : 'border-gray-300'}`}>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-[#1a3150]" />}
                          </span>
                          <span className={`${isSelected ? 'font-semibold text-[#1a3150]' : 'text-gray-800'}`}>{v.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Comissão Vendedor (%)</Label>
              <Input type="number" step="0.1" value={formData.percentual_comissao}
                onChange={e => setFormData({ ...formData, percentual_comissao: e.target.value })} />
            </div>

            <div>
              <Label>Valor Total do Contrato *</Label>
              <Input type="number" step="0.01" value={valorTotalContrato}
                onChange={e => {
                  setValorTotalContrato(e.target.value);
                  if (numParcelas === 1) setValorEntradaCustom(e.target.value);
                }} required placeholder="Ex: 150000,00" />
            </div>

            {/* Estrutura de pagamento */}
            <div className="md:col-span-2">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Estrutura de Pagamento</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Valor de Entrada</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={valorEntradaCustom}
                      onChange={e => setValorEntradaCustom(e.target.value)}
                      placeholder={semParcelas ? 'Igual ao total' : 'Ex: 50000,00'}
                      disabled={semParcelas}
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {semParcelas ? 'Igual ao total (à vista)' : 'Conta na meta do mês atual'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Parcelas do saldo restante</label>
                    <select
                      value={semParcelas ? '__sem_parcelas__' : numParcelas}
                      onChange={e => {
                        const isSemParcelas = e.target.value === '__sem_parcelas__';
                        if (isSemParcelas) {
                          setSemParcelas(true);
                          setNumParcelas(0);
                          setValorEntradaCustom(valorTotalContrato);
                          setParcelasEditaveis([]);
                        } else {
                          const n = parseInt(e.target.value);
                          setSemParcelas(false);
                          setNumParcelas(n);
                        }
                      }}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm bg-white h-9 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="__sem_parcelas__">Sem parcelas (pagamento total na entrada)</option>
                      {Array.from({ length: 13 }, (_, i) => i + 1).map(n => {
                        const vp = valorRestante > 0 ? (valorRestante / n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--';
                        return <option key={n} value={n}>Entrada + {n}x de {vp}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {valorTotal > 0 && (
                  <div className={`grid gap-2 pt-2 border-t border-blue-100 ${!semParcelas && numParcelas > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <div className="text-center bg-white rounded-lg py-2 px-3">
                      <p className="text-[10px] text-gray-500">Total do contrato</p>
                      <p className="text-sm font-bold text-gray-800">{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className="text-center bg-white rounded-lg py-2 px-3">
                      <p className="text-[10px] text-gray-500">Entrada (meta)</p>
                      <p className="text-sm font-bold text-emerald-600">{valorEntrada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    {!semParcelas && numParcelas > 0 && (
                      <div className="text-center bg-white rounded-lg py-2 px-3">
                        <p className="text-[10px] text-gray-500">Saldo (entrada + {numParcelas}x)</p>
                        <p className="text-sm font-bold text-amber-600">
                          {valorRestante > 0 ? (valorRestante / numParcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Parcelas — datas e valores editáveis */}
                {!semParcelas && numParcelas > 0 && parcelasEditaveis.length > 0 && (() => {
                  const totalDistribuido = parcelasEditaveis.reduce((s, p) => s + (p.valor || 0), 0);
                  const diff = Math.abs(totalDistribuido - valorRestante);
                  const diffOk = diff < 0.01;
                  return (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-blue-600 font-medium">
                          💡 Ajuste datas e valores de cada parcela:
                        </p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${diffOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {diffOk ? '✓ Valores OK' : `Diferença: ${(totalDistribuido - valorRestante).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {parcelasEditaveis.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-blue-100">
                            <span className="text-[10px] font-bold text-amber-700 w-10 flex-shrink-0 text-center">
                              {i + 1}/{numParcelas}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-[10px] text-gray-400">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={p.valor || ''}
                                onChange={e => updateValorParcela(i, e.target.value)}
                                className="w-24 text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#1a3150] text-right"
                                placeholder="0,00"
                              />
                            </div>
                            <span className="text-gray-300 text-xs">|</span>
                            <input
                              type="date"
                              value={p.vencimento || ''}
                              onChange={e => updateVencimentoParcela(i, e.target.value)}
                              className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#1a3150] min-w-0"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] pt-1 border-t border-blue-100">
                        <span className="text-gray-500">Saldo restante: <strong>{valorRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
                        <span className={diffOk ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                          Distribuído: {totalDistribuido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div>
              <Label>Data *</Label>
              <Input type="date" value={formData.data}
                onChange={e => setFormData({ ...formData, data: e.target.value })} required />
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={formData.forma_pagamento} onValueChange={v => setFormData({ ...formData, forma_pagamento: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente */}
            <div className="md:col-span-2" ref={clienteRef}>
              <Label>Cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={clienteSearch}
                  onChange={e => { setClienteSearch(e.target.value); setFormData(f => ({ ...f, cliente: e.target.value })); setClienteDropdown(true); }}
                  onFocus={() => setClienteDropdown(true)}
                  placeholder="Buscar ou digitar nome do cliente..."
                  className="w-full pl-9 pr-4 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                />
                {clienteDropdown && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                    {clientesFiltrados.map(c => (
                      <button key={c.id} type="button" onMouseDown={() => selecionarCliente(c)}
                        className="w-full flex items-start gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{c.nome}</p>
                          {c.cpf_cnpj && <p className="text-xs text-gray-400">{c.cpf_cnpj}</p>}
                        </div>
                      </button>
                    ))}
                    {clientesFiltrados.length === 0 && clienteSearch.trim() && (
                      <div className="px-4 py-2 text-xs text-gray-500">Nenhum cliente encontrado.</div>
                    )}
                    <div className="border-t border-gray-100 p-2">
                      <button type="button"
                        onMouseDown={() => { setShowNovoClienteModal(true); setClienteDropdown(false); }}
                        className="w-full flex items-center gap-1.5 px-3 py-2 bg-[#1a3150] text-white rounded-lg text-xs font-medium hover:opacity-90 justify-center">
                        <UserPlus className="w-3.5 h-3.5" /> Cadastrar novo cliente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>CPF/CNPJ</Label>
              <Input value={formData.cpf_cnpj || ''} onChange={e => setFormData({ ...formData, cpf_cnpj: e.target.value })} />
            </div>
            <div>
              <Label>Time</Label>
              <Select value={formData.time || ''} onValueChange={v => setFormData({ ...formData, time: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o time" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIME 1">TIME 1</SelectItem>
                  <SelectItem value="TIME 2">TIME 2</SelectItem>
                  <SelectItem value="TIME 3">TIME 3</SelectItem>
                  <SelectItem value="CONSÓRCIO">CONSÓRCIO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link Bitrix</Label>
              <Input value={formData.bitrix || ''} onChange={e => setFormData({ ...formData, bitrix: e.target.value })} />
            </div>
          </div>

          {/* Indicadores */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Indicadores (Espelhamento)</h3>
                {indicadores.length > 0 && (
                  <p className={`text-xs mt-0.5 ${limiteExcedido ? "text-red-600 font-semibold" : requerAutorizacao ? "text-amber-600 font-semibold" : totalPctIndicadores > 25 ? "text-amber-600" : "text-gray-400"}`}>
                    Total indicadores: {totalPctIndicadores.toFixed(1)}% (máx 50%)
                    {requerAutorizacao && " - Requer autorização do administrador"}
                  </p>
                )}
              </div>
              <button type="button" onClick={addIndicador}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1a3150] text-white rounded-lg hover:opacity-90 transition">
                <Plus className="w-3.5 h-3.5" /> Adicionar Indicador
              </button>
            </div>

            {limiteExcedido && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">O total de comissões dos indicadores não pode ultrapassar 50%.</p>
              </div>
            )}

            {requerAutorizacao && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>Atenção:</strong> Espelhamento acima de 30% requer autorização do administrador.
                  Uma notificação será enviada automaticamente para aprovação.
                </p>
              </div>
            )}

            {indicadores.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Nenhum indicador adicionado</p>
            ) : (
              <div className="space-y-2">
                {indicadores.map((ind, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-32">
                      <Select value={ind.tipo} onValueChange={tipo => updateIndicadorTipo(idx, tipo)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="indicador">Indicador</SelectItem>
                          <SelectItem value="vendedor">Vendedor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Select value={ind.id} onValueChange={selectedId => updateIndicadorEsp(idx, selectedId)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecionar...">
                            {ind.nome || 'Selecionar...'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {indicadoresDisponiveis.filter(item => item.tipo === ind.tipo).map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                          ))}
                          <SelectItem value={ind.tipo === 'indicador' ? '__novo_indicador__' : '__novo_vendedor__'} className="text-blue-600 font-medium">
                            + Cadastrar novo {ind.tipo}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input type="number" step="0.1" min="0" max="50" value={ind.percentual}
                        onChange={e => updateIndicadorPct(idx, e.target.value)}
                        className="h-9 text-sm text-center" placeholder="0" />
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">%</span>
                    <button type="button" onClick={() => removeIndicador(idx)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Observação</Label>
            <Textarea value={formData.observacao || ''} onChange={e => setFormData({ ...formData, observacao: e.target.value })} rows={3} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" /> Cancelar
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isLoading || limiteExcedido}>
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
        </CardFooter>
      </form>

      {/* Modal novo indicador */}
      {showNovoIndicadorModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Novo Indicador</h3>
              <button type="button" onClick={() => setShowNovoIndicadorModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nome *</label>
                <input value={novoIndicadorForm.nome} onChange={e => setNovoIndicadorForm(p => ({ ...p, nome: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="Nome completo" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</label>
                <input type="email" value={novoIndicadorForm.email} onChange={e => setNovoIndicadorForm(p => ({ ...p, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</label>
                <input value={novoIndicadorForm.telefone} onChange={e => setNovoIndicadorForm(p => ({ ...p, telefone: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Comissão Padrão (%)</label>
                <input type="number" step="0.1" value={novoIndicadorForm.percentual_comissao} onChange={e => setNovoIndicadorForm(p => ({ ...p, percentual_comissao: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowNovoIndicadorModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleCriarNovoIndicador} disabled={criandoIndicador || !novoIndicadorForm.nome.trim()}
                className="flex-1 px-4 py-2 text-sm bg-[#1a3150] text-white rounded-xl hover:bg-[#0f1e35] font-medium disabled:opacity-50">
                {criandoIndicador ? 'Salvando...' : 'Salvar Indicador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo vendedor (espelhamento) */}
      {showNovoVendedorEspModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Novo Vendedor</h3>
              <button type="button" onClick={() => setShowNovoVendedorEspModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nome *</label>
                <input value={novoVendedorForm.nome} onChange={e => setNovoVendedorForm(p => ({ ...p, nome: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="Nome completo" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</label>
                <input type="email" value={novoVendedorForm.email} onChange={e => setNovoVendedorForm(p => ({ ...p, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Time</label>
                <select value={novoVendedorForm.time} onChange={e => setNovoVendedorForm(p => ({ ...p, time: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white">
                  <option value="">Selecione o time</option>
                  <option value="TIME 1">TIME 1</option>
                  <option value="TIME 2">TIME 2</option>
                  <option value="TIME 3">TIME 3</option>
                  <option value="CONSÓRCIO">CONSÓRCIO</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Comissão Padrão (%)</label>
                <input type="number" step="0.1" value={novoVendedorForm.percentual_comissao} onChange={e => setNovoVendedorForm(p => ({ ...p, percentual_comissao: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowNovoVendedorEspModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleCriarNovoVendedorEsp} disabled={criandoIndicador || !novoVendedorForm.nome.trim()}
                className="flex-1 px-4 py-2 text-sm bg-[#1a3150] text-white rounded-xl hover:bg-[#0f1e35] font-medium disabled:opacity-50">
                {criandoIndicador ? 'Salvando...' : 'Salvar Vendedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo cliente */}
      {showNovoClienteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Novo Cliente</h3>
              <button type="button" onClick={() => setShowNovoClienteModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nome *</label>
                <input value={novoCliente.nome} onChange={e => setNovoCliente(p => ({ ...p, nome: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="Nome completo" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">CPF / CNPJ</label>
                <input value={novoCliente.cpf_cnpj} onChange={e => setNovoCliente(p => ({ ...p, cpf_cnpj: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="000.000.000-00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</label>
                  <input value={novoCliente.telefone} onChange={e => setNovoCliente(p => ({ ...p, telefone: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</label>
                  <input type="email" value={novoCliente.email} onChange={e => setNovoCliente(p => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="email@exemplo.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cidade</label>
                  <input value={novoCliente.cidade} onChange={e => setNovoCliente(p => ({ ...p, cidade: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estado (UF)</label>
                  <input value={novoCliente.estado} onChange={e => setNovoCliente(p => ({ ...p, estado: e.target.value }))}
                    maxLength={2} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="SP" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Observação</label>
                <textarea value={novoCliente.observacao} onChange={e => setNovoCliente(p => ({ ...p, observacao: e.target.value }))}
                  rows={2} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] resize-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowNovoClienteModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleCriarCliente}
                disabled={criandoCliente || !novoCliente.nome.trim() || !novoCliente.cpf_cnpj?.trim() || !novoCliente.email?.trim() || !novoCliente.telefone?.trim() || !novoCliente.cidade?.trim() || !novoCliente.estado?.trim()}
                className="flex-1 px-4 py-2 text-sm bg-[#1a3150] text-white rounded-xl hover:bg-[#0f1e35] font-medium disabled:opacity-50">
                {criandoCliente ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}