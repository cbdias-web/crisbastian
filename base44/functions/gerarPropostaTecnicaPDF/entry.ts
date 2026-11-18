import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { montarPdfProposta } from '../../shared/propostaPdf.ts';

// Gera o PDF executivo da Proposta Técnica (identidade Villela Exchange / RNC).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { proposta_id } = await req.json();
    const p = await base44.entities.PropostaTecnica.get(proposta_id);
    if (!p) return Response.json({ error: 'Proposta não encontrada' }, { status: 404 });

    const bytes = montarPdfProposta(p, user);
    const nome = `Proposta_Tecnica_${(p.codigo || 'PT').replace(/[^\w-]/g, '')}.pdf`;
    const file = new File([new Blob([bytes], { type: 'application/pdf' })], nome, { type: 'application/pdf' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.PropostaTecnica.update(p.id, { pdf_url: file_url, pdf_gerado_em: new Date().toISOString() });
    return Response.json({ pdf_url: file_url, nome });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
