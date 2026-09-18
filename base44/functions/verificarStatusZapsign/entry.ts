import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const ZAPSIGN_API_URL = 'https://api.zapsign.com.br/api/v1/docs/';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { contrato_id } = await req.json();
    if (!contrato_id) return Response.json({ error: 'contrato_id obrigatório' }, { status: 400 });

    let contrato;
    try {
      contrato = await base44.entities.Contrato.get(contrato_id);
    } catch (_) {
      return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    if (!contrato.zapsign_doc_token) {
      return Response.json({ error: 'Este contrato não possui documento ZapSign vinculado' }, { status: 400 });
    }

    const zapsignRes = await fetch(`${ZAPSIGN_API_URL}${contrato.zapsign_doc_token}/`, {
      headers: { Authorization: `Bearer ${secrets.get('ZAPSIGN_API_TOKEN')}` },
    });
    const doc = await zapsignRes.json();
    if (!zapsignRes.ok) {
      const detalhe = doc?.detail || doc?.error || doc?.message || `HTTP ${zapsignRes.status}`;
      return Response.json({ error: `ZapSign: ${detalhe}` }, { status: 502 });
    }

    const assinado = doc?.status === 'concluido';
    const assinadoEm = doc?.signed_at || doc?.signed_at_docs || null;
    const signatarios = (doc?.signers || []).map((s) => s?.name).filter(Boolean).join(', ');

    // Se o cliente já assinou e o contrato ainda não chegou ao status 'assinado', avança automaticamente
    let contratoAtualizado = false;
    const ordem = ['rascunho', 'gerado', 'assinado', 'aguardando_pagamento', 'pago', 'no_pipeline'];
    if (assinado && contrato.status !== 'cancelado' && ordem.indexOf(contrato.status) < ordem.indexOf('assinado')) {
      await base44.entities.Contrato.update(contrato.id, { status: 'assinado' });
      contratoAtualizado = true;
    }

    return Response.json({
      assinado,
      status_zapsign: doc?.status,
      assinado_em: assinadoEm,
      mensagem: assinado
        ? `Documento assinado${signatarios ? ` por ${signatarios}` : ''}${assinadoEm ? ` em ${new Date(assinadoEm).toLocaleString('pt-BR')}` : ''}`
        : 'Aguardando assinatura do cliente',
      contrato_atualizado: contratoAtualizado,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}