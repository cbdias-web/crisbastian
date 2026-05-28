import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

const PDFs = {
  conta_global: 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/440bfe20e_Contrato-ContaGlobal.pdf',
  conta_internacional: 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/f9b7f91fb_Contrato-ContaInternacional.pdf',
  dolarize_aqui: 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/bd9fb551e_ContratoDolarizeAqui.pdf',
  garantias: 'https://base44.app/api/apps/698a1739c50002e4d14fa547/files/mp/public/698a1739c50002e4d14fa547/832d0ade7_Contrato_Garantia_Village_Final_Proporcional.pdf',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const resultado = {};

    const { tipo } = await req.json().catch(() => ({}));
    const pdfsToCheck = tipo ? { [tipo]: PDFs[tipo] } : PDFs;
    for (const [nome, url] of Object.entries(pdfsToCheck)) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          resultado[nome] = { erro: `HTTP ${res.status}` };
          continue;
        }
        const arrayBuffer = await res.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        resultado[nome] = {
          total_campos: fields.length,
          campos: fields.map(f => f.getName()),
        };
      } catch (e) {
        resultado[nome] = { erro: e.message };
      }
    }

    return Response.json(resultado);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});