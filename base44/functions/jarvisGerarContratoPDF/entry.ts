import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Jarvis: gera o PDF de um contrato já cadastrado (mesmo modelo da tela de Contratos),
// guarda o PDF no contrato (pdf_url), passa o status de "rascunho" para "gerado" e devolve o link.
// Body: { contrato_id }

const ESSENCIAIS: Record<string, string> = { nome: 'Nome / razão social', cpf_cnpj: 'CPF/CNPJ', tipo: 'Tipo de contrato' };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { contrato_id } = await req.json().catch(() => ({}));
    if (!contrato_id) return Response.json({ error: 'contrato_id é obrigatório' }, { status: 400 });

    const contrato = await base44.entities.Contrato.get(contrato_id).catch(() => null);
    if (!contrato) return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });

    const faltando = Object.entries(ESSENCIAIS).filter(([k]) => !String(contrato[k] || '').trim()).map(([, l]) => l);
    if (faltando.length) {
      return Response.json({ error: `Faltam dados para gerar o PDF: ${faltando.join(', ')}. Peça ao usuário e atualize o contrato antes.`, faltando }, { status: 422 });
    }

    const res: any = await base44.functions.invoke('gerarContratosPDF', { contrato_id });
    const d = res?.data || res;
    if (!d || d.error || !d.pdf_base64) {
      return Response.json({ error: d?.error || 'Não foi possível gerar o PDF deste contrato.' }, { status: 500 });
    }

    const bin = atob(d.pdf_base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const filename = d.filename || `contrato_${String(contrato.tipo).replace(/\s+/g, '_')}.pdf`;
    const file = new File([new Blob([bytes], { type: 'application/pdf' })], filename, { type: 'application/pdf' });
    const up: any = await base44.integrations.Core.UploadFile({ file });
    const file_url = up?.file_url || up?.data?.file_url || '';

    const novoStatus = contrato.status === 'rascunho' ? 'gerado' : contrato.status;
    await base44.entities.Contrato.update(contrato.id, { status: novoStatus, ...(file_url ? { pdf_url: file_url } : {}) });

    return Response.json({
      success: true,
      file_url,
      filename,
      numero_contrato: d.numero_contrato || contrato.numero_contrato || '',
      status: novoStatus,
      message: 'PDF do contrato gerado e salvo no contrato. Inclua na resposta: [Baixar contrato](file_url). O contrato também está em /Contratos para revisão, assinatura (ZapSign) e envio para Vendas.',
    });
  } catch (error: any) {
    return Response.json({ error: String(error?.message || error).slice(0, 300) }, { status: 500 });
  }
});
