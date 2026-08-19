import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Portal público do Indicador (acesso via link_token).
// - action 'buscar': retorna os dados do indicador + status do termo
// - action 'aceitar_termo': registra aceite do Termo de Uso + envia boas-vindas
// - action 'listar': retorna as LeadIndicacao do indicador (apenas as dele)
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, token } = body;

    if (!token) return Response.json({ error: 'Token obrigatório' }, { status: 400 });

    const inds = await base44.asServiceRole.entities.Parceiro.filter({ link_token: token, ativo: true });
    if (inds.length === 0) return Response.json({ error: 'Link inválido ou expirado' }, { status: 404 });
    const ind = inds[0];

    if (action === 'buscar') {
      // Captura o último acesso anterior (antes de atualizar) para distinguir retorno de primeira visita
      const ultimo_acesso_anterior = ind.ultimo_acesso;
      const era_retorno = !!(ultimo_acesso_anterior && ind.termo_aceito === true);
      // Atualiza último acesso
      try {
        await base44.asServiceRole.entities.Parceiro.update(ind.id, { ultimo_acesso: new Date().toISOString() });
      } catch (e) {}
      return Response.json({
        indicador: {
          id: ind.id,
          nome: ind.nome,
          email: ind.email,
          telefone: ind.telefone,
          percentual_comissao: ind.percentual_comissao ?? 0,
          receber_notificacoes: ind.receber_notificacoes !== false,
          termo_aceito: ind.termo_aceito === true,
          termo_aceito_em: ind.termo_aceito_em,
          convite_enviado: ind.convite_enviado === true,
          ultimo_acesso: ultimo_acesso_anterior,
          era_retorno,
        },
      });
    }

    if (action === 'aceitar_termo') {
      const versao = body.versao || '1.0';
      const agora = new Date().toISOString();
      await base44.asServiceRole.entities.Parceiro.update(ind.id, {
        termo_aceito: true,
        termo_aceito_em: agora,
        termo_versao: versao,
      });

      // E-mail de boas-vindas
      if (ind.email) {
        try {
          const body_html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0d1117, #16213e); padding: 28px 24px; border-radius: 14px 14px 0 0;">
                <h2 style="color: #00D4AA; margin: 0; font-size: 22px;">Bem-vindo ao Portal do Indicador 🎉</h2>
                <p style="color: rgba(230,237,243,0.6); margin: 8px 0 0; font-size: 13px;">Villela Exchange</p>
              </div>
              <div style="background: #f8fafc; padding: 28px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 14px 14px;">
                <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">Olá, <strong>${ind.nome}</strong>!</p>
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                  Seu cadastro foi formalizado com sucesso. Você aceitou o <strong>Termo de Uso (v${versao})</strong> da plataforma e já pode acompanhar suas indicações.
                </p>
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                  Agora você pode cadastrar novas indicações e acompanhar o status de cada lead em tempo real, direto pelo seu portal.
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0;">
                  Você receberá notificações por e-mail sempre que houver movimentações nos seus leads.
                </p>
                <p style="margin: 20px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">Villela Exchange – Portal do Indicador</p>
              </div>
            </div>
          `;
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: ind.email,
            subject: `Bem-vindo ao Portal do Indicador · Villela Exchange`,
            body: body_html,
            from_name: 'Villela Exchange – Indicadores',
          });
        } catch (e) {
          console.log('Falha ao enviar boas-vindas:', e.message);
        }
      }

      return Response.json({ success: true });
    }

    if (action === 'listar') {
      const leads = await base44.asServiceRole.entities.LeadIndicacao.filter({ parceiro_id: ind.id });
      // Anexa o valor REAL da venda (Venda.valor_total_contrato ou Venda.valor) para leads convertidos
      const comVenda = leads.filter((l: any) => l.venda_id);
      if (comVenda.length > 0) {
        try {
          const todasVendas = await base44.asServiceRole.entities.Venda.list('-created_date', 500);
          const porId: Record<string, any> = {};
          for (const v of todasVendas) porId[v.id] = { valor: Number(v.valor) || 0, valor_total: Number(v.valor_total_contrato) || 0 };
          for (const l of leads) {
            const v = porId[(l as any).venda_id];
            (l as any).valor_venda = v?.valor || 0;
            (l as any).valor_total_venda = v?.valor_total || 0;
          }
        } catch (e) {}
      }
      // Anexa o percentual de comissão EFETIVO por lead (válido é o cadastrado no contrato, não o padrão do indicador)
      const comContrato = leads.filter((l: any) => l.contrato_id);
      if (comContrato.length > 0) {
        try {
          const todosContratos = await base44.asServiceRole.entities.Contrato.list('-created_date', 500);
          const porId: Record<string, any> = {};
          for (const c of todosContratos) porId[c.id] = c;
          for (const l of leads) {
            const c = porId[(l as any).contrato_id];
            if (c && Array.isArray(c.indicadores)) {
              const indEntry = c.indicadores.find((i: any) => i.id === ind.id || i.nome === ind.nome);
              (l as any).comissao_pct = indEntry ? Number(indEntry.percentual) || 0 : (Number(ind.percentual_comissao) || 0);
            } else {
              (l as any).comissao_pct = Number(ind.percentual_comissao) || 0;
            }
          }
        } catch (e) {}
      } else {
        for (const l of leads) (l as any).comissao_pct = Number(ind.percentual_comissao) || 0;
      }
      return Response.json({ leads });
    }

    if (action === 'toggle_notificacoes') {
      const novo = body.receber !== undefined ? !!body.receber : !ind.receber_notificacoes;
      await base44.asServiceRole.entities.Parceiro.update(ind.id, { receber_notificacoes: novo });
      return Response.json({ success: true, receber_notificacoes: novo });
    }

    if (action === 'ver_lead') {
      const leadId = body.lead_id;
      if (!leadId) return Response.json({ error: 'lead_id obrigatório' }, { status: 400 });
      const lead = await base44.asServiceRole.entities.LeadIndicacao.get(leadId);
      if (!lead || lead.parceiro_id !== ind.id) return Response.json({ error: 'Indicação não encontrada' }, { status: 404 });

      // Histórico de interações: Interações do cliente (se já convertido) + conversa WhatsApp por telefone
      const interacoes: any[] = [];
      if (lead.cliente_id) {
        try {
          const ints = await base44.asServiceRole.entities.InteracaoCliente.filter({ cliente_id: lead.cliente_id }, '-data_interacao', 50);
          interacoes.push(...ints);
        } catch (e) {}
      }

      let conversa: any = null;
      const telRaw = lead.tipo === 'PF' ? (lead.pf_whatsapp || lead.pf_telefone) : (lead.pj_whatsapp || lead.pj_telefone);
      const nomeLead = (lead.tipo === 'PF' ? lead.pf_nome : lead.pj_razao_social) || '';
      const norm = (s: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (telRaw) {
        const digits = String(telRaw).replace(/\D/g, '');
        if (digits.length >= 8) {
          try {
            const convs = await base44.asServiceRole.entities.ConversaWhatsapp.list('-updated_date', 200);
            // Apenas casamento exato de telefone (evita cruzar leads com números parecidos)
            const exatos = convs.filter(c => String(c.telefone || '').replace(/\D/g, '') === digits);
            // Entre os de mesmo telefone, prefere a conversa cujo nome bate com o lead
            const porNome = exatos.find(c => norm(c.lead_nome) === norm(nomeLead));
            const match = porNome || exatos[0] || null;
            if (match) conversa = { status: match.status, produto_interesse: match.produto_interesse, mensagens: match.mensagens || [] };
          } catch (e) {}
        }
      }

      // ─── Jornada do cliente: contrato, venda, parcelas e implantação ───
      let contrato: any = null;
      if (lead.contrato_id) {
        try { contrato = await base44.asServiceRole.entities.Contrato.get(lead.contrato_id); } catch (e) {}
      }
      let venda: any = null;
      if (lead.venda_id) {
        try { venda = await base44.asServiceRole.entities.Venda.get(lead.venda_id); } catch (e) {}
      }
      let parcelas: any[] = [];
      if (lead.venda_id) {
        try { parcelas = await base44.asServiceRole.entities.ParcelaVenda.filter({ venda_id: lead.venda_id }, 'numero_parcela'); } catch (e) {}
      }
      let implantacao: any = null;
      if (lead.venda_id) {
        try {
          const imps = await base44.asServiceRole.entities.Implantacao.filter({ venda_id: lead.venda_id });
          implantacao = imps[0] || null;
        } catch (e) {}
      }

      return Response.json({ lead, interacoes, conversa, contrato, venda, parcelas, implantacao });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}