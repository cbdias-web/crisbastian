import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { montarPdfProposta } from '../../shared/propostaPdf.ts';

// Logo da marca em versão reduzida (120x120), para a capa do PDF sem inflar o arquivo.
const LOGO_URLS = [
  'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/47156ac052bffbe8f8c4215cbfe9e12d_logo-villela-pdf.png',
  'https://media.base44.com/images/public/698a1739c50002e4d14fa547/47156ac052bffbe8f8c4215cbfe9e12d_logo-villela-pdf.png',
];

// Logo da marca em base64 para a capa do PDF (se todas as tentativas falharem, a capa usa a marca vetorial).
async function carregarLogo(): Promise<string | undefined> {
  for (const url of LOGO_URLS) {
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        const res = await fetch(url);
        if (!res.ok) break;
        const buf = new Uint8Array(await res.arrayBuffer());
        if (!buf.length) break;
        let bin = '';
        for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192));
        return 'data:image/png;base64,' + btoa(bin);
      } catch { /* tenta de novo / próxima URL */ }
    }
  }
  return undefined;
}

// Gera o PDF executivo da Proposta Técnica (identidade Villela Exchange / RNC).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { proposta_id } = await req.json();
    const p = await base44.entities.PropostaTecnica.get(proposta_id);
    if (!p) return Response.json({ error: 'Proposta não encontrada' }, { status: 404 });

    // Estudo de origem: complementa a capa com o contato do cliente (quando existir).
    let estudo: any = null;
    if (p.estudo_id) {
      try { estudo = await base44.entities.EstudoViabilidade.get(p.estudo_id); } catch { estudo = null; }
    }

    const bytes = montarPdfProposta(p, user, await carregarLogo(), estudo);
    const nome = `Proposta_Tecnica_${(p.codigo || 'PT').replace(/[^\w-]/g, '')}.pdf`;
    const file = new File([new Blob([bytes], { type: 'application/pdf' })], nome, { type: 'application/pdf' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.PropostaTecnica.update(p.id, { pdf_url: file_url, pdf_gerado_em: new Date().toISOString() });
    return Response.json({ pdf_url: file_url, nome });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}