import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { dadosRicosLeadIndicacao, buscarLeadIndicacao } from '../../shared/dadosLeadIndicacao.ts';

// Converte um lead da Central de Leads (ConversaWhatsapp + Lead vinculado) em
// Cliente + Contrato + Venda, respeitando o PRODUTO DE ORIGEM (produto_interesse)
// e o INDICADOR como espelhamento (deduzido da origem "Indicação · {nome}").
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { conversa_id, valor, cpf_cnpj, data } = body;

    if (!conversa_id) return Response.json({ error: 'conversa_id obrigatório' }, { status: 400 });

    const conv = await base44.asServiceRole.entities.ConversaWhatsapp.get(conversa_id);
    if (!conv) return Response.json({ error: 'Conversa não encontrada' }, { status: 404 });

    const produto = conv.produto_interesse || '';
    if (!produto) return Response.json({ error: 'Lead sem produto de interesse definido. Classifique o lead antes de converter.' }, { status: 400 });

    const nome = conv.lead_nome || '';
    const telefone = conv.telefone || '';
    const vendedor_id = conv.vendedor_id || '';
    const vendedor_nome = conv.vendedor_nome || '';

    // Lead vinculado (pode trazer cpf_cnpj e email)
    let lead = null;
    if (conv.lead_id) {
      try { lead = await base44.asServiceRole.entities.Lead.get(conv.lead_id); } catch (e) {}
    }
    const doc = (cpf_cnpj && cpf_cnpj.trim()) || lead?.cpf_cnpj || '';
    const email = lead?.email || '';

    if (!doc) return Response.json({ error: 'CPF/CNPJ do lead é obrigatório para gerar contrato. Informe no modal de conversão.' }, { status: 400 });

    // ─── Indicador: deduz da origem "Indicação · {nome}" ───
    let indicador = null; // { id, nome, percentual }
    let leadIndicacao = null;
    if (conv.origem && conv.origem.startsWith('Indicação · ')) {
      const nomeParceiro = conv.origem.replace('Indicação · ', '').trim();
      // Localiza a LeadIndicacao de origem (match robusto por doc/telefone/nome)
      leadIndicacao = await buscarLeadIndicacao(base44, conv, lead);
      if (leadIndicacao) {
        indicador = { id: leadIndicacao.parceiro_id, nome: leadIndicacao.parceiro_nome, percentual: leadIndicacao.parceiro_percentual ?? 0 };
      } else {
        // fallback: lookup Parceiro por nome
        try {
          const parceiros = await base44.asServiceRole.entities.Parceiro.filter({ nome: nomeParceiro, ativo: true });
          if (parceiros.length > 0) indicador = { id: parceiros[0].id, nome: parceiros[0].nome, percentual: parceiros[0].percentual_comissao ?? 0 };
        } catch (e) {}
      }
    }

    // ─── Dados preservados da LeadIndicacao (jornada completa do lead) ───
    // Garante que endereço completo e dados pessoais/PJ acompanhem o lead
    // até o cliente e o contrato.
    const ricos = dadosRicosLeadIndicacao(leadIndicacao) || {};
    const emailFinal = email || ricos.email || '';
    const telefoneFinal = telefone || ricos.whatsapp || '';
    const valorNum = Number(valor) || leadIndicacao?.valor_estimado || 0;
    const dataVenda = data || new Date().toISOString().split('T')[0];
    const indicadoresArr = indicador ? [{ id: indicador.id, nome: indicador.nome, percentual: indicador.percentual }] : [];
    // Preserva as observações que o indicador digitou no formulário do lead.
    const obsIndicador = (leadIndicacao?.observacoes || '').trim();
    const obsComum = obsIndicador
      ? `Convertido da Central de Leads${indicador ? '. Indicação de ' + indicador.nome : ''}. Produto de origem: ${produto}.\n\nObservações do indicador:\n${obsIndicador}`
      : `Convertido da Central de Leads${indicador ? '. Indicação de ' + indicador.nome : ''}. Produto de origem: ${produto}.`;

    // 1) Cliente
    const cliente = await base44.asServiceRole.entities.Cliente.create({
      nome,
      cpf_cnpj: doc,
      email: emailFinal || undefined,
      telefone: telefoneFinal || undefined,
      // ── Dados preservados da LeadIndicacao ──
      responsavel_legal: ricos.responsavel_legal || undefined,
      cpf_responsavel: ricos.cpf_responsavel || undefined,
      nascimento: ricos.isPF ? (ricos.nascimento || undefined) : undefined,
      nacionalidade: ricos.isPF ? (ricos.nacionalidade || undefined) : undefined,
      profissao: ricos.isPF ? (ricos.profissao || undefined) : undefined,
      cep: ricos.cep || undefined,
      endereco: ricos.endereco || undefined,
      bairro: ricos.bairro || undefined,
      cidade: ricos.cidade || undefined,
      estado: ricos.estado || undefined,
      vendedor_id,
      vendedor_nome,
      origem: 'lead',
      lead_id: conv.lead_id || '',
      subcarteira: indicador?.nome || '',
      observacao: obsComum,
    });

    // 2) Contrato (tipo = produto de origem, indicador no espelhamento)
    // Repassa os mesmos dados preservados da LeadIndicacao para que o contrato
    // já nasça com endereço e dados do titular/empresa preenchidos.
    const contrato = await base44.asServiceRole.entities.Contrato.create({
      tipo: produto,
      nome,
      cpf_cnpj: doc,
      email: emailFinal || undefined,
      telefone: telefoneFinal || undefined,
      // ── Dados preservados da LeadIndicacao ──
      responsavel_legal: ricos.responsavel_legal || undefined,
      cpf_responsavel: ricos.cpf_responsavel || undefined,
      nascimento: ricos.isPF ? (ricos.nascimento || undefined) : undefined,
      nacionalidade: ricos.isPF ? (ricos.nacionalidade || undefined) : undefined,
      profissao: ricos.isPF ? (ricos.profissao || undefined) : undefined,
      cep: ricos.cep || undefined,
      endereco: ricos.endereco || undefined,
      bairro: ricos.bairro || undefined,
      cidade: ricos.cidade || undefined,
      estado: ricos.estado || undefined,
      vendedor_id,
      vendedor_nome,
      cliente_id: cliente.id,
      valor_adesao: valorNum || null,
      valor_total: valorNum || null,
      status: 'rascunho',
      indicadores: indicadoresArr,
      observacoes: obsComum,
    });

    // (A Venda NÃO é criada aqui — o lead vira Contrato. A Venda é gerada depois,
    //  na página de Contratos, pelo botão "Enviar para Vendas", que então
    //  atualiza a LeadIndicacao para 'convertido_venda' e dispara a segunda
    //  notificação ao indicador — "Venda concluída".)
    // 3) Sincroniza a FilaContato → coluna "Convertido" (o lead PERMANECE na esteira)
    try {
      const existentes = await base44.asServiceRole.entities.FilaContato.filter({ tipo_origem: 'indicacao', ref_id: conversa_id });
      if (existentes.length > 0) {
        for (const f of existentes) {
          if (f.status !== 'convertido') {
            const hist = Array.isArray(f.historico) ? f.historico : [];
            hist.push({ status: 'convertido', observacao: 'Lead convertido em contrato', data: new Date().toISOString() });
            await base44.asServiceRole.entities.FilaContato.update(f.id, {
              status: 'convertido',
              cliente_id: cliente.id,
              produto,
              valor_estimado: valorNum || null,
              historico: hist,
            });
          }
        }
      } else {
        // Cria FilaContato na coluna "Convertido" se não existir
        await base44.asServiceRole.entities.FilaContato.create({
          tipo_origem: 'indicacao',
          ref_id: conversa_id,
          lead_indicacao_id: leadIndicacao?.id || '',
          cliente_id: cliente.id,
          nome,
          telefone: telefoneFinal || telefone,
          cpf_cnpj: doc,
          produto,
          valor_estimado: valorNum || null,
          parceiro_nome: indicador?.nome || '',
          parceiro_percentual: indicador?.percentual ?? null,
          vendedor_id,
          vendedor_nome,
          data_fila: new Date().toISOString().split('T')[0],
          prioridade: 0,
          posicao: 1,
          tentativas: 0,
          status: 'convertido',
          origem_label: indicador?.nome ? `Indicação · ${indicador.nome}` : 'Indicação',
          historico: [{ status: 'convertido', observacao: 'Lead convertido em contrato', data: new Date().toISOString() }],
        });
      }
    } catch (e) { console.log('Falha ao sincronizar FilaContato da conversão:', e.message); }

    // 4) Atualiza ConversaWhatsapp + Lead + LeadIndicacao
    try { await base44.asServiceRole.entities.ConversaWhatsapp.update(conversa_id, { status: 'convertido' }); } catch (e) {}
    if (lead) {
      try {
        await base44.asServiceRole.entities.Lead.update(lead.id, {
          convertido: true,
          convertido_em: new Date().toISOString(),
          cliente_id: cliente.id,
        });
      } catch (e) {}
    }
    if (leadIndicacao) {
      try {
        const hist = Array.isArray(leadIndicacao.historico) ? [...leadIndicacao.historico] : [];
        hist.push({ status: 'convertido_contrato', label: 'Contrato gerado', data: new Date().toISOString(), contrato_id: contrato.id, cliente_id: cliente.id });
        await base44.asServiceRole.entities.LeadIndicacao.update(leadIndicacao.id, {
          status: 'convertido_contrato',
          cliente_id: cliente.id,
          contrato_id: contrato.id,
          convertido: true,
          convertido_em: new Date().toISOString(),
          historico: hist,
        });
      } catch (e) {}
    }

    // 5) Registra a conversão no histórico do cliente (InteracaoCliente) +
    //    mensagem de sistema na ConversaWhatsapp — ambas visíveis no Portal do Indicador
    const valorFmt = valorNum ? `R$ ${valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'não informado';
    const textoConversao = `✅ Contrato gerado · Produto: ${produto} · Valor: ${valorFmt}`;
    const agoraIso = new Date().toISOString();
    try {
      await base44.asServiceRole.entities.InteracaoCliente.create({
        cliente_id: cliente.id,
        cliente_nome: nome,
        vendedor_id,
        vendedor_nome,
        tipo: 'Outro',
        descricao: `Conversão em contrato. Produto: ${produto}. Valor: ${valorFmt}. Contrato: ${contrato.id}.`,
        data_interacao: dataVenda,
        resultado: 'Positivo',
        status: 'realizada',
      });
    } catch (e) { console.log('Falha ao registrar InteracaoCliente da conversão:', e.message); }

    try {
      const convFull = await base44.asServiceRole.entities.ConversaWhatsapp.get(conversa_id);
      const msgs = Array.isArray(convFull?.mensagens) ? convFull.mensagens : [];
      msgs.push({ de: 'sistema', texto: textoConversao, timestamp: agoraIso, tipo: 'sistema' });
      await base44.asServiceRole.entities.ConversaWhatsapp.update(conversa_id, {
        mensagens: msgs,
        ultima_mensagem: textoConversao,
        ultima_mensagem_em: agoraIso,
      });
    } catch (e) { console.log('Falha ao registrar mensagem de conversão:', e.message); }

    return Response.json({
      ok: true,
      cliente_id: cliente.id,
      contrato_id: contrato.id,
      indicador,
      produto,
    });
  } catch (error) {
    console.error('Erro converterLeadVenda:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}