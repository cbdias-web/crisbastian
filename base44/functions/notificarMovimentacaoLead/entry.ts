import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Disparada pela automação de entidade ConversaWhatsapp (update) quando o campo
// `status` muda (filtro via trigger_conditions changed_fields contains status).
// Notifica admins (e o gerente responsável) via Jarvis + e-mail sobre a movimentação do lead.
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
        if (li && li.status !== 'convertido_venda') {
          await base44.asServiceRole.entities.LeadIndicacao.update(li.id, {
            status: 'convertido_venda',
            convertido: true,
            convertido_em: new Date().toISOString(),
          });
          console.log(`LeadIndicacao ${li.id} sincronizada para convertido_venda (Kanban).`);
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

    const assunto = `🔄 Lead movido para "${labelNov}" · ${nomeLead}`;
    const body_html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0d1117, #16213e); padding: 24px; border-radius: 14px 14px 0 0;">
          <h2 style="color: #00D4AA; margin: 0; font-size: 18px;">🔄 Movimentação de Lead</h2>
          <p style="color: rgba(230,237,243,0.6); margin: 6px 0 0; font-size: 12px;">Central de Leads · Villela Exchange</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 14px 14px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="background: white; border: 1px solid #e5e7eb;">
              <td style="padding: 10px 14px; color: #6b7280; font-weight: 600; width: 40%;">Lead</td>
              <td style="padding: 10px 14px; color: #111827; font-weight: 700;">${nomeLead}</td>
            </tr>
            <tr style="background: #f9fafb; border: 1px solid #e5e7eb;">
              <td style="padding: 10px 14px; color: #6b7280; font-weight: 600;">Telefone</td>
              <td style="padding: 10px 14px; color: #111827;">${telefone}</td>
            </tr>
            <tr style="background: white; border: 1px solid #e5e7eb;">
              <td style="padding: 10px 14px; color: #6b7280; font-weight: 600;">Gerente</td>
              <td style="padding: 10px 14px; color: #111827;">${gerente}</td>
            </tr>
            <tr style="background: #f9fafb; border: 1px solid #e5e7eb;">
              <td style="padding: 10px 14px; color: #6b7280; font-weight: 600;">Produto</td>
              <td style="padding: 10px 14px; color: #111827;">${produto}</td>
            </tr>
            <tr style="background: white; border: 1px solid #e5e7eb;">
              <td style="padding: 10px 14px; color: #6b7280; font-weight: 600;">Status anterior</td>
              <td style="padding: 10px 14px; color: #6b7280;">${labelAnt}</td>
            </tr>
            <tr style="background: #ecfdf5; border: 1px solid #a7f3d0;">
              <td style="padding: 10px 14px; color: #047857; font-weight: 700;">Novo status</td>
              <td style="padding: 10px 14px; color: #047857; font-weight: 700; font-size: 15px;">${labelNov}</td>
            </tr>
          </table>
          <p style="margin: 20px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">Villela Exchange – Central de Leads · Notificação automática</p>
        </div>
      </div>
    `;

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
        // E-mail
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: dest.email,
          subject: assunto,
          body: body_html,
          from_name: 'Villela Exchange – Central de Leads',
        });
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