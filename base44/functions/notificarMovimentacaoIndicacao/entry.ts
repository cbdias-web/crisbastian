import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Disparada pela automação de entidade LeadIndicacao (create/update).
// Notifica o indicador por e-mail sobre movimentações dos seus leads.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    const lead = data;
    if (!lead || !lead.parceiro_id) return Response.json({ ok: true, skipped: true });

    // Busca o indicador para checar preferência de notificação e e-mail
    let ind;
    try {
      ind = await base44.asServiceRole.entities.Parceiro.get(lead.parceiro_id);
    } catch (e) {
      return Response.json({ ok: true, skipped: true });
    }
    if (!ind || ind.receber_notificacoes === false || !ind.email) {
      return Response.json({ ok: true, skipped: true });
    }

    const nomeLead = lead.tipo === 'PF' ? (lead.pf_nome || '—') : (lead.pj_razao_social || '—');
    const STATUS_LABEL = {
      novo: 'Nova indicação recebida',
      em_atendimento: 'Atendimento iniciado',
      convertido_cliente: 'Convertido em Cliente 🎉',
      convertido_contrato: 'Contrato gerado 🎉',
      convertido_venda: 'Venda concluída 🎉',
      descartado: 'Indicação descartada',
    };

    let assunto, mensagem;

    if (event?.type === 'create') {
      assunto = `Nova indicação recebida · ${nomeLead}`;
      mensagem = `Sua indicação foi registrada com sucesso na plataforma e já está disponível para a nossa equipe comercial.\n\n` +
        `Cliente: ${nomeLead}\nProduto: ${lead.produto || '—'}\nValor estimado: ${lead.valor_estimado != null ? 'R$ ' + Number(lead.valor_estimado).toLocaleString('pt-BR') : '—'}\n\n` +
        `Acompanhe o status pelo seu portal do indicador.`;
    } else if (event?.type === 'update') {
      const statusAnt = old_data?.status;
      const statusNov = lead.status;
      if (statusAnt === statusNov) {
        // Sem mudança de status relevante — não notifica
        return Response.json({ ok: true, skipped: true });
      }
      const label = STATUS_LABEL[statusNov] || `Status atualizado: ${statusNov || '—'}`;
      assunto = `${label} · ${nomeLead}`;
      mensagem = `Houve uma movimentação no lead que você indicou:\n\n` +
        `Cliente: ${nomeLead}\nProduto: ${lead.produto || '—'}\n` +
        (statusAnt ? `Status anterior: ${STATUS_LABEL[statusAnt] || statusAnt}\n` : '') +
        `Novo status: ${label}\n\n` +
        `Acompanhe todos os detalhes pelo seu portal do indicador.`;
    } else {
      return Response.json({ ok: true, skipped: true });
    }

    const body_html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0d1117, #16213e); padding: 24px; border-radius: 14px 14px 0 0;">
          <h2 style="color: #00D4AA; margin: 0; font-size: 18px;">Atualização do seu Lead</h2>
          <p style="color: rgba(230,237,243,0.6); margin: 6px 0 0; font-size: 12px;">Portal do Indicador · Villela Exchange</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 14px 14px;">
          <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">Olá, <strong>${ind.nome}</strong>!</p>
          <div style="color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${mensagem}</div>
          <p style="margin: 24px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">Villela Exchange – Portal do Indicador · Notificação automática</p>
        </div>
      </div>
    `;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: ind.email,
        subject: assunto,
        body: body_html,
        from_name: 'Villela Exchange – Indicadores',
      });
    } catch (e) {
      console.log('Falha ao notificar indicador:', e.message);
    }

    return Response.json({ ok: true, notificado: ind.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}