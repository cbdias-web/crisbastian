import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Disparada pela automação de entidade ConversaWhatsapp (update) quando o campo
// `status` muda (filtro via trigger_conditions changed_fields contains status).
// Notifica admins (e o gerente responsável) via Jarvis (sem e-mail) sobre a movimentação do lead.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (event?.type !== 'update') return Response.json({ ok: true, skipped: true });

    const conv = data;
    if (!conv) return Response.json({ ok: true, skipped: true });

    const statusAnt = old_data?.status;
    const statusNov = conv.status;
    if (statusAnt === statusNov) return Response.json({ ok: true, skipped: true });

    // ─── Espelha conclusão no LeadIndicacao para notificar o INDICADOR ───
    // Quando o gerente move a conversa para "convertido" (conclusão no Kanban),
    // sincroniza o status na LeadIndicacao vinculada. Essa atualização dispara a
    // automação notificarMovimentacaoIndicacao, que envia o e-mail padronizado
    // ao indicador ("Venda concluída 🎉") — reutilizando o fluxo já existente.
    if (statusNov === 'convertido' && conv.origem && conv.origem.startsWith('Indicação · ')) {
      const nomeParceiro = conv.origem.replace('Indicação · ', '').trim();
      try {
        const todas = await base44.asServiceRole.entities.LeadIndicacao.list('-created_date', 500);
        const li = todas.find((x) => x.parceiro_nome === nomeParceiro && (
          (x.pf_nome && x.pf_nome === conv.lead_nome) ||
          (x.pj_razao_social && x.pj_razao_social === conv.lead_nome)
        ));
        // Só promove para 'convertido_venda' quando existir uma Venda PAGA
        // (com comprovante anexado) para o mesmo CPF/CNPJ. Mover a conversa para
        // "convertido" no Kanban NÃO equivale a venda efetivada — pode ser apenas
        // contrato gerado. A derivação visual no Dash Parceiro já usa o mesmo
        // critério (comprovante anexado), evitando "Venda Convertida" sem pagamento.
        if (li && li.status !== 'convertido_venda') {
          const docNorm = (li.tipo === 'PF' ? (li.pf_cpf || '') : (li.pj_cnpj || '')).replace(/\D/g, '');
          let vendaPaga = false;
          if (docNorm) {
            try {
              const vendas = await base44.asServiceRole.entities.Venda.list('-created_date', 500);
              vendaPaga = vendas.some((v) =>
                (v.cpf_cnpj || '').replace(/\D/g, '') === docNorm &&
                Array.isArray(v.comprovantes) && v.comprovantes.length > 0
              );
            } catch (e) {
              console.log('Falha ao verificar venda paga para sync LeadIndicacao:', e.message);
            }
          }
          if (vendaPaga) {
            await base44.asServiceRole.entities.LeadIndicacao.update(li.id, {
              status: 'convertido_venda',
              convertido: true,
              convertido_em: new Date().toISOString(),
            });
            console.log(`LeadIndicacao ${li.id} sincronizada para convertido_venda (venda paga confirmada).`);
          } else {
            console.log(`LeadIndicacao ${li.id} NÃO promovida — sem venda paga (comprovante) para o doc ${docNorm}.`);
          }
        }
      } catch (e) {
        console.log('Falha ao sincronizar LeadIndicacao na conclusão do Kanban:', e.message);
      }
    }

    const STATUS_LABEL = {
      ativa: 'Ativo',
      aguardando: 'Aguardando resposta',
      qualificado: 'Qualificado',
      desqualificado: 'Desqualificado',
      convertido: 'Convertido 🎉',
      encerrada: 'Encerrada',
    };

    const labelNov = STATUS_LABEL[statusNov] || statusNov || '—';
    const labelAnt = STATUS_LABEL[statusAnt] || statusAnt || '—';

    const nomeLead = conv.lead_nome || '—';
    const telefone = conv.telefone || '—';
    const gerente = conv.vendedor_nome || '—';
    const produto = conv.produto_interesse || '—';
    const origem = conv.origem || '—';

    const mensagemJarvis = `🔄 *Movimentação de Lead*\n\n` +
      `**Lead:** ${nomeLead}\n` +
      `**Telefone:** ${telefone}\n` +
      `**Gerente:** ${gerente}\n` +
      `**Produto:** ${produto}\n` +
      `**Origem:** ${origem}\n\n` +
      `**Status anterior:** ${labelAnt}\n` +
      `**Novo status:** ${labelNov}`;

    // Monta lista de destinatários: admins + gerente responsável (se tiver e-mail)
    const destinatarios = [];
    try {
      const usuarios = await base44.asServiceRole.entities.User.list();
      for (const u of usuarios) {
        if ((u.role === 'admin' || u.permissao_admin === true) && u.email) {
          destinatarios.push({ email: u.email, nome: u.full_name || 'Admin', isAdmin: true });
        }
      }
    } catch (e) {}

    // Gerente responsável (lookup Vendedor por vendedor_id)
    if (conv.vendedor_id) {
      try {
        const vend = await base44.asServiceRole.entities.Vendedor.get(conv.vendedor_id);
        if (vend?.email && !destinatarios.some(d => d.email === vend.email)) {
          destinatarios.push({ email: vend.email, nome: vend.nome || 'Gerente', isAdmin: false });
        }
      } catch (e) {}
    }

    if (destinatarios.length === 0) {
      return Response.json({ ok: true, notificados: 0 });
    }

    let enviados = 0;
    for (const dest of destinatarios) {
      try {
        // Jarvis (mensagem in-app)
        await base44.asServiceRole.entities.JarvisMensagem.create({
          destinatario_email: dest.email,
          remetente_nome: 'Sistema',
          remetente_email: '',
          mensagem: mensagemJarvis,
          lida: false,
        });
        // Sem e-mail — notificação apenas interna (Jarvis), conforme combinado.
        enviados++;
      } catch (e) {
        console.log(`Erro ao notificar ${dest.email}: ${e.message}`);
      }
    }

    console.log(`Movimentação de lead notificada para ${enviados} destinatário(s).`);
    return Response.json({ ok: true, notificados: enviados });
  } catch (error) {
    console.error('Erro notificarMovimentacaoLead:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}