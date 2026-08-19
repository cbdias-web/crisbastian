import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

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
      // 1) tenta achar a LeadIndicacao correspondente (mesmo parceiro + mesmo nome do lead)
      try {
        const todas = await base44.asServiceRole.entities.LeadIndicacao.list('-created_date', 500);
        leadIndicacao = todas.find((li) => li.parceiro_nome === nomeParceiro && (
          (li.pf_nome && li.pf_nome === nome) ||
          (li.pj_razao_social && li.pj_razao_social === nome)
        ));
      } catch (e) {}
      if (leadIndicacao) {
        indicador = { id: leadIndicacao.parceiro_id, nome: leadIndicacao.parceiro_nome, percentual: leadIndicacao.parceiro_percentual ?? 0 };
      } else {
        // 2) lookup Parceiro por nome
        try {
          const parceiros = await base44.asServiceRole.entities.Parceiro.filter({ nome: nomeParceiro, ativo: true });
          if (parceiros.length > 0) indicador = { id: parceiros[0].id, nome: parceiros[0].nome, percentual: parceiros[0].percentual_comissao ?? 0 };
        } catch (e) {}
      }
    }

    const valorNum = Number(valor) || leadIndicacao?.valor_estimado || 0;
    const dataVenda = data || new Date().toISOString().split('T')[0];
    const indicadoresArr = indicador ? [{ id: indicador.id, nome: indicador.nome, percentual: indicador.percentual }] : [];
    const obsComum = `Convertido da Central de Leads${indicador ? '. Indicação de ' + indicador.nome : ''}. Produto de origem: ${produto}.`;

    // 1) Cliente
    const cliente = await base44.asServiceRole.entities.Cliente.create({
      nome,
      cpf_cnpj: doc,
      email,
      telefone,
      vendedor_id,
      vendedor_nome,
      origem: 'lead',
      lead_id: conv.lead_id || '',
      subcarteira: indicador?.nome || '',
      observacao: obsComum,
    });

    // 2) Contrato (tipo = produto de origem, indicador no espelhamento)
    const contrato = await base44.asServiceRole.entities.Contrato.create({
      tipo: produto,
      nome,
      cpf_cnpj: doc,
      email,
      telefone,
      vendedor_id,
      vendedor_nome,
      cliente_id: cliente.id,
      valor_adesao: valorNum || null,
      status: 'rascunho',
      indicadores: indicadoresArr,
      observacoes: obsComum,
    });

    // 3) Venda (produto de origem, indicador como espelhamento)
    const venda = await base44.asServiceRole.entities.Venda.create({
      produto,
      assessor_comercial: vendedor_nome,
      vendedor_id,
      valor: valorNum,
      data: dataVenda,
      tipo_venda: 'nova',
      cliente: nome,
      cpf_cnpj: doc,
      espelhamento: indicador?.nome || '',
      espelhamento_id: indicador?.id || '',
      percentual_comissao_espelhamento: indicador?.percentual || 0,
      indicadores: indicadoresArr,
      observacao: `Convertido da Central de Leads. Contrato: ${contrato.id}.`,
      considerar_acumulado: true,
    });

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
        await base44.asServiceRole.entities.LeadIndicacao.update(leadIndicacao.id, {
          status: 'convertido_venda',
          cliente_id: cliente.id,
          contrato_id: contrato.id,
          venda_id: venda.id,
          convertido: true,
          convertido_em: new Date().toISOString(),
        });
      } catch (e) {}
    }

    // 5) Registra a conversão no histórico do cliente (InteracaoCliente) +
    //    mensagem de sistema na ConversaWhatsapp — ambas visíveis no Portal do Indicador
    const valorFmt = valorNum ? `R$ ${valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'não informado';
    const textoConversao = `✅ Conversão em Venda efetivada · Produto: ${produto} · Valor do contrato: ${valorFmt}`;
    const agoraIso = new Date().toISOString();
    try {
      await base44.asServiceRole.entities.InteracaoCliente.create({
        cliente_id: cliente.id,
        cliente_nome: nome,
        vendedor_id,
        vendedor_nome,
        tipo: 'Outro',
        descricao: `Conversão para venda efetiva. Produto: ${produto}. Valor do contrato: ${valorFmt}. Contrato: ${contrato.id}.`,
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
      venda_id: venda.id,
      indicador,
      produto,
    });
  } catch (error) {
    console.error('Erro converterLeadVenda:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}