import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Salva as preferências de contato do gerente (celular/operadora, janela, meta, alertas).
// Usa service role para não depender de permissão de edição da entidade Vendedor.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({})) || {};
    const isAdmin = user.role === 'admin' || user.permissao_admin === true;
    const sr = base44.asServiceRole.entities;

    let vendedor: any = null;
    if (body.vendedor_id && isAdmin) vendedor = await sr.Vendedor.get(body.vendedor_id).catch(() => null);
    else { const vs = await sr.Vendedor.filter({ email: user.email }); vendedor = vs[0] || null; }
    if (!vendedor) return Response.json({ error: 'Cadastro de gerente não encontrado para o seu usuário' }, { status: 404 });

    if (body.apenas_ler) return Response.json({ success: true, vendedor });

    const upd: any = {};
    if (body.celular_operadora !== undefined) {
      const d = String(body.celular_operadora).replace(/\D/g, '');
      if (d) {
        const n = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
        if (n.length !== 11 || n[2] !== '9') return Response.json({ error: 'Informe um celular válido com DDD (ex.: 51 99999-8888)' }, { status: 400 });
        upd.celular_operadora = `+55${n}`;
      } else upd.celular_operadora = '';
      if (upd.celular_operadora !== vendedor.celular_operadora) upd.celular_validado_em = null;
    }
    if (['Vivo', 'Claro', 'TIM', 'Oi', 'Outra'].includes(body.operadora)) upd.operadora = body.operadora;
    for (const k of ['whatsapp_no_mesmo_numero', 'alertas_silenciados']) if (typeof body[k] === 'boolean') upd[k] = body[k];
    for (const k of ['janela_inicio', 'janela_fim']) if (typeof body[k] === 'string' && /^\d{2}:\d{2}$/.test(body[k])) upd[k] = body[k];
    if (body.meta_diaria_toques !== undefined) { const n = Number(body.meta_diaria_toques); if (n > 0 && n <= 500) upd.meta_diaria_toques = n; }
    if (['push', 'email', 'ambos'].includes(body.canal_alerta)) upd.canal_alerta = body.canal_alerta;
    if (body.confirmar_teste) upd.celular_validado_em = new Date().toISOString();

    const novo = await sr.Vendedor.update(vendedor.id, upd);
    return Response.json({ success: true, vendedor: { ...vendedor, ...upd, ...(novo || {}) } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
