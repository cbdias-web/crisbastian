import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const ZAPSIGN_API_URL = 'https://api.zapsign.com.br/api/v1/docs/';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { contrato_id, pdf_base64 } = await req.json();
    if (!contrato_id) return Response.json({ error: 'contrato_id obrigatório' }, { status: 400 });

    let contrato;
    try {
      contrato = await base44.entities.Contrato.get(contrato_id);
    } catch (_) {
      return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    if (!contrato.email || !contrato.email.trim()) {
      return Response.json({ error: 'O contrato não possui e-mail do cliente — cadastre o e-mail para enviar a assinatura eletrônica' }, { status: 400 });
    }

    const temBase64 = !!pdf_base64;
    const temUrl = !!contrato.pdf_url;
    if (!temBase64 && !temUrl) {
      return Response.json({ error: 'Gere ou anexe o PDF do contrato antes de enviar para assinatura' }, { status: 400 });
    }

    // Cria o documento na ZapSign — o signatário é o cliente do contrato.
    // A própria ZapSign envia o e-mail de assinatura ao signatário (disable_signer_emails=false).
    const zapsignBody = {
      name: `Contrato ${contrato.tipo} — ${contrato.nome.trim()}`.slice(0, 255),
      lang: 'pt-br',
      external_id: contrato.id,
      signers: [{ name: contrato.nome.trim(), email: contrato.email.trim() }],
      ...(temBase64 ? { base64_pdf: pdf_base64 } : { url_pdf: contrato.pdf_url }),
    };

    const zapsignRes = await fetch(ZAPSIGN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secrets.get('ZAPSIGN_API_TOKEN')}`,
      },
      body: JSON.stringify(zapsignBody),
    });

    // A ZapSign pode responder em texto puro (não JSON) em erros de validação —
    // ler como texto e só então tentar JSON evita "Unexpected token" sem detalhe.
    const rawText = await zapsignRes.text();
    let zapsignData;
    try {
      zapsignData = JSON.parse(rawText);
    } catch (_) {
      return Response.json(
        { error: `ZapSign (HTTP ${zapsignRes.status}): ${rawText.slice(0, 300)}` },
        { status: 502 },
      );
    }
    if (!zapsignRes.ok) {
      const detalhe = zapsignData?.detail || zapsignData?.error || zapsignData?.message || JSON.stringify(zapsignData).slice(0, 300);
      if (zapsignRes.status === 402) {
        return Response.json(
          { error: 'A ZapSign exige um Plano de API ativo para envios automáticos. Contrate o plano na ZapSign ou, se preferir, crie o documento no painel da ZapSign e cole o link de assinatura manualmente neste contrato.' },
          { status: 402 },
        );
      }
      return Response.json({ error: `ZapSign (HTTP ${zapsignRes.status}): ${detalhe}` }, { status: 502 });
    }

    const signer = zapsignData?.signers?.[0];
    const signUrl = signer?.sign_url;
    if (!signUrl) {
      return Response.json({ error: 'ZapSign não retornou o link de assinatura do signatário' }, { status: 502 });
    }

    // Grava o link no campo existente do contrato + token do documento para rastreio
    await base44.entities.Contrato.update(contrato.id, {
      link_assinatura: signUrl,
      zapsign_doc_token: zapsignData.token,
    });

    return Response.json({
      sign_url: signUrl,
      doc_token: zapsignData.token,
      status: zapsignData.status,
      enviado_para: contrato.email.trim(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}