import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hojeBrasilia } from '../../shared/diaUtil.ts';

// Monta/sincroniza a FilaContato do dia para um vendedor (ou todos os ativos).
// - Indicações (prioridade 0): ConversaWhatsapp do vendedor (qualquer status).
//   * ativa/aguardando → pendente (cria novo item para hoje, idempotente por dia)
//   * qualificado/convertido/desqualificado → sincroniza status (atualiza item
//     existente ou cria novo) — o lead PERMANECE na esteira movendo-se entre
//     colunas conforme as interações.
// - Carteira (prioridade 1): AgendaContato pendente cuja data_agendada == hoje.
// - LeadIndicações convertidas SEM ConversaWhatsapp (ex: indicações de portal
//   convertidas direto em cliente/contrato) → cria FilaContato na coluna
//   "Convertido" para que o lead não suma da esteira.
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
        const meus = await base44.entities.Vendedor.filter({ email: user.email });
        vendedores = meus;
      } else {
        vendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true });
      }
    }

    // ── Índices de idempotência (sobre TODA a fila, não só hoje) ──
    // Pendente: idempotente por dia (cria novo a cada dia).
    // Não-pendente: um único item por (ref_id+vendedor), sincronizado.
    const todaFila = await base44.asServiceRole.entities.FilaContato.list('-created_date', 2000);
    const existenteHojeKey = new Set(
      todaFila.filter((f) => f.data_fila === hoje)
        .map((f) => `${f.tipo_origem}|${f.ref_id}|${f.vendedor_id}`)
    );
    // Mapa ref+vendedor → item mais recente (para sincronizar não-pendentes)
    const porRefMap = new Map();
    for (const f of todaFila) {
      const k = `${f.tipo_origem}|${f.ref_id}|${f.vendedor_id}`;
      if (!porRefMap.has(k)) porRefMap.set(k, f); // lista já em ordem decrescente
    }
    // Set de lead_indicacao_id já presentes na fila
    const leadIndicacaoJaNaFila = new Set(
      todaFila.filter((f) => f.lead_indicacao_id).map((f) => f.lead_indicacao_id)
    );

    // Cache de LeadIndicacao para denormalizar produto/valor/parceiro/comissao
    const todasIndicacoes = await base44.asServiceRole.entities.LeadIndicacao.list('-created_date', 1000);
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

    // Mapeia status da ConversaWhatsapp → status da FilaContato
    const statusConversaParaFila = (s: string): string | null => {
      if (!s || s === 'ativa' || s === 'aguardando') return 'pendente';
      if (s === 'qualificado') return 'qualificado';
      if (s === 'convertido') return 'convertido';
      if (s === 'desqualificado' || s === 'encerrada') return 'descartado';
      return null;
    };

    let itensCriados = 0;
    let itensAtualizados = 0;

    for (const v of vendedores) {
      if (v.ativo === false) continue;

      // ── Indicações (ConversaWhatsapp — qualquer status) ──
      const conversas = await base44.asServiceRole.entities.ConversaWhatsapp.filter(
        { vendedor_id: v.id }, '-ultima_mensagem_em', 500
      );
      let posInd = 1;

      for (const c of conversas) {
        const target = statusConversaParaFila(c.status || 'ativa');
        if (!target) continue;
        const key = `indicacao|${c.id}|${v.id}`;

        if (target === 'pendente') {
          // Fila do dia: cria novo item pendente para hoje (idempotente por dia)
          if (existenteHojeKey.has(key)) continue;
          const li = resolverLeadIndicacao(c);
          await base44.asServiceRole.entities.FilaContato.create({
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
          itensCriados++;
        } else {
          // Não-pendente: sincroniza (atualiza item existente ou cria novo)
          const existente = porRefMap.get(key);
          if (existente) {
            if (existente.status !== target) {
              const hist = Array.isArray(existente.historico) ? existente.historico : [];
              hist.push({ status: target, observacao: `Status sincronizado (${c.status})`, data: new Date().toISOString() });
              await base44.asServiceRole.entities.FilaContato.update(existente.id, { status: target, historico: hist });
              itensAtualizados++;
            }
          } else {
            const li = resolverLeadIndicacao(c);
            await base44.asServiceRole.entities.FilaContato.create({
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
              status: target,
              origem_label: li?.parceiro_nome ? `Indicação · ${li.parceiro_nome}` : (c.origem || 'Indicação'),
              historico: [{ status: target, observacao: `Item sincronizado (${c.status})`, data: new Date().toISOString() }],
            });
            itensCriados++;
          }
        }
      }

      // ── Carteira (prioridade 1): agendas pendentes de hoje ──
      const agendas = await base44.asServiceRole.entities.AgendaContato.filter(
        { vendedor_id: v.id, data_agendada: hoje }, 'posicao_dia'
      );
      const carteira = agendas.filter((a) => a.status === 'pendente' || !a.status);
      let posCart = 1;
      for (const a of carteira) {
        const key = `carteira|${a.lead_id}|${v.id}`;
        if (existenteHojeKey.has(key)) continue;
        await base44.asServiceRole.entities.FilaContato.create({
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
        itensCriados++;
      }
    }

    // ── LeadIndicações convertidas SEM ConversaWhatsapp ──
    // Garante que indicações de portal (que viraram cliente/contrato direto)
    // também entrem na esteira na coluna "Convertido". Pula as que já têm
    // ConversaWhatsapp (o sync da conversa já as trata) para evitar duplicatas.
    const todasConversas = await base44.asServiceRole.entities.ConversaWhatsapp.list('-created_date', 1000);
    const telConversaSet = new Set(todasConversas.map((c) => (c.telefone || '').toString().replace(/\D/g, '')).filter(Boolean));
    const convertidas = todasIndicacoes.filter((li) => {
      if (!['convertido_venda', 'convertido_contrato', 'convertido_cliente'].includes(li.status)) return false;
      if (leadIndicacaoJaNaFila.has(li.id)) return false;
      const tel = (li.tipo === 'PF' ? (li.pf_whatsapp || li.pf_telefone || '') : (li.pj_whatsapp || li.pj_telefone || '')).toString().replace(/\D/g, '');
      if (tel && telConversaSet.has(tel)) return false; // conversa já trata este lead
      return true;
    });
    for (const li of convertidas) {
      // Resolve vendedor pelo cliente (ou contrato) vinculado
      let vendedorId = '';
      let vendedorNome = '';
      if (li.cliente_id) {
        const cli = await base44.asServiceRole.entities.Cliente.get(li.cliente_id).catch(() => null);
        if (cli?.vendedor_id) { vendedorId = cli.vendedor_id; vendedorNome = cli.vendedor_nome || ''; }
      }
      if (!vendedorId && li.contrato_id) {
        const ctr = await base44.asServiceRole.entities.Contrato.get(li.contrato_id).catch(() => null);
        if (ctr?.vendedor_id) { vendedorId = ctr.vendedor_id; vendedorNome = ctr.vendedor_nome || ''; }
      }
      if (!vendedorId) continue; // sem vendedor conhecido, não cria
      // Se o sync for de um vendedor específico, só cria para ele
      if (body.vendedor_id && vendedorId !== body.vendedor_id) continue;

      const nome = li.tipo === 'PF' ? li.pf_nome : li.pj_razao_social;
      const telefone = li.tipo === 'PF' ? (li.pf_whatsapp || li.pf_telefone || '') : (li.pj_whatsapp || li.pj_telefone || '');
      const doc = li.tipo === 'PF' ? li.pf_cnpj : li.pj_cnpj;

      await base44.asServiceRole.entities.FilaContato.create({
        tipo_origem: 'indicacao',
        ref_id: li.id,
        lead_indicacao_id: li.id,
        cliente_id: li.cliente_id || '',
        nome: nome || '',
        telefone: telefone || '',
        cpf_cnpj: doc || '',
        produto: li.produto || '',
        valor_estimado: li.valor_estimado ?? null,
        parceiro_nome: li.parceiro_nome || '',
        parceiro_percentual: li.parceiro_percentual ?? null,
        vendedor_id: vendedorId,
        vendedor_nome: vendedorNome,
        data_fila: hoje,
        prioridade: 0,
        posicao: 1,
        tentativas: 0,
        status: 'convertido',
        origem_label: li.parceiro_nome ? `Indicação · ${li.parceiro_nome}` : 'Indicação',
        historico: [{ status: 'convertido', observacao: 'Indicação convertida sincronizada na esteira', data: new Date().toISOString() }],
      });
      itensCriados++;
    }

    return Response.json({
      success: true,
      data_fila: hoje,
      vendedores_processados: vendedores.length,
      itens_criados: itensCriados,
      itens_atualizados: itensAtualizados,
    });
  } catch (error) {
    console.error('montarFilaContatoDia:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}