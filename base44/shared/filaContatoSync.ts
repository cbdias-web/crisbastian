import { hojeBrasilia } from './diaUtil.ts';

// Adiciona imediatamente uma ConversaWhatsapp recém-criada na FilaContato do
// dia (coluna "pendente"), de forma idempotente por dia. Garante que leads
// vindos do portal/webhook apareçam na esteira de contatos sem precisar esperar
// a sincronização diária (montarFilaContatoDia), que roda apenas de manhã.
//
// `conversa`  — registro recém-criado de ConversaWhatsapp
// `leadIndicacao` — LeadIndicacao de origem (opcional; para denormalizar
//                   produto/valor/parceiro/comissão). Pode ser null para leads
//                   externos (receberLeadExterno).
export async function adicionarConversaNaFilaHoje(base44, conversa, leadIndicacao = null) {
  const hoje = hojeBrasilia();
  const vendedorId = conversa?.vendedor_id;
  const refId = conversa?.id;
  if (!vendedorId || !refId) return null;

  // Idempotência por dia: se já existe item hoje para esta conversa+vendedor, não duplica.
  const existentes = await base44.asServiceRole.entities.FilaContato.filter({
    data_fila: hoje,
    tipo_origem: 'indicacao',
    ref_id: refId,
    vendedor_id: vendedorId,
  }).catch(() => []);
  if (existentes && existentes.length > 0) return existentes[0];

  const li = leadIndicacao;
  const cpfCnpj = li
    ? (li.tipo === 'PF' ? (li.pf_cpf || '') : (li.pj_cnpj || ''))
    : '';

  return await base44.asServiceRole.entities.FilaContato.create({
    tipo_origem: 'indicacao',
    ref_id: refId,
    lead_indicacao_id: li?.id || '',
    nome: conversa.lead_nome || '',
    telefone: conversa.telefone || '',
    cpf_cnpj: cpfCnpj,
    produto: conversa.produto_interesse || li?.produto || '',
    valor_estimado: li?.valor_estimado ?? null,
    parceiro_nome: li?.parceiro_nome || '',
    parceiro_percentual: li?.parceiro_percentual ?? null,
    vendedor_id: vendedorId,
    vendedor_nome: conversa.vendedor_nome || '',
    data_fila: hoje,
    prioridade: 0,
    posicao: 1,
    tentativas: 0,
    status: 'pendente',
    origem_label: li?.parceiro_nome ? `Indicação · ${li.parceiro_nome}` : (conversa.origem || 'Indicação'),
    historico: [{ status: 'pendente', observacao: 'Item incluído na fila do dia (lead novo)', data: new Date().toISOString() }],
  });
}