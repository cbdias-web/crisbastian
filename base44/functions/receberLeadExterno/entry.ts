import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { proximoDaRoleta } from '../../shared/roletaDistribuicao.ts';
import { adicionarConversaNaFilaHoje } from '../../shared/filaContatoSync.ts';

// Período comercial: 08:00 às 18:00 horário de Brasília (UTC-3), seg-sex
function isHorarioComercial() {
  const now = new Date();
  const horaBrasilia = now.getUTCHours() - 3;
  const diaSemana = now.getUTCDay();
  if (diaSemana === 0 || diaSemana === 6) return false;
  return horaBrasilia >= 8 && horaBrasilia < 18;
}

Deno.serve(async (req) => {
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

  // Buscar vendedores ativos e habilitados na esteira de leads
  const todosVendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true }, 'nome');
  const vendedores = todosVendedores.filter(v => v.ativo_central_leads !== false);

  if (!vendedores.length) {
    return Response.json({ error: 'Nenhum vendedor habilitado na esteira de leads' }, { status: 500 });
  }

  // Filtrar gerentes disponíveis (sem agenda bloqueada)
  const agora = new Date();
  const statusGerentes = await base44.asServiceRole.entities.StatusGerente.list();
  const statusMap = {};
  for (const s of statusGerentes) statusMap[s.vendedor_id] = s;

  const disponiveis = vendedores.filter(v => {
    const st = statusMap[v.id];
    if (!st) return true;
    if (!st.disponivel) {
      if (st.bloqueado_ate && new Date(st.bloqueado_ate) < agora) return true;
      return false;
    }
    return true;
  });

  // Se nenhum disponível, usar todos da esteira (fallback)
  const pool = disponiveis.length > 0 ? disponiveis : vendedores;

  // Roleta justa: um lead por gerente, obedecendo a sequência (quem há mais tempo não recebe)
  const vendedor = await proximoDaRoleta(base44, pool);

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

  // Mensagens iniciais
  const mensagensIniciais = [];

  // Se fora do horário comercial, adicionar aviso de sistema
  if (!isHorarioComercial()) {
    mensagensIniciais.push({
      de: 'Sistema',
      texto: '🕐 Atendimento humano disponível no horário comercial: seg-sex, 08h às 18h (Brasília). As mensagens recebidas serão respondidas assim que o expediente reiniciar.',
      timestamp: agora.toISOString(),
      tipo: 'sistema',
    });
  }

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
    mensagens: mensagensIniciais,
    nao_lidas: 0,
    ultima_mensagem_em: agora.toISOString(),
    primeira_mensagem_lead_em: agora.toISOString(),
    migracoes: [],
    alerta_sem_resposta: false,
  });

  // Já inclui na FilaContato de hoje para o lead aparecer na esteira imediatamente
  try {
    await adicionarConversaNaFilaHoje(base44, conversa, null);
  } catch (e) {
    console.log('Falha ao adicionar na FilaContato:', e?.message || e);
  }

  return Response.json({
    success: true,
    lead_id: lead.id,
    conversa_id: conversa.id,
    vendedor_atribuido: vendedor.nome,
    horario_comercial: isHorarioComercial(),
  });
});