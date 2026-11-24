import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { gerarNdaOffshorePdf } from '../../shared/ndaOffshore.ts';

// Gera o NDA (Acordo de Confidencialidade · Estruturação Internacional) no modelo validado.
// Body: { estudo_id?, partes: ParteNda[], config?: ConfigNda, salvar?: boolean }
// - Sem estudo_id ou salvar=false: só devolve o PDF (pré-visualização).
// - Com estudo_id: guarda o PDF em armazenamento PRIVADO e registra no estudo (nda_url, nda_origem: "gerado").
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const partes = Array.isArray(body.partes) ? body.partes : [];
    const config = body.config || {};
    if (!partes.some((p: any) => String(p?.nome || '').trim())) {
      return Response.json({ error: 'Informe ao menos uma parte do cliente.' }, { status: 400 });
    }

    const bytes = await gerarNdaOffshorePdf(partes, config);
    const slug = String(partes[0].nome || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
    const filename = `NDA_Estruturacao_Internacional_${slug}.pdf`;

    let file_uri = '';
    if (body.estudo_id && body.salvar !== false) {
      const estudo = await base44.entities.EstudoViabilidade.get(body.estudo_id).catch(() => null);
      if (!estudo) return Response.json({ error: 'Estudo não encontrado ou sem permissão.' }, { status: 404 });
      const file = new File([new Blob([bytes], { type: 'application/pdf' })], filename, { type: 'application/pdf' });
      const up: any = await base44.integrations.Core.UploadPrivateFile({ file });
      file_uri = up?.file_uri || up?.data?.file_uri || '';
      if (!file_uri) return Response.json({ error: 'Não foi possível salvar o PDF do NDA.' }, { status: 500 });
      await base44.entities.EstudoViabilidade.update(estudo.id, {
        nda_url: file_uri,
        nda_nome: filename,
        nda_origem: 'gerado',
        nda_gerado_em: new Date().toISOString(),
        nda_partes: partes,
        nda_config: config,
      });
    }

    let bin = '';
    for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.slice(i, i + 8192));
    return Response.json({ success: true, filename, file_uri, pdf_base64: btoa(bin) });
  } catch (error: any) {
    return Response.json({ error: String(error?.message || error).slice(0, 300) }, { status: 500 });
  }
});
