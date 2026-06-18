import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  // Validar token secreto
  const token = req.headers.get('x-webhook-token');
  if (token !== Deno.env.get('WEBHOOK_SECRET_TOKEN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const { nome, telefone, email, cpf_cnpj, produto_interesse, observacao_ia, origem } = body;

  if (!telefone || !nome) {
    return Response.json({ error: 'nome e telefone são obrigatórios' }, { status: 400 });
  }

  // Round-robin: buscar vendedores ativos e o índice atual
  const vendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true }, 'nome');
  if (!vendedores.length) {
    return Response.json({ error: 'Nenhum vendedor ativo encontrado' }, { status: 500 });
  }

  // Índice round-robin: conta quantos leads já existem para calcular o próximo
  const totalLeads = await base44.asServiceRole.entities.Lead.list('-created_date', 1);
  const totalCount = totalLeads.length;
  
  // Buscar todos os leads para contar (limitado a contagem simples)
  const allLeads = await base44.asServiceRole.entities.Lead.list('-created_date', 9999);
  const indice = allLeads.length % vendedores.length;
  const vendedor = vendedores[indice];

  // Criar o lead
  const lead = await base44.asServiceRole.entities.Lead.create({
    nome,
    telefone,
    email: email || '',
    cpf_cnpj: cpf_cnpj || '',
    vendedor_id: vendedor.id,
    vendedor_nome: vendedor.nome,
    status: 'novo',
    origem: origem || 'campanha_externa',
    observacao: observacao_ia || '',
    produto_interesse: produto_interesse || '',
  });

  // Criar conversa WhatsApp vinculada
  const conversa = await base44.asServiceRole.entities.ConversaWhatsapp.create({
    lead_id: lead.id,
    lead_nome: nome,
    telefone,
    vendedor_id: vendedor.id,
    vendedor_nome: vendedor.nome,
    status: 'ativa',
    origem: origem || 'campanha_externa',
    produto_interesse: produto_interesse || '',
    observacao_ia: observacao_ia || '',
    mensagens: [],
    nao_lidas: 0,
    ultima_mensagem_em: new Date().toISOString(),
  });

  // Criar notificação para o gerente
  await base44.asServiceRole.entities.NotificacaoAutorizacao.create({
    tipo: 'novo_contrato',
    vendedor_nome: vendedor.nome,
    cliente: nome,
    contrato_tipo: produto_interesse || 'Lead externo',
    status: 'pendente',
    lida: false,
  });

  return Response.json({
    success: true,
    lead_id: lead.id,
    conversa_id: conversa.id,
    vendedor_atribuido: vendedor.nome,
    indice_roleta: indice,
  });
});