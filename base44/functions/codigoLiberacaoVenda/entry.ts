import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Valida e consome o código de liberação de venda manual.
// O código é gerado pelo gerente/admin e vale para UM único lançamento.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const acao = body.acao;
    const codigo = String(body.codigo || '').trim().toUpperCase();
    const venda_id = body.venda_id;

    if (!codigo) return Response.json({ error: 'Informe o código de liberação.' }, { status: 400 });
    if (!['validar', 'consumir'].includes(acao)) {
      return Response.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    const admin = base44.asServiceRole;
    const encontrados = await admin.entities.CodigoLiberacaoVenda.filter({ codigo });
    const registro = encontrados[0];

    if (!registro || registro.ativo === false) {
      return Response.json({ valido: false, error: 'Código de liberação inválido.' });
    }
    if (registro.usado === true) {
      return Response.json({ valido: false, error: 'Este código já foi utilizado em outro lançamento de venda.' });
    }

    if (acao === 'validar') {
      return Response.json({
        valido: true,
        criado_por: registro.criado_por || '',
        observacao: registro.observacao || '',
      });
    }

    if (!venda_id) return Response.json({ error: 'venda_id é obrigatório.' }, { status: 400 });

    await admin.entities.CodigoLiberacaoVenda.update(registro.id, {
      usado: true,
      usado_por: user.email || user.id,
      usado_por_nome: user.full_name || '',
      usado_em: new Date().toISOString(),
      venda_id,
    });

    return Response.json({ valido: true, consumido: true, criado_por: registro.criado_por || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}