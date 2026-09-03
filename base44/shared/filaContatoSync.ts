import { hojeBrasilia } from './diaUtil.ts';

// Adiciona imediatamente uma ConversaWhatsapp recém-criada na FilaContato do
// dia (coluna "pendente"). Leads de INDICAÇÃO (Dash Parceiro / webhook) entram
// SEMPRE na esteira — 100% deles, sem limite de vagas (o CAP 10 vale apenas
// para a carteira). Garante que leads vindos do portal/webhook apareçam na
// esteira de contatos sem precisar esperar a sincronização diária.
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

  // Estado atual da esteira do gerente (pendentes)
  const pendentes = await base44.asServiceRole.entities.FilaContato.filter({
    vendedor_id: vendedorId,
    status: 'pendente',
  }, '-created_date', 200).catch(() => []);

  // Já está na esteira (pendente)? Não duplica.
  const jaNaFila = (pendentes || []).find((f) => f.tipo_origem === 'indicacao' && f.ref_id === refId);
  if (jaNaFila) return jaNaFila;

  // Entra no FINAL da fila do gerente
  const posicao = 1 + (pendentes || []).reduce((m, f) => Math.max(m, f.posicao || 0), 0);

  const li = leadIndicacao;
  const cpfCnpj = li
    ? (li.tipo === 'PF' ? li.pf_cpf || '' : li.pj_cnpj || '')
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
    posicao,
    tentativas: 0,
    status: 'pendente',
    origem_label: li?.parceiro_nome ? `Indicação · ${li.parceiro_nome}` : (conversa.origem || 'Indicação'),
    historico: [{ status: 'pendente', observacao: 'Item incluído na fila do dia (lead novo)', data: new Date().toISOString() }],
  });
}