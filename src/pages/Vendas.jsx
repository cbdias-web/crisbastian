import React, { useState, useRef, useEffect } from 'react';
import ImportarVendasModal from '../components/vendas/ImportarVendasModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VendaForm from '../components/vendas/VendaForm';
import { Plus, Pencil, Trash2, Search, BarChart3, Loader2, ExternalLink, Download, Filter, FileSpreadsheet, FileText, ChevronDown, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Vendas() {
  const [showForm, setShowForm] = useState(false);
  const [editingVenda, setEditingVenda] = useState(null);
  const [showImportar, setShowImportar] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const now = new Date();
  const [dataInicio, setDataInicio] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [dataFim, setDataFim] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  const [produtosFiltro, setProdutosFiltro] = useState([]);
  const [vendedoresFiltro, setVendedoresFiltro] = useState([]);
  const [vendedorDropOpen, setVendedorDropOpen] = useState(false);
  const [produtoDropOpen, setProdutoDropOpen] = useState(false);
  const vendedorDropRef = useRef(null);
  const produtoDropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (vendedorDropRef.current && !vendedorDropRef.current.contains(e.target)) setVendedorDropOpen(false);
      if (produtoDropRef.current && !produtoDropRef.current.contains(e.target)) setProdutoDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [gerandoRelatorioPDF, setGerandoRelatorioPDF] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-data'),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('nome'),
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list('nome'),
  });

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { _parcelasPreview, ...vendaData } = data;
      const venda = await base44.entities.Venda.create(vendaData);
      await sleep(400);

      // Comissão do vendedor (sobre o valor da entrada)
      if (data.vendedor_id && data.valor && data.percentual_comissao) {
        await base44.entities.Comissao.create({
          venda_id: venda.id,
          vendedor_id: data.vendedor_id,
          vendedor_nome: data.assessor_comercial,
          valor_venda: data.valor,
          percentual: data.percentual_comissao,
          valor_comissao: (data.valor * data.percentual_comissao) / 100,
          data_venda: data.data,
          pago: false
        });
        await sleep(300);
      }

      // Comissões dos indicadores (múltiplos) — sequencial com delay
      const indicadores = data.indicadores || [];
      for (const ind of indicadores) {
        if (ind.id && ind.percentual > 0) {
          if (ind.tipo === 'vendedor') {
            await base44.entities.Comissao.create({
              venda_id: venda.id,
              vendedor_id: ind.id,
              vendedor_nome: ind.nome,
              valor_venda: data.valor,
              percentual: ind.percentual,
              valor_comissao: (data.valor * ind.percentual) / 100,
              data_venda: data.data,
              pago: false,
              tipo: 'comissao'
            });
          } else {
            await base44.entities.ComissaoEspelhamento.create({
              venda_id: venda.id,
              vendedor_id: ind.id,
              vendedor_nome: ind.nome,
              valor_venda: data.valor,
              percentual: ind.percentual,
              valor_comissao: (data.valor * ind.percentual) / 100,
              data_venda: data.data,
              pago: false
            });
          }
          await sleep(300);
        }
      }

      // Auto-vincula o cliente ao vendedor da venda
      if (data.cliente && data.cliente.trim() && data.vendedor_id) {
        const clientesExistentes = await base44.entities.Cliente.filter({ nome: data.cliente.trim() });
        if (clientesExistentes.length > 0) {
          const cli = clientesExistentes[0];
          if (!cli.vendedor_id) {
            await base44.entities.Cliente.update(cli.id, {
              vendedor_id: data.vendedor_id,
              vendedor_nome: data.assessor_comercial
            });
          }
        } else {
          await sleep(300);
          await base44.entities.Cliente.create({
            nome: data.cliente.trim(),
            cpf_cnpj: data.cpf_cnpj || '',
            vendedor_id: data.vendedor_id,
            vendedor_nome: data.assessor_comercial
          });
        }
      }

      // Criar parcelas via backend function (evita rate limit)
      const parcelas = _parcelasPreview || [];
      if (parcelas.length > 0) {
        await sleep(500);
        await base44.functions.invoke('criarParcelasVenda', {
          venda_id: venda.id,
          parcelas,
          venda_data: {
            cliente: data.cliente || '',
            cpf_cnpj: data.cpf_cnpj || '',
            produto: data.produto || '',
            vendedor_id: data.vendedor_id || '',
            assessor_comercial: data.assessor_comercial || '',
            percentual_comissao: data.percentual_comissao || 0,
            indicadores: data.indicadores || [],
            forma_pagamento: data.forma_pagamento || '',
          },
        });
      }

      // Criar registro de implantação automaticamente (apenas para vendas novas — recorrência = parcela)
      if (data.tipo_venda !== 'recorrencia') {
      try {
        await sleep(300);

        // Buscar contrato relacionado automaticamente (por CPF/CNPJ ou nome)
        let contratoVinculado = null;
        let contratoEncontrado = false;
        try {
          if (data.cpf_cnpj) {
            const contratos = await base44.entities.Contrato.filter({ cpf_cnpj: data.cpf_cnpj });
            if (contratos.length > 0) {
              contratoVinculado = contratos[0];
              contratoEncontrado = true;
            }
          }
          if (!contratoVinculado && data.cliente) {
            const contratosPorNome = await base44.entities.Contrato.filter({ nome: data.cliente.trim() });
            if (contratosPorNome.length > 0) {
              contratoVinculado = contratosPorNome[0];
              contratoEncontrado = true;
            }
          }
        } catch (e) {
          console.log('Erro ao buscar contrato:', e.message);
        }

        // Fases de implantação baseadas em melhores práticas de mercado
        const etapasImplantacao = [
          // Fase 1: Contratos & Compliance
          { fase: 'Contratos & Compliance', descricao: 'Revisão e validação do contrato assinado', concluida: false, concluida_em: '' },
          { fase: 'Contratos & Compliance', descricao: 'KYC (Know Your Customer) — verificação de identidade', concluida: false, concluida_em: '' },
          { fase: 'Contratos & Compliance', descricao: 'Due diligence e checagem em listas restritivas (PLD/FT)', concluida: false, concluida_em: '' },
          { fase: 'Contratos & Compliance', descricao: 'Aprovação de compliance e risco', concluida: false, concluida_em: '' },
          // Fase 2: Documentação
          { fase: 'Documentação', descricao: 'Coleta de documentos pessoais/empresariais (RG, CNH, contrato social)', concluida: false, concluida_em: '' },
          { fase: 'Documentação', descricao: 'Comprovante de residência e renda', concluida: false, concluida_em: '' },
          { fase: 'Documentação', descricao: 'Validação e organização da documentação', concluida: false, concluida_em: '' },
          // Fase 3: Onboarding
          { fase: 'Onboarding', descricao: 'Abertura de conta / cadastro em plataformas', concluida: false, concluida_em: '' },
          { fase: 'Onboarding', descricao: 'Setup técnico e parametrização do produto', concluida: false, concluida_em: '' },
          { fase: 'Onboarding', descricao: 'Configuração de credenciais e acessos', concluida: false, concluida_em: '' },
          // Fase 4: Configuração & Liberação
          { fase: 'Configuração & Liberação', descricao: 'Testes de funcionamento e conectividade', concluida: false, concluida_em: '' },
          { fase: 'Configuração & Liberação', descricao: 'Ativação e liberação de acesso ao cliente', concluida: false, concluida_em: '' },
          { fase: 'Configuração & Liberação', descricao: 'Confirmação de operação ativa', concluida: false, concluida_em: '' },
          // Fase 5: Treinamento & Handover
          { fase: 'Treinamento & Handover', descricao: 'Treinamento do cliente sobre uso do produto', concluida: false, concluida_em: '' },
          { fase: 'Treinamento & Handover', descricao: 'Entrega de manuais e credenciais', concluida: false, concluida_em: '' },
          { fase: 'Treinamento & Handover', descricao: 'Apresentação do suporte pós-venda', concluida: false, concluida_em: '' },
        ];

        const observacaoHistorico = contratoEncontrado
          ? `Implantação criada automaticamente via formalização de venda. Contrato vinculado: ${contratoVinculado.tipo || '—'}`
          : 'Implantação criada automaticamente via formalização de venda. Contrato não localizado no sistema — aguardando anexamento manual.';

        const implantacao = await base44.entities.Implantacao.create({
          venda_id: venda.id,
          contrato_id: contratoVinculado?.id || '',
          contrato_encontrado: contratoEncontrado,
          cliente_nome: data.cliente || '',
          cpf_cnpj: data.cpf_cnpj || '',
          produto: data.produto || '',
          vendedor_id: data.vendedor_id || '',
          vendedor_nome: data.assessor_comercial || '',
          valor_contrato: data.valor_total_contrato || data.valor || 0,
          data_entrada: data.data,
          status: 'aguardando_documentacao',
          prioridade: 'media',
          etapas: etapasImplantacao,
          historico: [{
            status_anterior: '',
            status_novo: 'aguardando_documentacao',
            observacao: observacaoHistorico,
            atualizado_por: data.assessor_comercial || 'Sistema',
            data: new Date().toISOString(),
          }],
        });
        // Notificar envolvidos
        try {
          await base44.functions.invoke('notificarImplantacao', {
            tipo: 'novo',
            implantacao_id: implantacao.id,
          });
        } catch (e) {}
      } catch (e) {
        console.log('Erro ao criar implantação:', e.message);
      }
      } // fim do if tipo_venda !== 'recorrencia'

      return venda;
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries(['vendas']);
      queryClient.invalidateQueries(['comissoes']);
      queryClient.invalidateQueries(['comissoesEspelhamento']);
      queryClient.invalidateQueries(['clientes']);
      queryClient.invalidateQueries(['pipeline']);
      queryClient.invalidateQueries(['agenda-contatos']);
      queryClient.invalidateQueries(['implantacoes']);
      setShowForm(false);
      const np = data.num_parcelas || 1;
      toast.success(np > 1 ? `Venda criada! ${np - 1} parcela(s) adicionada(s) ao Pipeline.` : 'Venda criada com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { _parcelasPreview, ...vendaData } = data;
      // Garante que o produto e demais campos são explicitamente enviados
      const venda = await base44.entities.Venda.update(id, {
        ...vendaData,
        produto: data.produto,
      });

      // Atualiza comissão do vendedor
      const comissoesVend = await base44.entities.Comissao.filter({ venda_id: id });
      if (comissoesVend.length > 0) {
        await base44.entities.Comissao.update(comissoesVend[0].id, {
          vendedor_id: data.vendedor_id,
          vendedor_nome: data.assessor_comercial,
          valor_venda: data.valor,
          percentual: data.percentual_comissao,
          valor_comissao: (data.valor * data.percentual_comissao) / 100,
          data_venda: data.data
        });
      } else if (data.vendedor_id) {
        await base44.entities.Comissao.create({
          venda_id: id,
          vendedor_id: data.vendedor_id,
          vendedor_nome: data.assessor_comercial,
          valor_venda: data.valor,
          percentual: data.percentual_comissao ?? 0,
          valor_comissao: (data.valor * (data.percentual_comissao ?? 0)) / 100,
          data_venda: data.data,
          pago: false
        });
      }

      // Reconstrói comissões de indicadores — apaga todas e recria
      const [comissoesEsp, todasComissoes, parcelas] = await Promise.all([
        base44.entities.ComissaoEspelhamento.filter({ venda_id: id }),
        base44.entities.Comissao.filter({ venda_id: id }),
        base44.entities.ParcelaVenda.filter({ venda_id: id }),
      ]);

      await Promise.all(comissoesEsp.map(c => base44.entities.ComissaoEspelhamento.delete(c.id)));

      // Remove comissões extras de vendedores usados como indicadores (mantém bônus)
      const comissaoVendedorPrincipal = todasComissoes.find(c => c.vendedor_id === data.vendedor_id && c.tipo !== 'bonus');
      await Promise.all(
        todasComissoes
          .filter(c => c.id !== comissaoVendedorPrincipal?.id && c.tipo !== 'bonus')
          .map(c => base44.entities.Comissao.delete(c.id))
      );

      const indicadores = data.indicadores || [];
      for (const ind of indicadores) {
        if (ind.id && ind.percentual > 0) {
          if (ind.tipo === 'vendedor') {
            await base44.entities.Comissao.create({
              venda_id: id, vendedor_id: ind.id, vendedor_nome: ind.nome,
              valor_venda: data.valor, percentual: ind.percentual,
              valor_comissao: (data.valor * ind.percentual) / 100,
              data_venda: data.data, pago: false, tipo: 'comissao'
            });
          } else {
            await base44.entities.ComissaoEspelhamento.create({
              venda_id: id, vendedor_id: ind.id, vendedor_nome: ind.nome,
              valor_venda: data.valor, percentual: ind.percentual,
              valor_comissao: (data.valor * ind.percentual) / 100,
              data_venda: data.data, pago: false
            });
          }
        }
      }

      // Atualiza parcelas vinculadas usando valores editados pelo usuário (_parcelasPreview) quando disponíveis
      const totalParc = data.num_parcelas || 1;
      const novoValorRestante = (parseFloat(data.valor_total_contrato) || parseFloat(data.valor) || 0) - (parseFloat(data.valor) || 0);

      for (const parcela of parcelas) {
        // Busca o valor editado pelo usuário para este número de parcela
        const parcelaEditada = _parcelasPreview?.find(p => p.numero === parcela.numero_parcela);
        const novoValorParcela = parcelaEditada?.valor ?? (totalParc > 0 ? novoValorRestante / totalParc : parcela.valor_parcela);
        const novoVencimento = parcelaEditada?.vencimento ?? parcela.data_vencimento;

        await base44.entities.ParcelaVenda.update(parcela.id, {
          cliente_nome: data.cliente || parcela.cliente_nome,
          cliente_cpf_cnpj: data.cpf_cnpj || parcela.cliente_cpf_cnpj,
          produto: data.produto || parcela.produto,
          vendedor_id: data.vendedor_id || parcela.vendedor_id,
          vendedor_nome: data.assessor_comercial || parcela.vendedor_nome,
          percentual_comissao: data.percentual_comissao ?? parcela.percentual_comissao,
          indicadores: data.indicadores || parcela.indicadores,
          valor_parcela: novoValorParcela,
          data_vencimento: novoVencimento,
          total_parcelas: totalParc,
        });

        // Atualiza o Pipeline vinculado
        if (parcela.pipeline_id) {
          await base44.entities.Pipeline.update(parcela.pipeline_id, {
            cliente_nome: data.cliente || '',
            cliente_cpf_cnpj: data.cpf_cnpj || '',
            produto: `${data.produto} (Parcela ${parcela.numero_parcela}/${totalParc})`,
            valor_estimado: novoValorParcela,
            vendedor_id: data.vendedor_id || '',
            vendedor_nome: data.assessor_comercial || '',
          });
        }
      }

      // Cria parcelas faltantes (quando num_parcelas aumentou ou nunca foram criadas)
      const numerosExistentes = new Set(parcelas.map(p => p.numero_parcela));
      const parcelasFaltantes = (_parcelasPreview || []).filter(p => !numerosExistentes.has(p.numero));
      if (parcelasFaltantes.length > 0) {
        await base44.functions.invoke('criarParcelasVenda', {
          venda_id: id,
          parcelas: parcelasFaltantes,
          venda_data: {
            cliente: data.cliente || '',
            cpf_cnpj: data.cpf_cnpj || '',
            produto: data.produto || '',
            vendedor_id: data.vendedor_id || '',
            assessor_comercial: data.assessor_comercial || '',
            percentual_comissao: data.percentual_comissao || 0,
            indicadores: data.indicadores || [],
            forma_pagamento: data.forma_pagamento || '',
          },
        });
      }

      // Atualiza AgendaContato vinculados (lead_id = venda.id)
      const agendas = await base44.entities.AgendaContato.filter({ lead_id: id });
      await Promise.all(
        agendas.filter(a => a.status === 'pendente').map(a =>
          base44.entities.AgendaContato.update(a.id, {
            lead_nome: `${data.cliente || 'Cliente'} — Parcela`,
            lead_cpf_cnpj: data.cpf_cnpj || '',
            vendedor_id: data.vendedor_id || a.vendedor_id,
            vendedor_nome: data.assessor_comercial || a.vendedor_nome,
          })
        )
      );

      return venda;
    },
    onSuccess: async (updatedVenda) => {
      await queryClient.invalidateQueries(['vendas']);
      await queryClient.refetchQueries(['vendas']);
      queryClient.invalidateQueries(['comissoes']);
      queryClient.invalidateQueries(['comissoesEspelhamento']);
      queryClient.invalidateQueries(['pipeline']);
      queryClient.invalidateQueries(['parcelas-venda-pipeline']);
      queryClient.invalidateQueries(['agenda-contatos']);
      setShowForm(false);
      setEditingVenda(null);
      toast.success('Venda e registros vinculados atualizados!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Busca todas entidades relacionadas em paralelo
      const [comissoes, comissoesEsp, parcelas, agendas, notasFiscais] = await Promise.all([
        base44.entities.Comissao.filter({ venda_id: id }),
        base44.entities.ComissaoEspelhamento.filter({ venda_id: id }),
        base44.entities.ParcelaVenda.filter({ venda_id: id }),
        base44.entities.AgendaContato.filter({ lead_id: id }),
        base44.entities.NotaFiscal.filter({ venda_id: id }),
      ]);

      // Coleta os pipeline_ids vinculados às parcelas para remover do Pipeline
      const pipelineIds = parcelas.map(p => p.pipeline_id).filter(Boolean);

      // Remove tudo em paralelo
      await Promise.all([
        ...comissoes.map(c => base44.entities.Comissao.delete(c.id)),
        ...comissoesEsp.map(c => base44.entities.ComissaoEspelhamento.delete(c.id)),
        ...parcelas.map(p => base44.entities.ParcelaVenda.delete(p.id)),
        ...agendas.map(a => base44.entities.AgendaContato.delete(a.id)),
        // Desvincula NFs (não deleta a NF, apenas remove o venda_id)
        ...notasFiscais.map(nf => base44.entities.NotaFiscal.update(nf.id, { venda_id: '', paga: false })),
      ]);

      // Remove registros do Pipeline vinculados às parcelas
      await Promise.all(pipelineIds.map(pid => base44.entities.Pipeline.delete(pid)));

      return base44.entities.Venda.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendas']);
      queryClient.invalidateQueries(['comissoes']);
      queryClient.invalidateQueries(['comissoesEspelhamento']);
      queryClient.invalidateQueries(['pipeline']);
      queryClient.invalidateQueries(['parcelas-venda-pipeline']);
      queryClient.invalidateQueries(['agenda-contatos']);
      queryClient.invalidateQueries(['notasfiscais']);
      toast.success('Venda e todos os registros vinculados foram excluídos!');
    },
  });

  const handleSave = (data) => {
    if (editingVenda) {
      updateMutation.mutate({ id: editingVenda.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (venda) => {
    setEditingVenda(venda);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta venda?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDuplicate = async (venda) => {
    if (!confirm(`Duplicar a venda de "${venda.cliente || venda.produto}"?`)) return;
    const { id, created_date, updated_date, created_by, ...dados } = venda;
    createMutation.mutate({ ...dados, data: new Date().toISOString().split('T')[0] });
  };

  const filteredVendas = vendas.filter(venda => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (
      venda.produto?.toLowerCase().includes(term) ||
      venda.assessor_comercial?.toLowerCase().includes(term) ||
      venda.cliente?.toLowerCase().includes(term) ||
      venda.cpf_cnpj?.includes(term)
    );

    const matchData = (!dataInicio || venda.data >= dataInicio) && (!dataFim || venda.data <= dataFim);
    const matchProduto = produtosFiltro.length === 0 || produtosFiltro.some(p => venda.produto?.includes(p));
    const matchVendedor = vendedoresFiltro.length === 0 || vendedoresFiltro.some(nome => venda.assessor_comercial?.includes(nome));

    return matchSearch && matchData && matchProduto && matchVendedor;
  });

  const VENDEDORES_EXCLUIR_ACUMULADO = ['EDUARDO CUNHA', 'KAUANA FERREIRA NARDES'];
  const totalAcumulado = filteredVendas
    .filter(v => !VENDEDORES_EXCLUIR_ACUMULADO.includes(v.assessor_comercial?.toUpperCase()))
    .reduce((sum, v) => sum + (v.valor || 0), 0);

  const exportarVendas = () => {
    const csv = [
      ['Data', 'Produto', 'Cliente', 'CPF/CNPJ', 'Vendedor', 'Valor', 'Forma Pagamento'],
      ...filteredVendas.map(v => [
        v.data ? format(parseISO(v.data), 'dd/MM/yyyy') : '',
        v.produto || '',
        v.cliente || '',
        v.cpf_cnpj || '',
        v.assessor_comercial || '',
        v.valor || '',
        v.forma_pagamento || ''
      ])
    ].map(row => row.join(';')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Vendas exportadas!');
  };

  const exportarClientes = () => {
    const clientesUnicos = [...new Set(filteredVendas
      .filter(v => v.cliente && v.cliente.trim())
      .map(v => ({ cliente: v.cliente, cpf_cnpj: v.cpf_cnpj }))
      .map(c => JSON.stringify(c)))]
      .map(c => JSON.parse(c));
    
    const csv = [
      ['Cliente', 'CPF/CNPJ'],
      ...clientesUnicos.map(c => [c.cliente, c.cpf_cnpj || ''])
    ].map(row => row.join(';')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Clientes exportados!');
  };

  const gerarRelatorioVendasPDF = async () => {
    setGerandoRelatorioPDF(true);
    try {
      const response = await base44.functions.invoke('gerarRelatorioVendasPDF', {
        dataInicio,
        dataFim,
        vendedorFiltro: vendedoresFiltro.length > 0 ? vendedoresFiltro[0] : null,
        produtoFiltro: produtosFiltro.length > 0 ? produtosFiltro[0] : null
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-vendas-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório gerado!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao gerar relatório');
    }
    setGerandoRelatorioPDF(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Vendas</h1>
            <p className="text-gray-600 mt-1">Controle completo das suas vendas</p>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            )}
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowImportar(true)}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Importar Histórico
                </Button>
                <Button
                  variant="outline"
                  onClick={gerarRelatorioVendasPDF}
                  disabled={gerandoRelatorioPDF}
                >
                  {gerandoRelatorioPDF ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Relatório PDF
                </Button>
              </>
            )}
            <Button 
              onClick={() => {
                setEditingVenda(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Venda
            </Button>
          </div>
        </div>

        {showImportar && (
          <ImportarVendasModal onClose={() => setShowImportar(false)} />
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-6 relative">
              <button
                onClick={() => { setShowForm(false); setEditingVenda(null); }}
                className="absolute top-4 right-4 z-10 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              <VendaForm
                venda={editingVenda}
                onSave={handleSave}
                onCancel={() => {
                  setShowForm(false);
                  setEditingVenda(null);
                }}
                isLoading={createMutation.isPending || updateMutation.isPending}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        )}

        {/* Contadores */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50">
              <BarChart3 className="w-5 h-5 text-[#1a3150]" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Cadastradas</p>
              <p className="text-2xl font-bold text-gray-900">{vendas.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50">
              <Filter className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">No Período Filtrado</p>
              <p className="text-2xl font-bold text-gray-900">{filteredVendas.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50">
              <Search className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Volume do Período</p>
              <p className="text-2xl font-bold text-emerald-600">{totalAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div ref={vendedorDropRef}>
                <Label>Vendedor</Label>
                <div className="relative">
                  <button type="button" onClick={() => setVendedorDropOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-input rounded-md text-sm bg-background hover:bg-gray-50 transition text-left h-9">
                    <span className={vendedoresFiltro.length === 0 ? 'text-gray-500' : 'text-gray-900 truncate'}>
                      {vendedoresFiltro.length === 0 ? 'Todos Vendedores' : vendedoresFiltro.length === 1 ? vendedoresFiltro[0] : `${vendedoresFiltro.length} selecionados`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-1 transition-transform ${vendedorDropOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {vendedorDropOpen && (
                    <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      <button type="button" onClick={() => setVendedoresFiltro([])}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${vendedoresFiltro.length === 0 ? 'bg-[#1a3150] border-[#1a3150]' : 'border-gray-300'}`}>
                          {vendedoresFiltro.length === 0 && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className="text-gray-800 font-medium">Todos</span>
                      </button>
                      {vendedores.filter(v => v.ativo).map(v => (
                        <button key={v.id} type="button" onClick={() => setVendedoresFiltro(prev => prev.includes(v.nome) ? prev.filter(n => n !== v.nome) : [...prev, v.nome])}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition">
                          <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${vendedoresFiltro.includes(v.nome) ? 'bg-[#1a3150] border-[#1a3150]' : 'border-gray-300'}`}>
                            {vendedoresFiltro.includes(v.nome) && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <span className="text-gray-800 uppercase">{v.nome}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div ref={produtoDropRef}>
                <Label>Produto</Label>
                <div className="relative">
                  <button type="button" onClick={() => setProdutoDropOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-input rounded-md text-sm bg-background hover:bg-gray-50 transition text-left h-9">
                    <span className={produtosFiltro.length === 0 ? 'text-gray-500' : 'text-gray-900 truncate'}>
                      {produtosFiltro.length === 0 ? 'Todos os Produtos' : produtosFiltro.length === 1 ? produtosFiltro[0] : `${produtosFiltro.length} selecionados`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-1 transition-transform ${produtoDropOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {produtoDropOpen && (
                    <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      <button type="button" onClick={() => setProdutosFiltro([])}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${produtosFiltro.length === 0 ? 'bg-[#1a3150] border-[#1a3150]' : 'border-gray-300'}`}>
                          {produtosFiltro.length === 0 && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className="text-gray-800 font-medium">Todos</span>
                      </button>
                      {produtos.map(p => (
                        <button key={p.id} type="button" onClick={() => setProdutosFiltro(prev => prev.includes(p.nome) ? prev.filter(n => n !== p.nome) : [...prev, p.nome])}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm transition">
                          <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${produtosFiltro.includes(p.nome) ? 'bg-[#1a3150] border-[#1a3150]' : 'border-gray-300'}`}>
                            {produtosFiltro.includes(p.nome) && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <span className="text-gray-800">{p.nome}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const n = new Date();
                    setDataInicio(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`);
                    setDataFim(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`);
                    setProdutosFiltro([]);
                    setVendedoresFiltro([]);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Todas as Vendas ({filteredVendas.length})</CardTitle>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <>
                    <Button variant="outline" size="sm" onClick={exportarClientes}>
                      <Download className="w-4 h-4 mr-2" />
                      Clientes
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportarVendas}>
                      <Download className="w-4 h-4 mr-2" />
                      Vendas
                    </Button>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por produto, vendedor, cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-80"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendas.map((venda) => (
                    <TableRow key={venda.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleEdit(venda)}>
                      <TableCell>
                        {venda.data ? format(parseISO(venda.data), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{venda.produto}</TableCell>
                      <TableCell>{venda.cliente || '-'}</TableCell>
                      <TableCell>{venda.assessor_comercial}</TableCell>
                      <TableCell>
                        {venda.time && <Badge variant="secondary">{venda.time}</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-green-600">
                          {venda.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          {venda.valor_total_contrato && venda.valor_total_contrato > venda.valor && (
                            <div className="text-[10px] text-gray-400 font-normal">
                              Contrato: {venda.valor_total_contrato.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              {venda.num_parcelas > 1 && ` · ${venda.num_parcelas}x`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {venda.forma_pagamento && (
                          <Badge variant="outline">{venda.forma_pagamento}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {venda.tipo_venda === 'nova' && <Badge className="bg-emerald-100 text-emerald-700">Nova</Badge>}
                        {venda.tipo_venda === 'recorrencia' && <Badge className="bg-amber-100 text-amber-700">Recorrência</Badge>}
                        {!venda.tipo_venda && <Badge className="bg-red-100 text-red-700">⚠ Sem tipo</Badge>}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {venda.bitrix && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a href={venda.bitrix} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDuplicate(venda)}
                                title="Duplicar venda"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(venda)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(venda.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredVendas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}