import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hojeBrasilia } from '../../shared/diaUtil.ts';

// Monta/sincroniza a FilaContato do dia para um vendedor (ou todos os ativos).
// - Indicações (prioridade 0): ConversaWhatsapp ativa do vendedor.
// - Carteira (prioridade 1): AgendaContato pendente cuja data_agendada == hoje.
// Recria a fila do dia (idempotente via ref_id+data_fila+tipo_origem).
//
// Payload: { vendedor_id?: string }
// Admin pode omitir vendedor_id para montar a fila de todos os ativos.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    const hoje = hojeBrasilia();

    // Determinar vendedores alvo
    let vendedores;
    if (body.vendedor_id) {
      const v = await base44.asServiceRole.entities.Vendedor.get(body.vendedor_id).catch(() => null);
      vendedores = v ? [v] : [];
    } else {
      const isAdmin = user.role === 'admin' || user.permissao_admin === true;
      if (!isAdmin) {
        // usuário comum: só o próprio vendedor
        const meus = await base44.entities.Vendedor.filter({ email: user.email });
        vendedores = meus;
      } else {
        vendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true });
      }
    }

    const filaCriada = [];
    const filaExistente = await base44.asServiceRole.entities.FilaContato.filter({ data_fila: hoje });
    const existenteKey = new Set(filaExistente.map((f) => `${f.tipo_origem}|${f.ref_id}|${f.vendedor_id}`));

    // Cache de LeadIndicacao para denormalizar produto/valor/parceiro/comissao nas indicacoes
    const todasIndicacoes = await base44.asServiceRole.entities.LeadIndicacao.list('-created_date', 500);
    const resolverLeadIndicacao = (c: any) => {
      const tel = (c.telefone || '').toString().replace(/\D/g, '');
      if (tel) {
        const byTel = todasIndicacoes.find((li) => {
          const t = (li.tipo === 'PF' ? (li.pf_whatsapp || li.pf_telefone || '') : (li.pj_whatsapp || li.pj_telefone || '')).toString().replace(/\D/g, '');
          return t && t === tel;
        });
        if (byTel) return byTel;
      }
      const nomeParceiro = (c.origem || '').replace(/^Indica[çc][aã]o\s*[·\-–]\s*/i, '').trim();
      return todasIndicacoes.find((li) => li.parceiro_nome === nomeParceiro && (
        (li.pf_nome && li.pf_nome === c.lead_nome) ||
        (li.pj_razao_social && li.pj_razao_social === c.lead_nome)
      )) || null;
    };

    for (const v of vendedores) {
      if (v.ativo === false) continue;

      // ── Indicações (prioridade 0) ──
      const conversas = await base44.asServiceRole.entities.ConversaWhatsapp.filter(
        { vendedor_id: v.id }, '-ultima_mensagem_em', 200
      );
      const indicacoes = conversas.filter((c) =>
        ['ativa', 'aguardando', 'qualificado'].includes(c.status || 'ativa')
      );

      // ── Carteira (prioridade 1): agendas pendentes de hoje ──
      const agendas = await base44.asServiceRole.entities.AgendaContato.filter(
        { vendedor_id: v.id, data_agendada: hoje }, 'posicao_dia'
      );
      const carteira = agendas.filter((a) => a.status === 'pendente' || !a.status);

      let posInd = 1;
      let posCart = 1;

      for (const c of indicacoes) {
        const key = `indicacao|${c.id}|${v.id}`;
        if (existenteKey.has(key)) continue;
        const li = resolverLeadIndicacao(c);
        const item = await base44.asServiceRole.entities.FilaContato.create({
          tipo_origem: 'indicacao',
          ref_id: c.id,
          lead_indicacao_id: li?.id || '',
          nome: c.lead_nome || '',
          telefone: c.telefone || '',
          cpf_cnpj: li ? (li.tipo === 'PF' ? li.pf_cnpj : li.pj_cnpj) : '',
          produto: c.produto_interesse || li?.produto || '',
          valor_estimado: li?.valor_estimado ?? null,
          parceiro_nome: li?.parceiro_nome || '',
          parceiro_percentual: li?.parceiro_percentual ?? null,
          vendedor_id: v.id,
          vendedor_nome: v.nome || '',
          data_fila: hoje,
          prioridade: 0,
          posicao: posInd++,
          tentativas: 0,
          status: 'pendente',
          origem_label: li?.parceiro_nome ? `Indicação · ${li.parceiro_nome}` : (c.origem || 'Indicação'),
          historico: [{ status: 'pendente', observacao: 'Item incluído na fila do dia', data: new Date().toISOString() }],
        });
        filaCriada.push(item);
      }

      for (const a of carteira) {
        const key = `carteira|${a.lead_id}|${v.id}`;
        if (existenteKey.has(key)) continue;
        const item = await base44.asServiceRole.entities.FilaContato.create({
          tipo_origem: 'carteira',
          ref_id: a.lead_id || a.cliente_id || '',
          cliente_id: a.cliente_id || a.lead_id || '',
          nome: a.lead_nome || '',
          telefone: a.lead_telefone || '',
          cpf_cnpj: a.lead_cpf_cnpj || '',
          vendedor_id: v.id,
          vendedor_nome: v.nome || '',
          data_fila: hoje,
          prioridade: 1,
          posicao: posCart++,
          tentativas: 0,
          status: 'pendente',
          origem_label: 'Carteira',
          meet_link: a.meet_link || '',
          google_event_id: a.google_event_id || '',
          historico: [{ status: 'pendente', observacao: 'Item incluído na fila do dia', data: new Date().toISOString() }],
        });
        filaCriada.push(item);
      }
    }

    return Response.json({
      success: true,
      data_fila: hoje,
      vendedores_processados: vendedores.length,
      itens_criados: filaCriada.length,
    });
  } catch (error) {
    console.error('montarFilaContatoDia:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}