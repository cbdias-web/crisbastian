import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { dadosRicosLeadIndicacao, buscarLeadIndicacao } from '../../shared/dadosLeadIndicacao.ts';

// Converte um lead da Central de Leads (ConversaWhatsapp + Lead/LeadIndicacao
// vinculados) em um CLIENTE formal — sem gerar contrato nem venda. O cliente
// criado fica disponível para ser usado no momento de gerar o contrato.
// Preserva o INDICADOR (parceiro) como subcarteira quando a origem é "Indicação · {nome}".
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { conversa_id } = body;
    if (!conversa_id) return Response.json({ error: 'conversa_id obrigatório' }, { status: 400 });

    let conv;
    try {
      conv = await base44.asServiceRole.entities.ConversaWhatsapp.get(conversa_id);
    } catch (e) {
      return Response.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }
    if (!conv) return Response.json({ error: 'Conversa não encontrada' }, { status: 404 });

    const nome = conv.lead_nome || '';
    if (!nome) return Response.json({ error: 'Lead sem nome definido.' }, { status: 400 });
    const telefone = conv.telefone || '';
    const vendedor_id = conv.vendedor_id || '';
    const vendedor_nome = conv.vendedor_nome || '';

    // Lead vinculado (pode trazer cpf_cnpj e email)
    let lead = null;
    if (conv.lead_id) {
      try { lead = await base44.asServiceRole.entities.Lead.get(conv.lead_id); } catch (e) {}
    }
    const docLead = lead?.cpf_cnpj || '';
    const emailLead = lead?.email || '';

    // ─── Indicador: deduz da origem "Indicação · {nome}" ───
    let leadIndicacao = null;
    let indicadorNome = '';
    let indicadorId = '';
    if (conv.origem && conv.origem.startsWith('Indicação · ')) {
      indicadorNome = conv.origem.replace('Indicação · ', '').trim();
      leadIndicacao = await buscarLeadIndicacao(base44, conv, lead);
      if (leadIndicacao) indicadorId = leadIndicacao.parceiro_id || '';
    }

    // ─── Monta dados do cliente a partir da fonte mais rica disponível ───
    // Preserva TODOS os dados originais do formulário do indicador (endereço
    // completo, dados pessoais/PJ) para que acompanhem o lead até o cliente.
    const ricos = dadosRicosLeadIndicacao(leadIndicacao) || {};
    const isPF = leadIndicacao ? leadIndicacao.tipo === 'PF' : true;
    const doc = docLead || ricos.cpf_cnpj || '';
    const email = emailLead || ricos.email || '';
    const whats = ricos.whatsapp || '';

    // Evita duplicar cliente se já existir um com o mesmo CPF/CNPJ
    if (doc) {
      try {
        const existentes = await base44.asServiceRole.entities.Cliente.filter({ cpf_cnpj: doc });
        if (existentes && existentes.length > 0) {
          const existente = existentes[0];
          // Vincula o lead existente a este cliente já criado
          if (leadIndicacao && leadIndicacao.status !== 'convertido_cliente' && leadIndicacao.status !== 'convertido_venda') {
            await base44.asServiceRole.entities.LeadIndicacao.update(leadIndicacao.id, {
              status: 'convertido_cliente',
              cliente_id: existente.id,
              convertido: true,
              convertido_em: new Date().toISOString(),
            });
          }
          return Response.json({
            ok: true,
            cliente_id: existente.id,
            cliente: existente,
            ja_existia: true,
            mensagem: 'Cliente já cadastrado com este CPF/CNPJ — lead vinculado ao cliente existente.',
          });
        }
      } catch (e) {}
    }

    const observacao = `Convertido da Central de Leads${indicadorNome ? '. Indicação de ' + indicadorNome : ''}.` +
      `${conv.produto_interesse ? ' Produto de interesse: ' + conv.produto_interesse + '.' : ''}`.trim();

    const cliente = await base44.asServiceRole.entities.Cliente.create({
      nome,
      cpf_cnpj: doc || undefined,
      email: email || undefined,
      telefone: telefone || whats || undefined,
      // ── Dados preservados da LeadIndicacao (jornada completa do lead) ──
      responsavel_legal: ricos.responsavel_legal || undefined,
      cpf_responsavel: ricos.cpf_responsavel || undefined,
      nascimento: isPF ? (ricos.nascimento || undefined) : undefined,
      nacionalidade: isPF ? (ricos.nacionalidade || undefined) : undefined,
      profissao: isPF ? (ricos.profissao || undefined) : undefined,
      cep: ricos.cep || undefined,
      endereco: ricos.endereco || undefined,
      bairro: ricos.bairro || undefined,
      cidade: ricos.cidade || undefined,
      estado: ricos.estado || undefined,
      vendedor_id,
      vendedor_nome,
      origem: 'lead_convertido',
      lead_id: conv.lead_id || '',
      subcarteira: indicadorNome || '',
      observacao,
    });

    // Atualiza entidades de origem
    if (lead) {
      try {
        await base44.asServiceRole.entities.Lead.update(lead.id, {
          convertido: true,
          convertido_em: new Date().toISOString(),
          cliente_id: cliente.id,
        });
      } catch (e) {}
    }
    if (leadIndicacao && leadIndicacao.status !== 'convertido_venda') {
      try {
        await base44.asServiceRole.entities.LeadIndicacao.update(leadIndicacao.id, {
          status: 'convertido_cliente',
          cliente_id: cliente.id,
          convertido: true,
          convertido_em: new Date().toISOString(),
        });
      } catch (e) {}
    }

    // Mensagem de sistema na conversa
    try {
      const convFull = await base44.asServiceRole.entities.ConversaWhatsapp.get(conversa_id);
      const msgs = Array.isArray(convFull?.mensagens) ? convFull.mensagens : [];
      const agoraIso = new Date().toISOString();
      const texto = `👤 Lead convertido em Cliente · ${nome}${doc ? ' · ' + doc : ''}`;
      msgs.push({ de: 'sistema', texto, timestamp: agoraIso, tipo: 'sistema' });
      await base44.asServiceRole.entities.ConversaWhatsapp.update(conversa_id, {
        mensagens: msgs,
        ultima_mensagem: texto,
        ultima_mensagem_em: agoraIso,
      });
    } catch (e) {}

    return Response.json({
      ok: true,
      cliente_id: cliente.id,
      cliente,
      indicador: indicadorNome ? { id: indicadorId, nome: indicadorNome } : null,
    });
  } catch (error) {
    console.error('Erro converterLeadCliente:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}